import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Quick action definition
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  color?: 'default' | 'danger' | 'success' | 'warning';
  action: () => void | Promise<void>;
  divider?: boolean; // Show divider after this action
}

/**
 * Quick Action Menu Props
 */
export interface QuickActionMenuProps {
  position: { x: number; y: number };
  actions: QuickAction[];
  onClose: () => void;
  language?: 'ja' | 'en';
}

/**
 * Quick Action Menu Component
 *
 * コンテキストメニュー（右クリックメニュー）
 * - 問題行を右クリックで表示
 * - クイックアクション一覧
 * - キーボードショートカット表示
 * - アニメーション対応
 */
export function QuickActionMenu({
  position,
  actions,
  onClose,
  language: _language = 'ja'
}: QuickActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust menu position to keep it within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = position.x;
      let adjustedY = position.y;

      // Adjust horizontal position
      if (position.x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      // Adjust vertical position
      if (position.y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      if (adjustedX !== position.x || adjustedY !== position.y) {
        menuRef.current.style.left = `${adjustedX}px`;
        menuRef.current.style.top = `${adjustedY}px`;
      }
    }
  }, [position]);

  // Color classes for different action types
  const getColorClasses = (color: QuickAction['color'] = 'default') => {
    switch (color) {
      case 'danger':
        return 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20';
      case 'success':
        return 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20';
      case 'warning':
        return 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20';
      default:
        return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
    }
  };

  const handleActionClick = async (action: QuickAction) => {
    try {
      await action.action();
      onClose();
    } catch (error) {
      console.error(`Error executing action "${action.id}":`, error);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 9999
        }}
        className="bg-white dark:bg-gray-800 shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[220px]"
      >
        <div className="py-1">
          {actions.map((action, index) => (
            <div key={action.id}>
              <button
                onClick={() => handleActionClick(action)}
                className={`
                  w-full flex items-center justify-between px-4 py-2.5
                  transition-colors duration-150
                  ${getColorClasses(action.color)}
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset
                `}
              >
                <div className="flex items-center gap-3">
                  <action.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{action.label}</span>
                </div>

                {action.shortcut && (
                  <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs font-mono">
                    {action.shortcut}
                  </kbd>
                )}
              </button>

              {action.divider && index < actions.length - 1 && (
                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to manage context menu state
 */
export function useQuickActionMenu() {
  const [menuState, setMenuState] = useState<{
    position: { x: number; y: number };
    problemId: number;
  } | null>(null);

  const openMenu = (event: React.MouseEvent, problemId: number) => {
    event.preventDefault();
    setMenuState({
      position: { x: event.clientX, y: event.clientY },
      problemId
    });
  };

  const closeMenu = () => {
    setMenuState(null);
  };

  return {
    menuState,
    openMenu,
    closeMenu,
    isOpen: menuState !== null
  };
}
