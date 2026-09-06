export type MotivationResearch = {
  person_name?: string;
  person_role?: string;
  quote?: string;
  source_url?: string;
  profile_connection?: string;
};

export type MotivationPipeline = {
  research?: MotivationResearch;
  draft?: string;
  review_status?: 'missing_research' | 'needs_review' | 'approved';
  confirmed_at?: string;
  confirmed_by?: string;
};

export const researchFieldLabels: Record<keyof MotivationResearch, string> = {
  person_name: '発見した人物名',
  person_role: 'その人物の経歴・立場',
  quote: '発言・引用',
  source_url: '出典URL',
  profile_connection: '本人の経歴との接続案'
};

export function motivationPipeline(value: unknown): MotivationPipeline {
  if (!value || typeof value !== 'object') return {};
  return value as MotivationPipeline;
}

export function requiredResearchMissing(research: MotivationResearch | undefined) {
  const fields = Object.keys(researchFieldLabels) as (keyof MotivationResearch)[];
  return fields.filter((field) => {
    const value = research?.[field];
    return typeof value !== 'string' || !value.trim();
  });
}

export function pipelineStatus(pipeline: MotivationPipeline) {
  const missing = requiredResearchMissing(pipeline.research);
  if (missing.length > 0) {
    return {
      label: '一次情報不足',
      description: '人物名、立場、引用、出典URL、本人経歴との接続案がすべて揃うまで志望動機化しません。',
      missing,
      canApprove: false,
      canUseDraft: false
    };
  }

  if (!pipeline.draft || !pipeline.draft.trim()) {
    return {
      label: '文章化待ち',
      description: '一次情報は揃っています。本人確認後、その調査結果だけを材料に文章化します。',
      missing,
      canApprove: false,
      canUseDraft: false
    };
  }

  if (pipeline.review_status === 'approved') {
    return {
      label: '本人確認済み',
      description: '確認済みの志望動機を会社別履歴書PDFに反映します。',
      missing,
      canApprove: false,
      canUseDraft: true
    };
  }

  return {
    label: '本人確認待ち',
    description: 'この接続で良いか本人確認が済むまで、会社別履歴書PDFには最終反映しません。',
    missing,
    canApprove: true,
    canUseDraft: false
  };
}

export function approvedResumeMotivation(fullResearch: Record<string, unknown>) {
  const pipeline = motivationPipeline(fullResearch.motivation_pipeline);
  const status = pipelineStatus(pipeline);
  if (status.canUseDraft && pipeline.draft?.trim()) return pipeline.draft.trim();
  return '';
}
