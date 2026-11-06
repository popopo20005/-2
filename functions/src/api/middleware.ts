/**
 * API共通ミドルウェア
 * - Firebase Auth認証
 * - CORS設定
 * - バリデーション
 * - エラーハンドリング
 * - レートリミット
 */

import * as admin from 'firebase-admin';
import { Request, Response } from 'express';

// ============================================================
// 初期化（他モジュールから共有）
// ============================================================

if (!admin.apps.length) {
  admin.initializeApp();
}
export const db = admin.firestore();

// ============================================================
// CORS設定
// ============================================================

const corsOrigins = [
  process.env.APP_URL || '',
  process.env.EXTERNAL_APP_URL || '',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
].filter(Boolean);

export function setCorsHeaders(
  req: Request,
  res: Response,
  methods = 'GET, POST, PUT, DELETE, OPTIONS'
): boolean {
  const origin = req.headers.origin;
  if (origin && corsOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', methods);
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return true;
  }
  return false;
}

// ============================================================
// Firebase Auth認証
// ============================================================

export async function verifyAuth(req: Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  const idToken = authHeader.split('Bearer ')[1];
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded.uid;
}

// ============================================================
// レスポンスヘルパー
// ============================================================

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL';

export function sendSuccess(res: Response, data: unknown): void {
  res.status(200).json({ success: true, data });
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  code: ErrorCode = 'INTERNAL',
  details?: unknown
): void {
  res.status(status).json({ success: false, error: message, code, details });
}

// ============================================================
// バリデーション
// ============================================================

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: string[];
}

export function validate(
  body: Record<string, unknown>,
  rules: ValidationRule[]
): string[] {
  const errors: string[] = [];
  for (const rule of rules) {
    const value = body[rule.field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.field} is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    if (rule.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${rule.field} must be an array`);
        continue;
      }
    } else if (rule.type && typeof value !== rule.type) {
      errors.push(`${rule.field} must be ${rule.type}`);
      continue;
    }

    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      errors.push(`${rule.field} exceeds max length ${rule.maxLength}`);
    }

    if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
      errors.push(`${rule.field} must be >= ${rule.min}`);
    }

    if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
      errors.push(`${rule.field} must be <= ${rule.max}`);
    }

    if (rule.enum && typeof value === 'string' && !rule.enum.includes(value)) {
      errors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
    }
  }
  return errors;
}

// ============================================================
// レートリミット（インメモリ）
// ============================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(uid: string, maxPerMinute = 60): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(uid);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(uid, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

// ============================================================
// 共通ハンドララッパー
// ============================================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface HandlerOptions {
  methods: HttpMethod[];
  rateLimit?: number;
}

/**
 * 共通のリクエスト処理パターンをラップする
 * CORS → メソッドチェック → Auth → レートリミット → ハンドラ実行
 */
export function createHandler(
  options: HandlerOptions,
  handler: (req: Request, res: Response, uid: string) => Promise<void>
) {
  return async (req: Request, res: Response): Promise<void> => {
    // CORS
    if (setCorsHeaders(req, res)) return;

    // メソッドチェック
    if (!options.methods.includes(req.method as HttpMethod)) {
      sendError(res, 405, `Method ${req.method} not allowed`, 'METHOD_NOT_ALLOWED');
      return;
    }

    // Auth
    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      sendError(res, 401, 'Authentication required', 'UNAUTHORIZED');
      return;
    }

    // レートリミット
    if (!checkRateLimit(uid, options.rateLimit ?? 60)) {
      sendError(res, 429, 'Rate limit exceeded', 'RATE_LIMIT');
      return;
    }

    // ハンドラ実行
    try {
      await handler(req, res, uid);
    } catch (error) {
      console.error('API Error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      sendError(res, 500, message, 'INTERNAL');
    }
  };
}
