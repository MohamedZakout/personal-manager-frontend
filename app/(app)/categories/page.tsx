"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/providers/app-providers";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyValue } from "@/components/ui/copy-value";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { PageHead } from "@/components/ui/page-head";
import { ApiError, categoriesApi } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { Category } from "@/lib/types";

const COLORS = ["#d9922f", "#2d7d6d", "#b34634", "#5a6fa8", "#8a5aa8", "#102c2b"];

function CategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: (category: Category) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? COLORS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = category
        ? await categoriesApi.update(category.id, { name, color })
        : await categoriesApi.create({ name, color });
      onSaved(saved);
      toast(category ? "Category updated." : "Category created.");
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
      title={category ? "Edit category" : "New category"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" form="category-form" type="submit" disabled={busy}>
            {busy ? "Saving…" : category ? "Save changes" : "Create category"}
          </button>
        </>
      }
    >
      <form id="category-form" className="stack" style={{ gap: 18 }} onSubmit={submit}>
        <div className="field">
          <label htmlFor="category-name">Name</label>
          <input
            id="category-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Infrastructure"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="category-color">Colour</label>
          <div className="row">
            <input
              id="category-color"
              className="input"
              style={{ width: 130 }}
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
            <div className="row" style={{ gap: 6 }}>
              {COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Use ${option}`}
                  onClick={() => setColor(option)}
                  style={{
                    width: 22,
                    height: 22,
                    background: option,
                    border: color === option ? "2px solid var(--ink)" : "1px solid var(--line)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        {error ? <div className="auth-error">{error}</div> : null}
      </form>
    </Modal>
  );
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const load = useCallback(async () => {
    try {
      setCategories(await categoriesApi.list());
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
      await categoriesApi.delete(deleting.id);
      setCategories((current) => current.filter((item) => item.id !== deleting.id));
      toast("Category deleted.");
    } catch (caught) {
      toast(errorMessage(caught), "error");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <div className="loading"><div><div className="spinner" />Loading categories…</div></div>;
  if (error) return <div className="auth-error">{error}</div>;

  return (
    <>
      <PageHead
        title="Categories"
        actions={
          <button className="btn btn-accent" onClick={() => setEditing("new")}>New category</button>
        }
      />

      <section className="panel">
        <div className="panel-head">
          <h2 className="section-title">All categories</h2>
          <span className="mono muted">{categories.length}</span>
        </div>
        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Categories make it easier to scan a long list of projects and accounts."
            action={<button className="btn btn-outline" onClick={() => setEditing("new")}>Create category</button>}
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Colour</th>
                <th>Projects</th>
                <th>Accounts</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <CopyValue value={category.name} label="category name">
                      <span className="cell-title">{category.name}</span>
                    </CopyValue>
                  </td>
                  <td>
                    <CopyValue value={category.color} label="category colour">
                      <span className="badge" style={{ borderColor: category.color, color: category.color }}>
                        {category.color}
                      </span>
                    </CopyValue>
                  </td>
                  <td className="mono muted">{category.projects_count ?? "—"}</td>
                  <td className="mono muted">{category.accounts_count ?? "—"}</td>
                  <td>
                    <div className="cell-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(category)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(category)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {editing ? (
        <CategoryDialog
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) =>
            setCategories((current) =>
              current.some((item) => item.id === saved.id)
                ? current.map((item) => (item.id === saved.id ? saved : item))
                : [...current, saved],
            )
          }
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete category?"
          message={`${deleting.name} will be removed. Projects and accounts using it will stay.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
