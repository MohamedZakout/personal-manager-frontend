"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useToast } from "@/components/providers/app-providers";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { PageHead } from "@/components/ui/page-head";
import { ResourceCard, useResourceReorder } from "@/components/ui/resource-card";
import { ApiError, categoriesApi, projectsApi } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { Category, Project } from "@/lib/types";

type ProjectInput = { name: string; category_id: number | null; description: string | null };

function ProjectDialog({
  project,
  categories,
  onClose,
  onSaved,
}: {
  project: Project | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (project: Project) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(project?.name ?? "");
  const [categoryId, setCategoryId] = useState(project?.category_id ? String(project.category_id) : "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const payload: ProjectInput = {
      name,
      category_id: categoryId ? Number(categoryId) : null,
      description: description || null,
    };
    try {
      const saved = project
        ? await projectsApi.update(project.slug, payload)
        : await projectsApi.create(payload);
      onSaved(saved);
      toast(project ? "Project updated." : "Project created.");
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) {
        const fields = caught.fieldErrors;
        if (fields.name) setError(fields.name);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={project ? "Edit project" : "New project"}
      description={project ? "Update the project details." : "Add a project to start collecting its runbooks and access."}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-accent" form="project-form" type="submit" disabled={busy}>
            {busy ? "Saving…" : project ? "Save changes" : "Create project"}
          </button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="form-grid">
        <div className="field full">
          <label htmlFor="project-name">Project name</label>
          <input
            id="project-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Storefront relaunch"
            required
          />
        </div>
        <div className="field full">
          <label htmlFor="project-category">Category</label>
          <select
            id="project-category"
            className="select"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field full">
          <textarea
            id="project-description"
            className="textarea"
            style={{ minHeight: 90 }}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this project about?"
            aria-label="Description"
          />
        </div>
        {error ? <div className="auth-error full" role="alert">{error}</div> : null}
      </form>
    </Modal>
  );
}

export default function ProjectsPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Project | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const { cardDrag } = useResourceReorder(projects, setProjects, projectsApi.reorder);

  const load = useCallback(async () => {
    try {
      const [nextProjects, nextCategories] = await Promise.all([
        projectsApi.list(),
        categoriesApi.list(),
      ]);
      setProjects(nextProjects);
      setCategories(nextCategories);
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
    if (!needle) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(needle) ||
        project.slug.toLowerCase().includes(needle) ||
        (project.description ?? "").toLowerCase().includes(needle),
    );
  }, [projects, query]);

  async function remove() {
    if (!deleting) return;
    try {
      await projectsApi.delete(deleting.slug);
      setProjects((current) => current.filter((item) => item.id !== deleting.id));
      toast("Project deleted.");
      setDeleting(null);
    } catch (caught) {
      toast(errorMessage(caught), "error");
      setDeleting(null);
    }
  }

  if (loading) return <div className="loading"><div><div className="spinner" />Loading projects…</div></div>;
  if (error) return <div className="auth-error">{error}</div>;

  return (
    <>
      <PageHead
        title="Projects"
        actions={
          <button
            className="btn btn-accent"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            New project
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
            <input
              className="input"
              placeholder="Search projects"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <span className="mono muted">{visible.length} of {projects.length}</span>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title={projects.length === 0 ? "No projects yet" : "Nothing matches that search"}
            description={projects.length === 0 ? "Create your first project to give your work a home." : "Try a different name or description."}
            action={
              projects.length === 0 ? (
                <button className="btn btn-accent" onClick={() => setDialogOpen(true)}>
                  Create project
                </button>
              ) : undefined
            }
          />
        ) : null}
      </section>

      {visible.length > 0 ? (
        <div className="card-grid">
          {visible.map((project) => (
            <ResourceCard
              key={project.id}
              name={project.name}
              href={`/projects/${project.slug}`}
              category={project.category}
              metrics={[
                { label: "secrets", value: project.credentials_count ?? 0, icon: "key" },
                { label: "file", value: project.files_count ?? 0, icon: "file" },
                { label: "commands", value: project.commands_count ?? 0, icon: "commands" },
              ]}
              onEdit={() => {
                setEditing(project);
                setDialogOpen(true);
              }}
              onDelete={() => setDeleting(project)}
              drag={cardDrag(project.id)}
            />
          ))}
        </div>
      ) : null}

      {dialogOpen ? (
        <ProjectDialog
          project={editing}
          categories={categories}
          onClose={() => setDialogOpen(false)}
          onSaved={(saved) =>
            setProjects((current) =>
              current.some((item) => item.id === saved.id)
                ? current.map((item) => (item.id === saved.id ? saved : item))
                : [saved, ...current],
            )
          }
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete project?"
          message={`${deleting.name} and its credentials, commands, and files will be removed.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
