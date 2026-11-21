"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth, useToast } from "@/components/providers/app-providers";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyValue } from "@/components/ui/copy-value";
import { Modal } from "@/components/ui/modal";
import { PageHead } from "@/components/ui/page-head";
import { ApiError, metaApi, usersApi } from "@/lib/api";
import { errorMessage, shortDate } from "@/lib/format";
import type { SelectOption, User } from "@/lib/types";

function UserDialog({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: User | null;
  roles: SelectOption[];
  onClose: () => void;
  onSaved: (user: User) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState(user?.role ?? "user");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { name, email };
      if (!user) {
        payload.role = role;
        payload.password = password;
        payload.password_confirmation = confirmation;
      } else if (user.can_change_role) {
        payload.role = role;
      }
      const saved = user ? await usersApi.update(user.id, payload) : await usersApi.create(payload);
      onSaved(saved);
      toast(user ? "User updated." : "User created.");
      onClose();
    } catch (caught) {
      const fields = caught instanceof ApiError ? caught.fieldErrors : {};
      setError(Object.values(fields)[0] ?? errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={user ? "Edit user" : "New user"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" form="user-form" type="submit" disabled={busy}>
            {busy ? "Saving…" : user ? "Save changes" : "Create user"}
          </button>
        </>
      }
    >
      <form id="user-form" className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="user-name">Name</label>
          <input id="user-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="user-email">Email</label>
          <input id="user-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="field full">
          <label htmlFor="user-role">Role</label>
          <select
            id="user-role"
            className="select"
            value={role}
            onChange={(event) => setRole(event.target.value as User["role"])}
            disabled={Boolean(user && !user.can_change_role)}
          >
            {roles.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        {!user ? (
          <>
            <div className="field">
              <label htmlFor="user-password">Password</label>
              <input id="user-password" className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
            </div>
            <div className="field">
              <label htmlFor="user-confirmation">Confirm password</label>
              <input id="user-confirmation" className="input" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
            </div>
          </>
        ) : null}
        {error ? <div className="auth-error full">{error}</div> : null}
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextUsers, meta] = await Promise.all([usersApi.list(), metaApi.get()]);
      setUsers(nextUsers);
      setRoles(meta.user_roles);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove() {
    if (!deleting) return;
    try {
      await usersApi.delete(deleting.id);
      setUsers((current) => current.filter((item) => item.id !== deleting.id));
      toast("User deleted.");
    } catch (caught) {
      toast(errorMessage(caught), "error");
    } finally {
      setDeleting(null);
    }
  }

  if (currentUser?.role !== "admin") {
    return (
      <>
        <PageHead title="Users" />
        <div className="auth-error">This area is available to admins only.</div>
      </>
    );
  }

  if (loading) return <div className="loading"><div><div className="spinner" />Loading users…</div></div>;
  if (error) return <div className="auth-error">{error}</div>;

  return (
    <>
      <PageHead
        title="Users"
        actions={<button className="btn btn-accent" onClick={() => setEditing("new")}>New user</button>}
      />

      <section className="panel">
        <div className="panel-head">
          <h2 className="section-title">Team</h2>
          <span className="mono muted">{users.length} users</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Workspace</th>
              <th>Joined</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <span className="cell-title">{user.name}</span>
                  <div className="cell-sub">
                    <CopyValue value={user.email} label="email address">{user.email}</CopyValue>
                  </div>
                </td>
                <td>
                  <span className={`badge ${user.role === "admin" ? "accent" : ""}`}>{user.role_label}</span>
                </td>
                <td className="mono muted">
                  {user.projects_count ?? 0} projects · {user.accounts_count ?? 0} accounts · {user.commands_count ?? 0} runs
                </td>
                <td className="muted">{shortDate(user.created_at)}</td>
                <td>
                  <div className="cell-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(user)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(user)} disabled={!user.can_delete}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editing ? (
        <UserDialog
          user={editing === "new" ? null : editing}
          roles={roles}
          onClose={() => setEditing(null)}
          onSaved={(saved) =>
            setUsers((current) =>
              current.some((item) => item.id === saved.id)
                ? current.map((item) => (item.id === saved.id ? saved : item))
                : [...current, saved],
            )
          }
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete user?"
          message={`${deleting.name} and everything they own will be removed.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
