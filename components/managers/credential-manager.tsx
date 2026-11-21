"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/providers/app-providers";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { CopyValue } from "@/components/ui/copy-value";
import {
  EyeIcon,
  KeyIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  SectionEmpty,
  SectionHead,
  TrashIcon,
} from "@/components/ui/section";
import { ApiError, credentialsApi, type CredentialScope } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { Credential } from "@/lib/types";

type FieldRow = { key: string; value: string };

type DialogState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; credential: Credential; rows: FieldRow[] }
  | { kind: "reveal"; credential: Credential };

export function CredentialManager({ scope }: { scope: CredentialScope }) {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [deleting, setDeleting] = useState<Credential | null>(null);

  const load = useCallback(async () => {
    try {
      setCredentials(await credentialsApi.list(scope));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [scope.kind, scope.kind === "project" ? scope.slug : scope.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <div className="loading"><div><div className="spinner" />Loading credentials…</div></div>;
  if (error) return <div className="auth-error">{error}</div>;

  async function remove() {
    if (!deleting) return;
    try {
      await credentialsApi.delete(scope, deleting.id);
      setCredentials((current) => current.filter((item) => item.id !== deleting.id));
      toast("Credential removed.");
    } catch (caught) {
      toast(errorMessage(caught), "error");
    } finally {
      setDeleting(null);
    }
  }

  async function reveal(credential: Credential) {
    try {
      setDialog({
        kind: "reveal",
        credential: await credentialsApi.reveal(scope, credential.id),
      });
    } catch (caught) {
      toast(errorMessage(caught), "error");
    }
  }

  async function edit(credential: Credential) {
    try {
      const full = await credentialsApi.reveal(scope, credential.id);
      setDialog({
        kind: "edit",
        credential: full,
        rows: full.fields.map((field) => ({
          key: field.key,
          value: field.value ?? "",
        })),
      });
    } catch (caught) {
      toast(errorMessage(caught), "error");
    }
  }

  return (
    <>
      <section className="section-card">
        <SectionHead
          icon={<KeyIcon />}
          title="Credentials"
          count={credentials.length}
          description="Passwords, keys, and tokens"
          action={
            <button className="btn btn-accent btn-sm" onClick={() => setDialog({ kind: "create" })}>
              <PlusIcon />
              Add credential
            </button>
          }
        />

        {credentials.length === 0 ? (
          <SectionEmpty
            icon={<KeyIcon />}
            title="No credentials stored"
            description="Passwords, API keys, and tokens are encrypted at rest."
          />
        ) : (
          <ul className="section-list">
            {credentials.map((credential) => (
              <li
                className="section-row is-clickable"
                key={credential.id}
                onClick={() => void reveal(credential)}
              >
                <button
                  className="section-row-click"
                  onClick={(event) => {
                    event.stopPropagation();
                    void reveal(credential);
                  }}
                  aria-label={`Reveal ${credential.title}`}
                >
                  <span className="section-row-icon" aria-hidden="true"><KeyIcon /></span>
                  <span className="section-row-main">
                    <span className="section-row-title">{credential.title}</span>
                    {credential.instructions ? (
                      <span className="section-row-note">{credential.instructions}</span>
                    ) : null}
                  </span>
                </button>
                <div className="section-row-actions">
                  <button
                    className="section-row-action"
                    onClick={(event) => {
                      event.stopPropagation();
                      void reveal(credential);
                    }}
                    title="Reveal"
                    aria-label={`Reveal ${credential.title}`}
                  >
                    <EyeIcon />
                  </button>
                  <button
                    className="section-row-action"
                    onClick={(event) => {
                      event.stopPropagation();
                      void edit(credential);
                    }}
                    title="Edit"
                    aria-label={`Edit ${credential.title}`}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    className="section-row-action is-danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleting(credential);
                    }}
                    title="Delete"
                    aria-label={`Delete ${credential.title}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(dialog.kind === "create" || dialog.kind === "edit") ? (
        <CredentialForm
          credential={dialog.kind === "edit" ? dialog.credential : null}
          initialRows={dialog.kind === "edit" ? dialog.rows : [{ key: "", value: "" }]}
          scope={scope}
          onClose={() => setDialog({ kind: "closed" })}
          onSaved={async () => {
            await load();
            setDialog({ kind: "closed" });
          }}
        />
      ) : null}

      {dialog.kind === "reveal" ? (
        <Modal
          className="reveal-modal"
          icon={<KeyIcon />}
          title={dialog.credential.title}
          onClose={() => setDialog({ kind: "closed" })}
          wide
          footer={
            <button className="btn btn-outline" onClick={() => setDialog({ kind: "closed" })}>
              Done
            </button>
          }
        >
          <div className="reveal-dialog">
            <div className="reveal-notice">
              <LockIcon />
              <span>
                Decrypted for this session. Close the dialog to hide these values, and avoid
                sharing them in screenshots.
              </span>
            </div>

            {dialog.credential.instructions ? (
              <div className="reveal-instructions">
                <span className="reveal-instructions-label">Instructions</span>
                <p>{dialog.credential.instructions}</p>
              </div>
            ) : null}

            <div className="reveal-fields-head">
              <span>Fields</span>
              <span className="section-count">{dialog.credential.fields.length}</span>
            </div>

            {dialog.credential.fields.length === 0 ? (
              <div className="reveal-empty">No fields were saved for this credential.</div>
            ) : (
              <div className="reveal-fields">
                {dialog.credential.fields.map((field) => (
                  <div className="reveal-field" key={field.key}>
                    <div className="reveal-field-label mono">{field.key}</div>
                    <CopyValue
                      variant="block"
                      className="reveal-value"
                      value={field.value}
                      label={field.key}
                    >
                      {field.value ?? "—"}
                    </CopyValue>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Remove credential?"
          message={`${deleting.title} will be deleted. This cannot be undone.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}

function CredentialForm({
  scope,
  credential,
  initialRows,
  onClose,
  onSaved,
}: {
  scope: CredentialScope;
  credential: Credential | null;
  initialRows: FieldRow[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(credential?.title ?? "");
  const [instructions, setInstructions] = useState(credential?.instructions ?? "");
  const [rows, setRows] = useState<FieldRow[]>(initialRows);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function setRow(index: number, patch: Partial<FieldRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const payload = {
      title,
      instructions: instructions || null,
      fields: rows.map((row) => ({ key: row.key, value: row.value })),
    };
    try {
      if (credential) await credentialsApi.update(scope, credential.id, payload);
      else await credentialsApi.create(scope, payload);
      toast(credential ? "Credential updated." : "Credential saved.");
      await onSaved();
    } catch (caught) {
      const fields = caught instanceof ApiError ? caught.fieldErrors : {};
      const first = Object.values(fields)[0];
      setError(first ?? errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={credential ? "Edit credential" : "New credential"}
      description="Field names are visible; values are encrypted at rest."
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-accent" form="credential-form" type="submit" disabled={busy}>
            {busy ? "Saving…" : credential ? "Save changes" : "Save credential"}
          </button>
        </>
      }
    >
      <form id="credential-form" onSubmit={submit} className="stack" style={{ gap: 18 }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="credential-title">Title</label>
            <input
              id="credential-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Production API key"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="credential-instructions">Instructions</label>
            <input
              id="credential-instructions"
              className="input"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Where to use this"
            />
          </div>
        </div>

        <div>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <label className="muted" style={{ fontSize: "0.8rem" }}>Fields</label>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setRows((current) => [...current, { key: "", value: "" }])}
              disabled={rows.length >= 20}
            >
              Add field
            </button>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {rows.map((row, index) => (
              <div className="row" key={index} style={{ flexWrap: "nowrap" }}>
                <input
                  className="input"
                  placeholder="Field name"
                  value={row.key}
                  onChange={(event) => setRow(index, { key: event.target.value })}
                  required
                />
                <input
                  className="input"
                  placeholder="Value"
                  value={row.value}
                  onChange={(event) => setRow(index, { value: event.target.value })}
                  required
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  disabled={rows.length === 1}
                  aria-label={`Remove field ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {error ? <div className="auth-error" role="alert">{error}</div> : null}
      </form>
    </Modal>
  );
}
