/**
 * 適応的問題推奨エンジン
 *
 * ユーザーの学習履歴・弱点・難易度を分析し、最適な問題を推奨する
 * アルゴリズム: score = weakness_score × 0.4 + time_since_review × 0.3 + difficulty_match × 0.3
 */

import { db, historyService, problemService } from '../lib/database';
import { detectTopWeaknesses, calculateCategoryStats } from './weaknessDetectionService';
import { spacedRepetitionService } from '../lib/database';
import type {
  RecommendedProblem,
  RecommendationSet,
  RecommendationScoreComponents,
  UserPerformance,
  UserDifficultyProfile,
  RecommendationConfig,
  DifficultyLevel,
} from '../types/recommendation';
import type { Problem } from '../types';
import { DEFAULT_RECOMMENDATION_CONFIG, DIFFICULTY_LEVELS } from '../types/recommendation';

/**
 * ユーザーのパフォーマンスを分析
 */
export async function analyzeUserPerformance(): Promise<UserPerformance> {
  try {
    console.log('[RecommendationEngine] ユーザーパフォーマンスを分析中...');

    const histories = await historyService.getAll();

    if (histories.length === 0) {
      return {
        overallAccuracy: 0,
        recentAccuracy: 0,
        averageTimePerProblem: 0,
        totalProblems: 0,
        streak: 0,
        weakCategories: [],
        strongCategories: [],
      };
    }

    // 全体正解率
    const correctCount = histories.filter(h => h.isCorrect).length;
    const overallAccuracy = correctCount / histories.length;

    // 最近の正解率（直近20問）
    const recentHistories = histories.slice(-20);
    const recentCorrect = recentHistories.filter(h => h.isCorrect).length;
    const recentAccuracy = recentHistories.length > 0 ? recentCorrect / recentHistories.length : 0;

    // 平均解答時間（仮想値、実際はanswerAnalyticsから取得）
    const averageTimePerProblem = 60; // 60秒

    // 連続学習日数
    const sortedDates = histories
      .map(h => {
        const date = new Date(h.timestamp);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort((a, b) => b - a);

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const dateTime of sortedDates) {
      if (dateTime === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (dateTime === currentDate.getTime() - 86400000) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // カテゴリー別分析
    const categoryStats = await calculateCategoryStats();
    const sortedByAccuracy = [...categoryStats].sort((a, b) => a.accuracy - b.accuracy);

    const weakCategories = sortedByAccuracy.slice(0, 3).map(s => s.category);
    const strongCategories = sortedByAccuracy.slice(-3).map(s => s.category);

    const performance: UserPerformance = {
      overallAccuracy,
      recentAccuracy,
      averageTimePerProblem,
      totalProblems: histories.length,
      streak,
      weakCategories,
      strongCategories,
    };

    console.log('[RecommendationEngine] パフォーマンス分析完了:', performance);
    return performance;
  } catch (error) {
    console.error('[RecommendationEngine] パフォーマンス分析に失敗:', error);
    throw error;
  }
}

/**
 * ユーザーの難易度プロファイルを取得
 */
export async function getUserDifficultyProfile(): Promise<UserDifficultyProfile> {
  try {
    const performance = await analyzeUserPerformance();

    // 全体正解率からレベルを判定
    let currentLevel: DifficultyLevel = 'beginner';
    if (performance.overallAccuracy >= 0.85) {
      currentLevel = 'expert';
    } else if (performance.overallAccuracy >= 0.7) {
      currentLevel = 'advanced';
    } else if (performance.overallAccuracy >= 0.5) {
      currentLevel = 'intermediate';
    }

    // カテゴリー別レベル
    const categoryLevels = new Map<string, DifficultyLevel>();
    const categoryStats = await calculateCategoryStats();

    for (const stat of categoryStats) {
      let level: DifficultyLevel = 'beginner';
      if (stat.accuracy >= 0.85) {
        level = 'expert';
      } else if (stat.accuracy >= 0.7) {
        level = 'advanced';
      } else if (stat.accuracy >= 0.5) {
        level = 'intermediate';
      }
      categoryLevels.set(stat.category, level);
    }

    return {
      currentLevel,
      targetAccuracy: 0.7, // 目標正解率70%
      adaptiveThreshold: 0.1, // 調整閾値10%
      categoryLevels,
    };
  } catch (error) {
    console.error('[RecommendationEngine] 難易度プロファイル取得に失敗:', error);
    throw error;
  }
}

/**
 * 問題の推奨スコアを計算
 */
async function calculateRecommendationScore(
  problem: Problem,
  config: RecommendationConfig = DEFAULT_RECOMMENDATION_CONFIG
): Promise<RecommendationScoreComponents> {
  try {
    // 1. 弱点スコア (0-100)
    const weaknesses = await detectTopWeaknesses();
    const weaknessMap = new Map(weaknesses.map(w => [w.category, w.weaknessScore]));
    const weaknessScore = problem.category ? (weaknessMap.get(problem.category) || 0) : 0;

    // 2. 復習時間スコア (0-100)
    const histories = await db.history
      .where('problemId')
      .equals(problem.id!)
      .toArray();

    let timeScore = 50; // デフォルトスコア
    if (histories.length > 0) {
      const lastAttempt = histories.reduce((latest, h) =>
        new Date(h.timestamp) > new Date(latest.timestamp) ? h : latest
      );
      const daysSinceLastAttempt = Math.floor(
        (Date.now() - new Date(lastAttempt.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );

      // 最後の解答から時間が経過するほどスコアが高い
      timeScore = Math.min(100, daysSinceLastAttempt * 5);
    } else {
      // 一度も解答していない問題は中程度のスコア
      timeScore = 60;
    }

    // 3. 難易度適合スコア (0-100)
    const userProfile = await getUserDifficultyProfile();
    const categoryLevel = problem.category
      ? userProfile.categoryLevels.get(problem.category) || userProfile.currentLevel
      : userProfile.currentLevel;

    // ユーザーレベルに近い難易度ほどスコアが高い
    const levelRange = DIFFICULTY_LEVELS[categoryLevel];
    const problemDifficulty = histories.length > 0
      ? 1 - (histories.filter(h => h.isCorrect).length / histories.length)
      : 0.5; // デフォルト難易度

    const difficultyDelta = Math.abs(problemDifficulty - (levelRange.min + levelRange.max) / 2);
    const difficultyScore = Math.max(0, 100 - difficultyDelta * 200);

    // 総合スコア
    const totalScore =
      weaknessScore * config.weaknessWeight +
      timeScore * config.timeWeight +
      difficultyScore * config.difficultyWeight;

    return {
      weaknessScore,
      timeScore,
      difficultyScore,
      totalScore,
    };
  } catch (error) {
    console.error('[RecommendationEngine] スコア計算に失敗:', error);
    return {
      weaknessScore: 0,
      timeScore: 0,
      difficultyScore: 0,
      totalScore: 0,
    };
  }
}

/**
 * 推奨問題を生成
 */
export async function generateRecommendedProblems(
  count: number = 10,
  config: RecommendationConfig = DEFAULT_RECOMMENDATION_CONFIG
): Promise<RecommendedProblem[]> {
  try {
    console.log('[RecommendationEngine] 推奨問題を生成中...', { count });

    // すべての問題を取得
    const allProblems = await problemService.getAll();

    if (allProblems.length === 0) {
      console.log('[RecommendationEngine] 問題が見つかりません');
      return [];
    }

    // 各問題のスコアを計算
    const scoredProblems = await Promise.all(
      allProblems.map(async (problem) => {
        const score = await calculateRecommendationScore(problem, config);
        return { problem, score };
      })
    );

    // スコアでソートしてフィルタリング
    const recommended = scoredProblems
      .filter(sp => sp.score.totalScore >= config.minScore)
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
      .slice(0, count);

    // 推奨理由を生成
    const result: RecommendedProblem[] = recommended.map(sp => {
      let reason = '';
      let priority: 'high' | 'medium' | 'low' = 'medium';

      if (sp.score.weaknessScore > 70) {
        reason = '苦手分野の復習';
        priority = 'high';
      } else if (sp.score.timeScore > 70) {
        reason = '復習のタイミング';
        priority = 'medium';
      } else if (sp.score.difficultyScore > 70) {
        reason = 'あなたのレベルに最適';
        priority = 'medium';
      } else {
        reason = '総合的におすすめ';
        priority = 'low';
      }

      return {
        problem: sp.problem,
        score: sp.score,
        reason,
        priority,
        estimatedDifficulty: sp.score.difficultyScore,
      };
    });

    console.log(`[RecommendationEngine] ${result.length}件の推奨問題を生成しました`);
    return result;
  } catch (error) {
    console.error('[RecommendationEngine] 推奨問題の生成に失敗:', error);
    throw error;
  }
}

/**
 * カテゴリー別の推奨問題を生成
 */
export async function generateCategoryRecommendations(
  category: string,
  count: number = 10
): Promise<RecommendedProblem[]> {
  try {
    console.log('[RecommendationEngine] カテゴリー別推奨を生成中...', { category, count });

    // カテゴリーの問題を取得
    const categoryProblems = await db.problems
      .where('category')
      .equals(category)
      .toArray();

    if (categoryProblems.length === 0) {
      console.log('[RecommendationEngine] カテゴリーに問題が見つかりません');
      return [];
    }

    // 各問題のスコアを計算
    const scoredProblems = await Promise.all(
      categoryProblems.map(async (problem) => {
        const score = await calculateRecommendationScore(problem);
        return { problem, score };
      })
    );

    // スコアでソートして上位を取得
    const recommended = scoredProblems
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
      .slice(0, count);

    return recommended.map(sp => ({
      problem: sp.problem,
      score: sp.score,
      reason: `${category}のおすすめ問題`,
      priority: sp.score.totalScore > 70 ? 'high' : sp.score.totalScore > 50 ? 'medium' : 'low',
      estimatedDifficulty: sp.score.difficultyScore,
    }));
  } catch (error) {
    console.error('[RecommendationEngine] カテゴリー別推奨の生成に失敗:', error);
    throw error;
  }
}

/**
 * 推奨セットを生成
 */
export async function generateRecommendationSets(): Promise<RecommendationSet[]> {
  try {
    console.log('[RecommendationEngine] 推奨セットを生成中...');

    const sets: RecommendationSet[] = [];
    const weaknesses = await detectTopWeaknesses();
    const performance = await analyzeUserPerformance();

    // 1. 弱点克服セット
    for (const weakness of weaknesses.slice(0, 2)) {
      const problems = await generateCategoryRecommendations(weakness.category, 10);

      if (problems.length > 0) {
        sets.push({
          id: `weakness-${weakness.category}`,
          title: `${weakness.category} 弱点克服`,
          description: `正解率${(weakness.accuracy * 100).toFixed(1)}%の苦手分野を強化`,
          problems,
          targetCategory: weakness.category,
          estimatedTime: problems.length * 2, // 1問2分と仮定
          difficulty: 'hard',
          createdAt: new Date(),
        });
      }
    }

    // 2. 復習が必要なセット（Spaced Repetition統合）
    try {
      const dueCards = await spacedRepetitionService.getDueCards();
      if (dueCards.length > 0) {
        const reviewProblems: RecommendedProblem[] = [];
        for (const card of dueCards.slice(0, 10)) {
          const problem = await db.problems.get(card.problemId);
          if (!problem) continue;

          const score = await calculateRecommendationScore(problem);
          reviewProblems.push({
            problem,
            score,
            reason: '復習のタイミング',
            priority: 'high',
            estimatedDifficulty: 50,
          });
        }

        const validReviewProblems = reviewProblems;

        if (validReviewProblems.length > 0) {
          sets.push({
            id: 'spaced-repetition',
            title: '今日の復習',
            description: `${dueCards.length}件の復習が必要です`,
            problems: validReviewProblems,
            estimatedTime: validReviewProblems.length * 2,
            difficulty: 'medium',
            createdAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.log('[RecommendationEngine] Spaced Repetition統合をスキップ');
    }

    // 3. レベルアップチャレンジ
    if (performance.recentAccuracy > 0.8) {
      const recommendedProblems = await generateRecommendedProblems(10, {
        ...DEFAULT_RECOMMENDATION_CONFIG,
        difficultyWeight: 0.6, // 難易度重視
      });

      if (recommendedProblems.length > 0) {
        sets.push({
          id: 'level-up',
          title: 'レベルアップチャレンジ',
          description: `正解率${(performance.recentAccuracy * 100).toFixed(0)}%達成！次のレベルへ`,
          problems: recommendedProblems,
          estimatedTime: recommendedProblems.length * 2,
          difficulty: 'hard',
          createdAt: new Date(),
        });
      }
    }

    console.log(`[RecommendationEngine] ${sets.length}個の推奨セットを生成しました`);
    return sets;
  } catch (error) {
    console.error('[RecommendationEngine] 推奨セットの生成に失敗:', error);
    throw error;
  }
}
