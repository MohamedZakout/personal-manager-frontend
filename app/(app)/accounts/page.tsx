"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useToast } from "@/components/providers/app-providers";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { PageHead } from "@/components/ui/page-head";
import { ResourceCard, useResourceReorder } from "@/components/ui/resource-card";
import {
  ApiError,
  accountsApi,
  categoriesApi,
  metaApi,
} from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { Account, Category, SelectOption } from "@/lib/types";

function AccountDialog({
  account,
  categories,
  providers,
  onClose,
  onSaved,
}: {
  account: Account | null;
  categories: Category[];
  providers: SelectOption[];
  onClose: () => void;
  onSaved: (account: Account) => void;
}) {
  const { toast } = useToast();
  const [provider, setProvider] = useState(account?.provider ?? providers[0]?.value ?? "other");
  const [name, setName] = useState(account?.name ?? "");
  const [categoryId, setCategoryId] = useState(account?.category_id ? String(account.category_id) : "");
  const [externalId, setExternalId] = useState(account?.external_id ?? "");
  const [description, setDescription] = useState(account?.description ?? "");
  const [instructions, setInstructions] = useState(account?.instructions ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const payload = {
      provider,
      name,
      category_id: categoryId ? Number(categoryId) : null,
      external_id: externalId || null,
      description: description || null,
      instructions: instructions || null,
    };
    try {
      const saved = account
        ? await accountsApi.update(account.id, payload)
        : await accountsApi.create(payload);
      onSaved(saved);
      toast(account ? "Account updated." : "Account added.");
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
      title={account ? "Edit account" : "Add account"}
      description="Register a service or provider you work with."
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" form="account-form" type="submit" disabled={busy}>
            {busy ? "Saving…" : account ? "Save changes" : "Add account"}
          </button>
        </>
      }
    >
      <form id="account-form" className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="account-provider">Provider</label>
          <select id="account-provider" className="select" value={provider} onChange={(event) => setProvider(event.target.value)} required>
            {providers.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="account-name">Account name</label>
          <input id="account-name" className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Production" required />
        </div>
        <div className="field">
          <label htmlFor="account-category">Category</label>
          <select id="account-category" className="select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="account-external">External ID</label>
          <input id="account-external" className="input" value={externalId} onChange={(event) => setExternalId(event.target.value)} placeholder="Account handle or ID" />
        </div>
        <div className="field full">
          <label htmlFor="account-description">Description</label>
          <input id="account-description" className="input" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="account-instructions">Instructions</label>
          <textarea id="account-instructions" className="textarea" value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Notes for anyone using this account" />
        </div>
        {error ? <div className="auth-error full">{error}</div> : null}
      </form>
    </Modal>
  );
}

export default function AccountsPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Account | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const { cardDrag } = useResourceReorder(accounts, setAccounts, accountsApi.reorder);

  const load = useCallback(async () => {
    try {
      const [nextAccounts, nextCategories, meta] = await Promise.all([
        accountsApi.list(),
        categoriesApi.list(),
        metaApi.get(),
      ]);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
      setProviders(meta.account_providers);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter(
      (account) =>
        account.name.toLowerCase().includes(needle) ||
        account.provider_label.toLowerCase().includes(needle) ||
        (account.external_id ?? "").toLowerCase().includes(needle),
    );
  }, [accounts, query]);

  async function remove() {
    if (!deleting) return;
    try {
      await accountsApi.delete(deleting.id);
      setAccounts((current) => current.filter((item) => item.id !== deleting.id));
      toast("Account removed.");
    } catch (caught) {
      toast(errorMessage(caught), "error");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <div className="loading"><div><div className="spinner" />Loading accounts…</div></div>;
  if (error) return <div className="auth-error">{error}</div>;

  return (
    <>
      <PageHead
        title="Accounts"
        actions={
          <button
            className="btn btn-accent"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Add account
          </button>
        }
      />

      <section className="panel">
        <div className="panel-head">
          <div className="search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input className="input" placeholder="Search accounts" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <span className="mono muted">{visible.length} of {accounts.length}</span>
        </div>
        {visible.length === 0 ? (
          <EmptyState
            title={accounts.length === 0 ? "No accounts yet" : "Nothing matches that search"}
            description={accounts.length === 0 ? "Add a provider account to keep its details in reach." : "Try a different name or provider."}
            action={accounts.length === 0 ? <button className="btn btn-accent" onClick={() => setDialogOpen(true)}>Add account</button> : undefined}
          />
        ) : null}
      </section>

      {visible.length > 0 ? (
        <div className="card-grid">
          {visible.map((account) => (
            <ResourceCard
              key={account.id}
              name={account.name}
              href={`/accounts/${account.id}`}
              category={account.category ?? { name: account.provider_label }}
              metrics={[
                { label: "secrets", value: account.credentials_count ?? 0, icon: "key" },
                { label: "file", value: account.files_count ?? 0, icon: "file" },
                { label: "commands", value: account.commands_count ?? 0, icon: "commands" },
              ]}
              onEdit={() => {
                setEditing(account);
                setDialogOpen(true);
              }}
              onDelete={() => setDeleting(account)}
              drag={cardDrag(account.id)}
            />
          ))}
        </div>
      ) : null}

      {dialogOpen ? (
        <AccountDialog
          account={editing}
          categories={categories}
          providers={providers}
          onClose={() => setDialogOpen(false)}
          onSaved={(saved) =>
            setAccounts((current) =>
              current.some((item) => item.id === saved.id)
                ? current.map((item) => (item.id === saved.id ? saved : item))
                : [saved, ...current],
            )
          }
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete account?"
          message={`${deleting.name} and everything attached to it will be removed.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
