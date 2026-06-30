interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="rounded-card border border-sos-border bg-white p-5 text-center shadow-soft">
      <p className="text-[16px] font-extrabold text-sos-ink">{title}</p>
      <p className="mt-1 text-[15px] font-semibold text-sos-muted">{message}</p>
    </div>
  );
}
