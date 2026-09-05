import { DashboardShell } from '@/components/dashboard-shell';
import { getCompanyUpdates } from '@/lib/companies';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const updates = await getCompanyUpdates();

  return (
    <DashboardShell>
      <section className="section-head">
        <div>
          <p className="eyebrow">Change log</p>
          <h1>更新履歴</h1>
        </div>
      </section>
      <div className="timeline">
        {updates.map((update) => (
          <article key={update.id} className="timeline-item">
            <time>{update.createdAt}</time>
            <div>
              <strong>{update.companyName}</strong>
              <p>{update.summary}</p>
              {update.newScore ? <p className="muted">適合度: {update.newScore}/100</p> : null}
            </div>
          </article>
        ))}
        {updates.length === 0 ? <p className="empty">更新履歴はまだありません。</p> : null}
      </div>
    </DashboardShell>
  );
}
