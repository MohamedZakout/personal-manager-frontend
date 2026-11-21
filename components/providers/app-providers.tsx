"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, getToken, setToken } from "@/lib/api";
import type { LoginResponse, User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type Toast = { id: number; message: string; variant: "success" | "error" };
type ToastContextValue = {
  toast: (message: string, variant?: Toast["variant"]) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function publicUser(response: LoginResponse): User {
  const user: Record<string, unknown> = { ...response };
  delete user.token;
  delete user.token_type;
  delete user.expires_in;
  return user as User;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      setUser(await authApi.me());
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener("relay:unauthorized", onUnauthorized);
    return () =>
      window.removeEventListener("relay:unauthorized", onUnauthorized);
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    // The API refuses login when a token is already attached, so a stale one
    // must never be sent from the sign-in screen.
    setToken(null);
    const response = await authApi.login(email, password);
    setToken(response.token);
    const nextUser = publicUser(response);
    setUser(nextUser);
    setReady(true);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Revocation is best-effort; the local token is always cleared.
    }
    setToken(null);
    setUser(null);
  }, []);

  const toast = useCallback((message: string, variant: Toast["variant"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const authValue = useMemo(
    () => ({ user, ready, login, logout, refresh, setUser }),
    [user, ready, login, logout, refresh],
  );
  const toastValue = useMemo(() => ({ toast }), [toast]);

  return (
    <AuthContext.Provider value={authValue}>
      <ToastContext.Provider value={toastValue}>
        {children}
        <div className="toast-stack" aria-live="polite">
          {toasts.map((item) => (
            <div key={item.id} className={`toast ${item.variant}`}>
              {item.message}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AppProviders");
  return context;
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside AppProviders");
  return context;
}
