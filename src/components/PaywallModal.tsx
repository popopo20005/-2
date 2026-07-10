/**
 * PaywallModal - 機能制限時のアップグレード促進モーダル
 *
 * プレミアム機能へのアクセス時に表示し、
 * 必要なプランとアップグレードボタンを提供する。
 */

import { Lock, Crown, X } from 'lucide-react';
import type { SubscriptionPlan } from '../services/stripeService';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  requiredPlan: SubscriptionPlan;
  onUpgrade: () => void;
}

const PLAN_NAMES: Record<SubscriptionPlan, string> = {
  free: 'スタンダード',
  basic: 'プロ',
  premium: 'プレミアム',
};

export function PaywallModal({ isOpen, onClose, featureName, requiredPlan, onUpgrade }: PaywallModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* モーダル */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="size-5" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <Lock className="size-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {featureName}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          この機能を使うには
          <span className="font-medium text-amber-600 dark:text-amber-400 mx-1">
            {PLAN_NAMES[requiredPlan]}プラン
          </span>
          以上が必要です
        </p>

        <button
          onClick={onUpgrade}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
        >
          <Crown className="size-4" />
          プランを見る
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          あとで
        </button>
      </div>
    </div>
  );
}
