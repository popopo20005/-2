/**
 * Quiz Completion Tracking Service
 * 完了した問題集を追跡し、推奨順序を調整する
 */

interface QuizCompletion {
  quizSetId: number;
  completedAt: Date;
  score: number;
  totalProblems: number;
}

const STORAGE_KEY = 'quiz_completion_history';
const COMPLETION_COOLDOWN_HOURS = 24; // 完了後24時間は推奨を避ける

/**
 * 問題集完了を記録
 */
export function recordCompletion(
  quizSetId: number,
  score: number,
  totalProblems: number
): void {
  try {
    const history = getCompletionHistory();

    // 新しい完了記録を追加
    const completion: QuizCompletion = {
      quizSetId,
      completedAt: new Date(),
      score,
      totalProblems
    };

    history.push(completion);

    // 30日以上前の記録は削除（メモリ節約）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filteredHistory = history.filter(
      c => new Date(c.completedAt) > thirtyDaysAgo
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
    console.log(`✅ Quiz completion recorded: Set ${quizSetId}`);
  } catch (error) {
    console.error('Failed to record quiz completion:', error);
  }
}

/**
 * 完了履歴を取得
 */
export function getCompletionHistory(): QuizCompletion[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const history = JSON.parse(data);
    // Date オブジェクトに変換
    return history.map((c: any) => ({
      ...c,
      completedAt: new Date(c.completedAt)
    }));
  } catch (error) {
    console.error('Failed to get completion history:', error);
    return [];
  }
}

/**
 * 問題集が最近完了されたかチェック
 */
export function isRecentlyCompleted(quizSetId: number): boolean {
  try {
    const history = getCompletionHistory();
    const now = new Date();
    const cooldownThreshold = new Date(
      now.getTime() - COMPLETION_COOLDOWN_HOURS * 60 * 60 * 1000
    );

    // 過去24時間以内に完了されているかチェック
    const recentCompletion = history.find(
      c => c.quizSetId === quizSetId && c.completedAt > cooldownThreshold
    );

    return !!recentCompletion;
  } catch (error) {
    console.error('Failed to check recent completion:', error);
    return false;
  }
}

/**
 * 問題集の最終完了時刻を取得
 */
export function getLastCompletionTime(quizSetId: number): Date | null {
  try {
    const history = getCompletionHistory();
    const completions = history.filter(c => c.quizSetId === quizSetId);

    if (completions.length === 0) return null;

    // 最新の完了時刻を返す
    return completions.reduce((latest, c) =>
      c.completedAt > latest ? c.completedAt : latest,
      completions[0].completedAt
    );
  } catch (error) {
    console.error('Failed to get last completion time:', error);
    return null;
  }
}

/**
 * 推奨ペナルティスコアを計算
 * 最近完了された問題集ほど高いペナルティ（推奨順位が下がる）
 */
export function getRecommendationPenalty(quizSetId: number): number {
  try {
    const lastCompletion = getLastCompletionTime(quizSetId);
    if (!lastCompletion) return 0;

    const now = new Date();
    const hoursSinceCompletion =
      (now.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60);

    // 24時間以内: ペナルティ 1000（実質最後尾）
    // 24-48時間: ペナルティ 100
    // 48時間以上: ペナルティ 0
    if (hoursSinceCompletion < COMPLETION_COOLDOWN_HOURS) {
      return 1000;
    } else if (hoursSinceCompletion < COMPLETION_COOLDOWN_HOURS * 2) {
      return 100;
    }

    return 0;
  } catch (error) {
    console.error('Failed to calculate recommendation penalty:', error);
    return 0;
  }
}

/**
 * 統計情報を取得
 */
export function getCompletionStats(quizSetId: number): {
  totalCompletions: number;
  lastCompletedAt: Date | null;
  averageScore: number;
} {
  try {
    const history = getCompletionHistory();
    const completions = history.filter(c => c.quizSetId === quizSetId);

    if (completions.length === 0) {
      return {
        totalCompletions: 0,
        lastCompletedAt: null,
        averageScore: 0
      };
    }

    const totalScore = completions.reduce((sum, c) => sum + c.score, 0);
    const averageScore = totalScore / completions.length;
    const lastCompletedAt = completions.reduce((latest, c) =>
      c.completedAt > latest ? c.completedAt : latest,
      completions[0].completedAt
    );

    return {
      totalCompletions: completions.length,
      lastCompletedAt,
      averageScore
    };
  } catch (error) {
    console.error('Failed to get completion stats:', error);
    return {
      totalCompletions: 0,
      lastCompletedAt: null,
      averageScore: 0
    };
  }
}
