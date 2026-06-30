import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { AppLayout } from "./components/AppLayout";
import { EmptyState } from "./components/EmptyState";
import { FilterChips } from "./components/FilterChips";
import { FloatingActionButton } from "./components/FloatingActionButton";
import { HomeActionPanel } from "./components/HomeActionPanel";
import { LoginScreen } from "./components/LoginScreen";
import { MapScreen } from "./components/MapScreen";
import { RequestCard } from "./components/RequestCard";
import { RequestDetailBottomSheet } from "./components/RequestDetailBottomSheet";
import { RequestDraft, RequestFormBottomSheet } from "./components/RequestFormBottomSheet";
import { SimilarRequestDialog } from "./components/SimilarRequestDialog";
import { SupportOfferForm } from "./components/SupportOfferForm";
import { getStoredSession, saveSession, type AppSession } from "./services/authSession";
import { reverseGeocodeAddress } from "./services/geocodeService";
import { requestService } from "./services/requestService";
import type { Coordinates, Filters, Request, SupportReport } from "./types/request";
import type { AppView } from "./components/ViewTabs";

function App() {
  const [session, setSession] = useState<AppSession | null>(() => getStoredSession());
  const [requests, setRequests] = useState<Request[]>([]);
  const [filters, setFilters] = useState<Filters>({ showPending: true, showResolved: false, category: "Todas" });
  const [activeView, setActiveView] = useState<AppView>("map");
  const [userLocation, setUserLocation] = useState<Coordinates>();
  const [manualLocation, setManualLocation] = useState<Coordinates>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [similarRequest, setSimilarRequest] = useState<Request | null>(null);
  const [pendingDraft, setPendingDraft] = useState<RequestDraft | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [locationMessage, setLocationMessage] = useState("Solicitando ubicacion GPS...");
  const [detectedAddress, setDetectedAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [isDetectingManualAddress, setIsDetectingManualAddress] = useState(false);
  const [mapCenterAddress, setMapCenterAddress] = useState("");
  const [isDetectingMapCenterAddress, setIsDetectingMapCenterAddress] = useState(false);
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState("");
  const [supportRequestId, setSupportRequestId] = useState<string | null>(null);
  const manualGeocodeRequest = useRef(0);
  const mapGeocodeRequest = useRef(0);

  const reloadRequests = useCallback(async () => {
    try {
      setRequests(await requestService.listRequests());
    } catch {
      setFormError("No se pudieron cargar las solicitudes. Revisa la conexion.");
    }
  }, []);

  useEffect(() => {
    void reloadRequests();
  }, [reloadRequests]);

  useEffect(() => {
    function updateOnlineStatus() {
      setIsOffline(!navigator.onLine);
    }

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationMessage("GPS no disponible. Puedes ajustar la ubicacion manualmente.");
      return;
    }

    const updatePosition = (position: GeolocationPosition) => {
      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserLocation(nextLocation);
      setLocationMessage("Ubicacion detectada.");
      if (!pickingLocation) void reverseGeocode(nextLocation);
    };

    const handlePositionError = () => {
      setLocationMessage("No se pudo acceder al GPS. Puedes seleccionar ubicacion manualmente.");
    };

    navigator.geolocation.getCurrentPosition(updatePosition, handlePositionError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    });

    const watchId = navigator.geolocation.watchPosition(
      updatePosition,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [pickingLocation]);

  async function reverseGeocode(location: Coordinates) {
    try {
      const address = await reverseGeocodeAddress(location);
      if (address) setDetectedAddress(address);
    } catch {
      // Keep the last known address if the provider is temporarily unavailable.
    }
  }

  const reverseGeocodeManual = useCallback(async (location: Coordinates) => {
    const requestId = manualGeocodeRequest.current + 1;
    manualGeocodeRequest.current = requestId;
    setIsDetectingManualAddress(true);

    try {
      const address = await reverseGeocodeAddress(location);
      if (manualGeocodeRequest.current === requestId) {
        setManualAddress(address);
      }
    } catch {
      if (manualGeocodeRequest.current === requestId) {
        setManualAddress(`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`);
      }
    } finally {
      if (manualGeocodeRequest.current === requestId) setIsDetectingManualAddress(false);
    }
  }, []);

  const reverseGeocodeMapCenter = useCallback(async (location: Coordinates) => {
    const requestId = mapGeocodeRequest.current + 1;
    mapGeocodeRequest.current = requestId;
    setIsDetectingMapCenterAddress(true);

    try {
      const address = await reverseGeocodeAddress(location);
      if (mapGeocodeRequest.current === requestId) {
        setMapCenterAddress(address);
      }
    } catch {
      if (mapGeocodeRequest.current === requestId) {
        setMapCenterAddress(`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`);
      }
    } finally {
      if (mapGeocodeRequest.current === requestId) setIsDetectingMapCenterAddress(false);
    }
  }, []);

  const visibleRequests = useMemo(
    () =>
      requests.filter((request) => {
        const statusVisible =
          (request.status === "pending" && filters.showPending) ||
          (request.status === "resolved" && filters.showResolved);
        const categoryVisible = filters.category === "Todas" || request.category === filters.category;
        const query = search.trim().toLowerCase();
        const searchVisible =
          !query ||
          [request.category, request.item, request.description, request.address, request.requesterName, request.requesterPhone]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
        return statusVisible && categoryVisible && searchVisible;
      }),
    [requests, filters, search],
  );

  const visibleMyRequests = useMemo(
    () => visibleRequests.filter((request) => request.createdBy === requestService.currentUserId),
    [visibleRequests],
  );

  const selectedFreshRequest = useMemo(
    () => (selectedRequest ? requests.find((request) => request.id === selectedRequest.id) ?? selectedRequest : null),
    [requests, selectedRequest],
  );
  const contentTopClass = isOffline ? "top-48" : "top-44";

  function openForm() {
    setFormError("");
    setSimilarRequest(null);
    setPendingDraft(null);
    if (mapCenterAddress) setDetectedAddress(mapCenterAddress);
    setIsFormOpen(true);
  }

  async function submitDraft(draft: RequestDraft) {
    setFormError("");
    const similar = await requestService.findSimilarPending(draft.category, draft);
    if (similar) {
      setPendingDraft(draft);
      setSimilarRequest(similar);
      return;
    }

    try {
      await requestService.createRequest(draft);
      await finishCreateFlow();
    } catch {
      setFormError("No se pudo publicar la solicitud. Intenta de nuevo.");
    }
  }

  async function finishCreateFlow() {
    await reloadRequests();
    setIsFormOpen(false);
    setSimilarRequest(null);
    setPendingDraft(null);
    setPickingLocation(false);
    setManualLocation(undefined);
  }

  async function createDraftAnyway() {
    if (!pendingDraft) return;
    await requestService.createRequest(pendingDraft);
    await finishCreateFlow();
  }

  async function joinSimilar() {
    if (!similarRequest) return;
    await reloadRequests();
    setSelectedRequest(similarRequest);
    setIsFormOpen(false);
    setSimilarRequest(null);
    setPendingDraft(null);
  }

  function offerSupport(requestId: string) {
    setSupportRequestId(requestId);
    setSelectedRequest(null);
  }

  async function submitSupportOffer(input: Partial<SupportReport>) {
    if (!supportRequestId) return;
    await requestService.offerSupport(supportRequestId, input);
    setSupportRequestId(null);
    await reloadRequests();
  }

  async function confirmSupport(requestId: string, status: SupportReport["status"]) {
    await requestService.confirmSupport(requestId, status);
    await reloadRequests();
  }

  function startManualLocation() {
    setActiveView("map");
    const startingLocation = manualLocation ?? userLocation;
    if (startingLocation) {
      setManualLocation(startingLocation);
      setManualAddress(detectedAddress);
    }
    setPickingLocation(true);
    setFormError("");
  }

  function cancelManualLocation() {
    setManualLocation(undefined);
    setManualAddress("");
    setPickingLocation(false);
    setFormError("");
  }

  const previewManualLocation = useCallback((location: Coordinates) => {
    setManualLocation(location);
    void reverseGeocodeManual(location);
  }, [reverseGeocodeManual]);

  const handleMapCenterChange = useCallback((location: Coordinates) => {
    setManualLocation(location);
    void reverseGeocodeMapCenter(location);
  }, [reverseGeocodeMapCenter]);

  function confirmManualLocation() {
    if (manualAddress) setDetectedAddress(manualAddress);
    setPickingLocation(false);
    setFormError("");
  }

  function handleLogin(nextSession: AppSession) {
    saveSession(nextSession);
    setSession(nextSession);
    void reloadRequests();
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <AppLayout>
      <AppHeader
        activeView={activeView}
        isOffline={isOffline}
        onChangeView={setActiveView}
      />

      {activeView === "map" && (
        <section className={`absolute inset-x-0 bottom-0 ${contentTopClass}`}>
          <MapScreen
            requests={visibleRequests}
            userLocation={userLocation}
            pickingLocation={pickingLocation}
            onSelectRequest={setSelectedRequest}
            onCenterChange={handleMapCenterChange}
            onManualLocationPreview={previewManualLocation}
          />
          {!pickingLocation && (
            <HomeActionPanel
              locationReady={Boolean(userLocation || manualLocation)}
              address={mapCenterAddress}
              isDetectingAddress={isDetectingMapCenterAddress}
              onClick={openForm}
            />
          )}
        </section>
      )}

      {activeView !== "map" && (
        <section className={`absolute inset-x-0 bottom-0 ${contentTopClass} flex flex-col bg-sos-background`}>
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
            <div className="mb-5 flex items-center gap-3">
              <label className="flex min-h-14 flex-1 items-center gap-3 rounded-input border border-sos-border bg-white px-4">
                <span className="text-3xl leading-none">⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Escribe una direccion"
                  className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
                />
              </label>
              <button type="button" className="grid h-12 w-12 place-items-center text-2xl text-sos-muted" aria-label="Filtros">
                ⌘
              </button>
            </div>

            <div className="space-y-3">
              {(activeView === "requests" ? visibleRequests : visibleMyRequests).length === 0 ? (
                <EmptyState title="No hay solicitudes para mostrar." message="Revisa los filtros o crea una solicitud nueva." />
              ) : (
                (activeView === "requests" ? visibleRequests : visibleMyRequests).map((request) => (
                  <RequestCard key={request.id} request={request} onClick={() => setSelectedRequest(request)} />
                ))
              )}
            </div>
          </div>

          <div className="hidden border-t border-sos-border bg-white p-3 pb-24 shadow-sheet">
            <FilterChips filters={filters} onChange={setFilters} placement="static" />
          </div>
        </section>
      )}

      {activeView !== "map" && <FloatingActionButton onClick={openForm} />}

      <RequestFormBottomSheet
        isOpen={isFormOpen}
        currentLocation={userLocation}
        selectedLocation={manualLocation}
        initialAddress={manualAddress || mapCenterAddress || detectedAddress}
        similarRequest={similarRequest}
        onClose={() => {
          setIsFormOpen(false);
          setPickingLocation(false);
        }}
        onSubmit={submitDraft}
        onUseManualLocation={startManualLocation}
        onCancelManualLocation={cancelManualLocation}
        pickingLocation={pickingLocation}
        error={formError}
      />

      {pickingLocation && (
        <div className="absolute inset-x-4 bottom-5 z-[1200] rounded-card bg-white p-4 text-center shadow-sheet">
          <p className="text-[13px] font-extrabold text-sos-muted">Ubicación manual</p>
          <p className="mt-1 line-clamp-2 text-[15px] font-extrabold text-[#00A651]">
            {isDetectingManualAddress ? "Detectando dirección..." : manualAddress || "Mueve el mapa para detectar la dirección"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={cancelManualLocation}
              className="min-h-12 rounded-pill border border-sos-border bg-white px-4 text-[15px] font-extrabold text-sos-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmManualLocation}
              className="sos-gradient min-h-12 rounded-pill px-4 text-[15px] font-extrabold text-white shadow-soft"
            >
              Usar esta ubicación
            </button>
          </div>
        </div>
      )}

      <SimilarRequestDialog
        request={similarRequest}
        onJoin={joinSimilar}
        onCreateAnyway={createDraftAnyway}
        onCancel={() => {
          setSimilarRequest(null);
          setPendingDraft(null);
        }}
      />

      <RequestDetailBottomSheet
        request={selectedFreshRequest}
        currentUserId={requestService.currentUserId}
        onClose={() => setSelectedRequest(null)}
        onOfferSupport={offerSupport}
        onConfirmSupport={confirmSupport}
      />

      <SupportOfferForm
        isOpen={Boolean(supportRequestId)}
        currentLocation={userLocation ?? manualLocation}
        onClose={() => setSupportRequestId(null)}
        onSubmit={submitSupportOffer}
      />
    </AppLayout>
  );
}

export default App;
