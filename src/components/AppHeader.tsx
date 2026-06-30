import { OfflineBanner } from "./OfflineBanner";
import { ViewTabs } from "./ViewTabs";
import type { AppView } from "./ViewTabs";

interface AppHeaderProps {
  activeView: AppView;
  isOffline: boolean;
  onChangeView: (view: AppView) => void;
}

export function AppHeader({ activeView, isOffline, onChangeView }: AppHeaderProps) {
  return (
    <header className="absolute left-0 right-0 top-0 z-[900] bg-white px-4 pb-3 pt-7">
      <div className="mb-5 flex h-14 items-center justify-center">
        <img src="/assets/logo-sos-ve.svg" alt="SOS Venezuela" className="block max-h-12 w-auto max-w-[120px]" />
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
