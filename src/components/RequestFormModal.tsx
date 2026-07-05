import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_ITEMS, CATEGORIES } from "../data/categories";
import { uploadPhoto, validatePhotoFile } from "../services/photoStorageService";
import { verifyTurnstileToken } from "../services/turnstileService";
import type { Coordinates, Request } from "../types/request";
import { CategoryDropdown } from "./CategoryDropdown";
import { PhotoUploader } from "./PhotoUploader";
import { TextInput } from "./TextInput";
import { BackButton } from "./BackButton";
import { PhoneInput } from "./PhoneInput";
import { TurnstileWidget } from "./TurnstileWidget";

const FALLBACK_LOCATION: Coordinates = { latitude: 10.5, longitude: -66.9167 };

export interface RequestDraft {
  category: string;
  item: string;
  quantity: number;
  description?: string;
  photoUrl?: string;
  latitude: number;
  longitude: number;
  requesterName?: string;
  requesterPhone?: string;
  requesterAnonymous?: boolean;
  address?: string;
}

interface RequestFormModalProps {
  isOpen: boolean;
  currentLocation?: Coordinates;
  selectedLocation?: Coordinates;
  initialAddress?: string;
  similarRequest?: Request | null;
  onClose: () => void;
  onSubmit: (draft: RequestDraft) => Promise<void> | void;
  onUseManualLocation: () => void;
  onCancelManualLocation: () => void;
  pickingLocation: boolean;
  error?: string;
  currentUserName?: string;
  currentUserPhone?: string;
}

export function RequestFormModal({
  isOpen,
  currentLocation,
  selectedLocation,
  initialAddress,
  similarRequest,
  onClose,
  onSubmit,
  onUseManualLocation,
  onCancelManualLocation,
  pickingLocation,
  error,
  currentUserName = "",
  currentUserPhone = "",
}: RequestFormModalProps) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [item, setItem] = useState(CATEGORY_ITEMS[CATEGORIES[0]][0]);
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [photoError, setPhotoError] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterAnonymous, setRequesterAnonymous] = useState(false);
  const [address, setAddress] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wasOpen = useRef(false);

  const hasPreciseLocation = Boolean(selectedLocation ?? currentLocation);
  const location = selectedLocation ?? currentLocation ?? FALLBACK_LOCATION;
  const canSubmit = Boolean(category && item);

  const locationText = useMemo(() => {
    if (!location) return "Ubicacion no disponible. Ajusta la ubicacion manualmente en el mapa.";
    return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
  }, [location]);

  useEffect(() => {
    if (!isOpen) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return;
    wasOpen.current = true;
    setCategory(CATEGORIES[0]);
    setItem(CATEGORY_ITEMS[CATEGORIES[0]][0]);
    setDescription("");
    setPhotoUrl(undefined);
    setPhotoFile(undefined);
    setPhotoError("");
    setRequesterName("");
    setRequesterPhone("");
    setRequesterAnonymous(false);
    setAddress(initialAddress ?? "");
    setTurnstileToken("");
    setIsSubmitting(false);
  }, [initialAddress, isOpen]);

  useEffect(() => {
    if (!isOpen || !pickingLocation || !initialAddress) return;
    setAddress(initialAddress);
  }, [initialAddress, isOpen, pickingLocation]);

  if (!isOpen) return null;

  function changeCategory(nextCategory: string) {
    setCategory(nextCategory);
    setItem(CATEGORY_ITEMS[nextCategory][0]);
  }

  function handlePhoto(file?: File) {
    setPhotoError("");
    if (!file) {
      setPhotoUrl(undefined);
      setPhotoFile(undefined);
      return;
    }

    try {
      validatePhotoFile(file);
    } catch (nextError) {
      setPhotoError(nextError instanceof Error ? nextError.message : "La foto no se pudo usar. Puedes publicar sin foto.");
      setPhotoUrl(undefined);
      setPhotoFile(undefined);
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result));
    reader.onerror = () => {
      setPhotoError("La foto no se pudo cargar. Puedes publicar sin foto.");
      setPhotoUrl(undefined);
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setPhotoError("");
    try {
      await verifyTurnstileToken(turnstileToken);
      let uploadedPhotoUrl = photoUrl;
      if (photoFile) {
        uploadedPhotoUrl = await uploadPhoto(photoFile, "requests");
      }
      await onSubmit({
        category,
        item,
        quantity: 1,
        description: description.trim() || undefined,
        photoUrl: uploadedPhotoUrl,
        latitude: location.latitude,
        longitude: location.longitude,
        requesterName: requesterAnonymous ? undefined : currentUserName.trim() || requesterName.trim() || undefined,
        requesterPhone: requesterAnonymous ? undefined : currentUserPhone.trim() || requesterPhone.trim() || undefined,
        requesterAnonymous,
        address,
      });
    } catch (nextError) {
      setPhotoError(nextError instanceof Error ? nextError.message : "La foto no se pudo subir. Intenta de nuevo sin foto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`absolute inset-0 z-[1000] ${pickingLocation ? "pointer-events-none bg-transparent" : "bg-white"}`}>
      <section
        className={`nexo-form-screen h-full overflow-y-auto px-7 pb-7 pt-20 ${pickingLocation ? "hidden" : ""}`}
      >
        <BackButton onClick={onClose} label="Nueva solicitud" />

        <div className="nexo-form-stack mt-10">
          <CategoryDropdown category={category} item={item} onCategoryChange={changeCategory} onItemChange={setItem} />

          <section className="nexo-form-group">
            <p className="text-[14px] font-extrabold text-sos-muted">¿Quién Solicita?</p>
            <TextInput
              label=""
              value={requesterAnonymous ? "" : currentUserName || requesterName}
              disabled
              onChange={(event) => setRequesterName(event.target.value)}
              placeholder="Nombre y apellido"
            />
            <PhoneInput
              label=""
              value={requesterAnonymous ? "" : currentUserPhone || requesterPhone}
              disabled
              onChange={setRequesterPhone}
              placeholder="Teléfono"
            />
            <label className="flex min-h-12 items-center gap-3 rounded-input border border-sos-border bg-sos-background px-4 text-[16px] font-semibold text-sos-ink">
              <input
                type="checkbox"
                checked={requesterAnonymous}
                onChange={(event) => {
                  setRequesterAnonymous(event.target.checked);
                  if (event.target.checked) {
                    setRequesterName("");
                    setRequesterPhone("");
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
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ejemplo: familia de 4 personas, adulto mayor, punto de referencia"
            rows={3}
          />

          <PhotoUploader photoUrl={photoUrl} error={photoError} onChange={handlePhoto} />

          <section>
            <p className="mb-2 text-[14px] font-extrabold text-sos-muted">Ubicación</p>
            <TextInput
              label=""
              value={address}
              readOnly
              placeholder="Dirección detectada automáticamente"
              className="cursor-default bg-white text-sos-ink"
            />
            <button type="button" onClick={onUseManualLocation} className="mt-2 text-[15px] font-extrabold text-[#00A651]">
              {hasPreciseLocation ? "Ubicación detectada ✓" : "Usando ubicación aproximada ✓"}
            </button>
            <button type="button" onClick={onCancelManualLocation} className="ml-3 mt-2 text-[13px] font-bold text-sos-muted">
              Usar GPS
            </button>
            <p className="sr-only">{locationText}</p>
            {pickingLocation && (
              <p className="mt-2 rounded-input bg-sos-primarySoft px-3 py-2 text-[13px] font-bold text-sos-primary">
                Mueve el mapa hasta que la reticula quede sobre el punto correcto.
              </p>
            )}
          </section>

          {similarRequest && (
            <div className="rounded-input border border-sos-pending/20 bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">
              Ya existe una solicitud similar cerca de esta ubicacion.
            </div>
          )}
          {error && <p className="rounded-input bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">{error}</p>}

          <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
          <div className="nexo-form-actions pt-2">
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || isSubmitting}
              className="sos-gradient min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:bg-sos-border disabled:shadow-none"
            >
              {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
