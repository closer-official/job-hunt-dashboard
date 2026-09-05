import { DashboardShell } from '@/components/dashboard-shell';
import { companies } from '@/lib/mock-data';

export default function HistoryPage() {
  return (
    <DashboardShell>
      <section className="section-head">
        <div>
          <p className="eyebrow">Change log</p>
          <h1>更新履歴</h1>
        </div>
      </section>
      <div className="timeline">
        {companies.map((company) => (
          <article key={company.id} className="timeline-item">
            <time>{company.updatedAt}</time>
            <div>
              <strong>{company.name}</strong>
              <p>初期評価データを登録しました。</p>
            </div>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
