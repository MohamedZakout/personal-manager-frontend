import type { ApiErrorShape } from "../types";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? ""
).replace(/\/$/, "");

export const TOKEN_KEY = "relay.token";

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[] | string>;

  constructor(status: number, body: ApiErrorShape) {
    super(body.message ?? `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.errors = body.errors ?? {};
  }

  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.errors).map(([field, value]) => [
        field,
        Array.isArray(value) ? value.join(" ") : value,
      ]),
    );
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  raw?: boolean;
};

async function request<T>(
  path: string,
  { method = "GET", body, params, signal, raw = false }: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${API_BASE}/api${path}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = { Accept: "application/json" };

  const token = getToken();

  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(url, { method, headers, body: payload, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, {
      message: "Cannot reach the API. Check that the backend is running.",
    });
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();

  let parsed: unknown = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errorBody = (parsed ?? {}) as ApiErrorShape;
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("relay:unauthorized"));
    }
    throw new ApiError(response.status, errorBody);
  }

  if (raw) return parsed as T;

  if (
    parsed !== null &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    "data" in parsed &&
    Object.keys(parsed).length === 1
  ) {
    return (parsed as { data: T }).data;
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, params?: RequestOptions["params"], signal?: AbortSignal) => request<T>(path, { params, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", body: formData }),
  raw: <T>(path: string) => request<T>(path, { raw: true }),
};
