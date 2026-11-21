"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useToast } from "@/components/providers/app-providers";
import { CommandManager } from "@/components/managers/command-manager";
import { CredentialManager } from "@/components/managers/credential-manager";
import { FileManager } from "@/components/managers/file-manager";
import { Modal } from "@/components/ui/modal";
import { ChevronLeftIcon, PencilIcon } from "@/components/ui/section";
import { ApiError, accountsApi, categoriesApi, metaApi } from "@/lib/api";
import { errorMessage, shortDate } from "@/lib/format";
import type { Account, Category, Command, SelectOption } from "@/lib/types";

function AccountDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { toast } = useToast();
  const [account, setAccount] = useState<Account | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<SelectOption[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextAccount, nextCategories, meta] = await Promise.all([
        accountsApi.show(id),
        categoriesApi.list(),
        metaApi.get(),
      ]);
      setAccount(nextAccount);
      setCategories(nextCategories);
      setProviders(meta.account_providers);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="detail-error">
        <div className="auth-error">{error}</div>
        <Link className="btn btn-outline" href="/accounts">
          Back to accounts
        </Link>
      </div>
    );
  }

  if (!account) {
    return <div className="loading"><div><div className="spinner" />Opening account…</div></div>;
  }

  const scope = { kind: "account" as const, id: account.id };
  const categoryColor = account.category?.color ?? "var(--line-strong)";

  return (
    <>
      <header className="detail-head">
        <div className="detail-head-main">
          <Link className="detail-back" href="/accounts" aria-label="Back to accounts">
            <ChevronLeftIcon />
          </Link>
          <div className="detail-head-copy">
            <div className="detail-head-title-row">
              <h1 className="detail-head-title">{account.name}</h1>
              <span
                className="detail-category-chip"
                style={{ "--category-color": categoryColor } as CSSProperties}
              >
                <span className="detail-category-dot" aria-hidden="true" />
                {account.category?.name ?? "Uncategorised"}
              </span>
              <span
                className="detail-category-chip"
                style={{ "--category-color": "var(--accent)" } as CSSProperties}
              >
                <span className="detail-category-dot" aria-hidden="true" />
                {account.provider_label}
              </span>
            </div>
            <p className="detail-head-meta">
              Created {shortDate(account.created_at)}
              {account.external_id ? <> · <span className="mono">{account.external_id}</span></> : null}
            </p>
            {account.description ? (
              <p className="detail-head-description">{account.description}</p>
            ) : null}
          </div>
        </div>
        <button className="btn btn-outline detail-head-edit" onClick={() => setEditing(true)}>
          <PencilIcon />
          Edit account
        </button>
      </header>

      <div className="detail-sections">
        {account.instructions ? (
          <section className="panel">
            <div className="panel-head"><h2 className="section-title">Working notes</h2></div>
            <div className="panel-body">
              <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{account.instructions}</p>
            </div>
          </section>
        ) : null}

        <CredentialManager scope={scope} />
        <FileManager scope={scope} />
        <CommandManager
          scope={scope}
          commands={account.commands ?? []}
          onCommandsChange={(commands: Command[]) =>
            setAccount((current) => (current ? { ...current, commands } : current))
          }
        />
      </div>

      {editing ? (
        <EditAccountDialog
          account={account}
          categories={categories}
          providers={providers}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setAccount((current) => (current ? { ...current, ...saved } : saved));
            setEditing(false);
            toast("Account updated.");
          }}
        />
      ) : null}
    </>
  );
}

function EditAccountDialog({
  account,
  categories,
  providers,
  onClose,
  onSaved,
}: {
  account: Account;
  categories: Category[];
  providers: SelectOption[];
  onClose: () => void;
  onSaved: (account: Account) => void;
}) {
  const [provider, setProvider] = useState(account.provider);
  const [name, setName] = useState(account.name);
  const [categoryId, setCategoryId] = useState(account.category_id ? String(account.category_id) : "");
  const [externalId, setExternalId] = useState(account.external_id ?? "");
  const [description, setDescription] = useState(account.description ?? "");
  const [instructions, setInstructions] = useState(account.instructions ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = await accountsApi.update(account.id, {
        provider,
        name,
        category_id: categoryId ? Number(categoryId) : null,
        external_id: externalId || null,
        description: description || null,
        instructions: instructions || null,
      });
      onSaved(saved);
    } catch (caught) {
      const fields = caught instanceof ApiError ? caught.fieldErrors : {};
      setError(Object.values(fields)[0] ?? errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Edit account"
      description="Update the provider, details, and notes shown at the top of this page."
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" form="edit-account" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <form id="edit-account" className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="edit-account-provider">Provider</label>
          <select
            id="edit-account-provider"
            className="select"
            value={provider}
            onChange={(event) => setProvider(event.target.value as Account["provider"])}
            required
          >
            {providers.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="edit-account-name">Account name</label>
          <input id="edit-account-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="edit-account-category">Category</label>
          <select id="edit-account-category" className="select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="edit-account-external">External ID</label>
          <input id="edit-account-external" className="input" value={externalId} onChange={(event) => setExternalId(event.target.value)} placeholder="Account handle or ID" />
        </div>
        <div className="field full">
          <label htmlFor="edit-account-description">Description</label>
          <input id="edit-account-description" className="input" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="edit-account-instructions">Working notes</label>
          <textarea
            id="edit-account-instructions"
            className="textarea"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Notes for anyone using this account"
            style={{ minHeight: 110 }}
          />
        </div>
        {error ? <div className="auth-error full">{error}</div> : null}
      </form>
    </Modal>
  );
}

export default function AccountDetailPage() {
  return (
    <Suspense fallback={<div className="loading"><div><div className="spinner" />Opening account…</div></div>}>
      <AccountDetail />
    </Suspense>
  );
}
