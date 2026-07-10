/**
 * useResponsive Hook
 * レスポンシブデザイン用のカスタムフック
 *
 * Phase 6: UI/UX総仕上げで使用
 * デバイスタイプとビューポートサイズを検知
 */

import { useState, useEffect } from 'react';
import { breakpoints } from '../styles/designTokens';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  isTouch: boolean;
}

/**
 * レスポンシブ状態を管理するカスタムフック
 *
 * @returns ResponsiveState - 現在のデバイス/ビューポート状態
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useResponsive();
 *
 * return (
 *   <div>
 *     {isMobile && <MobileView />}
 *     {isTablet && <TabletView />}
 *     {isDesktop && <DesktopView />}
 *   </div>
 * );
 * ```
 */
export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      // SSR環境ではデフォルト値を返す
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
        width: 1024,
        height: 768,
        orientation: 'landscape',
        isTouch: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
      isMobile: width < breakpoints.values.md,
      isTablet: width >= breakpoints.values.md && width < breakpoints.values.lg,
      isDesktop: width >= breakpoints.values.lg,
      isLargeDesktop: width >= breakpoints.values.xl,
      width,
      height,
      orientation: width > height ? 'landscape' : 'portrait',
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setState({
        isMobile: width < breakpoints.values.md,
        isTablet: width >= breakpoints.values.md && width < breakpoints.values.lg,
        isDesktop: width >= breakpoints.values.lg,
        isLargeDesktop: width >= breakpoints.values.xl,
        width,
        height,
        orientation: width > height ? 'landscape' : 'portrait',
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      });
    };

    // デバウンス処理（リサイズイベントの頻度を制限）
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize);

    // クリーンアップ
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
};

/**
 * ブレークポイントマッチャーフック
 * 特定のブレークポイントに一致するかを返す
 *
 * @param breakpoint - 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 * @returns boolean - ブレークポイントに一致するか
 *
 * @example
 * ```tsx
 * const isLargeScreen = useBreakpoint('lg');
 *
 * return (
 *   <div className={isLargeScreen ? 'grid-cols-3' : 'grid-cols-1'}>
 *     {/* content *\/}
 *   </div>
 * );
 * ```
 */
export const useBreakpoint = (breakpoint: keyof typeof breakpoints.values): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = `(min-width: ${breakpoints[breakpoint]})`;
    const mediaQueryList = window.matchMedia(query);

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setMatches(e.matches);
    };

    // 初期値設定
    handleChange(mediaQueryList);

    // リスナー登録
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else {
      // 古いブラウザ対応
      mediaQueryList.addListener(handleChange);
    }

    // クリーンアップ
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [breakpoint]);

  return matches;
};

/**
 * メディアクエリマッチャーフック
 * カスタムメディアクエリに一致するかを返す
 *
 * @param query - メディアクエリ文字列
 * @returns boolean - メディアクエリに一致するか
 *
 * @example
 * ```tsx
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 * const isPortrait = useMediaQuery('(orientation: portrait)');
 *
 * return (
 *   <div className={prefersDark ? 'dark-theme' : 'light-theme'}>
 *     {isPortrait ? <PortraitLayout /> : <LandscapeLayout />}
 *   </div>
 * );
 * ```
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setMatches(e.matches);
    };

    // 初期値設定
    handleChange(mediaQueryList);

    // リスナー登録
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else {
      // 古いブラウザ対応
      mediaQueryList.addListener(handleChange);
    }

    // クリーンアップ
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
};

/**
 * ビューポートサイズフック
 * 現在のビューポートサイズを返す
 *
 * @returns { width: number; height: number }
 *
 * @example
 * ```tsx
 * const { width, height } = useViewportSize();
 *
 * return (
 *   <div>
 *     Viewport: {width} × {height}
 *   </div>
 * );
 * ```
 */
export const useViewportSize = (): { width: number; height: number } => {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // デバウンス処理
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
    };
  }, []);

  return size;
};
