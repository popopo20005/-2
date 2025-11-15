import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

export interface SectionHeaderProps {
  /**
   * アイコン
   */
  icon?: LucideIcon;
  /**
   * アイコンの色 (Tailwindクラス)
   */
  iconColor?: string;
  /**
   * タイトル
   */
  title: string | ReactNode;
  /**
   * サブタイトル (オプション)
   */
  subtitle?: string | ReactNode;
  /**
   * 右側に表示するアクション (オプション)
   */
  action?: ReactNode;
  /**
   * サイズ
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * セクションヘッダーコンポーネント
 * 統一されたデザインのセクションヘッダー
 */
export function SectionHeader({
  icon: Icon,
  iconColor = 'text-blue-500',
  title,
  subtitle,
  action,
  size = 'md',
}: SectionHeaderProps) {
  const sizeClasses = {
    sm: {
      title: 'text-base font-semibold',
      subtitle: 'text-xs',
      icon: 'size-4',
    },
    md: {
      title: 'text-lg font-semibold',
      subtitle: 'text-sm',
      icon: 'size-5',
    },
    lg: {
      title: 'text-xl font-bold',
      subtitle: 'text-base',
      icon: 'size-6',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`${classes.icon} ${iconColor}`} />}
          <h3 className={`${classes.title} text-gray-900 dark:text-gray-100`}>
            {title}
          </h3>
        </div>
        {subtitle && (
          <p className={`${classes.subtitle} text-gray-600 dark:text-gray-400 mt-1 ml-${Icon ? '7' : '0'}`}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}
