import { useEffect, useState } from "react";
import { compressPhotoFile, uploadPhoto } from "../services/photoStorageService";
import { verifyTurnstileToken } from "../services/turnstileService";
import type { Coordinates, SupportReport } from "../types/request";
import { PhotoUploader } from "./PhotoUploader";
import { TextInput } from "./TextInput";
import { BackButton } from "./BackButton";
import { PhoneInput } from "./PhoneInput";
import { TurnstileWidget } from "./TurnstileWidget";

interface SupportOfferFormProps {
  isOpen: boolean;
  currentLocation?: Coordinates;
  currentUserName?: string;
  currentUserPhone?: string;
  onClose: () => void;
  onSubmit: (input: Partial<SupportReport>) => void;
}

export function SupportOfferForm({ isOpen, currentLocation, currentUserName = "", currentUserPhone = "", onClose, onSubmit }: SupportOfferFormProps) {
  const [supporterName, setSupporterName] = useState("");
  const [supporterPhone, setSupporterPhone] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [details, setDetails] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [photoError, setPhotoError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSupporterName("");
    setSupporterPhone("");
    setAnonymous(false);
    setDetails("");
    setPhotoUrl(undefined);
    setPhotoFile(undefined);
    setPhotoError("");
    setTurnstileToken("");
    setIsSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  async function handlePhoto(file?: File) {
    setPhotoError("");
    if (!file) {
      setPhotoUrl(undefined);
      setPhotoFile(undefined);
      return;
    }

    try {
      const compressedFile = await compressPhotoFile(file);
      setPhotoFile(compressedFile);
      setPhotoUrl(URL.createObjectURL(compressedFile));
    } catch (nextError) {
      setPhotoError(nextError instanceof Error ? nextError.message : "La foto no se pudo usar. Puedes continuar sin foto.");
      setPhotoUrl(undefined);
      setPhotoFile(undefined);
    }
  }

  async function submitSupport() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setPhotoError("");
    try {
      await verifyTurnstileToken(turnstileToken);
      const uploadedPhotoUrl = photoFile ? await uploadPhoto(photoFile, "support") : photoUrl;
      onSubmit({
        supporterName: anonymous ? undefined : currentUserName.trim() || supporterName.trim() || undefined,
        supporterPhone: anonymous ? undefined : currentUserPhone.trim() || supporterPhone.trim() || undefined,
        anonymous,
        details,
        photoUrl: uploadedPhotoUrl,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
      });
    } catch (nextError) {
      setPhotoError(nextError instanceof Error ? nextError.message : "La foto no se pudo subir. Intenta de nuevo sin foto.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-[1100] bg-white">
      <section className="nexo-form-screen h-full overflow-y-auto px-7 pb-7 pt-20">
        <BackButton onClick={onClose} label="Ofreciendo apoyo" />

        <div className="nexo-form-stack mt-10">
          <section className="nexo-form-group">
            <p className="text-[14px] font-extrabold text-sos-muted">¿Quién apoya?</p>
            <TextInput
              label=""
              value={anonymous ? "" : currentUserName || supporterName}
              disabled
              onChange={(event) => setSupporterName(event.target.value)}
              placeholder="Nombre y apellido"
            />
            <PhoneInput
              label=""
              value={anonymous ? "" : currentUserPhone || supporterPhone}
              disabled
              onChange={setSupporterPhone}
              placeholder="Teléfono"
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

          <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
          <div className="nexo-form-actions pt-2">
            <button
              type="button"
              onClick={submitSupport}
              disabled={isSubmitting}
              className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:opacity-50"
            >
              {isSubmitting ? "Enviando..." : "Completar solicitud"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
