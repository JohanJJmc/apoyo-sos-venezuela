type ModerationFields = Record<string, string | number | boolean | undefined | null>;

type ModerationResponse = {
  allowed?: boolean;
  message?: string;
};

export async function validateSafeContent(kind: "request" | "support", fields: ModerationFields) {
  const response = await fetch("/api/moderate-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, fields }),
  });

  const result = (await response.json().catch(() => ({}))) as ModerationResponse;

  if (!response.ok || !result.allowed) {
    throw new Error(
      result.message ||
        "No se pudo validar la seguridad del contenido. Intenta nuevamente.",
    );
  }
}
