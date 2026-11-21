"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/providers/app-providers";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import {
  DownloadIcon,
  FileIcon,
  PlusIcon,
  SectionEmpty,
  SectionHead,
  TrashIcon,
} from "@/components/ui/section";
import {
  ApiError,
  filesApi,
  getToken,
  type FileScope,
} from "@/lib/api";
import { errorMessage, fileSize, shortDate } from "@/lib/format";
import type { FileRecord } from "@/lib/types";

export function FileManager({ scope }: { scope: FileScope }) {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<FileRecord | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setFiles(await filesApi.list(scope));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [scope.kind, scope.kind === "project" ? scope.slug : scope.kind === "account" ? scope.id : ""]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load();
  }, [load]);

  async function download(file: FileRecord) {
    const url = filesApi.downloadUrl(scope, file);
    setDownloading(file.id);
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      },);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.original_name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (caught) {
      toast(errorMessage(caught), "error");
    } finally {
      setDownloading(null);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await filesApi.delete(scope, deleting.id);
      setFiles((current) => current.filter((item) => item.id !== deleting.id));
      toast("File deleted.");
    } catch (caught) {
      toast(errorMessage(caught), "error");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <div className="loading"><div><div className="spinner" />Loading files…</div></div>;
  if (error) return <div className="auth-error">{error}</div>;

  return (
    <>
      <section className="section-card">
        <SectionHead
          icon={<FileIcon />}
          title="Files"
          count={files.length}
          description="Documents and attachments"
          action={
            <button className="btn btn-accent btn-sm" onClick={() => setUploadOpen(true)}>
              <PlusIcon />
              Add file
            </button>
          }
        />

        {files.length === 0 ? (
          <SectionEmpty
            icon={<FileIcon />}
            title="No files yet"
            description="Keep contracts, diagrams, exports, and other project documents here."
          />
        ) : (
          <ul className="section-list">
            {files.map((file) => (
              <li className="section-row" key={file.id}>
                <span className="section-row-icon" aria-hidden="true"><FileIcon /></span>
                <div className="section-row-main">
                  <button
                    className="section-row-title"
                    onClick={() => void download(file)}
                    title={`Download ${file.original_name}`}
                  >
                    {file.title ?? file.original_name}
                  </button>
                  <div className="section-row-meta">
                    {file.title ? <span className="mono">{file.original_name}</span> : null}
                    <span>{fileSize(file.size)}</span>
                    <span>Added {shortDate(file.created_at)}</span>
                  </div>
                  {file.description ? <p className="section-row-note">{file.description}</p> : null}
                </div>
                <div className="section-row-actions">
                  <button
                    className="section-row-action"
                    onClick={() => void download(file)}
                    disabled={downloading === file.id}
                    title={downloading === file.id ? "Downloading…" : "Download"}
                    aria-label={`Download ${file.original_name}`}
                  >
                    <DownloadIcon />
                  </button>
                  <button
                    className="section-row-action is-danger"
                    onClick={() => setDeleting(file)}
                    title="Delete"
                    aria-label={`Delete ${file.original_name}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {uploadOpen ? (
        <UploadDialog
          scope={scope}
          onClose={() => setUploadOpen(false)}
          onUploaded={(file) => {
            setFiles((current) => [file, ...current]);
            setUploadOpen(false);
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete file?"
          message={`${deleting.original_name} will be removed from storage.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}

function UploadDialog({
  scope,
  onClose,
  onUploaded,
}: {
  scope: FileScope;
  onClose: () => void;
  onUploaded: (file: FileRecord) => void;
}) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setError("");
    setBusy(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", description);
    try {
      const saved = await filesApi.upload(scope, formData);
      toast("File uploaded.");
      onUploaded(saved);
    } catch (caught) {
      const fields = caught instanceof ApiError ? caught.fieldErrors : {};
      setError(Object.values(fields)[0] ?? errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Upload file"
      description="Up to 10 MB per file."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" form="upload-form" type="submit" disabled={busy}>
            {busy ? "Uploading…" : "Upload file"}
          </button>
        </>
      }
    >
      <form id="upload-form" className="stack" style={{ gap: 18 }} onSubmit={submit}>
        <div className="field">
          <label htmlFor="upload-file">Choose file</label>
          <input
            id="upload-file"
            className="input"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="upload-title">Title <span className="faint">(optional)</span></label>
          <input
            id="upload-title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="A friendly name"
          />
        </div>
        <div className="field">
          <label htmlFor="upload-description">Description <span className="faint">(optional)</span></label>
          <input
            id="upload-description"
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this file for?"
          />
        </div>
        {error ? <div className="auth-error" role="alert">{error}</div> : null}
      </form>
    </Modal>
  );
}
