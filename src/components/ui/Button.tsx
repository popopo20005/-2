import { forwardRef, useState, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { touchTarget } from '../../styles/designSystem';
import { focusRing, transitions } from '../../styles/designTokens';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Framer Motion互換のButton Props定義
export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  name?: string;
  value?: string;
  form?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  id?: string;
  title?: string;
  tabIndex?: number;
}

/**
 * 共通Buttonコンポーネント（WCAG AA準拠）
 *
 * アクセシビリティ機能:
 * - ARIA属性のサポート
 * - キーボードナビゲーション完全対応
 * - フォーカス表示の明確化
 * - タップターゲット最小44×44px
 * - prefers-reduced-motion対応
 * - ダークモード対応
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    isLoading = false,
    leftIcon,
    rightIcon,
    disabled,
    className = '',
    children,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    type,
    name,
    value,
    form,
    id,
    title,
    tabIndex,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-expanded': ariaExpanded,
    'aria-controls': ariaControls,
    'aria-haspopup': ariaHaspopup,
    style: customStyle,
  },
  ref
) {
    // ダークモード判定
    const [isDark, setIsDark] = useState(
      typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    );

    // prefers-reduced-motion判定
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    useEffect(() => {
      if (typeof document === 'undefined') return;

      // ダークモード監視
      const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (typeof window === 'undefined') return;

      // prefers-reduced-motion監視
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        setPrefersReducedMotion(e.matches);
      };

      // 初期値設定
      handleChange(mediaQuery);

      // イベントリスナー登録（古いブラウザ対応）
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else {
        // @ts-ignore - 古いブラウザ対応
        mediaQuery.addListener(handleChange);
        // @ts-ignore
        return () => mediaQuery.removeListener(handleChange);
      }
    }, []);

    // ベーススタイル
    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-lg
      ${prefersReducedMotion ? '' : transitions.normal.className}
      disabled:opacity-50 disabled:cursor-not-allowed
      select-none
      ${fullWidth ? 'w-full' : ''}
    `;

    // サイズ別スタイル（タップターゲット44×44px以上を保証）
    const sizeStyles = {
      sm: 'px-3 py-2 text-sm gap-1.5 min-h-[44px]',  // モバイル対応: 44px
      md: `px-4 py-2.5 text-base gap-2 min-h-[${touchTarget.web.minSize}]`,
      lg: 'px-6 py-3 text-lg gap-2.5 min-h-[56px]',
    };

    // フォーカスリング（デザイントークンから取得）
    const getFocusRing = () => {
      if (variant === 'error') return focusRing.error;
      if (variant === 'success') return focusRing.success;
      return isDark ? focusRing.dark : focusRing.default;
    };

    // バリアント別スタイル
    const variantStyles = {
      primary: `
        bg-blue-600 dark:bg-blue-500
        text-white
        hover:bg-blue-700 dark:hover:bg-blue-600
        active:bg-blue-800 dark:active:bg-blue-700
        shadow-md hover:shadow-lg
        ${!prefersReducedMotion ? 'hover:-translate-y-0.5 active:scale-98' : ''}
      `,
      secondary: `
        bg-purple-600 dark:bg-purple-500
        text-white
        hover:bg-purple-700 dark:hover:bg-purple-600
        active:bg-purple-800 dark:active:bg-purple-700
        shadow-md hover:shadow-lg
        ${!prefersReducedMotion ? 'hover:-translate-y-0.5 active:scale-98' : ''}
      `,
      success: `
        bg-green-600 dark:bg-green-500
        text-white
        hover:bg-green-700 dark:hover:bg-green-600
        active:bg-green-800 dark:active:bg-green-700
        shadow-md hover:shadow-lg
        ${!prefersReducedMotion ? 'hover:-translate-y-0.5 active:scale-98' : ''}
      `,
      warning: `
        bg-orange-500 dark:bg-orange-400
        text-white
        hover:bg-orange-600 dark:hover:bg-orange-500
        active:bg-orange-700 dark:active:bg-orange-600
        shadow-md hover:shadow-lg
        ${!prefersReducedMotion ? 'hover:-translate-y-0.5 active:scale-98' : ''}
      `,
      error: `
        bg-red-600 dark:bg-red-500
        text-white
        hover:bg-red-700 dark:hover:bg-red-600
        active:bg-red-800 dark:active:bg-red-700
        shadow-md hover:shadow-lg
        ${!prefersReducedMotion ? 'hover:-translate-y-0.5 active:scale-98' : ''}
      `,
      ghost: `
        bg-transparent
        text-gray-700 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-800
        active:bg-gray-200 dark:active:bg-gray-700
        ${!prefersReducedMotion ? 'active:scale-98' : ''}
      `,
      outline: `
        bg-transparent
        border-2 border-gray-300 dark:border-gray-500
        text-gray-700 dark:text-white
        hover:bg-gray-50 dark:hover:bg-gray-800
        hover:border-gray-400 dark:hover:border-gray-400
        active:bg-gray-100 dark:active:bg-gray-700
        ${!prefersReducedMotion ? 'active:scale-98' : ''}
      `,
    };

    const combinedStyles = `
      ${baseStyles}
      ${sizeStyles[size]}
      ${variantStyles[variant]}
      ${getFocusRing()}
      ${className}
    `.replace(/\s+/g, ' ').trim();

    // outline variantの場合、inlineスタイルでテキストカラーを強制
    const inlineStyles: React.CSSProperties = {
      ...(variant === 'outline' ? {
        color: isDark ? 'rgb(255, 255, 255)' : 'rgb(55, 65, 81)', // white : gray-700
        borderColor: isDark ? 'rgb(107, 114, 128)' : 'rgb(209, 213, 219)', // gray-500 : gray-300
      } : {}),
      ...customStyle,
    };

    // ARIA属性
    const ariaProps = {
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-expanded': ariaExpanded,
      'aria-controls': ariaControls,
      'aria-haspopup': ariaHaspopup,
      'aria-busy': isLoading,
      'aria-disabled': disabled || isLoading,
    };

    // Framer Motionアニメーション設定（Phase 6統合）
    const motionProps = prefersReducedMotion ? {} : {
      whileHover: { scale: variant === 'ghost' || variant === 'outline' ? 1 : 1.02 },
      whileTap: { scale: 0.98 },
      transition: { duration: 0.2 },
    };

    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        className={combinedStyles}
        style={inlineStyles}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        type={type}
        name={name}
        value={value}
        form={form}
        id={id}
        title={title}
        tabIndex={tabIndex}
        {...motionProps}
        {...ariaProps}
      >
        {isLoading && (
          <svg
            className={`h-4 w-4 ${prefersReducedMotion ? '' : 'animate-spin'}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {!isLoading && leftIcon && (
          <span className="inline-flex items-center" aria-hidden="true">
            {leftIcon}
          </span>
        )}

        <span>{children}</span>

        {!isLoading && rightIcon && (
          <span className="inline-flex items-center" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </motion.button>
    );
});
