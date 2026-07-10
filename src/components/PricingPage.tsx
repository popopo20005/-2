/**
 * PricingPage - 料金プラン比較ページ
 *
 * Free / Basic / Premium の3段階プランを表示し、
 * アップグレードボタンで Stripe Checkout に遷移する。
 */

import { useState } from 'react';
import { ArrowLeft, Check, Crown, Zap, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import type { SubscriptionPlan } from '../services/stripeService';
import type { View } from '../types';

interface PricingPageProps {
  onBack: () => void;
  onNavigate: (view: View) => void;
}

const PLAN_ICONS: Record<SubscriptionPlan, React.ReactNode> = {
  free: <Zap className="size-6 text-gray-500" />,
  basic: <Star className="size-6 text-blue-500" />,
  premium: <Crown className="size-6 text-amber-500" />,
};

const PLAN_COLORS: Record<SubscriptionPlan, { border: string; bg: string; button: string }> = {
  free: {
    border: 'border-gray-200 dark:border-gray-700',
    bg: 'bg-white dark:bg-gray-800',
    button: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  },
  basic: {
    border: 'border-blue-300 dark:border-blue-600 ring-2 ring-blue-200 dark:ring-blue-800',
    bg: 'bg-white dark:bg-gray-800',
    button: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  premium: {
    border: 'border-amber-300 dark:border-amber-600 ring-2 ring-amber-200 dark:ring-amber-800',
    bg: 'bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-gray-800',
    button: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600',
  },
};

export function PricingPage({ onBack, onNavigate }: PricingPageProps) {
  const { user } = useAuth();
  const { plan: currentPlan, startCheckout, loading } = useSubscription();
  const { getAllPlans } = useSubscription();
  const plans = getAllPlans();
  const [checkoutLoading, setCheckoutLoading] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!user) {
      onNavigate('settings');
      return;
    }

    if (plan === 'free' || plan === currentPlan) return;

    setError(null);
    setCheckoutLoading(plan);
    try {
      await startCheckout(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : '決済開始に失敗しました');
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      {/* ヘッダー */}
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="size-5" />
          <span>戻る</span>
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            プランを選択
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            あなたの学習スタイルに合ったプランをお選びください
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {!user && (
          <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-sm text-center">
            アップグレードするには
            <button
              onClick={() => onNavigate('settings')}
              className="underline font-medium ml-1"
            >
              ログイン
            </button>
            が必要です
          </div>
        )}

        {/* プランカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {plans.map((plan) => {
            const colors = PLAN_COLORS[plan.id];
            const isCurrent = plan.id === currentPlan;
            const isUpgrade = plan.price > (plans.find(p => p.id === currentPlan)?.price || 0);

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border ${colors.border} ${colors.bg} p-6 flex flex-col`}
              >
                {/* おすすめバッジ */}
                {plan.id === 'basic' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                    おすすめ
                  </div>
                )}

                {/* プランヘッダー */}
                <div className="flex items-center gap-3 mb-4">
                  {PLAN_ICONS[plan.id]}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {plan.name}
                    </h3>
                  </div>
                </div>

                {/* 価格 */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {plan.price === 0 ? '無料' : `¥${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-500 dark:text-gray-400 text-sm">/月</span>
                    )}
                  </div>
                </div>

                {/* 機能リスト */}
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="size-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* アクションボタン */}
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading || isCurrent || plan.id === 'free' || checkoutLoading !== null}
                  className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                    isCurrent
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 cursor-default'
                      : isUpgrade && plan.id !== 'free'
                        ? colors.button
                        : colors.button
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {checkoutLoading === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      処理中...
                    </span>
                  ) : isCurrent ? (
                    '現在のプラン'
                  ) : plan.id === 'free' ? (
                    '無料プラン'
                  ) : (
                    'アップグレード'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* 注釈 */}
        <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>サブスクリプションはいつでもキャンセルできます</p>
          <p>お支払いはStripeで安全に処理されます</p>
        </div>
      </div>
    </div>
  );
}
