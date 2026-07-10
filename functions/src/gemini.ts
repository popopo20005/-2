/**
 * Gemini Cloud Functions - AI問題生成プロキシ
 *
 * Firebase Cloud Functions で実行されるエンドポイント:
 *   POST /gemini-generate — Gemini API プロキシ（認証必須）
 *
 * 環境変数 (.env):
 *   GEMINI_API_KEY  — Google Gemini APIキー
 *   GEMINI_MODEL    — モデル名（デフォルト: gemini-2.5-flash）
 *   APP_URL         — フロントエンドURL
 *
 * セキュリティ:
 *   - Firebase Auth ID トークンによる認証必須
 *   - APIキーはサーバー側のみに保持（クライアントに露出しない）
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Request, Response } from 'express';

// ============================================================
// Firebase Admin 初期化（既にstripe.tsで初期化済みの場合はスキップ）
// ============================================================

if (!admin.apps.length) {
  admin.initializeApp();
}

// ============================================================
// CORS設定
// ============================================================

const APP_URL = process.env.APP_URL || 'https://YOUR_APP_URL';

const corsOrigins = [
  APP_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

function setCorsHeaders(req: Request, res: Response): boolean {
  const origin = req.headers.origin;
  if (origin && corsOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return true;
  }
  return false;
}

// ============================================================
// Firebase Auth トークン検証
// ============================================================

async function verifyAuth(req: Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('認証トークンがありません');
  }

  const idToken = authHeader.split('Bearer ')[1];
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded.uid;
}

// ============================================================
// トークン推定（コスト追跡用）
// ============================================================

function estimateTokens(text: string): number {
  // 日本語: 1文字 ≈ 1.7〜2.2トークン（平均2.0）
  // 英数字・記号: 4文字 ≈ 1トークン
  const japaneseChars = (
    text.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\uF900-\uFAFF]/g) || []
  ).length;
  const otherChars = text.length - japaneseChars;
  return Math.ceil(japaneseChars * 2.0 + otherChars / 4);
}

// ============================================================
// POST /gemini-generate
// ============================================================
// Headers: Authorization: Bearer <Firebase ID Token>
// Request:  { prompt: string, options?: { temperature, maxOutputTokens, topP, topK } }
// Response: { text: string, inputTokens: number, outputTokens: number }
// ============================================================

export const geminiGenerate = functions.https.onRequest(
  { cors: false, timeoutSeconds: 120, memory: '512MiB' },
  async (req: Request, res: Response) => {
    if (setCorsHeaders(req, res)) return;

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // 認証チェック
    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      res.status(401).json({ error: '認証が必要です。ログインしてください' });
      return;
    }

    // リクエストバリデーション
    const { prompt, options } = req.body as {
      prompt?: string;
      options?: {
        temperature?: number;
        maxOutputTokens?: number;
        topP?: number;
        topK?: number;
      };
    };

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'prompt は必須です' });
      return;
    }

    // プロンプトサイズ制限（約50K文字 = 参考資料含む最大値）
    if (prompt.length > 100000) {
      res.status(400).json({ error: 'プロンプトが長すぎます（最大100,000文字）' });
      return;
    }

    // Gemini API 呼び出し
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      res.status(500).json({ error: 'サーバー設定エラー: APIキーが未設定です' });
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          topP: options?.topP ?? 0.9,
          topK: options?.topK ?? 40,
          maxOutputTokens: options?.maxOutputTokens ?? 8192,
        },
        // @ts-expect-error thinkingConfig is valid for gemini-2.5-flash
        thinkingConfig: { thinkingBudget: 0 },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const inputTokens = estimateTokens(prompt);
      const outputTokens = estimateTokens(text);

      console.log(`[gemini] uid=${uid} input=${inputTokens} output=${outputTokens}`);

      res.status(200).json({ text, inputTokens, outputTokens });
    } catch (error: unknown) {
      console.error('[gemini] Generation failed:', error);

      if (error instanceof Error) {
        const msg = error.message;

        if (msg.includes('429') || msg.includes('RATE_LIMIT') || msg.includes('rate')) {
          res.status(429).json({ error: 'APIレート制限に達しました。1分ほどお待ちください' });
          return;
        }
        if (msg.includes('401') || msg.includes('API key') || msg.includes('API_KEY_INVALID')) {
          res.status(500).json({ error: 'サーバー設定エラー: APIキーが無効です' });
          return;
        }
        if (msg.includes('SAFETY') || msg.includes('safety') || msg.includes('blocked')) {
          res.status(400).json({ error: 'コンテンツポリシーにより生成がブロックされました。カテゴリーや参考資料の内容を変更してお試しください' });
          return;
        }
        if (msg.includes('quota') || msg.includes('QUOTA')) {
          res.status(429).json({ error: 'APIの利用枠を超えました。しばらくお待ちください' });
          return;
        }
        if (msg.includes('timeout') || msg.includes('DEADLINE_EXCEEDED')) {
          res.status(504).json({ error: 'AI生成がタイムアウトしました。問題数を減らして再度お試しください' });
          return;
        }
      }

      res.status(500).json({ error: 'AI生成に失敗しました。もう一度試してください' });
    }
  }
);
