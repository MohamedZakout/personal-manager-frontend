"use client";

import { useState, type FormEvent } from "react";
import { useAuth, useToast } from "@/components/providers/app-providers";
import { PageHead } from "@/components/ui/page-head";
import { CopyValue } from "@/components/ui/copy-value";
import { ApiError, profileApi } from "@/lib/api";
import { errorMessage, shortDate } from "@/lib/format";

function formError(caught: unknown): string {
  if (caught instanceof ApiError) {
    const fields = caught.fieldErrors;
    return Object.values(fields)[0] ?? caught.message;
  }
  return errorMessage(caught);
}

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError("");
    setSavingProfile(true);
    try {
      const updated = await profileApi.update({
        name,
        email,
        ...(email !== user?.email && currentPassword
          ? { current_password: currentPassword }
          : {}),
      });
      setUser(updated);
      setCurrentPassword("");
      toast("Profile saved.");
    } catch (caught) {
      setProfileError(formError(caught));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError("");
    setSavingPassword(true);
    try {
      await profileApi.updatePassword({
        current_password: passwordCurrent,
        password,
        password_confirmation: passwordConfirmation,
      });
      setPasswordCurrent("");
      setPassword("");
      setPasswordConfirmation("");
      toast("Password changed.");
    } catch (caught) {
      setPasswordError(formError(caught));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <>
      <PageHead title="Settings" />

      <div className="grid-two">
        <section className="panel">
          <div className="panel-head"><h2 className="section-title">Profile</h2></div>
          <form onSubmit={saveProfile}>
            <div className="panel-body form-grid">
              <div className="field">
                <label htmlFor="settings-name">Name</label>
                <input id="settings-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="settings-email">Email</label>
                <input id="settings-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="field full">
                <label htmlFor="settings-current">Current password <span className="faint">(required to change email)</span></label>
                <input id="settings-current" className="input" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
              </div>
              {profileError ? <div className="auth-error full">{profileError}</div> : null}
            </div>
            <div className="panel-foot">
              <button className="btn btn-accent" type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
            </div>
          </form>
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2 className="section-title">Account</h2></div>
            <div className="panel-body">
              <dl className="detail-list">
                <dt>Role</dt>
                <dd><CopyValue value={user?.role_label} label="role">{user?.role_label}</CopyValue></dd>
                <dt>Joined</dt>
                <dd><CopyValue value={user?.created_at} label="joined date">{shortDate(user?.created_at)}</CopyValue></dd>
                <dt>Last updated</dt>
                <dd><CopyValue value={user?.updated_at} label="last updated date">{shortDate(user?.updated_at)}</CopyValue></dd>
              </dl>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h2 className="section-title">Change password</h2></div>
            <form onSubmit={savePassword}>
              <div className="panel-body stack" style={{ gap: 14 }}>
                <div className="field">
                  <label htmlFor="password-current">Current password</label>
                  <input id="password-current" className="input" type="password" value={passwordCurrent} onChange={(event) => setPasswordCurrent(event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="password-new">New password</label>
                  <input id="password-new" className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
                </div>
                <div className="field">
                  <label htmlFor="password-confirm">Confirm new password</label>
                  <input id="password-confirm" className="input" type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required />
                </div>
                {passwordError ? <div className="auth-error">{passwordError}</div> : null}
              </div>
              <div className="panel-foot">
                <button className="btn btn-outline" type="submit" disabled={savingPassword}>
                  {savingPassword ? "Saving…" : "Change password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
