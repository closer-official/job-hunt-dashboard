import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard-shell';
import { getCompanies, statusLabels } from '@/lib/companies';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const companies = await getCompanies();
  const grouped = Object.entries(statusLabels).map(([status, label]) => ({
    status,
    label,
    companies: companies.filter((company) => company.status === status)
  }));

  return (
    <DashboardShell>
      <section className="section-head">
        <div>
          <p className="eyebrow">Decision view</p>
          <h1>企業一覧</h1>
        </div>
        <p className="muted">初期表示は意思決定に必要な情報だけを出し、詳細側に全情報を保持します。</p>
      </section>

      <div className="status-grid">
        {grouped.map((group) => (
          <section key={group.status} className="status-column">
            <h2>{group.label}</h2>
            {group.companies.length === 0 ? <p className="empty">該当なし</p> : null}
            {group.companies.map((company) => (
              <Link key={company.id} href={`/companies/${company.slug}`} className="company-card">
                <div className="card-row">
                  <strong>{company.name}</strong>
                  <span className="score">{company.grade} / {company.score}</span>
                </div>
                <p>{company.headline}</p>
                <span className="fit">{company.roleFit}</span>
              </Link>
            ))}
          </section>
        ))}
      </div>
    </DashboardShell>
  );
}
