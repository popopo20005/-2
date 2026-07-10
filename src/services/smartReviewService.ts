/**
 * スマート復習サービス
 *
 * SM-2忘却曲線に基づく復習提案を生成
 * - Urgent復習: 忘却リスクが高い問題
 * - Recommended復習: 今日期限のカード
 * - Weekly復習: 弱点カテゴリーの定期復習
 */

import { spacedRepetitionService } from '../lib/database';
import { calculateCategoryStats } from './weaknessDetectionService';
import type { SpacedRepetitionCard } from '../types';

// ============================================================
// 型定義
// ============================================================

export interface ReviewProposal {
  id: string;
  type: 'urgent' | 'recommended' | 'weekly';
  title: string;
  description: string;
  problemIds: number[];
  category?: string;
  estimatedMinutes: number;
  priority: number; // 1-10
  reason: string;
}

export interface ForgettingRisk {
  problemId: number;
  cardId: number;
  category: string;
  daysOverdue: number;
  estimatedRetention: number; // 0-1
  lastAccuracy: number;
}

export interface SmartReviewSummary {
  urgentCount: number;
  recommendedCount: number;
  weeklyCount: number;
  averageRetention: number; // 0-1
  proposals: ReviewProposal[];
  risks: ForgettingRisk[];
  categoryRetention: Array<{ category: string; retention: number; dueCount: number }>;
}

// ============================================================
// 忘却率推定
// ============================================================

/**
 * エビングハウス忘却曲線に基づく記憶定着率推定
 * R(t) = e^(-t / (S × EF))
 *
 * @param card SM-2カード
 * @returns 推定定着率 (0-1)
 */
export function estimateRetention(card: SpacedRepetitionCard): number {
  if (!card.lastReviewDate) return 0.5; // 未復習カードは50%

  const now = new Date();
  const lastReview = new Date(card.lastReviewDate);
  const daysSinceReview = Math.max(0, (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24));

  const interval = Math.max(1, card.interval);
  const ef = card.easinessFactor || 2.5;

  // R(t) = e^(-t / (S × EF))
  const retention = Math.exp(-daysSinceReview / (interval * ef));
  return Math.max(0, Math.min(1, retention));
}

// ============================================================
// 忘却リスク分析
// ============================================================

/**
 * カテゴリー別の忘却リスクを分析
 */
export async function analyzeForgettingRisk(): Promise<ForgettingRisk[]> {
  const allCards = await spacedRepetitionService.getAllCards();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const risks: ForgettingRisk[] = [];

  for (const card of allCards) {
    if (!card.id) continue;

    const nextReview = new Date(card.nextReviewDate);
    nextReview.setHours(0, 0, 0, 0);

    const daysOverdue = Math.max(0, Math.floor((now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24)));

    // 期限切れまたは期限当日のカードのみ
    if (daysOverdue < 0) continue;

    const retention = estimateRetention(card);

    risks.push({
      problemId: card.problemId,
      cardId: card.id,
      category: card.category || '',
      daysOverdue,
      estimatedRetention: Math.round(retention * 100) / 100,
      lastAccuracy: card.accuracy || 0,
    });
  }

  // 忘却リスクが高い順 (定着率が低い順)
  risks.sort((a, b) => a.estimatedRetention - b.estimatedRetention);
  return risks;
}

// ============================================================
// 復習提案生成
// ============================================================

/**
 * スマート復習の全体サマリーを生成
 */
export async function generateSmartReviewSummary(): Promise<SmartReviewSummary> {
  const proposals: ReviewProposal[] = [];
  const risks = await analyzeForgettingRisk();

  // 1. Urgent復習: 3日以上超過 & 定着率50%未満
  const urgentRisks = risks.filter(r => r.daysOverdue >= 3 && r.estimatedRetention < 0.5);
  if (urgentRisks.length > 0) {
    proposals.push({
      id: `urgent-${Date.now()}`,
      type: 'urgent',
      title: '忘却リスク',
      description: `${urgentRisks.length}問の記憶が薄れています`,
      problemIds: urgentRisks.map(r => r.problemId),
      estimatedMinutes: Math.ceil(urgentRisks.length * 1.5),
      priority: 9,
      reason: `${urgentRisks.length}問が3日以上未復習で、推定定着率50%未満です`,
    });
  }

  // 2. Recommended復習: 今日期限のカード
  const dueToday = risks.filter(r => r.daysOverdue >= 0 && r.daysOverdue < 3);
  const lowAccuracyDue = dueToday.filter(r => r.lastAccuracy < 70);
  const normalDue = dueToday.filter(r => r.lastAccuracy >= 70);

  if (lowAccuracyDue.length > 0) {
    proposals.push({
      id: `recommended-weak-${Date.now()}`,
      type: 'recommended',
      title: '弱点復習',
      description: `正答率70%未満の復習カード`,
      problemIds: lowAccuracyDue.map(r => r.problemId),
      estimatedMinutes: Math.ceil(lowAccuracyDue.length * 1.5),
      priority: 7,
      reason: `${lowAccuracyDue.length}問の弱点カードが復習期限です`,
    });
  }

  if (normalDue.length > 0) {
    proposals.push({
      id: `recommended-normal-${Date.now()}`,
      type: 'recommended',
      title: '今日の復習',
      description: `復習期限のカード`,
      problemIds: normalDue.map(r => r.problemId),
      estimatedMinutes: Math.ceil(normalDue.length * 1),
      priority: 5,
      reason: `${normalDue.length}問が今日の復習予定です`,
    });
  }

  // 3. Weekly復習: 弱点カテゴリートップ3
  try {
    const categoryStats = await calculateCategoryStats();
    const weakCategories = categoryStats
      .filter(s => s.accuracy < 0.7 && s.totalAttempts >= 5)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    for (const cat of weakCategories) {
      const categoryCards = await spacedRepetitionService.getDueCardsByCategory(cat.category, 5);
      if (categoryCards.length > 0) {
        proposals.push({
          id: `weekly-${cat.category}-${Date.now()}`,
          type: 'weekly',
          title: `${cat.category} 強化`,
          description: `正答率${Math.round(cat.accuracy * 100)}%のカテゴリー`,
          problemIds: categoryCards.map(c => c.problemId),
          category: cat.category,
          estimatedMinutes: Math.ceil(categoryCards.length * 1.5),
          priority: 3,
          reason: `「${cat.category}」の正答率が${Math.round(cat.accuracy * 100)}%と低いため`,
        });
      }
    }
  } catch (error) {
    console.error('[SmartReview] Weekly review generation failed:', error);
  }

  // カテゴリー別定着率
  const categoryRetentionMap = new Map<string, { totalRetention: number; count: number; dueCount: number }>();
  for (const risk of risks) {
    const cat = risk.category || 'その他';
    const existing = categoryRetentionMap.get(cat) || { totalRetention: 0, count: 0, dueCount: 0 };
    existing.totalRetention += risk.estimatedRetention;
    existing.count++;
    if (risk.daysOverdue >= 0) existing.dueCount++;
    categoryRetentionMap.set(cat, existing);
  }

  const categoryRetention = [...categoryRetentionMap.entries()]
    .map(([category, data]) => ({
      category,
      retention: data.count > 0 ? Math.round((data.totalRetention / data.count) * 100) / 100 : 1,
      dueCount: data.dueCount,
    }))
    .sort((a, b) => a.retention - b.retention);

  // 全体平均定着率
  const allRetentions = risks.map(r => r.estimatedRetention);
  const averageRetention = allRetentions.length > 0
    ? allRetentions.reduce((sum, r) => sum + r, 0) / allRetentions.length
    : 1;

  return {
    urgentCount: urgentRisks.length,
    recommendedCount: dueToday.length,
    weeklyCount: proposals.filter(p => p.type === 'weekly').reduce((sum, p) => sum + p.problemIds.length, 0),
    averageRetention: Math.round(averageRetention * 100) / 100,
    proposals: proposals.sort((a, b) => b.priority - a.priority),
    risks: risks.slice(0, 20), // トップ20のリスク
    categoryRetention,
  };
}
