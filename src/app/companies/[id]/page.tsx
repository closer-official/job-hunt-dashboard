import { notFound } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { getCompany, statusLabels } from '@/lib/companies';

export const dynamic = 'force-dynamic';

function textList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany(decodeURIComponent(id));
  if (!company) notFound();

  const research = company.fullResearch;
  const nextActions = textList(research.next_actions);
  const links = textList(research.links);
  const selection = textValue(research.selection);
  const compensation = textValue(research.compensation);
  const fitReason = textValue(research.fit_reason);
  const memo = textValue(research.memo);

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

      <section className="detail-grid detail-extra">
        <div>
          <h2>次アクション</h2>
          {nextActions.length > 0 ? <ul>{nextActions.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">未設定</p>}
        </div>
        <div>
          <h2>選考・待遇</h2>
          {selection ? <p>{selection}</p> : null}
          {compensation ? <p>{compensation}</p> : null}
          {!selection && !compensation ? <p className="muted">未確認</p> : null}
        </div>
        <div>
          <h2>本人適合の理由</h2>
          <p>{fitReason || company.roleFit}</p>
        </div>
        <div>
          <h2>リンク</h2>
          {links.length > 0 ? (
            <ul>{links.map((item) => <li key={item}><a href={item} target="_blank" rel="noreferrer">{item}</a></li>)}</ul>
          ) : (
            <p className="muted">未設定</p>
          )}
        </div>
      </section>

      {memo ? (
        <section className="research-note">
          <h2>詳細メモ</h2>
          <p>{memo}</p>
        </section>
      ) : null}
    </DashboardShell>
  );
}
