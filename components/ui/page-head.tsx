import type { ReactNode } from "react";

export function PageHead({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <h1 className="page-title">{title}</h1>
      {actions ? <div className="page-head-actions">{actions}</div> : null}
    </header>
  );
}
