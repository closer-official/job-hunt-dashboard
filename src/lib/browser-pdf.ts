import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export async function renderA4Pdf(html: string) {
  chromium.setGraphicsMode = false;
  const executablePath = await chromium.executablePath();
  console.log('[resume-pdf] launching chromium', { hasExecutablePath: Boolean(executablePath) });
  const browser = await puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
    executablePath,
    headless: 'shell'
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise((resolve) => setTimeout(resolve, 8000))
    ]);
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });
  } finally {
    await Promise.race([browser.close(), browser.close(), browser.close()]);
  }
}
