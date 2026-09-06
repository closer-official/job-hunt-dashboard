import type { Company } from '@/lib/companies';

function compactName(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim();
}

export function resumePdfFilename(profile: Record<string, unknown>, company: Company) {
  const applicantName = compactName(profile.name) || '応募者';
  const companyName = compactName(company.name) || compactName(company.slug) || '応募先企業';
  return `履歴書_${applicantName}_${companyName}.pdf`;
}

export function contentDispositionForPdf(filename: string) {
  const encoded = encodeURIComponent(filename);
  return `inline; filename=\"resume.pdf\"; filename*=UTF-8''${encoded}`;
}
