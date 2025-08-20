import Dexie, { type Table } from 'dexie';
import type { Category, Problem, HistoryEntry, QuizSet, BackupData, QuizSession } from '../types';

export class QuizAppDatabase extends Dexie {
  categories!: Table<Category>;
  problems!: Table<Problem>;
  history!: Table<HistoryEntry>;
  quizSets!: Table<QuizSet>;
  backups!: Table<BackupData>;
  quizSessions!: Table<QuizSession>;

  constructor() {
    super('QuizAppDB');
    
    this.version(1).stores({
      categories: 'name',
      problems: '++id, category, question, type',
      history: '++id, problemId, category, isCorrect, timestamp',
      quizSets: '++id, name, createdAt',
      backups: '++id, timestamp, type'
    });
    
    this.version(2).stores({
      categories: 'name',
      problems: '++id, category, question, type',
      history: '++id, problemId, category, isCorrect, timestamp',
      quizSets: '++id, name, createdAt',
      backups: '++id, timestamp, type'
    });
    
    this.version(3).stores({
      categories: 'name',
      problems: '++id, category, question, type',
      history: '++id, problemId, category, isCorrect, timestamp',
      quizSets: '++id, name, createdAt',
      backups: '++id, timestamp, type',
      quizSessions: '&id, quizSetId, category, isCompleted, isPaused'
    });
  }
}

export const db = new QuizAppDatabase();

// カテゴリー操作
export const categoryService = {
  async add(name: string): Promise<void> {
    if (!name || name.trim() === '') {
      throw new Error('カテゴリー名が無効です');
    }
    
    try {
      await db.categories.add({ name: name.trim() });
    } catch (error: any) {
      if (error.name === 'ConstraintError') {
        console.log(`カテゴリー "${name}" は既に存在します`);
        return;
      }
      throw error;
    }
  },

  async getAll(): Promise<string[]> {
    const categories = await db.categories.toArray();
    return categories.map(cat => cat.name);
  },

  async delete(name: string): Promise<void> {
    await db.categories.delete(name);
  }
};

// 問題操作
export const problemService = {
  async add(problem: Omit<Problem, 'id'>): Promise<number> {
    if (!this.validateProblem(problem)) {
      throw new Error('問題データが無効です');
    }
    
    return await db.problems.add(problem);
  },

  async update(problem: Problem): Promise<void> {
    if (!problem.id || !this.validateProblem(problem)) {
      throw new Error('問題データが無効です');
    }
    
    await db.problems.put(problem);
  },

  async delete(id: number): Promise<void> {
    await db.problems.delete(id);
  },

  async getAll(): Promise<Problem[]> {
    return await db.problems.toArray();
  },

  async getByCategory(category: string): Promise<Problem[]> {
    return await db.problems.where('category').equals(category).toArray();
  },

  async getById(id: number): Promise<Problem | undefined> {
    return await db.problems.get(id);
  },

  async getByIds(ids: number[]): Promise<Problem[]> {
    return await db.problems.where('id').anyOf(ids).toArray();
  },

  validateProblem(problem: Omit<Problem, 'id'>): boolean {
    if (!problem.category || !problem.question || !problem.explanation) {
      return false;
    }
    
    if (problem.type === 'multiple-choice') {
      return Array.isArray(problem.options) && 
             problem.options.length >= 2 &&
             typeof problem.correctAnswer === 'number' &&
             problem.correctAnswer >= 0 &&
             problem.correctAnswer < problem.options.length;
    } else {
      return typeof problem.answer === 'boolean';
    }
  }
};

// 履歴操作
export const historyService = {
  async add(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> {
    const historyEntry: Omit<HistoryEntry, 'id'> = {
      ...entry,
      timestamp: new Date()
    };
    
    await db.history.add(historyEntry);
  },

  async getAll(): Promise<HistoryEntry[]> {
    return await db.history.orderBy('timestamp').reverse().toArray();
  },

  async getByCategory(category: string): Promise<HistoryEntry[]> {
    return await db.history
      .where('category')
      .equals(category)
      .reverse()
      .sortBy('timestamp');
  },

  async getIncorrectProblemIds(): Promise<number[]> {
    const allEntries = await db.history.toArray();
    const incorrectEntries = allEntries.filter(entry => entry.isCorrect === false);
    
    const uniqueIds = [...new Set(incorrectEntries.map(entry => entry.problemId))];
    return uniqueIds;
  },

  async clear(): Promise<void> {
    await db.history.clear();
  },

  async getDetailedHistory(limit: number = 100, offset: number = 0): Promise<Array<{
    entry: HistoryEntry;
    problem: Problem | null;
    quizSet: QuizSet | null;
  }>> {
    const history = await db.history
      .orderBy('timestamp')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();

    const problemIds = [...new Set(history.map(entry => entry.problemId))];
    const problems = await db.problems.where('id').anyOf(problemIds).toArray();
    const quizSets = await db.quizSets.toArray();

    return history.map(entry => {
      const problem = problems.find(p => p.id === entry.problemId) || null;
      const quizSet = problem ? quizSets.find(qs => qs.problemIds.includes(entry.problemId)) || null : null;
      
      return {
        entry,
        problem,
        quizSet
      };
    });
  },

  async getHistoryByDateRange(startDate: Date, endDate: Date): Promise<HistoryEntry[]> {
    return await db.history
      .where('timestamp')
      .between(startDate, endDate, true, true)
      .reverse()
      .sortBy('timestamp');
  },

  async getHistoryByProblemId(problemId: number): Promise<HistoryEntry[]> {
    return await db.history
      .where('problemId')
      .equals(problemId)
      .reverse()
      .sortBy('timestamp');
  },

  async deleteHistoryEntry(id: number): Promise<void> {
    await db.history.delete(id);
  },

  async getHistoryStats(): Promise<{
    totalEntries: number;
    correctEntries: number;
    incorrectEntries: number;
    accuracy: number;
    categoriesAnswered: number;
    firstAnswer: Date | null;
    lastAnswer: Date | null;
  }> {
    const allHistory = await db.history.toArray();
    const totalEntries = allHistory.length;
    const correctEntries = allHistory.filter(entry => entry.isCorrect).length;
    const incorrectEntries = totalEntries - correctEntries;
    const accuracy = totalEntries > 0 ? (correctEntries / totalEntries * 100) : 0;
    
    const categories = new Set(allHistory.map(entry => entry.category));
    const categoriesAnswered = categories.size;
    
    const timestamps = allHistory.map(entry => entry.timestamp.getTime());
    const firstAnswer = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
    const lastAnswer = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

    return {
      totalEntries,
      correctEntries,
      incorrectEntries,
      accuracy,
      categoriesAnswered,
      firstAnswer,
      lastAnswer
    };
  }
};

// 問題集操作
export const quizSetService = {
  async save(quizSet: Omit<QuizSet, 'id'> | QuizSet): Promise<number> {
    if (!quizSet.name || !Array.isArray(quizSet.problemIds)) {
      throw new Error('問題集データが無効です');
    }

    const now = new Date();
    const setWithTimestamps = {
      ...quizSet,
      createdAt: quizSet.createdAt || now,
      updatedAt: now
    };

    if ('id' in quizSet && quizSet.id) {
      await db.quizSets.put(setWithTimestamps);
      return quizSet.id;
    } else {
      return await db.quizSets.add(setWithTimestamps);
    }
  },

  async getAll(): Promise<QuizSet[]> {
    return await db.quizSets.orderBy('name').toArray();
  },

  async getById(id: number): Promise<QuizSet | undefined> {
    return await db.quizSets.get(id);
  },

  async delete(id: number): Promise<void> {
    await db.quizSets.delete(id);
  },

  async updateStats(quizSetId: number, subject: string | null, totalAnswered: number, totalCorrect: number): Promise<void> {
    const quizSet = await db.quizSets.get(quizSetId);
    if (!quizSet) {
      throw new Error('問題集が見つかりません');
    }

    if (!quizSet.stats) {
      quizSet.stats = {};
    }

    const key = subject || 'overall';
    quizSet.stats[key] = {
      totalAnswered,
      totalCorrect,
      lastPlayed: new Date(),
      accuracy: totalAnswered > 0 ? (totalCorrect / totalAnswered * 100) : 0
    };

    await db.quizSets.put(quizSet);
  }
};

// バックアップ操作
export const backupService = {
  async create(type: 'auto' | 'manual' = 'manual'): Promise<number> {
    const [categories, problems, history, quizSets] = await Promise.all([
      db.categories.toArray(),
      db.problems.toArray(),
      db.history.toArray(),
      db.quizSets.toArray()
    ]);

    const backupData: Omit<BackupData, 'id'> = {
      timestamp: new Date(),
      data: {
        categories,
        problems,
        history,
        quizSets
      },
      type,
      version: '1.0.0'
    };

    return await db.backups.add(backupData);
  },

  async getAll(): Promise<BackupData[]> {
    return await db.backups.orderBy('timestamp').reverse().toArray();
  },

  async restore(backupId: number): Promise<void> {
    const backup = await db.backups.get(backupId);
    if (!backup) {
      throw new Error('バックアップが見つかりません');
    }

    await db.transaction('rw', db.categories, db.problems, db.history, db.quizSets, async () => {
      await db.categories.clear();
      await db.problems.clear();
      await db.history.clear();
      await db.quizSets.clear();

      await db.categories.bulkAdd(backup.data.categories);
      await db.problems.bulkAdd(backup.data.problems);
      await db.history.bulkAdd(backup.data.history);
      await db.quizSets.bulkAdd(backup.data.quizSets);
    });
  },

  async delete(id: number): Promise<void> {
    await db.backups.delete(id);
  },

  async cleanupOldBackups(maxGenerations: number = 3): Promise<void> {
    const backups = await db.backups
      .where('type')
      .equals('auto')
      .reverse()
      .sortBy('timestamp');
    
    if (backups.length > maxGenerations) {
      const toDelete = backups.slice(maxGenerations);
      await Promise.all(toDelete.map(backup => backup.id ? this.delete(backup.id) : Promise.resolve()));
    }
  }
};

// クイズセッション操作
export const quizSessionService = {
  async save(session: QuizSession): Promise<void> {
    await db.quizSessions.put(session);
  },

  async getById(id: string): Promise<QuizSession | undefined> {
    return await db.quizSessions.get(id);
  },

  async getActiveSessions(): Promise<QuizSession[]> {
    try {
      return await db.quizSessions
        .where('isCompleted')
        .equals(0 as any)
        .toArray();
    } catch (error) {
      console.warn('セッション読み込みエラー、空の配列を返します:', error);
      return [];
    }
  },

  async delete(id: string): Promise<void> {
    await db.quizSessions.delete(id);
  },

  async clearCompleted(): Promise<void> {
    await db.quizSessions
      .where('isCompleted')
      .equals(1 as any)
      .delete();
  },

  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// データベース初期化
export const initializeDatabase = async (): Promise<void> => {
  try {
    await db.open();
    console.log('データベースが正常に初期化されました');
    
    // テスト用：問題数を確認
    const problemCount = await db.problems.count();
    const categoryCount = await db.categories.count();
    console.log(`現在の問題数: ${problemCount}, カテゴリ数: ${categoryCount}`);
  } catch (error) {
    console.error('データベースの初期化に失敗しました:', error);
    throw error;
  }
};

// 統計データ取得
export const statisticsService = {
  async getOverallStats(): Promise<{
    totalProblems: number;
    totalCategories: number;
    totalQuizSets: number;
    totalAnswered: number;
    totalCorrect: number;
    overallAccuracy: number;
  }> {
    const [problems, categories, quizSets, history] = await Promise.all([
      db.problems.count(),
      db.categories.count(),
      db.quizSets.count(),
      db.history.toArray()
    ]);

    const totalAnswered = history.length;
    const totalCorrect = history.filter(entry => entry.isCorrect).length;
    const overallAccuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered * 100) : 0;

    return {
      totalProblems: problems,
      totalCategories: categories,
      totalQuizSets: quizSets,
      totalAnswered,
      totalCorrect,
      overallAccuracy
    };
  },

  async getCategoryStats(): Promise<Array<{
    category: string;
    totalAnswered: number;
    totalCorrect: number;
    accuracy: number;
    problemCount: number;
  }>> {
    const [history, problems] = await Promise.all([
      db.history.toArray(),
      db.problems.toArray()
    ]);

    const categoryMap = new Map<string, {
      totalAnswered: number;
      totalCorrect: number;
      problemCount: number;
    }>();

    // 問題数をカウント
    problems.forEach(problem => {
      if (!categoryMap.has(problem.category)) {
        categoryMap.set(problem.category, {
          totalAnswered: 0,
          totalCorrect: 0,
          problemCount: 0
        });
      }
      categoryMap.get(problem.category)!.problemCount++;
    });

    // 履歴をカウント
    history.forEach(entry => {
      if (!categoryMap.has(entry.category)) {
        categoryMap.set(entry.category, {
          totalAnswered: 0,
          totalCorrect: 0,
          problemCount: 0
        });
      }
      const stats = categoryMap.get(entry.category)!;
      stats.totalAnswered++;
      if (entry.isCorrect) {
        stats.totalCorrect++;
      }
    });

    return Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      totalAnswered: stats.totalAnswered,
      totalCorrect: stats.totalCorrect,
      accuracy: stats.totalAnswered > 0 ? (stats.totalCorrect / stats.totalAnswered * 100) : 0,
      problemCount: stats.problemCount
    })).sort((a, b) => b.totalAnswered - a.totalAnswered);
  },

  async getWorstProblems(limit: number = 10): Promise<Array<{
    problem: Problem;
    incorrectCount: number;
    totalAnswered: number;
    accuracy: number;
  }>> {
    const [history, problems] = await Promise.all([
      db.history.toArray(),
      db.problems.toArray()
    ]);

    const problemStats = new Map<number, {
      incorrectCount: number;
      totalAnswered: number;
    }>();

    history.forEach(entry => {
      if (!problemStats.has(entry.problemId)) {
        problemStats.set(entry.problemId, {
          incorrectCount: 0,
          totalAnswered: 0
        });
      }
      const stats = problemStats.get(entry.problemId)!;
      stats.totalAnswered++;
      if (!entry.isCorrect) {
        stats.incorrectCount++;
      }
    });

    const worstProblems = Array.from(problemStats.entries())
      .map(([problemId, stats]) => {
        const problem = problems.find(p => p.id === problemId);
        if (!problem) return null;
        
        return {
          problem,
          incorrectCount: stats.incorrectCount,
          totalAnswered: stats.totalAnswered,
          accuracy: stats.totalAnswered > 0 ? ((stats.totalAnswered - stats.incorrectCount) / stats.totalAnswered * 100) : 100
        };
      })
      .filter(item => item !== null && item.totalAnswered >= 2) // 2回以上回答された問題のみ
      .sort((a, b) => a!.accuracy - b!.accuracy) // 正答率の低い順
      .slice(0, limit) as Array<{
        problem: Problem;
        incorrectCount: number;
        totalAnswered: number;
        accuracy: number;
      }>;

    return worstProblems;
  },

  async getQuizSetStats(): Promise<Array<{
    quizSet: QuizSet;
    totalAnswered: number;
    totalCorrect: number;
    accuracy: number;
    lastPlayed?: Date;
  }>> {
    const [quizSets, history] = await Promise.all([
      db.quizSets.toArray(),
      db.history.toArray()
    ]);

    return quizSets.map(quizSet => {
      const quizSetHistory = history.filter(entry => 
        quizSet.problemIds.includes(entry.problemId)
      );

      const totalAnswered = quizSetHistory.length;
      const totalCorrect = quizSetHistory.filter(entry => entry.isCorrect).length;
      const accuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered * 100) : 0;
      
      const lastPlayed = quizSetHistory.length > 0 
        ? new Date(Math.max(...quizSetHistory.map(entry => entry.timestamp.getTime())))
        : undefined;

      return {
        quizSet,
        totalAnswered,
        totalCorrect,
        accuracy,
        lastPlayed
      };
    }).sort((a, b) => b.totalAnswered - a.totalAnswered);
  },

  async getRecentActivity(days: number = 7): Promise<Array<{
    date: string;
    totalAnswered: number;
    totalCorrect: number;
    accuracy: number;
  }>> {
    const history = await db.history.toArray();
    const now = new Date();
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    const dailyStats = new Map<string, {
      totalAnswered: number;
      totalCorrect: number;
    }>();

    history
      .filter(entry => entry.timestamp >= startDate)
      .forEach(entry => {
        const dateStr = entry.timestamp.toISOString().split('T')[0];
        if (!dailyStats.has(dateStr)) {
          dailyStats.set(dateStr, {
            totalAnswered: 0,
            totalCorrect: 0
          });
        }
        const stats = dailyStats.get(dateStr)!;
        stats.totalAnswered++;
        if (entry.isCorrect) {
          stats.totalCorrect++;
        }
      });

    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        totalAnswered: stats.totalAnswered,
        totalCorrect: stats.totalCorrect,
        accuracy: stats.totalAnswered > 0 ? (stats.totalCorrect / stats.totalAnswered * 100) : 0
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  async getQuizSetWorstProblems(quizSetId: number, limit: number = 10, useLatestOnly: boolean = true): Promise<Array<{
    problem: Problem;
    incorrectCount: number;
    totalAnswered: number;
    accuracy: number;
  }>> {
    const [quizSet, history, problems] = await Promise.all([
      db.quizSets.get(quizSetId),
      db.history.toArray(),
      db.problems.toArray()
    ]);

    if (!quizSet) return [];

    // この問題集の問題のみをフィルタ
    const quizSetProblems = problems.filter(p => p.id && quizSet.problemIds.includes(p.id));
    const quizSetHistory = history.filter(entry => quizSet.problemIds.includes(entry.problemId));

    const problemStats = new Map<number, {
      incorrectCount: number;
      totalAnswered: number;
    }>();

    if (useLatestOnly) {
      // 最新の回答履歴から間違えた問題を取得
      const problemAnswers = new Map<number, { isCorrect: boolean; count: number }>();
      const sortedHistory = quizSetHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      for (const entry of sortedHistory) {
        if (!problemAnswers.has(entry.problemId)) {
          problemAnswers.set(entry.problemId, { isCorrect: entry.isCorrect, count: 1 });
        } else {
          problemAnswers.get(entry.problemId)!.count++;
        }
      }
      
      // 最新で間違えた問題のみを対象とする
      for (const [problemId, { isCorrect, count }] of problemAnswers) {
        if (!isCorrect) {
          problemStats.set(problemId, {
            incorrectCount: 1,
            totalAnswered: count
          });
        }
      }
    } else {
      // 全履歴から統計を計算
      quizSetHistory.forEach(entry => {
        if (!problemStats.has(entry.problemId)) {
          problemStats.set(entry.problemId, {
            incorrectCount: 0,
            totalAnswered: 0
          });
        }
        const stats = problemStats.get(entry.problemId)!;
        stats.totalAnswered++;
        if (!entry.isCorrect) {
          stats.incorrectCount++;
        }
      });
    }

    const worstProblems = Array.from(problemStats.entries())
      .map(([problemId, stats]) => {
        const problem = quizSetProblems.find(p => p.id === problemId);
        if (!problem) return null;
        
        return {
          problem,
          incorrectCount: stats.incorrectCount,
          totalAnswered: stats.totalAnswered,
          accuracy: stats.totalAnswered > 0 ? ((stats.totalAnswered - stats.incorrectCount) / stats.totalAnswered * 100) : 100
        };
      })
      .filter(item => item !== null && (useLatestOnly || item.totalAnswered >= 2)) // 最新版では1回以上、全履歴版では2回以上
      .sort((a, b) => a!.accuracy - b!.accuracy) // 正答率の低い順
      .slice(0, limit) as Array<{
        problem: Problem;
        incorrectCount: number;
        totalAnswered: number;
        accuracy: number;
      }>;

    return worstProblems;
  }
};

// デバッグ用：データベースをリセット
export const resetDatabase = async (): Promise<void> => {
  try {
    await db.delete();
    await db.open();
    console.log('データベースをリセットしました');
  } catch (error) {
    console.error('データベースのリセットに失敗しました:', error);
    throw error;
  }
};