const SESSION_KEY = "apoyo-sos-session";

export interface AppSession {
  name?: string;
  phone: string;
}

export function getStoredSession(): AppSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AppSession;
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
  return getStoredSession()?.phone || "anonymous-device";
}
