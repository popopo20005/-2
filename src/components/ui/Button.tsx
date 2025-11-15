import { forwardRef, useState, useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { touchTarget } from '../../styles/designSystem';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

/**
 * 共通Buttonコンポーネント
 * デザインシステムに基づいた統一されたボタン
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
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
      ...props
    },
    ref
  ) => {
    // ダークモード判定
    const [isDark, setIsDark] = useState(
      typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    );

    useEffect(() => {
      if (typeof document === 'undefined') return;

      const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      return () => observer.disconnect();
    }, []);

    // ベーススタイル
    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-lg
      transition-all duration-300
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      select-none
      ${fullWidth ? 'w-full' : ''}
    `;

    // サイズ別スタイル
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm gap-1.5 min-h-[36px]',
      md: `px-4 py-2 text-base gap-2 min-h-[${touchTarget.web.minSize}]`,
      lg: 'px-6 py-3 text-lg gap-2.5 min-h-[56px]',
    };

    // バリアント別スタイル
    const variantStyles = {
      primary: `
        bg-blue-600 dark:bg-blue-500
        text-white
        hover:bg-blue-700 dark:hover:bg-blue-600
        active:bg-blue-800 dark:active:bg-blue-700
        focus:ring-blue-500
        shadow-md hover:shadow-lg
      `,
      secondary: `
        bg-purple-600 dark:bg-purple-500
        text-white
        hover:bg-purple-700 dark:hover:bg-purple-600
        active:bg-purple-800 dark:active:bg-purple-700
        focus:ring-purple-500
        shadow-md hover:shadow-lg
      `,
      success: `
        bg-green-600 dark:bg-green-500
        text-white
        hover:bg-green-700 dark:hover:bg-green-600
        active:bg-green-800 dark:active:bg-green-700
        focus:ring-green-500
        shadow-md hover:shadow-lg
      `,
      warning: `
        bg-orange-500 dark:bg-orange-400
        text-white
        hover:bg-orange-600 dark:hover:bg-orange-500
        active:bg-orange-700 dark:active:bg-orange-600
        focus:ring-orange-500
        shadow-md hover:shadow-lg
      `,
      error: `
        bg-red-600 dark:bg-red-500
        text-white
        hover:bg-red-700 dark:hover:bg-red-600
        active:bg-red-800 dark:active:bg-red-700
        focus:ring-red-500
        shadow-md hover:shadow-lg
      `,
      ghost: `
        bg-transparent
        text-gray-700 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-800
        active:bg-gray-200 dark:active:bg-gray-700
        focus:ring-gray-400
      `,
      outline: `
        bg-transparent
        border-2 border-gray-300 dark:border-gray-500
        text-gray-700 dark:text-white
        hover:bg-gray-50 dark:hover:bg-gray-800
        hover:border-gray-400 dark:hover:border-gray-400
        active:bg-gray-100 dark:active:bg-gray-700
        focus:ring-gray-400
      `,
    };

    // ホバーエフェクト（マイクロインタラクション）
    const hoverEffect = variant !== 'ghost' && variant !== 'outline'
      ? 'hover:scale-105 active:scale-95'
      : 'active:scale-98';

    const combinedStyles = `
      ${baseStyles}
      ${sizeStyles[size]}
      ${variantStyles[variant]}
      ${hoverEffect}
      ${className}
    `.replace(/\s+/g, ' ').trim();

    // outline variantの場合、inlineスタイルでテキストカラーを強制
    const inlineStyles = variant === 'outline' ? {
      color: isDark ? 'rgb(255, 255, 255)' : 'rgb(55, 65, 81)', // white : gray-700
      borderColor: isDark ? 'rgb(107, 114, 128)' : 'rgb(209, 213, 219)', // gray-500 : gray-300
    } : {};

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={combinedStyles}
        style={inlineStyles}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
          <span className="inline-flex items-center">{leftIcon}</span>
        )}

        <span>{children}</span>

        {!isLoading && rightIcon && (
          <span className="inline-flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
