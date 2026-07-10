// src/components/TagManager.tsx
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { tagsService } from '../services/tagsService';
import { useTags } from '../hooks/useTags';

export interface TagManagerProps {
  problemId: number;
  currentTags: string[];
  onTagsChange?: (tags: string[]) => void;
  className?: string;
}

/**
 * タグ管理コンポーネント
 * 問題にタグを追加・削除するインラインUI
 */
export function TagManager({
  problemId,
  currentTags,
  onTagsChange,
  className = ''
}: TagManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { allTags } = useTags();

  const handleAddTag = async () => {
    const tag = newTagInput.trim();
    if (!tag) return;

    try {
      await tagsService.addTag(problemId, tag);
      setNewTagInput('');
      setIsAdding(false);
      setShowSuggestions(false);
      onTagsChange?.([...currentTags, tag]);
      toast.success(`タグ「${tag}」を追加しました`, {
        position: 'top-center',
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to add tag:', error);
      toast.error('タグの追加に失敗しました', {
        position: 'top-center',
        duration: 2000
      });
    }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      await tagsService.removeTag(problemId, tag);
      onTagsChange?.(currentTags.filter(t => t !== tag));
      toast.success(`タグ「${tag}」を削除しました`, {
        position: 'top-center',
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to remove tag:', error);
      toast.error('タグの削除に失敗しました', {
        position: 'top-center',
        duration: 2000
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTagInput('');
      setShowSuggestions(false);
    }
  };

  // サジェスト用の既存タグ（現在のタグを除外）
  const suggestedTags = allTags
    .filter(t => !currentTags.includes(t.tag))
    .filter(t => t.tag.toLowerCase().includes(newTagInput.toLowerCase()))
    .slice(0, 5);

  const handleSelectSuggestion = async (tag: string) => {
    try {
      await tagsService.addTag(problemId, tag);
      setNewTagInput('');
      setIsAdding(false);
      setShowSuggestions(false);
      onTagsChange?.([...currentTags, tag]);
      toast.success(`タグ「${tag}」を追加しました`, {
        position: 'top-center',
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to add tag:', error);
      toast.error('タグの追加に失敗しました', {
        position: 'top-center',
        duration: 2000
      });
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <AnimatePresence>
        {currentTags.map((tag, index) => (
          <motion.div
            key={tag}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="
              inline-flex items-center gap-1.5
              px-3 py-1.5
              bg-gradient-to-r from-blue-500 to-purple-500
              dark:from-blue-600 dark:to-purple-600
              text-white
              rounded-full
              text-sm font-medium
              shadow-md
              hover:shadow-lg
              transition-shadow
            "
          >
            <span>{tag}</span>
            <button
              onClick={() => handleRemoveTag(tag)}
              className="
                p-0.5 rounded-full
                hover:bg-white/20
                active:bg-white/30
                transition-colors
              "
              aria-label={`タグ「${tag}」を削除`}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {!isAdding && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAdding(true)}
          className="
            inline-flex items-center gap-1.5
            px-3 py-1.5
            bg-gray-200 dark:bg-gray-700
            text-gray-700 dark:text-gray-300
            rounded-full
            text-sm font-medium
            hover:bg-gray-300 dark:hover:bg-gray-600
            transition-colors
          "
        >
          <Plus size={14} />
          <span>タグ追加</span>
        </motion.button>
      )}

      {isAdding && (
        <div className="relative">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => {
              setNewTagInput(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(newTagInput.length > 0)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder="タグを入力..."
            autoFocus
            className="
              px-3 py-1.5
              bg-white dark:bg-gray-800
              border-2 border-blue-500 dark:border-blue-400
              text-gray-900 dark:text-white
              rounded-full
              text-sm
              focus:outline-none
              focus:ring-2 focus:ring-blue-500
              w-40
            "
          />

          {/* タグサジェスト */}
          {showSuggestions && suggestedTags.length > 0 && (
            <div className="
              absolute top-full left-0 mt-2
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-lg
              shadow-lg
              z-10
              overflow-hidden
              min-w-[200px]
            ">
              {suggestedTags.map((tagData) => (
                <button
                  key={tagData.tag}
                  onClick={() => handleSelectSuggestion(tagData.tag)}
                  className="
                    w-full px-4 py-2
                    text-left text-sm
                    text-gray-700 dark:text-gray-300
                    hover:bg-blue-50 dark:hover:bg-gray-700
                    transition-colors
                    flex items-center justify-between
                  "
                >
                  <span>{tagData.tag}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {tagData.count}問
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
