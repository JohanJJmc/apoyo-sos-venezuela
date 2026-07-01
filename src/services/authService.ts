import { clearSession, saveSession, type AppSession } from "./authSession";
import { supabase } from "./supabaseClient";

const LOCAL_SIGNUP_KEY = "nexo-local-signup";

type LocalSignup = {
  email: string;
  password: string;
  code: string;
  createdAt: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getAuthRedirectUrl() {
  return import.meta.env.VITE_AUTH_REDIRECT_URL || window.location.origin;
}

function sessionFromSupabaseUser(user: { id: string; email?: string | null; user_metadata?: { full_name?: string; phone?: string } | null }): AppSession {
  return {
    userId: user.id,
    email: user.email ?? undefined,
    name: user.user_metadata?.full_name ?? undefined,
    phone: user.user_metadata?.phone ?? undefined,
  };
}

function saveAndReturn(session: AppSession) {
  saveSession(session);
  return session;
}

function createLocalCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function readLocalSignup(): LocalSignup | null {
  const raw = localStorage.getItem(LOCAL_SIGNUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalSignup;
  } catch {
    localStorage.removeItem(LOCAL_SIGNUP_KEY);
    return null;
  }
}

export const authService = {
  async getSupabaseSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    return user ? saveAndReturn(sessionFromSupabaseUser(user)) : null;
  },

  async signIn(email: string, password: string) {
    const cleanEmail = normalizeEmail(email);

    if (!supabase) {
      return saveAndReturn({ userId: cleanEmail, email: cleanEmail });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) throw error;
    if (!data.user) throw new Error("No se pudo iniciar sesión.");

    return saveAndReturn(sessionFromSupabaseUser(data.user));
  },

  async signUp(email: string, password: string, fullName: string, phone: string) {
    const cleanEmail = normalizeEmail(email);

    if (!supabase) {
      const code = createLocalCode();
      localStorage.setItem(
        LOCAL_SIGNUP_KEY,
        JSON.stringify({ email: cleanEmail, password, code, createdAt: new Date().toISOString() }),
      );
      console.info(`Código local de NEXO para ${cleanEmail}: ${code}`);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: { full_name: fullName.trim(), phone: phone.trim() },
      },
    });
    if (error) throw error;
  },

  async verifySignupCode(email: string, code: string) {
    const cleanEmail = normalizeEmail(email);

    if (!supabase) {
      const pending = readLocalSignup();
      if (!pending || pending.email !== cleanEmail || pending.code !== code.trim()) {
        throw new Error("El código no es válido.");
      }
      localStorage.removeItem(LOCAL_SIGNUP_KEY);
      return saveAndReturn({ userId: cleanEmail, email: cleanEmail });
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: code.trim(),
      type: "signup",
    });
    if (error) throw error;
    if (!data.user) throw new Error("No se pudo validar la cuenta.");

    return saveAndReturn(sessionFromSupabaseUser(data.user));
  },

  async resendSignupEmail(email: string) {
    const cleanEmail = normalizeEmail(email);

    if (!supabase) {
      const pending = readLocalSignup();
      const code = createLocalCode();
      localStorage.setItem(
        LOCAL_SIGNUP_KEY,
        JSON.stringify({
          email: cleanEmail,
          password: pending?.password ?? "",
          code,
          createdAt: new Date().toISOString(),
        }),
      );
      console.info(`Nuevo código local de NEXO para ${cleanEmail}: ${code}`);
      return;
    }

    const { error } = await supabase.auth.resend({ type: "signup", email: cleanEmail });
    if (error) throw error;
  },

  async updateEmail(email: string) {
    const cleanEmail = normalizeEmail(email);
    if (!supabase) {
      const session: AppSession = { userId: cleanEmail, email: cleanEmail };
      return saveAndReturn(session);
    }

    const { data, error } = await supabase.auth.updateUser({ email: cleanEmail });
    if (error) throw error;
    if (data.user) return saveAndReturn(sessionFromSupabaseUser(data.user));
    return null;
  },

  async updateProfile(input: { name?: string; phone?: string }) {
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(input.name ? { full_name: input.name.trim() } : {}),
        ...(input.phone ? { phone: input.phone.trim() } : {}),
      },
    });
    if (error) throw error;
    if (data.user) return saveAndReturn(sessionFromSupabaseUser(data.user));
    return null;
  },

  async signOut() {
    if (supabase) await supabase.auth.signOut();
    clearSession();
  },

  async deleteCurrentUserAccount() {
    if (!supabase) {
      clearSession();
      return;
    }

    const { error } = await supabase.rpc("delete_current_user_account");
    if (error) {
      if (error.message.toLowerCase().includes("function")) {
        throw new Error("Falta activar la función de borrado de cuenta en Supabase.");
      }
      throw error;
    }

    await supabase.auth.signOut({ scope: "local" });
    clearSession();
  },
};
