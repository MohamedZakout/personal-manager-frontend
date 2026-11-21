import type { Category } from "../types";
import { api } from "./client";

export const categoriesApi = {
  list: () => api.get<Category[]>("/categories"),
  create: (body: { name: string; color: string }) => api.post<Category>("/categories", body),
  update: (id: number, body: { name: string; color: string }) => api.put<Category>(`/categories/${id}`, body),
  delete: (id: number) => api.delete<void>(`/categories/${id}`),
};
