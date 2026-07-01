import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountScreen } from "./components/AccountScreen";
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
import { ToastMessage } from "./components/ToastMessage";
import { getStoredSession, saveSession, type AppSession } from "./services/authSession";
import { authService } from "./services/authService";
import { reverseGeocodeAddress } from "./services/geocodeService";
import { ModerationBlockedError, validateSafeContent } from "./services/moderationService";
import { requestQueue } from "./services/requestQueue";
import { requestService } from "./services/requestService";
import { SAFETY_BLOCK_THRESHOLD, safetyService } from "./services/safetyService";
import { supabase } from "./services/supabaseClient";
import type { Coordinates, Filters, Request, SupportReport } from "./types/request";
import type { AppView } from "./components/ViewTabs";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  if (error && typeof error === "object") {
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function isPasswordRecoveryUrl() {
  const query = new URLSearchParams(window.location.search);
  const hashText = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hash = new URLSearchParams(hashText);

  return (
    query.get("auth_action") === "recovery" ||
    query.get("type") === "recovery" ||
    hash.get("auth_action") === "recovery" ||
    hash.get("type") === "recovery"
  );
}

function clearAuthActionFromUrl() {
  if (!window.location.search && !window.location.hash) return;
  window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
}

function App() {
  const [session, setSession] = useState<AppSession | null>(() => getStoredSession());
  const [requests, setRequests] = useState<Request[]>([]);
  const [filters, setFilters] = useState<Filters>({ showPending: true, showResolved: false, category: "Todas" });
  const [activeView, setActiveView] = useState<AppView>("map");
  const [userLocation, setUserLocation] = useState<Coordinates>();
  const [manualLocation, setManualLocation] = useState<Coordinates>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [authRequiredForRequest, setAuthRequiredForRequest] = useState(false);
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMapFilterOpen, setIsMapFilterOpen] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [formError, setFormError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [supportRequestId, setSupportRequestId] = useState<string | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => isPasswordRecoveryUrl());
  const manualGeocodeRequest = useRef(0);
  const mapGeocodeRequest = useRef(0);
  const realtimeRefreshTimer = useRef<number | null>(null);

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

  const flushQueuedRequests = useCallback(async () => {
    if (!navigator.onLine || requestQueue.count() === 0) return;

    const queuedRequests = requestQueue.list();
    let syncedCount = 0;

    for (const queued of queuedRequests) {
      try {
        requestQueue.markAttempt(queued.id);
        await requestService.createRequest(queued.input);
        requestQueue.remove(queued.id);
        syncedCount += 1;
      } catch {
        break;
      }
    }

    if (syncedCount > 0) {
      setSyncMessage(`${syncedCount} solicitud${syncedCount === 1 ? "" : "es"} pendiente${syncedCount === 1 ? "" : "s"} enviada${syncedCount === 1 ? "" : "s"}.`);
      window.setTimeout(() => setSyncMessage(""), 5000);
      await reloadRequests();
    }
  }, [reloadRequests]);

  useEffect(() => {
    void flushQueuedRequests();
  }, [flushQueuedRequests, session]);

  useEffect(() => {
    if (!session) return;

    const interval = window.setInterval(() => {
      void reloadRequests();
      void flushQueuedRequests();
    }, 20000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void reloadRequests();
        void flushQueuedRequests();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushQueuedRequests, reloadRequests, session]);

  useEffect(() => {
    if (!session || !supabase) return;
    const realtimeClient = supabase;

    function scheduleRealtimeReload() {
      if (realtimeRefreshTimer.current) {
        window.clearTimeout(realtimeRefreshTimer.current);
      }

      realtimeRefreshTimer.current = window.setTimeout(() => {
        void reloadRequests();
      }, 350);
    }

    const channel = realtimeClient
      .channel("nexo-requests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, scheduleRealtimeReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_reports" }, scheduleRealtimeReload)
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setSyncMessage("Realtime desconectado temporalmente. Seguiremos actualizando cada 20 segundos.");
          window.setTimeout(() => setSyncMessage(""), 5000);
        }
      });

    return () => {
      if (realtimeRefreshTimer.current) {
        window.clearTimeout(realtimeRefreshTimer.current);
        realtimeRefreshTimer.current = null;
      }
      void realtimeClient.removeChannel(channel);
    };
  }, [reloadRequests, session]);

  useEffect(() => {
    if (session) return;
    void authService.getSupabaseSession().then((nextSession) => {
      if (nextSession) setSession(nextSession);
    });
  }, [session]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY" || isPasswordRecoveryUrl()) {
        setIsPasswordRecovery(true);
      }
      if (nextSession?.user) {
        const nextAppSession = {
          userId: nextSession.user.id,
          email: nextSession.user.email ?? undefined,
          name: nextSession.user.user_metadata?.full_name ?? undefined,
          phone: nextSession.user.user_metadata?.phone ?? undefined,
        };
        saveSession(nextAppSession);
        setSession(nextAppSession);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function updateOnlineStatus() {
      setIsOffline(!navigator.onLine);
      if (navigator.onLine) void flushQueuedRequests();
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
        setManualAddress(address || "Dirección no encontrada. Mueve un poco el mapa o usa GPS.");
      }
    } catch {
      if (manualGeocodeRequest.current === requestId) {
        setManualAddress("Dirección no encontrada. Mueve un poco el mapa o usa GPS.");
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
        setMapCenterAddress(address || "Dirección no encontrada. Mueve un poco el mapa.");
      }
    } catch {
      if (mapGeocodeRequest.current === requestId) {
        setMapCenterAddress("Dirección no encontrada. Mueve un poco el mapa.");
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
  const currentUserName = session?.name || session?.email?.split("@")[0] || "";
  const currentUserPhone = session?.phone || "";

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 6000);
  }

  async function handleModerationBlocked(error: unknown) {
    const reason = getErrorMessage(error, "Se detectó texto indebido o riesgoso.");
    const status = await safetyService.recordViolation(reason);
    const remaining = Math.max(SAFETY_BLOCK_THRESHOLD - status.violationCount, 0);

    if (status.blocked) {
      showToast("Cuenta bloqueada por múltiples intentos de publicar contenido indebido o sospechoso.");
      return "Cuenta bloqueada por seguridad. Contacta al equipo de NEXO si crees que fue un error.";
    }

    showToast(`Texto indebido detectado. Intento ${status.violationCount}/${SAFETY_BLOCK_THRESHOLD}. Te quedan ${remaining} antes del bloqueo.`);
    return reason;
  }

  async function openForm() {
    setFormError("");
    setSimilarRequest(null);
    setPendingDraft(null);
    if (await safetyService.isBlocked()) {
      showToast("Esta cuenta está bloqueada por seguridad y no puede publicar solicitudes.");
      return;
    }
    if (session?.isAnonymous) {
      setAuthRequiredForRequest(true);
      return;
    }
    if (mapCenterAddress) setDetectedAddress(mapCenterAddress);
    setIsFormOpen(true);
  }

  async function submitDraft(draft: RequestDraft) {
    setFormError("");
    if (await safetyService.isBlocked()) {
      const blockedMessage = "Esta cuenta está bloqueada por seguridad y no puede publicar solicitudes.";
      setFormError(blockedMessage);
      showToast(blockedMessage);
      return;
    }

    try {
      await validateSafeContent("request", {
        category: draft.category,
        item: draft.item,
        description: draft.description,
        address: draft.address,
        requesterName: draft.requesterName,
      });
    } catch (nextError) {
      if (nextError instanceof ModerationBlockedError) {
        setFormError(await handleModerationBlocked(nextError));
      } else {
        setFormError(getErrorMessage(nextError, "El contenido no pudo ser validado por seguridad."));
      }
      return;
    }

    const similar = await requestService.findSimilarPending(draft.category, draft);
    if (similar) {
      setPendingDraft(draft);
      setSimilarRequest(similar);
      return;
    }

    try {
      await requestService.createRequest(draft);
      await finishCreateFlow();
    } catch (nextError) {
      if (navigator.onLine) {
        setFormError(getErrorMessage(nextError, "Supabase rechazó la solicitud. Revisa que hayas ejecutado el SQL de permisos para usuarios autenticados."));
        return;
      }

      requestQueue.enqueue(draft);
      setSyncMessage("Sin conexión: guardamos la solicitud y se enviará automáticamente.");
      await finishCreateFlow();
    }
  }

  async function finishCreateFlow() {
    setIsFormOpen(false);
    setSimilarRequest(null);
    setPendingDraft(null);
    setPickingLocation(false);
    setManualLocation(undefined);
    setFormError("");
    try {
      await reloadRequests();
    } catch {
      setSyncMessage("La solicitud fue enviada. El mapa se actualizará al recuperar conexión.");
    }
  }

  async function createDraftAnyway() {
    if (!pendingDraft) return;
    try {
      await requestService.createRequest(pendingDraft);
      await finishCreateFlow();
    } catch (nextError) {
      if (navigator.onLine) {
        setFormError(getErrorMessage(nextError, "Supabase rechazó la solicitud. Revisa que hayas ejecutado el SQL de permisos para usuarios autenticados."));
        return;
      }

      requestQueue.enqueue(pendingDraft);
      setSyncMessage("Sin conexión: guardamos la solicitud y se enviará automáticamente.");
      await finishCreateFlow();
    }
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
    if (session?.isAnonymous) {
      setSelectedRequest(null);
      setAuthRequiredForRequest(true);
      showToast("Para ofrecer apoyo debes crear una cuenta o iniciar sesión.");
      return;
    }

    void safetyService.isBlocked().then((blocked) => {
      if (blocked) {
        showToast("Esta cuenta está bloqueada por seguridad y no puede ofrecer apoyo.");
        return;
      }
      setSupportRequestId(requestId);
      setSelectedRequest(null);
    });
  }

  async function submitSupportOffer(input: Partial<SupportReport>) {
    if (!supportRequestId) return;
    if (await safetyService.isBlocked()) {
      showToast("Esta cuenta está bloqueada por seguridad y no puede ofrecer apoyo.");
      return;
    }

    try {
      await validateSafeContent("support", {
        supporterName: input.supporterName,
        details: input.details,
      });
      await requestService.offerSupport(supportRequestId, input);
      setSupportRequestId(null);
      await reloadRequests();
    } catch (nextError) {
      if (nextError instanceof ModerationBlockedError) {
        showToast(await handleModerationBlocked(nextError));
      } else {
        showToast(getErrorMessage(nextError, "El contenido no pudo ser validado por seguridad."));
      }
    }
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
    setAuthRequiredForRequest(false);
    void reloadRequests();
  }

  async function handleSignOut() {
    await authService.signOut();
    setSession(null);
    setRequests([]);
  }

  async function handleDeleteAccountData() {
    if (!session) return;

    const confirmed = window.confirm(
      "Esto eliminará tu cuenta y borrará tus solicitudes y apoyos asociados. Esta acción no se puede deshacer. ¿Quieres continuar?",
    );
    if (!confirmed) return;

    try {
      if (session.isAnonymous) {
        await requestService.deleteCurrentUserData();
        await authService.signOut();
      } else {
        await authService.deleteCurrentUserAccount();
      }
      setSession(null);
      setRequests([]);
      setSelectedRequest(null);
      setIsFormOpen(false);
      setSupportRequestId(null);
    } catch (nextError) {
      window.alert(getErrorMessage(nextError, "No se pudo eliminar la cuenta."));
    }
  }

  if (isPasswordRecovery) {
    return (
      <LoginScreen
        onLogin={(nextSession) => {
          handleLogin(nextSession);
          setIsPasswordRecovery(false);
          clearAuthActionFromUrl();
        }}
        initialView="resetPassword"
      />
    );
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (authRequiredForRequest) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        initialView="signup"
        securityNotice
        onCancel={() => setAuthRequiredForRequest(false)}
      />
    );
  }

  if (isAccountOpen) {
    return (
      <AccountScreen
        session={session}
        onBack={() => setIsAccountOpen(false)}
        onSessionChange={(nextSession) => {
          setSession(nextSession);
          saveSession(nextSession);
        }}
      />
    );
  }

  return (
    <AppLayout>
      <AppHeader
        activeView={activeView}
        isOffline={isOffline}
        session={session}
        onChangeView={setActiveView}
        onOpenAccount={() => setIsAccountOpen(true)}
        onSignOut={handleSignOut}
        onDeleteAccountData={handleDeleteAccountData}
      />

      {syncMessage && (
        <div className="fixed left-4 right-4 top-32 z-[1300] rounded-input bg-sos-primarySoft px-4 py-3 text-center text-[13px] font-extrabold text-sos-primary shadow-soft">
          {syncMessage}
        </div>
      )}

      {toastMessage && (
        <div className="fixed left-4 right-4 top-48 z-[1400]">
          <ToastMessage message={toastMessage} tone="danger" />
        </div>
      )}

      {activeView === "map" && (
        <section className={`absolute inset-x-0 bottom-0 ${contentTopClass}`}>
          <MapScreen
            requests={visibleRequests}
            userLocation={userLocation}
            pickingLocation={pickingLocation}
            recenterSignal={recenterSignal}
            onSelectRequest={setSelectedRequest}
            onCenterChange={handleMapCenterChange}
            onManualLocationPreview={previewManualLocation}
          />
          {!pickingLocation && (
            <div className="fixed right-4 top-1/2 z-[910] flex -translate-y-1/2 flex-col gap-3">
              <button
                type="button"
                onClick={() => setIsMapFilterOpen((open) => !open)}
                className={`grid h-12 w-12 place-items-center rounded-pill border text-[22px] shadow-soft ${
                  isMapFilterOpen ? "border-sos-orange bg-sos-orange text-white" : "border-sos-border bg-white text-sos-ink"
                }`}
                aria-label="Abrir filtros"
                aria-expanded={isMapFilterOpen}
              >
                ⌘
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!userLocation) {
                    setLocationMessage("No se pudo acceder al GPS. Revisa el permiso de ubicacion.");
                    return;
                  }
                  setRecenterSignal((value) => value + 1);
                }}
                className="grid h-12 w-12 place-items-center rounded-pill border border-sos-border bg-white text-[22px] text-sos-ink shadow-soft disabled:opacity-50"
                aria-label="Centrar mapa en mi ubicacion"
                disabled={!userLocation}
              >
                ◎
              </button>
            </div>
          )}
          {isMapFilterOpen && !pickingLocation && (
            <div className="absolute left-4 right-20 top-4 z-[910]">
              <FilterChips filters={filters} onChange={setFilters} placement="static" />
            </div>
          )}
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
                  onFocus={() => setIsFilterOpen(true)}
                  placeholder="Dirección, nombre, categoría o insumo"
                  className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setIsFilterOpen((open) => !open)}
                className={`grid h-12 w-12 place-items-center rounded-pill border text-2xl ${
                  isFilterOpen ? "border-sos-orange bg-sos-orange text-white" : "border-transparent text-sos-muted"
                }`}
                aria-label="Filtros"
                aria-expanded={isFilterOpen}
              >
                ⌘
              </button>
            </div>

            {isFilterOpen && (
              <div className="mb-5">
                <FilterChips filters={filters} onChange={setFilters} placement="static" />
              </div>
            )}

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
        currentUserName={currentUserName}
        currentUserPhone={currentUserPhone}
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
        currentUserName={currentUserName}
        currentUserPhone={currentUserPhone}
        onClose={() => setSupportRequestId(null)}
        onSubmit={submitSupportOffer}
      />
    </AppLayout>
  );
}

export default App;
