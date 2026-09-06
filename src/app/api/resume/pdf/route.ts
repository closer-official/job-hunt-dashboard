import { NextResponse } from 'next/server';
import { isOwnerEmail } from '@/lib/auth';
import type { Company } from '@/lib/companies';
import { buildJisResumeHtml } from '@/lib/jis-resume';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

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
  const genericCompany: Company = {
    id: 'resume',
    name: '応募先企業',
    slug: 'general',
    score: 0,
    grade: '共通',
    status: 'watching',
    roleFit: 'PdM、プロダクト企画、新規事業開発、事業企画',
    headline: '提出先に合わせて志望動機を調整してください。',
    fullResearch: {},
    risks: [],
    highlights: [],
    updatedAt: new Date().toISOString().slice(0, 10)
  };
  const html = buildJisResumeHtml(profile, genericCompany, user.email ?? '');
  try {
    const { renderA4Pdf } = await import('@/lib/browser-pdf');
    const pdf = await renderA4Pdf(html);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'inline; filename="resume-summary.pdf"',
        'cache-control': 'no-store'
      }
    });
  } catch (error) {
    console.error('[resume-pdf] generic pdf generation failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return new NextResponse(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }
}
