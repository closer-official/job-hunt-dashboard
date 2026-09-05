import { createClient } from '@/lib/supabase/server';

export type CompanyStatus = 'apply_now' | 'review_this_week' | 'waiting_for_info' | 'watching' | 'rejected';

export type Company = {
  id: string;
  name: string;
  slug: string;
  score: number;
  grade: string;
  status: CompanyStatus;
  roleFit: string;
  headline: string;
  fullResearch: Record<string, unknown>;
  risks: string[];
  highlights: string[];
  updatedAt: string;
};

export type CompanyUpdate = {
  id: string;
  companyId: string;
  companyName: string;
  summary: string;
  previousScore: number | null;
  newScore: number | null;
  sourceNote: string | null;
  createdAt: string;
};

export const statusLabels: Record<CompanyStatus, string> = {
  apply_now: '今すぐ動く',
  review_this_week: '今週確認',
  waiting_for_info: '条件確認待ち',
  watching: '募集開始待ち',
  rejected: '見送り'
};

const statusRank: Record<CompanyStatus, number> = {
  apply_now: 1,
  review_this_week: 2,
  waiting_for_info: 3,
  watching: 4,
  rejected: 5
};

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  score: number;
  grade: string;
  status: CompanyStatus;
  role_fit: string;
  headline: string;
  full_research: Record<string, unknown> | null;
  risks: unknown;
  highlights: unknown;
  updated_at: string;
};

type UpdateRow = {
  id: string;
  company_id: string;
  summary: string;
  previous_score: number | null;
  new_score: number | null;
  source_note: string | null;
  created_at: string;
  companies: { name: string } | { name: string }[] | null;
};

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    score: row.score,
    grade: row.grade,
    status: row.status,
    roleFit: row.role_fit,
    headline: row.headline,
    fullResearch: row.full_research ?? {},
    risks: asStringArray(row.risks),
    highlights: asStringArray(row.highlights),
    updatedAt: row.updated_at.slice(0, 10)
  };
}

function companyNameFromJoin(value: UpdateRow['companies']) {
  if (Array.isArray(value)) return value[0]?.name ?? '';
  return value?.name ?? '';
}

export async function getCompanies() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .select('id,name,slug,score,grade,status,role_fit,headline,full_research,risks,highlights,updated_at')
    .order('score', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as CompanyRow[])
    .map(mapCompany)
    .sort((a, b) => statusRank[a.status] - statusRank[b.status] || b.score - a.score);
}

export async function getCompany(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .select('id,name,slug,score,grade,status,role_fit,headline,full_research,risks,highlights,updated_at')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  return mapCompany(data as CompanyRow);
}

export async function getCompanyUpdates() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('company_updates')
    .select('id,company_id,summary,previous_score,new_score,source_note,created_at,companies(name)')
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    throw new Error(error.message);
  }

  return (data as UpdateRow[]).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    companyName: companyNameFromJoin(row.companies),
    summary: row.summary,
    previousScore: row.previous_score,
    newScore: row.new_score,
    sourceNote: row.source_note,
    createdAt: row.created_at.slice(0, 10)
  }));
}
