/**
 * Stripe Cloud Functions - サブスクリプション決済バックエンド
 *
 * Firebase Cloud Functions で実行されるエンドポイント:
 *   POST /create-checkout-session  — Stripe Checkout セッション作成
 *   POST /create-portal-session    — Customer Portal セッション作成
 *   POST /stripe-webhook           — Stripe Webhook イベント処理
 *
 * 環境変数 (.env):
 *   STRIPE_SECRET_KEY      — Stripe シークレットキー (sk_live_...)
 *   STRIPE_WEBHOOK_SECRET  — Webhook署名シークレット (whsec_...)
 *
 * デプロイ:
 *   cd functions
 *   firebase deploy --only functions
 *
 * ローカル開発:
 *   firebase emulators:start --only functions
 *   → http://127.0.0.1:5001/{project-id}/us-central1/
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { Request, Response } from 'express';

// ============================================================
// 初期化
// ============================================================

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// ============================================================
// アプリのURL（レスポンス後のリダイレクト先）
// ============================================================

const APP_URL = process.env.APP_URL || 'https://YOUR_APP_URL';

// ============================================================
// CORS設定
// ============================================================

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

  // Preflight リクエスト
  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return true;
  }
  return false;
}

// ============================================================
// Firebase Auth ヘルパー
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
// POST /create-checkout-session
// ============================================================
// ヘッダー: Authorization: Bearer {Firebase ID Token}
// リクエストボディ: { priceId: string }
// レスポンス: { sessionUrl: string }
// ============================================================

export const createCheckoutSession = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  async (req: Request, res: Response) => {
    if (setCorsHeaders(req, res)) return;

    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    // Firebase Auth 検証
    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      res.status(401).json({ error: 'ログインが必要です' });
      return;
    }

    const { priceId } = req.body as { priceId?: string };
    if (!priceId) {
      res.status(400).json({ error: 'priceId is required' });
      return;
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${APP_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}?payment=cancel`,
        automatic_tax: { enabled: true },
        customer_creation: 'always',
        // Firebase UID を紐付け
        client_reference_id: uid,
        metadata: { firebaseUid: uid },
      });

      if (!session.url) {
        res.status(500).json({ error: 'Failed to create session URL' });
        return;
      }

      res.status(200).json({ sessionUrl: session.url });
    } catch (error) {
      console.error('Checkout session creation failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  }
);

// ============================================================
// POST /create-portal-session
// ============================================================
// ヘッダー: Authorization: Bearer {Firebase ID Token}
// レスポンス: { url: string }
// ============================================================

export const createPortalSession = functions.https.onRequest(
  { cors: false, timeoutSeconds: 30 },
  async (req: Request, res: Response) => {
    if (setCorsHeaders(req, res)) return;

    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    // Firebase Auth 検証
    let uid: string;
    try {
      uid = await verifyAuth(req);
    } catch {
      res.status(401).json({ error: 'ログインが必要です' });
      return;
    }

    try {
      // Firebase UIDからStripe Customer IDを取得
      const subDoc = await db.collection('users').doc(uid).collection('private').doc('subscription').get();
      const customerId = subDoc.data()?.customerId;

      if (!customerId) {
        res.status(404).json({ error: 'サブスクリプションが見つかりません' });
        return;
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: APP_URL,
      });

      res.status(200).json({ url: session.url });
    } catch (error) {
      console.error('Portal session creation failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  }
);

// ============================================================
// POST /stripe-webhook
// ============================================================
// Stripe → Firebase via Webhook
// 署名検証 → イベント処理 → Firestore更新
// ============================================================

export const stripeWebhook = functions.https.onRequest(
  { cors: false, timeoutSeconds: 60 },
  async (req: Request, res: Response) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: Stripe.Event;

    try {
      // req.body が Buffer か string かに対応
      const rawBody =
        typeof req.body === 'string'
          ? req.body
          : Buffer.isBuffer(req.body)
            ? req.body.toString()
            : JSON.stringify(req.body);

      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    console.log(`Webhook event received: ${event.type} (id: ${event.id})`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error(`Error handling event ${event.type}:`, error);
      // 500を返すと Stripe が再送信するため、処理エラーでも200で返す
      res.status(200).json({ received: true, error: 'Processing error' });
    }
  }
);

// ============================================================
// イベントハンドラー
// ============================================================

/**
 * checkout.session.completed
 * Checkout 完了時: サブスクリプション情報を Firestore に保存
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log('Checkout session completed:', session.id);

  if (session.mode !== 'subscription' || !session.subscription) {
    console.log('Not a subscription session, skipping');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const customerId = session.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const firebaseUid = session.metadata?.firebaseUid || session.client_reference_id;

  const plan = resolvePlan(priceId);
  console.log(`Customer ${customerId}: Plan=${plan}, UID=${firebaseUid}`);

  const subscriptionData = {
    customerId,
    subscriptionId: subscription.id,
    plan,
    status: 'active' as const,
    periodStart: new Date(subscription.current_period_start * 1000),
    periodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    firebaseUid: firebaseUid || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // subscriptions/{customerId} に保存
  await db.collection('subscriptions').doc(customerId).set(subscriptionData, { merge: true });

  // users/{uid}/private/subscription にも保存（クライアントが読みやすいパス）
  if (firebaseUid) {
    await db.collection('users').doc(firebaseUid).collection('private').doc('subscription').set(subscriptionData, { merge: true });
  }
}

/**
 * customer.subscription.updated
 * サブスクリプション変更時: Firestore を更新
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log('Subscription updated:', subscription.id, 'Status:', subscription.status);

  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const plan = resolvePlan(priceId);
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  const updateData = {
    subscriptionId: subscription.id,
    plan: isActive ? plan : 'free',
    status: subscription.status,
    periodStart: new Date(subscription.current_period_start * 1000),
    periodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('subscriptions').doc(customerId).set(updateData, { merge: true });

  // Firebase UIDを取得してユーザードキュメントも更新
  const subDoc = await db.collection('subscriptions').doc(customerId).get();
  const firebaseUid = subDoc.data()?.firebaseUid;
  if (firebaseUid) {
    await db.collection('users').doc(firebaseUid).collection('private').doc('subscription').set(updateData, { merge: true });
  }
}

/**
 * customer.subscription.deleted
 * サブスクリプション削除時: フリープランに戻す
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log('Subscription deleted:', subscription.id);

  const customerId = subscription.customer as string;

  const deleteData = {
    subscriptionId: subscription.id,
    plan: 'free' as const,
    status: 'canceled' as const,
    cancelAtPeriodEnd: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('subscriptions').doc(customerId).set(deleteData, { merge: true });

  // Firebase UIDを取得してユーザードキュメントも更新
  const subDoc = await db.collection('subscriptions').doc(customerId).get();
  const firebaseUid = subDoc.data()?.firebaseUid;
  if (firebaseUid) {
    await db.collection('users').doc(firebaseUid).collection('private').doc('subscription').set(deleteData, { merge: true });
  }
}

// ============================================================
// ユーティリティ
// ============================================================

/**
 * Price ID からプラン名に解決する
 *
 * 環境変数 STRIPE_BASIC_PRICE / STRIPE_PREMIUM_PRICE と照合。
 * マッチしない場合は 'free' を返す。
 */
function resolvePlan(priceId: string | undefined): 'free' | 'basic' | 'premium' {
  if (!priceId) return 'free';

  if (priceId === process.env.STRIPE_BASIC_PRICE) return 'basic';
  if (priceId === process.env.STRIPE_PREMIUM_PRICE) return 'premium';

  console.warn(`Unknown price ID: ${priceId}`);
  return 'free';
}
