import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { KeyboardShortcutManager, type ShortcutConfig } from '../lib/keyboardShortcuts';

/**
 * Shortcut Help Modal Props
 */
export interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcutManager: KeyboardShortcutManager;
  language?: 'ja' | 'en';
}

/**
 * Shortcut Help Modal Component
 *
 * キーボードショートカット一覧表示モーダル
 * - カテゴリ別グループ化
 * - ショートカットキー表示
 * - 説明文表示
 */
export function ShortcutHelpModal({
  isOpen,
  onClose,
  shortcutManager,
  language = 'ja'
}: ShortcutHelpModalProps) {
  if (!isOpen) return null;

  const shortcutsByCategory = shortcutManager.getShortcutsByCategory();

  const t = {
    ja: {
      title: 'キーボードショートカット',
      close: '閉じる',
      noShortcuts: 'ショートカットが登録されていません',
      defaultCategory: 'その他'
    },
    en: {
      title: 'Keyboard Shortcuts',
      close: 'Close',
      noShortcuts: 'No shortcuts registered',
      defaultCategory: 'Other'
    }
  }[language];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Keyboard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-80px)]">
            {shortcutsByCategory.size === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t.noShortcuts}
              </p>
            ) : (
              <div className="space-y-6">
                {Array.from(shortcutsByCategory.entries()).map(([category, shortcuts]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {shortcuts.map(({ id, config }) => (
                        <ShortcutRow key={id} config={config} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {language === 'ja'
                ? 'ショートカットは問題編集画面でのみ有効です'
                : 'Shortcuts are only active in the problem editor'}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Shortcut Row Component
 */
function ShortcutRow({ config }: { config: ShortcutConfig }) {
  const formattedShortcut = KeyboardShortcutManager.formatShortcut(config);

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {config.description}
      </span>
      <kbd className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono text-gray-700 dark:text-gray-300 shadow-sm">
        {formattedShortcut}
      </kbd>
    </div>
  );
}
