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
  totalRecords: number;
  success: boolean;
  error?: string;
}

const SYNC_STATUS_KEY = 'minguella_sync_status';
const MIGRATION_DONE_KEY = 'minguella_migration_done_';

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
      return { problems: 0, quizSets: 0, history: 0, studyPlans: 0, totalRecords: 0, success: false, error: 'ログインが必要です' };
    }

    // 既に移行済みの場合はスキップ
    if (isMigrationDone(user.uid)) {
      return { problems: 0, quizSets: 0, history: 0, studyPlans: 0, totalRecords: 0, success: true, error: '既に移行済みです' };
    }

    if (!isFirebaseConfigured()) {
      return { problems: 0, quizSets: 0, history: 0, studyPlans: 0, totalRecords: 0, success: false, error: 'Firebase未設定' };
    }

    try {
      const firestore = getFirestore_();
      const uid = user.uid;

      // ローカルデータ取得
      const [problems, quizSets, history, studyPlans] = await Promise.all([
        db.problems.toArray(),
        db.quizSets.toArray(),
        db.history.toArray(),
        db.studyPlans.toArray(),
      ]);

      // バッチ書き込み
      const batch = writeBatch(firestore);

      // Problems
      problems.forEach((problem, idx) => {
        const docRef = doc(firestore, `users/${uid}/problems`, String(problem.id || idx));
        batch.set(docRef, {
          ...problem,
          migratedAt: new Date().toISOString(),
        });
      });

      // QuizSets
      quizSets.forEach((qs, idx) => {
        const docRef = doc(firestore, `users/${uid}/quizSets`, String(qs.id || idx));
        batch.set(docRef, {
          ...qs,
          createdAt: qs.createdAt?.toISOString?.() || qs.createdAt,
          updatedAt: qs.updatedAt?.toISOString?.() || qs.updatedAt,
          migratedAt: new Date().toISOString(),
        });
      });

      // History (最新100件のみ移行してバイト数を抑制)
      const recentHistory = history.slice(-100);
      recentHistory.forEach((entry, idx) => {
        const docRef = doc(firestore, `users/${uid}/history`, String(entry.id || idx));
        batch.set(docRef, {
          ...entry,
          timestamp: entry.timestamp?.toISOString?.() || entry.timestamp,
          migratedAt: new Date().toISOString(),
        });
      });

      // StudyPlans
      studyPlans.forEach((plan, idx) => {
        const docRef = doc(firestore, `users/${uid}/studyPlans`, String(plan.id || idx));
        batch.set(docRef, {
          ...plan,
          examDate: plan.examDate?.toISOString?.() || plan.examDate,
          createdAt: plan.createdAt?.toISOString?.() || plan.createdAt,
          updatedAt: plan.updatedAt?.toISOString?.() || plan.updatedAt,
          migratedAt: new Date().toISOString(),
        });
      });

      await batch.commit();

      // 移行完了マーカー
      markMigrationDone(uid);
      saveSyncStatus({ lastSyncTime: new Date() });

      const totalRecords = problems.length + quizSets.length + recentHistory.length + studyPlans.length;
      console.log(`[Sync] マイグレーション完了: ${totalRecords} レコード`);

      return {
        problems: problems.length,
        quizSets: quizSets.length,
        history: recentHistory.length,
        studyPlans: studyPlans.length,
        totalRecords,
        success: true,
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'マイグレーション失敗';
      console.error('[Sync] マイグレーションエラー:', error);
      saveSyncStatus({ syncError: errorMsg });

      return {
        problems: 0,
        quizSets: 0,
        history: 0,
        studyPlans: 0,
        totalRecords: 0,
        success: false,
        error: errorMsg,
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
}

export const syncService = new SyncService();
