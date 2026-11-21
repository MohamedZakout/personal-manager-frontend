"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/app-providers";
import { BrandIcon } from "@/components/ui/brand-icon";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (caught) {
      if (caught instanceof ApiError) {
        const fields = caught.fieldErrors;
        setError(fields.email ?? fields.password ?? caught.message);
      } else {
        setError("Unable to sign in.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <Link href="/login" className="brand">
          <span className="brand-mark">
            <BrandIcon />
          </span>
          <span className="brand-name">Personal Manager</span>
        </Link>

        <div className="auth-headline">
          <h1>Your work, one place.</h1>
        </div>

        <div className="auth-visual-foot">
          <span>PERSONAL MANAGER</span>
          <span>v1.0</span>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card">
          

          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error ? (
              <div className="auth-error" role="alert">
                {error}
              </div>
            ) : null}

            <button className="btn btn-accent" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
