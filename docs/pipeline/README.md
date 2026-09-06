# 28卒PdM Company Research Pipeline

Supabaseを共有ボードにして、Codex / GeminiSpark / ClaudeCodeを互いに呼び合わず独立実行する。

## Pipeline Stages

`companies.status` はサイト表示用に残す。自動処理は `companies.pipeline_stage` だけを見る。

| stage | 担当 | 意味 |
| --- | --- | --- |
| `new_candidate` | Codex | 候補化直後。重複確認や最低限の正規化待ち |
| `fit_review_pending` | GeminiSpark | 就活軸との適合度判定待ち |
| `deep_research_pending` | ClaudeCode | B以上候補の深掘り調査待ち |
| `resume_review_pending` | ClaudeCode | 履歴書・応募フォーム回答例の本人確認待ち |
| `publish_pending` | ClaudeCode | サイト反映・メール通知待ち |
| `notified` | - | 通知済み、通常完了 |
| `rejected` | - | 見送り、または対象外 |
| `blocked` | Codex | エラーまたは未確認情報で停止 |

## Lock Rule

各ツールは、開始時に `claim_pipeline_company(worker, stage, lock_minutes)` を呼ぶ。戻り値が0件なら作業しない。

作業完了時は `finish_pipeline_run(run_id, next_stage, status, output_summary, error)` を呼ぶ。

これにより、同じ会社を同時に触ることを避ける。

## Worker Boundaries

Codex:
- 新規候補探索
- 重複確認
- 最低限の会社情報登録
- DB/サイト/認証/PDFの修正
- `new_candidate` または `blocked` の整理

GeminiSpark:
- `fit_review_pending` だけを処理
- コードには触らない
- Supabase構造変更、PDF生成、メール送信、個人情報確定は禁止

ClaudeCode:
- `deep_research_pending`, `resume_review_pending`, `publish_pending` を処理
- 深掘り調査、志望動機ドラフト、応募フォーム回答例、PDF生成確認、サイトURL付きメール通知
- DBスキーマ変更は禁止。必要なら `blocked` にしてCodexへ回す

## Safety Rule

個人情報は `user_provided` または本人提供済みの値だけ使う。未確認値を推測して履歴書・応募フォームに入れない。

特に以下は推測禁止:
- 生年月日
- 電話番号
- フリガナ
- 学位
- 卒業年月
- 通勤時間
- 資格
