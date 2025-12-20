/**
 * 弱点検出サービス
 *
 * ユーザーの解答履歴を分析し、苦手分野を自動検出する
 * アルゴリズム: weakness_score = (1 - accuracy) × frequency × days_since_last_study
 */

import { db } from '../lib/database';
import type { CategoryStat, WeaknessSummary, WeakArea } from '../types/weakness';

/**
 * カテゴリー別の統計情報を計算
 * @param quizSetId 問題セットID（nullの場合は全体）
 * @returns カテゴリー別統計の配列
 */
export async function calculateCategoryStats(quizSetId?: number): Promise<CategoryStat[]> {
  try {
    console.log('[WeaknessDetection] カテゴリー統計を計算中...', { quizSetId });

    // 履歴データを取得
    const histories = quizSetId
      ? await db.history.where('quizSetId').equals(quizSetId).toArray()
      : await db.history.toArray();

    console.log(`[WeaknessDetection] ${histories.length}件の履歴を取得`);

    // カテゴリーごとにグループ化
    const categoryMap = new Map<string, {
      totalAttempts: number;
      correctAttempts: number;
      lastStudyDate: Date;
      problemIds: Set<number>;
    }>();

    for (const history of histories) {
      const category = history.category || '未分類';

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          totalAttempts: 0,
          correctAttempts: 0,
          lastStudyDate: new Date(0),
          problemIds: new Set(),
        });
      }

      const stat = categoryMap.get(category)!;
      stat.totalAttempts++;
      if (history.isCorrect) {
        stat.correctAttempts++;
      }
      stat.problemIds.add(history.problemId);

      const historyDate = new Date(history.timestamp);
      if (historyDate > stat.lastStudyDate) {
        stat.lastStudyDate = historyDate;
      }
    }

    // CategoryStat配列に変換
    const categoryStats: CategoryStat[] = [];
    const now = new Date();

    for (const [category, stat] of categoryMap.entries()) {
      const accuracy = stat.totalAttempts > 0
        ? stat.correctAttempts / stat.totalAttempts
        : 0;

      const daysSinceLastStudy = Math.floor(
        (now.getTime() - stat.lastStudyDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      categoryStats.push({
        category,
        totalAttempts: stat.totalAttempts,
        correctAttempts: stat.correctAttempts,
        accuracy,
        lastStudyDate: stat.lastStudyDate,
        daysSinceLastStudy,
        problemCount: stat.problemIds.size,
      });
    }

    console.log(`[WeaknessDetection] ${categoryStats.length}個のカテゴリーを分析完了`);
    return categoryStats;
  } catch (error) {
    console.error('[WeaknessDetection] カテゴリー統計の計算に失敗:', error);
    throw error;
  }
}

/**
 * 弱点スコアを計算
 * スコアが高いほど苦手分野
 *
 * @param accuracy 正解率 (0-1)
 * @param frequency 出題回数
 * @param daysSinceLastStudy 最終学習からの日数
 * @returns 弱点スコア
 */
function calculateWeaknessScore(
  accuracy: number,
  frequency: number,
  daysSinceLastStudy: number
): number {
  // 基本スコア: (1 - 正解率) × 出題回数
  const baseScore = (1 - accuracy) * frequency;

  // 時間経過による重み付け（復習の必要性）
  // 1日: 1.0倍、7日: 1.5倍、30日: 2.0倍
  const timeFactor = Math.min(2.0, 1.0 + (daysSinceLastStudy / 30) * 0.5);

  // 最低出題回数のフィルタリング（3回未満はスコアを低く）
  const frequencyFactor = frequency >= 3 ? 1.0 : 0.5;

  return baseScore * timeFactor * frequencyFactor;
}

/**
 * 上位3つの弱点分野を検出
 * @param quizSetId 問題セットID（nullの場合は全体）
 * @returns 弱点分野の配列（最大3件）
 */
export async function detectTopWeaknesses(quizSetId?: number): Promise<WeakArea[]> {
  try {
    console.log('[WeaknessDetection] 弱点分野を検出中...', { quizSetId });

    const categoryStats = await calculateCategoryStats(quizSetId);

    // 弱点スコアを計算してソート
    const weakAreas: WeakArea[] = categoryStats
      .map(stat => {
        const weaknessScore = calculateWeaknessScore(
          stat.accuracy,
          stat.totalAttempts,
          stat.daysSinceLastStudy
        );

        return {
          category: stat.category,
          accuracy: stat.accuracy,
          totalAttempts: stat.totalAttempts,
          weaknessScore,
          recommendedProblemCount: Math.min(10, Math.ceil(stat.problemCount * 0.5)),
        };
      })
      .filter(area => area.totalAttempts >= 3) // 最低3回は解答している分野のみ
      .sort((a, b) => b.weaknessScore - a.weaknessScore) // スコアの降順
      .slice(0, 3); // 上位3件

    console.log(`[WeaknessDetection] ${weakAreas.length}個の弱点分野を検出:`, weakAreas);
    return weakAreas;
  } catch (error) {
    console.error('[WeaknessDetection] 弱点検出に失敗:', error);
    throw error;
  }
}

/**
 * 弱点サマリーを生成
 * @param quizSetId 問題セットID（nullの場合は全体）
 * @returns 弱点サマリー
 */
export async function generateWeaknessSummary(quizSetId?: number): Promise<WeaknessSummary> {
  try {
    console.log('[WeaknessDetection] 弱点サマリーを生成中...', { quizSetId });

    const [categoryStats, topWeaknesses] = await Promise.all([
      calculateCategoryStats(quizSetId),
      detectTopWeaknesses(quizSetId),
    ]);

    // 全体の統計を計算
    const totalAttempts = categoryStats.reduce((sum, stat) => sum + stat.totalAttempts, 0);
    const totalCorrect = categoryStats.reduce((sum, stat) => sum + stat.correctAttempts, 0);
    const overallAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;

    // 改善可能な分野数（正解率60%未満）
    const improvableAreas = categoryStats.filter(stat => stat.accuracy < 0.6).length;

    const summary: WeaknessSummary = {
      topWeaknesses,
      overallAccuracy,
      totalCategories: categoryStats.length,
      improvableAreas,
      lastAnalyzedAt: new Date(),
    };

    console.log('[WeaknessDetection] 弱点サマリー生成完了:', summary);
    return summary;
  } catch (error) {
    console.error('[WeaknessDetection] 弱点サマリーの生成に失敗:', error);
    throw error;
  }
}

/**
 * 弱点分野の推奨問題IDを取得
 * @param category カテゴリー名
 * @param quizSetId 問題セットID（nullの場合は全体）
 * @param limit 取得件数
 * @returns 問題IDの配列
 */
export async function getRecommendedProblemsForWeakness(
  category: string,
  quizSetId?: number,
  limit: number = 10
): Promise<number[]> {
  try {
    console.log('[WeaknessDetection] 推奨問題を取得中...', { category, quizSetId, limit });

    // カテゴリーに属する問題を取得
    let problems = await db.problems
      .where('category')
      .equals(category)
      .toArray();

    // 各問題の正解率を計算
    // Note: quizSetIdフィルタリングはQuizSetテーブルから問題IDを取得する必要があるため、
    // ここでは実装していません。必要に応じて別途実装してください。
    const problemScores = await Promise.all(
      problems.map(async (problem) => {
        const histories = await db.history
          .where('problemId')
          .equals(problem.id!)
          .toArray();

        const totalAttempts = histories.length;
        const correctAttempts = histories.filter(h => h.isCorrect).length;
        const accuracy = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

        // 正解率が低い問題を優先（0.5を基準に、正解率が低いほど高スコア）
        const score = totalAttempts > 0 ? (1 - accuracy) * totalAttempts : 0;

        return {
          problemId: problem.id!,
          score,
          accuracy,
          totalAttempts,
        };
      })
    );

    // スコアの降順でソートして上位N件を取得
    const recommendedIds = problemScores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(p => p.problemId);

    console.log(`[WeaknessDetection] ${recommendedIds.length}件の推奨問題を取得`);
    return recommendedIds;
  } catch (error) {
    console.error('[WeaknessDetection] 推奨問題の取得に失敗:', error);
    throw error;
  }
}

/**
 * カテゴリー統計をIndexedDBに保存
 * @param stats カテゴリー統計の配列
 */
export async function saveCategoryStats(stats: CategoryStat[]): Promise<void> {
  try {
    console.log('[WeaknessDetection] カテゴリー統計を保存中...', stats.length);

    // 既存の統計を削除
    await db.categoryStats.clear();

    // 新しい統計を保存
    await db.categoryStats.bulkAdd(
      stats.map((stat, index) => ({
        id: index + 1,
        ...stat,
        analyzedAt: new Date(),
      }))
    );

    console.log('[WeaknessDetection] カテゴリー統計の保存完了');
  } catch (error) {
    console.error('[WeaknessDetection] カテゴリー統計の保存に失敗:', error);
    throw error;
  }
}

/**
 * 保存されたカテゴリー統計を取得
 * @returns カテゴリー統計の配列
 */
export async function getSavedCategoryStats(): Promise<CategoryStat[]> {
  try {
    const stats = await db.categoryStats.toArray();
    console.log(`[WeaknessDetection] ${stats.length}件のカテゴリー統計を取得`);
    return stats;
  } catch (error) {
    console.error('[WeaknessDetection] カテゴリー統計の取得に失敗:', error);
    throw error;
  }
}
