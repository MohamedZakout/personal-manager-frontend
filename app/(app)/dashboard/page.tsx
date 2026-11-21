"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/ui/page-head";
import { ResourceCard } from "@/components/ui/resource-card";
import { dashboardApi } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    dashboardApi
      .summary()
      .then((nextSummary) => {
        if (active) setSummary(nextSummary);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load the overview.");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <div className="auth-error">{error}</div>;
  }

  if (!summary) {
    return <div className="loading"><div><div className="spinner" />Reading your workspace…</div></div>;
  }

  const stats = [
    { label: "Active projects", value: summary.stats.projects, note: "In your workspace" },
    { label: "Accounts", value: summary.stats.accounts, note: "Provider connections" },
  ];

  return (
    <>
      <PageHead
        title="Overview"
        actions={
          <Link className="btn btn-accent" href="/projects">
            Open projects
          </Link>
        }
      />

      <div className="stat-strip">
        {stats.map((stat) => (
          <div className="stat" key={stat.label}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-note">{stat.note}</div>
          </div>
        ))}
      </div>

      <div className="stack">
        <section className="panel">
          <div className="panel-head">
            <h2 className="section-title">Recent projects</h2>
            <Link className="btn btn-ghost btn-sm" href="/projects">
              View all
            </Link>
          </div>
          {summary.recent_projects.length === 0 ? (
            <div className="panel-body muted">
              No projects yet. Create one to start keeping track of the work.
            </div>
          ) : (
            <div className="recent-card-grid">
              {summary.recent_projects.slice(0, 3).map((project) => (
                <ResourceCard
                  key={project.id}
                  name={project.name}
                  href={`/projects/${project.slug}`}
                  category={project.category ?? { name: "Uncategorised" }}
                  metrics={[
                    { label: "secrets", value: project.credentials_count ?? 0, icon: "key" },
                    { label: "file", value: project.files_count ?? 0, icon: "file" },
                    { label: "commands", value: project.commands_count ?? 0, icon: "commands" },
                  ]}
                />
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="section-title">Recent accounts</h2>
            <Link className="btn btn-ghost btn-sm" href="/accounts">
              View all
            </Link>
          </div>
          {summary.recent_accounts.length === 0 ? (
            <div className="panel-body muted">
              No accounts yet. Add the services you work with to keep their details close.
            </div>
          ) : (
            <div className="recent-card-grid">
              {summary.recent_accounts.slice(0, 3).map((account) => (
                <ResourceCard
                  key={account.id}
                  name={account.name}
                  href={`/accounts/${account.id}`}
                  category={account.category ?? { name: account.provider_label }}
                  metrics={[
                    { label: "secrets", value: account.credentials_count ?? 0, icon: "key" },
                    { label: "file", value: account.files_count ?? 0, icon: "file" },
                    { label: "commands", value: account.commands_count ?? 0, icon: "commands" },
                  ]}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
