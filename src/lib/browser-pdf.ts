import chromium from '@sparticuz/chromium';
import { chromium as playwright } from 'playwright-core';

export async function renderA4Pdf(html: string) {
  const executablePath = await chromium.executablePath();
  const browser = await playwright.launch({
    args: chromium.args,
    executablePath,
    headless: true
  });

  try {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });
  } finally {
    await browser.close();
  }
}
