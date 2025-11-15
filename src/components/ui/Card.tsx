import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export type CardVariant = 'default' | 'glass' | 'neumorphism' | 'gradient';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  clickable?: boolean;
  children: ReactNode;
}

/**
 * 共通Cardコンポーネント
 * デザインシステムに基づいた統一されたカード
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverable = false,
      clickable = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // ベーススタイル
    const baseStyles = `
      rounded-xl
      transition-all duration-300
      ${clickable ? 'cursor-pointer' : ''}
    `;

    // パディング
    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-4 sm:p-6',
      lg: 'p-6 sm:p-8',
    };

    // バリアント別スタイル
    const variantStyles = {
      default: `
        ${padding !== 'none' ? 'bg-white dark:bg-gray-800/90' : 'bg-transparent'}
        border border-gray-200 dark:border-gray-600
        shadow-md
        ${hoverable ? 'hover:shadow-xl hover:-translate-y-1' : ''}
        ${clickable ? 'active:scale-98' : ''}
      `,
      glass: `
        bg-white/70 dark:bg-gray-800/85
        backdrop-blur-lg backdrop-saturate-180
        border border-white/30 dark:border-gray-600/50
        shadow-lg
        ${hoverable ? 'hover:shadow-2xl hover:bg-white/80 dark:hover:bg-gray-800/95' : ''}
        ${clickable ? 'active:scale-98' : ''}
      `,
      neumorphism: `
        bg-gray-100 dark:bg-gray-800/90
        shadow-neumorphism-light dark:shadow-neumorphism-dark
        ${hoverable ? 'hover:shadow-neumorphism-light-hover dark:hover:shadow-neumorphism-dark-hover dark:hover:bg-gray-800/95' : ''}
        ${clickable ? 'active:shadow-neumorphism-light-pressed dark:active:shadow-neumorphism-dark-pressed' : ''}
      `,
      gradient: `
        bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/35 dark:to-purple-900/35
        border border-blue-200 dark:border-blue-600
        shadow-lg
        ${hoverable ? 'hover:shadow-xl hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/45 dark:hover:to-purple-900/45' : ''}
        ${clickable ? 'active:scale-98' : ''}
      `,
    };

    const combinedStyles = `
      ${baseStyles}
      ${paddingStyles[padding]}
      ${variantStyles[variant]}
      ${className}
    `.replace(/\s+/g, ' ').trim();

    return (
      <div ref={ref} className={combinedStyles} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader - カードのヘッダー部分
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle - カードのタイトル
 */
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ as: Component = 'h3', className = '', children, ...props }, ref) => {
    return (
      <Component
        ref={ref as any}
        className={`text-xl font-bold text-gray-900 dark:text-gray-100 ${className}`}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

CardTitle.displayName = 'CardTitle';

/**
 * CardDescription - カードの説明文
 */
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

/**
 * CardContent - カードのコンテンツ部分
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

/**
 * CardFooter - カードのフッター部分
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
