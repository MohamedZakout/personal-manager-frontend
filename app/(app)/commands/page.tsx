"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/providers/app-providers";
import { CommandManager } from "@/components/managers/command-manager";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { PageHead } from "@/components/ui/page-head";
import { ApiError, commandsApi } from "@/lib/api";
import { errorMessage, shortDate } from "@/lib/format";
import type { Command, CommandFolder } from "@/lib/types";

function FolderDialog({
  folder,
  onClose,
  onSaved,
}: {
  folder: CommandFolder | null;
  onClose: () => void;
  onSaved: (folder: CommandFolder) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(folder?.name ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = folder
        ? await commandsApi.updateFolder(folder.id, name)
        : await commandsApi.createFolder(name);
      onSaved(saved);
      toast(folder ? "Folder renamed." : "Folder created.");
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
      title={folder ? "Rename folder" : "New folder"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" form="folder-form" type="submit" disabled={busy}>
            {busy ? "Saving…" : folder ? "Save changes" : "Create folder"}
          </button>
        </>
      }
    >
      <form id="folder-form" onSubmit={submit} className="field">
        <label htmlFor="folder-name">Folder name</label>
        <input
          id="folder-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Deployment"
          required
        />
        {error ? <div className="auth-error">{error}</div> : null}
      </form>
    </Modal>
  );
}

export default function CommandsPage() {
  const { toast } = useToast();
  const [commands, setCommands] = useState<Command[] | null>(null);
  const [folders, setFolders] = useState<CommandFolder[]>([]);
  const [error, setError] = useState("");
  const [folderDialog, setFolderDialog] = useState<CommandFolder | "new" | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<CommandFolder | null>(null);

  const load = useCallback(async () => {
    try {
      const library = await commandsApi.library();
      setCommands(library.commands);
      setFolders(library.folders);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function removeFolder() {
    if (!deletingFolder) return;
    try {
      await commandsApi.deleteFolder(deletingFolder.id);
      setFolders((current) => current.filter((item) => item.id !== deletingFolder.id));
      toast("Folder deleted. Its runbooks are now unfiled.");
    } catch (caught) {
      toast(errorMessage(caught), "error");
    } finally {
      setDeletingFolder(null);
    }
  }

  if (error) return <div className="auth-error">{error}</div>;
  if (!commands) return <div className="loading"><div><div className="spinner" />Loading command library…</div></div>;

  return (
    <>
      <PageHead
        title="Commands"
        actions={
          <button className="btn btn-outline" onClick={() => setFolderDialog("new")}>
            New folder
          </button>
        }
      />

      <div className="grid-two" style={{ gridTemplateColumns: "minmax(260px, 0.6fr) minmax(0, 1.7fr)" }}>
        <section className="panel">
          <div className="panel-head">
            <h2 className="section-title">Folders</h2>
            <span className="mono muted">{folders.length}</span>
          </div>
          {folders.length === 0 ? (
            <div className="panel-body muted" style={{ fontSize: "0.85rem" }}>
              No folders yet. Folders keep related runbooks together.
            </div>
          ) : (
            <table className="data-table">
              <tbody>
                {folders.map((folder) => (
                  <tr key={folder.id}>
                    <td>
                      <span className="cell-title">{folder.name}</span>
                      <div className="cell-sub">Added {shortDate(folder.created_at)}</div>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setFolderDialog(folder)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeletingFolder(folder)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <CommandManager
          scope={{ kind: "library" }}
          commands={commands}
          folders={folders}
          onCommandsChange={setCommands}
        />
      </div>

      {folderDialog ? (
        <FolderDialog
          folder={folderDialog === "new" ? null : folderDialog}
          onClose={() => setFolderDialog(null)}
          onSaved={(saved) =>
            setFolders((current) =>
              current.some((item) => item.id === saved.id)
                ? current.map((item) => (item.id === saved.id ? saved : item))
                : [...current, saved],
            )
          }
        />
      ) : null}

      {deletingFolder ? (
        <ConfirmDialog
          title="Delete folder?"
          message={`${deletingFolder.name} will be removed. Runbooks inside it stay available.`}
          confirmLabel="Delete folder"
          onConfirm={removeFolder}
          onClose={() => setDeletingFolder(null)}
        />
      ) : null}
    </>
  );
}
