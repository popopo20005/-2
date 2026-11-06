/**
 * StudyPlans API - CRUD
 *
 * エンドポイント:
 *   GET    /apiGetStudyPlans  — 一覧取得
 *   GET    /apiGetStudyPlan   — 単体取得 (?id=xxx) 進捗情報付き
 *   POST   /apiCreateStudyPlan — 作成
 *   PUT    /apiUpdateStudyPlan — 更新
 *   DELETE /apiDeleteStudyPlan — 削除 (?id=xxx)
 */

import * as functions from 'firebase-functions/v2';
import {
  db,
  createHandler,
  sendSuccess,
  sendError,
  validate,
} from './middleware';
import { CreateStudyPlanRequest } from './types';

function collectionPath(uid: string) {
  return `users/${uid}/studyPlans`;
}

// ============================================================
// GET /apiGetStudyPlans
// ============================================================

export const apiGetStudyPlans = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['GET'], rateLimit: 120 }, async (_req, res, uid) => {
    const snapshot = await db.collection(collectionPath(uid)).get();
    const studyPlans = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    sendSuccess(res, { studyPlans, total: studyPlans.length });
  })
);

// ============================================================
// GET /apiGetStudyPlan
// ============================================================

export const apiGetStudyPlan = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['GET'], rateLimit: 120 }, async (req, res, uid) => {
    const id = req.query.id as string;
    if (!id) {
      sendError(res, 400, 'id query parameter is required', 'VALIDATION_ERROR');
      return;
    }

    const doc = await db.collection(collectionPath(uid)).doc(id).get();
    if (!doc.exists) {
      sendError(res, 404, 'StudyPlan not found', 'NOT_FOUND');
      return;
    }

    const studyPlan = { id: doc.id, ...doc.data() };

    // 進捗計算: dailyGoals がある場合
    const data = doc.data();
    let progress = data?.progress || null;

    if (!progress && data?.dailyGoalIds) {
      const goalIds = data.dailyGoalIds as string[];
      let completedDays = 0;
      let totalProblems = 0;
      let totalAccuracy = 0;
      let accuracyCount = 0;

      for (const gid of goalIds) {
        const goalDoc = await db.collection(`users/${uid}/dailyGoals`).doc(gid).get();
        if (goalDoc.exists) {
          const goalData = goalDoc.data();
          if (goalData?.isCompleted) completedDays++;
          if (goalData?.actualNewProblems) totalProblems += goalData.actualNewProblems as number;
          if (goalData?.actualReviewProblems) totalProblems += goalData.actualReviewProblems as number;
          if (goalData?.accuracy !== undefined) {
            totalAccuracy += goalData.accuracy as number;
            accuracyCount++;
          }
        }
      }

      progress = {
        totalDays: goalIds.length,
        completedDays,
        completedProblems: totalProblems,
        averageAccuracy: accuracyCount > 0 ? totalAccuracy / accuracyCount : 0,
        progressPercentage: goalIds.length > 0 ? (completedDays / goalIds.length) * 100 : 0,
      };
    }

    sendSuccess(res, { studyPlan, progress });
  })
);

// ============================================================
// POST /apiCreateStudyPlan
// ============================================================

export const apiCreateStudyPlan = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['POST'], rateLimit: 30 }, async (req, res, uid) => {
    const body = req.body as CreateStudyPlanRequest;

    const errors = validate(body as unknown as Record<string, unknown>, [
      { field: 'name', required: true, type: 'string', maxLength: 200 },
      { field: 'examDate', required: true, type: 'string' },
      { field: 'targetCategories', required: true, type: 'array' },
      { field: 'availableTimePerDay', required: true, type: 'number', min: 1 },
      { field: 'studyDaysOfWeek', required: true, type: 'array' },
      { field: 'examType', type: 'string', enum: ['midterm', 'final', 'mock', 'entrance', 'certification'] },
      { field: 'studyMode', type: 'string', enum: ['balanced', 'weakness-focused', 'review-only', 'new-only'] },
      { field: 'targetScore', type: 'number', min: 0, max: 100 },
    ]);

    if (errors.length > 0) {
      sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', errors);
      return;
    }

    // examDate の妥当性チェック
    const examDate = new Date(body.examDate);
    if (isNaN(examDate.getTime())) {
      sendError(res, 400, 'examDate must be a valid ISO 8601 date', 'VALIDATION_ERROR');
      return;
    }

    const now = new Date().toISOString();
    const studyPlanData = {
      name: body.name,
      examDate: body.examDate,
      examType: body.examType || 'mock',
      targetScore: body.targetScore,
      targetCategories: body.targetCategories,
      availableTimePerDay: body.availableTimePerDay,
      studyDaysOfWeek: body.studyDaysOfWeek,
      studyMode: body.studyMode || 'balanced',
      isActive: true,
      isCompleted: false,
      isPaused: false,
      dailyGoalIds: [],
      linkedGoalIds: [],
      linkedQuizSetIds: [],
      progress: {
        totalDays: 0,
        elapsedDays: 0,
        completedDays: 0,
        progressPercentage: 0,
      },
      createdAt: now,
      updatedAt: now,
      _syncedAt: now,
    };

    const docRef = await db.collection(collectionPath(uid)).add(studyPlanData);
    sendSuccess(res, { id: docRef.id, studyPlan: { id: docRef.id, ...studyPlanData } });
  })
);

// ============================================================
// PUT /apiUpdateStudyPlan
// ============================================================

export const apiUpdateStudyPlan = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  createHandler({ methods: ['PUT'], rateLimit: 30 }, async (req, res, uid) => {
    const { id, ...updates } = req.body as { id: string } & Partial<CreateStudyPlanRequest> & {
      isActive?: boolean;
      isCompleted?: boolean;
      isPaused?: boolean;
    };

    if (!id) {
      sendError(res, 400, 'id is required', 'VALIDATION_ERROR');
      return;
    }

    const docRef = db.collection(collectionPath(uid)).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      sendError(res, 404, 'StudyPlan not found', 'NOT_FOUND');
      return;
    }

    const now = new Date().toISOString();
    await docRef.update({ ...updates, updatedAt: now, _syncedAt: now });

    const updated = await docRef.get();
    sendSuccess(res, { studyPlan: { id: updated.id, ...updated.data() } });
  })
);

// ============================================================
// DELETE /apiDeleteStudyPlan
// ============================================================

export const apiDeleteStudyPlan = functions.https.onRequest(
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
      sendError(res, 404, 'StudyPlan not found', 'NOT_FOUND');
      return;
    }

    await docRef.delete();
    sendSuccess(res, { deletedId: id });
  })
);
