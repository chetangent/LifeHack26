import Link from "next/link";
import { PageTransition } from "@/components/page-transition";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition>
      <div className="app-layout">
        <header className="topbar">
          <Link className="brand" href="/">
            <span>AgentShelf</span>
          </Link>
          <nav className="topbar-nav" aria-label="Primary navigation">
            <Link href="/">Overview</Link>
            <Link href="/catalog">Catalog setup</Link>
            <Link href="/optimize">Optimize a SKU</Link>
            <Link href="/evidence">Evidence lab</Link>
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
