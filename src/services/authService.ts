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

function sessionFromSupabaseUser(user: { id: string; email?: string | null }): AppSession {
  return {
    userId: user.id,
    email: user.email ?? undefined,
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

  async signUp(email: string, password: string) {
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
      options: { emailRedirectTo: window.location.origin },
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

  async resendSignupCode(email: string) {
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

  async signOut() {
    if (supabase) await supabase.auth.signOut();
    clearSession();
  },
};
