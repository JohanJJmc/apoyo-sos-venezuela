import { CATEGORIES } from "../data/categories";
import { CategoryIcon } from "../components/CategoryIcon";
import { StatusBadge } from "../components/StatusBadge";
import { TextInput } from "../components/TextInput";
import { SelectInput } from "../components/SelectInput";
import { EmptyState } from "../components/EmptyState";

export function DesignSystemGuide() {
  return (
    <main className="min-h-screen bg-sos-background p-5 text-sos-ink">
      <section className="mx-auto max-w-md space-y-6">
        <header>
          <p className="text-[13px] font-extrabold uppercase text-sos-primary">Sistema visual</p>
          <h1 className="text-[24px] font-extrabold">Apoyo SOS Venezuela</h1>
          <p className="mt-1 text-[15px] font-semibold text-sos-muted">
            Humano, confiable, simple y optimizado para emergencias.
          </p>
        </header>

        <section className="rounded-card bg-white p-4 shadow-soft">
          <h2 className="text-[20px] font-extrabold">Colores</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[13px] font-bold">
            {[
              ["Fondo", "bg-sos-background"],
              ["Primario", "bg-sos-primary text-white"],
              ["Primario suave", "bg-sos-primarySoft"],
              ["Pendiente", "bg-sos-pending text-white"],
              ["Atendida", "bg-sos-resolved text-white"],
              ["Superficie", "bg-white"],
            ].map(([label, className]) => (
              <div key={label} className={`rounded-input border border-sos-border p-3 ${className}`}>
                {label}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-card bg-white p-4 shadow-soft">
          <h2 className="text-[20px] font-extrabold">Botones y estados</h2>
          <button className="mt-3 h-14 w-full rounded-pill bg-sos-primary px-8 text-[16px] font-extrabold text-white shadow-floating">
            Solicitar apoyo
          </button>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status="pending" />
            <StatusBadge status="pending" partialSupport />
            <StatusBadge status="resolved" />
          </div>
        </section>

        <section className="rounded-card bg-white p-4 shadow-soft">
          <h2 className="text-[20px] font-extrabold">Inputs</h2>
          <div className="mt-3 space-y-3">
            <TextInput label="Cantidad necesaria" placeholder="1" />
            <SelectInput label="Categoria" options={CATEGORIES} defaultValue={CATEGORIES[0]} />
          </div>
        </section>

        <section className="rounded-card bg-white p-4 shadow-soft">
          <h2 className="text-[20px] font-extrabold">Iconos de categoria</h2>
          <div className="mt-3 grid grid-cols-5 gap-3">
            {CATEGORIES.map((category) => (
              <span
                key={category}
                title={category}
                className="grid h-11 w-11 place-items-center rounded-pill bg-sos-primarySoft text-sos-primary"
              >
                <CategoryIcon category={category} />
              </span>
            ))}
          </div>
        </section>

        <EmptyState title="No hay solicitudes" message="Cuando existan solicitudes, apareceran aqui." />
      </section>
    </main>
  );
}
