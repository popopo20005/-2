import { useState, useEffect } from 'react';
import { darkModeTransition } from '../styles/designTokens';

type DarkModePreference = 'light' | 'dark' | 'system';

interface UseDarkModeReturn {
  isDark: boolean;
  preference: DarkModePreference;
  setPreference: (pref: DarkModePreference) => void;
  toggle: () => void;
}

/**
 * ダークモード管理フック
 *
 * - システム設定の自動検出
 * - LocalStorageへの永続化
 * - スムーズな切り替えアニメーション
 * - WCAG 2.1 AA準拠
 */
export function useDarkMode(): UseDarkModeReturn {
  // LocalStorageから優先設定を読み込み (デフォルト: system)
  const getInitialPreference = (): DarkModePreference => {
    const stored = localStorage.getItem('darkModePreference');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  };

  // システムのダークモード設定を取得
  const getSystemPreference = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  // 現在のダークモード状態を計算
  const calculateIsDark = (pref: DarkModePreference): boolean => {
    if (pref === 'system') {
      return getSystemPreference();
    }
    return pref === 'dark';
  };

  const [preference, setPreferenceState] = useState<DarkModePreference>(getInitialPreference);
  const [isDark, setIsDark] = useState(() => calculateIsDark(getInitialPreference()));

  // 優先設定を変更
  const setPreference = (pref: DarkModePreference) => {
    setPreferenceState(pref);
    localStorage.setItem('darkModePreference', pref);

    const newIsDark = calculateIsDark(pref);
    applyDarkMode(newIsDark);
  };

  // トグル（light <-> dark、systemの場合は現在の状態の逆）
  const toggle = () => {
    if (preference === 'system') {
      // systemモードの場合、現在の状態の逆に固定
      setPreference(isDark ? 'light' : 'dark');
    } else {
      // light/darkモードの場合、逆に切り替え
      setPreference(preference === 'light' ? 'dark' : 'light');
    }
  };

  // ダークモードを適用（スムーズなトランジション付き）
  const applyDarkMode = (dark: boolean) => {
    const root = document.documentElement;

    // トランジションを有効化
    root.style.transition = darkModeTransition.properties
      .map(prop => `${prop} ${darkModeTransition.duration}ms ${darkModeTransition.easing}`)
      .join(', ');

    // ダークモードクラスを切り替え
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 状態を更新
    setIsDark(dark);

    // LocalStorageも更新（後方互換性のため）
    localStorage.setItem('darkMode', dark.toString());

    // トランジション完了後にスタイルをクリア
    setTimeout(() => {
      root.style.transition = '';
    }, darkModeTransition.duration);
  };

  // システム設定の変更を監視
  useEffect(() => {
    if (preference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      applyDarkMode(e.matches);
    };

    // モダンブラウザ
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // 古いブラウザ（Safari 13以前など）
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [preference]);

  // 初回マウント時にダークモードを適用
  useEffect(() => {
    const currentIsDark = calculateIsDark(preference);
    applyDarkMode(currentIsDark);
  }, []);

  return {
    isDark,
    preference,
    setPreference,
    toggle,
  };
}
