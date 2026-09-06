import { NextResponse } from 'next/server';
import { isOwnerEmail } from '@/lib/auth';
import { getCompany } from '@/lib/companies';
import { buildJisResumeHtml } from '@/lib/jis-resume';
import { contentDispositionForPdf, resumePdfFilename } from '@/lib/resume-filename';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

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
  const html = buildJisResumeHtml(profile, company, user.email ?? '');
  try {
    const { renderA4Pdf } = await import('@/lib/browser-pdf');
    const pdf = await renderA4Pdf(html);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': contentDispositionForPdf(resumePdfFilename(profile, company)),
        'cache-control': 'no-store'
      }
    });
  } catch (error) {
    console.error('[resume-pdf] company pdf generation failed', {
      slug: company.slug,
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
