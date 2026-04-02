// Supabase Storage helpers for file uploads
import { ENV } from "./_core/env";

const BUCKET_NAME = "contracts";

// Upload a file to Supabase Storage using REST API directly
function sanitizeStorageKey(raw: string): string {
  return raw
    .split("/")
    .map((segment, i, arr) => {
      // Only sanitize the filename (last segment), keep path segments as-is
      if (i < arr.length - 1) return segment;
      return segment
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents (ã→a, é→e)
        .replace(/\s+/g, "_")                              // spaces → underscores
        .replace(/[^a-zA-Z0-9._\-]/g, "");                // strip anything else unsafe
    })
    .join("/");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = sanitizeStorageKey(relKey.replace(/^\/+/, ""));

  console.log("[Storage] Uploading to bucket:", BUCKET_NAME, "key:", key, "size:", data.length);

  const uploadUrl = `${ENV.supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${key}`;

  // Convert Buffer/Uint8Array to Blob for fetch compatibility
  const blob = new Blob([new Uint8Array(data)], { type: contentType });

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: blob,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Storage] Upload failed:", response.status, errorText);
    throw new Error(`Storage upload failed: ${response.status} ${errorText}`);
  }

  console.log("[Storage] Upload success");

  // Build public URL
  const publicUrl = `${ENV.supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${key}`;

  return { key, url: publicUrl };
}

// Get a file's public URL
export function storageGet(relKey: string): { key: string; url: string } {
  const key = relKey.replace(/^\/+/, "");
  const publicUrl = `${ENV.supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${key}`;
  return { key, url: publicUrl };
}

// Delete a file from storage
export async function storageDelete(relKey: string): Promise<void> {
  const key = relKey.replace(/^\/+/, "");

  const deleteUrl = `${ENV.supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${key}`;

  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Storage] Delete failed:", response.status, errorText);
    throw new Error(`Storage delete failed: ${response.status} ${errorText}`);
  }
}
