import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import { chromium as playwright } from 'playwright-core';
import { isOwnerEmail } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

function renderResumeHtml() {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 12mm; }
    body { font-family: system-ui, sans-serif; color: #111827; }
    h1 { font-size: 20px; margin: 0 0 16px; }
    .box { border: 1px solid #111827; min-height: 120px; padding: 12px; margin-bottom: 12px; }
  </style></head><body><h1>履歴書 PDF 生成テスト</h1><div class="box">Supabase認証後、本人ユーザーのみ実データで生成します。</div></body></html>`;
}

export async function GET() {
  if (!process.env.DASHBOARD_OWNER_EMAIL) {
    return NextResponse.json({ error: 'Owner access is not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!isOwnerEmail(data.user?.email)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const browser = await playwright.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.setContent(renderResumeHtml(), { waitUntil: 'networkidle' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'inline; filename="resume.pdf"'
      }
    });
  } finally {
    await browser.close();
  }
}
