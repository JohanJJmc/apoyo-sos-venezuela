import { getCurrentUserId } from "./authSession";
import { supabase } from "./supabaseClient";

const PHOTO_BUCKET = "nexo-photos";
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function validatePhotoFile(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Usa una foto JPG, PNG o WebP.");
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error("La foto no puede pesar más de 2 MB.");
  }
}

export async function uploadPhoto(file?: File, folder = "requests") {
  if (!file) return undefined;
  validatePhotoFile(file);

  if (!supabase) {
    return URL.createObjectURL(file);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Tu sesión expiró. Cierra sesión e ingresa nuevamente para subir fotos.");
  }

  const userId = getCurrentUserId().replace(/[^a-zA-Z0-9_-]/g, "-");
  const filePath = `${folder}/${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  return filePath;
}

export async function signedPhotoUrl(path?: string) {
  if (!path || !supabase) return path;
  if (path.startsWith("blob:") || path.startsWith("data:")) return path;

  try {
    const url = new URL(path);
    const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      path = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    } else {
      return path;
    }
  } catch {
    // It is already a bucket path.
  }

  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return undefined;
  return data.signedUrl;
}
