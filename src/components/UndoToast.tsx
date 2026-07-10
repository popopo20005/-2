import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number; // ミリ秒
}

/**
 * Undo Toast Component
 *
 * 削除操作後に表示されるカスタムトースト
 * - 「元に戻す」ボタン付き
 * - カウントダウンタイマー表示
 * - フレーマーモーションアニメーション
 */
export function UndoToast({
  message,
  onUndo,
  onDismiss,
  duration = 5000
}: UndoToastProps) {
  const [timeLeft, setTimeLeft] = useState(Math.floor(duration / 1000));
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // カウントダウンタイマー
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    // プログレスバーアニメーション
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.max(0, prev - (100 / (duration / 100))));
    }, 100);

    // 自動消去
    const timeout = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
      clearTimeout(timeout);
    };
  }, [duration, onDismiss]);

  const handleUndo = () => {
    onUndo();
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="relative flex items-center gap-4 p-4 bg-surfaceHighlight backdrop-blur-xl border border-white/10 rounded-xl shadow-glass min-w-[320px] max-w-md"
    >
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-xl overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>

      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
        <RotateCcw size={20} className="text-primary" />
      </div>

      {/* Message */}
      <div className="flex-1">
        <p className="text-white font-medium">{message}</p>
        <p className="text-text-secondary text-sm mt-1">
          {timeLeft}秒後に完全削除されます
        </p>
      </div>

      {/* Undo Button */}
      <button
        onClick={handleUndo}
        className="flex-shrink-0 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
      >
        元に戻す
      </button>

      {/* Dismiss Button */}
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
        title="閉じる"
      >
        <X size={18} />
      </button>
    </motion.div>
  );
}
