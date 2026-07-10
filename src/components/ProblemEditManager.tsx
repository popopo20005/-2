import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { problemService, categoryService, db } from '../lib/database';
// TagFilter integrated for TC-3.1.2 testing
import { favoritesService } from '../services/favoritesService';
import { useTags } from '../hooks/useTags';
import { TagFilter } from './TagFilter';
import { TagManager } from './TagManager';
import type { Problem } from '../types';

interface ProblemEditManagerProps {
  onBack: () => void;
}

export function ProblemEditManager({ onBack }: ProblemEditManagerProps) {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const t = {
    ja: {
      title: '📝 問題編集',
      description: '既存の問題を編集・削除できます',
      loading: '問題データを読み込み中...',
      backButton: '← メインメニューに戻る',
      filters: {
        title: '🔍 フィルター',
        category: 'カテゴリー',
        allCategories: 'すべてのカテゴリー',
        searchLabel: '問題文検索',
        searchPlaceholder: '問題文で検索...'
      },
      statistics: {
        title: '📊 統計情報',
        totalProblems: '総問題数',
        displayed: '表示中',
        categories: 'カテゴリー数',
        trueFalse: '○×問題',
        multipleChoice: '多択問題'
      },
      problemList: {
        title: '📋 問題一覧',
        headers: {
          category: 'カテゴリー',
          question: '問題文',
          type: 'タイプ',
          actions: '操作'
        },
        types: {
          'true-false': '○×',
          'multiple-choice': '多択'
        },
        buttons: {
          edit: '✏️ 編集',
          delete: '🗑️ 削除'
        },
        count: '件'
      },
      editModal: {
        title: '問題編集',
        labels: {
          category: 'カテゴリー',
          selectCategory: 'カテゴリーを選択',
          problemType: '問題タイプ',
          question: '問題文',
          questionPlaceholder: '問題文を入力...',
          answer: '答え',
          trueCorrect: '○ (正しい)',
          falseIncorrect: '× (間違い)',
          options: '選択肢',
          optionPlaceholder: '選択肢を入力...',
          correctAnswer: '正解',
          explanation: '解説',
          explanationPlaceholder: '解説を入力...'
        },
        buttons: {
          update: '更新',
          cancel: 'キャンセル'
        },
        validation: {
          required: 'すべての必須項目を入力してください',
          minOptions: '多択問題では最低2つの選択肢が必要です',
          emptyOptions: '空の選択肢があります'
        },
        success: '問題を更新しました',
        error: '問題の更新に失敗しました'
      },
      deleteConfirm: '本当にこの問題を削除しますか？',
      deleteSuccess: '問題を削除しました',
      deleteError: '問題の削除に失敗しました'
    },
    en: {
      title: '📝 Problem Editor',
      description: 'Edit and delete existing problems',
      loading: 'Loading problem data...',
      backButton: '← Back to Main Menu',
      filters: {
        title: '🔍 Filters',
        category: 'Category',
        allCategories: 'All Categories',
        searchLabel: 'Search Questions',
        searchPlaceholder: 'Search by question text...'
      },
      statistics: {
        title: '📊 Statistics',
        totalProblems: 'Total Problems',
        displayed: 'Displayed',
        categories: 'Categories',
        trueFalse: 'True/False',
        multipleChoice: 'Multiple Choice'
      },
      problemList: {
        title: '📋 Problem List',
        headers: {
          category: 'Category',
          question: 'Question',
          type: 'Type',
          actions: 'Actions'
        },
        types: {
          'true-false': 'T/F',
          'multiple-choice': 'MC'
        },
        buttons: {
          edit: '✏️ Edit',
          delete: '🗑️ Delete'
        },
        count: ' items'
      },
      editModal: {
        title: 'Edit Problem',
        labels: {
          category: 'Category',
          selectCategory: 'Select Category',
          problemType: 'Problem Type',
          question: 'Question',
          questionPlaceholder: 'Enter question...',
          answer: 'Answer',
          trueCorrect: '○ (Correct)',
          falseIncorrect: '× (Incorrect)',
          options: 'Options',
          optionPlaceholder: 'Enter option...',
          correctAnswer: 'Correct Answer',
          explanation: 'Explanation',
          explanationPlaceholder: 'Enter explanation...'
        },
        buttons: {
          update: 'Update',
          cancel: 'Cancel'
        },
        validation: {
          required: 'Please fill in all required fields',
          minOptions: 'Multiple choice questions require at least 2 options',
          emptyOptions: 'There are empty options'
        },
        success: 'Problem updated successfully',
        error: 'Failed to update problem'
      },
      deleteConfirm: 'Are you sure you want to delete this problem?',
      deleteSuccess: 'Problem deleted successfully',
      deleteError: 'Failed to delete problem'
    }
  };

  const currentLang = language as keyof typeof t;
  
  // フィルター状態
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'AND' | 'OR'>('OR');
  const [tagRefreshKey, setTagRefreshKey] = useState(0); // TagFilterを強制再レンダリングするためのキー

  // タグリフレッシュ用のフック
  const { refreshTags } = useTags();

  // 編集モーダル状態
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    question: '',
    type: 'true-false' as 'true-false' | 'multiple-choice',
    answer: true,
    explanation: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    tags: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProblems();
  }, [problems, categoryFilter, searchFilter, selectedTags, tagFilterMode]);

  const loadData = async () => {
    try {
      const [problemsData, categoriesData] = await Promise.all([
        problemService.getAll(),
        categoryService.getAll()
      ]);

      setProblems(problemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterProblems = () => {
    let filtered = problems;

    if (categoryFilter) {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (searchFilter) {
      filtered = filtered.filter(p =>
        p.question.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    // タグフィルタ
    if (selectedTags.length > 0) {
      filtered = filtered.filter(p => {
        const problemTags = p.tags || [];
        if (tagFilterMode === 'AND') {
          // AND: すべてのタグを持つ
          return selectedTags.every(tag => problemTags.includes(tag));
        } else {
          // OR: いずれかのタグを持つ
          return selectedTags.some(tag => problemTags.includes(tag));
        }
      });
    }

    setFilteredProblems(filtered);
  };

  const openEditModal = async (problem: Problem) => {
    // DBから最新のデータを取得（TagManagerが追加したtagsを反映）
    const latestProblem = await db.problems.get(problem.id!);

    setEditingProblem(latestProblem || problem);
    setFormData({
      category: latestProblem?.category || problem.category,
      question: latestProblem?.question || problem.question,
      type: (latestProblem?.type || problem.type) || 'true-false',
      answer: latestProblem?.answer !== undefined ? latestProblem.answer : (problem.answer !== undefined ? problem.answer : true),
      explanation: latestProblem?.explanation || problem.explanation,
      options: latestProblem?.options || problem.options || ['', '', '', ''],
      correctAnswer: latestProblem?.correctAnswer !== undefined ? latestProblem.correctAnswer : (problem.correctAnswer || 0),
      tags: latestProblem?.tags || problem.tags || []  // DBから最新のtagsを取得
    });
    setIsEditModalOpen(true);
  };

  const closeModal = () => {
    setIsEditModalOpen(false);
    setEditingProblem(null);
  };

  const saveProblem = async () => {
    if (!formData.category || !formData.question || !formData.explanation) {
      alert(t[currentLang].editModal.validation.required);
      return;
    }

    if (formData.type === 'multiple-choice') {
      const validOptions = formData.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        alert(t[currentLang].editModal.validation.minOptions);
        return;
      }
    }

    if (!editingProblem?.id) {
      alert('編集対象の問題が見つかりません');
      return;
    }

    try {
      // TagManagerが既にDBに保存しているので、DBから最新のtagsを取得
      const latestProblem = await db.problems.get(editingProblem.id);
      const latestTags = latestProblem?.tags || [];

      let problemData: Problem;

      if (formData.type === 'true-false') {
        problemData = {
          id: editingProblem.id,
          category: formData.category,
          question: formData.question,
          type: formData.type,
          explanation: formData.explanation,
          answer: formData.answer,
          tags: latestTags  // DBから取得した最新のtagsを使用
        };
      } else {
        problemData = {
          id: editingProblem.id,
          category: formData.category,
          question: formData.question,
          type: formData.type,
          explanation: formData.explanation,
          options: formData.options.filter(opt => opt.trim()),
          correctAnswer: formData.correctAnswer,
          tags: latestTags  // DBから取得した最新のtagsを使用
        };
      }

      await problemService.update(problemData);
      await loadData();
      await refreshTags(); // TagFilterを更新
      setTagRefreshKey(prev => prev + 1); // TagFilterを強制再マウント
      closeModal();
    } catch (error) {
      console.error('問題保存エラー:', error);
      alert(t[currentLang].editModal.error);
    }
  };

  const deleteProblem = async (problemId: number) => {
    if (!confirm(t[currentLang].deleteConfirm)) return;

    try {
      await problemService.delete(problemId);
      await loadData();
    } catch (error) {
      console.error('問題削除エラー:', error);
      alert(t[currentLang].deleteError);
    }
  };

  const handleFavoriteToggle = async (problemId: number, _newStatus: boolean) => {
    try {
      // favoritesService.toggleFavorite automatically toggles the status
      await favoritesService.toggleFavorite(problemId);
      // Reload data to reflect favorite status
      await loadData();
    } catch (error) {
      console.error('お気に入り更新エラー:', error);
      alert(currentLang === 'ja' ? 'お気に入りの更新に失敗しました' : 'Failed to update favorite');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1] mx-auto mb-4"></div>
          <p className="text-[#CBD5E1]">{t[currentLang].loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: '#0F172A' }}>
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="quiz-action-button mb-4 px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
          >
            {t[currentLang].backButton}
          </button>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">{t[currentLang].title}</h1>
          <p className="text-[#94A3B8] mt-2">
            {t[currentLang].description}
          </p>
        </header>

        {/* フィルター */}
        <div className="mb-6 rounded-2xl p-6" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">{t[currentLang].filters.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                {t[currentLang].filters.category}
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-[#F8FAFC]"
                style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <option value="">{t[currentLang].filters.allCategories}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                {t[currentLang].filters.searchLabel}
              </label>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={t[currentLang].filters.searchPlaceholder}
                className="w-full px-3 py-2 rounded-md text-[#F8FAFC] placeholder-[#64748B]"
                style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          {/* タグフィルター */}
          <div className="mt-4">
            <TagFilter
              key={tagRefreshKey}
              selectedTags={selectedTags}
              onSelectedTagsChange={setSelectedTags}
              filterMode={tagFilterMode}
              onFilterModeChange={setTagFilterMode}
            />
          </div>
        </div>

        {/* 統計情報 */}
        <div className="mb-8 rounded-2xl p-6" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-xl font-semibold text-[#F8FAFC] mb-4">{t[currentLang].statistics.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#818CF8]">{problems.length}</div>
              <div className="text-sm text-[#94A3B8]">{t[currentLang].statistics.totalProblems}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#34D399]">{filteredProblems.length}</div>
              <div className="text-sm text-[#94A3B8]">{t[currentLang].statistics.displayed}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#818CF8]">{categories.length}</div>
              <div className="text-sm text-[#94A3B8]">{t[currentLang].statistics.categories}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#818CF8]">
                {problems.filter(p => p.type === 'multiple-choice').length}
              </div>
              <div className="text-sm text-[#94A3B8]">{t[currentLang].statistics.multipleChoice}</div>
            </div>
          </div>
        </div>

        {/* 問題一覧 */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-[#F8FAFC]">{t[currentLang].problemList.title}</h2>
            <div className="text-sm text-[#94A3B8]">
              {filteredProblems.length}{t[currentLang].problemList.count} / {problems.length}{t[currentLang].problemList.count}
            </div>
          </div>

          {filteredProblems.length === 0 ? (
            <div className="text-center py-12 text-[#64748B]">
              <div className="text-6xl mb-4">📝</div>
              <p>{problems.length === 0 ? (currentLang === 'ja' ? '編集可能な問題がありません' : 'No problems available to edit') : (currentLang === 'ja' ? '条件に一致する問題がありません' : 'No problems match the criteria')}</p>
              {problems.length === 0 && (
                <p className="text-sm mt-2">{currentLang === 'ja' ? 'まずは「問題作成」で問題を作成してください' : 'Please create problems first using "Create Problems"'}</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th className="text-left py-3 px-4 text-[#CBD5E1]">{t[currentLang].problemList.headers.category}</th>
                    <th className="text-left py-3 px-4 text-[#CBD5E1]">{t[currentLang].problemList.headers.question}</th>
                    <th className="text-left py-3 px-4 text-[#CBD5E1]">{t[currentLang].problemList.headers.type}</th>
                    <th className="text-left py-3 px-4 text-[#CBD5E1]">{t[currentLang].problemList.headers.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProblems.map((problem) => (
                    <tr key={problem.id} className="hover:bg-white/5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-[#6366F1]/20 text-[#818CF8] rounded text-sm">
                          {problem.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#F8FAFC]">
                        <div className="max-w-md">
                          {problem.question.length > 80 
                            ? `${problem.question.substring(0, 80)}...` 
                            : problem.question
                          }
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${
                          problem.type === 'multiple-choice'
                            ? 'bg-[#6366F1]/20 text-[#818CF8]'
                            : 'bg-[#10B981]/20 text-[#34D399]'
                        }`}>
                          {t[currentLang].problemList.types[problem.type || 'true-false']}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={async () => {
                              if (problem.id) {
                                await handleFavoriteToggle(problem.id, !problem.isFavorite);
                              }
                            }}
                            className="px-2 py-1 bg-[#F59E0B]/20 text-[#F59E0B] rounded hover:bg-[#F59E0B]/30"
                          >
                            {problem.isFavorite ? '⭐' : '☆'}
                          </button>
                          <button
                            onClick={() => openEditModal(problem)}
                            className="px-3 py-1 rounded text-sm transition-all text-[#818CF8] hover:bg-[#6366F1]/10"
                          >
                            {t[currentLang].problemList.buttons.edit}
                          </button>
                          <button
                            onClick={() => problem.id && deleteProblem(problem.id)}
                            className="px-3 py-1 rounded text-sm transition-all text-[#EF4444] hover:bg-[#EF4444]/10"
                          >
                            {t[currentLang].problemList.buttons.delete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 編集モーダル */}
        {isEditModalOpen && editingProblem && createPortal(
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{zIndex: 9999}}>
            <div className="rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" style={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-xl font-semibold text-[#F8FAFC]">
                  {t[currentLang].editModal.title}
                </h3>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                      {t[currentLang].editModal.labels.category} *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-md text-[#F8FAFC]"
                      style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="">{t[currentLang].editModal.labels.selectCategory}</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                      {t[currentLang].editModal.labels.problemType} *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'true-false' | 'multiple-choice' })}
                      className="w-full px-3 py-2 rounded-md text-[#F8FAFC]"
                      style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="true-false">{t[currentLang].statistics.trueFalse}</option>
                      <option value="multiple-choice">{t[currentLang].statistics.multipleChoice}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                      {t[currentLang].editModal.labels.question} *
                    </label>
                    <textarea
                      value={formData.question}
                      onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md text-[#F8FAFC]"
                      style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                      placeholder={t[currentLang].editModal.labels.questionPlaceholder}
                    />
                  </div>

                  {formData.type === 'true-false' ? (
                    <div>
                      <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                        {t[currentLang].editModal.labels.answer} *
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={formData.answer === true}
                            onChange={() => setFormData({ ...formData, answer: true })}
                            className="mr-2"
                          />
                          <span className="text-gray-900 dark:text-white">{t[currentLang].editModal.labels.trueCorrect}</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={formData.answer === false}
                            onChange={() => setFormData({ ...formData, answer: false })}
                            className="mr-2"
                          />
                          <span className="text-gray-900 dark:text-white">{t[currentLang].editModal.labels.falseIncorrect}</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                        {t[currentLang].editModal.labels.options} *
                      </label>
                      <div className="space-y-2">
                        {formData.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              checked={formData.correctAnswer === index}
                              onChange={() => setFormData({ ...formData, correctAnswer: index })}
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...formData.options];
                                newOptions[index] = e.target.value;
                                setFormData({ ...formData, options: newOptions });
                              }}
                              placeholder={currentLang === 'ja' ? `選択肢 ${index + 1}` : `Option ${index + 1}`}
                              className="flex-1 px-3 py-2 rounded-md text-[#F8FAFC]"
                              style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                      {t[currentLang].editModal.labels.explanation} *
                    </label>
                    <textarea
                      value={formData.explanation}
                      onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md text-[#F8FAFC]"
                      style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                      placeholder={t[currentLang].editModal.labels.explanationPlaceholder}
                    />
                  </div>

                  {/* タグ管理 */}
                  {editingProblem?.id && (
                    <div>
                      <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                        タグ
                      </label>
                      <TagManager
                        problemId={editingProblem.id}
                        currentTags={formData.tags}
                        onTagsChange={async (tags) => {
                          setFormData({ ...formData, tags });
                          await refreshTags();
                          setTagRefreshKey(prev => prev + 1);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-gray-600 flex justify-end space-x-4">
                <button
                  onClick={closeModal}
                  className="quiz-action-button px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                >
                  {t[currentLang].editModal.buttons.cancel}
                </button>
                <button
                  onClick={saveProblem}
                  className="quiz-action-button px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                >
                  {t[currentLang].editModal.buttons.update}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}