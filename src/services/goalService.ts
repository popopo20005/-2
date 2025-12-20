/**
 * 目標管理サービス
 *
 * 目標のCRUD操作、進捗計算、達成判定を提供
 */

import { db } from '../lib/database';
import { historyService } from '../lib/database';
import { getTotalStudyTime } from '../lib/studyTimeService';
import type {
  Goal,
  GoalProgress,
  GoalSummary,
  CreateGoalInput,
  UpdateGoalInput,
  GoalUnit,
} from '../types/goal';

/**
 * 目標を作成
 */
export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  try {
    console.log('[GoalService] 目標を作成中...', input);

    const now = new Date();
    const goal: Goal = {
      type: input.type,
      title: input.title,
      description: input.description,
      targetValue: input.targetValue,
      currentValue: 0,
      unit: input.unit,
      deadline: input.deadline,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      category: input.category,
      quizSetId: input.quizSetId,
    };

    const id = await db.goals.add(goal);
    const createdGoal = await db.goals.get(id);

    if (!createdGoal) {
      throw new Error('目標の作成に失敗しました');
    }

    console.log('[GoalService] 目標を作成しました:', createdGoal);
    return createdGoal;
  } catch (error) {
    console.error('[GoalService] 目標の作成に失敗:', error);
    throw error;
  }
}

/**
 * 目標を取得
 */
export async function getGoal(id: number): Promise<Goal | undefined> {
  try {
    return await db.goals.get(id);
  } catch (error) {
    console.error('[GoalService] 目標の取得に失敗:', error);
    throw error;
  }
}

/**
 * すべての目標を取得
 */
export async function getAllGoals(): Promise<Goal[]> {
  try {
    return await db.goals.toArray();
  } catch (error) {
    console.error('[GoalService] 目標一覧の取得に失敗:', error);
    throw error;
  }
}

/**
 * アクティブな目標のみ取得
 */
export async function getActiveGoals(): Promise<Goal[]> {
  try {
    return await db.goals.where('status').equals('active').toArray();
  } catch (error) {
    console.error('[GoalService] アクティブな目標の取得に失敗:', error);
    throw error;
  }
}

/**
 * 目標を更新
 */
export async function updateGoal(id: number, input: UpdateGoalInput): Promise<Goal> {
  try {
    console.log('[GoalService] 目標を更新中...', { id, input });

    const goal = await db.goals.get(id);
    if (!goal) {
      throw new Error('目標が見つかりません');
    }

    const updatedGoal: Goal = {
      ...goal,
      ...input,
      updatedAt: new Date(),
    };

    await db.goals.put(updatedGoal);
    const result = await db.goals.get(id);

    if (!result) {
      throw new Error('目標の更新に失敗しました');
    }

    console.log('[GoalService] 目標を更新しました:', result);
    return result;
  } catch (error) {
    console.error('[GoalService] 目標の更新に失敗:', error);
    throw error;
  }
}

/**
 * 目標を削除
 */
export async function deleteGoal(id: number): Promise<void> {
  try {
    console.log('[GoalService] 目標を削除中...', id);
    await db.goals.delete(id);
    console.log('[GoalService] 目標を削除しました');
  } catch (error) {
    console.error('[GoalService] 目標の削除に失敗:', error);
    throw error;
  }
}

/**
 * 現在値を計算
 */
async function calculateCurrentValue(goal: Goal): Promise<number> {
  try {
    const createdAt = new Date(goal.createdAt);

    switch (goal.unit) {
      case 'problems': {
        // 解答した問題数
        const histories = await historyService.getAll();
        const relevantHistories = histories.filter(h => {
          const historyDate = new Date(h.timestamp);
          if (historyDate < createdAt) return false;
          if (goal.category && h.category !== goal.category) return false;
          return true;
        });
        return relevantHistories.length;
      }

      case 'hours': {
        // 学習時間（時間単位）
        const totalSeconds = await getTotalStudyTime(createdAt);
        return totalSeconds / 3600; // 秒 → 時間
      }

      case 'streak': {
        // 連続学習日数
        const histories = await historyService.getAll();
        const sortedDates = histories
          .map(h => {
            const date = new Date(h.timestamp);
            date.setHours(0, 0, 0, 0);
            return date.getTime();
          })
          .filter((date, index, arr) => arr.indexOf(date) === index)
          .sort((a, b) => b - a);

        if (sortedDates.length === 0) return 0;

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

        return streak;
      }

      case 'accuracy': {
        // 正解率（パーセント）
        const histories = await historyService.getAll();
        const relevantHistories = histories.filter(h => {
          const historyDate = new Date(h.timestamp);
          if (historyDate < createdAt) return false;
          if (goal.category && h.category !== goal.category) return false;
          return true;
        });

        if (relevantHistories.length === 0) return 0;

        const correct = relevantHistories.filter(h => h.isCorrect).length;
        return (correct / relevantHistories.length) * 100;
      }

      case 'quizSets': {
        // 完了した問題セット数
        // TODO: 問題セット完了の履歴を追跡する必要がある
        return 0;
      }

      default:
        return 0;
    }
  } catch (error) {
    console.error('[GoalService] 現在値の計算に失敗:', error);
    return 0;
  }
}

/**
 * 目標の進捗を計算
 */
export async function calculateGoalProgress(goal: Goal): Promise<GoalProgress> {
  try {
    // 現在値を再計算
    const currentValue = await calculateCurrentValue(goal);

    // 進捗率を計算
    const progress = Math.min(100, (currentValue / goal.targetValue) * 100);

    // 残り
    const remaining = Math.max(0, goal.targetValue - currentValue);

    // 残り日数
    let daysRemaining: number | undefined;
    if (goal.deadline) {
      const now = new Date();
      const deadline = new Date(goal.deadline);
      daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // 順調かどうか
    let isOnTrack = true;
    if (goal.deadline && daysRemaining !== undefined) {
      const totalDays = Math.ceil(
        (new Date(goal.deadline).getTime() - new Date(goal.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const elapsedDays = totalDays - daysRemaining;
      const expectedProgress = (elapsedDays / totalDays) * 100;
      isOnTrack = progress >= expectedProgress * 0.8; // 80%以上なら順調
    }

    // 完了予想日
    let estimatedCompletionDate: Date | undefined;
    if (currentValue > 0 && goal.deadline) {
      const elapsedTime = new Date().getTime() - new Date(goal.createdAt).getTime();
      const rate = currentValue / elapsedTime; // 単位時間あたりの進捗
      const remainingTime = remaining / rate;
      estimatedCompletionDate = new Date(Date.now() + remainingTime);
    }

    // 目標のステータスを更新
    let newStatus = goal.status;
    if (progress >= 100 && goal.status === 'active') {
      newStatus = 'completed';
      await updateGoal(goal.id!, {
        status: 'completed',
        currentValue,
      });
    } else if (
      goal.deadline &&
      daysRemaining !== undefined &&
      daysRemaining < 0 &&
      goal.status === 'active'
    ) {
      newStatus = 'expired';
      await updateGoal(goal.id!, {
        status: 'expired',
        currentValue,
      });
    } else if (goal.status === 'active') {
      // 現在値だけ更新
      await updateGoal(goal.id!, { currentValue });
    }

    return {
      goal: { ...goal, currentValue, status: newStatus },
      progress,
      remaining,
      daysRemaining,
      isOnTrack,
      estimatedCompletionDate,
    };
  } catch (error) {
    console.error('[GoalService] 進捗計算に失敗:', error);
    throw error;
  }
}

/**
 * すべての目標の進捗を更新
 */
export async function updateAllGoalProgress(): Promise<void> {
  try {
    console.log('[GoalService] すべての目標の進捗を更新中...');
    const activeGoals = await getActiveGoals();

    for (const goal of activeGoals) {
      await calculateGoalProgress(goal);
    }

    console.log('[GoalService] すべての目標の進捗を更新しました');
  } catch (error) {
    console.error('[GoalService] 進捗更新に失敗:', error);
    throw error;
  }
}

/**
 * 目標のサマリーを取得
 */
export async function getGoalSummary(): Promise<GoalSummary> {
  try {
    const allGoals = await getAllGoals();

    const totalGoals = allGoals.length;
    const activeGoals = allGoals.filter(g => g.status === 'active').length;
    const completedGoals = allGoals.filter(g => g.status === 'completed').length;
    const expiredGoals = allGoals.filter(g => g.status === 'expired').length;

    const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    // 平均進捗率を計算
    let totalProgress = 0;
    for (const goal of allGoals.filter(g => g.status === 'active')) {
      const progress = await calculateGoalProgress(goal);
      totalProgress += progress.progress;
    }
    const averageProgress = activeGoals > 0 ? totalProgress / activeGoals : 0;

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      completionRate,
      expiredGoals,
      averageProgress,
    };
  } catch (error) {
    console.error('[GoalService] サマリー取得に失敗:', error);
    throw error;
  }
}

/**
 * 単位の表示文字列を取得
 */
export function getUnitLabel(unit: GoalUnit, language: 'ja' | 'en' = 'ja'): string {
  const labels = {
    ja: {
      problems: '問',
      hours: '時間',
      streak: '日連続',
      accuracy: '%',
      quizSets: 'セット',
    },
    en: {
      problems: ' problems',
      hours: ' hours',
      streak: ' days',
      accuracy: '%',
      quizSets: ' sets',
    },
  };

  return labels[language][unit];
}
