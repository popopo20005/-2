/**
 * Framer Motion共通アニメーション設定
 *
 * アプリ全体で使用する一貫したアニメーションを定義
 */

// 型定義
type Variants = {
  [key: string]: {
    opacity?: number;
    x?: number;
    y?: number;
    scale?: number;
    rotate?: number;
    rotateY?: number;
    transition?: Transition;
  };
};

type Transition = {
  duration?: number;
  ease?: string | number[];
  type?: 'spring' | 'tween' | 'inertia';
  stiffness?: number;
  damping?: number;
  repeat?: number;
  delay?: number;
  staggerChildren?: number;
};

// ==================== ページ遷移アニメーション ====================

/**
 * フェードイン/アウト遷移
 */
export const fadeTransition: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * 上からスライドイン遷移
 */
export const slideDownTransition: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/**
 * 下からスライドイン遷移
 */
export const slideUpTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

/**
 * 左からスライドイン遷移
 */
export const slideLeftTransition: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/**
 * 右からスライドイン遷移
 */
export const slideRightTransition: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

/**
 * スケール遷移（ズームイン/アウト）
 */
export const scaleTransition: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

/**
 * デフォルトページ遷移（フェード + 下からスライド）
 */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' }
  },
  exit: { opacity: 0, y: -30 },
};

// ==================== カードアニメーション ====================

/**
 * カードホバーエフェクト
 */
export const cardHover: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },
};

/**
 * カードタップエフェクト
 */
export const cardTap: Variants = {
  tap: { scale: 0.98 },
};

/**
 * カードフリップアニメーション
 */
export const cardFlip: Variants = {
  front: {
    rotateY: 0,
    transition: { duration: 0.6 }
  },
  back: {
    rotateY: 180,
    transition: { duration: 0.6 }
  },
};

/**
 * カード出現アニメーション（スタッガー用）
 */
export const cardAppear: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  },
};

// ==================== リストアニメーション ====================

/**
 * リストコンテナ（スタッガー親要素）
 */
export const listContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // 子要素を0.1秒ずつずらす
    }
  },
};

/**
 * リストアイテム（スタッガー子要素）
 */
export const listItem: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 }
  },
};

/**
 * グリッドコンテナ（スタッガー親要素）
 */
export const gridContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08, // スタッガー間隔を少し長く
      delayChildren: 0.1, // 最初のアイテムの遅延
    } as any
  },
};

/**
 * グリッドアイテム（スタッガー子要素）
 */
export const gridItem: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut'
    }
  },
};

// ==================== ボタンアニメーション ====================

/**
 * ボタンホバーエフェクト（スケール）
 */
export const buttonHover: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 }
  },
};

/**
 * ボタンタップエフェクト
 */
export const buttonTap: Variants = {
  tap: { scale: 0.95 },
};

/**
 * 浮遊ボタン（Floating Action Button）
 */
export const floatingButton: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20
    }
  },
  exit: { scale: 0, opacity: 0 },
};

// ==================== モーダル/ダイアログアニメーション ====================

/**
 * モーダルオーバーレイ
 */
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * モーダルコンテンツ（中央からスケール）
 */
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25
    }
  },
  exit: { opacity: 0, scale: 0.8, y: 50 },
};

/**
 * ドロップダウンメニュー
 */
export const dropdown: Variants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.15 }
  },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

// ==================== 通知/トーストアニメーション ====================

/**
 * トースト通知（右からスライドイン）
 */
export const toastSlide: Variants = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 },
};

/**
 * バナー通知（上からスライドイン）
 */
export const bannerSlide: Variants = {
  initial: { opacity: 0, y: -100 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -100 },
};

// ==================== 特殊エフェクト ====================

/**
 * シェイクアニメーション（エラー時など）
 */
export const shake: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0] as any,
    transition: { duration: 0.4 }
  }
};

/**
 * パルスアニメーション（通知バッジなど）
 */
export const pulse: Variants = {
  pulse: {
    scale: [1, 1.1, 1] as any,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

/**
 * バウンスアニメーション
 */
export const bounce: Variants = {
  bounce: {
    y: [0, -20, 0] as any,
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

/**
 * 回転アニメーション（ローディングなど）
 */
export const spin: Variants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

// ==================== トランジション設定 ====================

/**
 * デフォルトトランジション
 */
export const defaultTransition: Transition = {
  duration: 0.3,
  ease: 'easeInOut',
};

/**
 * 高速トランジション
 */
export const fastTransition: Transition = {
  duration: 0.15,
  ease: 'easeInOut',
};

/**
 * 低速トランジション
 */
export const slowTransition: Transition = {
  duration: 0.5,
  ease: 'easeInOut',
};

/**
 * スプリングトランジション
 */
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

/**
 * ソフトスプリングトランジション
 */
export const softSpringTransition: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 20,
};

// ==================== ヘルパー関数 ====================

/**
 * スタッガーディレイを計算
 * @param index アイテムのインデックス
 * @param delay 各アイテム間の遅延（秒）
 */
export const staggerDelay = (index: number, delay = 0.1): number => {
  return index * delay;
};

/**
 * ランダムなスタッガーディレイを生成
 * @param maxDelay 最大遅延（秒）
 */
export const randomStaggerDelay = (maxDelay = 0.3): number => {
  return Math.random() * maxDelay;
};
