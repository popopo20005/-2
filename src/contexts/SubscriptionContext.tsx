/**
 * SubscriptionContext - グローバルサブスクリプション状態管理
 *
 * Firestore の users/{uid}/private/subscription をリアルタイム購読し、
 * サブスクリプション状態をアプリ全体に提供する。
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { getFirestore_, isFirebaseConfigured } from '../services/firebaseConfig';
import { useAuth } from './AuthContext';
import { stripeService, type SubscriptionPlan, type SubscriptionStatus, type PlanInfo } from '../services/stripeService';

// ============================================================
// Context 型定義
// ============================================================

interface SubscriptionContextValue {
  plan: SubscriptionPlan;
  isActive: boolean;
  periodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  loading: boolean;
  canUseFeature: (feature: 'ai_generation' | 'premium_voice' | 'cloud_sync' | 'pdf_import') => boolean;
  getPlanInfo: (plan: SubscriptionPlan) => PlanInfo;
  getAllPlans: () => PlanInfo[];
  startCheckout: (plan: SubscriptionPlan) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// ============================================================
// SubscriptionProvider
// ============================================================

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    plan: 'free',
    isActive: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 未ログインまたはFirebase未設定の場合はfreeプラン
    if (!user || !isFirebaseConfigured()) {
      setSubscription({ plan: 'free', isActive: true });
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const firestore = getFirestore_();
      const subRef = doc(firestore, `users/${user.uid}/private/subscription`);

      const unsubscribe = onSnapshot(
        subRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const status: SubscriptionStatus = {
              plan: (data.plan as SubscriptionPlan) || 'free',
              isActive: data.status === 'active' || data.status === 'trialing',
              periodEnd: data.periodEnd?.toDate?.() || (data.periodEnd ? new Date(data.periodEnd) : undefined),
              cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
              customerId: data.customerId,
            };
            setSubscription(status);
            // localStorageにもキャッシュ（オフライン用）
            stripeService.updateSubscriptionStatus(status);
          } else {
            setSubscription({ plan: 'free', isActive: true });
          }
          setLoading(false);
        },
        (error) => {
          console.warn('[Subscription] Firestore購読エラー:', error);
          // フォールバック: localStorageから読み込み
          setSubscription(stripeService.getSubscriptionStatus());
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch {
      setSubscription(stripeService.getSubscriptionStatus());
      setLoading(false);
    }
  }, [user]);

  const canUseFeature = (feature: 'ai_generation' | 'premium_voice' | 'cloud_sync' | 'pdf_import'): boolean => {
    const plan = stripeService.getPlanInfo(subscription.plan);
    switch (feature) {
      case 'ai_generation':
        return true;
      case 'premium_voice':
        return plan.voiceQuality === 'premium';
      case 'cloud_sync':
        return subscription.plan !== 'free';
      case 'pdf_import':
        return subscription.plan === 'premium';
      default:
        return false;
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        plan: subscription.plan,
        isActive: subscription.isActive,
        periodEnd: subscription.periodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        loading,
        canUseFeature,
        getPlanInfo: (plan) => stripeService.getPlanInfo(plan),
        getAllPlans: () => stripeService.getAllPlans(),
        startCheckout: (plan) => stripeService.startCheckout(plan),
        openCustomerPortal: () => stripeService.openCustomerPortal(),
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ============================================================
// useSubscription フック
// ============================================================

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
