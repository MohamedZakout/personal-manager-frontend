import type { Command, CommandFolder, CommandLibrary } from "../types";
import { api } from "./client";

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
