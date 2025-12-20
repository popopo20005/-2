/**
 * デザインシステム定義
 * アプリ全体で使用する色、タイポグラフィ、スペーシングなどの基準値
 */

// ========================================
// カラーパレット
// ========================================

export const colors = {
  light: {
    // Primary - メインブルー（学習・集中を象徴）
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6', // メイン
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },

    // Secondary - パープル（達成感・ゲーミフィケーション）
    secondary: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
      700: '#7E22CE',
      800: '#6B21A8',
      900: '#581C87',
    },

    // Success - グリーン（正解・成功）
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#10B981', // メイン
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
    },

    // Warning - オレンジ（注意・復習必要）
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B', // メイン
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },

    // Error - レッド（不正解・エラー）
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444', // メイン
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },

    // Info - ブルー（情報）
    info: {
      50: '#F0F9FF',
      100: '#E0F2FE',
      200: '#BAE6FD',
      300: '#7DD3FC',
      400: '#38BDF8',
      500: '#0EA5E9',
      600: '#0284C7',
      700: '#0369A1',
      800: '#075985',
      900: '#0C4A6E',
    },

    // Neutral - グレー（テキスト・背景）
    neutral: {
      50: '#F9FAFB',   // 背景
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',  // テキスト
    },
  },

  dark: {
    // Primary - ライトブルー（ダークモードで目に優しい）
    primary: {
      50: '#1E3A8A',
      100: '#1E40AF',
      200: '#1D4ED8',
      300: '#2563EB',
      400: '#3B82F6',
      500: '#60A5FA', // メイン
      600: '#93C5FD',
      700: '#BFDBFE',
      800: '#DBEAFE',
      900: '#EFF6FF',
    },

    // Secondary - ライトパープル
    secondary: {
      50: '#581C87',
      100: '#6B21A8',
      200: '#7E22CE',
      300: '#9333EA',
      400: '#A855F7',
      500: '#C084FC',
      600: '#D8B4FE',
      700: '#E9D5FF',
      800: '#F3E8FF',
      900: '#FAF5FF',
    },

    // Success - ライトグリーン
    success: {
      50: '#064E3B',
      100: '#065F46',
      200: '#047857',
      300: '#059669',
      400: '#10B981',
      500: '#34D399', // メイン
      600: '#6EE7B7',
      700: '#A7F3D0',
      800: '#D1FAE5',
      900: '#ECFDF5',
    },

    // Warning - ライトオレンジ
    warning: {
      50: '#78350F',
      100: '#92400E',
      200: '#B45309',
      300: '#D97706',
      400: '#F59E0B',
      500: '#FBBF24', // メイン
      600: '#FCD34D',
      700: '#FDE68A',
      800: '#FEF3C7',
      900: '#FFFBEB',
    },

    // Error - ライトレッド
    error: {
      50: '#7F1D1D',
      100: '#991B1B',
      200: '#B91C1C',
      300: '#DC2626',
      400: '#EF4444',
      500: '#F87171', // メイン
      600: '#FCA5A5',
      700: '#FECACA',
      800: '#FEE2E2',
      900: '#FEF2F2',
    },

    // Info - ライトブルー
    info: {
      50: '#0C4A6E',
      100: '#075985',
      200: '#0369A1',
      300: '#0284C7',
      400: '#0EA5E9',
      500: '#38BDF8',
      600: '#7DD3FC',
      700: '#BAE6FD',
      800: '#E0F2FE',
      900: '#F0F9FF',
    },

    // Neutral - ダークグレー
    neutral: {
      50: '#111827',  // 背景
      100: '#1F2937',
      200: '#374151',
      300: '#4B5563',
      400: '#6B7280',
      500: '#9CA3AF',
      600: '#D1D5DB',
      700: '#E5E7EB',
      800: '#F3F4F6',
      900: '#F9FAFB',  // テキスト
    },
  },
};

// ========================================
// タイポグラフィ
// ========================================

export const typography = {
  // フォントファミリー
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    jp: '"Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W3", Meiryo, メイリオ, Osaka, "MS PGothic", arial, helvetica, sans-serif',
  },

  // フォントサイズ
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
  },

  // フォントウェイト
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // 行間
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // 文字間隔
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// ========================================
// スペーシング
// ========================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
};

// ========================================
// ブレークポイント
// ========================================

export const breakpoints = {
  sm: '640px',   // モバイル横向き
  md: '768px',   // タブレット
  lg: '1024px',  // ノートPC
  xl: '1280px',  // デスクトップ
  '2xl': '1536px', // 大画面
};

// ========================================
// 角丸
// ========================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

// ========================================
// シャドウ
// ========================================

export const boxShadow = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  none: '0 0 #0000',
};

// ========================================
// アニメーション
// ========================================

export const animation = {
  // イージング
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // 期間
  duration: {
    fast: '150ms',
    base: '300ms',
    slow: '500ms',
    slower: '1000ms',
  },
};

// ========================================
// z-index階層
// ========================================

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
};

// ========================================
// 特殊効果
// ========================================

export const effects = {
  // グラスモーフィズム
  glassmorphism: {
    light: {
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(10px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    },
    dark: {
      background: 'rgba(17, 24, 39, 0.7)',
      backdropFilter: 'blur(10px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    },
  },

  // ニューモーフィズム
  neumorphism: {
    light: {
      background: '#e0e5ec',
      boxShadow: '9px 9px 16px rgba(163, 177, 198, 0.6), -9px -9px 16px rgba(255, 255, 255, 0.5)',
    },
    dark: {
      background: '#2d3748',
      boxShadow: '9px 9px 16px rgba(0, 0, 0, 0.4), -9px -9px 16px rgba(74, 85, 104, 0.2)',
    },
  },

  // グラデーション
  gradient: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    warning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    error: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    sunset: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ocean: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
};

// ========================================
// タッチターゲット（アクセシビリティ）
// ========================================

export const touchTarget = {
  ios: {
    minSize: '44px',
    recommendation: '48px',
  },
  android: {
    minSize: '48px',
    recommendation: '56px',
  },
  web: {
    minSize: '44px',
    recommendation: '48px',
  },
};

// ========================================
// アクセシビリティ（WCAG 2.1）
// ========================================

export const accessibility = {
  // コントラスト比（WCAG AA準拠）
  contrastRatio: {
    normalText: 4.5,    // 通常テキスト
    largeText: 3.0,     // 大きなテキスト（18pt以上 or 14pt太字以上）
    uiComponents: 3.0,  // UIコンポーネント
  },

  // フォーカスインジケーター
  focusRing: {
    width: '2px',
    offset: '2px',
    color: '#3B82F6',
  },
};

// ========================================
// ユーティリティ関数
// ========================================

/**
 * カラーを取得
 */
export const getColor = (mode: 'light' | 'dark', category: keyof typeof colors.light, shade: number | string = 500) => {
  return colors[mode][category][shade as keyof typeof colors.light.primary];
};

/**
 * レスポンシブ判定
 */
export const isBreakpoint = (breakpoint: keyof typeof breakpoints): boolean => {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  return width >= parseInt(breakpoints[breakpoint]);
};

/**
 * ダークモード判定
 */
export const isDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
};

/**
 * CSS変数として出力（オプション）
 */
export const getCSSVariables = (mode: 'light' | 'dark') => {
  const vars: Record<string, string> = {};

  // カラー
  Object.entries(colors[mode]).forEach(([category, shades]) => {
    Object.entries(shades).forEach(([shade, value]) => {
      vars[`--color-${category}-${shade}`] = value;
    });
  });

  // タイポグラフィ
  Object.entries(typography.fontSize).forEach(([name, value]) => {
    vars[`--font-size-${name}`] = value;
  });

  // スペーシング
  Object.entries(spacing).forEach(([name, value]) => {
    vars[`--spacing-${name}`] = value;
  });

  return vars;
};

export default {
  colors,
  typography,
  spacing,
  breakpoints,
  borderRadius,
  boxShadow,
  animation,
  zIndex,
  effects,
  touchTarget,
  accessibility,
  getColor,
  isBreakpoint,
  isDarkMode,
  getCSSVariables,
};
