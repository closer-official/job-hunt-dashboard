import Link from 'next/link';
import { BarChart3, Clock3, FileText, LayoutDashboard } from 'lucide-react';

const nav = [
  { href: '/dashboard', label: '企業一覧', icon: LayoutDashboard },
  { href: '/compare', label: '比較', icon: BarChart3 },
  { href: '/history', label: '更新履歴', icon: Clock3 },
  { href: '/api/resume/pdf', label: '履歴書PDF', icon: FileText }
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/dashboard" className="brand">Job Hunt Dashboard</Link>
          <nav className="nav">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="nav-link" title={item.label}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <div className="container page-body">{children}</div>
    </main>
  );
}
