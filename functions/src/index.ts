/**
 * Cloud Functions エントリーポイント
 *
 * 全てのCloud Functionsをここから統合エクスポートする。
 *
 * === 既存エンドポイント ===
 *   POST /createCheckoutSession       — Stripe Checkout セッション作成
 *   POST /createPortalSession         — Stripe Customer Portal セッション作成
 *   POST /stripeWebhook               — Stripe Webhook イベント処理
 *   POST /geminiGenerate              — Gemini AI プロキシ（認証必須）
 *   POST /registerPushSubscription    — Push サブスクリプション登録
 *   POST /unregisterPushSubscription  — Push サブスクリプション解除
 *   Scheduled /sendScheduledPush      — 定期Push通知送信
 *
 * === REST API エンドポイント ===
 *   Problems:
 *     GET    /apiGetProblems          — 問題一覧取得
 *     GET    /apiGetProblem           — 単体取得
 *     POST   /apiCreateProblem        — 作成
 *     PUT    /apiUpdateProblem        — 更新
 *     DELETE /apiDeleteProblem        — 削除
 *     POST   /apiBulkImportProblems   — 一括インポート
 *   QuizSets:
 *     GET    /apiGetQuizSets          — 一覧取得
 *     GET    /apiGetQuizSet           — 単体取得
 *     POST   /apiCreateQuizSet        — 作成
 *     PUT    /apiUpdateQuizSet        — 更新
 *     DELETE /apiDeleteQuizSet        — 削除
 *   Statistics:
 *     GET    /apiGetStatistics        — 学習統計
 *     GET    /apiGetCategoryStats     — カテゴリ別統計
 *   StudyPlans:
 *     GET    /apiGetStudyPlans        — 一覧取得
 *     GET    /apiGetStudyPlan         — 単体取得
 *     POST   /apiCreateStudyPlan      — 作成
 *     PUT    /apiUpdateStudyPlan      — 更新
 *     DELETE /apiDeleteStudyPlan      — 削除
 */

// Existing
export { createCheckoutSession, createPortalSession, stripeWebhook } from './stripe';
export { geminiGenerate } from './gemini';
export { registerPushSubscription, unregisterPushSubscription, sendScheduledPush } from './push';

// REST API - Problems
export {
  apiGetProblems,
  apiGetProblem,
  apiCreateProblem,
  apiUpdateProblem,
  apiDeleteProblem,
  apiBulkImportProblems,
} from './api/problems';

// REST API - QuizSets
export {
  apiGetQuizSets,
  apiGetQuizSet,
  apiCreateQuizSet,
  apiUpdateQuizSet,
  apiDeleteQuizSet,
} from './api/quizSets';

// REST API - Statistics
export {
  apiGetStatistics,
  apiGetCategoryStats,
} from './api/statistics';

// REST API - StudyPlans
export {
  apiGetStudyPlans,
  apiGetStudyPlan,
  apiCreateStudyPlan,
  apiUpdateStudyPlan,
  apiDeleteStudyPlan,
} from './api/studyPlans';
