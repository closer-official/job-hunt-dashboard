import { NextResponse } from 'next/server';
import { isOwnerEmail } from '@/lib/auth';
import { getCompany } from '@/lib/companies';
import { createTextPdf } from '@/lib/pdf';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function profileText(profile: Record<string, unknown>, key: string, fallback = '未設定') {
  return typeof profile[key] === 'string' && profile[key].trim() ? profile[key] : fallback;
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function textList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isBOrAbove(grade: string) {
  return grade === 'A' || grade.toUpperCase().includes('B');
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.DASHBOARD_OWNER_EMAIL) {
    return NextResponse.json({ error: 'Owner access is not configured.' }, { status: 503 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!isOwnerEmail(user?.email) || !user) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const company = await getCompany(decodeURIComponent(id));
  if (!company || !isBOrAbove(company.grade)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const { data: profileRow } = await supabase
    .from('resume_profiles')
    .select('profile')
    .eq('owner_user_id', user.id)
    .maybeSingle();

  const profile = (profileRow?.profile ?? {}) as Record<string, unknown>;
  const research = company.fullResearch;
  const nextActions = textList(research.next_actions);
  const fitReason = textValue(research.fit_reason);
  const selection = textValue(research.selection);

  const lines = [
    '会社別 履歴書・応募用プロフィール',
    `応募先: ${company.name}`,
    `判定: ${company.grade} / ${company.score}`,
    `応募方針: ${company.roleFit}`,
    '',
    '基本情報',
    `氏名: ${profileText(profile, 'name')}`,
    `メール: ${user.email ?? profileText(profile, 'email')}`,
    `所属: ${profileText(profile, 'school')}`,
    `ポートフォリオ: ${profileText(profile, 'portfolio_url')}`,
    '',
    '志望軸',
    profileText(profile, 'career_axis', 'PdM型企画、Product Builder、新規事業、AIを使った業務改善・グロース。'),
    '',
    '企業別の訴求',
    fitReason || company.headline,
    selection ? `選考・待遇メモ: ${selection}` : '',
    '',
    '主な経験',
    profileText(profile, 'primary_experience'),
    profileText(profile, 'secondary_experience'),
    profileText(profile, 'ai_experience'),
    profileText(profile, 'customer_experience'),
    '',
    '提出前の確認',
    ...(nextActions.length > 0 ? nextActions : company.risks.slice(0, 4))
  ].filter(Boolean);

  const pdf = createTextPdf(lines);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="resume-${company.slug}.pdf"`,
      'cache-control': 'no-store'
    }
  });
}
