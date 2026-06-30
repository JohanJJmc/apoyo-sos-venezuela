import { useEffect, useMemo, useState } from "react";
import { CATEGORY_ITEMS, CATEGORIES } from "../data/categories";
import type { Coordinates, Request } from "../types/request";
import { CategoryDropdown } from "./CategoryDropdown";
import { PhotoUploader } from "./PhotoUploader";
import { TextInput } from "./TextInput";

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
  onSubmit: (draft: RequestDraft) => void;
  onUseManualLocation: () => void;
  onCancelManualLocation: () => void;
  pickingLocation: boolean;
  error?: string;
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
}: RequestFormModalProps) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [item, setItem] = useState(CATEGORY_ITEMS[CATEGORIES[0]][0]);
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterAnonymous, setRequesterAnonymous] = useState(false);
  const [address, setAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ label: string; latitude: number; longitude: number }>>([]);
  const [addressLocation, setAddressLocation] = useState<Coordinates | undefined>();

  const hasPreciseLocation = Boolean(selectedLocation ?? currentLocation);
  const location = selectedLocation ?? addressLocation ?? currentLocation ?? FALLBACK_LOCATION;
  const quantityNumber = Number(quantity);
  const canSubmit = Boolean(category && item && quantityNumber > 0);

  const locationText = useMemo(() => {
    if (!location) return "Ubicacion no disponible. Ajusta la ubicacion manualmente en el mapa.";
    return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
  }, [location]);

  useEffect(() => {
    if (!isOpen) return;
    setCategory(CATEGORIES[0]);
    setItem(CATEGORY_ITEMS[CATEGORIES[0]][0]);
    setQuantity("");
    setDescription("");
    setPhotoUrl(undefined);
    setPhotoError("");
    setRequesterName("");
    setRequesterPhone("");
    setRequesterAnonymous(false);
    setAddress(initialAddress ?? "");
    setAddressLocation(undefined);
    setAddressSuggestions([]);
  }, [initialAddress, isOpen]);

  useEffect(() => {
    if (!isOpen || address.trim().length < 4) {
      setAddressSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=4&countrycodes=ve&q=${encodeURIComponent(address)}`,
          { signal: controller.signal },
        );
        const results = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>;
        setAddressSuggestions(
          results.map((result) => ({
            label: result.display_name,
            latitude: Number(result.lat),
            longitude: Number(result.lon),
          })),
        );
      } catch {
        if (!controller.signal.aborted) setAddressSuggestions([]);
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [address, isOpen]);

  if (!isOpen) return null;

  function changeCategory(nextCategory: string) {
    setCategory(nextCategory);
    setItem(CATEGORY_ITEMS[nextCategory][0]);
  }

  function handlePhoto(file?: File) {
    setPhotoError("");
    if (!file) {
      setPhotoUrl(undefined);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoError("La foto no se pudo usar. Puedes publicar sin foto.");
      setPhotoUrl(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result));
    reader.onerror = () => {
      setPhotoError("La foto no se pudo cargar. Puedes publicar sin foto.");
      setPhotoUrl(undefined);
    };
    reader.readAsDataURL(file);
  }

  function submit() {
    if (!canSubmit) return;
    onSubmit({
      category,
      item,
      quantity: quantityNumber,
      description: description.trim() || undefined,
      photoUrl,
      latitude: location.latitude,
      longitude: location.longitude,
      requesterName: requesterAnonymous ? undefined : requesterName.trim() || undefined,
      requesterPhone: requesterAnonymous ? undefined : requesterPhone.trim() || undefined,
      requesterAnonymous,
      address,
    });
  }

  return (
    <div className="absolute inset-0 z-[1000] bg-white">
      <section
        className="h-full overflow-y-auto px-7 pb-7 pt-20"
      >
        <button type="button" onClick={onClose} className="absolute left-7 top-10 grid h-10 w-10 place-items-center rounded-pill bg-sos-background text-2xl">
          ‹
        </button>
        <div className="mb-9 text-center">
          <h2 className="text-[18px] font-extrabold text-sos-ink">Nueva solicitud</h2>
        </div>

        <div className="space-y-5">
          <CategoryDropdown category={category} item={item} onCategoryChange={changeCategory} onItemChange={setItem} />

          <section className="space-y-3">
            <p className="text-[14px] font-extrabold text-sos-muted">¿Quién Solicita?</p>
            <TextInput
              label=""
              value={requesterName}
              disabled={requesterAnonymous}
              onChange={(event) => setRequesterName(event.target.value)}
              placeholder="Nombre y apellido"
            />
            <TextInput
              label=""
              value={requesterPhone}
              disabled={requesterAnonymous}
              onChange={(event) => setRequesterPhone(event.target.value)}
              placeholder="📞 Telefono"
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
            label="Cantidad necesaria"
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="Cantidad"
          />

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
            <TextInput label="" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Dirección o punto de referencia" />
            {addressSuggestions.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-input border border-sos-border bg-white shadow-soft">
                {addressSuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.latitude}-${suggestion.longitude}-${suggestion.label}`}
                    type="button"
                    onClick={() => {
                      setAddress(suggestion.label);
                      setAddressLocation({ latitude: suggestion.latitude, longitude: suggestion.longitude });
                      setAddressSuggestions([]);
                    }}
                    className="block w-full border-b border-sos-border px-3 py-2 text-left text-[13px] font-semibold text-sos-ink last:border-b-0"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={onUseManualLocation} className="mt-2 text-[15px] font-extrabold text-[#00A651]">
              {hasPreciseLocation ? "Ubicación detectada ✓" : "Usando ubicación aproximada ✓"}
            </button>
            <button type="button" onClick={onCancelManualLocation} className="ml-3 mt-2 text-[13px] font-bold text-sos-muted">
              Usar GPS
            </button>
            <p className="sr-only">{locationText}</p>
            {pickingLocation && (
              <p className="mt-2 rounded-input bg-sos-primarySoft px-3 py-2 text-[13px] font-bold text-sos-primary">
                Toca el mapa detras del formulario para mover la ubicacion.
              </p>
            )}
          </section>

          {similarRequest && (
            <div className="rounded-input border border-sos-pending/20 bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">
              Ya existe una solicitud similar cerca de esta ubicacion.
            </div>
          )}
          {error && <p className="rounded-input bg-sos-pendingSoft p-3 text-[13px] font-bold text-sos-pending">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="sos-gradient mt-3 min-h-14 w-full rounded-pill px-5 text-[16px] font-extrabold text-white shadow-soft disabled:bg-sos-border disabled:shadow-none"
          >
            Enviar Solicitud
          </button>
        </div>
      </section>
    </div>
  );
}
