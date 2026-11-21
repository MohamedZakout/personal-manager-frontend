"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/providers/app-providers";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { CopyValue } from "@/components/ui/copy-value";
import {
  CommandIcon,
  PencilIcon,
  PlusIcon,
  SectionEmpty,
  SectionHead,
  TrashIcon,
} from "@/components/ui/section";
import {
  ApiError,
  commandsApi,
  type CommandScope,
} from "@/lib/api";
import { errorMessage, shortDate } from "@/lib/format";
import type { Command, CommandFolder, CommandStep, CommandVariable } from "@/lib/types";

type StepRow = CommandStep;
type VariableRow = CommandVariable;

function CommandForm({
  scope,
  command,
  folders,
  onClose,
  onSaved,
}: {
  scope: CommandScope;
  command: Command | null;
  folders: CommandFolder[];
  onClose: () => void;
  onSaved: (command: Command) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(command?.name ?? "");
  const [description, setDescription] = useState(command?.description ?? "");
  const [tags, setTags] = useState((command?.tags ?? []).join(", "));
  const [folderId, setFolderId] = useState(command?.folder_id ? String(command.folder_id) : "");
  const [steps, setSteps] = useState<StepRow[]>(
    command?.steps.length ? command.steps : [{ type: "command", value: "" }],
  );
  const [variables, setVariables] = useState<VariableRow[]>(command?.variables ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function updateStep(index: number, patch: Partial<StepRow>) {
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const payload = {
      name,
      description: description || null,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      command_folder_id: folderId ? Number(folderId) : null,
      steps,
      variables,
    };
    try {
      const saved = command
        ? await commandsApi.update(scope, command.id, payload)
        : await commandsApi.create(scope, payload);
      onSaved(saved);
      toast(command ? "Runbook updated." : "Runbook saved.");
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
      title={command ? "Edit runbook" : "New runbook"}
      description="Build a repeatable sequence of notes and commands."
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" form="command-form" type="submit" disabled={busy}>
            {busy ? "Saving…" : command ? "Save changes" : "Save runbook"}
          </button>
        </>
      }
    >
      <form id="command-form" className="stack" style={{ gap: 20 }} onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="command-name">Name</label>
            <input
              id="command-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Deploy to staging"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="command-folder">Folder</label>
            <select
              id="command-folder"
              className="select"
              value={folderId}
              onChange={(event) => setFolderId(event.target.value)}
            >
              <option value="">No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>
          <div className="field full">
            <label htmlFor="command-description">Description</label>
            <input
              id="command-description"
              className="input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this runbook does"
            />
          </div>
          <div className="field full">
            <label htmlFor="command-tags">Tags</label>
            <input
              id="command-tags"
              className="input"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="deploy, staging, backend"
            />
          </div>
        </div>

        <div>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <label className="muted" style={{ fontSize: "0.8rem" }}>Steps</label>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setSteps((current) => [...current, { type: "command", value: "" }])}
            >
              Add step
            </button>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {steps.map((step, index) => (
              <div key={index} className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                <select
                  className="select"
                  style={{ width: 120, flex: "none" }}
                  value={step.type}
                  onChange={(event) => updateStep(index, { type: event.target.value as StepRow["type"] })}
                >
                  <option value="command">Command</option>
                  <option value="instruction">Note</option>
                </select>
                <textarea
                  className="textarea"
                  style={{ minHeight: 62 }}
                  value={step.value}
                  onChange={(event) => updateStep(index, { value: event.target.value })}
                  placeholder={step.type === "command" ? "npm run deploy" : "Check the staging environment first"}
                  required
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSteps((current) => current.filter((_, i) => i !== index))}
                  disabled={steps.length === 1}
                  aria-label={`Remove step ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="hint muted" style={{ fontSize: "0.72rem", marginTop: 8 }}>
            Use <code className="mono">{"{{ name }}"}</code> inside a command to mark a variable. Variables are detected automatically.
          </p>
        </div>

        <div>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <label className="muted" style={{ fontSize: "0.8rem" }}>Variable defaults</label>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                setVariables((current) => [
                  ...current,
                  { name: "", default: null, description: null },
                ])
              }
            >
              Add variable
            </button>
          </div>
          {variables.length > 0 ? (
            <div className="stack" style={{ gap: 8 }}>
              {variables.map((variable, index) => (
                <div className="row" key={index} style={{ flexWrap: "nowrap" }}>
                  <input
                    className="input"
                    placeholder="name"
                    value={variable.name}
                    onChange={(event) =>
                      setVariables((current) =>
                        current.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
                      )
                    }
                  />
                  <input
                    className="input"
                    placeholder="default value"
                    value={variable.default ?? ""}
                    onChange={(event) =>
                      setVariables((current) =>
                        current.map((item, i) => (i === index ? { ...item, default: event.target.value || null } : item)),
                      )
                    }
                  />
                  <input
                    className="input"
                    placeholder="description"
                    value={variable.description ?? ""}
                    onChange={(event) =>
                      setVariables((current) =>
                        current.map((item, i) => (i === index ? { ...item, description: event.target.value || null } : item)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setVariables((current) => current.filter((_, i) => i !== index))}
                    aria-label={`Remove variable ${index + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="faint" style={{ fontSize: "0.78rem" }}>No variable defaults needed.</p>
          )}
        </div>

        {error ? <div className="auth-error" role="alert">{error}</div> : null}
      </form>
    </Modal>
  );
}

export function CommandManager({
  scope,
  commands: initialCommands,
  folders: initialFolders,
  onCommandsChange,
}: {
  scope: CommandScope;
  commands?: Command[];
  folders?: CommandFolder[];
  onCommandsChange?: (commands: Command[]) => void;
}) {
  const { toast } = useToast();
  const isLibrary = scope.kind === "library";
  const [commands, setCommands] = useState<Command[]>(initialCommands ?? []);
  const [folders, setFolders] = useState<CommandFolder[]>(initialFolders ?? []);
  const [loading, setLoading] = useState(isLibrary && !initialCommands);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Command | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Command | null>(null);
  const [preview, setPreview] = useState<Command | null>(null);

  const loadLibrary = useCallback(async () => {
    if (!isLibrary) return;
    try {
      const library = await commandsApi.library();
      setCommands(library.commands);
      setFolders(library.folders);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [isLibrary]);

  useEffect(() => {
    if (initialCommands) setCommands(initialCommands);
  }, [initialCommands]);
  useEffect(() => {
    if (initialFolders) setFolders(initialFolders);
  }, [initialFolders]);
  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  function commit(next: Command[]) {
    setCommands(next);
    onCommandsChange?.(next);
  }

  async function remove() {
    if (!deleting) return;
    try {
      await commandsApi.delete(scope, deleting.id);
      const next = commands.filter((item) => item.id !== deleting.id);
      commit(next);
      if (isLibrary) void loadLibrary();
      toast("Runbook deleted.");
    } catch (caught) {
      toast(errorMessage(caught), "error");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <div className="loading"><div><div className="spinner" />Loading runbooks…</div></div>;
  if (error) return <div className="auth-error">{error}</div>;

  return (
    <>
      <section className="section-card">
        <SectionHead
          icon={<CommandIcon />}
          title="Commands"
          count={commands.length}
          description="Repeatable steps and notes"
          action={
            <button
              className="btn btn-accent btn-sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <PlusIcon />
              New command
            </button>
          }
        />

        {commands.length === 0 ? (
          <SectionEmpty
            icon={<CommandIcon />}
            title="No commands yet"
            description="Add the commands used for this project so they are one click away."
          />
        ) : (
          <ul className="section-list">
            {commands.map((command) => (
              <li className="section-row" key={command.id}>
                <span className="section-row-icon" aria-hidden="true"><CommandIcon /></span>
                <div className="section-row-main">
                  <button className="section-row-title" onClick={() => setPreview(command)}>
                    {command.name}
                  </button>
                  <div className="section-row-meta">
                    <span>{command.steps.length} {command.steps.length === 1 ? "step" : "steps"}</span>
                    {command.tags.slice(0, 2).map((tag) => (
                      <span className="section-tag" key={tag}>{tag}</span>
                    ))}
                    {command.tags.length > 2 ? <span>+{command.tags.length - 2}</span> : null}
                    <span>Updated {shortDate(command.updated_at)}</span>
                  </div>
                  {command.description ? (
                    <p className="section-row-note">{command.description}</p>
                  ) : null}
                </div>
                <div className="section-row-actions">
                  <button
                    className="section-row-action"
                    onClick={() => {
                      setEditing(command);
                      setFormOpen(true);
                    }}
                    title="Edit"
                    aria-label={`Edit ${command.name}`}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    className="section-row-action is-danger"
                    onClick={() => setDeleting(command)}
                    title="Delete"
                    aria-label={`Delete ${command.name}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {formOpen ? (
        <CommandForm
          scope={scope}
          command={editing}
          folders={folders}
          onClose={() => setFormOpen(false)}
          onSaved={(saved) => {
            const exists = commands.some((item) => item.id === saved.id);
            commit(
              exists
                ? commands.map((item) => (item.id === saved.id ? saved : item))
                : [saved, ...commands],
            );
          }}
        />
      ) : null}

      {preview ? (
        <Modal
          title={preview.name}
          description={preview.description ?? undefined}
          onClose={() => setPreview(null)}
          wide
        >
          <div className="stack" style={{ gap: 14 }}>
            {preview.steps.map((step, index) => (
              <div key={index}>
                <div className="kicker" style={{ marginBottom: 7 }}>
                  {step.type === "command" ? "Command" : "Note"} {index + 1}
                </div>
                <CopyValue variant="block" value={step.value} label={`${step.type} ${index + 1}`}>
                  <pre className="code-block">{step.value}</pre>
                </CopyValue>
              </div>
            ))}
            {preview.variables.length > 0 ? (
              <div>
                <div className="kicker" style={{ marginBottom: 7 }}>Variables</div>
                <dl className="detail-list">
                  {preview.variables.map((variable) => (
                    <div key={variable.name} style={{ display: "contents" }}>
                      <dt className="mono">
                        <CopyValue value={`{{ ${variable.name} }}`} label="variable placeholder">
                          {`{{ ${variable.name} }}`}
                        </CopyValue>
                      </dt>
                      <dd>
                        <CopyValue value={variable.default ?? variable.description} label={`${variable.name} value`}>
                          {variable.default || variable.description || "—"}
                        </CopyValue>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete runbook?"
          message={`${deleting.name} will be permanently removed.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
