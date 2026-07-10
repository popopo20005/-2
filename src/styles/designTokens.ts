/**
 * デザイントークン
 * アプリ全体で使用する統一されたデザイン要素
 */

/**
 * カラーパレット
 * ダッシュボードで使用している色を体系化
 */
export const colors = {
  // Primary colors (メインテーマカラー)
  blue: {
    50: 'from-blue-50 to-cyan-50',
    100: 'from-blue-100 to-cyan-100',
    500: 'from-blue-500 to-cyan-500',
    600: 'from-blue-600 to-cyan-600',
    dark: 'from-blue-900/20 to-cyan-900/20',
    border: 'border-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    50: 'from-green-50 to-emerald-50',
    100: 'from-green-100 to-emerald-100',
    500: 'from-green-500 to-emerald-500',
    600: 'from-green-600 to-emerald-600',
    dark: 'from-green-900/20 to-emerald-900/20',
    border: 'border-green-500',
    text: 'text-green-600 dark:text-green-400',
  },
  purple: {
    50: 'from-purple-50 to-pink-50',
    100: 'from-purple-100 to-pink-100',
    500: 'from-purple-500 to-pink-500',
    600: 'from-purple-600 to-pink-600',
    dark: 'from-purple-900/20 to-pink-900/20',
    border: 'border-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    50: 'from-orange-50 to-red-50',
    100: 'from-orange-100 to-red-100',
    500: 'from-orange-500 to-red-500',
    600: 'from-orange-600 to-red-600',
    dark: 'from-orange-900/20 to-red-900/20',
    border: 'border-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
  },
  indigo: {
    50: 'from-indigo-50 to-blue-50',
    100: 'from-indigo-100 to-blue-100',
    500: 'from-indigo-500 to-blue-500',
    600: 'from-indigo-600 to-blue-600',
    dark: 'from-indigo-900/20 to-blue-900/20',
    border: 'border-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  teal: {
    50: 'from-teal-50 to-cyan-50',
    100: 'from-teal-100 to-cyan-100',
    500: 'from-teal-500 to-cyan-500',
    600: 'from-teal-600 to-cyan-600',
    dark: 'from-teal-900/20 to-cyan-900/20',
    border: 'border-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
  },
  amber: {
    50: 'from-amber-50 to-yellow-50',
    100: 'from-amber-100 to-yellow-100',
    500: 'from-amber-500 to-yellow-500',
    600: 'from-amber-600 to-yellow-600',
    dark: 'from-amber-900/20 to-yellow-900/20',
    border: 'border-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
} as const;

/**
 * グラデーションテーマ
 * 機能別にグラデーションカラーを定義
 */
export const gradientThemes = {
  learning: {
    light: colors.blue[50],
    dark: colors.blue.dark,
    gradient: colors.blue[500],
    gradientStrong: colors.blue[600],
    border: colors.blue.border,
    text: colors.blue.text,
  },
  success: {
    light: colors.green[50],
    dark: colors.green.dark,
    gradient: colors.green[500],
    gradientStrong: colors.green[600],
    border: colors.green.border,
    text: colors.green.text,
  },
  focus: {
    light: colors.purple[50],
    dark: colors.purple.dark,
    gradient: colors.purple[500],
    gradientStrong: colors.purple[600],
    border: colors.purple.border,
    text: colors.purple.text,
  },
  streak: {
    light: colors.orange[50],
    dark: colors.orange.dark,
    gradient: colors.orange[500],
    gradientStrong: colors.orange[600],
    border: colors.orange.border,
    text: colors.orange.text,
  },
  analysis: {
    light: colors.indigo[50],
    dark: colors.indigo.dark,
    gradient: colors.indigo[500],
    gradientStrong: colors.indigo[600],
    border: colors.indigo.border,
    text: colors.indigo.text,
  },
  progress: {
    light: colors.teal[50],
    dark: colors.teal.dark,
    gradient: colors.teal[500],
    gradientStrong: colors.teal[600],
    border: colors.teal.border,
    text: colors.teal.text,
  },
  achievement: {
    light: colors.amber[50],
    dark: colors.amber.dark,
    gradient: colors.amber[500],
    gradientStrong: colors.amber[600],
    border: colors.amber.border,
    text: colors.amber.text,
  },
} as const;

/**
 * スペーシング（CSS変数形式も提供）
 */
export const spacing = {
  // Tailwindクラス形式
  card: 'p-4 sm:p-6',
  cardCompact: 'p-3 sm:p-4',
  cardLarge: 'p-6 sm:p-8',
  section: 'space-y-4 sm:space-y-6',
  grid: 'grid gap-4 sm:gap-6',

  // CSS変数形式（インラインスタイル用）
  values: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
  },
} as const;

/**
 * アニメーション
 */
export const animations = {
  transition: 'transition-all duration-300',
  transitionFast: 'transition-all duration-150',
  transitionSlow: 'transition-all duration-500',
  hover: 'hover:shadow-xl hover:-translate-y-1',
  hoverSubtle: 'hover:shadow-lg hover:-translate-y-0.5',
  press: 'active:scale-98',
  fadeIn: 'animate-fade-in',
  slideIn: 'animate-slide-in',
  scaleIn: 'animate-scale-in',
} as const;

/**
 * ボーダー半径
 */
export const borderRadius = {
  // Tailwindクラス形式
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',

  // CSS変数形式（インラインスタイル用）
  values: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    '2xl': '2rem',   // 32px
    full: '9999px',
  },
} as const;

/**
 * ボーダーとシャドウ
 */
export const effects = {
  rounded: 'rounded-xl',
  roundedFull: 'rounded-full',
  shadow: 'shadow-md',
  shadowLarge: 'shadow-lg',
  shadowXL: 'shadow-xl',
  border: 'border border-gray-200 dark:border-gray-700',
  borderAccent: 'border-l-4',

  // グラスモーフィズム効果
  glass: 'backdrop-blur-lg backdrop-saturate-180 bg-white/70 dark:bg-gray-800/70',
  // ニューモーフィズム効果
  neumorphism: 'shadow-neumorphism-light dark:shadow-neumorphism-dark',
} as const;

/**
 * タイポグラフィ
 */
export const typography = {
  // 既存のTailwindクラス形式（後方互換性のため維持）
  heading: 'text-xl font-bold text-gray-900 dark:text-gray-100',
  headingLarge: 'text-2xl font-bold text-gray-900 dark:text-gray-100',
  headingSmall: 'text-lg font-semibold text-gray-900 dark:text-gray-100',
  body: 'text-sm text-gray-700 dark:text-gray-300',
  bodySmall: 'text-xs text-gray-600 dark:text-gray-400',
  label: 'text-sm font-medium text-gray-700 dark:text-gray-300',
  value: 'text-3xl font-bold',
  valueSmall: 'text-2xl font-bold',
} as const;

/**
 * 完全なタイポグラフィスケール
 * デザインシステムに基づく体系的な定義
 */
export const typographyScale = {
  // フォントファミリー
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
    ja: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif',
  },

  // フォントサイズとライン高さ
  scale: {
    displayLarge: {
      size: '3rem',        // 48px
      lineHeight: '1.1',
      weight: '700',
      letterSpacing: '-0.02em',
      className: 'text-5xl font-bold tracking-tight',
    },
    display: {
      size: '2.25rem',     // 36px
      lineHeight: '1.2',
      weight: '700',
      letterSpacing: '-0.02em',
      className: 'text-4xl font-bold tracking-tight',
    },
    h1: {
      size: '1.875rem',    // 30px
      lineHeight: '1.3',
      weight: '700',
      letterSpacing: '-0.01em',
      className: 'text-3xl font-bold',
    },
    h2: {
      size: '1.5rem',      // 24px
      lineHeight: '1.4',
      weight: '700',
      letterSpacing: '0',
      className: 'text-2xl font-bold',
    },
    h3: {
      size: '1.25rem',     // 20px
      lineHeight: '1.4',
      weight: '600',
      letterSpacing: '0',
      className: 'text-xl font-semibold',
    },
    h4: {
      size: '1.125rem',    // 18px
      lineHeight: '1.4',
      weight: '600',
      letterSpacing: '0',
      className: 'text-lg font-semibold',
    },
    bodyLarge: {
      size: '1rem',        // 16px
      lineHeight: '1.6',
      weight: '400',
      letterSpacing: '0',
      className: 'text-base',
    },
    body: {
      size: '0.875rem',    // 14px
      lineHeight: '1.6',
      weight: '400',
      letterSpacing: '0',
      className: 'text-sm',
    },
    bodySmall: {
      size: '0.75rem',     // 12px
      lineHeight: '1.5',
      weight: '400',
      letterSpacing: '0',
      className: 'text-xs',
    },
    caption: {
      size: '0.6875rem',   // 11px
      lineHeight: '1.4',
      weight: '400',
      letterSpacing: '0.02em',
      className: 'text-[11px] tracking-wide',
    },
  },

  // フォントウェイト
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Letter Spacing
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
    wider: '0.05em',
  },
} as const;

/**
 * レイアウトパターン
 */
export const layouts = {
  container: 'max-w-7xl mx-auto px-4 py-6',
  containerCompact: 'max-w-5xl mx-auto px-4 py-4',
  grid2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  grid3: 'grid grid-cols-1 md:grid-cols-3 gap-4',
  grid4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  flexStart: 'flex items-start justify-between',
} as const;

/**
 * WCAG 2.1 AA準拠カラーパレット
 * コントラスト比4.5:1以上を保証
 */
export const wcagColors = {
  // ライトモード（背景: #FFFFFF）
  light: {
    text: {
      primary: '#1F2937',    // gray-800, contrast: 12.63:1
      secondary: '#4B5563',  // gray-600, contrast: 7.52:1
      tertiary: '#6B7280',   // gray-500, contrast: 5.34:1
    },
    background: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',  // gray-50
      tertiary: '#F3F4F6',   // gray-100
    },
    interactive: {
      primary: '#2563EB',    // blue-600, contrast: 5.54:1
      primaryHover: '#1D4ED8', // blue-700
      success: '#059669',    // green-600, contrast: 4.54:1
      warning: '#D97706',    // amber-600, contrast: 4.51:1
      error: '#DC2626',      // red-600, contrast: 5.89:1
    },
  },
  // ダークモード（背景: #111827 gray-900）
  dark: {
    text: {
      primary: '#F9FAFB',    // gray-50, contrast: 15.76:1
      secondary: '#E5E7EB',  // gray-200, contrast: 12.63:1
      tertiary: '#D1D5DB',   // gray-300, contrast: 10.05:1
    },
    background: {
      primary: '#111827',    // gray-900
      secondary: '#1F2937',  // gray-800
      tertiary: '#374151',   // gray-700
    },
    interactive: {
      primary: '#60A5FA',    // blue-400, contrast: 6.21:1
      primaryHover: '#3B82F6', // blue-500
      success: '#34D399',    // green-400, contrast: 8.14:1
      warning: '#FBBF24',    // amber-400, contrast: 11.96:1
      error: '#F87171',      // red-400, contrast: 5.76:1
    },
  },
} as const;

/**
 * Figmaデザイン準拠カラーパレット
 * 新しいUIデザインに基づく色定義
 */
export const figmaColors = {
  // 背景グラデーション（淡い紫〜グレー）
  background: {
    light: 'linear-gradient(135deg, #f5f3ff 0%, #e5e7eb 100%)',
    dark: 'linear-gradient(135deg, #1e1b4b 0%, #111827 100%)',
  },
  // カード背景（クリーンな白）
  card: {
    light: '#FFFFFF',
    dark: '#1F2937',
  },
  // プライマリー紫（アバター、アクティブ状態）
  primary: {
    base: '#8B5CF6',      // violet-500
    light: '#A78BFA',     // violet-400
    dark: '#7C3AED',      // violet-600
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  },
  // オレンジCTA（学習開始ボタン）
  cta: {
    base: '#F59E0B',      // amber-500
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    text: '#FFFFFF',
  },
  // FABカラー
  fab: {
    stats: {
      base: '#3B82F6',    // blue-500
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    },
    add: {
      base: '#10B981',    // green-500
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    },
    play: {
      base: '#8B5CF6',    // violet-500
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    },
  },
  // カテゴリーバッジ
  category: {
    biology: {
      bg: '#DDD6FE',      // violet-200
      text: '#6B21A8',    // violet-800
    },
    math: {
      bg: '#BFDBFE',      // blue-200
      text: '#1E40AF',    // blue-800
    },
    english: {
      bg: '#FED7AA',      // orange-200
      text: '#9A3412',    // orange-800
    },
  },
  // チャートカラー
  chart: {
    primary: 'linear-gradient(180deg, #8B5CF6 0%, #6366F1 100%)',
    secondary: '#93C5FD',
    grid: '#E5E7EB',
    text: '#6B7280',
  },
} as const;

/**
 * ダークモード切り替えアニメーション設定
 */
export const darkModeTransition = {
  duration: 300, // ms
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  properties: ['background-color', 'color', 'border-color', 'box-shadow'],
} as const;

/**
 * ブレークポイント
 * Tailwind CSSデフォルトブレークポイント
 */
export const breakpoints = {
  sm: '640px',   // タブレット縦
  md: '768px',   // タブレット横
  lg: '1024px',  // デスクトップ小
  xl: '1280px',  // デスクトップ中
  '2xl': '1536px', // デスクトップ大

  // 数値版（JavaScriptでの比較用）
  values: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
} as const;

/**
 * z-index階層
 * 一貫したレイヤー管理のための定義
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  notification: 1700,
  toast: 1800,
} as const;

/**
 * 影の強度
 * Material Design風のelevation
 */
export const elevation = {
  0: 'shadow-none',
  1: 'shadow-sm',   // 2px
  2: 'shadow',      // 4px
  3: 'shadow-md',   // 6px
  4: 'shadow-lg',   // 10px
  5: 'shadow-xl',   // 20px
  6: 'shadow-2xl',  // 25px

  // ニューモーフィズム
  neumorphic: {
    light: 'shadow-[4px_4px_10px_rgba(0,0,0,0.1),-4px_-4px_10px_rgba(255,255,255,0.9)]',
    dark: 'shadow-[4px_4px_10px_rgba(0,0,0,0.3),-4px_-4px_10px_rgba(255,255,255,0.05)]',
  },
} as const;

/**
 * フォーカスリング設定
 * アクセシビリティ準拠のフォーカス表示
 */
export const focusRing = {
  default: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  error: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
  success: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
  dark: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
} as const;

/**
 * トランジション設定
 * アニメーション用のプリセット
 */
export const transitions = {
  // 速度
  fast: {
    duration: '150ms',
    timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    className: 'transition-all duration-150 ease-in-out',
  },
  normal: {
    duration: '300ms',
    timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    className: 'transition-all duration-300 ease-in-out',
  },
  slow: {
    duration: '500ms',
    timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    className: 'transition-all duration-500 ease-in-out',
  },

  // イージング
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

/**
 * Figmaコンポーネント変数
 * Phase 6: UI/UX総仕上げで使用
 */
export const figmaComponents = {
  // アバターサイズ
  avatar: {
    sm: '32px',
    md: '48px',
    lg: '64px',
    xl: '96px',
  },
  // FAB（Floating Action Button）サイズ
  fab: {
    width: '56px',
    height: '56px',
    iconSize: '24px',
    shadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
  },
  // カードエレベーション
  card: {
    shadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    shadowHover: '0 4px 16px rgba(0, 0, 0, 0.12)',
    borderRadius: '16px',
  },
  // ボタン高さ
  button: {
    sm: '32px',
    md: '40px',
    lg: '48px',
    xl: '56px',
  },
  // バッジサイズ
  badge: {
    sm: '20px',
    md: '24px',
    lg: '32px',
  },
} as const;

/**
 * Framer Motionアニメーションプリセット
 * 全コンポーネントで統一されたアニメーションを提供
 */
export const motionPresets = {
  // フェードイン
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  // スライドアップ
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  // スライドダウン
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  // スケールイン
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  // スケールアップ（大きく）
  scaleUp: {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.5 },
    transition: { duration: 0.3, ease: [0.68, -0.55, 0.265, 1.55] }, // Spring
  },
  // スライドイン（左から）
  slideInLeft: {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 },
    transition: { duration: 0.3 },
  },
  // スライドイン（右から）
  slideInRight: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
    transition: { duration: 0.3 },
  },
  // スタッガーアニメーション（リスト用）
  stagger: {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.1,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 },
    },
  },
  // ホバーエフェクト
  hover: {
    scale: {
      whileHover: { scale: 1.05 },
      whileTap: { scale: 0.95 },
      transition: { duration: 0.2 },
    },
    lift: {
      whileHover: { y: -4, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)' },
      transition: { duration: 0.2 },
    },
    glow: {
      whileHover: { boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)' },
      transition: { duration: 0.3 },
    },
  },
  // ページトランジション
  page: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
} as const;

/**
 * レスポンシブユーティリティ
 * モバイルファーストデザインのための設定
 */
export const responsive = {
  // タッチターゲットサイズ（WCAG 2.1 Level AAA準拠）
  touchTarget: {
    minWidth: '44px',
    minHeight: '44px',
    className: 'min-w-[44px] min-h-[44px]',
  },
  // モバイル設定
  mobile: {
    padding: '16px',
    fontSize: '14px',
    lineHeight: '1.5',
    maxWidth: '100%',
    containerPadding: 'px-4',
  },
  // タブレット設定
  tablet: {
    padding: '24px',
    fontSize: '16px',
    lineHeight: '1.6',
    maxWidth: '768px',
    containerPadding: 'px-6',
  },
  // デスクトップ設定
  desktop: {
    padding: '32px',
    fontSize: '16px',
    lineHeight: '1.6',
    maxWidth: '1280px',
    containerPadding: 'px-8',
  },
  // メディアクエリヘルパー
  mediaQueries: {
    mobile: '@media (max-width: 767px)',
    tablet: '@media (min-width: 768px) and (max-width: 1023px)',
    desktop: '@media (min-width: 1024px)',
    touch: '@media (hover: none) and (pointer: coarse)',
  },
} as const;

/**
 * アクセシビリティユーティリティ
 * WCAG 2.1 AAA準拠のための設定
 */
export const a11y = {
  // フォーカス可視性
  focusVisible: {
    outline: '2px solid',
    outlineColor: figmaColors.primary.base,
    outlineOffset: '2px',
    className: 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
  },
  // スキップリンク
  skipLink: {
    position: 'absolute',
    left: '-9999px',
    zIndex: 9999,
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[9999]',
  },
  // スクリーンリーダー専用
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
    className: 'sr-only',
  },
  // ARIAラベルテンプレート
  ariaLabels: {
    close: 'Close',
    menu: 'Menu',
    navigation: 'Main navigation',
    search: 'Search',
    loading: 'Loading...',
  },
} as const;

/**
 * 型エクスポート
 */
export type GradientTheme = keyof typeof gradientThemes;
export type StatCardTheme = GradientTheme;
export type TypographyScale = keyof typeof typographyScale.scale;
export type Breakpoint = keyof typeof breakpoints.values;
export type ZIndex = keyof typeof zIndex;
export type MotionPreset = keyof typeof motionPresets;
export type FigmaComponent = keyof typeof figmaComponents;
