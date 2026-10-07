import type { FieldError } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: FieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Server-side validation messages keyed by field name, for inline display. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details) out[d.field] ??= d.message;
    return out;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function buildQuery(params: Query): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

const SESSION_EXPIRED_EVENT = "r53:session-expired";

/** Fired when any non-login request comes back 401, so the shell can redirect to /login. */
export function onSessionExpired(handler: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}

export async function api<T = void>(path: string, { method = "GET", body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "Unable to reach the Route 53 service. Check your connection and try again.");
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const err = (payload as { error?: { code?: string; message?: string; details?: FieldError[] } } | null)?.error;
    // FastAPI always answers with the JSON error envelope, so a body-less 5xx can only come from the
    // proxy in front of it (connection refused, gateway timeout): treat it as the backend being down.
    if (!err && response.status >= 500) {
      throw new ApiError(0, "NETWORK_ERROR", "Unable to reach the Route 53 service. Check your connection and try again.");
    }
    if (response.status === 401 && path !== "/auth/login" && typeof window !== "undefined") {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(
      response.status,
      err?.code ?? "HTTP_ERROR",
      err?.message ?? `Request failed (${response.status}).`,
      err?.details ?? [],
    );
  }
  return payload as T;
}
