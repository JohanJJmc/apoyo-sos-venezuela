import type { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <main className="relative h-dvh overflow-hidden bg-sos-background text-sos-ink">
      {children}
    </main>
  );
}
