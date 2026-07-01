import { getCurrentUserId } from "./authSession";
import { supabase } from "./supabaseClient";

const PHOTO_BUCKET = "nexo-photos";
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;
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

  const userId = getCurrentUserId().replace(/[^a-zA-Z0-9_-]/g, "-");
  const filePath = `${folder}/${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
