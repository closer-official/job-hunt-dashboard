import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { DashboardShell } from '@/components/dashboard-shell';
import { isOwnerEmail } from '@/lib/auth';
import { getCompany, statusLabels } from '@/lib/companies';
import { buildRewritePrompt, motivationPipeline, pipelineStatus, researchFieldLabels } from '@/lib/motivation-pipeline';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function textList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function rowsToText(value: unknown) {
  if (!Array.isArray(value)) return '';
  return value.map((item) => {
    if (!item || typeof item !== 'object') return '';
    const row = item as Record<string, unknown>;
    return [textValue(row.year), textValue(row.month), textValue(row.text)].filter(Boolean).join(' ');
  }).filter(Boolean).join('\n');
}

function textToRows(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d{4})[\s/年-]*(\d{1,2})?[月\s]*(.*)$/);
      if (!match) return { year: '', month: '', text: line };
      return { year: match[1] ?? '', month: match[2] ?? '', text: (match[3] || line).trim() };
    });
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
  const rawAnswers = Array.isArray(form.answers) ? form.answers : Array.isArray(form.fields) ? form.fields : [];
  const answers = rawAnswers
    ? rawAnswers.filter((item): item is ApplicationAnswer => {
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

async function approveMotivation(formData: FormData) {
  'use server';

  const slug = String(formData.get('slug') ?? '');
  if (!slug) return;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!isOwnerEmail(data.user?.email)) return;

  const company = await getCompany(slug);
  if (!company) return;

  const pipeline = motivationPipeline(company.fullResearch.motivation_pipeline);
  const status = pipelineStatus(pipeline);
  if (!status.canApprove || !pipeline.draft?.trim()) return;

  const nextResearch = {
    ...company.fullResearch,
    resume_motivation: pipeline.draft.trim(),
    motivation_pipeline: {
      ...pipeline,
      review_status: 'approved',
      confirmed_at: new Date().toISOString(),
      confirmed_by: data.user?.email ?? ''
    }
  };

  await supabase
    .from('companies')
    .update({ full_research: nextResearch, updated_at: new Date().toISOString() })
    .eq('slug', slug);

  await supabase
    .from('company_updates')
    .insert({
      company_id: company.id,
      summary: '志望動機生成パイプラインの本人確認が完了し、会社別履歴書PDFへの反映を許可しました。',
      previous_score: company.score,
      new_score: company.score,
      source_note: '志望動機生成ゲート'
    });

  revalidatePath(`/companies/${slug}`);
}

async function rejectMotivation(formData: FormData) {
  'use server';

  const slug = String(formData.get('slug') ?? '');
  if (!slug) return;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!isOwnerEmail(data.user?.email)) return;

  const company = await getCompany(slug);
  if (!company) return;

  const pipeline = motivationPipeline(company.fullResearch.motivation_pipeline);
  const rewritePrompt = buildRewritePrompt(company.name, pipeline);
  const nextResearch = {
    ...company.fullResearch,
    motivation_pipeline: {
      ...pipeline,
      review_status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_by: data.user?.email ?? '',
      rewrite_prompt: rewritePrompt
    }
  };

  await supabase
    .from('companies')
    .update({ full_research: nextResearch, updated_at: new Date().toISOString() })
    .eq('slug', slug);

  await supabase
    .from('company_updates')
    .insert({
      company_id: company.id,
      summary: '志望動機ドラフトが不承認になり、Claudeリライト用プロンプトを作成しました。',
      previous_score: company.score,
      new_score: company.score,
      source_note: '志望動機生成ゲート'
    });

  revalidatePath(`/companies/${slug}`);
}

async function applyRewrittenMotivation(formData: FormData) {
  'use server';

  const slug = String(formData.get('slug') ?? '');
  const rewrittenMotivation = String(formData.get('rewrittenMotivation') ?? '').trim();
  if (!slug || !rewrittenMotivation) return;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!isOwnerEmail(data.user?.email)) return;

  const company = await getCompany(slug);
  if (!company) return;

  const pipeline = motivationPipeline(company.fullResearch.motivation_pipeline);
  const nextResearch = {
    ...company.fullResearch,
    resume_motivation: rewrittenMotivation,
    motivation_pipeline: {
      ...pipeline,
      draft: rewrittenMotivation,
      review_status: 'approved',
      confirmed_at: new Date().toISOString(),
      confirmed_by: data.user?.email ?? ''
    }
  };

  await supabase
    .from('companies')
    .update({ full_research: nextResearch, updated_at: new Date().toISOString() })
    .eq('slug', slug);

  await supabase
    .from('company_updates')
    .insert({
      company_id: company.id,
      summary: 'リライト後の志望動機を会社別履歴書PDFに反映しました。',
      previous_score: company.score,
      new_score: company.score,
      source_note: '履歴書PDF反映'
    });

  revalidatePath(`/companies/${slug}`);
  redirect(`/api/companies/${slug}/resume/pdf`);
}

async function saveResumeOverrides(formData: FormData) {
  'use server';

  const slug = String(formData.get('slug') ?? '');
  if (!slug) return;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!isOwnerEmail(data.user?.email)) return;

  const company = await getCompany(slug);
  if (!company) return;

  const currentOverrides = objectValue(company.fullResearch.resume_overrides);
  const nextOverrides: Record<string, unknown> = { ...currentOverrides };
  const textFields = [
    'name',
    'nameKana',
    'birthDate',
    'gender',
    'postalCode',
    'address',
    'addressKana',
    'phone',
    'email',
    'commute',
    'dependents',
    'spouse',
    'spouseSupport'
  ];

  textFields.forEach((field) => {
    const value = String(formData.get(field) ?? '').trim();
    if (value) nextOverrides[field] = value;
  });

  const historyText = String(formData.get('history') ?? '').trim();
  if (historyText) nextOverrides.history = textToRows(historyText);

  const licenseText = String(formData.get('licenses') ?? '').trim();
  if (licenseText) nextOverrides.licenses = textToRows(licenseText);

  const nextResearch = {
    ...company.fullResearch,
    resume_overrides: nextOverrides
  };

  await supabase
    .from('companies')
    .update({ full_research: nextResearch, updated_at: new Date().toISOString() })
    .eq('slug', slug);

  await supabase
    .from('company_updates')
    .insert({
      company_id: company.id,
      summary: '会社別履歴書の手動編集内容を保存しました。',
      previous_score: company.score,
      new_score: company.score,
      source_note: '履歴書編集'
    });

  revalidatePath(`/companies/${slug}`);
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany(decodeURIComponent(id));
  if (!company) notFound();

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const canSeePersonal = isOwnerEmail(data.user?.email);
  const { data: profileRow } = canSeePersonal && data.user?.id
    ? await supabase
        .from('resume_profiles')
        .select('profile')
        .eq('owner_user_id', data.user.id)
        .maybeSingle()
    : { data: null };
  const research = company.fullResearch;
  const profile = objectValue(profileRow?.profile);
  const overrides = objectValue(research.resume_overrides);
  const resumeText = (key: string) => textValue(overrides[key]) || textValue(profile[key]);
  const commute = objectValue(research.commute);
  const googleMapsDestination = textValue(research.company_address) || textValue(research.office_address) || textValue(commute.destination);
  const googleMapsUrl = resumeText('address') && googleMapsDestination
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(resumeText('address'))}&destination=${encodeURIComponent(googleMapsDestination)}&travelmode=transit`
    : '';
  const nextActions = textList(research.next_actions);
  const links = textList(research.links);
  const selection = textValue(research.selection);
  const compensation = textValue(research.compensation);
  const fitReason = textValue(research.fit_reason);
  const memo = textValue(research.memo);
  const form = applicationForm(research.application_form);
  const showApplicationPrep = canSeePersonal && isBOrAbove(company.grade);
  const motivation = motivationPipeline(research.motivation_pipeline);
  const motivationStatus = pipelineStatus(motivation);
  const researchEntries = Object.entries(researchFieldLabels) as [keyof typeof researchFieldLabels, string][];

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

          <div className="pipeline-box">
            <div className="pipeline-head">
              <div>
                <h3>志望動機生成ゲート</h3>
                <p className="form-meta">{motivationStatus.description}</p>
              </div>
              <span className={`pipeline-badge ${motivationStatus.canUseDraft ? 'ok' : motivationStatus.canApprove ? 'wait' : 'stop'}`}>
                {motivationStatus.label}
              </span>
            </div>
            <dl className="answer-list">
              {researchEntries.map(([field, label]) => {
                const value = motivation.research?.[field];
                const isMissing = typeof value !== 'string' || !value.trim();
                return (
                  <div className="answer-item" key={field}>
                    <dt>{label}</dt>
                    <dd className={isMissing ? 'missing-field' : ''}>
                      {isMissing ? '未取得' : field === 'source_url' ? <a href={value} target="_blank" rel="noreferrer">{value}</a> : value}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {motivation.draft ? (
              <div className="draft-box">
                <h4>志望動機ドラフト</h4>
                <p>{motivation.draft}</p>
              </div>
            ) : null}
            {motivationStatus.canApprove ? (
              <div className="action-row">
                <form action={approveMotivation}>
                  <input type="hidden" name="slug" value={company.slug} />
                  <button className="primary-action small-action" type="submit">承認してPDFに反映</button>
                </form>
                <form action={rejectMotivation}>
                  <input type="hidden" name="slug" value={company.slug} />
                  <button className="secondary-action small-action" type="submit">不承認: Claude指示を作る</button>
                </form>
              </div>
            ) : null}
            {motivation.rewrite_prompt ? (
              <label className="field-block">
                Claudeリライト指示プロンプト
                <textarea readOnly rows={12} defaultValue={motivation.rewrite_prompt} />
              </label>
            ) : null}
            <form className="stack-form" action={applyRewrittenMotivation}>
              <input type="hidden" name="slug" value={company.slug} />
              <label className="field-block">
                リライト後の志望動機を貼り付け
                <textarea name="rewrittenMotivation" rows={8} defaultValue={motivation.draft ?? ''} />
              </label>
              <button className="primary-action small-action" type="submit">貼り付け内容を反映してPDF出力</button>
            </form>
          </div>

          <details className="pipeline-box resume-edit-box">
            <summary>履歴書項目を編集</summary>
            <form className="resume-edit-form" action={saveResumeOverrides}>
              <input type="hidden" name="slug" value={company.slug} />
              <div className="form-grid">
                <label>氏名<input name="name" defaultValue={resumeText('name')} /></label>
                <label>ふりがな<input name="nameKana" defaultValue={resumeText('nameKana')} /></label>
                <label>生年月日<input name="birthDate" defaultValue={resumeText('birthDate')} /></label>
                <label>性別<input name="gender" defaultValue={resumeText('gender')} /></label>
                <label>郵便番号<input name="postalCode" defaultValue={resumeText('postalCode')} /></label>
                <label>電話番号<input name="phone" defaultValue={resumeText('phone')} /></label>
                <label>E-mail<input name="email" defaultValue={resumeText('email') || data.user?.email || ''} /></label>
                <label>通勤時間（Googleマップ確認値）<input name="commute" defaultValue={resumeText('commute')} placeholder="例: 約1時間20分" /></label>
                <label>扶養家族数<input name="dependents" defaultValue={resumeText('dependents')} /></label>
                <label>配偶者<input name="spouse" defaultValue={resumeText('spouse')} /></label>
                <label>配偶者の扶養義務<input name="spouseSupport" defaultValue={resumeText('spouseSupport')} /></label>
              </div>
              <label className="field-block">現住所<input name="address" defaultValue={resumeText('address')} /></label>
              <label className="field-block">現住所ふりがな<input name="addressKana" defaultValue={resumeText('addressKana')} /></label>
              {googleMapsUrl ? (
                <a className="secondary-action small-action map-action" href={googleMapsUrl} target="_blank" rel="noreferrer">
                  Googleマップで職場までの経路を確認
                </a>
              ) : (
                <p className="form-meta">会社住所が未取得のため、通勤時間はGoogleマップ確認後に手入力してください。</p>
              )}
              <label className="field-block">
                学歴・職歴
                <textarea name="history" rows={8} defaultValue={rowsToText(overrides.history) || rowsToText(profile.history)} />
              </label>
              <label className="field-block">
                免許・資格
                <textarea name="licenses" rows={5} defaultValue={rowsToText(overrides.licenses) || rowsToText(profile.licenses)} />
              </label>
              <button className="primary-action small-action" type="submit">編集内容を保存</button>
            </form>
          </details>

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
