import Dexie, { type Table } from 'dexie';
import type { Category, Problem, HistoryEntry, QuizSet, BackupData, QuizSession, StudyDiaryEntry, StudyGoal, AnswerAnalytics, SessionAnalytics, LearningPattern, ReliabilityAssessment, SpacedRepetitionCard, ReviewSession, QuizSetGroupName, StudyTimeSession } from '../types';
import type { CategoryStat } from '../types/weakness';
import type { Goal } from '../types/goal';
import type { NotificationHistory } from '../services/notificationService';

export class QuizAppDatabase extends Dexie {
    categories!: Table<Category>;
    problems!: Table<Problem>;
    history!: Table<HistoryEntry>;
    quizSets!: Table<QuizSet>;
    backups!: Table<BackupData>;
    quizSessions!: Table<QuizSession>;
    studyDiary!: Table<StudyDiaryEntry>;
    studyGoals!: Table<StudyGoal>;
    // 学習分析テーブル
    answerAnalytics!: Table<AnswerAnalytics>;
    sessionAnalytics!: Table<SessionAnalytics>;
    learningPatterns!: Table<LearningPattern>;
    reliabilityAssessments!: Table<ReliabilityAssessment>;
    // SM-2間隔反復テーブル
    spacedRepetitionCards!: Table<SpacedRepetitionCard>;
    reviewSessions!: Table<ReviewSession>;
    quizSetGroupNames!: Table<QuizSetGroupName>;
    // 学習時間トラッキング
    studyTimeSessions!: Table<StudyTimeSession>;
    // 弱点分析テーブル
    categoryStats!: Table<CategoryStat>;
    // 目標管理テーブル
    goals!: Table<Goal>;
    // 通知履歴テーブル
    notificationHistory!: Table<NotificationHistory>;

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

        this.version(4).stores({
            categories: 'name',
            problems: '++id, category, question, type',
            history: '++id, problemId, category, isCorrect, timestamp',
            quizSets: '++id, name, createdAt',
            backups: '++id, timestamp, type',
            quizSessions: '&id, quizSetId, category, isCompleted, isPaused',
            studyDiary: '++id, date, createdAt',
            studyGoals: '++id, isCompleted, createdAt, targetDate'
        });

        // 学習分析機能追加
        this.version(5).stores({
            categories: 'name',
            problems: '++id, category, question, type',
            history: '++id, problemId, category, isCorrect, timestamp',
            quizSets: '++id, name, createdAt',
            backups: '++id, timestamp, type',
            quizSessions: '&id, quizSetId, category, isCompleted, isPaused',
            studyDiary: '++id, date, createdAt',
            studyGoals: '++id, isCompleted, createdAt, targetDate',
            answerAnalytics: '++id, sessionId, problemId, answerStartTime, createdAt',
            sessionAnalytics: '++id, &sessionId, sessionStartTime, createdAt',
            learningPatterns: '++id, userId, lastUpdated',
            reliabilityAssessments: '++id, answerAnalyticsId, reliabilityScore, createdAt'
        });

        // SM-2間隔反復機能追加
        this.version(6).stores({
            categories: 'name',
            problems: '++id, category, question, type',
            history: '++id, problemId, category, isCorrect, timestamp',
            quizSets: '++id, name, createdAt',
            backups: '++id, timestamp, type',
            quizSessions: '&id, quizSetId, category, isCompleted, isPaused',
            studyDiary: '++id, date, createdAt',
            studyGoals: '++id, isCompleted, createdAt, targetDate',
            answerAnalytics: '++id, sessionId, problemId, answerStartTime, createdAt',
            sessionAnalytics: '++id, &sessionId, sessionStartTime, createdAt',
            learningPatterns: '++id, userId, lastUpdated',
            reliabilityAssessments: '++id, answerAnalyticsId, reliabilityScore, createdAt',
            spacedRepetitionCards: '++id, problemId, nextReviewDate, isDue, isNew, category',
            reviewSessions: '++id, &sessionId, startTime, createdAt'
        });

        // quizSetIdインデックス追加
        this.version(7).stores({
            categories: 'name',
            problems: '++id, category, question, type',
            history: '++id, problemId, category, isCorrect, timestamp',
            quizSets: '++id, name, createdAt',
            backups: '++id, timestamp, type',
            quizSessions: '&id, quizSetId, category, isCompleted, isPaused',
            studyDiary: '++id, date, createdAt',
            studyGoals: '++id, isCompleted, createdAt, targetDate',
            answerAnalytics: '++id, sessionId, problemId, answerStartTime, createdAt',
            sessionAnalytics: '++id, &sessionId, sessionStartTime, createdAt',
            learningPatterns: '++id, userId, lastUpdated',
            reliabilityAssessments: '++id, answerAnalyticsId, reliabilityScore, createdAt',
            spacedRepetitionCards: '++id, problemId, quizSetId, nextReviewDate, isDue, isNew, category',
            reviewSessions: '++id, &sessionId, startTime, createdAt'
        });

        // Version 8: Add name field to spacedRepetitionCards
        this.version(8).stores({
            categories: 'name',
            problems: '++id, category, question, type',
            history: '++id, problemId, category, isCorrect, timestamp',
            quizSets: '++id, name, createdAt',
            backups: '++id, timestamp, type',
            quizSessions: '&id, quizSetId, category, isCompleted, isPaused',
            studyDiary: '++id, date, createdAt',
            studyGoals: '++id, isCompleted, createdAt, targetDate',
            answerAnalytics: '++id, sessionId, problemId, answerStartTime, createdAt',
            sessionAnalytics: '++id, &sessionId, sessionStartTime, createdAt',
            learningPatterns: '++id, userId, lastUpdated',
            reliabilityAssessments: '++id, answerAnalyticsId, reliabilityScore, createdAt',
            spacedRepetitionCards: '++id, problemId, quizSetId, nextReviewDate, isDue, isNew, category, name',
            reviewSessions: '++id, &sessionId, startTime, createdAt'
        });

        // Version 9: Add quizSetGroupNames table for custom group names
        this.version(9).stores({
            categories: 'name',
            problems: '++id, category, question, type',
            history: '++id, problemId, category, isCorrect, timestamp',
            quizSets: '++id, name, createdAt',
            backups: '++id, timestamp, type',
            quizSessions: '&id, quizSetId, category, isCompleted, isPaused',
            studyDiary: '++id, date, createdAt',
            studyGoals: '++id, isCompleted, createdAt, targetDate',
            answerAnalytics: '++id, sessionId, problemId, answerStartTime, createdAt',
            sessionAnalytics: '++id, &sessionId, sessionStartTime, createdAt',
            learningPatterns: '++id, userId, lastUpdated',
            reliabilityAssessments: '++id, answerAnalyticsId, reliabilityScore, createdAt',
            spacedRepetitionCards: '++id, problemId, quizSetId, nextReviewDate, isDue, isNew, category, name',
            reviewSessions: '++id, &sessionId, startTime, createdAt',
            quizSetGroupNames: '++id, &quizSetId, createdAt'
        });

        // Version 10: Add studyTimeSessions table for learning time tracking
        this.version(10).stores({
            categories: 'name',
            problems: '++id, category, question, type',
            history: '++id, problemId, category, isCorrect, timestamp',
            quizSets: '++id, name, createdAt',
            backups: '++id, timestamp, type',
            quizSessions: '&id, quizSetId, category, isCompleted, isPaused',
            studyDiary: '++id, date, createdAt',
            studyGoals: '++id, isCompleted, createdAt, targetDate',
            answerAnalytics: '++id, sessionId, problemId, answerStartTime, createdAt',
            sessionAnalytics: '++id, &sessionId, sessionStartTime, createdAt',
            learningPatterns: '++id, userId, lastUpdated',
            reliabilityAssessments: '++id, answerAnalyticsId, reliabilityScore, createdAt',
            spacedRepetitionCards: '++id, problemId, quizSetId, nextReviewDate, isDue, isNew, category, name',
            reviewSessions: '++id, &sessionId, startTime, createdAt',
            quizSetGroupNames: '++id, &quizSetId, createdAt',
            studyTimeSessions: '++id, startTime, sessionType, quizSetId, category, createdAt'
        });

        // Version 11: Add categoryStats table for weakness detection
        this.version(11).stores({
            categories: 'name',
            problems: '++id, category, question, type',
            history: '++id, problemId, category, isCorrect, timestamp',
            quizSets: '++id, name, createdAt',
            backups: '++id, timestamp, type',
            quizSessions: '&id, quizSetId, category, isCompleted, isPaused',
            studyDiary: '++id, date, createdAt',
            studyGoals: '++id, isCompleted, createdAt, targetDate',
            answerAnalytics: '++id, sessionId, problemId, answerStartTime, createdAt',
            sessionAnalytics: '++id, &sessionId, sessionStartTime, createdAt',
            learningPatterns: '++id, userId, lastUpdated',
            reliabilityAssessments: '++id, answerAnalyticsId, reliabilityScore, createdAt',
            spacedRepetitionCards: '++id, problemId, quizSetId, nextReviewDate, isDue, isNew, category, name',
            reviewSessions: '++id, &sessionId, startTime, createdAt',
            quizSetGroupNames: '++id, &quizSetId, createdAt',
            studyTimeSessions: '++id, startTime, sessionType, quizSetId, category, createdAt',
            categoryStats: '++id, category, accuracy, lastStudyDate, analyzedAt'
        });

        // Version 12: Add goals table for goal management
        this.version(12).stores({
            categories: 'name',
            problems: '++id, category, question, type',
            history: '++id, problemId, category, isCorrect, timestamp',
            quizSets: '++id, name, createdAt',
            backups: '++id, timestamp, type',
            quizSessions: '&id, quizSetId, category, isCompleted, isPaused',
            studyDiary: '++id, date, createdAt',
            studyGoals: '++id, isCompleted, createdAt, targetDate',
            answerAnalytics: '++id, sessionId, problemId, answerStartTime, createdAt',
            sessionAnalytics: '++id, &sessionId, sessionStartTime, createdAt',
            learningPatterns: '++id, userId, lastUpdated',
            reliabilityAssessments: '++id, answerAnalyticsId, reliabilityScore, createdAt',
            spacedRepetitionCards: '++id, problemId, quizSetId, nextReviewDate, isDue, isNew, category, name',
            reviewSessions: '++id, &sessionId, startTime, createdAt',
            quizSetGroupNames: '++id, &quizSetId, createdAt',
            studyTimeSessions: '++id, startTime, sessionType, quizSetId, category, createdAt',
            categoryStats: '++id, category, accuracy, lastStudyDate, analyzedAt',
            goals: '++id, type, status, deadline, createdAt, updatedAt, category, quizSetId'
        });

        // Version 13: Add notificationHistory table for notification tracking
        this.version(13).stores({
            categories: 'name',
            problems: '++id, category, question, type',
            history: '++id, problemId, category, isCorrect, timestamp',
            quizSets: '++id, name, createdAt',
            backups: '++id, timestamp, type',
            quizSessions: '&id, quizSetId, category, isCompleted, isPaused',
            studyDiary: '++id, date, createdAt',
            studyGoals: '++id, isCompleted, createdAt, targetDate',
            answerAnalytics: '++id, sessionId, problemId, answerStartTime, createdAt',
            sessionAnalytics: '++id, &sessionId, sessionStartTime, createdAt',
            learningPatterns: '++id, userId, lastUpdated',
            reliabilityAssessments: '++id, answerAnalyticsId, reliabilityScore, createdAt',
            spacedRepetitionCards: '++id, problemId, quizSetId, nextReviewDate, isDue, isNew, category, name',
            reviewSessions: '++id, &sessionId, startTime, createdAt',
            quizSetGroupNames: '++id, &quizSetId, createdAt',
            studyTimeSessions: '++id, startTime, sessionType, quizSetId, category, createdAt',
            categoryStats: '++id, category, accuracy, lastStudyDate, analyzedAt',
            goals: '++id, type, status, deadline, createdAt, updatedAt, category, quizSetId',
            notificationHistory: '++id, type, sentAt, clicked, clickedAt'
        });

        // Version 14: Add compound indexes for performance optimization
        this.version(14).stores({
            categories: 'name',
            // Compound index for category queries: [category+type] for filtering
            problems: '++id, category, question, type, [category+type]',
            // Compound indexes for common history queries
            history: '++id, problemId, category, isCorrect, timestamp, [category+isCorrect], [problemId+timestamp], [timestamp+isCorrect]',
            quizSets: '++id, name, createdAt',
            backups: '++id, timestamp, type',
            quizSessions: '&id, quizSetId, category, isCompleted, isPaused, [quizSetId+isCompleted]',
            studyDiary: '++id, date, createdAt',
            studyGoals: '++id, isCompleted, createdAt, targetDate',
            // Compound index for session-based analytics queries
            answerAnalytics: '++id, sessionId, problemId, answerStartTime, createdAt, [sessionId+problemId]',
            sessionAnalytics: '++id, &sessionId, sessionStartTime, createdAt',
            learningPatterns: '++id, userId, lastUpdated',
            reliabilityAssessments: '++id, answerAnalyticsId, reliabilityScore, createdAt',
            // Compound indexes for spaced repetition filtering
            spacedRepetitionCards: '++id, problemId, quizSetId, nextReviewDate, isDue, isNew, category, name, [quizSetId+isDue], [quizSetId+nextReviewDate], [category+isDue]',
            reviewSessions: '++id, &sessionId, startTime, createdAt',
            quizSetGroupNames: '++id, &quizSetId, createdAt',
            // Compound indexes for time-based queries
            studyTimeSessions: '++id, startTime, sessionType, quizSetId, category, createdAt, [startTime+sessionType], [quizSetId+startTime], [category+startTime]',
            // Compound index for category statistics queries
            categoryStats: '++id, category, accuracy, lastStudyDate, analyzedAt, [category+analyzedAt]',
            // Compound indexes for goal filtering
            goals: '++id, type, status, deadline, createdAt, updatedAt, category, quizSetId, [status+deadline], [type+status], [category+status]',
            // Compound index for notification filtering
            notificationHistory: '++id, type, sentAt, clicked, clickedAt, [type+sentAt], [clicked+sentAt]'
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
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'ConstraintError') {
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

    async getPausedSessions(): Promise<QuizSession[]> {
        try {
            const allSessions = await db.quizSessions.toArray();
            return allSessions.filter(s => s.isPaused && !s.isCompleted);
        } catch (error) {
            console.warn('一時停止中のセッション読み込みエラー:', error);
            return [];
        }
    },

    async getAll(): Promise<QuizSession[]> {
        return await db.quizSessions.toArray();
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

    async clearAll(): Promise<void> {
        await db.quizSessions.clear();
    },

    generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * 同じ問題集またはカテゴリーの他のセッションを削除
     * 最新の途中保存のみを残すために使用
     */
    async deleteSimilarSessions(
        quizSetId: number | undefined,
        category: string | undefined,
        excludeSessionId: string
    ): Promise<number> {
        try {
            const allSessions = await db.quizSessions.toArray();
            const sessionsToDelete: string[] = [];

            for (const session of allSessions) {
                // 現在のセッションIDは除外
                if (session.id === excludeSessionId) continue;

                // 完了済みセッションは削除しない
                if (session.isCompleted) continue;

                // quizSetIdが一致する場合
                if (quizSetId !== undefined && session.quizSetId === quizSetId) {
                    sessionsToDelete.push(session.id);
                    console.log(`🗑️ Marking session for deletion (same quizSetId): ${session.id}`);
                    continue;
                }

                // カテゴリーが一致する場合（quizSetIdがない場合のみ）
                if (category && !quizSetId && !session.quizSetId && session.category === category) {
                    sessionsToDelete.push(session.id);
                    console.log(`🗑️ Marking session for deletion (same category): ${session.id}`);
                }
            }

            // 削除実行
            for (const sessionId of sessionsToDelete) {
                await db.quizSessions.delete(sessionId);
                console.log(`✅ Deleted old session: ${sessionId}`);
            }

            console.log(`📊 Deleted ${sessionsToDelete.length} old sessions`);
            return sessionsToDelete.length;
        } catch (error) {
            console.error('Failed to delete similar sessions:', error);
            return 0;
        }
    },

    /**
     * セッションを保存（重複する古いセッションを自動削除）
     */
    async saveWithCleanup(session: QuizSession): Promise<void> {
        // 同じ問題集/カテゴリーの古いセッションを削除
        await this.deleteSimilarSessions(session.quizSetId, session.category, session.id);

        // セッションを保存
        await db.quizSessions.put(session);

        console.log(`💾 Session saved with cleanup: ${session.id}`, {
            quizSetId: session.quizSetId,
            category: session.category,
            isPaused: session.isPaused
        });
    },

    /**
     * 既存の全セッションから重複を削除
     * 同じ問題集/カテゴリーの場合、最新のセッションのみを残す
     */
    async cleanupDuplicateSessions(): Promise<number> {
        try {
            const allSessions = await db.quizSessions.toArray();
            console.log(`🔍 Checking ${allSessions.length} sessions for duplicates...`);

            // 完了していないセッションのみを対象
            const activeSessions = allSessions.filter(s => !s.isCompleted);

            // 問題集ID別にグループ化
            const byQuizSet = new Map<number, QuizSession[]>();
            const byCategory = new Map<string, QuizSession[]>();
            const noIdentifier: QuizSession[] = [];

            for (const session of activeSessions) {
                if (session.quizSetId !== undefined) {
                    const sessions = byQuizSet.get(session.quizSetId) || [];
                    sessions.push(session);
                    byQuizSet.set(session.quizSetId, sessions);
                } else if (session.category) {
                    const sessions = byCategory.get(session.category) || [];
                    sessions.push(session);
                    byCategory.set(session.category, sessions);
                } else {
                    noIdentifier.push(session);
                }
            }

            const sessionsToDelete: string[] = [];

            // 問題集IDで重複をチェック
            for (const [quizSetId, sessions] of byQuizSet) {
                if (sessions.length > 1) {
                    // 最新のセッション以外を削除対象に
                    const sorted = sessions.sort((a, b) => {
                        const aTime = new Date(a.pausedAt || a.lastSaved || a.startTime).getTime();
                        const bTime = new Date(b.pausedAt || b.lastSaved || b.startTime).getTime();
                        return bTime - aTime;
                    });

                    // 最新以外を削除対象に追加
                    for (let i = 1; i < sorted.length; i++) {
                        sessionsToDelete.push(sorted[i].id);
                        console.log(`🗑️ Marking duplicate session for deletion (quizSetId: ${quizSetId}): ${sorted[i].id}`);
                    }
                }
            }

            // カテゴリーで重複をチェック
            for (const [category, sessions] of byCategory) {
                if (sessions.length > 1) {
                    // 最新のセッション以外を削除対象に
                    const sorted = sessions.sort((a, b) => {
                        const aTime = new Date(a.pausedAt || a.lastSaved || a.startTime).getTime();
                        const bTime = new Date(b.pausedAt || b.lastSaved || b.startTime).getTime();
                        return bTime - aTime;
                    });

                    // 最新以外を削除対象に追加
                    for (let i = 1; i < sorted.length; i++) {
                        sessionsToDelete.push(sorted[i].id);
                        console.log(`🗑️ Marking duplicate session for deletion (category: ${category}): ${sorted[i].id}`);
                    }
                }
            }

            // 削除実行
            for (const sessionId of sessionsToDelete) {
                await db.quizSessions.delete(sessionId);
            }

            console.log(`✅ Cleanup complete: ${sessionsToDelete.length} duplicate sessions removed`);
            return sessionsToDelete.length;
        } catch (error) {
            console.error('Failed to cleanup duplicate sessions:', error);
            return 0;
        }
    }
};

// 学習日記操作
export const studyDiaryService = {
    async create(entry: Omit<StudyDiaryEntry, 'id' | 'createdAt'>): Promise<number> {
        const newEntry: StudyDiaryEntry = {
            ...entry,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        return await db.studyDiary.add(newEntry);
    },

    async update(id: number, updates: Partial<StudyDiaryEntry>): Promise<void> {
        await db.studyDiary.update(id, {
            ...updates,
            updatedAt: new Date()
        });
    },

    async delete(id: number): Promise<void> {
        await db.studyDiary.delete(id);
    },

    async getAll(): Promise<StudyDiaryEntry[]> {
        return await db.studyDiary.orderBy('date').reverse().toArray();
    },

    async getById(id: number): Promise<StudyDiaryEntry | undefined> {
        return await db.studyDiary.get(id);
    },

    async getByDate(date: string): Promise<StudyDiaryEntry | undefined> {
        return await db.studyDiary.where('date').equals(date).first();
    },

    async getByDateRange(startDate: string, endDate: string): Promise<StudyDiaryEntry[]> {
        return await db.studyDiary
            .where('date')
            .between(startDate, endDate, true, true)
            .reverse()
            .sortBy('date');
    },

    async getRecentEntries(limit: number = 10): Promise<StudyDiaryEntry[]> {
        return await db.studyDiary
            .orderBy('createdAt')
            .reverse()
            .limit(limit)
            .toArray();
    }
};

// 学習目標操作
export const studyGoalsService = {
    async create(goal: Omit<StudyGoal, 'id' | 'createdAt'>): Promise<number> {
        const newGoal: StudyGoal = {
            ...goal,
            createdAt: new Date()
        };
        return await db.studyGoals.add(newGoal);
    },

    async update(id: number, updates: Partial<StudyGoal>): Promise<void> {
        await db.studyGoals.update(id, updates);
    },

    async delete(id: number): Promise<void> {
        await db.studyGoals.delete(id);
    },

    async getAll(): Promise<StudyGoal[]> {
        return await db.studyGoals.orderBy('createdAt').reverse().toArray();
    },

    async getActive(): Promise<StudyGoal[]> {
        return await db.studyGoals.where('isCompleted').equals(0 as any).toArray();
    },

    async getCompleted(): Promise<StudyGoal[]> {
        return await db.studyGoals.where('isCompleted').equals(1 as any).toArray();
    },

    async markCompleted(id: number): Promise<void> {
        await db.studyGoals.update(id, {
            isCompleted: true,
            completedAt: new Date()
        });
    }
};

// 学習分析サービス
export const learningAnalyticsService = {
    // 解答分析データの保存
    async recordAnswerAnalytics(data: Omit<AnswerAnalytics, 'id' | 'createdAt'>): Promise<number> {
        const analyticsData: AnswerAnalytics = {
            ...data,
            createdAt: new Date()
        };
        return await db.answerAnalytics.add(analyticsData);
    },

    // セッション分析データの保存
    async recordSessionAnalytics(data: Omit<SessionAnalytics, 'id' | 'createdAt'>): Promise<number> {
        const sessionData: SessionAnalytics = {
            ...data,
            createdAt: new Date()
        };
        return await db.sessionAnalytics.add(sessionData);
    },

    // 学習パターンの更新/作成
    async updateLearningPattern(userId: string, pattern: Omit<LearningPattern, 'id' | 'userId' | 'lastUpdated'>): Promise<void> {
        const existing = await db.learningPatterns.where('userId').equals(userId).first();
        const patternData: LearningPattern = {
            ...pattern,
            userId,
            lastUpdated: new Date()
        };

        if (existing && existing.id) {
            await db.learningPatterns.update(existing.id, { ...patternData, id: existing.id });
        } else {
            await db.learningPatterns.add(patternData);
        }
    },

    // 信頼性評価の保存
    async recordReliabilityAssessment(assessment: Omit<ReliabilityAssessment, 'id' | 'createdAt'>): Promise<number> {
        const assessmentData: ReliabilityAssessment = {
            ...assessment,
            createdAt: new Date()
        };
        return await db.reliabilityAssessments.add(assessmentData);
    },

    // セッションの解答分析データ取得
    async getSessionAnswerAnalytics(sessionId: string): Promise<AnswerAnalytics[]> {
        return await db.answerAnalytics.where('sessionId').equals(sessionId).toArray();
    },

    // 学習パターン取得
    async getLearningPattern(userId: string): Promise<LearningPattern | undefined> {
        return await db.learningPatterns.where('userId').equals(userId).first();
    },

    // 最近の解答データ取得（適当回答検出用）
    async getRecentAnswerAnalytics(limit: number = 100): Promise<AnswerAnalytics[]> {
        return await db.answerAnalytics
            .orderBy('createdAt')
            .reverse()
            .limit(limit)
            .toArray();
    },

    // 信頼性の高いデータのみ取得（重み付け統計用）
    async getReliableAnswerData(sessionId: string, minReliability: number = 0.7): Promise<{
        analytics: AnswerAnalytics;
        assessment: ReliabilityAssessment;
    }[]> {
        const analytics = await this.getSessionAnswerAnalytics(sessionId);
        const results = [];

        for (const analytic of analytics) {
            const assessment = await db.reliabilityAssessments
                .where('answerAnalyticsId')
                .equals(analytic.id!)
                .first();

            if (assessment && assessment.reliabilityScore >= minReliability) {
                results.push({ analytics: analytic, assessment });
            }
        }

        return results;
    }
};

// SM-2間隔反復サービス
export const spacedRepetitionService = {
    // カードの作成
    async createCard(card: Omit<SpacedRepetitionCard, 'id'>): Promise<number> {
        return await db.spacedRepetitionCards.add(card);
    },

    // 問題IDでカードを取得
    async getCardByProblemId(problemId: number): Promise<SpacedRepetitionCard | undefined> {
        return await db.spacedRepetitionCards.where('problemId').equals(problemId).first();
    },

    // 問題ID + quizSetIdでカードを取得（コンテキスト別管理用）
    async getCardByProblemAndQuizSet(
        problemId: number,
        quizSetId?: number
    ): Promise<SpacedRepetitionCard | undefined> {
        const cards = await db.spacedRepetitionCards.where('problemId').equals(problemId).toArray();
        return cards.find(card => card.quizSetId === quizSetId);
    },

    // カードの更新
    async updateCard(card: SpacedRepetitionCard): Promise<void> {
        if (!card.id) {
            throw new Error('Card ID is required for update');
        }
        await db.spacedRepetitionCards.put(card);
    },

    // 復習対象のカードを取得
    async getDueCards(limit: number = 20): Promise<SpacedRepetitionCard[]> {
        const now = new Date();
        return await db.spacedRepetitionCards
            .where('nextReviewDate')
            .belowOrEqual(now)
            .limit(limit)
            .toArray();
    },

    // 指定された問題集内の復習対象カードを取得
    async getDueCardsByQuizSet(quizSetId: number, limit: number = 20): Promise<SpacedRepetitionCard[]> {
        const now = new Date();
        const cards = await db.spacedRepetitionCards
            .where('nextReviewDate')
            .belowOrEqual(now)
            .toArray();

        return cards
            .filter(card => card.quizSetId === quizSetId)
            .slice(0, limit);
    },

    // 指定されたカテゴリーの復習対象カードを取得
    async getDueCardsByCategory(category: string, limit: number = 20): Promise<SpacedRepetitionCard[]> {
        const now = new Date();
        const cards = await db.spacedRepetitionCards
            .where('nextReviewDate')
            .belowOrEqual(now)
            .toArray();

        return cards
            .filter(card => card.category === category)
            .slice(0, limit);
    },

    // すべてのカードを取得
    async getAllCards(): Promise<SpacedRepetitionCard[]> {
        return await db.spacedRepetitionCards.toArray();
    },

    async getNewCards(category?: string, limit: number = 20): Promise<SpacedRepetitionCard[]> {
        let collection = db.spacedRepetitionCards.filter(card => !!card.isNew);
        if (category) {
            collection = collection.filter(card => card.category === category);
        }
        return await collection.limit(limit).toArray();
    },

    async getLearningCards(category?: string, limit: number = 20): Promise<SpacedRepetitionCard[]> {
        let collection = db.spacedRepetitionCards.filter(card => !!card.isNew || (card.interval !== undefined && card.interval <= 3));
        if (category) {
            collection = collection.filter(card => card.category === category);
        }
        return await collection.limit(limit).toArray();
    },

    /**
     * 記憶ステージ別の統計情報を取得
     * SM-2アルゴリズムに基づく4段階の記憶定着度を集計
     */
    async getMemoryStageStats(): Promise<{
        acquisition: number;    // 短期記憶 (0-2 reps)
        consolidation: number;  // 移行期 (3-5 reps)
        storage: number;        // 長期記憶 (6-8 reps)
        automaticity: number;   // 手続き記憶 (9+ reps)
    }> {
        const allCards = await db.spacedRepetitionCards.toArray();

        const stats = {
            acquisition: 0,
            consolidation: 0,
            storage: 0,
            automaticity: 0
        };

        allCards.forEach(card => {
            const reps = card.repetitions || 0;

            if (reps <= 2) {
                stats.acquisition++;
            } else if (reps <= 5) {
                stats.consolidation++;
            } else if (reps <= 8) {
                stats.storage++;
            } else {
                stats.automaticity++;
            }
        });

        return stats;
    },

    /**
     * カードステータス別の統計情報を取得
     * 科学的基準に基づくマスター状態を判定
     */
    async getCardStatusStats(): Promise<{
        new: number;        // 新規カード
        learning: number;   // 学習中 (acquisition段階)
        reviewing: number;  // 復習中 (consolidation/storage段階)
        retained: number;   // 定着済み (高信頼度、マスター一歩手前)
        mastered: number;   // マスター済み (8+ reps, 90%+ accuracy, 160+ days)
    }> {
        // sm2Algorithm.tsから関数をインポートして使用する必要があるため、
        // ここでは基本的な統計のみ提供し、詳細な判定は呼び出し側で行う
        const allCards = await db.spacedRepetitionCards.toArray();

        const stats = {
            new: 0,
            learning: 0,
            reviewing: 0,
            retained: 0,
            mastered: 0
        };

        allCards.forEach(card => {
            const reps = card.repetitions || 0;
            const accuracy = card.accuracy || 0;
            const interval = card.interval || 0;

            // Mastered: 8+ reps, 90%+ accuracy, 160+ days interval
            if (reps >= 8 && accuracy >= 90 && interval >= 160) {
                stats.mastered++;
            }
            // Retained: 8+ reps, 60+ days, but not mastered
            else if (reps >= 8 && interval >= 60) {
                stats.retained++;
            }
            // New: isNew flag or 0 reps
            else if (card.isNew || reps === 0) {
                stats.new++;
            }
            // Learning: acquisition stage (0-2 reps)
            else if (reps <= 2) {
                stats.learning++;
            }
            // Reviewing: consolidation/storage stages (3-8 reps)
            else {
                stats.reviewing++;
            }
        });

        return stats;
    },

    /**
     * スペースドリピティション全体の統計を取得
     */
    async getSROverallStats(): Promise<{
        totalCards: number;
        dueToday: number;
        overdueCards: number;
        averageAccuracy: number;
        averageInterval: number;
        totalReviews: number;
    }> {
        const allCards = await db.spacedRepetitionCards.toArray();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let dueToday = 0;
        let overdueCards = 0;
        let totalAccuracy = 0;
        let totalInterval = 0;
        let totalReviews = 0;

        allCards.forEach(card => {
            // Due today
            const nextReview = new Date(card.nextReviewDate);
            nextReview.setHours(0, 0, 0, 0);

            if (nextReview.getTime() === now.getTime()) {
                dueToday++;
            } else if (nextReview < now) {
                overdueCards++;
            }

            // Averages
            totalAccuracy += card.accuracy || 0;
            totalInterval += card.interval || 0;
            totalReviews += card.totalReviews || 0;
        });

        const totalCards = allCards.length;

        return {
            totalCards,
            dueToday,
            overdueCards,
            averageAccuracy: totalCards > 0 ? totalAccuracy / totalCards : 0,
            averageInterval: totalCards > 0 ? totalInterval / totalCards : 0,
            totalReviews
        };
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

        // N日前の日付を計算（ローカルタイムゾーン）
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

        const dailyStats = new Map<string, {
            totalAnswered: number;
            totalCorrect: number;
        }>();

        history.forEach(entry => {
            // timestampを確実にDateに変換
            let entryDate: Date;

            if (entry.timestamp instanceof Date) {
                entryDate = entry.timestamp;
            } else if (typeof entry.timestamp === 'string' || typeof entry.timestamp === 'number') {
                entryDate = new Date(entry.timestamp);
            } else {
                console.warn('Unknown timestamp format:', entry.timestamp);
                return;
            }

            // 無効な日付をスキップ
            if (isNaN(entryDate.getTime())) {
                console.warn('Invalid date:', entry.timestamp);
                return;
            }

            // ローカルタイムゾーンで日付文字列を生成
            const dateStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;

            // 日付フィルタリング（文字列比較）
            if (dateStr < startDateStr) {
                return;
            }

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
            .sort((a, b) => a.date.localeCompare(b.date));
    },

    async getQuizSetCategoryWorstProblems(quizSetId: number, category: string, limit: number = 10, useLatestOnly: boolean = true): Promise<Array<{
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

        // この問題集の指定カテゴリーの問題のみをフィルタ
        const quizSetProblems = problems.filter(p =>
            p.id &&
            quizSet.problemIds.includes(p.id) &&
            p.category === category
        );
        const quizSetHistory = history.filter(entry =>
            quizSet.problemIds.includes(entry.problemId) &&
            entry.category === category
        );

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
            .filter(item => item !== null && (useLatestOnly || item.totalAnswered >= 2))
            .sort((a, b) => a!.accuracy - b!.accuracy)
            .slice(0, limit) as Array<{
                problem: Problem;
                incorrectCount: number;
                totalAnswered: number;
                accuracy: number;
            }>;

        return worstProblems;
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
    },

    async getWorstProblemsByQuizSet(quizSetId: number, limit: number = 10): Promise<Array<{
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
        const quizSetProblems = problems.filter(p =>
            p.id && quizSet.problemIds.includes(p.id)
        );
        const quizSetHistory = history.filter(entry =>
            quizSet.problemIds.includes(entry.problemId)
        );

        // 各問題の統計を計算
        const problemStats = quizSetProblems.map(problem => {
            const problemHistory = quizSetHistory.filter(entry => entry.problemId === problem.id);
            const totalAnswered = problemHistory.length;
            const totalCorrect = problemHistory.filter(entry => entry.isCorrect).length;
            const incorrectCount = totalAnswered - totalCorrect;
            const accuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered * 100) : 0;

            return {
                problem,
                incorrectCount,
                totalAnswered,
                accuracy
            };
        });

        // 間違いが多い順にソート（同数の場合は正解率の低い順）
        return problemStats
            .filter(stat => stat.totalAnswered > 0)
            .sort((a, b) => {
                if (a.incorrectCount !== b.incorrectCount) {
                    return b.incorrectCount - a.incorrectCount;
                }
                return a.accuracy - b.accuracy;
            })
            .slice(0, limit);
    },

    async getWorstProblemsByCategory(category: string, limit: number = 10): Promise<Array<{
        problem: Problem;
        incorrectCount: number;
        totalAnswered: number;
        accuracy: number;
    }>> {
        const [history, problems] = await Promise.all([
            db.history.toArray(),
            db.problems.where('category').equals(category).toArray()
        ]);

        // 各問題の統計を計算
        const problemStats = problems.map(problem => {
            const problemHistory = history.filter(entry => entry.problemId === problem.id);
            const totalAnswered = problemHistory.length;
            const totalCorrect = problemHistory.filter(entry => entry.isCorrect).length;
            const incorrectCount = totalAnswered - totalCorrect;
            const accuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered * 100) : 0;

            return {
                problem,
                incorrectCount,
                totalAnswered,
                accuracy
            };
        });

        // 間違いが多い順にソート（同数の場合は正解率の低い順）
        return problemStats
            .filter(stat => stat.totalAnswered > 0)
            .sort((a, b) => {
                if (a.incorrectCount !== b.incorrectCount) {
                    return b.incorrectCount - a.incorrectCount;
                }
                return a.accuracy - b.accuracy;
            })
            .slice(0, limit);
    },

    async getProblemsByQuizSetId(quizSetId: number): Promise<Problem[]> {
        return await db.problems.where('quizSetId').equals(quizSetId).toArray();
    },

    async getProblemStats(problemId: number): Promise<{
        totalAnswered: number;
        totalCorrect: number;
        incorrectCount: number;
        accuracy: number;
    }> {
        const history = await db.history.where('problemId').equals(problemId).toArray();
        const totalAnswered = history.length;
        const totalCorrect = history.filter(entry => entry.isCorrect).length;
        const incorrectCount = totalAnswered - totalCorrect;
        const accuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered * 100) : 0;

        return {
            totalAnswered,
            totalCorrect,
            incorrectCount,
            accuracy
        };
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

// データベースリセット
export const resetDatabase = async (): Promise<void> => {
    await db.transaction('rw', [db.problems, db.categories, db.history, db.quizSets, db.studyDiary, db.studyGoals, db.quizSessions], async () => {
        await Promise.all([
            db.problems.clear(),
            db.categories.clear(),
            db.history.clear(),
            db.quizSets.clear(),
            db.studyDiary.clear(),
            db.studyGoals.clear(),
            db.quizSessions.clear()
        ]);
    });
};
