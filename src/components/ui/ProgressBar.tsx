import { motion } from 'framer-motion';

/**
 * Progress bar component props
 */
export interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  showCount?: boolean;
  color?: 'purple' | 'blue' | 'green' | 'orange' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Progress Bar Component
 *
 * プログレスバーコンポーネント
 * - パーセント表示
 * - カウント表示
 * - カラーバリエーション
 * - サイズバリエーション
 * - アニメーション対応
 */
export function ProgressBar({
  current,
  total,
  label,
  showPercentage = true,
  showCount = true,
  color = 'purple',
  size = 'md'
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  // カラー設定
  const colorClasses = {
    purple: 'from-purple-500 to-indigo-600',
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-amber-600',
    red: 'from-red-500 to-rose-600'
  };

  const textColorClasses = {
    purple: 'text-purple-600 dark:text-purple-400',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400'
  };

  // サイズ設定
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="w-full">
      {/* ラベルとパーセント/カウント */}
      {(label || showPercentage || showCount) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className={`${textSizeClasses[size]} text-gray-700 dark:text-gray-300 font-medium`}>
              {label}
            </span>
          )}
          <div className={`${textSizeClasses[size]} font-bold ${textColorClasses[color]} flex items-center gap-2`}>
            {showCount && (
              <span>
                {current}/{total}
              </span>
            )}
            {showPercentage && (
              <span>({percentage.toFixed(0)}%)</span>
            )}
          </div>
        </div>
      )}

      {/* プログレスバー */}
      <div className={`w-full ${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${colorClasses[color]} rounded-full`}
        />
      </div>
    </div>
  );
}

/**
 * Circular Progress Bar Component
 */
export interface CircularProgressBarProps {
  current: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  color?: 'purple' | 'blue' | 'green' | 'orange' | 'red';
  showPercentage?: boolean;
}

export function CircularProgressBar({
  current,
  total,
  size = 120,
  strokeWidth = 8,
  color = 'purple',
  showPercentage = true
}: CircularProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorStroke = {
    purple: '#8b5cf6',
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f97316',
    red: '#ef4444'
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colorStroke[color]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference
          }}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
