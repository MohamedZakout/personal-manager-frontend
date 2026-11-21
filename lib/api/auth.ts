import type { LoginResponse, User } from "../types";
import { api } from "./client";

export const authApi = {
  login: (email: string, password: string) => api.post<LoginResponse>("/login", { email, password }),
  logout: () => api.post<void>("/logout"),
  me: () => api.get<User>("/me"),
};

export const profileApi = {
  update: (body: {
    name: string;
    email: string;
    current_password?: string;
  }) => api.put<User>("/profile", body),
  updatePassword: (body: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => api.put<void>("/profile/password", body),
};
