"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/providers/app-providers";
import { BrandIcon } from "@/components/ui/brand-icon";
import { initials } from "@/lib/format";

type NavItem = { href: string; label: string; icon: ReactNode };
type NavSection = { label: string; adminOnly?: boolean; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      {
        href: "/dashboard",
        label: "Overview",
        icon: (
          <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" />
        ),
      },
      {
        href: "/projects",
        label: "Projects",
        icon: <path d="M3 7h7l2 2h9v10H3V7Z" />,
      },
      {
        href: "/accounts",
        label: "Accounts",
        icon: (
          <>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
          </>
        ),
      },
    ],
  },
  {
    label: "Library",
    items: [
      {
        href: "/commands",
        label: "Commands",
        icon: <path d="m5 7 5 5-5 5m8 0h7" />,
      },
      {
        href: "/files",
        label: "Files",
        icon: <path d="M6 3h8l4 4v14H6V3Zm8 0v4h4" />,
      },
      {
        href: "/categories",
        label: "Categories",
        icon: (
          <>
            <path d="M4 5h6v6H4V5Zm10 0h6v6h-6V5ZM4 15h6v5H4v-5Zm10 0h6v5h-6v-5Z" />
          </>
        ),
      },
    ],
  },
  {
    label: "Administration",
    adminOnly: true,
    items: [
      {
        href: "/users",
        label: "Users",
        icon: (
          <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6m1-15a3 3 0 0 1 0 6m2 3c2.5.6 4 2.6 4 5" />
          </>
        ),
      },
    ],
  },
  {
    label: "Preferences",
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
          </>
        ),
      },
    ],
  },
];

function currentLabel(pathname: string): string {
  if (pathname === "/dashboard") return "Overview";
  const segment = pathname.split("/").filter(Boolean)[0] ?? "Overview";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="loading">
        <div>
          <div className="spinner" />
          Loading workspace…
        </div>
      </div>
    );
  }

  const sections = NAV_SECTIONS.filter(
    (section) => !section.adminOnly || user.role === "admin",
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">
            <BrandIcon />
          </span>
          <span className="brand-name">Personal Manager</span>
        </Link>

        <nav aria-label="Main navigation" className="nav-sections">
          {sections.map((section) => (
            <div className="nav-section" key={section.label}>
              <div className="nav-label">{section.label}</div>
              <ul className="nav-list">
                {section.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`nav-link ${active ? "active" : ""}`}
                        aria-current={active ? "page" : undefined}
                      >
                        <svg
                          className="nav-glyph"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          {item.icon}
                        </svg>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <span className="avatar">{initials(user.name)}</span>
            <span className="sidebar-user-info">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-mail" title={user.email}>
                {user.email}
              </span>
            </span>
          </div>
          <button className="signout" onClick={() => void logout().then(() => router.replace("/login"))}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <div className="crumb">
            <span>Personal Manager</span>
            <span>/</span>
            <b>{currentLabel(pathname)}</b>
          </div>
          <div className="topbar-right">
            <span className="connection">
              <span className="live-dot" />
              API connected
            </span>
            <span className="badge">{user.role_label}</span>
          </div>
        </div>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
