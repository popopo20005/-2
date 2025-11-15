import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card } from './Card';
import { type StatCardTheme } from '../../styles/designTokens';

export interface StatCardProps {
  /**
   * カードのテーマ (learning, success, focus, streak, etc.)
   */
  theme: StatCardTheme;
  /**
   * 表示するアイコン
   */
  icon: LucideIcon;
  /**
   * メインの値
   */
  value: string | number;
  /**
   * 目標値 (オプション)
   */
  goal?: string | number;
  /**
   * ラベル
   */
  label: string;
  /**
   * プログレスバーを表示するか
   */
  showProgress?: boolean;
  /**
   * プログレスの割合 (0-100)
   */
  progress?: number;
  /**
   * 追加の統計情報 (例: "+5% ↑")
   */
  additionalInfo?: string;
  /**
   * クリックハンドラ
   */
  onClick?: () => void;
}

/**
 * 統計カードコンポーネント
 * ダッシュボードで使用する統一されたデザインの統計カード
 */
export function StatCard({
  theme,
  icon: Icon,
  value,
  goal,
  label,
  showProgress = false,
  progress = 0,
  additionalInfo,
  onClick,
}: StatCardProps) {
  const hasGoal = goal !== undefined;

  // ダークモード判定
  const [isDark, setIsDark] = React.useState(() => {
    const darkMode = document.documentElement.classList.contains('dark');
    console.log('[StatCard] Initial isDark:', darkMode, 'theme:', theme);
    return darkMode;
  });

  React.useEffect(() => {
    console.log('[StatCard] useEffect mounted for theme:', theme);
    const observer = new MutationObserver(() => {
      const newIsDark = document.documentElement.classList.contains('dark');
      console.log('[StatCard] Dark mode changed:', newIsDark, 'theme:', theme);
      setIsDark(newIsDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      console.log('[StatCard] useEffect cleanup for theme:', theme);
      observer.disconnect();
    };
  }, [theme]);

  // グラデーションの色を取得
  const getGradientColors = () => {
    switch (theme) {
      case 'learning':
        return {
          lightBg: 'linear-gradient(to bottom right, #eff6ff, #e0f2fe)',
          darkBg: 'linear-gradient(to bottom right, rgba(30, 58, 138, 0.95), rgba(12, 74, 110, 0.95))',
          iconGradient: 'linear-gradient(to bottom right, #3b82f6, #06b6d4)',
          textGradient: 'linear-gradient(to right, #2563eb, #0891b2)',
          border: '#3b82f6',
          textColor: '#3b82f6',
          darkTextColor: '#60a5fa',
          progressBar: 'linear-gradient(to right, #3b82f6, #06b6d4)',
        };
      case 'success':
        return {
          lightBg: 'linear-gradient(to bottom right, #f0fdf4, #dcfce7)',
          darkBg: 'linear-gradient(to bottom right, rgba(20, 83, 45, 0.95), rgba(21, 128, 61, 0.95))',
          iconGradient: 'linear-gradient(to bottom right, #10b981, #34d399)',
          textGradient: 'linear-gradient(to right, #059669, #10b981)',
          border: '#10b981',
          textColor: '#10b981',
          darkTextColor: '#34d399',
          progressBar: 'linear-gradient(to right, #10b981, #34d399)',
        };
      case 'focus':
        return {
          lightBg: 'linear-gradient(to bottom right, #faf5ff, #f3e8ff)',
          darkBg: 'linear-gradient(to bottom right, rgba(88, 28, 135, 0.95), rgba(126, 34, 206, 0.95))',
          iconGradient: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
          textGradient: 'linear-gradient(to right, #9333ea, #db2777)',
          border: '#a855f7',
          textColor: '#a855f7',
          darkTextColor: '#c084fc',
          progressBar: 'linear-gradient(to right, #a855f7, #ec4899)',
        };
      case 'streak':
        return {
          lightBg: 'linear-gradient(to bottom right, #fff7ed, #fed7aa)',
          darkBg: 'linear-gradient(to bottom right, rgba(124, 45, 18, 0.95), rgba(194, 65, 12, 0.95))',
          iconGradient: 'linear-gradient(to bottom right, #f97316, #dc2626)',
          textGradient: 'linear-gradient(to right, #ea580c, #b91c1c)',
          border: '#f97316',
          textColor: '#f97316',
          darkTextColor: '#fb923c',
          progressBar: 'linear-gradient(to right, #f97316, #dc2626)',
        };
      case 'analysis':
        return {
          lightBg: 'linear-gradient(to bottom right, #eef2ff, #e0e7ff)',
          darkBg: 'linear-gradient(to bottom right, rgba(55, 48, 163, 0.95), rgba(79, 70, 229, 0.95))',
          iconGradient: 'linear-gradient(to bottom right, #6366f1, #8b5cf6)',
          textGradient: 'linear-gradient(to right, #4f46e5, #7c3aed)',
          border: '#6366f1',
          textColor: '#6366f1',
          darkTextColor: '#818cf8',
          progressBar: 'linear-gradient(to right, #6366f1, #8b5cf6)',
        };
      case 'progress':
        return {
          lightBg: 'linear-gradient(to bottom right, #f0fdfa, #ccfbf1)',
          darkBg: 'linear-gradient(to bottom right, rgba(19, 78, 74, 0.95), rgba(15, 118, 110, 0.95))',
          iconGradient: 'linear-gradient(to bottom right, #14b8a6, #06b6d4)',
          textGradient: 'linear-gradient(to right, #0d9488, #0891b2)',
          border: '#14b8a6',
          textColor: '#14b8a6',
          darkTextColor: '#2dd4bf',
          progressBar: 'linear-gradient(to right, #14b8a6, #06b6d4)',
        };
      case 'achievement':
        return {
          lightBg: 'linear-gradient(to bottom right, #fffbeb, #fef3c7)',
          darkBg: 'linear-gradient(to bottom right, rgba(120, 53, 15, 0.95), rgba(161, 98, 7, 0.95))',
          iconGradient: 'linear-gradient(to bottom right, #f59e0b, #eab308)',
          textGradient: 'linear-gradient(to right, #d97706, #ca8a04)',
          border: '#f59e0b',
          textColor: '#f59e0b',
          darkTextColor: '#fbbf24',
          progressBar: 'linear-gradient(to right, #f59e0b, #eab308)',
        };
      default:
        return {
          lightBg: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)',
          darkBg: 'linear-gradient(to bottom right, rgba(31, 41, 55, 0.95), rgba(55, 65, 81, 0.95))',
          iconGradient: 'linear-gradient(to bottom right, #6b7280, #9ca3af)',
          textGradient: 'linear-gradient(to right, #4b5563, #6b7280)',
          border: '#6b7280',
          textColor: '#6b7280',
          darkTextColor: '#9ca3af',
          progressBar: 'linear-gradient(to right, #6b7280, #9ca3af)',
        };
    }
  };

  const colors = getGradientColors();

  // デバッグ: 背景色を確認
  const backgroundStyle = isDark ? colors.darkBg : colors.lightBg;
  console.log('[StatCard] Render - theme:', theme, 'isDark:', isDark, 'background:', backgroundStyle);

  return (
    <Card
      hoverable
      clickable={!!onClick}
      padding="none"
      className="overflow-hidden"
      style={{ borderLeft: `4px solid ${colors.border}` }}
      onClick={onClick}
    >
      <div
        className="p-4"
        style={{
          background: backgroundStyle,
        }}
      >
        {/* ラベルとアイコン - 上部に配置 */}
        <div className="flex items-center gap-2 mb-3">
          <Icon className="size-5 dark:text-white" style={{ color: colors.textColor }} />
          <div className="text-sm font-bold dark:text-white" style={{ color: colors.textColor }}>
            {label}
          </div>
        </div>

        {/* 値と目標 */}
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            {value}
          </div>
          {hasGoal && (
            <div className="text-lg font-medium text-gray-600 dark:text-gray-200">
              / {goal}
            </div>
          )}
        </div>

        {/* 追加情報 */}
        {additionalInfo && (
          <div className="text-xs font-semibold mb-2 dark:text-white" style={{ color: colors.textColor }}>
            {additionalInfo}
          </div>
        )}

        {/* プログレスバー */}
        {showProgress && (
          <div className="w-full rounded-full h-2.5 overflow-hidden bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: colors.progressBar
              }}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
