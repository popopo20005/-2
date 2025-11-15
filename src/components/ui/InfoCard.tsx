import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { type StatCardTheme } from '../../styles/designTokens';

export interface InfoCardProps {
  /**
   * カードのテーマ
   */
  theme?: StatCardTheme;
  /**
   * アイコン
   */
  icon?: LucideIcon;
  /**
   * タイトル
   */
  title: string;
  /**
   * 説明文
   */
  description: string;
  /**
   * アクションボタンのテキスト
   */
  actionText?: string;
  /**
   * アクションボタンのクリックハンドラ
   */
  onAction?: () => void;
  /**
   * カードのバリアント
   */
  variant?: 'default' | 'outlined' | 'filled';
}

/**
 * 情報カードコンポーネント
 * お知らせ、おすすめアクション、ヒントなどを表示
 */
export function InfoCard({
  theme = 'learning',
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  variant = 'default',
}: InfoCardProps) {
  // グラデーションの色を取得
  const getGradientColors = () => {
    switch (theme) {
      case 'learning':
        return {
          light: 'linear-gradient(to bottom right, #eff6ff, #e0f2fe)',
          iconGradient: 'linear-gradient(to bottom right, #3b82f6, #06b6d4)',
          border: '#3b82f6',
        };
      case 'success':
        return {
          light: 'linear-gradient(to bottom right, #f0fdf4, #dcfce7)',
          iconGradient: 'linear-gradient(to bottom right, #10b981, #34d399)',
          border: '#10b981',
        };
      case 'focus':
        return {
          light: 'linear-gradient(to bottom right, #faf5ff, #f3e8ff)',
          iconGradient: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
          border: '#a855f7',
        };
      case 'streak':
        return {
          light: 'linear-gradient(to bottom right, #fff7ed, #fed7aa)',
          iconGradient: 'linear-gradient(to bottom right, #f97316, #dc2626)',
          border: '#f97316',
        };
      case 'analysis':
        return {
          light: 'linear-gradient(to bottom right, #eef2ff, #e0e7ff)',
          iconGradient: 'linear-gradient(to bottom right, #6366f1, #8b5cf6)',
          border: '#6366f1',
        };
      case 'progress':
        return {
          light: 'linear-gradient(to bottom right, #f0fdfa, #ccfbf1)',
          iconGradient: 'linear-gradient(to bottom right, #14b8a6, #06b6d4)',
          border: '#14b8a6',
        };
      case 'achievement':
        return {
          light: 'linear-gradient(to bottom right, #fffbeb, #fef3c7)',
          iconGradient: 'linear-gradient(to bottom right, #f59e0b, #eab308)',
          border: '#f59e0b',
        };
      default:
        return {
          light: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)',
          iconGradient: 'linear-gradient(to bottom right, #6b7280, #9ca3af)',
          border: '#6b7280',
        };
    }
  };

  const colors = getGradientColors();

  const getCardStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          border: `2px solid ${colors.border}`,
        };
      case 'filled':
        return {
          background: colors.light,
          border: `1px solid ${colors.border}`,
        };
      default:
        return {};
    }
  };

  return (
    <Card style={getCardStyles()}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* アイコン */}
          {Icon && (
            <div
              className="size-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ backgroundColor: colors.border }}
            >
              <Icon className="size-6" style={{ color: '#ffffff' }} />
            </div>
          )}

          {/* コンテンツ */}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-lg mb-1" style={{ color: colors.border }}>
              {title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {description}
            </p>

            {/* アクションボタン */}
            {actionText && onAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAction}
                className="mt-2"
              >
                {actionText}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
