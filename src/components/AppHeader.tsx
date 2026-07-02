import { useEffect, useRef, useState } from "react";
import type { AppSession } from "../services/authSession";
import { timeAgo } from "../utils/time";
import { AccountMenu } from "./AccountMenu";
import { OfflineBanner } from "./OfflineBanner";
import { ViewTabs } from "./ViewTabs";
import type { AppView } from "./ViewTabs";

export interface HeaderNotification {
  id: string;
  requestId: string;
  title: string;
  message: string;
  createdAt: string;
  tone: "success" | "expired";
}

interface AppHeaderProps {
  activeView: AppView;
  isOffline: boolean;
  session: AppSession;
  notifications: HeaderNotification[];
  onChangeView: (view: AppView) => void;
  onSelectNotification: (notification: HeaderNotification) => void;
  onOpenAccount: () => void;
  onSignOut: () => void;
  onDeleteAccountData: () => void;
}

function NotificationMenu({
  notifications,
  onSelectNotification,
}: {
  notifications: HeaderNotification[];
  onSelectNotification: (notification: HeaderNotification) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const count = notifications.length;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative grid h-10 w-10 place-items-center rounded-pill bg-sos-background text-sos-ink"
        aria-label="Notificaciones"
        aria-expanded={isOpen}
      >
        <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 9.5a6 6 0 0 0-12 0c0 7-2.5 7.5-2.5 7.5h17S18 16.5 18 9.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9.5 20a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-pill bg-sos-pending px-1 text-[12px] font-extrabold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-[1200] w-[min(86vw,360px)] overflow-hidden rounded-[18px] border border-sos-border bg-white shadow-sheet">
          <div className="border-b border-sos-border px-4 py-3 text-[15px] font-bold text-sos-ink">
            Notificaciones ({count})
          </div>
          {count === 0 ? (
            <p className="px-4 py-5 text-[14px] font-semibold text-sos-muted">No hay notificaciones nuevas.</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSelectNotification(notification);
                  }}
                  className="flex w-full items-center gap-3 border-b border-sos-border px-4 py-3 text-left last:border-b-0 hover:bg-sos-background"
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-pill text-[12px] font-extrabold ${
                      notification.tone === "success" ? "text-sos-resolved" : "text-sos-muted"
                    }`}
                  >
                    {notification.tone === "success" ? "✓" : "⌛"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[15px] font-extrabold ${
                        notification.tone === "success" ? "text-sos-resolved" : "text-sos-muted"
                      }`}
                    >
                      {notification.title}
                    </span>
                    <span className="block truncate text-[14px] font-semibold text-sos-ink">{notification.message}</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold text-sos-muted">{timeAgo(notification.createdAt)}</span>
                  <span className="shrink-0 text-[24px] leading-none text-sos-ink">›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AppHeader({
  activeView,
  isOffline,
  session,
  notifications,
  onChangeView,
  onSelectNotification,
  onOpenAccount,
  onSignOut,
  onDeleteAccountData,
}: AppHeaderProps) {
  const label = session.isAnonymous ? "Anónimo" : session.email ?? "Cuenta";

  return (
    <header className="absolute left-0 right-0 top-0 z-[900] bg-white px-4 pb-3 pt-7">
      <div className="mb-5 grid h-14 grid-cols-[94px_minmax(0,1fr)_94px] items-center gap-2">
        <img src="/assets/nexo-logo-lite.svg" alt="NEXO" className="block h-auto w-[86px]" />
        <p className="min-w-0 truncate text-center text-[14px] font-bold text-sos-ink">{label}</p>
        <div className="flex items-center justify-end gap-2">
          <NotificationMenu notifications={notifications} onSelectNotification={onSelectNotification} />
          <AccountMenu
            session={session}
            onOpenAccount={onOpenAccount}
            onSignOut={onSignOut}
            onDeleteAccountData={onDeleteAccountData}
          />
        </div>
      </div>
      <ViewTabs activeView={activeView} onChange={onChangeView} />
      {isOffline && (
        <div className="mt-3 space-y-2">
          <OfflineBanner />
        </div>
      )}
    </header>
  );
}
