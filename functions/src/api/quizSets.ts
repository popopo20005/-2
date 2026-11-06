/**
 * QuizSets API - CRUD
 *
 * エンドポイント:
 *   GET    /apiGetQuizSets  — 一覧取得
 *   GET    /apiGetQuizSet   — 単体取得 (?id=xxx&includeProblems=true)
 *   POST   /apiCreateQuizSet — 作成
 *   PUT    /apiUpdateQuizSet — 更新
 *   DELETE /apiDeleteQuizSet — 削除 (?id=xxx)
 */

import * as functions from 'firebase-functions/v2';
import {
  db,
  createHandler,
  sendSuccess,
  sendError,
  validate,
} from './middleware';
import { CreateQuizSetRequest } from './types';

function collectionPath(uid: string) {
  return `users/${uid}/quizSets`;
}

// ============================================================
// GET /apiGetQuizSets
// ============================================================

export const apiGetQuizSets = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['GET'], rateLimit: 120 }, async (_req, res, uid) => {
    const snapshot = await db.collection(collectionPath(uid)).get();
    const quizSets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    sendSuccess(res, { quizSets, total: quizSets.length });
  })
);

// ============================================================
// GET /apiGetQuizSet
// ============================================================

export const apiGetQuizSet = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['GET'], rateLimit: 120 }, async (req, res, uid) => {
    const id = req.query.id as string;
    const includeProblems = req.query.includeProblems === 'true';

    if (!id) {
      sendError(res, 400, 'id query parameter is required', 'VALIDATION_ERROR');
      return;
    }

    const doc = await db.collection(collectionPath(uid)).doc(id).get();
    if (!doc.exists) {
      sendError(res, 404, 'QuizSet not found', 'NOT_FOUND');
      return;
    }

    const quizSet = { id: doc.id, ...doc.data() };
    const result: Record<string, unknown> = { quizSet };

    // 問題データも取得
    if (includeProblems) {
      const problemIds = (doc.data()?.problemIds as string[]) || [];
      const problems: Record<string, unknown>[] = [];

      // Firestore の in クエリは30件制限があるため、個別取得
      for (const pid of problemIds) {
        const pDoc = await db.collection(`users/${uid}/problems`).doc(pid).get();
        if (pDoc.exists) {
          problems.push({ id: pDoc.id, ...pDoc.data() });
        }
      }

      result.problems = problems;
    }

    sendSuccess(res, result);
  })
);

// ============================================================
// POST /apiCreateQuizSet
// ============================================================

export const apiCreateQuizSet = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['POST'], rateLimit: 30 }, async (req, res, uid) => {
    const body = req.body as CreateQuizSetRequest;

    const errors = validate(body as unknown as Record<string, unknown>, [
      { field: 'name', required: true, type: 'string', maxLength: 200 },
      { field: 'problemIds', required: true, type: 'array' },
    ]);

    if (errors.length > 0) {
      sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', errors);
      return;
    }

    const now = new Date().toISOString();
    const quizSetData = {
      name: body.name,
      description: body.description || '',
      problemIds: body.problemIds,
      subjects: body.subjects || [],
      createdAt: now,
      updatedAt: now,
      _syncedAt: now,
    };

    const docRef = await db.collection(collectionPath(uid)).add(quizSetData);
    sendSuccess(res, { id: docRef.id, quizSet: { id: docRef.id, ...quizSetData } });
  })
);

// ============================================================
// PUT /apiUpdateQuizSet
// ============================================================

export const apiUpdateQuizSet = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['PUT'], rateLimit: 30 }, async (req, res, uid) => {
    const { id, ...updates } = req.body as { id: string } & Partial<CreateQuizSetRequest>;

    if (!id) {
      sendError(res, 400, 'id is required', 'VALIDATION_ERROR');
      return;
    }

    const docRef = db.collection(collectionPath(uid)).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      sendError(res, 404, 'QuizSet not found', 'NOT_FOUND');
      return;
    }

    const now = new Date().toISOString();
    await docRef.update({ ...updates, updatedAt: now, _syncedAt: now });

    const updated = await docRef.get();
    sendSuccess(res, { quizSet: { id: updated.id, ...updated.data() } });
  })
);

// ============================================================
// DELETE /apiDeleteQuizSet
// ============================================================

export const apiDeleteQuizSet = functions.https.onRequest(
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
      sendError(res, 404, 'QuizSet not found', 'NOT_FOUND');
      return;
    }

    await docRef.delete();
    sendSuccess(res, { deletedId: id });
  })
);
