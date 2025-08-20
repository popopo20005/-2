import { useState, useEffect } from 'react';
import { quizSetService, problemService } from '../lib/database';
import type { QuizSet, Problem } from '../types';

interface QuizSetCategorySelectorProps {
  onBack: () => void;
  onStartQuiz: (quizSetId: number, category: string) => void;
}

interface ExtendedQuizSet extends QuizSet {
  problemCount: number;
  categories: string[];
  categoryProblems: { [category: string]: number };
}

export function QuizSetCategorySelector({ onBack, onStartQuiz }: QuizSetCategorySelectorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [quizSets, setQuizSets] = useState<ExtendedQuizSet[]>([]);
  const [selectedQuizSet, setSelectedQuizSet] = useState<ExtendedQuizSet | null>(null);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');

  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(localStorage.getItem('language') || 'ja');
    };

    window.addEventListener('storage', handleStorageChange);
    
    // 定期的に言語設定をチェック
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

  const t = {
    ja: {
      loading: '問題集データを読み込み中...',
      backToMainMenu: '← メインメニューに戻る',
      title: '🎲 問題集カテゴリー別クイズ',
      description: '問題集を選んでカテゴリー別にプレイしましょう',
      backToQuizSetSelection: '問題集選択に戻る',
      selectCategory: 'カテゴリーを選択してください',
      problemsUnit: '問',
      noCategoryQuizSets: 'カテゴリー別プレイ可能な問題集がありません',
      noCategoryQuizSetsDescription: '問題集管理で複数のカテゴリーを含む問題集を作成してください',
      selectQuizSet: '問題集を選択してください',
      selectQuizSetDescription: 'カテゴリー別にプレイしたい問題集を選んでください',
      totalProblems: '総問題数:',
      categoryCount: 'カテゴリー数:',
      categories: 'カテゴリー:',
      categoriesUnit: '個',
      dataLoadError: 'データ読み込みエラー:'
    },
    en: {
      loading: 'Loading quiz set data...',
      backToMainMenu: '← Back to Main Menu',
      title: '🎲 Quiz Set Category Quiz',
      description: 'Select a quiz set and play by categories',
      backToQuizSetSelection: 'Back to Quiz Set Selection',
      selectCategory: 'Please select a category',
      problemsUnit: ' problems',
      noCategoryQuizSets: 'No quiz sets available for category play',
      noCategoryQuizSetsDescription: 'Please create quiz sets with multiple categories in Quiz Set Manager',
      selectQuizSet: 'Please select a quiz set',
      selectQuizSetDescription: 'Choose a quiz set to play by categories',
      totalProblems: 'Total Problems:',
      categoryCount: 'Categories:',
      categories: 'Categories:',
      categoriesUnit: '',
      dataLoadError: 'Data loading error:'
    }
  };

  const currentLang = language as keyof typeof t;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quizSetsData, problemsData] = await Promise.all([
        quizSetService.getAll(),
        problemService.getAll()
      ]);

      const extendedQuizSets: ExtendedQuizSet[] = quizSetsData.map(quizSet => {
        const problems = problemsData.filter(p => p.id && quizSet.problemIds.includes(p.id));
        const categories = [...new Set(problems.map(p => p.category))];
        
        // カテゴリー別問題数をカウント
        const categoryProblems: { [category: string]: number } = {};
        categories.forEach(category => {
          categoryProblems[category] = problems.filter(p => p.category === category).length;
        });

        return {
          ...quizSet,
          problemCount: quizSet.problemIds.length,
          categories,
          categoryProblems
        };
      }).filter(quizSet => quizSet.categories.length > 0); // カテゴリーがある問題集のみ

      setQuizSets(extendedQuizSets);
    } catch (error) {
      console.error(t[currentLang].dataLoadError, error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t[currentLang].loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="quiz-action-button mb-4 px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
          >
            {t[currentLang].backToMainMenu}
          </button>
          <h1 className="text-3xl font-bold text-amber-900 dark:text-white">{t[currentLang].title}</h1>
          <p className="text-amber-700 dark:text-gray-300 mt-2">
            {t[currentLang].description}
          </p>
        </header>

        {selectedQuizSet ? (
          // カテゴリー選択画面
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  📚 {selectedQuizSet.name}
                </h2>
                <button
                  onClick={() => setSelectedQuizSet(null)}
                  className="quiz-action-button px-4 py-2 rounded-lg transition-all backdrop-blur-sm"
                >
                  {t[currentLang].backToQuizSetSelection}
                </button>
              </div>
              {selectedQuizSet.description && (
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {selectedQuizSet.description}
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t[currentLang].selectCategory}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedQuizSet.categories.map(category => (
                  <button
                    key={category}
                    onClick={() => onStartQuiz(selectedQuizSet.id!, category)}
                    className="quiz-action-button w-full p-6 rounded-xl transition-all backdrop-blur-sm shadow-lg hover:shadow-xl transform hover:scale-110 border-2 border-cyan-300 dark:border-cyan-600"
                  >
                    <div className="text-6xl mb-4 filter drop-shadow-lg">🎯</div>
                    <h4 className="text-xl font-bold mb-2 text-white drop-shadow-md">
                      {category}
                    </h4>
                    <p className="text-base text-white/95 font-medium">
                      {selectedQuizSet.categoryProblems[category]}{t[currentLang].problemsUnit}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // 問題集選択画面
          <div className="space-y-6">
            {quizSets.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t[currentLang].noCategoryQuizSets}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {t[currentLang].noCategoryQuizSetsDescription}
                </p>
                <button
                  onClick={onBack}
                  className="quiz-action-button px-6 py-3 rounded-lg transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                >
                  {t[currentLang].backToMainMenu}
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                    {t[currentLang].selectQuizSet}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t[currentLang].selectQuizSetDescription}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {quizSets.map(quizSet => (
                    <div 
                      key={quizSet.id} 
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-cyan-200 dark:hover:border-cyan-800 transform hover:scale-105"
                      onClick={() => setSelectedQuizSet(quizSet)}
                    >
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mb-3 border-b-2 border-cyan-200 dark:border-cyan-800 pb-2">
                          📚 {quizSet.name}
                        </h3>
                        {quizSet.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                            {quizSet.description}
                          </p>
                        )}
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">{t[currentLang].totalProblems}</span>
                            <span className="font-medium text-gray-900 dark:text-white">{quizSet.problemCount}{t[currentLang].problemsUnit}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">{t[currentLang].categoryCount}</span>
                            <span className="font-medium text-gray-900 dark:text-white">{quizSet.categories.length}{t[currentLang].categoriesUnit}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{t[currentLang].categories}</p>
                          <div className="flex flex-wrap gap-1">
                            {quizSet.categories.slice(0, 3).map(category => (
                              <span
                                key={category}
                                className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 rounded text-xs font-medium border border-cyan-200 dark:border-cyan-800"
                              >
                                {category} ({quizSet.categoryProblems[category]})
                              </span>
                            ))}
                            {quizSet.categories.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                                +{quizSet.categories.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}