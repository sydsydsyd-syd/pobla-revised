//cloudinary
// ─── Cloudinary Config ──────────────────────────────────────────────────────
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.warn("[Cloudinary] Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET in .env");
}

// ─── Upload ─────────────────────────────────────────────────────────────────

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Upload a File to Cloudinary unsigned upload.
 * Returns the full result including public_id and secure_url.
 */
export async function uploadToCloudinary(
  file: File,
  folder = "pobla-menu"
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Cloudinary upload failed");
  }

  return res.json() as Promise<CloudinaryUploadResult>;
}

// ─── URL Transformations ─────────────────────────────────────────────────────

/**
 * Build a Cloudinary delivery URL with optional transformations.
 * Accepts either a full secure_url or a public_id.
 */
export function cloudinaryUrl(
  publicIdOrUrl: string,
  opts: {
    width?: number;
    height?: number;
    crop?: "fill" | "fit" | "thumb" | "scale" | "crop" | "pad";
    quality?: "auto" | number;
    format?: "auto" | "webp" | "jpg" | "png";
    gravity?: "auto" | "face" | "center";
    radius?: number | "max";
  } = {}
): string {
  if (!publicIdOrUrl) return "";
  if (!CLOUD_NAME) return publicIdOrUrl; // fallback to original URL

  const {
    width,
    height,
    crop = "fill",
    quality = "auto",
    format = "auto",
    gravity = "auto",
    radius,
  } = opts;

  // Build transformation string
  const parts: string[] = [];
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  if (width || height) parts.push(`c_${crop}`);
  if (gravity && (width || height)) parts.push(`g_${gravity}`);
  if (radius !== undefined) parts.push(`r_${radius}`);
  parts.push(`q_${quality}`);
  parts.push(`f_${format}`);

  const transform = parts.join(",");

  // If already a Cloudinary URL, inject transforms
  if (publicIdOrUrl.includes("cloudinary.com")) {
    return publicIdOrUrl.replace("/upload/", `/upload/${transform}/`);
  }

  // Build from public_id
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform}/${publicIdOrUrl}`;
}

/** Thumbnail — square, 200×200, auto crop */
export const thumbUrl = (src: string) =>
  cloudinaryUrl(src, { width: 200, height: 200, crop: "fill", gravity: "auto" });

/** Card image — 400×300 */
export const cardUrl = (src: string) =>
  cloudinaryUrl(src, { width: 400, height: 300, crop: "fill", gravity: "auto" });

/** Hero/banner — 800×400 */
export const heroUrl = (src: string) =>
  cloudinaryUrl(src, { width: 800, height: 400, crop: "fill", gravity: "auto" });
