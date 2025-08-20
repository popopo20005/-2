import { useState, useEffect } from 'react';
import { quizSetService, problemService, categoryService } from '../lib/database';
import type { QuizSet, Problem } from '../types';

interface QuizSetManagementProps {
  onBack: () => void;
}

interface ExtendedQuizSet extends QuizSet {
  problemCount: number;
  categories: string[];
  createdDate: string;
  updatedDate: string;
}

export function QuizSetManagement({ onBack }: QuizSetManagementProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [quizSets, setQuizSets] = useState<ExtendedQuizSet[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  
  // フィルタリング・検索
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // 編集中の問題集
  const [editingQuizSet, setEditingQuizSet] = useState<QuizSet | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    problemIds: [] as number[]
  });
  
  // 新規作成
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: ''
  });
  
  // 問題選択
  const [availableProblems, setAvailableProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quizSetsData, problemsData, categoriesData] = await Promise.all([
        quizSetService.getAll(),
        problemService.getAll(),
        categoryService.getAll()
      ]);

      const extendedQuizSets: ExtendedQuizSet[] = quizSetsData.map(quizSet => {
        const problems = problemsData.filter(p => p.id && quizSet.problemIds.includes(p.id));
        const categories = [...new Set(problems.map(p => p.category))];

        return {
          ...quizSet,
          problemCount: quizSet.problemIds.length,
          categories,
          createdDate: quizSet.createdAt?.toLocaleDateString('ja-JP') || '-',
          updatedDate: quizSet.updatedAt ? quizSet.updatedAt.toLocaleDateString('ja-JP') : '-'
        };
      });

      setQuizSets(extendedQuizSets);
      setAllProblems(problemsData);
      setAllCategories(categoriesData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const getFilteredAndSortedQuizSets = (): ExtendedQuizSet[] => {
    return quizSets
      .filter(quizSet => {
        const matchesSearch = !searchTerm || 
          quizSet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (quizSet.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || 
          quizSet.categories.includes(selectedCategory);
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;
        
        switch (sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'created':
            aValue = a.createdAt?.getTime() || 0;
            bValue = b.createdAt?.getTime() || 0;
            break;
          case 'updated':
            aValue = (a.updatedAt || a.createdAt)?.getTime() || 0;
            bValue = (b.updatedAt || b.createdAt)?.getTime() || 0;
            break;
          case 'size':
            aValue = a.problemCount;
            bValue = b.problemCount;
            break;
          default:
            return 0;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else {
          return sortOrder === 'asc' ? 
            (aValue as number) - (bValue as number) : 
            (bValue as number) - (aValue as number);
        }
      });
  };

  const deleteQuizSet = async (id: number) => {
    const quizSet = quizSets.find(qs => qs.id === id);
    if (!quizSet) return;
    
    if (!confirm(`問題集「${quizSet.name}」を削除しますか？\n\nこの操作は元に戻せません。`)) return;
    
    try {
      await quizSetService.delete(id);
      await loadData();
    } catch (error) {
      console.error('問題集削除エラー:', error);
      alert('問題集の削除に失敗しました');
    }
  };

  const openEditModal = (quizSet: QuizSet) => {
    setEditingQuizSet(quizSet);
    setEditFormData({
      name: quizSet.name,
      description: quizSet.description || '',
      problemIds: [...quizSet.problemIds]
    });
    setSelectedProblems(new Set(quizSet.problemIds));
    setAvailableProblems(allProblems);
    setIsEditModalOpen(true);
  };

  const openCreateModal = () => {
    setCreateFormData({
      name: '',
      description: ''
    });
    setSelectedProblems(new Set());
    setAvailableProblems(allProblems);
    setIsCreateModalOpen(true);
  };

  const closeModals = () => {
    setIsEditModalOpen(false);
    setIsCreateModalOpen(false);
    setEditingQuizSet(null);
    setSelectedProblems(new Set());
  };

  const saveQuizSet = async () => {
    if (!editFormData.name.trim()) {
      alert('問題集名を入力してください');
      return;
    }
    
    if (selectedProblems.size === 0) {
      alert('少なくとも1つの問題を選択してください');
      return;
    }

    try {
      const quizSetData = {
        ...editingQuizSet!,
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        problemIds: Array.from(selectedProblems)
      };
      
      await quizSetService.save(quizSetData);
      await loadData();
      closeModals();
    } catch (error) {
      console.error('問題集保存エラー:', error);
      alert('問題集の保存に失敗しました');
    }
  };

  const createQuizSet = async () => {
    if (!createFormData.name.trim()) {
      alert('問題集名を入力してください');
      return;
    }
    
    if (selectedProblems.size === 0) {
      alert('少なくとも1つの問題を選択してください');
      return;
    }

    try {
      const quizSetData = {
        name: createFormData.name.trim(),
        description: createFormData.description.trim(),
        problemIds: Array.from(selectedProblems),
        createdAt: new Date()
      };
      
      await quizSetService.save(quizSetData);
      await loadData();
      closeModals();
    } catch (error) {
      console.error('問題集作成エラー:', error);
      alert('問題集の作成に失敗しました');
    }
  };

  const toggleProblemSelection = (problemId: number) => {
    const newSelected = new Set(selectedProblems);
    if (newSelected.has(problemId)) {
      newSelected.delete(problemId);
    } else {
      newSelected.add(problemId);
    }
    setSelectedProblems(newSelected);
  };

  const selectAllProblemsInCategory = (category: string) => {
    const categoryProblems = availableProblems
      .filter(p => p.category === category && p.id)
      .map(p => p.id!);
    
    const newSelected = new Set(selectedProblems);
    categoryProblems.forEach(id => newSelected.add(id));
    setSelectedProblems(newSelected);
  };

  const deselectAllProblemsInCategory = (category: string) => {
    const categoryProblems = availableProblems
      .filter(p => p.category === category && p.id)
      .map(p => p.id!);
    
    const newSelected = new Set(selectedProblems);
    categoryProblems.forEach(id => newSelected.delete(id));
    setSelectedProblems(newSelected);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">問題集データを読み込み中...</p>
        </div>
      </div>
    );
  }

  const filteredQuizSets = getFilteredAndSortedQuizSets();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 quiz-action-button rounded-lg transition-colors"
          >
            ← メインメニューに戻る
          </button>
          <h1 className="text-3xl font-bold text-purple-900 dark:text-purple-100">🗂️ 問題集管理</h1>
        </header>

        {/* コントロールパネル */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-md p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">検索</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="問題集名・説明で検索..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">カテゴリ</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">全カテゴリ</option>
                  {allCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">並び順</label>
                <div className="flex space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                  >
                    <option value="name">名前</option>
                    <option value="created">作成日</option>
                    <option value="updated">更新日</option>
                    <option value="size">問題数</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 quiz-action-button rounded-md text-sm"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>
            <div className="lg:ml-4">
              <button
                onClick={openCreateModal}
                className="px-6 py-2 quiz-action-button rounded-lg transition-colors font-medium"
              >
                ➕ 新規作成
              </button>
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="mb-8 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 mb-4">📈 統計サマリー</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{quizSets.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">総問題集数</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredQuizSets.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">表示中</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {quizSets.reduce((sum, qs) => sum + qs.problemCount, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">総問題数</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {quizSets.length > 0 ? Math.round(quizSets.reduce((sum, qs) => sum + qs.problemCount, 0) / quizSets.length) : 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">平均問題数</div>
            </div>
          </div>
        </div>

        {/* 問題集一覧 */}
        <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">📋 問題集一覧</h2>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {filteredQuizSets.length}件 / {quizSets.length}件
            </div>
          </div>

          {filteredQuizSets.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {quizSets.length === 0 ? '問題集がありません' : '条件に一致する問題集がありません'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizSets.map((quizSet) => (
                <div key={quizSet.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                      {quizSet.name}
                    </h3>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => openEditModal(quizSet)}
                        className="p-1 quiz-action-button rounded text-sm"
                        title="編集"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteQuizSet(quizSet.id!)}
                        className="p-1 text-red-500 hover:text-red-700 text-sm"
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {quizSet.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {quizSet.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">問題数:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{quizSet.problemCount}問</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">カテゴリ:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{quizSet.categories.length}個</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">作成日:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{quizSet.createdDate}</span>
                    </div>
                    {quizSet.updatedDate !== '-' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">更新日:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{quizSet.updatedDate}</span>
                      </div>
                    )}
                  </div>

                  {quizSet.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {quizSet.categories.slice(0, 3).map(category => (
                        <span
                          key={category}
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs"
                        >
                          {category}
                        </span>
                      ))}
                      {quizSet.categories.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                          +{quizSet.categories.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 編集モーダル */}
        {isEditModalOpen && editingQuizSet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  問題集を編集: {editingQuizSet.name}
                </h3>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      問題集名 *
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      placeholder="問題集名を入力..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      説明
                    </label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      rows={3}
                      placeholder="問題集の説明を入力..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      問題選択 ({selectedProblems.size}問選択中)
                    </label>
                    
                    {/* カテゴリ別選択 */}
                    <div className="space-y-4">
                      {allCategories.map(category => {
                        const categoryProblems = availableProblems.filter(p => p.category === category);
                        const selectedInCategory = categoryProblems.filter(p => p.id && selectedProblems.has(p.id)).length;
                        
                        return (
                          <div key={category} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {category} ({selectedInCategory}/{categoryProblems.length})
                              </h4>
                              <div className="space-x-2">
                                <button
                                  onClick={() => selectAllProblemsInCategory(category)}
                                  className="px-2 py-1 quiz-action-button rounded text-xs"
                                >
                                  全選択
                                </button>
                                <button
                                  onClick={() => deselectAllProblemsInCategory(category)}
                                  className="px-2 py-1 quiz-action-button rounded text-xs"
                                >
                                  全解除
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                              {categoryProblems.map(problem => (
                                <label key={problem.id} className="flex items-start space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                                  <input
                                    type="checkbox"
                                    checked={problem.id ? selectedProblems.has(problem.id) : false}
                                    onChange={() => problem.id && toggleProblemSelection(problem.id)}
                                    className="mt-1"
                                  />
                                  <span className="text-sm text-gray-900 dark:text-white line-clamp-2">
                                    {problem.question}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-gray-600 flex justify-end space-x-4">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 quiz-action-button rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveQuizSet}
                  className="px-4 py-2 quiz-action-button rounded-lg transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 新規作成モーダル */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  新しい問題集を作成
                </h3>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      問題集名 *
                    </label>
                    <input
                      type="text"
                      value={createFormData.name}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      placeholder="問題集名を入力..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      説明
                    </label>
                    <textarea
                      value={createFormData.description}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      rows={3}
                      placeholder="問題集の説明を入力..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      問題選択 ({selectedProblems.size}問選択中)
                    </label>
                    
                    {/* カテゴリ別選択 */}
                    <div className="space-y-4">
                      {allCategories.map(category => {
                        const categoryProblems = availableProblems.filter(p => p.category === category);
                        const selectedInCategory = categoryProblems.filter(p => p.id && selectedProblems.has(p.id)).length;
                        
                        return (
                          <div key={category} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {category} ({selectedInCategory}/{categoryProblems.length})
                              </h4>
                              <div className="space-x-2">
                                <button
                                  onClick={() => selectAllProblemsInCategory(category)}
                                  className="px-2 py-1 quiz-action-button rounded text-xs"
                                >
                                  全選択
                                </button>
                                <button
                                  onClick={() => deselectAllProblemsInCategory(category)}
                                  className="px-2 py-1 quiz-action-button rounded text-xs"
                                >
                                  全解除
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                              {categoryProblems.map(problem => (
                                <label key={problem.id} className="flex items-start space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                                  <input
                                    type="checkbox"
                                    checked={problem.id ? selectedProblems.has(problem.id) : false}
                                    onChange={() => problem.id && toggleProblemSelection(problem.id)}
                                    className="mt-1"
                                  />
                                  <span className="text-sm text-gray-900 dark:text-white line-clamp-2">
                                    {problem.question}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-gray-600 flex justify-end space-x-4">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={createQuizSet}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}