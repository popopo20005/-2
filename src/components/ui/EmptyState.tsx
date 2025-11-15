import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { typography, effects } from '../../styles/designTokens';

export interface EmptyStateProps {
  /**
   * アイコン（Lucide Icon）
   */
  icon: LucideIcon;
  /**
   * タイトル
   */
  title: string;
  /**
   * 説明文
   */
  description: string;
  /**
   * プライマリアクションボタンのテキスト
   */
  actionText?: string;
  /**
   * プライマリアクションボタンのクリックハンドラ
   */
  onAction?: () => void;
  /**
   * セカンダリアクションボタンのテキスト
   */
  secondaryActionText?: string;
  /**
   * セカンダリアクションボタンのクリックハンドラ
   */
  onSecondaryAction?: () => void;
  /**
   * カスタムイラストレーション（オプション）
   */
  illustration?: ReactNode;
  /**
   * コンパクトモード（余白を小さくする）
   */
  compact?: boolean;
}

/**
 * 空状態デザインコンポーネント
 * データがない、まだ作成されていないなどの状態を美しく表示
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={BookOpen}
 *   title="問題集がありません"
 *   description="最初の問題セットを作成して学習を始めましょう"
 *   actionText="問題セットを作成"
 *   onAction={() => navigate('/create')}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  illustration,
  compact = false,
}: EmptyStateProps) {
  return (
    <Card className="overflow-hidden">
      <div
        className={`
          flex flex-col items-center justify-center text-center
          ${compact ? 'py-8 px-4' : 'py-16 px-6'}
        `}
      >
        {/* イラストレーションまたはアイコン */}
        {illustration ? (
          <div className="mb-6">{illustration}</div>
        ) : (
          <div
            className={`
              ${effects.rounded}
              bg-gradient-to-br from-gray-100 to-gray-50
              dark:from-gray-800 dark:to-gray-700
              p-6 mb-6
              ${effects.shadow}
            `}
          >
            <Icon
              className={`
                ${compact ? 'size-12' : 'size-16'}
                text-gray-400 dark:text-gray-500
              `}
              strokeWidth={1.5}
            />
          </div>
        )}

        {/* タイトル */}
        <h3
          className={`
            ${compact ? typography.headingSmall : typography.headingLarge}
            mb-2
          `}
        >
          {title}
        </h3>

        {/* 説明文 */}
        <p
          className={`
            ${typography.body}
            max-w-md mb-6
          `}
        >
          {description}
        </p>

        {/* アクションボタン */}
        {(actionText || secondaryActionText) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {actionText && onAction && (
              <Button variant="primary" size="md" onClick={onAction}>
                {actionText}
              </Button>
            )}
            {secondaryActionText && onSecondaryAction && (
              <Button variant="outline" size="md" onClick={onSecondaryAction}>
                {secondaryActionText}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * よく使う空状態のプリセット
 */
export const EmptyStatePresets = {
  /**
   * 問題集が空の状態
   */
  noQuizSets: (onCreateQuizSet: () => void) => ({
    title: '問題集がありません',
    description: '最初の問題セットを作成して学習を始めましょう。CSVファイルからのインポートも可能です。',
    actionText: '問題セットを作成',
    onAction: onCreateQuizSet,
  }),

  /**
   * 問題が空の状態
   */
  noProblems: (onCreateProblem: () => void) => ({
    title: 'まだ問題がありません',
    description: '最初の問題を追加して学習を開始しましょう。',
    actionText: '問題を追加',
    onAction: onCreateProblem,
  }),

  /**
   * 学習履歴が空の状態
   */
  noHistory: () => ({
    title: '学習履歴がありません',
    description: 'まだ問題を解いていません。最初の問題に挑戦してみましょう！',
  }),

  /**
   * 統計データが空の状態
   */
  noStatistics: () => ({
    title: '統計データがありません',
    description: '問題を解いて学習を続けると、ここに詳細な統計が表示されます。',
  }),

  /**
   * 復習が必要な問題がない状態
   */
  noReviewNeeded: (onStartNewQuiz: () => void) => ({
    title: 'すべてクリア！',
    description: '復習が必要な問題はありません。新しい問題に挑戦しましょう！',
    actionText: '新しい問題に挑戦',
    onAction: onStartNewQuiz,
  }),

  /**
   * 検索結果が空の状態
   */
  noSearchResults: (searchQuery: string) => ({
    title: '検索結果が見つかりません',
    description: `「${searchQuery}」に一致する結果がありませんでした。別のキーワードで試してみてください。`,
  }),

  /**
   * フィルター結果が空の状態
   */
  noFilteredResults: (onClearFilter: () => void) => ({
    title: 'フィルター条件に一致する項目がありません',
    description: 'フィルター条件を変更するか、クリアしてすべての項目を表示してください。',
    actionText: 'フィルターをクリア',
    onAction: onClearFilter,
  }),
} as const;
