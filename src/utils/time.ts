export function timeAgo(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  const hours = Math.floor(minutes / 60);

  if (minutes < 60) return `hace ${minutes} minuto${minutes === 1 ? "" : "s"}`;
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? "" : "s"}`;
  return "hace mas de 24 horas";
}
