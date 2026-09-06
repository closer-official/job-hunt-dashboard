import { notFound } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { isOwnerEmail } from '@/lib/auth';
import { getCompany, statusLabels } from '@/lib/companies';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function textList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

type ApplicationAnswer = {
  label: string;
  answer: string;
};

type ApplicationForm = {
  system: string;
  source: string;
  note: string;
  answers: ApplicationAnswer[];
};

function isBOrAbove(grade: string) {
  return grade === 'A' || grade.toUpperCase().includes('B');
}

function applicationForm(value: unknown): ApplicationForm | null {
  if (!value || typeof value !== 'object') return null;
  const form = value as Record<string, unknown>;
  const answers = Array.isArray(form.answers)
    ? form.answers.filter((item): item is ApplicationAnswer => {
        if (!item || typeof item !== 'object') return false;
        const answer = item as Record<string, unknown>;
        return typeof answer.label === 'string' && typeof answer.answer === 'string';
      })
    : [];

  if (answers.length === 0) return null;
  return {
    system: textValue(form.system) || '応募フォーム',
    source: textValue(form.source) || '採用ページ',
    note: textValue(form.note),
    answers
  };
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany(decodeURIComponent(id));
  if (!company) notFound();

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const canSeePersonal = isOwnerEmail(data.user?.email);
  const research = company.fullResearch;
  const nextActions = textList(research.next_actions);
  const links = textList(research.links);
  const selection = textValue(research.selection);
  const compensation = textValue(research.compensation);
  const fitReason = textValue(research.fit_reason);
  const memo = textValue(research.memo);
  const form = applicationForm(research.application_form);
  const showApplicationPrep = canSeePersonal && isBOrAbove(company.grade);

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

      {showApplicationPrep ? (
        <section className="research-note prep-section">
          <div className="prep-header">
            <div>
              <h2>応募準備</h2>
              <p className="form-meta">B判定以上の会社だけ、本人ログイン時に表示します。</p>
            </div>
            <a className="primary-action small-action" href={`/api/companies/${company.slug}/resume/pdf`} target="_blank" rel="noreferrer">
              会社別履歴書PDF
            </a>
          </div>

          {form ? (
            <div className="application-form">
              <p className="form-meta">{form.system} / {form.source}</p>
              {form.note ? <p className="form-meta">{form.note}</p> : null}
              <dl className="answer-list">
                {form.answers.map((item) => (
                  <div className="answer-item" key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p className="muted">応募フォーム回答例は未作成です。HRMOS / HERP などのフォーム確認後にここへ追加します。</p>
          )}
        </section>
      ) : null}
    </DashboardShell>
  );
}
