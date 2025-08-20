import { useState, useEffect } from 'react';
import { categoryService, problemService } from '../lib/database';

interface CategoryQuizSelectorProps {
  onBack: () => void;
  onStartQuiz: (category: string) => void;
}

interface CategoryInfo {
  name: string;
  problemCount: number;
}

export function CategoryQuizSelector({ onBack, onStartQuiz }: CategoryQuizSelectorProps) {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const [categoryNames, allProblems] = await Promise.all([
        categoryService.getAll(),
        problemService.getAll()
      ]);

      const categoryInfos: CategoryInfo[] = categoryNames.map(name => ({
        name,
        problemCount: allProblems.filter(p => p.category === name).length
      }));

      setCategories(categoryInfos);
    } catch (error) {
      console.error('カテゴリー読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">カテゴリーを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="quiz-action-button mb-4 px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
          >
            ← メインメニューに戻る
          </button>
          <h1 className="text-3xl font-bold text-amber-900 dark:text-amber-100">🎲 カテゴリー別クイズ</h1>
          <p className="text-amber-700 dark:text-amber-300 mt-2">
            挑戦したいカテゴリーを選択してください
          </p>
        </header>

        {categories.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              問題がありません
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              まずは問題を作成してからカテゴリー別クイズをお楽しみください。
            </p>
            <button
              onClick={onBack}
              className="quiz-action-button px-6 py-3 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
            >
              メインメニューに戻る
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div
                key={category.name}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-amber-200 dark:border-amber-800"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      📚 {category.name}
                    </h3>
                    <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full text-sm font-medium">
                      {category.problemCount}問
                    </span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                    このカテゴリーには{category.problemCount}問の問題があります
                  </p>
                  
                  <button
                    onClick={() => onStartQuiz(category.name)}
                    disabled={category.problemCount === 0}
                    className="quiz-action-button w-full px-4 py-3 rounded-lg transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                  >
                    {category.problemCount > 0 ? '🎯 クイズ開始' : '問題なし'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 統計情報 */}
        {categories.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-amber-900 dark:text-amber-100 mb-4">📊 統計情報</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {categories.length}
                </div>
                <div className="text-sm text-amber-700 dark:text-amber-300">カテゴリー数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {categories.reduce((sum, cat) => sum + cat.problemCount, 0)}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">総問題数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {categories.length > 0 ? Math.round(categories.reduce((sum, cat) => sum + cat.problemCount, 0) / categories.length) : 0}
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300">平均問題数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {Math.max(...categories.map(cat => cat.problemCount), 0)}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">最大問題数</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}