/**
 * Sync Service - データ同期システム
 *
 * IndexedDB（ローカル）とFirestore（クラウド）間のデータ同期を管理する。
 * オフライン優先の設計で、オンライン時に自動同期を行う。
 *
 * 同期戦略:
 * - ローカル優先: オフライン時はローカルのみ変更
 * - オンライン時: ローカル変更をクラウドにアップロード
 * - クラウド優先: クラウドの変更をローカルにダウンロード
 * - 衝突解決: 最新のタイムスタンプが優先
 *
 * マイグレーション:
 * - アノニマスデータ（ログイン前）をログイン後にクラウドに移行
 * - 既存ユーザーのデータを自動検出して復元
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirestore_, isFirebaseConfigured } from './firebaseConfig';
import { authService } from './authService';
import { db } from '../lib/database';

// ============================================================
// 型定義
// ============================================================

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingUploads: number;
  pendingDownloads: number;
  syncError: string | null;
}

export interface MigrationResult {
  problems: number;
  quizSets: number;
  history: number;
  studyPlans: number;
  userProgress: number;
  unlockedBadges: number;
  streakRecords: number;
  spacedRepetitionCards: number;
  studyTimeSessions: number;
  studyDiary: number;
  totalRecords: number;
  success: boolean;
  error?: string;
}

const SYNC_STATUS_KEY = 'minguella_sync_status';
const MIGRATION_DONE_KEY = 'minguella_migration_v2_done_';

// ============================================================
// ローカルストレージヘルパー
// ============================================================

function loadSyncStatus(): SyncStatus {
  try {
    const raw = localStorage.getItem(SYNC_STATUS_KEY);
    if (!raw) {
      return { isOnline: navigator.onLine, lastSyncTime: null, pendingUploads: 0, pendingDownloads: 0, syncError: null };
    }
    const data = JSON.parse(raw);
    return {
      ...data,
      lastSyncTime: data.lastSyncTime ? new Date(data.lastSyncTime) : null,
    };
  } catch {
    return { isOnline: navigator.onLine, lastSyncTime: null, pendingUploads: 0, pendingDownloads: 0, syncError: null };
  }
}

function saveSyncStatus(status: Partial<SyncStatus>): void {
  try {
    const current = loadSyncStatus();
    const updated = { ...current, ...status };
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
  } catch {
    // 無視
  }
}

function isMigrationDone(uid: string): boolean {
  return localStorage.getItem(MIGRATION_DONE_KEY + uid) === 'true';
}

function markMigrationDone(uid: string): void {
  localStorage.setItem(MIGRATION_DONE_KEY + uid, 'true');
}

// ============================================================
// SyncService クラス
// ============================================================

class SyncService {
  /**
   * 同期が可能か確認（Firebase設定済み + ログイン済み）
   */
  canSync(): boolean {
    return isFirebaseConfigured() && authService.isSignedIn();
  }

  /**
   * 現在の同期ステータスを取得
   */
  getStatus(): SyncStatus {
    return loadSyncStatus();
  }

  // ============================================================
  // アノニマスデータマイグレーション
  // ============================================================

  /**
   * アノニマスデータをFirestoreにマイグレートする
   *
   * ログイン直後に呼び出し、ローカルのデータを
   * ユーザー固有のFirestoreコレクションにコピーする。
   *
   * @returns マイグレーション結果
   */
  async migrateAnonymousData(): Promise<MigrationResult> {
    const user = authService.getCurrentUser();
    if (!user) {
      return { problems: 0, quizSets: 0, history: 0, studyPlans: 0, userProgress: 0, unlockedBadges: 0, streakRecords: 0, spacedRepetitionCards: 0, studyTimeSessions: 0, studyDiary: 0, totalRecords: 0, success: false, error: 'ログインが必要です' };
    }

    // 既に移行済みの場合はスキップ
    if (isMigrationDone(user.uid)) {
      return { problems: 0, quizSets: 0, history: 0, studyPlans: 0, userProgress: 0, unlockedBadges: 0, streakRecords: 0, spacedRepetitionCards: 0, studyTimeSessions: 0, studyDiary: 0, totalRecords: 0, success: true, error: '既に移行済みです' };
    }

    if (!isFirebaseConfigured()) {
      return { problems: 0, quizSets: 0, history: 0, studyPlans: 0, userProgress: 0, unlockedBadges: 0, streakRecords: 0, spacedRepetitionCards: 0, studyTimeSessions: 0, studyDiary: 0, totalRecords: 0, success: false, error: 'Firebase未設定' };
    }

    try {
      const firestore = getFirestore_();
      const uid = user.uid;

      // ローカルデータ取得
      const [problems, quizSets, history, studyPlans,
             userProgressData, unlockedBadgesData, streakRecordsData,
             srCards, studySessions, diaryEntries] = await Promise.all([
        db.problems.toArray(),
        db.quizSets.toArray(),
        db.history.toArray(),
        db.studyPlans.toArray(),
        db.userProgress.get(1).catch(() => null),
        db.unlockedBadges.toArray().catch(() => []),
        db.streakRecords.toArray().catch(() => []),
        db.spacedRepetitionCards.toArray().catch(() => []),
        db.studyTimeSessions.toArray().catch(() => []),
        db.studyDiary.toArray().catch(() => []),
      ]);

      const migratedAt = new Date().toISOString();

      // 全操作を配列に集める（バッチ分割のため）
      type BatchOp = { path: string; data: Record<string, unknown> };
      const allOperations: BatchOp[] = [];

      // Problems
      problems.forEach((problem, idx) => {
        allOperations.push({
          path: `users/${uid}/problems/${String(problem.id || idx)}`,
          data: { ...problem, migratedAt },
        });
      });

      // QuizSets
      quizSets.forEach((qs, idx) => {
        allOperations.push({
          path: `users/${uid}/quizSets/${String(qs.id || idx)}`,
          data: {
            ...qs,
            createdAt: qs.createdAt?.toISOString?.() || qs.createdAt,
            updatedAt: qs.updatedAt?.toISOString?.() || qs.updatedAt,
            migratedAt,
          },
        });
      });

      // History (全件)
      history.forEach((entry, idx) => {
        allOperations.push({
          path: `users/${uid}/history/${String(entry.id || idx)}`,
          data: {
            ...entry,
            timestamp: entry.timestamp?.toISOString?.() || entry.timestamp,
            migratedAt,
          },
        });
      });

      // StudyPlans
      studyPlans.forEach((plan, idx) => {
        allOperations.push({
          path: `users/${uid}/studyPlans/${String(plan.id || idx)}`,
          data: {
            ...plan,
            examDate: plan.examDate?.toISOString?.() || plan.examDate,
            createdAt: plan.createdAt?.toISOString?.() || plan.createdAt,
            updatedAt: plan.updatedAt?.toISOString?.() || plan.updatedAt,
            migratedAt,
          },
        });
      });

      // UserProfile (ユーザー名など)
      const userName = localStorage.getItem('userName');
      if (userName) {
        allOperations.push({
          path: `users/${uid}/userProfile/main`,
          data: { userName, migratedAt },
        });
      }

      // UserProgress (シングルトン)
      if (userProgressData) {
        allOperations.push({
          path: `users/${uid}/userProgress/1`,
          data: {
            ...userProgressData,
            updatedAt: userProgressData.updatedAt?.toISOString?.() || userProgressData.updatedAt,
            migratedAt,
          },
        });
      }

      // UnlockedBadges
      unlockedBadgesData.forEach((badge) => {
        allOperations.push({
          path: `users/${uid}/unlockedBadges/${badge.badgeId}`,
          data: {
            ...badge,
            unlockedAt: badge.unlockedAt?.toISOString?.() || badge.unlockedAt,
            migratedAt,
          },
        });
      });

      // StreakRecords
      streakRecordsData.forEach((record) => {
        allOperations.push({
          path: `users/${uid}/streakRecords/${record.date}`,
          data: { ...record, migratedAt },
        });
      });

      // SpacedRepetitionCards
      srCards.forEach((card) => {
        allOperations.push({
          path: `users/${uid}/spacedRepetitionCards/${String(card.id)}`,
          data: {
            ...card,
            nextReviewDate: card.nextReviewDate?.toISOString?.() || card.nextReviewDate,
            lastReviewDate: card.lastReviewDate?.toISOString?.() || card.lastReviewDate,
            createdAt: card.createdAt?.toISOString?.() || card.createdAt,
            updatedAt: card.updatedAt?.toISOString?.() || card.updatedAt,
            migratedAt,
          },
        });
      });

      // StudyTimeSessions (最新200件のみ)
      const recentSessions = studySessions.slice(-200);
      recentSessions.forEach((session) => {
        allOperations.push({
          path: `users/${uid}/studyTimeSessions/${String(session.id)}`,
          data: {
            ...session,
            startTime: session.startTime?.toISOString?.() || session.startTime,
            endTime: session.endTime?.toISOString?.() || session.endTime,
            createdAt: session.createdAt?.toISOString?.() || session.createdAt,
            migratedAt,
          },
        });
      });

      // StudyDiary
      diaryEntries.forEach((entry) => {
        allOperations.push({
          path: `users/${uid}/studyDiary/${entry.date || String(entry.id)}`,
          data: {
            ...entry,
            createdAt: entry.createdAt?.toISOString?.() || entry.createdAt,
            updatedAt: entry.updatedAt?.toISOString?.() || entry.updatedAt,
            migratedAt,
          },
        });
      });

      // バッチ分割して書き込み（Firestore制限: 500件/バッチ）
      const BATCH_SIZE = 490;
      for (let i = 0; i < allOperations.length; i += BATCH_SIZE) {
        const batchOps = allOperations.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(firestore);
        for (const op of batchOps) {
          batch.set(doc(firestore, op.path), op.data);
        }
        await batch.commit();
      }

      // 移行完了マーカー
      markMigrationDone(uid);
      saveSyncStatus({ lastSyncTime: new Date() });

      const totalRecords = allOperations.length;
      console.log(`[Sync] マイグレーション完了: ${totalRecords} レコード`);

      return {
        problems: problems.length,
        quizSets: quizSets.length,
        history: history.length,
        studyPlans: studyPlans.length,
        userProgress: userProgressData ? 1 : 0,
        unlockedBadges: unlockedBadgesData.length,
        streakRecords: streakRecordsData.length,
        spacedRepetitionCards: srCards.length,
        studyTimeSessions: recentSessions.length,
        studyDiary: diaryEntries.length,
        totalRecords,
        success: true,
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'マイグレーション失敗';
      console.error('[Sync] マイグレーションエラー:', error);
      saveSyncStatus({ syncError: errorMsg });

      return {
        problems: 0, quizSets: 0, history: 0, studyPlans: 0,
        userProgress: 0, unlockedBadges: 0, streakRecords: 0,
        spacedRepetitionCards: 0, studyTimeSessions: 0, studyDiary: 0,
        totalRecords: 0, success: false, error: errorMsg,
      };
    }
  }

  // ============================================================
  // 増分同期
  // ============================================================

  /**
   * ローカルの変更をFirestoreにアップロード
   *
   * @param entityType - 同期対象エンティティタイプ
   * @param entityId   - エンティティID
   * @param data       - アップロードするデータ
   * @param operation  - 'set' | 'delete'
   */
  async uploadChange(
    entityType: string,
    entityId: string | number,
    data: Record<string, unknown> | null,
    operation: 'set' | 'delete'
  ): Promise<void> {
    if (!this.canSync()) return;

    const user = authService.getCurrentUser();
    if (!user) return;

    try {
      const firestore = getFirestore_();
      const docRef = doc(firestore, `users/${user.uid}/${entityType}`, String(entityId));

      if (operation === 'delete') {
        await deleteDoc(docRef);
      } else if (data) {
        await setDoc(docRef, {
          ...data,
          _syncedAt: new Date().toISOString(),
        });
      }

      saveSyncStatus({ lastSyncTime: new Date(), syncError: null });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'アップロード失敗';
      console.error('[Sync] アップロードエラー:', error);
      saveSyncStatus({ syncError: errorMsg });
    }
  }

  /**
   * Firestoreからデータをダウンロード
   *
   * @param entityType - 同期対象エンティティタイプ
   * @returns ダウンロードされたデータの配列
   */
  async downloadData(entityType: string): Promise<Record<string, unknown>[]> {
    if (!this.canSync()) return [];

    const user = authService.getCurrentUser();
    if (!user) return [];

    try {
      const firestore = getFirestore_();
      const colRef = collection(firestore, `users/${user.uid}/${entityType}`);
      const snapshot = await getDocs(colRef);

      const data: Record<string, unknown>[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });

      return data;
    } catch (error: unknown) {
      console.error('[Sync] ダウンロードエラー:', error);
      return [];
    }
  }

  // ============================================================
  // 双方向同期（Firestore → IndexedDB）
  // ============================================================

  /**
   * Firestoreの新規・更新データをIndexedDBに取り込む。
   * アプリ起動時に呼び出し、API経由で追加されたデータを反映する。
   *
   * 戦略:
   * - Firestoreにあって、ローカルにないデータ → 追加
   * - Firestoreの方が新しいデータ → 上書き
   * - ローカルにのみ存在するデータ → そのまま保持
   */
  async pullFromFirestore(): Promise<{
    problems: number;
    quizSets: number;
    history: number;
    userProgress: number;
    unlockedBadges: number;
    streakRecords: number;
    spacedRepetitionCards: number;
    studyTimeSessions: number;
    studyDiary: number;
    success: boolean;
    error?: string;
  }> {
    const emptyResult = { problems: 0, quizSets: 0, history: 0, userProgress: 0, unlockedBadges: 0, streakRecords: 0, spacedRepetitionCards: 0, studyTimeSessions: 0, studyDiary: 0 };
    if (!this.canSync()) {
      return { ...emptyResult, success: false, error: '同期不可' };
    }

    const user = authService.getCurrentUser();
    if (!user) {
      return { ...emptyResult, success: false, error: 'ログインが必要です' };
    }

    try {
      const firestore = getFirestore_();
      const uid = user.uid;
      let newProblems = 0;
      let newQuizSets = 0;

      // --- Problems ---
      const problemsSnapshot = await getDocs(collection(firestore, `users/${uid}/problems`));
      const localProblems = await db.problems.toArray();

      // ローカルの問題をquestion+categoryで重複チェック（IDは異なるため内容で比較）
      const localProblemKeys = new Set(
        localProblems.map((p) => `${p.category}::${p.question}`)
      );

      // Firestore doc ID → ローカルの新しいID のマッピング（QuizSet用）
      const firestoreToLocalIdMap = new Map<string, number>();

      // 既存のローカル問題のFirestore IDマッピングも構築
      localProblems.forEach((p) => {
        if (p.id !== undefined) {
          firestoreToLocalIdMap.set(String(p.id), p.id);
        }
      });

      const categoriesToAdd = new Set<string>();

      for (const docSnap of problemsSnapshot.docs) {
        const data = docSnap.data();
        const firestoreId = docSnap.id;
        const key = `${data.category || ''}::${data.question || ''}`;

        // ローカルに同じ内容の問題が存在しない場合 → 追加
        if (!localProblemKeys.has(key)) {
          const problem: Record<string, unknown> = {
            category: data.category || '',
            question: data.question || '',
            explanation: data.explanation || '',
            type: data.type || 'true-false',
          };

          // オプショナルフィールドを追加
          if (data.answer !== undefined) problem.answer = data.answer;
          if (data.options) problem.options = data.options;
          if (data.correctAnswer !== undefined) problem.correctAnswer = data.correctAnswer;
          if (data.correctAnswers) problem.correctAnswers = data.correctAnswers;
          if (data.tags) problem.tags = data.tags;
          if (data.subtopic) problem.subtopic = data.subtopic;
          if (data.importanceScore) problem.importanceScore = data.importanceScore;
          if (data.sourceExamYear) problem.sourceExamYear = data.sourceExamYear;
          if (data.sourceExamName) problem.sourceExamName = data.sourceExamName;

          const newLocalId = await db.problems.add(problem as unknown as import('../types').Problem);
          firestoreToLocalIdMap.set(firestoreId, newLocalId);
          newProblems++;

          // カテゴリを登録リストに追加
          if (data.category) {
            categoriesToAdd.add(data.category);
          }

          // ローカルキーセットを更新（重複防止）
          localProblemKeys.add(key);
        }
      }

      // カテゴリをIndexedDBに登録
      for (const categoryName of categoriesToAdd) {
        try {
          await db.categories.add({ name: categoryName });
        } catch {
          // 既に存在する場合は無視（ConstraintError）
        }
      }

      // --- QuizSets ---
      const quizSetsSnapshot = await getDocs(collection(firestore, `users/${uid}/quizSets`));
      const localQuizSets = await db.quizSets.toArray();
      // 名前で重複チェック
      const localQuizSetNames = new Set(localQuizSets.map((qs) => qs.name));

      for (const docSnap of quizSetsSnapshot.docs) {
        const data = docSnap.data();

        if (!localQuizSetNames.has(data.name)) {
          // Firestoreの問題IDをローカルIDに変換
          const firestoreProblemIds = (data.problemIds || []) as string[];
          const localProblemIds: number[] = [];

          for (const fid of firestoreProblemIds) {
            const localId = firestoreToLocalIdMap.get(fid);
            if (localId !== undefined) {
              localProblemIds.push(localId);
            }
          }

          const quizSet: Record<string, unknown> = {
            name: data.name || '',
            problemIds: localProblemIds,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
          };

          if (data.description) quizSet.description = data.description;
          if (data.subjects) quizSet.subjects = data.subjects;

          await db.quizSets.add(quizSet as unknown as import('../types').QuizSet);
          newQuizSets++;
          localQuizSetNames.add(data.name);
        }
      }

      // --- History ---
      let newHistory = 0;
      try {
        const historySnapshot = await getDocs(collection(firestore, `users/${uid}/history`));
        const localHistory = await db.history.toArray();
        // timestamp+category+problemIdで重複チェック
        const localHistoryKeys = new Set(
          localHistory.map(h => `${h.timestamp?.toISOString?.() || h.timestamp}::${h.category || ''}::${h.problemId || ''}`)
        );

        for (const docSnap of historySnapshot.docs) {
          const data = docSnap.data();
          const ts = data.timestamp || '';
          const key = `${ts}::${data.category || ''}::${data.problemId || ''}`;
          if (!localHistoryKeys.has(key)) {
            const entry: Record<string, unknown> = {
              category: data.category || '',
              question: data.question || '',
              userAnswer: data.userAnswer,
              correctAnswer: data.correctAnswer,
              isCorrect: data.isCorrect ?? false,
              timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
              problemId: data.problemId,
              quizSetId: data.quizSetId,
              explanation: data.explanation,
              options: data.options,
            };
            await db.history.add(entry as unknown as import('../types').HistoryEntry);
            newHistory++;
            localHistoryKeys.add(key);
          }
        }
      } catch (e) { console.warn('[Sync] History pull error:', e); }

      // --- UserProfile (ユーザー名) ---
      try {
        const profileDoc = await getDoc(doc(firestore, `users/${uid}/userProfile/main`));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          if (profileData.userName) {
            const localName = localStorage.getItem('userName');
            // ローカルにデフォルト名しかない場合はFirestoreから復元
            if (!localName || localName === 'ユーザー' || localName === 'User' || localName === '田中 太郎') {
              localStorage.setItem('userName', profileData.userName);
              console.log('[Sync] UserProfile restored:', profileData.userName);
            }
          }
        }
      } catch (e) { console.warn('[Sync] UserProfile pull error:', e); }

      // --- UserProgress (シングルトン) ---
      let newUserProgress = 0;
      try {
        const upSnapshot = await getDocs(collection(firestore, `users/${uid}/userProgress`));
        if (!upSnapshot.empty) {
          const remoteData = upSnapshot.docs[0].data();
          const localProgress = await db.userProgress.get(1).catch(() => null);

          if (!localProgress) {
            await db.userProgress.put({
              id: 1 as const,
              totalXP: remoteData.totalXP || 0,
              level: remoteData.level || 1,
              currentStreak: remoteData.currentStreak || 0,
              longestStreak: remoteData.longestStreak || 0,
              lastStudyDate: remoteData.lastStudyDate || '',
              totalPerfectQuizzes: remoteData.totalPerfectQuizzes || 0,
              consecutivePerfectQuizzes: remoteData.consecutivePerfectQuizzes || 0,
              updatedAt: remoteData.updatedAt ? new Date(remoteData.updatedAt) : new Date(),
            });
            newUserProgress = 1;
          } else {
            const remoteUpdated = remoteData.updatedAt ? new Date(remoteData.updatedAt).getTime() : 0;
            const localUpdated = localProgress.updatedAt ? localProgress.updatedAt.getTime() : 0;
            if (remoteUpdated > localUpdated) {
              await db.userProgress.put({
                id: 1 as const,
                totalXP: Math.max(localProgress.totalXP, remoteData.totalXP || 0),
                level: Math.max(localProgress.level, remoteData.level || 1),
                currentStreak: remoteData.currentStreak ?? localProgress.currentStreak,
                longestStreak: Math.max(localProgress.longestStreak, remoteData.longestStreak || 0),
                lastStudyDate: (remoteData.lastStudyDate || '') > (localProgress.lastStudyDate || '')
                  ? remoteData.lastStudyDate : localProgress.lastStudyDate,
                totalPerfectQuizzes: Math.max(localProgress.totalPerfectQuizzes, remoteData.totalPerfectQuizzes || 0),
                consecutivePerfectQuizzes: remoteData.consecutivePerfectQuizzes ?? localProgress.consecutivePerfectQuizzes,
                updatedAt: new Date(),
              });
              newUserProgress = 1;
            }
          }
        }
      } catch (e) { console.warn('[Sync] UserProgress pull error:', e); }

      // --- UnlockedBadges ---
      let newBadges = 0;
      try {
        const badgesSnapshot = await getDocs(collection(firestore, `users/${uid}/unlockedBadges`));
        const localBadges = await db.unlockedBadges.toArray();
        const localBadgeIds = new Set(localBadges.map(b => b.badgeId));

        for (const docSnap of badgesSnapshot.docs) {
          const data = docSnap.data();
          if (data.badgeId && !localBadgeIds.has(data.badgeId)) {
            await db.unlockedBadges.add({
              badgeId: data.badgeId,
              unlockedAt: data.unlockedAt ? new Date(data.unlockedAt) : new Date(),
              notified: true,
            });
            newBadges++;
            localBadgeIds.add(data.badgeId);
          }
        }
      } catch (e) { console.warn('[Sync] UnlockedBadges pull error:', e); }

      // --- StreakRecords ---
      let newStreaks = 0;
      try {
        const streaksSnapshot = await getDocs(collection(firestore, `users/${uid}/streakRecords`));
        const localStreaks = await db.streakRecords.toArray();
        const localStreakDates = new Set(localStreaks.map(s => s.date));

        for (const docSnap of streaksSnapshot.docs) {
          const data = docSnap.data();
          const date = data.date || docSnap.id;
          if (!localStreakDates.has(date)) {
            await db.streakRecords.add({ date });
            newStreaks++;
            localStreakDates.add(date);
          }
        }
      } catch (e) { console.warn('[Sync] StreakRecords pull error:', e); }

      // --- SpacedRepetitionCards ---
      let newCards = 0;
      try {
        const cardsSnapshot = await getDocs(collection(firestore, `users/${uid}/spacedRepetitionCards`));
        const localCards = await db.spacedRepetitionCards.toArray();
        const localCardKeys = new Set(
          localCards.map(c => `${c.problemId}::${c.quizSetId || ''}`)
        );

        for (const docSnap of cardsSnapshot.docs) {
          const data = docSnap.data();
          const key = `${data.problemId}::${data.quizSetId || ''}`;
          if (!localCardKeys.has(key)) {
            await db.spacedRepetitionCards.add({
              problemId: data.problemId,
              quizSetId: data.quizSetId,
              name: data.name || '',
              easinessFactor: data.easinessFactor || 2.5,
              repetitions: data.repetitions || 0,
              interval: data.interval || 0,
              nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : new Date(),
              lastReviewDate: data.lastReviewDate ? new Date(data.lastReviewDate) : undefined,
              totalReviews: data.totalReviews || 0,
              correctReviews: data.correctReviews || 0,
              accuracy: data.accuracy || 0,
              isNew: data.isNew ?? true,
              isDue: data.isDue ?? true,
              isLearning: data.isLearning ?? true,
              memoryStage: data.memoryStage,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
              updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
              category: data.category,
            } as any);
            newCards++;
            localCardKeys.add(key);
          }
        }
      } catch (e) { console.warn('[Sync] SpacedRepetitionCards pull error:', e); }

      // --- StudyTimeSessions ---
      let newSessions = 0;
      try {
        const sessionsSnapshot = await getDocs(collection(firestore, `users/${uid}/studyTimeSessions`));
        const localSessions = await db.studyTimeSessions.toArray();
        const localSessionStarts = new Set(
          localSessions.map(s => s.startTime?.toISOString?.() || String(s.startTime))
        );

        for (const docSnap of sessionsSnapshot.docs) {
          const data = docSnap.data();
          if (data.startTime && !localSessionStarts.has(data.startTime)) {
            await db.studyTimeSessions.add({
              startTime: new Date(data.startTime),
              endTime: data.endTime ? new Date(data.endTime) : undefined,
              duration: data.duration || 0,
              problemCount: data.problemCount || 0,
              correctCount: data.correctCount || 0,
              quizSetId: data.quizSetId,
              category: data.category,
              sessionType: data.sessionType || 'quiz',
              isPaused: data.isPaused || false,
              pausedDuration: data.pausedDuration,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            } as any);
            newSessions++;
            localSessionStarts.add(data.startTime);
          }
        }
      } catch (e) { console.warn('[Sync] StudyTimeSessions pull error:', e); }

      // --- StudyDiary ---
      let newDiary = 0;
      try {
        const diarySnapshot = await getDocs(collection(firestore, `users/${uid}/studyDiary`));
        const localDiary = await db.studyDiary.toArray();
        const localDiaryDates = new Set(localDiary.map(d => d.date));

        for (const docSnap of diarySnapshot.docs) {
          const data = docSnap.data();
          const date = data.date || docSnap.id;
          if (!localDiaryDates.has(date)) {
            await db.studyDiary.add({
              date,
              title: data.title || '',
              content: data.content || '',
              mood: data.mood,
              studyTime: data.studyTime,
              topics: data.topics || [],
              achievements: data.achievements || [],
              challenges: data.challenges || [],
              goals: data.goals || [],
              quizSessionIds: data.quizSessionIds,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
              updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
            } as any);
            newDiary++;
            localDiaryDates.add(date);
          }
        }
      } catch (e) { console.warn('[Sync] StudyDiary pull error:', e); }

      saveSyncStatus({ lastSyncTime: new Date(), syncError: null });
      console.log(`[Sync] Pull完了: Problems +${newProblems}, QuizSets +${newQuizSets}, History +${newHistory}, UserProgress +${newUserProgress}, Badges +${newBadges}, Streaks +${newStreaks}, Cards +${newCards}, Sessions +${newSessions}, Diary +${newDiary}`);

      return {
        problems: newProblems,
        quizSets: newQuizSets,
        history: newHistory,
        userProgress: newUserProgress,
        unlockedBadges: newBadges,
        streakRecords: newStreaks,
        spacedRepetitionCards: newCards,
        studyTimeSessions: newSessions,
        studyDiary: newDiary,
        success: true,
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Pull同期失敗';
      console.error('[Sync] Pull同期エラー:', error);
      saveSyncStatus({ syncError: errorMsg });
      return { ...emptyResult, success: false, error: errorMsg };
    }
  }

  /**
   * 双方向同期: アップロード（ローカル→Firestore）+ ダウンロード（Firestore→ローカル）
   */
  async fullSync(): Promise<{
    uploaded: MigrationResult;
    downloaded: { problems: number; quizSets: number; success: boolean; error?: string };
  }> {
    // 1. ローカル → Firestore（マイグレーション）
    const uploaded = await this.migrateAnonymousData();
    // 2. Firestore → ローカル（Pull）
    const downloaded = await this.pullFromFirestore();
    return { uploaded, downloaded };
  }

  /**
   * 単一ドキュメントの取得
   */
  async getDocument(entityType: string, entityId: string): Promise<Record<string, unknown> | null> {
    if (!this.canSync()) return null;

    const user = authService.getCurrentUser();
    if (!user) return null;

    try {
      const firestore = getFirestore_();
      const docRef = doc(firestore, `users/${user.uid}/${entityType}`, entityId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
      return null;
    } catch (error: unknown) {
      console.error('[Sync] ドキュメント取得エラー:', error);
      return null;
    }
  }

  /**
   * ユーザー名をFirestoreに同期
   */
  async syncUserName(userName: string): Promise<void> {
    if (!this.canSync()) return;
    await this.uploadChange('userProfile', 'main', { userName, updatedAt: new Date().toISOString() }, 'set');
  }
}

export const syncService = new SyncService();
