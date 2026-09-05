import { notFound } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { companies, statusLabels } from '@/lib/mock-data';

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const company = companies.find((item) => item.id === params.id);
  if (!company) notFound();

  return (
    <DashboardShell>
      <section className="detail-head">
        <div>
          <p className="eyebrow">{statusLabels[company.status]}</p>
          <h1>{company.name}</h1>
          <p>{company.headline}</p>
        </div>
        <div className="score-box">
          <span>{company.grade}</span>
          <strong>{company.score}</strong>
        </div>
      </section>

      <section className="detail-grid">
        <div>
          <h2>重要ポイント</h2>
          <ul>{company.highlights.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h2>確認リスク</h2>
          <ul>{company.risks.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </section>
    </DashboardShell>
  );
}
