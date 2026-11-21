import type { DashboardSummary, Meta } from "../types";
import { api } from "./client";

export const dashboardApi = {
  summary: () => api.raw<DashboardSummary>("/dashboard"),
};

export const metaApi = {
  get: () => api.raw<Meta>("/meta"),
};
