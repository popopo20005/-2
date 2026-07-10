/**
 * Push Notification Cloud Functions
 *
 * Firebase Cloud Functions で実行されるエンドポイント:
 *   POST /registerPushSubscription — Push サブスクリプション登録
 *   Scheduled /sendScheduledPush   — 定期的なPush通知送信
 *
 * 環境変数 (.env):
 *   VAPID_PUBLIC_KEY   — VAPID公開鍵
 *   VAPID_PRIVATE_KEY  — VAPID秘密鍵
 *   VAPID_SUBJECT      — VAPID連絡先 (mailto:...)
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import webpush from 'web-push';
import { Request, Response } from 'express';

// ============================================================
// 初期化
// ============================================================

// Firebase Admin（他のモジュールで既に初期化されている場合はスキップ）
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const firestore = admin.firestore();

// VAPID設定
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@minguella.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ============================================================
// registerPushSubscription — Push サブスクリプション登録
// ============================================================

export const registerPushSubscription = functions.https.onRequest(
  {
    region: 'us-central1',
    cors: true,
  },
  async (req: Request, res: Response): Promise<void> => {
    // POSTのみ
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Firebase Auth 検証
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: missing token' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // リクエストボディからサブスクリプション取得
      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint) {
        res.status(400).json({ error: 'Invalid subscription data' });
        return;
      }

      // Firestoreに保存: pushSubscriptions/{uid}/devices/{endpointHash}
      const endpointHash = Buffer.from(subscription.endpoint).toString('base64url').slice(0, 64);

      await firestore
        .collection('pushSubscriptions')
        .doc(uid)
        .collection('devices')
        .doc(endpointHash)
        .set({
          subscription,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          userAgent: req.headers['user-agent'] || '',
        });

      // ユーザードキュメントにpush有効フラグ
      await firestore
        .collection('pushSubscriptions')
        .doc(uid)
        .set(
          {
            enabled: true,
            deviceCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      functions.logger.info(`Push subscription registered for user ${uid}`);
      res.status(200).json({ success: true });
    } catch (error: any) {
      functions.logger.error('registerPushSubscription error:', error);

      if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        res.status(401).json({ error: 'Unauthorized: invalid token' });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================
// unregisterPushSubscription — Push サブスクリプション解除
// ============================================================

export const unregisterPushSubscription = functions.https.onRequest(
  {
    region: 'us-central1',
    cors: true,
  },
  async (req: Request, res: Response): Promise<void> => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: missing token' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      const { endpoint } = req.body;

      if (!endpoint) {
        res.status(400).json({ error: 'Missing endpoint' });
        return;
      }

      const endpointHash = Buffer.from(endpoint).toString('base64url').slice(0, 64);

      await firestore
        .collection('pushSubscriptions')
        .doc(uid)
        .collection('devices')
        .doc(endpointHash)
        .delete();

      // デバイスカウント減算
      await firestore
        .collection('pushSubscriptions')
        .doc(uid)
        .set(
          {
            deviceCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      functions.logger.info(`Push subscription removed for user ${uid}`);
      res.status(200).json({ success: true });
    } catch (error: any) {
      functions.logger.error('unregisterPushSubscription error:', error);

      if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        res.status(401).json({ error: 'Unauthorized: invalid token' });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================
// sendScheduledPush — 定期的なPush通知送信（毎日2回: 朝9時・夕方18時 JST）
// ============================================================

export const sendScheduledPush = functions.scheduler.onSchedule(
  {
    schedule: '0 0,9 * * *', // UTC 0:00 (JST 9:00) と UTC 9:00 (JST 18:00)
    region: 'us-central1',
    timeZone: 'Asia/Tokyo',
  },
  async () => {
    functions.logger.info('sendScheduledPush: 開始');

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      functions.logger.error('VAPID keys not configured');
      return;
    }

    try {
      // Push通知が有効なユーザーを取得
      const usersSnapshot = await firestore
        .collection('pushSubscriptions')
        .where('enabled', '==', true)
        .get();

      if (usersSnapshot.empty) {
        functions.logger.info('No users with push enabled');
        return;
      }

      const now = new Date();
      const jstHour = (now.getUTCHours() + 9) % 24;

      let sentCount = 0;
      let errorCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;

        try {
          // ユーザーの通知設定を確認
          const settingsDoc = await firestore
            .collection('users')
            .doc(uid)
            .collection('settings')
            .doc('notifications')
            .get();

          const settings = settingsDoc.exists ? settingsDoc.data() : null;

          // 通知タイプを決定
          const notifications: Array<{ title: string; body: string; tag: string; url: string }> = [];

          // 朝(9時JST): 復習リマインダー
          if (jstHour >= 8 && jstHour <= 10) {
            if (!settings || settings.reviewReminderEnabled !== false) {
              notifications.push({
                title: '📚 復習の時間です！',
                body: '今日の復習をしましょう。定期的な復習が記憶の定着に効果的です。',
                tag: 'review-reminder',
                url: '/',
              });
            }
          }

          // 夕方(18時JST): ストリーク継続アラート
          if (jstHour >= 17 && jstHour <= 19) {
            if (!settings || settings.streakAlertEnabled !== false) {
              notifications.push({
                title: '🔥 今日も学習しましょう！',
                body: '学習ストリークを途切れさせないように、今日もクイズに挑戦！',
                tag: 'streak-alert',
                url: '/',
              });
            }
          }

          if (notifications.length === 0) continue;

          // ユーザーの全デバイスにPush送信
          const devicesSnapshot = await firestore
            .collection('pushSubscriptions')
            .doc(uid)
            .collection('devices')
            .get();

          for (const deviceDoc of devicesSnapshot.docs) {
            const { subscription } = deviceDoc.data();

            for (const notification of notifications) {
              try {
                await webpush.sendNotification(
                  subscription,
                  JSON.stringify({
                    title: notification.title,
                    body: notification.body,
                    icon: '/icon-192x192.png',
                    badge: '/badge-72x72.png',
                    tag: notification.tag,
                    data: { url: notification.url },
                  })
                );
                sentCount++;
              } catch (pushError: any) {
                // 410 Gone = サブスクリプション無効 → 削除
                if (pushError.statusCode === 410 || pushError.statusCode === 404) {
                  functions.logger.info(`Removing expired subscription for ${uid}`);
                  await deviceDoc.ref.delete();
                  await firestore
                    .collection('pushSubscriptions')
                    .doc(uid)
                    .set(
                      { deviceCount: admin.firestore.FieldValue.increment(-1) },
                      { merge: true }
                    );
                } else {
                  functions.logger.error(`Push send error for ${uid}:`, pushError);
                  errorCount++;
                }
              }
            }
          }
        } catch (userError) {
          functions.logger.error(`Error processing user ${uid}:`, userError);
          errorCount++;
        }
      }

      functions.logger.info(
        `sendScheduledPush: 完了 — sent: ${sentCount}, errors: ${errorCount}`
      );
    } catch (error) {
      functions.logger.error('sendScheduledPush error:', error);
    }
  }
);
