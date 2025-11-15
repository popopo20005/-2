import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'info';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

/**
 * Badgeコンポーネント
 * 小さなラベル表示
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      px-2.5 py-0.5
      text-xs font-medium
      rounded-full
      transition-colors
    `;

    const variantStyles = {
      default: `
        bg-blue-100 dark:bg-blue-900/30
        text-blue-700 dark:text-blue-300
      `,
      secondary: `
        bg-purple-100 dark:bg-purple-900/30
        text-purple-700 dark:text-purple-300
      `,
      success: `
        bg-green-100 dark:bg-green-900/30
        text-green-700 dark:text-green-300
      `,
      warning: `
        bg-orange-100 dark:bg-orange-900/30
        text-orange-700 dark:text-orange-300
      `,
      error: `
        bg-red-100 dark:bg-red-900/30
        text-red-700 dark:text-red-300
      `,
      info: `
        bg-cyan-100 dark:bg-cyan-900/30
        text-cyan-700 dark:text-cyan-300
      `,
      outline: `
        bg-transparent
        border border-gray-300 dark:border-gray-600
        text-gray-700 dark:text-gray-300
      `,
    };

    const combinedStyles = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${className}
    `.replace(/\s+/g, ' ').trim();

    return (
      <span ref={ref} className={combinedStyles} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
