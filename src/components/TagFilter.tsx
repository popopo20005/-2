// src/components/TagFilter.tsx
import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTags } from '../hooks/useTags';

export interface TagFilterProps {
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  filterMode: 'AND' | 'OR';
  onFilterModeChange: (mode: 'AND' | 'OR') => void;
  className?: string;
}

/**
 * タグフィルターコンポーネント
 * マルチセレクト対応のタグフィルタリングUI
 */
export function TagFilter({
  selectedTags,
  onSelectedTagsChange,
  filterMode,
  onFilterModeChange,
  className = ''
}: TagFilterProps) {
  const { allTags, loading } = useTags();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onSelectedTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onSelectedTagsChange([...selectedTags, tag]);
    }
  };

  const handleClearAll = () => {
    onSelectedTagsChange([]);
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  if (allTags.length === 0) {
    return (
      <div className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Filter size={18} />
          <div>
            <p className="text-sm font-medium">タグでフィルタ</p>
            <p className="text-xs mt-1">タグが登録されていません。問題編集画面でタグを追加してください。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="
            flex items-center gap-2
            px-4 py-2
            bg-gray-100 dark:bg-gray-800
            text-gray-700 dark:text-gray-300
            rounded-lg
            hover:bg-gray-200 dark:hover:bg-gray-700
            transition-colors
            font-medium
          "
        >
          <Filter size={18} />
          <span>タグでフィルタ</span>
          {selectedTags.length > 0 && (
            <span className="
              px-2 py-0.5
              bg-blue-500 text-white
              rounded-full
              text-xs font-bold
            ">
              {selectedTags.length}
            </span>
          )}
        </button>

        {selectedTags.length > 0 && (
          <button
            onClick={handleClearAll}
            className="
              text-sm text-gray-600 dark:text-gray-400
              hover:text-gray-900 dark:hover:text-gray-200
              transition-colors
            "
          >
            クリア
          </button>
        )}
      </div>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <AnimatePresence>
            {selectedTags.map((tag) => (
              <motion.div
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="
                  inline-flex items-center gap-1.5
                  px-3 py-1.5
                  bg-blue-500 dark:bg-blue-600
                  text-white
                  rounded-full
                  text-sm font-medium
                  shadow-md
                "
              >
                <span>{tag}</span>
                <button
                  onClick={() => handleToggleTag(tag)}
                  className="
                    p-0.5 rounded-full
                    hover:bg-white/20
                    active:bg-white/30
                    transition-colors
                  "
                  aria-label={`タグ「${tag}」を解除`}
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Filter Mode Toggle */}
      {selectedTags.length > 1 && (
        <div className="flex items-center gap-3 mb-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">フィルタモード:</span>
          <div className="flex gap-2">
            <button
              onClick={() => onFilterModeChange('AND')}
              className={`
                px-3 py-1.5 rounded-lg font-medium transition-colors
                ${filterMode === 'AND'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }
              `}
            >
              AND (すべて)
            </button>
            <button
              onClick={() => onFilterModeChange('OR')}
              className={`
                px-3 py-1.5 rounded-lg font-medium transition-colors
                ${filterMode === 'OR'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }
              `}
            >
              OR (いずれか)
            </button>
          </div>
        </div>
      )}

      {/* Available Tags (Expandable) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="
              p-4
              bg-gray-50 dark:bg-gray-800
              rounded-lg
              border border-gray-200 dark:border-gray-700
            ">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                利用可能なタグ
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {allTags.map((tagData) => {
                  const isSelected = selectedTags.includes(tagData.tag);
                  return (
                    <button
                      key={tagData.tag}
                      onClick={() => handleToggleTag(tagData.tag)}
                      className={`
                        px-3 py-2 rounded-lg
                        text-sm font-medium
                        transition-all
                        flex items-center justify-between
                        ${isSelected
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }
                      `}
                    >
                      <span className="truncate">{tagData.tag}</span>
                      <span className={`
                        ml-2 px-1.5 py-0.5 rounded-full text-xs
                        ${isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                        }
                      `}>
                        {tagData.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
