export type AppView = "map" | "requests" | "mine";

interface ViewTabsProps {
  activeView: AppView;
  onChange: (view: AppView) => void;
}

const tabs: Array<{ label: string; value: AppView }> = [
  { label: "Mapa", value: "map" },
  { label: "Solicitudes", value: "requests" },
  { label: "Creadas", value: "mine" },
];

export function ViewTabs({ activeView, onChange }: ViewTabsProps) {
  return (
    <nav aria-label="Secciones principales">
      <div className="sos-tabs mx-auto w-full max-w-md">
        {tabs.map((tab) => {
          const isActive = activeView === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className="sos-tab-button"
              data-active={isActive ? "true" : "false"}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="block truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
