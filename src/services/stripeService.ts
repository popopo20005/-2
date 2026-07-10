/**
 * Stripe Service - サブスクリプション決済システム
 *
 * Stripe Checkout を使用した月課金サブスクリプション管理。
 * Cloud Functions（Firebase）でセッション作成・Webhook処理を行う。
 * Firebase Auth トークンによる認証必須。
 */

import { getFirebaseAuth, isFirebaseConfigured } from './firebaseConfig';

// ============================================================
// Cloud Functions URL ヘルパー
// ============================================================

function getFunctionsUrl(): string {
  const envUrl = import.meta.env.VITE_FUNCTIONS_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (projectId) {
    return `https://us-central1-${projectId}.cloudfunctions.net`;
  }

  throw new Error('Cloud Functions URLが設定されていません');
}

async function getIdToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('ログインが必要です');
  }
  return user.getIdToken();
}

// ============================================================
// 型定義
// ============================================================

export type SubscriptionPlan = 'free' | 'basic' | 'premium';

export interface PlanInfo {
  id: SubscriptionPlan;
  name: string;
  price: number; // 円/月
  priceId: string; // Stripe Price ID
  features: string[];
  aiGenerationLimit: number; // 月間AI生成上限（-1=無制限）
  voiceQuality: 'standard' | 'premium';
}

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  isActive: boolean;
  periodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  customerId?: string;
}

// ============================================================
// プラン定義
// ============================================================

const PLANS: Record<SubscriptionPlan, PlanInfo> = {
  free: {
    id: 'free',
    name: 'スタンダード',
    price: 0,
    priceId: '',
    features: [
      '月間AI問題生成: 20問',
      '標準音声読み上げ',
      'IndexedDBローカル保存',
      'SM-2スペースドリピティション',
      '学習プラン作成',
    ],
    aiGenerationLimit: 20,
    voiceQuality: 'standard',
  },
  basic: {
    id: 'basic',
    name: 'プロ',
    price: 490,
    priceId: import.meta.env.VITE_STRIPE_BASIC_PRICE || '',
    features: [
      '月間AI問題生成: 50問',
      '標準音声読み上げ',
      'Firebaseクラウド同期',
      '全機能アクセス',
      '優先サポート',
    ],
    aiGenerationLimit: 50,
    voiceQuality: 'standard',
  },
  premium: {
    id: 'premium',
    name: 'プレミアム',
    price: 990,
    priceId: import.meta.env.VITE_STRIPE_PREMIUM_PRICE || '',
    features: [
      '無制限AI問題生成',
      '高品質音声読み上げ（Neural TTS）',
      'Firebaseクラウド同期',
      'PDF/画像から問題生成',
      'AI生成レポート',
      '全機能アクセス',
      '優先サポート',
    ],
    aiGenerationLimit: -1,
    voiceQuality: 'premium',
  },
};

// ============================================================
// ローカルサブスクリプション状態
// ============================================================

const SUBSCRIPTION_KEY = 'minguella_subscription';

function loadSubscription(): SubscriptionStatus {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_KEY);
    if (!raw) return { plan: 'free', isActive: true };
    const data = JSON.parse(raw);
    return {
      ...data,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
    };
  } catch {
    return { plan: 'free', isActive: true };
  }
}

function saveSubscription(status: SubscriptionStatus): void {
  localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(status));
}

// ============================================================
// StripeService クラス
// ============================================================

class StripeService {
  isConfigured(): boolean {
    return isFirebaseConfigured() && !!(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  }

  /**
   * Checkout セッションを開始する（Firebase Auth必須）
   */
  async startCheckout(plan: SubscriptionPlan): Promise<void> {
    if (plan === 'free') {
      throw new Error('フリープランにアップグレードする必要がありません');
    }

    const planInfo = PLANS[plan];
    if (!planInfo.priceId) {
      throw new Error(`${planInfo.name}プランのPrice IDが設定されていません`);
    }

    const idToken = await getIdToken();
    const functionsUrl = getFunctionsUrl();

    const response = await fetch(`${functionsUrl}/createCheckoutSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ priceId: planInfo.priceId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const { sessionUrl } = await response.json();
    if (sessionUrl) {
      window.location.href = sessionUrl;
    } else {
      throw new Error('セッションURLが返されませんでした');
    }
  }

  /**
   * Customer Portal を開く（Firebase Auth必須）
   */
  async openCustomerPortal(): Promise<void> {
    const idToken = await getIdToken();
    const functionsUrl = getFunctionsUrl();

    const response = await fetch(`${functionsUrl}/createPortalSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'ポータルセッション作成に失敗しました');
    }

    const { url } = await response.json();
    window.location.href = url;
  }

  // ============================================================
  // ローカルサブスクリプション管理
  // ============================================================

  getSubscriptionStatus(): SubscriptionStatus {
    return loadSubscription();
  }

  updateSubscriptionStatus(status: SubscriptionStatus): void {
    saveSubscription(status);
  }

  getCurrentPlan(): PlanInfo {
    const status = loadSubscription();
    return PLANS[status.plan];
  }

  getPlanInfo(plan: SubscriptionPlan): PlanInfo {
    return PLANS[plan];
  }

  getAllPlans(): PlanInfo[] {
    return Object.values(PLANS);
  }

  canUseFeature(feature: 'ai_generation' | 'premium_voice' | 'cloud_sync' | 'pdf_import'): boolean {
    const plan = this.getCurrentPlan();

    switch (feature) {
      case 'ai_generation':
        return true; // 全プラン対応（量制限あり）
      case 'premium_voice':
        return plan.voiceQuality === 'premium';
      case 'cloud_sync':
        return plan.id !== 'free';
      case 'pdf_import':
        return plan.id === 'premium';
      default:
        return false;
    }
  }

  getAIGenerationLimit(): number {
    return this.getCurrentPlan().aiGenerationLimit;
  }
}

export const stripeService = new StripeService();
