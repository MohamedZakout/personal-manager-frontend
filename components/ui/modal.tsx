"use client";

import { useEffect, type ReactNode } from "react";

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  icon?: ReactNode;
  className?: string;
};

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  wide,
  icon,
  className,
}: ModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""} ${className ?? ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div className="modal-head-copy">
            {icon ? (
              <span className="modal-head-icon" aria-hidden="true">{icon}</span>
            ) : null}
            <div>
              <h2>{title}</h2>
              {description ? <p className="modal-description">{description}</p> : null}
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="panel-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
