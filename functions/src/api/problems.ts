/**
 * Problems API - CRUD + 一括インポート
 *
 * エンドポイント:
 *   GET    /apiGetProblems          — 問題一覧取得（フィルタ・ページネーション対応）
 *   GET    /apiGetProblem           — 単体取得 (?id=xxx)
 *   POST   /apiCreateProblem       — 1問作成
 *   PUT    /apiUpdateProblem        — 更新
 *   DELETE /apiDeleteProblem        — 削除 (?id=xxx)
 *   POST   /apiBulkImportProblems  — 一括インポート（最大500問）
 */

import * as functions from 'firebase-functions/v2';
import { Request, Response } from 'express';
import {
  db,
  createHandler,
  sendSuccess,
  sendError,
  validate,
  ValidationRule,
} from './middleware';
import { CreateProblemRequest, BulkImportResponse } from './types';
import * as admin from 'firebase-admin';

// ============================================================
// バリデーションルール
// ============================================================

const problemRules: ValidationRule[] = [
  { field: 'category', required: true, type: 'string', maxLength: 100 },
  { field: 'question', required: true, type: 'string', maxLength: 5000 },
  { field: 'explanation', required: true, type: 'string', maxLength: 10000 },
  { field: 'type', type: 'string', enum: ['true-false', 'multiple-choice', 'multi-select'] },
  { field: 'options', type: 'array' },
  { field: 'correctAnswer', type: 'number', min: 0 },
  { field: 'importanceScore', type: 'number', min: 1.0, max: 2.0 },
  { field: 'sourceExamYear', type: 'number', min: 1900, max: 2100 },
];

function collectionPath(uid: string) {
  return `users/${uid}/problems`;
}

// ============================================================
// GET /apiGetProblems
// ============================================================

export const apiGetProblems = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['GET'], rateLimit: 120 }, async (req, res, uid) => {
    const {
      category,
      type,
      tags,
      limit: limitStr,
      offset: offsetStr,
    } = req.query as Record<string, string | undefined>;

    const limit = Math.min(parseInt(limitStr || '50', 10), 200);
    const offset = parseInt(offsetStr || '0', 10);

    let query: admin.firestore.Query = db.collection(collectionPath(uid));

    if (category) {
      query = query.where('category', '==', category);
    }
    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();

    let problems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // タグフィルタ（Firestoreはarray-contains-anyで1つのみ、複数タグはクライアントフィルタ）
    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim());
      problems = problems.filter((p: Record<string, unknown>) => {
        const pTags = p['tags'] as string[] | undefined;
        return pTags && tagList.some((t) => pTags.includes(t));
      });
    }

    const total = problems.length;
    const paginated = problems.slice(offset, offset + limit);

    sendSuccess(res, { problems: paginated, total, limit, offset });
  })
);

// ============================================================
// GET /apiGetProblem
// ============================================================

export const apiGetProblem = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['GET'], rateLimit: 120 }, async (req, res, uid) => {
    const id = req.query.id as string;
    if (!id) {
      sendError(res, 400, 'id query parameter is required', 'VALIDATION_ERROR');
      return;
    }

    const doc = await db.collection(collectionPath(uid)).doc(id).get();
    if (!doc.exists) {
      sendError(res, 404, 'Problem not found', 'NOT_FOUND');
      return;
    }

    sendSuccess(res, { problem: { id: doc.id, ...doc.data() } });
  })
);

// ============================================================
// POST /apiCreateProblem
// ============================================================

export const apiCreateProblem = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['POST'], rateLimit: 30 }, async (req, res, uid) => {
    const body = req.body as CreateProblemRequest;

    const errors = validate(body as unknown as Record<string, unknown>, problemRules);
    if (errors.length > 0) {
      sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', errors);
      return;
    }

    // multiple-choice バリデーション
    if (body.type === 'multiple-choice') {
      if (!body.options || body.options.length < 2 || body.options.length > 6) {
        sendError(res, 400, 'multiple-choice requires 2-6 options', 'VALIDATION_ERROR');
        return;
      }
      if (body.correctAnswer === undefined || body.correctAnswer < 0 || body.correctAnswer >= body.options.length) {
        sendError(res, 400, 'correctAnswer must be a valid index into options', 'VALIDATION_ERROR');
        return;
      }
    }

    // multi-select バリデーション
    if (body.type === 'multi-select') {
      if (!body.options || body.options.length < 2 || body.options.length > 10) {
        sendError(res, 400, 'multi-select requires 2-10 options', 'VALIDATION_ERROR');
        return;
      }
      if (!body.correctAnswers || !Array.isArray(body.correctAnswers) || body.correctAnswers.length < 1) {
        sendError(res, 400, 'correctAnswers must be an array with at least 1 correct answer', 'VALIDATION_ERROR');
        return;
      }
      const invalidIndices = body.correctAnswers.filter((i: number) => i < 0 || i >= body.options!.length);
      if (invalidIndices.length > 0) {
        sendError(res, 400, 'correctAnswers contains invalid indices', 'VALIDATION_ERROR');
        return;
      }
    }

    const now = new Date().toISOString();
    const problemData = {
      ...body,
      createdAt: now,
      updatedAt: now,
      _syncedAt: now,
    };

    const docRef = await db.collection(collectionPath(uid)).add(problemData);

    sendSuccess(res, { id: docRef.id, problem: { id: docRef.id, ...problemData } });
  })
);

// ============================================================
// PUT /apiUpdateProblem
// ============================================================

export const apiUpdateProblem = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['PUT'], rateLimit: 30 }, async (req, res, uid) => {
    const { id, ...updates } = req.body as { id: string } & Partial<CreateProblemRequest>;

    if (!id) {
      sendError(res, 400, 'id is required', 'VALIDATION_ERROR');
      return;
    }

    const docRef = db.collection(collectionPath(uid)).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      sendError(res, 404, 'Problem not found', 'NOT_FOUND');
      return;
    }

    const now = new Date().toISOString();
    const updateData = {
      ...updates,
      updatedAt: now,
      _syncedAt: now,
    };

    await docRef.update(updateData);

    const updated = await docRef.get();
    sendSuccess(res, { problem: { id: updated.id, ...updated.data() } });
  })
);

// ============================================================
// DELETE /apiDeleteProblem
// ============================================================

export const apiDeleteProblem = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['DELETE'], rateLimit: 30 }, async (req, res, uid) => {
    const id = req.query.id as string;
    if (!id) {
      sendError(res, 400, 'id query parameter is required', 'VALIDATION_ERROR');
      return;
    }

    const docRef = db.collection(collectionPath(uid)).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      sendError(res, 404, 'Problem not found', 'NOT_FOUND');
      return;
    }

    await docRef.delete();
    sendSuccess(res, { deletedId: id });
  })
);

// ============================================================
// POST /apiBulkImportProblems
// ============================================================

export const apiBulkImportProblems = functions.https.onRequest(
  { cors: false, timeoutSeconds: 120 },
  createHandler({ methods: ['POST'], rateLimit: 5 }, async (req: Request, res: Response, uid: string) => {
    const { problems, quizSetName, quizSetDescription } = req.body as {
      problems: CreateProblemRequest[];
      quizSetName?: string;
      quizSetDescription?: string;
    };

    if (!Array.isArray(problems) || problems.length === 0) {
      sendError(res, 400, 'problems array is required and must not be empty', 'VALIDATION_ERROR');
      return;
    }

    if (problems.length > 500) {
      sendError(res, 400, 'Maximum 500 problems per import', 'VALIDATION_ERROR');
      return;
    }

    const now = new Date().toISOString();
    const result: BulkImportResponse = {
      importedCount: 0,
      problemIds: [],
      errors: [],
    };

    // バッチ処理（Firestoreは500件/バッチ制限）
    const batch = db.batch();
    const problemsCollection = db.collection(collectionPath(uid));

    for (let i = 0; i < problems.length; i++) {
      const problem = problems[i];
      const errors = validate(problem as unknown as Record<string, unknown>, [
        { field: 'category', required: true, type: 'string' },
        { field: 'question', required: true, type: 'string' },
        { field: 'explanation', required: true, type: 'string' },
      ]);

      if (errors.length > 0) {
        result.errors.push({ index: i, error: errors.join('; ') });
        continue;
      }

      const docRef = problemsCollection.doc();
      batch.set(docRef, {
        ...problem,
        createdAt: now,
        updatedAt: now,
        _syncedAt: now,
      });

      result.problemIds.push(docRef.id);
      result.importedCount++;
    }

    await batch.commit();

    // QuizSet 自動作成
    if (quizSetName && result.problemIds.length > 0) {
      const quizSetData = {
        name: quizSetName,
        description: quizSetDescription || '',
        problemIds: result.problemIds,
        subjects: [...new Set(problems.filter((_, i) => !result.errors.some((e) => e.index === i)).map((p) => p.category))],
        createdAt: now,
        updatedAt: now,
        _syncedAt: now,
      };

      const quizSetRef = await db.collection(`users/${uid}/quizSets`).add(quizSetData);
      result.quizSetId = quizSetRef.id;
    }

    sendSuccess(res, result);
  })
);
