"use client";

// Client-side API access. Calls go to the same origin under /api/v1 (proxied to the
// backend by Next rewrites), so httpOnly cookies are sent automatically. On a 401 we
// transparently attempt a token refresh once and retry.

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  trace_id?: string | null;
}

export class ApiRequestError extends Error {
  status: number;
  error: ApiError;
  constructor(status: number, error: ApiError) {
    super(error.message);
    this.status = status;
    this.error = error;
  }
}

/** Read a cookie value in the browser (returns null on the server). */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  // Superadmin tenant override (ignored by the backend for non-superadmins).
  const tenant = readCookie("veevra_tenant");
  // For multipart uploads the browser must set Content-Type (with the boundary) itself.
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  return fetch(`/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(tenant ? { "X-Tenant-Id": tenant } : {}),
      ...(init.headers ?? {}),
    },
  });
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  _retry = false,
): Promise<T> {
  let res = await rawFetch(path, init);

  if (res.status === 401 && !_retry && path !== "/auth/refresh") {
    const refreshed = await rawFetch("/auth/refresh", { method: "POST" });
    if (refreshed.ok) {
      res = await rawFetch(path, init);
    }
  }

  if (!res.ok) {
    let payload: { error?: ApiError } = {};
    try {
      payload = await res.json();
    } catch {
      /* non-JSON */
    }
    throw new ApiRequestError(
      res.status,
      payload.error ?? { code: "unknown", message: res.statusText },
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiGet = <T>(p: string) => apiFetch<T>(p);
export const apiPost = <T>(p: string, body?: unknown) =>
  apiFetch<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(p: string, body: unknown) =>
  apiFetch<T>(p, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = <T>(p: string) => apiFetch<T>(p, { method: "DELETE" });
export const apiUpload = <T>(p: string, form: FormData) =>
  apiFetch<T>(p, { method: "POST", body: form });

/** POST JSON and download the binary response as a file (e.g. a generated report). */
export async function apiDownload(path: string, body: unknown, fallbackName = "download"): Promise<void> {
  let res = await rawFetch(path, { method: "POST", body: JSON.stringify(body) });
  if (res.status === 401) {
    const refreshed = await rawFetch("/auth/refresh", { method: "POST" });
    if (refreshed.ok) res = await rawFetch(path, { method: "POST", body: JSON.stringify(body) });
  }
  if (!res.ok) {
    let payload: { error?: ApiError } = {};
    try {
      payload = await res.json();
    } catch {
      /* non-JSON */
    }
    throw new ApiRequestError(res.status, payload.error ?? { code: "unknown", message: res.statusText });
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const name = m ? decodeURIComponent(m[1]) : fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** POST returning a binary Blob (e.g. a generated PDF). Reuses the auth/refresh flow. */
export async function apiPostBlob(path: string, body: unknown): Promise<Blob> {
  const init: RequestInit = { method: "POST", body: JSON.stringify(body) };
  let res = await rawFetch(path, init);
  if (res.status === 401 && path !== "/auth/refresh") {
    const refreshed = await rawFetch("/auth/refresh", { method: "POST" });
    if (refreshed.ok) res = await rawFetch(path, init);
  }
  if (!res.ok) {
    let payload: { error?: ApiError } = {};
    try { payload = await res.json(); } catch { /* non-JSON */ }
    throw new ApiRequestError(res.status, payload.error ?? { code: "unknown", message: res.statusText });
  }
  return res.blob();
}
