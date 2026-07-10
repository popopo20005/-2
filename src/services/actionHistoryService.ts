import type { ActionHistory, QuizSet, Problem } from '../types';
import { quizSetService, db } from '../lib/database';

/**
 * Action History Manager
 *
 * アンドゥ/リドゥ機能のためのアクション履歴管理サービス
 * - メモリ内で一時的にアクションを保存
 * - 5秒後に自動削除
 * - ロールバック機能（削除のみ対応）
 */
class ActionHistoryManager {
  private actions: Map<string, ActionHistory> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly MAX_ACTIONS = 10; // 最大保持アクション数
  private readonly EXPIRY_MS = 5000; // 5秒

  /**
   * UUID生成（簡易版）
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * アクションを記録
   *
   * @param type - アクションタイプ
   * @param entity - エンティティタイプ
   * @param data - 削除されたデータ
   * @returns アクションID
   */
  recordAction(
    type: ActionHistory['type'],
    entity: ActionHistory['entity'],
    data: any
  ): string {
    const id = this.generateId();
    const timestamp = new Date();
    const expiresAt = new Date(timestamp.getTime() + this.EXPIRY_MS);

    const action: ActionHistory = {
      id,
      type,
      entity,
      data,
      timestamp,
      expiresAt
    };

    // アクション保存
    this.actions.set(id, action);

    // 最大数チェック（古いものから削除）
    if (this.actions.size > this.MAX_ACTIONS) {
      const oldestId = Array.from(this.actions.keys())[0];
      this.cancelAction(oldestId);
    }

    // 5秒後に自動削除
    const timer = setTimeout(() => {
      this.actions.delete(id);
      this.timers.delete(id);
      console.log(`[ActionHistory] Action ${id} expired and deleted`);
    }, this.EXPIRY_MS);

    this.timers.set(id, timer);

    console.log(`[ActionHistory] Recorded action ${id}:`, { type, entity });
    return id;
  }

  /**
   * ロールバック実行
   *
   * @param actionId - アクションID
   */
  async rollback(actionId: string): Promise<void> {
    const action = this.actions.get(actionId);
    if (!action) {
      console.warn(`[ActionHistory] Action ${actionId} not found or expired`);
      return;
    }

    console.log(`[ActionHistory] Rolling back action ${actionId}`);

    // タイマーキャンセル
    const timer = this.timers.get(actionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(actionId);
    }

    // データ復元
    try {
      switch (action.entity) {
        case 'quizSet':
          if (action.type === 'delete') {
            await quizSetService.save(action.data as QuizSet);
            console.log(`[ActionHistory] Restored quizSet:`, action.data.name);
          }
          break;

        case 'problem':
          if (action.type === 'delete') {
            // 直接Dexieを使ってIDを保持したまま復元
            await db.problems.put(action.data as Problem);
            console.log(`[ActionHistory] Restored problem:`, action.data.question);
          }
          break;

        case 'category':
          // 将来の実装
          console.warn('[ActionHistory] Category rollback not implemented yet');
          break;

        default:
          console.warn(`[ActionHistory] Unknown entity type: ${action.entity}`);
      }
    } catch (error) {
      console.error(`[ActionHistory] Rollback failed for ${actionId}:`, error);
      throw error;
    }

    // アクション削除
    this.actions.delete(actionId);
    console.log(`[ActionHistory] Action ${actionId} rolled back successfully`);
  }

  /**
   * アクションをキャンセル（期限前に削除）
   *
   * @param actionId - アクションID
   */
  private cancelAction(actionId: string): void {
    const timer = this.timers.get(actionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(actionId);
    }
    this.actions.delete(actionId);
  }

  /**
   * 全アクションをクリア
   */
  clear(): void {
    // 全タイマーキャンセル
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.actions.clear();
    console.log('[ActionHistory] All actions cleared');
  }

  /**
   * アクション数を取得（デバッグ用）
   */
  getActionCount(): number {
    return this.actions.size;
  }
}

// シングルトンエクスポート
export const actionHistoryService = new ActionHistoryManager();
