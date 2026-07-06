import { getCurrentUserId } from "./authSession";
import { supabase } from "./supabaseClient";

const PHOTO_BUCKET = "nexo-photos";
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_ORIGINAL_PHOTO_SIZE_BYTES = 18 * 1024 * 1024;
const MAX_PHOTO_DIMENSION = 1600;
const MIN_JPEG_QUALITY = 0.5;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function jpegFileName(file: File) {
  const cleanName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "foto";
  return `${cleanName}.jpg`;
}

function canTryToDecode(file: File) {
  return ACCEPTED_IMAGE_TYPES.has(file.type) || file.type.startsWith("image/");
}

export function validatePhotoFile(file: File) {
  if (!canTryToDecode(file)) {
    throw new Error("Usa una foto de tu galeria en formato JPG, PNG, WebP o HEIC.");
  }
  if (file.size > MAX_ORIGINAL_PHOTO_SIZE_BYTES) {
    throw new Error("La foto es demasiado pesada. Elige una imagen menor a 18 MB.");
  }
}

async function decodeImage(file: File) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Some mobile browsers cannot decode HEIC/WebP through createImageBitmap.
    }
  }

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("La foto no se pudo leer. Intenta con otra imagen."));
    };
    image.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("La foto no se pudo comprimir. Puedes intentar con otra imagen."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function scaledSize(width: number, height: number, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function compressPhotoFile(file: File) {
  validatePhotoFile(file);

  const image = await decodeImage(file);
  let maxDimension = MAX_PHOTO_DIMENSION;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const size = scaledSize(image.width, image.height, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("La foto no se pudo procesar en este dispositivo.");
    }

    context.drawImage(image, 0, 0, size.width, size.height);

    for (let quality = 0.82; quality >= MIN_JPEG_QUALITY; quality -= 0.08) {
      const blob = await canvasToJpegBlob(canvas, quality);
      if (blob.size <= MAX_PHOTO_SIZE_BYTES) {
        return new File([blob], jpegFileName(file), { type: "image/jpeg", lastModified: Date.now() });
      }
    }

    maxDimension = Math.round(maxDimension * 0.82);
  }

  throw new Error("No se pudo bajar la foto a menos de 2 MB. Intenta con una imagen más pequeña.");
}

export async function uploadPhoto(file?: File, folder = "requests") {
  if (!file) return undefined;
  const compressedFile = await compressPhotoFile(file);

  if (!supabase) {
    return URL.createObjectURL(compressedFile);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Tu sesión expiró. Cierra sesión e ingresa nuevamente para subir fotos.");
  }

  const userId = getCurrentUserId().replace(/[^a-zA-Z0-9_-]/g, "-");
  const filePath = `${folder}/${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(filePath, compressedFile, {
    cacheControl: "3600",
    contentType: "image/jpeg",
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
