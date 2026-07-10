// src/components/FavoritesList.tsx
import { useState, useEffect } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { FavoriteButton } from './FavoriteButton';
import { SkeletonList } from './ui/Skeleton';
import { categoryService } from '../lib/database';

interface FavoritesListProps {
  onBack: () => void;
  onStartQuiz?: (problemIds: number[]) => void;
}

export function FavoritesList({ onBack, onStartQuiz }: FavoritesListProps) {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [expandedProblemId, setExpandedProblemId] = useState<number | null>(null);

  const { favorites, loading, error, toggleFavorite } = useFavorites(selectedCategory);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(localStorage.getItem('language') || 'ja');
    };

    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(() => {
      const currentLang = localStorage.getItem('language') || 'ja';
      if (currentLang !== language) {
        setLanguage(currentLang);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [language]);

  const loadCategories = async () => {
    try {
      const cats = await categoryService.getAll();
      setAllCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleToggleFavorite = async (problemId: number) => {
    await toggleFavorite(problemId);
  };

  const handleStartQuiz = () => {
    if (favorites.length === 0) {
      console.log('❌ No favorites to start quiz');
      return;
    }
    const problemIds = favorites.map(p => p.id!).filter(id => id !== undefined);
    console.log('🎯 Starting quiz with favorites:', {
      favoritesCount: favorites.length,
      problemIdsCount: problemIds.length,
      problemIds: problemIds,
      favorites: favorites.map(f => ({ id: f.id, question: f.question }))
    });

    if (problemIds.length === 0) {
      console.error('❌ No valid problem IDs found in favorites');
      alert('お気に入り問題にIDが設定されていません。問題を再度お気に入りに追加してください。');
      return;
    }

    onStartQuiz?.(problemIds);
  };

  const toggleExpand = (problemId: number) => {
    setExpandedProblemId(expandedProblemId === problemId ? null : problemId);
  };

  const t = {
    ja: {
      title: 'お気に入り問題',
      backToMenu: 'メインメニューに戻る',
      loading: 'お気に入りを読み込み中...',
      categoryFilter: 'カテゴリーフィルタ',
      allCategories: '全カテゴリー',
      startQuiz: '学習開始',
      count: '件',
      noFavorites: 'お気に入り問題がありません',
      noFavoritesHint: '問題のボタンをクリックしてお気に入りに追加してください',
      explanation: '解説',
      addedAt: '追加日時',
      error: 'エラーが発生しました',
    },
    en: {
      title: 'Favorite Problems',
      backToMenu: 'Back to Menu',
      loading: 'Loading favorites...',
      categoryFilter: 'Category Filter',
      allCategories: 'All Categories',
      startQuiz: 'Start Quiz',
      count: ' items',
      noFavorites: 'No favorite problems',
      noFavoritesHint: 'Click the star button on problems to add them to favorites',
      explanation: 'Explanation',
      addedAt: 'Added at',
      error: 'An error occurred',
    }
  };

  const currentLang = language as 'ja' | 'en';

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: '#0F172A' }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-10 w-64 rounded mb-4 animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
            <div className="h-6 w-48 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
          </div>
          <SkeletonList count={5} showAvatar={false} asCard={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: '#0F172A' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 text-[#CBD5E1] rounded-xl transition-all hover:scale-105"
            style={{
              background: 'rgba(30,41,59,0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {t[currentLang].backToMenu}
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[#F59E0B] text-3xl">★</span>
            <h1 className="text-4xl font-bold text-[#F8FAFC]">
              {t[currentLang].title}
            </h1>
          </div>
          <p className="text-lg text-[#94A3B8]">
            {favorites.length}{t[currentLang].count}
          </p>
        </header>

        {error && (
          <div
            className="mb-6 p-4 rounded-2xl text-[#EF4444]"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            {t[currentLang].error}: {error}
          </div>
        )}

        {/* Filter Bar */}
        <div
          className="mb-8 rounded-2xl p-6"
          style={{
            background: 'rgba(30,41,59,0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                {t[currentLang].categoryFilter}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 rounded-xl text-[#F8FAFC] focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                style={{
                  background: 'rgba(15,23,42,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <option value="">{t[currentLang].allCategories}</option>
                {allCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {favorites.length > 0 && (
              <button
                onClick={handleStartQuiz}
                className="px-6 py-2 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-xl transition-all font-medium hover:scale-105"
              >
                {t[currentLang].startQuiz}
              </button>
            )}
          </div>
        </div>

        {/* Favorites List */}
        {favorites.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: 'rgba(30,41,59,0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="text-6xl mb-4" style={{ color: '#475569' }}>★</div>
            <h2 className="text-2xl font-semibold text-[#94A3B8] mb-2">
              {t[currentLang].noFavorites}
            </h2>
            <p className="text-[#64748B]">
              {t[currentLang].noFavoritesHint}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((problem) => (
              <div
                key={problem.id}
                className="rounded-2xl p-6 hover:scale-[1.02] transition-all"
                style={{
                  background: 'rgba(30,41,59,0.7)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {/* Header with favorite button */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#94A3B8] mb-1">
                      {problem.category}
                    </div>
                    <h3 className="text-lg font-semibold text-[#F8FAFC]">
                      {problem.question}
                    </h3>
                  </div>
                  <FavoriteButton
                    problemId={problem.id!}
                    isFavorite={true}
                    onToggle={handleToggleFavorite}
                    size="sm"
                  />
                </div>

                {/* Added date */}
                {problem.favoritedAt && (
                  <div className="text-xs text-[#64748B] mb-3">
                    {t[currentLang].addedAt}: {new Date(problem.favoritedAt).toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US')}
                  </div>
                )}

                {/* Expand button */}
                <button
                  onClick={() => toggleExpand(problem.id!)}
                  className="text-sm text-[#818CF8] hover:text-[#A5B4FC] hover:underline mb-2"
                >
                  {expandedProblemId === problem.id ? '▼' : '▶'} {t[currentLang].explanation}
                </button>

                {/* Explanation (collapsible) */}
                {expandedProblemId === problem.id && (
                  <div
                    className="mt-3 p-3 rounded-xl text-sm text-[#CBD5E1]"
                    style={{
                      background: 'rgba(15,23,42,0.5)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {problem.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
