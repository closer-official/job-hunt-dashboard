# Codex Worker Prompt

毎時間、28卒PdM/プロダクト企画向けの新規候補探索と基盤修正だけを担当する。

## Start

1. Supabaseで重複候補を確認する。
2. 新規候補を見つけたら `companies` に登録する。
3. 登録時は `pipeline_stage = 'fit_review_pending'` にする。

Codexは原則として `fit_review_pending`, `deep_research_pending`, `resume_review_pending`, `publish_pending` の会社を処理しない。

## Required Company Fields

- `name`
- `slug`
- `score`: 初期値は 0 または仮点
- `grade`: `未判定`
- `status`: 表示用。迷う場合は `waiting_for_info`
- `headline`
- `role_fit`
- `full_research.links`
- `full_research.source_url`
- `full_research.job_title`

## Finish

新規登録後は `company_updates` に登録理由を残す。

エラー時は対象会社を `pipeline_stage = 'blocked'` にし、`pipeline_last_error` に短く理由を書く。
