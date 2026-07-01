import { getCurrentUserId } from "./authSession";
import { supabase } from "./supabaseClient";

const LOCAL_SAFETY_KEY = "nexo-safety-status";
export const SAFETY_BLOCK_THRESHOLD = 6;

type SafetyStatus = {
  userId: string;
  violationCount: number;
  blocked: boolean;
};

function readLocalStatuses(): Record<string, SafetyStatus> {
  const raw = localStorage.getItem(LOCAL_SAFETY_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, SafetyStatus>;
  } catch {
    localStorage.removeItem(LOCAL_SAFETY_KEY);
    return {};
  }
}

function writeLocalStatus(status: SafetyStatus) {
  const statuses = readLocalStatuses();
  statuses[status.userId] = status;
  localStorage.setItem(LOCAL_SAFETY_KEY, JSON.stringify(statuses));
}

function localStatus(userId = getCurrentUserId()): SafetyStatus {
  return readLocalStatuses()[userId] ?? { userId, violationCount: 0, blocked: false };
}

export const safetyService = {
  async getStatus(userId = getCurrentUserId()) {
    if (!supabase) return localStatus(userId);

    const { data, error } = await supabase
      .from("user_safety_status")
      .select("user_id, violation_count, blocked")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return localStatus(userId);
    if (!data) return localStatus(userId);

    return {
      userId: data.user_id as string,
      violationCount: Number(data.violation_count ?? 0),
      blocked: Boolean(data.blocked),
    };
  },

  async isBlocked(userId = getCurrentUserId()) {
    return (await this.getStatus(userId)).blocked;
  },

  async recordViolation(reason: string, userId = getCurrentUserId()) {
    const current = await this.getStatus(userId);
    const nextStatus = {
      userId,
      violationCount: current.violationCount + 1,
      blocked: current.violationCount + 1 >= SAFETY_BLOCK_THRESHOLD,
    };

    writeLocalStatus(nextStatus);

    if (supabase) {
      try {
        await supabase.rpc("record_safety_violation", {
          target_user_id: userId,
          reason_text: reason,
        });
      } catch {
        // Keep the local safety status if the remote table/function is not ready yet.
      }
    }

    return nextStatus;
  },
};
