import type { FileRecord } from "../types";
import { API_BASE, api } from "./client";

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
