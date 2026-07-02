import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountScreen } from "./components/AccountScreen";
import { AccountDeletedDialog } from "./components/AccountDeletedDialog";
import { AppHeader, type HeaderNotification } from "./components/AppHeader";
import { AppLayout } from "./components/AppLayout";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DeleteAccountPasswordDialog } from "./components/DeleteAccountPasswordDialog";
import { EmptyState } from "./components/EmptyState";
import { FilterChips } from "./components/FilterChips";
import { HomeActionPanel } from "./components/HomeActionPanel";
import { LoginScreen } from "./components/LoginScreen";
import { MapScreen, type MapLayerStyle } from "./components/MapScreen";
import { RequestCard } from "./components/RequestCard";
import { RequestDetailBottomSheet } from "./components/RequestDetailBottomSheet";
import { RequestDraft, RequestFormBottomSheet } from "./components/RequestFormBottomSheet";
import { RequiredPhoneScreen } from "./components/RequiredPhoneScreen";
import { SimilarRequestDialog } from "./components/SimilarRequestDialog";
import { SplashScreen } from "./components/SplashScreen";
import { SupportOfferForm } from "./components/SupportOfferForm";
import { ToastMessage } from "./components/ToastMessage";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { clearSession, getStoredSession, markWelcomeShown, saveSession, shouldShowWelcome, type AppSession } from "./services/authSession";
import { authService } from "./services/authService";
import { reverseGeocodeDetails } from "./services/geocodeService";
import { ModerationBlockedError, validateSafeContent } from "./services/moderationService";
import { requestQueue } from "./services/requestQueue";
import {
  MAX_AREA_REQUESTS_RADIUS_METERS,
  MAX_PENDING_REQUESTS_PER_AREA_RADIUS,
  MAX_PENDING_REQUESTS_PER_CATEGORY_ITEM_RADIUS,
  requestService,
} from "./services/requestService";
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

type ToastState = {
  message: string;
  tone: "info" | "success" | "danger";
};

type DestructiveDialogState =
  | { type: "cancel-request"; requestId: string }
  | { type: "delete-account" }
  | null;

function RequestListGroup({
  title,
  requests,
  onSelectRequest,
}: {
  title: string;
  requests: Request[];
  onSelectRequest: (request: Request) => void;
}) {
  if (requests.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4 px-1">
        <h2 className="text-[16px] font-extrabold text-sos-muted">{title}</h2>
        <span className="h-px flex-1 bg-sos-border" />
      </div>
      <div className="space-y-4">
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} onClick={() => onSelectRequest(request)} />
        ))}
      </div>
    </section>
  );
}

const SPLASH_MIN_DURATION_MS = 1700;

function App() {
  const [session, setSession] = useState<AppSession | null>(() => getStoredSession());
  const [isSplashVisible, setIsSplashVisible] = useState(() => Boolean(getStoredSession()));
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
  const [userCountryCode, setUserCountryCode] = useState("");
  const [userCountryName, setUserCountryName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualCountryCode, setManualCountryCode] = useState("");
  const [isDetectingManualAddress, setIsDetectingManualAddress] = useState(false);
  const [mapCenterLocation, setMapCenterLocation] = useState<Coordinates>();
  const [mapCenterAddress, setMapCenterAddress] = useState("");
  const [mapCenterCountryCode, setMapCenterCountryCode] = useState("");
  const [mapCenterCountryName, setMapCenterCountryName] = useState("");
  const [isDetectingMapCenterAddress, setIsDetectingMapCenterAddress] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMapFilterOpen, setIsMapFilterOpen] = useState(false);
  const [isMapLayerMenuOpen, setIsMapLayerMenuOpen] = useState(false);
  const [mapLayerStyle, setMapLayerStyle] = useState<MapLayerStyle>("standard");
  const mapFilterActionsRef = useRef<HTMLDivElement>(null);
  const mapFilterPanelRef = useRef<HTMLDivElement>(null);
  const listFilterRef = useRef<HTMLDivElement>(null);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [formError, setFormError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [supportRequestId, setSupportRequestId] = useState<string | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => isPasswordRecoveryUrl());
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [destructiveDialog, setDestructiveDialog] = useState<DestructiveDialogState>(null);
  const [isDestructiveActionRunning, setIsDestructiveActionRunning] = useState(false);
  const [isDeletePasswordOpen, setIsDeletePasswordOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [isAccountDeletedOpen, setIsAccountDeletedOpen] = useState(false);
  const manualGeocodeRequest = useRef(0);
  const mapGeocodeRequest = useRef(0);
  const mapGeocodeTimer = useRef<number | null>(null);
  const realtimeRefreshTimer = useRef<number | null>(null);
  const splashTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showSplash = useCallback(() => {
    setIsSplashVisible(true);
    if (splashTimer.current) window.clearTimeout(splashTimer.current);
    splashTimer.current = window.setTimeout(() => {
      setIsSplashVisible(false);
      splashTimer.current = null;
    }, SPLASH_MIN_DURATION_MS);
  }, []);

  useEffect(() => {
    if (!isSplashVisible) return;
    showSplash();
  }, [isSplashVisible, showSplash]);

  useEffect(() => {
    return () => {
      if (splashTimer.current) window.clearTimeout(splashTimer.current);
    };
  }, []);

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
    setIsFilterOpen(false);
    setIsMapFilterOpen(false);
    setFilters((currentFilters) => {
      const nextStatus =
        activeView === "mine"
          ? { showPending: true, showResolved: true }
          : { showPending: true, showResolved: false };

      if (
        currentFilters.showPending === nextStatus.showPending &&
        currentFilters.showResolved === nextStatus.showResolved
      ) {
        return currentFilters;
      }

      return { ...currentFilters, ...nextStatus };
    });
  }, [activeView]);

  useEffect(() => {
    if (!isFilterOpen && !isMapFilterOpen && !isMapLayerMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        isMapFilterOpen &&
        !mapFilterActionsRef.current?.contains(target) &&
        !mapFilterPanelRef.current?.contains(target)
      ) {
        setIsMapFilterOpen(false);
      }

      if (isFilterOpen && !listFilterRef.current?.contains(target)) {
        setIsFilterOpen(false);
      }

      if (isMapLayerMenuOpen && !mapFilterActionsRef.current?.contains(target)) {
        setIsMapLayerMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isFilterOpen, isMapFilterOpen, isMapLayerMenuOpen]);

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
    let isMounted = true;
    void authService.getSupabaseSession().then((nextSession) => {
      if (!isMounted) return;
      if (nextSession) {
        if (shouldShowWelcome(nextSession)) {
          setIsWelcomeOpen(true);
          setIsSplashVisible(false);
        } else if (!getStoredSession()) {
          showSplash();
        }
        setSession(nextSession);
        return;
      }

      if (session && !session.isAnonymous && supabase) {
        clearSession();
        setSession(null);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [showSplash]);

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
        if (event === "SIGNED_IN" && shouldShowWelcome(nextAppSession)) {
          setIsWelcomeOpen(true);
          setIsSplashVisible(false);
        } else if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
          showSplash();
        }
        saveSession(nextAppSession);
        setSession(nextAppSession);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [showSplash]);

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

  const requestCurrentLocation = useCallback((options: { recenter?: boolean; reverse?: boolean } = {}) => {
    if (!navigator.geolocation) {
      setLocationMessage("GPS no disponible. Puedes ajustar la ubicacion manualmente.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserLocation(nextLocation);
      setLocationMessage("Ubicacion detectada.");
        if (options.reverse !== false) void reverseGeocode(nextLocation);
        if (options.recenter) setRecenterSignal((value) => value + 1);
      },
      () => {
        setLocationMessage("No se pudo acceder al GPS. Puedes seleccionar ubicacion manualmente.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    );
  }, []);

  useEffect(() => {
    requestCurrentLocation();
  }, [requestCurrentLocation]);

  useEffect(() => {
    return () => {
      if (mapGeocodeTimer.current) window.clearTimeout(mapGeocodeTimer.current);
    };
  }, []);

  async function reverseGeocode(location: Coordinates) {
    try {
      const details = await reverseGeocodeDetails(location);
      if (details.address) setDetectedAddress(details.address);
      if (details.countryCode) setUserCountryCode(details.countryCode);
      if (details.countryName) setUserCountryName(details.countryName);
    } catch {
      // Keep the last known address if the provider is temporarily unavailable.
    }
  }

  const reverseGeocodeManual = useCallback(async (location: Coordinates) => {
    const requestId = manualGeocodeRequest.current + 1;
    manualGeocodeRequest.current = requestId;
    setIsDetectingManualAddress(true);

    try {
      const details = await reverseGeocodeDetails(location);
      if (manualGeocodeRequest.current === requestId) {
        setManualAddress(details.address || "Dirección no encontrada. Mueve un poco el mapa o usa GPS.");
        setManualCountryCode(details.countryCode ?? "");
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
      const details = await reverseGeocodeDetails(location);
      if (mapGeocodeRequest.current === requestId) {
        setMapCenterAddress(details.address || "Dirección no encontrada. Mueve un poco el mapa.");
        setMapCenterCountryCode(details.countryCode ?? "");
        setMapCenterCountryName(details.countryName ?? "");
      }
    } catch {
      if (mapGeocodeRequest.current === requestId) {
        setMapCenterAddress("Dirección no encontrada. Mueve un poco el mapa.");
      }
    } finally {
      if (mapGeocodeRequest.current === requestId) setIsDetectingMapCenterAddress(false);
    }
  }, [userCountryCode, userCountryName]);

  const visibleRequests = useMemo(
    () =>
      requests.filter((request) => {
        const statusVisible =
          (request.status === "pending" && filters.showPending) ||
          (request.status === "resolved" && filters.showResolved);
        const categoryVisible = filters.category === "Todas" || request.category === filters.category;
        return statusVisible && categoryVisible;
      }),
    [requests, filters],
  );

  const visibleMyRequests = useMemo(
    () => visibleRequests.filter((request) => request.createdBy === requestService.currentUserId),
    [visibleRequests],
  );

  const selectedFreshRequest = useMemo(
    () => (selectedRequest ? requests.find((request) => request.id === selectedRequest.id) ?? selectedRequest : null),
    [requests, selectedRequest],
  );
  const requestFormSelectedLocation = manualLocation ?? (activeView === "map" ? mapCenterLocation : undefined);
  const requestFormInitialAddress = manualAddress || (activeView === "map" ? mapCenterAddress : "") || detectedAddress;
  const listRequests = activeView === "requests" ? visibleRequests : visibleMyRequests;
  const pendingListRequests = listRequests.filter((request) => request.status === "pending");
  const resolvedListRequests = listRequests.filter((request) => request.status === "resolved");
  const headerNotifications = useMemo<HeaderNotification[]>(
    () =>
      requests
        .filter((request) => request.createdBy === requestService.currentUserId)
        .flatMap((request) =>
          request.supportReports
            .filter(
              (report) =>
                report.supporterId !== requestService.currentUserId &&
                (report.status === "pending_confirmation" || report.status === "expired"),
            )
            .map((report) => ({
              id: report.id,
              requestId: request.id,
              title: request.item,
              message: report.status === "expired" ? "Expirado" : "Apoyo ofrecido",
              createdAt: report.createdAt,
              tone: report.status === "expired" ? ("expired" as const) : ("success" as const),
            })),
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests],
  );
  const contentTopClass = isOffline ? "top-48" : "top-44";
  const currentUserName = session?.name || session?.email?.split("@")[0] || "";
  const currentUserPhone = session?.phone || "";
  const mapIsOutsideUserCountry = Boolean(userCountryCode && mapCenterCountryCode && userCountryCode !== mapCenterCountryCode);
  const outsideCountryMessage = `Solo puedes crear solicitudes dentro de tu país${userCountryName ? ` (${userCountryName})` : ""}.`;

  function showToast(message: string, tone: ToastState["tone"] = "info") {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    setToast({ message, tone });
    const lineCount = Math.max(message.split("\n").length, Math.ceil(message.length / 44));
    const duration = lineCount > 1 ? 4000 : 3000;
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, duration);
  }

  function handleSelectHeaderNotification(notification: HeaderNotification) {
    const targetRequest = requests.find((request) => request.id === notification.requestId);
    setActiveView("mine");
    if (targetRequest) setSelectedRequest(targetRequest);
  }

  async function handleModerationBlocked(error: unknown) {
    const reason = getErrorMessage(error, "Se detectó texto indebido o riesgoso.");
    const status = await safetyService.recordViolation(reason);
    const remaining = Math.max(SAFETY_BLOCK_THRESHOLD - status.violationCount, 0);

    if (status.blocked) {
      showToast("Cuenta bloqueada por múltiples intentos de publicar contenido indebido o sospechoso.", "danger");
      return "Cuenta bloqueada por seguridad. Contacta al equipo de NEXO si crees que fue un error.";
    }

    showToast(`Texto indebido detectado. Intento ${status.violationCount}/${SAFETY_BLOCK_THRESHOLD}. Te quedan ${remaining} antes del bloqueo.`, "danger");
    return reason;
  }

  async function openForm() {
    setFormError("");
    setSimilarRequest(null);
    setPendingDraft(null);
    if (await safetyService.isBlocked()) {
      showToast("Esta cuenta está bloqueada por seguridad y no puede publicar solicitudes.", "danger");
      return;
    }
    if (session?.isAnonymous) {
      setAuthRequiredForRequest(true);
      return;
    }
    if (activeView === "map" && mapCenterLocation) {
      setManualLocation(mapCenterLocation);
      setManualAddress(mapCenterAddress);
      setManualCountryCode(mapCenterCountryCode);
    }
    if (activeView === "map" && mapCenterAddress) setDetectedAddress(mapCenterAddress);
    setIsFormOpen(true);
  }

  async function requestCountryMatchesUser(location: Coordinates) {
    let nextUserCountryCode = userCountryCode;
    let nextUserCountryName = userCountryName;
    const locationMatchesManual =
      manualLocation &&
      Math.abs(location.latitude - manualLocation.latitude) < 0.00001 &&
      Math.abs(location.longitude - manualLocation.longitude) < 0.00001;
    const locationMatchesMapCenter =
      mapCenterLocation &&
      Math.abs(location.latitude - mapCenterLocation.latitude) < 0.00001 &&
      Math.abs(location.longitude - mapCenterLocation.longitude) < 0.00001;
    let selectedCountryCode =
      (locationMatchesManual ? manualCountryCode : "") ||
      (locationMatchesMapCenter ? mapCenterCountryCode : "");

    if (!nextUserCountryCode && userLocation) {
      const userDetails = await reverseGeocodeDetails(userLocation);
      nextUserCountryCode = userDetails.countryCode ?? "";
      nextUserCountryName = userDetails.countryName ?? "";
      if (nextUserCountryCode) setUserCountryCode(nextUserCountryCode);
      if (nextUserCountryName) setUserCountryName(nextUserCountryName);
    }

    if (!selectedCountryCode) {
      const selectedDetails = await reverseGeocodeDetails(location);
      selectedCountryCode = selectedDetails.countryCode ?? "";
    }

    if (nextUserCountryCode && selectedCountryCode && nextUserCountryCode !== selectedCountryCode) {
      showToast(`Por veracidad, solo puedes crear solicitudes dentro de tu país${nextUserCountryName ? ` (${nextUserCountryName})` : ""}.`, "danger");
      return false;
    }

    return true;
  }

  async function submitDraft(draft: RequestDraft) {
    setFormError("");
    if (!(await requestCountryMatchesUser(draft))) {
      setFormError("La ubicación seleccionada está fuera de tu país. Ajusta el mapa o usa tu GPS.");
      return;
    }
    if (await safetyService.isBlocked()) {
      const blockedMessage = "Esta cuenta está bloqueada por seguridad y no puede publicar solicitudes.";
      setFormError(blockedMessage);
      showToast(blockedMessage, "danger");
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
        const message = await handleModerationBlocked(nextError);
        setFormError(message);
        showToast(message, "danger");
      } else {
        const message = getErrorMessage(nextError, "El contenido no pudo ser validado por seguridad.");
        setFormError(message);
        showToast(message, "danger");
      }
      return;
    }

    if (!(await requestAreaHasCapacity(draft))) return;

    const similar = await requestService.findSimilarPending(draft.category, draft);
    if (similar) {
      setPendingDraft(draft);
      setSimilarRequest(similar);
      return;
    }

    try {
      await requestService.createRequest(draft);
      await finishCreateFlow();
      showToast("Solicitud enviada correctamente.", "success");
    } catch (nextError) {
      if (navigator.onLine) {
        const message = getErrorMessage(nextError, "No fue posible enviar la solicitud de apoyo.");
        setFormError(message);
        showToast(message, "danger");
        return;
      }

      requestQueue.enqueue(draft);
      setSyncMessage("Sin conexión: guardamos la solicitud y se enviará automáticamente.");
      await finishCreateFlow();
      showToast("Sin conexión: solicitud guardada para enviarse luego.", "info");
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
      if (!(await requestAreaHasCapacity(pendingDraft))) return;
      await requestService.createRequest(pendingDraft);
      await finishCreateFlow();
      showToast("Solicitud enviada correctamente.", "success");
    } catch (nextError) {
      if (navigator.onLine) {
        const message = getErrorMessage(nextError, "No fue posible enviar la solicitud de apoyo.");
        setFormError(message);
        showToast(message, "danger");
        return;
      }

      requestQueue.enqueue(pendingDraft);
      setSyncMessage("Sin conexión: guardamos la solicitud y se enviará automáticamente.");
      await finishCreateFlow();
      showToast("Sin conexión: solicitud guardada para enviarse luego.", "info");
    }
  }

  async function requestAreaHasCapacity(draft: RequestDraft) {
    const [sameNeedCount, areaCount] = await Promise.all([
      requestService.countNearbyPendingByCategoryItem(draft.category, draft.item, draft),
      requestService.countNearbyPendingRequests(draft),
    ]);

    if (sameNeedCount < MAX_PENDING_REQUESTS_PER_CATEGORY_ITEM_RADIUS && areaCount < MAX_PENDING_REQUESTS_PER_AREA_RADIUS) {
      return true;
    }

    const radiusText =
      MAX_AREA_REQUESTS_RADIUS_METERS >= 1000
        ? `${MAX_AREA_REQUESTS_RADIUS_METERS / 1000} km`
        : `${MAX_AREA_REQUESTS_RADIUS_METERS} metros`;
    const message = `Ya se crearon demasiados pedidos de apoyo para esta área en un radio de ${radiusText}. Por favor revisa las solicitudes cercanas para sumarte o apoyar una existente.`;
    setFormError(message);
    showToast(message, "danger");
    return false;
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
      showToast("Para ofrecer apoyo debes crear una cuenta o iniciar sesión.", "info");
      return;
    }

    void safetyService.isBlocked().then((blocked) => {
      if (blocked) {
        showToast("Esta cuenta está bloqueada por seguridad y no puede ofrecer apoyo.", "danger");
        return;
      }
      setSupportRequestId(requestId);
      setSelectedRequest(null);
    });
  }

  async function submitSupportOffer(input: Partial<SupportReport>) {
    if (!supportRequestId) return;
    if (await safetyService.isBlocked()) {
      showToast("Esta cuenta está bloqueada por seguridad y no puede ofrecer apoyo.", "danger");
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
      showToast("Apoyo enviado correctamente.", "success");
    } catch (nextError) {
      if (nextError instanceof ModerationBlockedError) {
        showToast(await handleModerationBlocked(nextError));
      } else {
        showToast(getErrorMessage(nextError, "Hubo un error al cargar el apoyo."), "danger");
      }
    }
  }

  async function confirmSupport(requestId: string, status: SupportReport["status"]) {
    try {
      await requestService.confirmSupport(requestId, status);
      await reloadRequests();
      showToast(status === "confirmed" ? "Solicitud aprobada como atendida." : "Ayuda parcial registrada.", "success");
    } catch (nextError) {
      showToast(getErrorMessage(nextError, "Hubo un error al aprobar la solicitud."), "danger");
    }
  }

  async function cancelRequest(requestId: string) {
    setDestructiveDialog({ type: "cancel-request", requestId });
  }

  async function runCancelRequest(requestId: string) {
    try {
      await requestService.cancelRequest(requestId);
      setSelectedRequest(null);
      await reloadRequests();
      showToast("Pedido cancelado correctamente.", "success");
    } catch (nextError) {
      showToast(getErrorMessage(nextError, "No se pudo cancelar el pedido."), "danger");
    }
  }

  function startManualLocation() {
    setActiveView("map");
    const startingLocation = manualLocation ?? mapCenterLocation ?? userLocation;
    if (startingLocation) {
      setManualLocation(startingLocation);
      setManualAddress(mapCenterAddress || detectedAddress);
      setManualCountryCode(mapCenterCountryCode);
    }
    setPickingLocation(true);
    setFormError("");
  }

  function cancelManualLocation() {
    setManualLocation(undefined);
    setManualAddress("");
    setManualCountryCode("");
    setPickingLocation(false);
    setFormError("");
  }

  const previewManualLocation = useCallback((location: Coordinates) => {
    setManualLocation(location);
    void reverseGeocodeManual(location);
  }, [reverseGeocodeManual]);

  const handleMapCenterChange = useCallback((location: Coordinates) => {
    setMapCenterLocation(location);
    if (mapGeocodeTimer.current) window.clearTimeout(mapGeocodeTimer.current);
    mapGeocodeTimer.current = window.setTimeout(() => {
      void reverseGeocodeMapCenter(location);
      mapGeocodeTimer.current = null;
    }, 650);
  }, [reverseGeocodeMapCenter]);

  function confirmManualLocation() {
    if (manualAddress) setDetectedAddress(manualAddress);
    if (manualCountryCode) setMapCenterCountryCode(manualCountryCode);
    setPickingLocation(false);
    setFormError("");
  }

  function handleLogin(nextSession: AppSession) {
    saveSession(nextSession);
    setSession(nextSession);
    setAuthRequiredForRequest(false);
    if (shouldShowWelcome(nextSession)) {
      setIsWelcomeOpen(true);
      setIsSplashVisible(false);
    } else {
      showSplash();
    }
    void reloadRequests();
  }

  async function handleSignOut() {
    await authService.signOut();
    setSession(null);
    setRequests([]);
  }

  async function handleDeleteAccountData() {
    if (!session) return;
    setDestructiveDialog({ type: "delete-account" });
  }

  async function runDeleteAccountData() {
    if (!session) return;
    try {
      if (session.isAnonymous) {
        await requestService.deleteCurrentUserData();
        await authService.signOut();
        setSession(null);
        setRequests([]);
        setSelectedRequest(null);
        setIsFormOpen(false);
        setSupportRequestId(null);
        setIsAccountDeletedOpen(true);
      } else {
        setDeletePassword("");
        setDeletePasswordError("");
        setIsDeletePasswordOpen(true);
      }
    } catch (nextError) {
      showToast(getErrorMessage(nextError, "No se pudo eliminar la cuenta."), "danger");
    }
  }

  async function confirmDeleteAccountWithPassword() {
    if (!session || isDestructiveActionRunning) return;
    setIsDestructiveActionRunning(true);
    setDeletePasswordError("");
    try {
      await authService.deleteCurrentUserAccount(deletePassword);
      setSession(null);
      setRequests([]);
      setSelectedRequest(null);
      setIsFormOpen(false);
      setSupportRequestId(null);
      setIsAccountOpen(false);
      setIsDeletePasswordOpen(false);
      setDeletePassword("");
      setIsAccountDeletedOpen(true);
    } catch (nextError) {
      setDeletePasswordError(getErrorMessage(nextError, "No se pudo eliminar la cuenta."));
    } finally {
      setIsDestructiveActionRunning(false);
    }
  }

  async function confirmDestructiveAction() {
    if (!destructiveDialog || isDestructiveActionRunning) return;
    setIsDestructiveActionRunning(true);
    try {
      if (destructiveDialog.type === "cancel-request") {
        await runCancelRequest(destructiveDialog.requestId);
      } else {
        await runDeleteAccountData();
      }
      setDestructiveDialog(null);
    } finally {
      setIsDestructiveActionRunning(false);
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
        onNotify={showToast}
      />
    );
  }

  if (!session && isAccountDeletedOpen) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} onNotify={showToast} />
        <AccountDeletedDialog isOpen onClose={() => setIsAccountDeletedOpen(false)} />
      </>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} onNotify={showToast} />;
  }

  if (isWelcomeOpen) {
    return (
      <WelcomeScreen
        onEnter={() => {
          markWelcomeShown(session);
          setIsWelcomeOpen(false);
          void reloadRequests();
        }}
      />
    );
  }

  if (isSplashVisible) {
    return <SplashScreen />;
  }

  if (authRequiredForRequest) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        initialView="signup"
        securityNotice
        onCancel={() => setAuthRequiredForRequest(false)}
        onNotify={showToast}
      />
    );
  }

  if (!session.isAnonymous && (!session.phone || !session.name)) {
    return (
      <RequiredPhoneScreen
        session={session}
        onComplete={(nextSession) => {
          setSession(nextSession);
          saveSession(nextSession);
        }}
        onSignOut={handleSignOut}
        onNotify={showToast}
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
        onNotify={showToast}
      />
    );
  }

  return (
    <AppLayout>
      <AppHeader
        activeView={activeView}
        isOffline={isOffline}
        session={session}
        notifications={headerNotifications}
        onChangeView={setActiveView}
        onSelectNotification={handleSelectHeaderNotification}
        onOpenAccount={() => setIsAccountOpen(true)}
        onSignOut={handleSignOut}
        onDeleteAccountData={handleDeleteAccountData}
      />

      {syncMessage && (
        <div className="fixed left-4 right-4 top-32 z-[1300] rounded-input bg-sos-primarySoft px-4 py-3 text-center text-[13px] font-extrabold text-sos-primary shadow-soft">
          {syncMessage}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-[30px] left-1/2 z-[1400] w-[85vw] max-w-[412px] -translate-x-1/2 md:bottom-auto md:left-auto md:right-6 md:top-6 md:translate-x-0">
          <ToastMessage message={toast.message} tone={toast.tone} />
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(destructiveDialog)}
        title={destructiveDialog?.type === "delete-account" ? "¿Eliminar tu cuenta?" : "¿Eliminar esta solicitud?"}
        description={
          destructiveDialog?.type === "delete-account"
            ? "Esta acción eliminará tu cuenta, tus solicitudes y tus apoyos asociados. No se puede deshacer."
            : "Esta acción es irreversible. La solicitud dejará de verse en el mapa y otras personas ya no podrán apoyarla."
        }
        cancelLabel="Cancelar"
        confirmLabel={destructiveDialog?.type === "delete-account" ? "Eliminar cuenta" : "Eliminar pedido"}
        isLoading={isDestructiveActionRunning}
        onCancel={() => {
          if (!isDestructiveActionRunning) setDestructiveDialog(null);
        }}
        onConfirm={confirmDestructiveAction}
      />

      <DeleteAccountPasswordDialog
        isOpen={isDeletePasswordOpen}
        password={deletePassword}
        error={deletePasswordError}
        isLoading={isDestructiveActionRunning}
        onPasswordChange={(value) => {
          setDeletePassword(value);
          setDeletePasswordError("");
        }}
        onCancel={() => {
          if (isDestructiveActionRunning) return;
          setIsDeletePasswordOpen(false);
          setDeletePassword("");
          setDeletePasswordError("");
        }}
        onContinue={confirmDeleteAccountWithPassword}
      />

      {activeView === "map" && (
        <section className={`absolute inset-x-0 bottom-0 ${contentTopClass}`}>
          <MapScreen
            requests={visibleRequests}
            userLocation={userLocation}
            pickingLocation={pickingLocation}
            recenterSignal={recenterSignal}
            mapLayerStyle={mapLayerStyle}
            onSelectRequest={setSelectedRequest}
            onCenterChange={handleMapCenterChange}
            onManualLocationPreview={previewManualLocation}
          />
          {!pickingLocation && (
            <div ref={mapFilterActionsRef} className="fixed right-4 top-1/2 z-[910] flex -translate-y-1/2 flex-col gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMapLayerMenuOpen((open) => !open)}
                  className={`grid h-12 w-12 place-items-center rounded-pill border text-[22px] shadow-soft ${
                    isMapLayerMenuOpen ? "border-sos-orange bg-sos-orange text-white" : "border-sos-border bg-white text-sos-ink"
                  }`}
                  aria-label="Cambiar tipo de mapa"
                  aria-expanded={isMapLayerMenuOpen}
                >
                  <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 18.5 3.8 16V5.5L9 8m0 10.5 6-2.5m-6 2.5V8m6 8 5.2 2.5V8L15 5.5m0 10.5V5.5M9 8l6-2.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {isMapLayerMenuOpen && (
                  <div className="absolute right-14 top-0 w-44 rounded-card border border-sos-border bg-white p-2 shadow-sheet">
                    <button
                      type="button"
                      onClick={() => {
                        setMapLayerStyle("standard");
                        setIsMapLayerMenuOpen(false);
                      }}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-input px-3 text-left text-[14px] font-extrabold ${
                        mapLayerStyle === "standard" ? "bg-sos-primarySoft text-sos-primary" : "text-sos-ink hover:bg-sos-background"
                      }`}
                    >
                      <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M9 18.5 3.8 16V5.5L9 8m0 10.5 6-2.5m-6 2.5V8m6 8 5.2 2.5V8L15 5.5m0 10.5V5.5M9 8l6-2.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Mapa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMapLayerStyle("satellite");
                        setIsMapLayerMenuOpen(false);
                      }}
                      className={`mt-1 flex min-h-11 w-full items-center gap-3 rounded-input px-3 text-left text-[14px] font-extrabold ${
                        mapLayerStyle === "satellite" ? "bg-sos-primarySoft text-sos-primary" : "text-sos-ink hover:bg-sos-background"
                      }`}
                    >
                      <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4.5 16.5 12 4l7.5 12.5H4.5Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                        <path d="M8 16.5 12 10l4 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Satélite
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMapFilterOpen((open) => !open)}
                className={`grid h-12 w-12 place-items-center rounded-pill border text-[22px] shadow-soft ${
                  isMapFilterOpen ? "border-sos-orange bg-sos-orange text-white" : "border-sos-border bg-white text-sos-ink"
                }`}
                aria-label="Abrir filtros"
                aria-expanded={isMapFilterOpen}
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  requestCurrentLocation({ recenter: true });
                }}
                className="grid h-12 w-12 place-items-center rounded-pill border border-sos-border bg-white text-[22px] text-sos-ink shadow-soft"
                aria-label="Centrar mapa en mi ubicacion"
              >
                ◎
              </button>
            </div>
          )}
          {isMapFilterOpen && !pickingLocation && (
            <div ref={mapFilterPanelRef} className="absolute left-4 right-20 top-4 z-[910]">
              <FilterChips filters={filters} onChange={setFilters} placement="static" />
            </div>
          )}
          {!pickingLocation && (
            <HomeActionPanel
              locationReady={Boolean(mapCenterLocation || userLocation || manualLocation)}
              address={mapCenterAddress}
              isDetectingAddress={isDetectingMapCenterAddress}
              disabled={mapIsOutsideUserCountry}
              disabledMessage={outsideCountryMessage}
              onClick={openForm}
            />
          )}
        </section>
      )}

      {activeView !== "map" && (
        <section className={`absolute inset-x-0 bottom-0 ${contentTopClass} flex flex-col bg-sos-background`}>
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
            <div ref={listFilterRef} className="mb-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen((open) => !open)}
                  className={`inline-flex min-h-12 items-center gap-2 rounded-pill border px-4 text-[15px] font-extrabold shadow-soft ${
                    isFilterOpen ? "border-sos-orange bg-sos-orange text-white" : "border-sos-border bg-white text-sos-ink"
                  }`}
                  aria-label="Filtros"
                  aria-expanded={isFilterOpen}
                >
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 5h16l-6.5 7.4V18l-3 1.5v-7.1L4 5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Filtros
                </button>
              </div>

              {isFilterOpen && (
                <div className="mt-3">
                  <FilterChips filters={filters} onChange={setFilters} placement="static" />
                </div>
              )}
            </div>

            <div className="space-y-8">
              {listRequests.length === 0 ? (
                <EmptyState title="No hay solicitudes para mostrar." message="Revisa los filtros o crea una solicitud nueva." />
              ) : (
                <>
                  <RequestListGroup title="Vigente" requests={pendingListRequests} onSelectRequest={setSelectedRequest} />
                  <RequestListGroup title="Apoyados" requests={resolvedListRequests} onSelectRequest={setSelectedRequest} />
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <RequestFormBottomSheet
        isOpen={isFormOpen}
        currentLocation={userLocation}
        selectedLocation={requestFormSelectedLocation}
        initialAddress={requestFormInitialAddress}
        similarRequest={similarRequest}
        onClose={() => {
          setIsFormOpen(false);
          setPickingLocation(false);
          setManualLocation(undefined);
          setManualAddress("");
          setManualCountryCode("");
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
        onCancelRequest={cancelRequest}
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
