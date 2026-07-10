// src/components/FavoriteButton.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';

export interface FavoriteButtonProps {
  problemId: number;
  isFavorite: boolean;
  onToggle: (problemId: number, newStatus: boolean) => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * お気に入りトグルボタン
 * ⭐ アイコンでお気に入り状態を表示・トグル
 */
export function FavoriteButton({
  problemId,
  isFavorite,
  onToggle,
  size = 'md',
  className = ''
}: FavoriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click events

    if (isLoading) return;

    try {
      setIsLoading(true);
      const newStatus = !isFavorite;
      await onToggle(problemId, newStatus);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl'
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        inline-flex items-center justify-center
        rounded-full
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:bg-gray-100 dark:hover:bg-gray-800
        active:scale-95
        ${className}
      `}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
    >
      <motion.span
        initial={false}
        animate={{
          scale: isFavorite ? 1 : 0.9,
          rotate: isFavorite ? 0 : -10
        }}
        transition={{ duration: 0.2 }}
      >
        {isFavorite ? (
          // Filled star
          <span className="text-yellow-500 dark:text-yellow-400">⭐</span>
        ) : (
          // Outline star
          <span className="text-gray-400 dark:text-gray-500">☆</span>
        )}
      </motion.span>
    </motion.button>
  );
}
