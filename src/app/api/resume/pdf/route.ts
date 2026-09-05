import { NextResponse } from 'next/server';
import { isOwnerEmail } from '@/lib/auth';
import { getCompanies } from '@/lib/companies';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function toUtf16BeHex(text: string) {
  const bytes = ['FE', 'FF'];
  const normalized = text.replace(/[^\u0000-\uffff]/g, '');
  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index);
    bytes.push(code.toString(16).padStart(4, '0').slice(0, 2).toUpperCase());
    bytes.push(code.toString(16).padStart(4, '0').slice(2, 4).toUpperCase());
  }
  return bytes.join('');
}

function wrapLine(text: string, maxLength = 42) {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    if (current.length >= maxLength) {
      lines.push(current);
      current = '';
    }
    current += char;
  }
  if (current) lines.push(current);
  return lines;
}

function createTextPdf(lines: string[]) {
  const pageLines = lines.flatMap((line) => wrapLine(line));
  let y = 790;
  const content = pageLines
    .slice(0, 42)
    .map((line, index) => {
      const fontSize = index === 0 ? 18 : 10;
      const nextY = y;
      y -= index === 0 ? 30 : 16;
      return `BT /F1 ${fontSize} Tf 48 ${nextY} Td <${toUtf16BeHex(line)}> Tj ET`;
    })
    .join('\n');

  const streamContent = `${content}\n`;
  const stream = Buffer.from(streamContent, 'utf8');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /UniJIS-UCS2-H /DescendantFonts [5 0 R] >>',
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 5 >> >>',
    `<< /Length ${stream.length} >>\nstream\n${streamContent}endstream`
  ];

  let body = '%PDF-1.7\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body, 'utf8');
}

function profileText(profile: Record<string, unknown>, key: string, fallback = '未設定') {
  return typeof profile[key] === 'string' ? profile[key] : fallback;
}

function profileArray(profile: Record<string, unknown>, key: string) {
  const value = profile[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export async function GET() {
  if (!process.env.DASHBOARD_OWNER_EMAIL) {
    return NextResponse.json({ error: 'Owner access is not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!isOwnerEmail(user?.email) || !user) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const { data: profileRow } = await supabase
    .from('resume_profiles')
    .select('profile')
    .eq('owner_user_id', user.id)
    .maybeSingle();

  const profile = (profileRow?.profile ?? {}) as Record<string, unknown>;
  const rules = profileArray(profile, 'rules');
  const companies = await getCompanies();
  const topCompanies = companies
    .filter((company) => company.status !== 'rejected')
    .slice(0, 5)
    .map((company) => `${company.name}: ${company.grade} / ${company.score} - ${company.roleFit}`);

  const lines = [
    '履歴書・応募用プロフィール要約',
    `作成対象: ${profileText(profile, 'name', '本人')}`,
    `メール: ${user.email ?? ''}`,
    `ポートフォリオ: ${profileText(profile, 'portfolio_url')}`,
    `所属: ${profileText(profile, 'school')}`,
    '',
    '志望軸',
    profileText(profile, 'career_axis', 'PdM型企画、Product Builder、新規事業、AIを使った業務改善・グロース。'),
    '',
    '主な経験',
    profileText(profile, 'primary_experience'),
    profileText(profile, 'secondary_experience'),
    profileText(profile, 'ai_experience'),
    profileText(profile, 'customer_experience'),
    '',
    '応募優先企業',
    ...topCompanies,
    '',
    '運用メモ',
    ...(rules.length > 0 ? rules : ['企業別の志望動機と提出用PDFは、各社詳細の判定に合わせて更新する。'])
  ];

  const pdf = createTextPdf(lines);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'inline; filename="resume-summary.pdf"',
      'cache-control': 'no-store'
    }
  });
}
