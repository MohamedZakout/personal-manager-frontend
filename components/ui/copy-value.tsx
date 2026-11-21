"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

async function writeToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function CopyValue({
  value,
  children,
  label,
  variant = "inline",
  className = "",
}: {
  value: string | number | null | undefined;
  children?: ReactNode;
  label?: string;
  variant?: "inline" | "block";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  const text = value === null || value === undefined ? "—" : String(value);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await writeToClipboard(text);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be denied; the value stays visible on screen.
    }
  }

  if (variant === "block") {
    return (
      <span className={`copy-block ${className}`}>
        <span className="copy-block-content">{children ?? text}</span>
        <button
          type="button"
          className={`copy-block-button ${copied ? "copied" : ""}`}
          onClick={() => void copy()}
          aria-label={`Copy ${label ?? "value"}`}
          title={copied ? "Copied" : "Copy value"}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </span>
    );
  }

  return (
    <span className={`copy-value ${className}`}>
      <span className="copy-value-content">{children ?? text}</span>
      <button
        type="button"
        className={`copy-inline-button ${copied ? "copied" : ""}`}
        onClick={() => void copy()}
        aria-label={`Copy ${label ?? "value"}`}
        title={copied ? "Copied" : "Copy value"}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </span>
  );
}
