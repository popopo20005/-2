import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { zIndex, transitions } from '../../styles/designTokens';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  'aria-describedby'?: string;
}

/**
 * アクセシブルなモーダルダイアログコンポーネント（WCAG AA準拠）
 *
 * アクセシビリティ機能:
 * - role="dialog" と aria-modal="true"
 * - フォーカストラップ（モーダル内でのTab移動制御）
 * - Escapeキーで閉じる
 * - スクロールロック
 * - prefers-reduced-motion対応
 * - aria-labelledby でタイトルを関連付け
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  'aria-describedby': ariaDescribedBy,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // prefers-reduced-motion判定
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(e.matches);
    };

    handleChange(mediaQuery);

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

  // フォーカス管理
  useEffect(() => {
    if (!isOpen) return;

    // モーダルが開いた時、前のフォーカス要素を記憶
    previousActiveElement.current = document.activeElement as HTMLElement;

    // 閉じるボタンにフォーカスを移動
    const focusCloseButton = () => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      }
    };

    // 少し遅延させてフォーカスを移動（アニメーション完了後）
    const timeoutId = setTimeout(focusCloseButton, prefersReducedMotion ? 0 : 200);

    return () => {
      clearTimeout(timeoutId);
      // モーダルが閉じた時、元のフォーカスに戻す
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, prefersReducedMotion]);

  // フォーカストラップ（Tab移動制御）
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      // フォーカス可能な要素を取得
      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shiftキーなし: 最後の要素から最初の要素へ
      if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }

      // Shiftキーあり: 最初の要素から最後の要素へ
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // スクロールを防ぐ
  useEffect(() => {
    if (isOpen) {
      // 現在のスクロール位置を記憶
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // スクロール位置を復元
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };

  // ユニークなIDを生成（aria-labelledby用）
  const titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8"
      style={{ zIndex: zIndex.modal }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={ariaDescribedBy}
    >
      {/* オーバーレイ（バックドロップ） */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
          prefersReducedMotion ? '' : 'animate-in fade-in duration-200'
        }`}
        style={{ zIndex: zIndex.modalBackdrop }}
        aria-hidden="true"
      />

      {/* モーダルコンテンツ */}
      <div
        ref={modalRef}
        className={`
          relative w-full ${maxWidthClasses[maxWidth]}
          bg-white dark:bg-gray-800
          rounded-2xl shadow-2xl
          ${prefersReducedMotion ? '' : 'animate-in zoom-in-95 duration-200'}
          overflow-hidden
          max-h-[90vh] flex flex-col
        `}
        style={{ zIndex: zIndex.modal }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2
            id={titleId}
            className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 pr-4"
          >
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className={`
              p-2 rounded-lg
              text-gray-500 hover:text-gray-700
              dark:text-gray-400 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-700
              ${prefersReducedMotion ? '' : transitions.fast.className}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
              min-w-[44px] min-h-[44px] flex items-center justify-center
            `}
            aria-label="モーダルを閉じる"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
