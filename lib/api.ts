import type {
  Account,
  ApiErrorShape,
  Category,
  Command,
  CommandFolder,
  Credential,
  DashboardSummary,
  FileRecord,
  LoginResponse,
  Meta,
  Project,
  CommandLibrary,
  User,
} from "./types";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "/manager-api"
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

type RequestOptions = {
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

export const authApi = {
  login: (email: string, password: string) => api.post<LoginResponse>("/login", { email, password }),
  logout: () => api.post<void>("/logout"),
  me: () => api.get<User>("/me"),
};

export const dashboardApi = {
  summary: () => api.raw<DashboardSummary>("/dashboard"),
};

export const metaApi = {
  get: () => api.raw<Meta>("/meta"),
};

export const categoriesApi = {
  list: () => api.get<Category[]>("/categories"),
  create: (body: { name: string; color: string }) => api.post<Category>("/categories", body),
  update: (id: number, body: { name: string; color: string }) => api.put<Category>(`/categories/${id}`, body),
  delete: (id: number) => api.delete<void>(`/categories/${id}`),
};

export const projectsApi = {
  list: () => api.get<Project[]>("/projects"),
  show: (slug: string) => api.get<Project>(`/projects/${slug}`),
  create: (body: Record<string, unknown>) => api.post<Project>("/projects", body),
  update: (slug: string, body: Record<string, unknown>) => api.put<Project>(`/projects/${slug}`, body),
  delete: (slug: string) => api.delete<void>(`/projects/${slug}`),
  reorder: (ids: number[]) => api.put<void>("/projects/reorder", { ids }),
};

export const accountsApi = {
  list: (params?: RequestOptions["params"]) => api.get<Account[]>("/accounts", params),
  show: (id: number) => api.get<Account>(`/accounts/${id}`),
  create: (body: Record<string, unknown>) => api.post<Account>("/accounts", body),
  update: (id: number, body: Record<string, unknown>) => api.put<Account>(`/accounts/${id}`, body),
  delete: (id: number) => api.delete<void>(`/accounts/${id}`),
  reorder: (ids: number[]) => api.put<void>("/accounts/reorder", { ids }),
};

export type CommandScope =
  | { kind: "library" }
  | { kind: "project"; slug: string }
  | { kind: "account"; id: number };

function commandBase(scope: CommandScope): string {
  if (scope.kind === "project") return `/projects/${scope.slug}/commands`;
  if (scope.kind === "account") return `/accounts/${scope.id}/commands`;
  return "/commands";
}

export const commandsApi = {
  library: () => api.raw<CommandLibrary>("/commands"),
  list: () => api.raw<CommandLibrary>("/commands"),
  show: (id: number) => api.get<Command>(`/commands/${id}`),
  create: (scope: CommandScope, body: Record<string, unknown>) => api.post<Command>(commandBase(scope), body),
  update: (scope: CommandScope, id: number, body: Record<string, unknown>) => api.put<Command>(`${commandBase(scope)}/${id}`, body),
  delete: (scope: CommandScope, id: number) => api.delete<void>(`${commandBase(scope)}/${id}`),
  createFolder: (name: string) => api.post<CommandFolder>("/command-folders", { name }),
  updateFolder: (id: number, name: string) => api.put<CommandFolder>(`/command-folders/${id}`, { name }),
  deleteFolder: (id: number) => api.delete<void>(`/command-folders/${id}`),
};

export type CredentialScope =
  | { kind: "project"; slug: string }
  | { kind: "account"; id: number };

function credentialBase(scope: CredentialScope): string {
  return scope.kind === "project"
    ? `/projects/${scope.slug}/credentials`
    : `/accounts/${scope.id}/credentials`;
}

export const credentialsApi = {
  list: (scope: CredentialScope) => api.get<Credential[]>(credentialBase(scope)),
  create: (scope: CredentialScope, body: Record<string, unknown>) => api.post<Credential>(credentialBase(scope), body),
  update: (scope: CredentialScope, id: number, body: Record<string, unknown>) => api.put<Credential>(`${credentialBase(scope)}/${id}`, body),
  reveal: (scope: CredentialScope, id: number) => api.get<Credential>(`${credentialBase(scope)}/${id}/reveal`),
  delete: (scope: CredentialScope, id: number) => api.delete<void>(`${credentialBase(scope)}/${id}`),
};

export type FileScope =
  | { kind: "library" }
  | { kind: "project"; slug: string }
  | { kind: "account"; id: number };

function fileBase(scope: FileScope): string {
  if (scope.kind === "project") return `/projects/${scope.slug}/files`;
  if (scope.kind === "account") return `/accounts/${scope.id}/files`;
  return "/files";
}

export const filesApi = {
  list: (scope: FileScope = { kind: "library" }) => api.get<FileRecord[]>(fileBase(scope)),
  upload: (scope: FileScope, formData: FormData) => api.upload<FileRecord>(fileBase(scope), formData),
  delete: (scope: FileScope, id: number) => api.delete<void>(`${fileBase(scope)}/${id}`),
  downloadUrl: (scope: FileScope, file: FileRecord) => file.download_url || `${API_BASE}/api${fileBase(scope)}/${file.id}`,
};

export const usersApi = {
  list: () => api.get<User[]>("/users"),
  show: (id: number) => api.get<User>(`/users/${id}`),
  create: (body: Record<string, unknown>) => api.post<User>("/users", body),
  update: (id: number, body: Record<string, unknown>) => api.put<User>(`/users/${id}`, body),
  delete: (id: number) => api.delete<void>(`/users/${id}`),
};

export const profileApi = {
  update: (body: { 
    name: string; 
    email: string; 
    current_password?: string 
  }) => api.put<User>("/profile", body),
  updatePassword: (body: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => api.put<void>("/profile/password", body),
};
