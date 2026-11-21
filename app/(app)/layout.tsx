import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="loading">
          <div>
            <div className="spinner" />
            Loading workspace…
          </div>
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
