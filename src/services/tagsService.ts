// src/services/tagsService.ts
import { db } from '../lib/database';
import type { Problem } from '../types';

export interface TagWithCount {
  tag: string;
  count: number;
}

export interface ProblemWithStats {
  problem: Problem;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface TagStatistics {
  tag: string;
  problemCount: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  problems: ProblemWithStats[];
}

export const tagsService = {
  /**
   * 問題にタグを追加
   */
  async addTag(problemId: number, tag: string): Promise<void> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      throw new Error('タグは空にできません');
    }

    const problem = await db.problems.get(problemId);
    if (!problem) {
      throw new Error('問題が見つかりません');
    }

    const currentTags = problem.tags || [];

    // 重複チェック
    if (currentTags.includes(trimmedTag)) {
      return; // Already has this tag
    }

    await db.problems.update(problemId, {
      tags: [...currentTags, trimmedTag],
      taggedAt: new Date()
    });
  },

  /**
   * 問題からタグを削除
   */
  async removeTag(problemId: number, tag: string): Promise<void> {
    const problem = await db.problems.get(problemId);
    if (!problem) {
      throw new Error('問題が見つかりません');
    }

    const currentTags = problem.tags || [];
    const updatedTags = currentTags.filter(t => t !== tag);

    await db.problems.update(problemId, {
      tags: updatedTags,
      taggedAt: new Date()
    });
  },

  /**
   * 問題のタグを一括更新
   */
  async updateTags(problemId: number, tags: string[]): Promise<void> {
    const problem = await db.problems.get(problemId);
    if (!problem) {
      throw new Error('問題が見つかりません');
    }

    // 空文字列を除去、重複を削除
    const cleanedTags = [...new Set(tags.map(t => t.trim()).filter(t => t !== ''))];

    await db.problems.update(problemId, {
      tags: cleanedTags,
      taggedAt: new Date()
    });
  },

  /**
   * 全タグを使用頻度とともに取得
   */
  async getAllTags(): Promise<TagWithCount[]> {
    const allProblems = await db.problems.toArray();
    const tagCountMap = new Map<string, number>();

    allProblems.forEach(problem => {
      if (problem.tags) {
        problem.tags.forEach(tag => {
          tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
        });
      }
    });

    const tagCounts: TagWithCount[] = Array.from(tagCountMap.entries()).map(
      ([tag, count]) => ({ tag, count })
    );

    // 使用頻度で降順ソート
    return tagCounts.sort((a, b) => b.count - a.count);
  },

  /**
   * 指定したタグを持つ問題を取得
   * @param tags タグの配列
   * @param mode 'AND' (すべてのタグを持つ) or 'OR' (いずれかのタグを持つ)
   */
  async getByTags(tags: string[], mode: 'AND' | 'OR' = 'AND'): Promise<Problem[]> {
    if (tags.length === 0) {
      return [];
    }

    const allProblems = await db.problems.toArray();

    if (mode === 'AND') {
      // すべてのタグを持つ問題
      return allProblems.filter(problem => {
        if (!problem.tags) return false;
        return tags.every(tag => problem.tags!.includes(tag));
      });
    } else {
      // いずれかのタグを持つ問題
      return allProblems.filter(problem => {
        if (!problem.tags) return false;
        return tags.some(tag => problem.tags!.includes(tag));
      });
    }
  },

  /**
   * タグをリネーム（全問題）
   */
  async renameTag(oldTag: string, newTag: string): Promise<void> {
    const trimmedNewTag = newTag.trim();
    if (!trimmedNewTag) {
      throw new Error('新しいタグ名は空にできません');
    }

    const allProblems = await db.problems.toArray();
    const problemsToUpdate = allProblems.filter(p => p.tags?.includes(oldTag));

    await Promise.all(
      problemsToUpdate.map(problem => {
        const updatedTags = problem.tags!.map(t => (t === oldTag ? trimmedNewTag : t));
        return db.problems.update(problem.id!, {
          tags: updatedTags,
          taggedAt: new Date()
        });
      })
    );
  },

  /**
   * タグを削除（全問題から）
   */
  async deleteTag(tag: string): Promise<void> {
    const allProblems = await db.problems.toArray();
    const problemsToUpdate = allProblems.filter(p => p.tags?.includes(tag));

    await Promise.all(
      problemsToUpdate.map(problem => {
        const updatedTags = problem.tags!.filter(t => t !== tag);
        return db.problems.update(problem.id!, {
          tags: updatedTags,
          taggedAt: new Date()
        });
      })
    );
  },

  /**
   * 特定の問題のタグを取得
   */
  async getProblemTags(problemId: number): Promise<string[]> {
    const problem = await db.problems.get(problemId);
    return problem?.tags || [];
  },

  /**
   * タグ別の統計を取得
   */
  async getTagStatistics(): Promise<TagStatistics[]> {
    const allProblems = await db.problems.toArray();
    const allHistory = await db.history.toArray();

    const tagStatsMap = new Map<string, {
      problemCount: number;
      totalAttempts: number;
      correctAttempts: number;
      problemIds: Set<number>;
    }>();

    // すべての問題からタグを収集
    allProblems.forEach(problem => {
      if (problem.tags && problem.tags.length > 0 && problem.id) {
        problem.tags.forEach(tag => {
          if (!tagStatsMap.has(tag)) {
            tagStatsMap.set(tag, {
              problemCount: 0,
              totalAttempts: 0,
              correctAttempts: 0,
              problemIds: new Set()
            });
          }
          const stats = tagStatsMap.get(tag)!;
          stats.problemCount++;
          stats.problemIds.add(problem.id!);
        });
      }
    });

    // Historyから試行回数と正答数を計算
    allHistory.forEach(entry => {
      const problem = allProblems.find(p => p.id === entry.problemId);
      if (problem && problem.tags) {
        problem.tags.forEach(tag => {
          const stats = tagStatsMap.get(tag);
          if (stats) {
            stats.totalAttempts++;
            if (entry.isCorrect) {
              stats.correctAttempts++;
            }
          }
        });
      }
    });

    // 統計配列に変換して正答率を計算
    const tagStatistics: TagStatistics[] = Array.from(tagStatsMap.entries()).map(
      ([tag, stats]) => {
        // このタグを持つ問題のリストと各問題の統計を計算
        const problemsWithStats: ProblemWithStats[] = Array.from(stats.problemIds)
          .map(problemId => {
            const problem = allProblems.find(p => p.id === problemId);
            if (!problem) return null;

            // この問題の履歴を集計
            const problemHistory = allHistory.filter(h => h.problemId === problemId);
            const attempts = problemHistory.length;
            const correct = problemHistory.filter(h => h.isCorrect).length;
            const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

            return {
              problem,
              attempts,
              correct,
              accuracy
            };
          })
          .filter((p): p is ProblemWithStats => p !== null)
          // 正答率の低い順にソート
          .sort((a, b) => a.accuracy - b.accuracy);

        return {
          tag,
          problemCount: stats.problemCount,
          totalAttempts: stats.totalAttempts,
          correctAttempts: stats.correctAttempts,
          accuracy: stats.totalAttempts > 0
            ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
            : 0,
          problems: problemsWithStats
        };
      }
    );

    // 正答率の低い順にソート
    return tagStatistics.sort((a, b) => a.accuracy - b.accuracy);
  }
};
