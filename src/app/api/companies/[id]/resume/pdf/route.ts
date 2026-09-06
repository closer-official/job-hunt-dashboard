import { NextResponse } from 'next/server';
import { isOwnerEmail } from '@/lib/auth';
import { renderA4Pdf } from '@/lib/browser-pdf';
import { getCompany } from '@/lib/companies';
import { buildJisResumeHtml } from '@/lib/jis-resume';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  const pdf = await renderA4Pdf(html);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="resume-${company.slug}.pdf"`,
      'cache-control': 'no-store'
    }
  });
}
