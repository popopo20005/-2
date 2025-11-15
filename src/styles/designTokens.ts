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
 * 型エクスポート
 */
export type GradientTheme = keyof typeof gradientThemes;
export type StatCardTheme = GradientTheme;
