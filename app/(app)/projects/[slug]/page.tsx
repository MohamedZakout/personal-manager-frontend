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
import { ApiError, categoriesApi, projectsApi } from "@/lib/api";
import { errorMessage, shortDate } from "@/lib/format";
import type { Category, Command, Project } from "@/lib/types";

function ProjectDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextProject, nextCategories] = await Promise.all([
        projectsApi.show(slug),
        categoriesApi.list(),
      ]);
      setProject(nextProject);
      setCategories(nextCategories);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="detail-error">
        <div className="auth-error">{error}</div>
        <Link className="btn btn-outline" href="/projects">
          Back to projects
        </Link>
      </div>
    );
  }

  if (!project) {
    return <div className="loading"><div><div className="spinner" />Opening project…</div></div>;
  }

  const scope = { kind: "project" as const, slug: project.slug };
  const categoryColor = project.category?.color ?? "var(--line-strong)";

  return (
    <>
      <header className="detail-head">
        <div className="detail-head-main">
          <Link className="detail-back" href="/projects" aria-label="Back to projects">
            <ChevronLeftIcon />
          </Link>
          <div className="detail-head-copy">
            <div className="detail-head-title-row">
              <h1 className="detail-head-title">{project.name}</h1>
              <span
                className="detail-category-chip"
                style={{ "--category-color": categoryColor } as CSSProperties}
              >
                <span className="detail-category-dot" aria-hidden="true" />
                {project.category?.name ?? "Uncategorised"}
              </span>
            </div>
            <p className="detail-head-meta">Created {shortDate(project.created_at)}</p>
            {project.description ? (
              <p className="detail-head-description">{project.description}</p>
            ) : null}
          </div>
        </div>
        <button className="btn btn-outline detail-head-edit" onClick={() => setEditing(true)}>
          <PencilIcon />
          Edit project
        </button>
      </header>

      <div className="detail-sections">
        <CredentialManager scope={scope} />
        <FileManager scope={scope} />
        <CommandManager
          scope={scope}
          commands={project.commands ?? []}
          onCommandsChange={(commands: Command[]) =>
            setProject((current) => (current ? { ...current, commands } : current))
          }
        />
      </div>

      {editing ? (
        <EditProjectDialog
          project={project}
          categories={categories}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setProject((current) => (current ? { ...current, ...saved } : saved));
            setEditing(false);
            toast("Project updated.");
          }}
        />
      ) : null}
    </>
  );
}

function EditProjectDialog({
  project,
  categories,
  onClose,
  onSaved,
}: {
  project: Project;
  categories: Category[];
  onClose: () => void;
  onSaved: (project: Project) => void;
}) {
  const [name, setName] = useState(project.name);
  const [categoryId, setCategoryId] = useState(project.category_id ? String(project.category_id) : "");
  const [description, setDescription] = useState(project.description ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = await projectsApi.update(project.slug, {
        name,
        category_id: categoryId ? Number(categoryId) : null,
        description: description || null,
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
      title="Edit project"
      description="Update the name, category, and brief shown at the top of this page."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" form="edit-project" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <form id="edit-project" className="form-grid" onSubmit={submit}>
        <div className="field full">
          <label htmlFor="edit-name">Name</label>
          <input id="edit-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="field full">
          <label htmlFor="edit-category">Category</label>
          <select id="edit-category" className="select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="edit-description">Description</label>
          <textarea
            id="edit-description"
            className="textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this project about?"
            style={{ minHeight: 110 }}
          />
          <span className="hint">A sentence or two about the work this project covers.</span>
        </div>
        {error ? <div className="auth-error full">{error}</div> : null}
      </form>
    </Modal>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div className="loading"><div><div className="spinner" />Opening project…</div></div>}>
      <ProjectDetail />
    </Suspense>
  );
}
