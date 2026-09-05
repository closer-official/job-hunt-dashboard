export type CompanyStatus = 'apply_now' | 'review_this_week' | 'waiting_for_info' | 'watching' | 'rejected';

export type Company = {
  id: string;
  name: string;
  score: number;
  grade: string;
  status: CompanyStatus;
  roleFit: string;
  headline: string;
  risks: string[];
  highlights: string[];
  updatedAt: string;
};

export const companies: Company[] = [
  {
    id: 'sample-company',
    name: 'Sample Company',
    score: 91,
    grade: 'A',
    status: 'apply_now',
    roleFit: 'Product / business planning fit',
    headline: 'High-priority candidate company with strong role alignment.',
    risks: ['Placement details need confirmation'],
    highlights: ['Strong domain fit', 'Clear application priority', 'Good compensation signal'],
    updatedAt: '2026-09-05'
  }
];

export const statusLabels: Record<CompanyStatus, string> = {
  apply_now: '今すぐ動く',
  review_this_week: '今週確認',
  waiting_for_info: '条件確認待ち',
  watching: '募集開始待ち',
  rejected: '見送り'
};
