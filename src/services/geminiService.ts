/**
 * Gemini Service - Cloud Functions プロキシ経由のAI統合
 *
 * APIキーをサーバー側のみに保持し、Firebase Auth トークンで認証。
 * ブラウザ → Cloud Functions → Gemini API の安全な通信を行う。
 *
 * 環境変数:
 *   VITE_FUNCTIONS_URL - Cloud Functions のベースURL（ローカル開発用）
 */

import { getFirebaseAuth, isFirebaseConfigured } from './firebaseConfig';

// ============================================================
// 型定義
// ============================================================

export interface CostRecord {
  timestamp: Date;
  inputTokens: number;
  outputTokens: number;
  latency: number; // ms
  model: string;
  prompt: string; // 最初の200文字
  success: boolean;
  error?: string;
}

export interface GeminiGenerateOptions {
  temperature?: number;   // 0-1 (デフォルト: 0.7)
  topP?: number;          // 0-1 (デフォルト: 0.9)
  topK?: number;          // (デフォルト: 40)
  maxOutputTokens?: number; // (デフォルト: 2048)
}

// ============================================================
// コスト追跡
// ============================================================

const COST_HISTORY_KEY = 'minguella_gemini_cost_history';
const MAX_COST_RECORDS = 500;

function loadCostHistory(): CostRecord[] {
  try {
    const raw = localStorage.getItem(COST_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCostHistory(records: CostRecord[]): void {
  try {
    localStorage.setItem(COST_HISTORY_KEY, JSON.stringify(records.slice(-MAX_COST_RECORDS)));
  } catch {
    // localStorage容量超過時は古いレコードを削除
    const trimmed = records.slice(-Math.floor(MAX_COST_RECORDS / 2));
    localStorage.setItem(COST_HISTORY_KEY, JSON.stringify(trimmed));
  }
}

function recordCost(record: CostRecord): void {
  const history = loadCostHistory();
  history.push(record);
  saveCostHistory(history);
}

// ============================================================
// Cloud Functions URL
// ============================================================

function getFunctionsUrl(): string {
  // ローカル開発時は環境変数で指定
  const envUrl = import.meta.env.VITE_FUNCTIONS_URL;
  if (envUrl) return envUrl;

  // 本番: Firebase プロジェクトIDからURLを構築
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (projectId) {
    return `https://us-central1-${projectId}.cloudfunctions.net`;
  }

  throw new Error('Cloud Functions URLが設定されていません');
}

// ============================================================
// Firebase Auth トークン取得
// ============================================================

async function getIdToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('ログインが必要です。AI問題生成を使うにはログインしてください');
  }
  return user.getIdToken();
}

// ============================================================
// GeminiService クラス
// ============================================================

class GeminiService {
  /**
   * Cloud Functions経由でAI生成が利用可能か確認
   */
  isConfigured(): boolean {
    return isFirebaseConfigured();
  }

  /**
   * テキスト生成（Cloud Functions プロキシ経由）
   *
   * @param prompt - プロンプト文字列
   * @param options - 生成オプション
   * @returns 生成されたテキスト
   */
  async generate(prompt: string, options: GeminiGenerateOptions = {}): Promise<string> {
    const startTime = Date.now();
    const costRecord: CostRecord = {
      timestamp: new Date(),
      inputTokens: 0,
      outputTokens: 0,
      latency: 0,
      model: 'gemini-2.5-flash',
      prompt: prompt.slice(0, 200),
      success: false,
    };

    try {
      const idToken = await getIdToken();
      const functionsUrl = getFunctionsUrl();

      const response = await fetch(`${functionsUrl}/geminiGenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ prompt, options }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const status = response.status;
        const serverMsg = errorData.error || '';

        if (status === 401) {
          throw new Error('認証エラー: ログインが必要です。再度ログインしてください');
        } else if (status === 429) {
          throw new Error('APIレート制限: しばらく待ってから再度お試しください（1分程度）');
        } else if (status === 400) {
          throw new Error(`リクエストエラー: ${serverMsg || '入力内容を確認してください'}`);
        } else if (status >= 500) {
          throw new Error(`サーバーエラー: ${serverMsg || 'しばらくお待ちください'}`);
        }
        throw new Error(serverMsg || `HTTP ${status}`);
      }

      const data = await response.json() as {
        text: string;
        inputTokens: number;
        outputTokens: number;
      };

      // コスト記録（サーバーからのトークン情報を使用）
      costRecord.inputTokens = data.inputTokens;
      costRecord.outputTokens = data.outputTokens;
      costRecord.latency = Date.now() - startTime;
      costRecord.success = true;
      recordCost(costRecord);

      return data.text;
    } catch (error: unknown) {
      costRecord.latency = Date.now() - startTime;
      costRecord.error = error instanceof Error ? error.message : String(error);
      recordCost(costRecord);

      if (error instanceof Error) {
        // ネットワークエラーの検出
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
          throw new Error('ネットワークエラー: インターネット接続を確認してください');
        }
        // タイムアウト
        if (error.name === 'AbortError') {
          throw new Error('タイムアウト: AI生成に時間がかかりすぎました。問題数を減らして再度お試しください');
        }
        throw error;
      }

      throw new Error('AI生成に失敗しました。もう一度試してください');
    }
  }

  /**
   * 月間コスト概算を取得
   * Gemini 1.5 Flash の価格: 入力 $0.075/1M tokens, 出力 $0.30/1M tokens
   */
  getMonthlyUsage(): {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    estimatedCostUSD: number;
    averageLatencyMs: number;
  } {
    const history = loadCostHistory();
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const monthlyRecords = history.filter((r) => new Date(r.timestamp) >= monthAgo);

    const totalInputTokens = monthlyRecords.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = monthlyRecords.reduce((sum, r) => sum + r.outputTokens, 0);
    const totalLatency = monthlyRecords.reduce((sum, r) => sum + r.latency, 0);

    // コスト計算 (USD)
    const inputCost = (totalInputTokens / 1_000_000) * 0.075;
    const outputCost = (totalOutputTokens / 1_000_000) * 0.30;

    return {
      totalRequests: monthlyRecords.length,
      totalInputTokens,
      totalOutputTokens,
      estimatedCostUSD: Math.round((inputCost + outputCost) * 10000) / 10000,
      averageLatencyMs: monthlyRecords.length > 0
        ? Math.round(totalLatency / monthlyRecords.length)
        : 0,
    };
  }

  /**
   * コスト履歴をクリア
   */
  clearCostHistory(): void {
    localStorage.removeItem(COST_HISTORY_KEY);
  }
}

export const geminiService = new GeminiService();
