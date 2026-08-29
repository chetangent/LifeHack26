"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageTransition } from "@/components/page-transition";

const navigation = [
  { href: "/", label: "Overview" },
  { href: "/catalog", label: "Catalog setup" },
  { href: "/optimize", label: "Optimize a SKU" },
  { href: "/evidence", label: "Evidence lab" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <PageTransition>
      <div className="app-layout">
        <header className="topbar">
          <Link className="brand" href="/">
            <span>AgentShelf</span>
          </Link>
          <nav className="topbar-nav" aria-label="Primary navigation">
            {navigation.map((item) => {
              const isCurrent = pathname === item.href;
              return <Link aria-current={isCurrent ? "page" : undefined} className={isCurrent ? "is-current" : undefined} href={item.href} key={item.href}>{item.label}</Link>;
            })}
          </nav>
          <div className="topbar-status">
            <span className="status-dot" /> Demo workspace ready
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </PageTransition>
  );
}
