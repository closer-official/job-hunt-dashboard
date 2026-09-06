import type { Company } from '@/lib/companies';
import { approvedResumeMotivation, motivationPipeline, pipelineStatus } from '@/lib/motivation-pipeline';

type ResumeRow = {
  year: string;
  month: string;
  text: string;
  align?: 'left' | 'center' | 'right';
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function text(profile: Record<string, unknown>, key: string, fallback = '') {
  const value = profile[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function arrayRows(value: unknown): ResumeRow[] {
  if (!Array.isArray(value)) return [];
  const rows: ResumeRow[] = [];
  value.forEach((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      rows.push({
        year: typeof row.year === 'string' ? row.year : '',
        month: typeof row.month === 'string' ? row.month : '',
        text: typeof row.text === 'string' ? row.text : '',
        align: row.align === 'center' || row.align === 'right' ? row.align : 'left'
      });
      return null;
    });
  return rows;
}

function dateParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return match ? { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) } : { year: '', month: '', day: '' };
}

function ageFromBirthDate(value: string) {
  const parts = dateParts(value);
  if (!parts.year || !parts.month || !parts.day) return '';
  const birth = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return Number.isFinite(age) ? String(age) : '';
}

function padRows(rows: ResumeRow[], count: number) {
  return [...rows, ...Array.from({ length: count }, () => ({ year: '', month: '', text: '' } as ResumeRow))].slice(0, count);
}

function historyRows(profile: Record<string, unknown>) {
  const saved = arrayRows(profile.history);
  if (saved.length > 0) return padRows(saved, 14);
  const school = text(profile, 'school');
  const primaryExperience = text(profile, 'primary_experience');
  const secondaryExperience = text(profile, 'secondary_experience');

  const rows: ResumeRow[] = [
    { year: '', month: '', text: '学　歴', align: 'center' },
    school ? { year: '', month: '', text: `${school} 在学中` } : { year: '', month: '', text: '' },
    { year: '', month: '', text: '職　歴', align: 'center' },
    primaryExperience ? { year: '', month: '', text: primaryExperience } : { year: '', month: '', text: '' },
    secondaryExperience ? { year: '', month: '', text: secondaryExperience } : { year: '', month: '', text: '' },
    { year: '', month: '', text: '以上', align: 'right' }
  ];

  return padRows(rows, 14);
}

function licenseRows(profile: Record<string, unknown>) {
  const saved = arrayRows(profile.licenses);
  if (saved.length > 0) return padRows(saved, 7);
  return padRows([{ year: '', month: '', text: '特になし' }], 7);
}

function motivation(profile: Record<string, unknown>, company: Company) {
  const research = company.fullResearch;
  const approved = approvedResumeMotivation(research);
  if (approved) {
    return approved;
  }

  const status = pipelineStatus(motivationPipeline(research.motivation_pipeline));
  return [
    '志望動機は本人確認待ちです。',
    `現在の状態: ${status.label}`,
    '提出前に企業詳細ページの「志望動機生成ゲート」で、一次情報と本人経歴の接続を確認してください。'
  ].join('\n');
}

function desiredText(company: Company) {
  return [
    '貴社規定に従います。',
    `希望職種: PdM、プロダクト企画、新規事業開発、事業企画に近い役割を希望します。`,
    `応募先: ${company.name}`
  ].join('\n');
}

function rowsHtml(rows: ResumeRow[]) {
  return rows.map((row) => (
    `<tr><td class="year">${escapeHtml(row.year)}</td><td class="month">${escapeHtml(row.month)}</td><td class="${row.align === 'center' ? 'center' : row.align === 'right' ? 'right' : ''}">${escapeHtml(row.text)}</td></tr>`
  )).join('');
}

export function buildJisResumeHtml(profile: Record<string, unknown>, company: Company, userEmail: string) {
  const today = new Date();
  const birth = dateParts(text(profile, 'birthDate'));
  const photo = text(profile, 'photoDataUrl');
  const email = userEmail || text(profile, 'email');
  const name = text(profile, 'name');

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>履歴書_${escapeHtml(company.slug)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap');
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #111; font-family: "Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif; }
    .page { width: 210mm; height: 297mm; padding: 14mm 13mm; page-break-after: always; background: #fff; }
    .page:last-child { page-break-after: auto; }
    .head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 3mm; }
    h1 { margin: 0; font-size: 24px; letter-spacing: 0.45em; border-bottom: 2px solid #111; padding-left: 4mm; }
    .date { font-size: 12px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #111; padding: 1.6mm 2mm; vertical-align: middle; font-size: 11px; line-height: 1.45; word-break: break-word; }
    th { background: #f5f5f5; font-weight: 700; text-align: center; }
    .label { width: 22mm; background: #f5f5f5; text-align: center; font-weight: 700; }
    .name { font-size: 22px; font-weight: 700; letter-spacing: 0.12em; }
    .photoCell { width: 36mm; text-align: center; padding: 2mm; }
    .photo { width: 30mm; height: 40mm; margin: 0 auto; border: 1px dashed #777; display: flex; align-items: center; justify-content: center; text-align: center; color: #777; font-size: 9px; overflow: hidden; }
    .photo img { width: 100%; height: 100%; object-fit: cover; }
    .sectionTitle { margin: 4mm 0 1.5mm; font-size: 12px; font-weight: 700; letter-spacing: 0.25em; }
    .history td, .license td { height: 9.5mm; }
    .year { width: 16mm; text-align: center; }
    .month { width: 11mm; text-align: center; }
    .center { text-align: center; }
    .right { text-align: right; }
    .largeBox td { height: 42mm; vertical-align: top; white-space: pre-wrap; padding: 3mm; font-size: 11px; line-height: 1.55; }
    .requestBox td { height: 32mm; vertical-align: top; white-space: pre-wrap; padding: 3mm; font-size: 11px; line-height: 1.55; }
    .compact td { height: 14mm; text-align: center; }
    .note { margin-top: 3mm; font-size: 9px; color: #444; line-height: 1.45; }
  </style>
</head>
<body>
  <section class="page">
    <div class="head">
      <h1>履 歴 書</h1>
      <div class="date">${today.getFullYear()}年 ${today.getMonth() + 1}月 ${today.getDate()}日現在</div>
    </div>
    <table>
      <tr>
        <td class="label">ふりがな</td>
        <td>${escapeHtml(text(profile, 'nameKana'))}</td>
        <td class="photoCell" rowspan="4"><div class="photo">${photo ? `<img src="${escapeHtml(photo)}" alt="証明写真" />` : '写真貼付位置<br>横30mm 縦40mm'}</div></td>
      </tr>
      <tr><td class="label">氏 名</td><td class="name">${escapeHtml(name)}</td></tr>
      <tr><td class="label">生年月日</td><td>${escapeHtml(birth.year)}年 ${escapeHtml(birth.month)}月 ${escapeHtml(birth.day)}日生（満 ${escapeHtml(ageFromBirthDate(text(profile, 'birthDate')))} 歳）</td></tr>
      <tr><td class="label">性 別</td><td>${escapeHtml(text(profile, 'gender'))}</td></tr>
    </table>
    <table style="margin-top: 3mm;">
      <tr><td class="label">ふりがな</td><td colspan="2">${escapeHtml(text(profile, 'addressKana'))}</td></tr>
      <tr><td class="label">現住所</td><td colspan="2">〒 ${escapeHtml(text(profile, 'postalCode'))}<br>${escapeHtml(text(profile, 'address'))}</td></tr>
      <tr><td class="label">電話番号</td><td>${escapeHtml(text(profile, 'phone'))}</td><td>E-mail: ${escapeHtml(email)}</td></tr>
    </table>
    <div class="sectionTitle">学歴・職歴</div>
    <table class="history">
      <thead><tr><th class="year">年</th><th class="month">月</th><th>学歴・職歴（項目ごとにまとめて記入）</th></tr></thead>
      <tbody>${rowsHtml(historyRows(profile))}</tbody>
    </table>
  </section>
  <section class="page">
    <div class="sectionTitle">免許・資格</div>
    <table class="license">
      <thead><tr><th class="year">年</th><th class="month">月</th><th>免 許 ・ 資 格</th></tr></thead>
      <tbody>${rowsHtml(licenseRows(profile))}</tbody>
    </table>
    <table class="largeBox" style="margin-top: 5mm;">
      <tr><th>志望の動機、特技、アピールポイント等</th></tr>
      <tr><td>${escapeHtml(motivation(profile, company))}</td></tr>
    </table>
    <table class="requestBox" style="margin-top: 4mm;">
      <tr><th>本人希望記入欄（特に給料・職種・勤務時間・勤務地等に対して希望があれば記入）</th></tr>
      <tr><td>${escapeHtml(desiredText(company))}</td></tr>
    </table>
    <table class="compact" style="margin-top: 4mm;">
      <tr>
        <th>通勤時間</th><td>${escapeHtml(text(profile, 'commute'))}</td>
        <th>扶養家族数（配偶者を除く）</th><td>${escapeHtml(text(profile, 'dependents'))}</td>
      </tr>
      <tr>
        <th>配偶者</th><td>${escapeHtml(text(profile, 'spouse'))}</td>
        <th>配偶者の扶養義務</th><td>${escapeHtml(text(profile, 'spouseSupport'))}</td>
      </tr>
    </table>
    <p class="note">未登録の個人情報欄は空欄です。提出前に生年月日、住所、電話番号、写真、資格情報を本人確認してください。</p>
  </section>
</body>
</html>`;
}
