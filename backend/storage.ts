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

// Resolve a stored value (a bucket key OR a full public URL) to a bucket key.
// Returns null when the value is an EXTERNAL url (e.g. an Autentique-hosted PDF)
// that does not live in our bucket — callers should pass those through untouched.
export function bucketKeyFromValue(value: string): string | null {
  if (!value) return null;
  // Full public/sign URL for OUR bucket → extract the key
  const m = value.match(
    new RegExp(`/storage/v1/object/(?:public|sign)/${BUCKET_NAME}/([^?]+)`)
  );
  if (m) return decodeURIComponent(m[1]);
  // Any other absolute URL is external (Autentique, etc.) → not ours
  if (/^https?:\/\//i.test(value)) {
    return value.includes(`/${BUCKET_NAME}/`) && value.includes(ENV.supabaseUrl)
      ? value.split(`/${BUCKET_NAME}/`)[1].split("?")[0]
      : null;
  }
  // Otherwise treat it as a bare bucket key
  return value.replace(/^\/+/, "");
}

// Create a short-lived signed URL for an object in our bucket. Works whether the
// bucket is public or private (so it can be rolled out BEFORE the bucket is
// flipped private). External URLs (not in our bucket) are returned unchanged so
// the mixed signed_documents.signed_pdf_url column (ours + Autentique) is safe.
export async function createSignedUrl(
  keyOrUrl: string,
  expiresInSeconds = 3600
): Promise<string> {
  const key = bucketKeyFromValue(keyOrUrl);
  if (key === null) return keyOrUrl; // external / pass-through

  const signUrl = `${ENV.supabaseUrl}/storage/v1/object/sign/${BUCKET_NAME}/${key}`;
  const response = await fetch(signUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Storage] Sign failed:", response.status, errorText);
    throw new Error(`Storage sign failed: ${response.status} ${errorText}`);
  }

  const { signedURL } = (await response.json()) as { signedURL: string };
  // signedURL is a relative path like /object/sign/contracts/key?token=...
  return `${ENV.supabaseUrl}/storage/v1${signedURL}`;
}

// --- Response signing: deep-walk a tRPC response and replace every stored
// public "contracts" bucket URL with a freshly-signed URL. Applied as a global
// middleware so NO display site is missed and the signature inherits whatever
// authorization already gated the data. Only the public-URL form is matched, so
// unrelated strings and external (Autentique) URLs are left untouched.
//
// Matches BOTH the stored public form and an already-`sign`ed form. Matching the
// signed form makes reads self-healing: if a client ever round-trips a signed URL
// back into the DB (e.g. an upload response persisted verbatim), every later read
// re-signs it fresh from the key and the stale token is ignored — so links never
// rot regardless of what value got persisted.
const STORED_CONTRACTS_URL_RE = /\/storage\/v1\/object\/(?:public|sign)\/contracts\//;

function isPlainObject(o: any): boolean {
  if (o === null || typeof o !== "object" || Array.isArray(o)) return false;
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
}

function collectContractsUrls(node: any, acc: Set<string>): void {
  if (typeof node === "string") {
    if (STORED_CONTRACTS_URL_RE.test(node)) acc.add(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const el of node) collectContractsUrls(el, acc);
    return;
  }
  if (isPlainObject(node)) {
    for (const k of Object.keys(node)) collectContractsUrls(node[k], acc);
  }
}

function replaceContractsUrls(node: any, map: Map<string, string>): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const el = node[i];
      if (typeof el === "string") {
        const s = map.get(el);
        if (s) node[i] = s;
      } else {
        replaceContractsUrls(el, map);
      }
    }
    return;
  }
  if (isPlainObject(node)) {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === "string") {
        const s = map.get(v);
        if (s) node[k] = s;
      } else {
        replaceContractsUrls(v, map);
      }
    }
  }
}

// Mutates `data` in place, replacing stored contracts-bucket URLs with signed
// ones. Returns nothing meaningful — callers keep their reference.
export async function signContractsUrlsInResponse(
  data: any,
  expiresInSeconds = 21600 // 6h — comfortably longer than any single view session
): Promise<void> {
  if (data === null || typeof data !== "object") return;
  const urls = new Set<string>();
  collectContractsUrls(data, urls);
  if (urls.size === 0) return;
  const signed = await createSignedUrls([...urls], expiresInSeconds);
  replaceContractsUrls(data, signed);
}

// Batch-sign many stored values in ONE request (avoids N+1 latency when a list
// endpoint returns many files). Returns a Map keyed by the ORIGINAL input value
// → signed URL (or the original value unchanged for external / unresolvable
// entries). Safe to call while the bucket is still public.
export async function createSignedUrls(
  values: Array<string | null | undefined>,
  expiresInSeconds = 3600
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  // Map bucket key -> the original values that resolved to it
  const keyToOriginals = new Map<string, string[]>();
  for (const v of values) {
    if (!v) continue;
    const key = bucketKeyFromValue(v);
    if (key === null) {
      out.set(v, v); // external / pass-through
      continue;
    }
    const arr = keyToOriginals.get(key) || [];
    arr.push(v);
    keyToOriginals.set(key, arr);
  }
  const keys = [...keyToOriginals.keys()];
  if (keys.length === 0) return out;

  const res = await fetch(`${ENV.supabaseUrl}/storage/v1/object/sign/${BUCKET_NAME}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: expiresInSeconds, paths: keys }),
  });
  if (!res.ok) {
    console.error("[Storage] Batch sign failed:", res.status, await res.text());
    // Fail soft: return originals unchanged rather than throwing (a broken image
    // is degraded UX; a thrown list endpoint is an outage).
    for (const originals of keyToOriginals.values()) for (const o of originals) out.set(o, o);
    return out;
  }
  const rows = (await res.json()) as Array<{ signedURL?: string; path?: string; error?: string | null }>;
  // The response order matches the request `keys` order.
  rows.forEach((row, i) => {
    const key = keys[i];
    const originals = keyToOriginals.get(key) || [];
    const signed = row.signedURL ? `${ENV.supabaseUrl}/storage/v1${row.signedURL}` : null;
    for (const o of originals) out.set(o, signed || o);
  });
  return out;
}

// Authenticated fetch of an object's raw bytes for server-side use (PDF signing,
// sending bytes to Autentique). Uses the service role, so it works on a private
// bucket — unlike a plain fetch() of a public URL. Accepts a key or a full URL.
export async function storageGetBytes(keyOrUrl: string): Promise<Uint8Array> {
  const key = bucketKeyFromValue(keyOrUrl);
  if (key === null) {
    // External URL — fetch directly (no bucket auth applies)
    const ext = await fetch(keyOrUrl);
    if (!ext.ok) throw new Error(`Fetch failed: ${ext.status} for external url`);
    return new Uint8Array(await ext.arrayBuffer());
  }
  const objUrl = `${ENV.supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${key}`;
  const response = await fetch(objUrl, {
    headers: { Authorization: `Bearer ${ENV.supabaseServiceRoleKey}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Storage get failed: ${response.status} ${errorText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
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
