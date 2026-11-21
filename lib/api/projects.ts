import type { Project } from "../types";
import { api } from "./client";

export const projectsApi = {
  list: () => api.get<Project[]>("/projects"),
  show: (slug: string) => api.get<Project>(`/projects/${slug}`),
  create: (body: Record<string, unknown>) => api.post<Project>("/projects", body),
  update: (slug: string, body: Record<string, unknown>) => api.put<Project>(`/projects/${slug}`, body),
  delete: (slug: string) => api.delete<void>(`/projects/${slug}`),
  reorder: (ids: number[]) => api.put<void>("/projects/reorder", { ids }),
};
