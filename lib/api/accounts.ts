import type { Account } from "../types";
import { api, type RequestOptions } from "./client";

export const accountsApi = {
  list: (params?: RequestOptions["params"]) => api.get<Account[]>("/accounts", params),
  show: (id: number) => api.get<Account>(`/accounts/${id}`),
  create: (body: Record<string, unknown>) => api.post<Account>("/accounts", body),
  update: (id: number, body: Record<string, unknown>) => api.put<Account>(`/accounts/${id}`, body),
  delete: (id: number) => api.delete<void>(`/accounts/${id}`),
  reorder: (ids: number[]) => api.put<void>("/accounts/reorder", { ids }),
};
