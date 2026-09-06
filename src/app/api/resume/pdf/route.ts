import { NextResponse } from 'next/server';
import { isOwnerEmail } from '@/lib/auth';
import { getCompanies } from '@/lib/companies';
import { createTextPdf } from '@/lib/pdf';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
