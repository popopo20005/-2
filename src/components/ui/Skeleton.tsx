import { type HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 幅（Tailwindクラスまたはカスタム値）
   */
  width?: string;
  /**
   * 高さ（Tailwindクラスまたはカスタム値）
   */
  height?: string;
  /**
   * 円形スケルトン
   */
  circle?: boolean;
  /**
   * アニメーションなし
   */
  noAnimation?: boolean;
  /**
   * カスタムクラス名
   */
  className?: string;
}

/**
 * スケルトンローダーベースコンポーネント
 * データ読み込み中のプレースホルダー表示
 *
 * @example
 * ```tsx
 * // 基本的な使い方
 * <Skeleton width="w-full" height="h-20" />
 *
 * // 円形（アバター用）
 * <Skeleton width="w-12" height="h-12" circle />
 *
 * // カスタムサイズ
 * <Skeleton width="200px" height="80px" />
 * ```
 */
export function Skeleton({
  width = 'w-full',
  height = 'h-4',
  circle = false,
  noAnimation = false,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  // カスタム値（px, rem など）か Tailwind クラスかを判定
  const isCustomWidth = width.includes('px') || width.includes('rem') || width.includes('%');
  const isCustomHeight = height.includes('px') || height.includes('rem') || height.includes('%');

  const baseClasses = `
    bg-gray-200 dark:bg-gray-700
    ${circle ? 'rounded-full' : 'rounded-md'}
    ${!noAnimation ? 'animate-pulse' : ''}
    ${!isCustomWidth ? width : ''}
    ${!isCustomHeight ? height : ''}
    ${className}
  `.trim();

  const customStyles = {
    ...(isCustomWidth && { width }),
    ...(isCustomHeight && { height }),
    ...style,
  };

  return <div className={baseClasses} style={customStyles} {...props} />;
}

/**
 * テキスト用スケルトン
 * 複数行のテキストプレースホルダー
 */
export interface SkeletonTextProps {
  /**
   * 行数
   */
  lines?: number;
  /**
   * 最終行の幅（%）
   */
  lastLineWidth?: number;
  /**
   * コンパクトモード（行間を狭くする）
   */
  compact?: boolean;
}

export function SkeletonText({ lines = 3, lastLineWidth = 60, compact = false }: SkeletonTextProps) {
  return (
    <div className={`space-y-${compact ? '2' : '3'}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? `${lastLineWidth}%` : 'w-full'}
          height={compact ? 'h-3' : 'h-4'}
        />
      ))}
    </div>
  );
}

/**
 * カード用スケルトン
 * 統計カードやコンテンツカードのプレースホルダー
 */
export interface SkeletonCardProps {
  /**
   * アバター/アイコンを表示
   */
  showAvatar?: boolean;
  /**
   * タイトル行数
   */
  titleLines?: number;
  /**
   * 本文行数
   */
  bodyLines?: number;
}

export function SkeletonCard({ showAvatar = false, titleLines = 1, bodyLines = 3 }: SkeletonCardProps) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md">
      <div className="flex items-start gap-4">
        {/* アバター/アイコン */}
        {showAvatar && <Skeleton width="w-12" height="h-12" circle />}

        <div className="flex-1">
          {/* タイトル */}
          {titleLines > 0 && (
            <div className="mb-3">
              <SkeletonText lines={titleLines} compact />
            </div>
          )}

          {/* 本文 */}
          {bodyLines > 0 && <SkeletonText lines={bodyLines} lastLineWidth={70} />}
        </div>
      </div>
    </div>
  );
}

/**
 * リスト用スケルトン
 * カードリストやアイテムリストのプレースホルダー
 */
export interface SkeletonListProps {
  /**
   * アイテム数
   */
  count?: number;
  /**
   * アバターを表示
   */
  showAvatar?: boolean;
  /**
   * カード形式（境界線とパディング）
   */
  asCard?: boolean;
}

export function SkeletonList({ count = 5, showAvatar = true, asCard = true }: SkeletonListProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {asCard ? (
            <SkeletonCard showAvatar={showAvatar} titleLines={1} bodyLines={2} />
          ) : (
            <div className="flex items-center gap-4">
              {showAvatar && <Skeleton width="w-10" height="h-10" circle />}
              <div className="flex-1">
                <SkeletonText lines={2} lastLineWidth={60} compact />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * 統計カード用スケルトン
 * ダッシュボードのStatCardプレースホルダー
 */
export function SkeletonStatCard() {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        {/* アイコン */}
        <Skeleton width="w-10" height="h-10" />
        {/* ラベル */}
        <Skeleton width="w-24" height="h-5" />
      </div>

      {/* 値 */}
      <Skeleton width="w-32" height="h-10" className="mb-3" />

      {/* プログレスバー（オプション） */}
      <Skeleton width="w-full" height="h-2" />
    </div>
  );
}

/**
 * 統計グリッド用スケルトン
 * ダッシュボードの統計カードグリッド
 */
export interface SkeletonStatGridProps {
  /**
   * カード数
   */
  count?: number;
  /**
   * グリッド列数
   */
  columns?: 2 | 3 | 4;
}

export function SkeletonStatGrid({ count = 3, columns = 3 }: SkeletonStatGridProps) {
  const gridClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonStatCard key={index} />
      ))}
    </div>
  );
}

/**
 * グラフ/チャート用スケルトン
 */
export function SkeletonChart({ height = 'h-64' }: { height?: string }) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md">
      {/* タイトル */}
      <Skeleton width="w-48" height="h-6" className="mb-6" />

      {/* チャートエリア */}
      <Skeleton width="w-full" height={height} />
    </div>
  );
}
