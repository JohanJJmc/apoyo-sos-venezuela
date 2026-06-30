import { useEffect, useMemo, useState } from "react";
import type { Coordinates, SupportReport } from "../types/request";
import { PhotoUploader } from "./PhotoUploader";
import { TextInput } from "./TextInput";

interface SupportOfferFormProps {
  isOpen: boolean;
  currentLocation?: Coordinates;
  onClose: () => void;
  onSubmit: (input: Partial<SupportReport>) => void;
}

export function SupportOfferForm({ isOpen, currentLocation, onClose, onSubmit }: SupportOfferFormProps) {
  const [supporterName, setSupporterName] = useState("");
  const [supporterPhone, setSupporterPhone] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [details, setDetails] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState("");
  const [address, setAddress] = useState("");

  const locationText = useMemo(
    () => (currentLocation ? "Ubicación detectada ✓" : "Ubicación detectada ✓"),
    [currentLocation],
  );

  useEffect(() => {
    if (!isOpen) return;
    setSupporterName("");
    setSupporterPhone("");
    setAnonymous(false);
    setDetails("");
    setPhotoUrl(undefined);
    setPhotoError("");
    setAddress("");
  }, [isOpen]);

  if (!isOpen) return null;

  function handlePhoto(file?: File) {
    setPhotoError("");
    if (!file) {
      setPhotoUrl(undefined);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoError("La foto no se pudo usar. Puedes continuar sin foto.");
      setPhotoUrl(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result));
    reader.onerror = () => setPhotoError("La foto no se pudo cargar. Puedes continuar sin foto.");
    reader.readAsDataURL(file);
  }

  return (
    <div className="absolute inset-0 z-[1100] bg-white">
      <section className="h-full overflow-y-auto px-7 pb-7 pt-20">
        <button type="button" onClick={onClose} className="absolute left-7 top-10 grid h-10 w-10 place-items-center rounded-pill bg-sos-background text-2xl">
          ‹
        </button>

        <div className="mb-9 text-center">
          <h2 className="text-[18px] font-extrabold text-sos-ink">Ofreciendo apoyo</h2>
        </div>

        <div className="space-y-5">
          <section className="space-y-3">
            <p className="text-[14px] font-extrabold text-sos-muted">¿Quién apoya?</p>
            <TextInput
              label=""
              value={supporterName}
              disabled={anonymous}
              onChange={(event) => setSupporterName(event.target.value)}
              placeholder="Nombre y apellido"
            />
            <TextInput
              label=""
              value={supporterPhone}
              disabled={anonymous}
              onChange={(event) => setSupporterPhone(event.target.value)}
              placeholder="📞 Telefono"
            />
            <label className="flex min-h-12 items-center gap-3 rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold text-sos-ink">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => {
                  setAnonymous(event.target.checked);
                  if (event.target.checked) {
                    setSupporterName("");
                    setSupporterPhone("");
                  }
                }}
                className="h-4 w-4"
              />
              Anonimo
            </label>
          </section>

          <TextInput
            multiline
            label="Detalles"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Describe tu apoyo... (ej. pala, traslado, agua)"
            rows={4}
          />

          <PhotoUploader photoUrl={photoUrl} error={photoError} onChange={handlePhoto} />

          <section>
            <p className="mb-2 text-[14px] font-extrabold text-sos-muted">Ubicación</p>
            <TextInput label="" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Dirección o punto de referencia" />
            <p className="mt-2 text-[15px] font-extrabold text-[#00A651]">{locationText}</p>
          </section>

          <button
            type="button"
            onClick={() =>
              onSubmit({
                supporterName: anonymous ? undefined : supporterName.trim() || undefined,
                supporterPhone: anonymous ? undefined : supporterPhone.trim() || undefined,
                anonymous,
                details,
                photoUrl,
                latitude: currentLocation?.latitude,
                longitude: currentLocation?.longitude,
              })
            }
            className="sos-gradient mt-3 min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft"
          >
            Completar solicitud
          </button>
        </div>
      </section>
    </div>
  );
}
