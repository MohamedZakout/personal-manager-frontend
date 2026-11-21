import type { User } from "../types";
import { api } from "./client";

export const usersApi = {
  list: () => api.get<User[]>("/users"),
  show: (id: number) => api.get<User>(`/users/${id}`),
  create: (body: Record<string, unknown>) => api.post<User>("/users", body),
  update: (id: number, body: Record<string, unknown>) => api.put<User>(`/users/${id}`, body),
  delete: (id: number) => api.delete<void>(`/users/${id}`),
};
