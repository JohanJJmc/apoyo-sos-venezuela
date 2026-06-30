const SESSION_KEY = "apoyo-sos-session";

export interface AppSession {
  userId: string;
  email?: string;
  name?: string;
  phone?: string;
  isAnonymous?: boolean;
}

export function getStoredSession(): AppSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AppSession;
    if (!session.userId && session.phone) {
      return { ...session, userId: session.phone };
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session: AppSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUserId() {
  return getStoredSession()?.userId || "anonymous-device";
}

export function createAnonymousSession(): AppSession {
  const stored = getStoredSession();
  if (stored?.isAnonymous) return stored;

  return {
    userId: `anonymous-${crypto.randomUUID()}`,
    email: "anonimo@nexo.local",
    isAnonymous: true,
  };
}
