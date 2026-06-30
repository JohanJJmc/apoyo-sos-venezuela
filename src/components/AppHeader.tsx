import type { AppSession } from "../services/authSession";
import { AccountMenu } from "./AccountMenu";
import { OfflineBanner } from "./OfflineBanner";
import { ViewTabs } from "./ViewTabs";
import type { AppView } from "./ViewTabs";

interface AppHeaderProps {
  activeView: AppView;
  isOffline: boolean;
  session: AppSession;
  onChangeView: (view: AppView) => void;
  onSignOut: () => void;
  onChangeEmail: () => void;
  onDeleteAccountData: () => void;
}

export function AppHeader({
  activeView,
  isOffline,
  session,
  onChangeView,
  onSignOut,
  onChangeEmail,
  onDeleteAccountData,
}: AppHeaderProps) {
  return (
    <header className="absolute left-0 right-0 top-0 z-[900] bg-white px-4 pb-3 pt-7">
      <div className="mb-5 flex h-14 items-center justify-between">
        <img src="/assets/nexo-logo.svg" alt="NEXO" className="block h-[54px] w-[54px] rounded-[10px]" />
        <AccountMenu
          session={session}
          onSignOut={onSignOut}
          onChangeEmail={onChangeEmail}
          onDeleteAccountData={onDeleteAccountData}
        />
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
