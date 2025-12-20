import { useState, useEffect } from 'react';
import { quizSetService, problemService, categoryService } from '../lib/database';
import type { QuizSet, Problem } from '../types';
import { SkeletonList, Skeleton } from './ui/Skeleton';

interface QuizSetManagerProps {
  onBack: () => void;
  onStartQuiz?: (quizSetId: number) => void;
  onStartCategoryQuiz?: (quizSetId: number, category: string) => void;
  onShare?: (quizSetId: number) => void;
}

interface ExtendedQuizSet extends QuizSet {
  problemCount: number;
  categories: string[];
  createdDate: string;
  updatedDate: string;
}

export function QuizSetManager({ onBack, onStartQuiz: _onStartQuiz, onStartCategoryQuiz: _onStartCategoryQuiz, onShare }: QuizSetManagerProps) {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');
  const [isLoading, setIsLoading] = useState(true);
  const [quizSets, setQuizSets] = useState<ExtendedQuizSet[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  
  // フィルタリング・検索
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // 編集モーダル
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuizSet, setEditingQuizSet] = useState<QuizSet | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: ''
  });
  const [selectedProblems, setSelectedProblems] = useState<Set<number>>(new Set());
  const [availableProblems, setAvailableProblems] = useState<Problem[]>([]);
  
  // 新規作成モーダル
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: ''
  });
  const [createSelectedProblems, setCreateSelectedProblems] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

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
      title: '🗂️ 問題集管理',
      backToMenu: 'メインメニューに戻る',
      loading: '問題集データを読み込み中...',
      search: {
        label: '検索',
        placeholder: '問題集名・説明で検索...',
        categoryLabel: 'カテゴリ',
        allCategories: '全カテゴリ',
        sortLabel: '並び順',
        sortOptions: {
          name: '名前',
          created: '作成日',
          updated: '更新日',
          size: '問題数'
        }
      },
      buttons: {
        create: '➕ 新規作成',
        createSample: '🌟 サンプル作成',
        edit: '✏️',
        delete: '🗑️',
        cancel: 'キャンセル',
        save: '保存',
        selectAll: '全選択',
        deselectAll: '全解除'
      },
      statistics: {
        title: '📈 統計サマリー',
        totalQuizSets: '総問題集数',
        showing: '表示中',
        totalProblems: '総問題数',
        averageProblems: '平均問題数'
      },
      quizSetList: {
        title: '📋 問題集一覧',
        count: '件',
        problemCount: '問題数',
        category: 'カテゴリ',
        createdDate: '作成日',
        problems: '問',
        categories: '個'
      },
      modals: {
        editTitle: '問題集を編集',
        createTitle: '新しい問題集を作成',
        nameLabel: '問題集名',
        nameRequired: '問題集名 *',
        namePlaceholder: '問題集名を入力...',
        descriptionLabel: '説明',
        descriptionPlaceholder: '問題集の説明を入力...',
        problemSelection: '問題選択',
        problemsSelected: '問選択中',
        createButtonText: '作成'
      },
      messages: {
        noQuizSets: '問題集がありません',
        noMatchingQuizSets: '条件に一致する問題集がありません',
        totalQuizSets: '総問題集数',
        totalProblemsCount: '総問題数',
        totalCategoriesCount: '総カテゴリ数',
        createSamplePrompt: '問題や問題集が見つかりません。\n\nサンプルデータを作成しますか？',
        creatingsample: 'サンプルデータを作成中...',
        sampleCreated: 'サンプルデータを作成しました',
        sampleCreateError: 'サンプルデータ作成エラー:',
        loadingData: '問題集データを読み込み中...',
        loadError: 'データの読み込みに失敗しました: ',
        deleteConfirm: 'を削除しますか？\n\nこの操作は元に戻せません。',
        deleteError: '問題集の削除に失敗しました',
        nameRequired: '問題集名を入力してください',
        selectAtLeastOne: '少なくとも1つの問題を選択してください',
        quizSetUpdated: '問題集を更新しました',
        saveError: '問題集の保存に失敗しました',
        quizSetCreated: '問題集を作成しました',
        createError: '問題集の作成に失敗しました',
        detailsComingSoon: '詳細表示機能は復旧中です',
        createSampleData: '🌟 サンプルデータを作成'
      },
      sample: {
        quizSetName: 'サンプル問題集',
        quizSetDescription: 'アプリの使い方を学ぶためのサンプル問題集です。',
        categories: {
          programming: 'プログラミング',
          math: '数学'
        },
        problems: {
          jsArray: 'JavaScriptで配列の末尾に要素を追加するメソッドはどれですか？',
          jsArrayExplanation: 'push()メソッドは配列の末尾に新しい要素を追加します。',
          htmlAcronym: 'HTMLはHyperText Markup Languageの略ですか？',
          htmlExplanation: 'HTMLは確かにHyperText Markup Languageの略です。',
          mathBasic: '2 + 2 = 4ですか？',
          mathBasicExplanation: '2 + 2 = 4は正しい計算です。',
          pi: '円周率πの近似値はどれですか？',
          piExplanation: '円周率πの近似値は3.14です。'
        }
      }
    },
    en: {
      title: '🗂️ Quiz Set Manager',
      backToMenu: '← Back to Main Menu',
      loading: 'Loading quiz set data...',
      search: {
        label: 'Search',
        placeholder: 'Search by quiz set name or description...',
        categoryLabel: 'Category',
        allCategories: 'All Categories',
        sortLabel: 'Sort By',
        sortOptions: {
          name: 'Name',
          created: 'Created Date',
          updated: 'Updated Date',
          size: 'Problem Count'
        }
      },
      buttons: {
        create: '➕ Create New',
        createSample: '🌟 Create Sample',
        edit: '✏️',
        delete: '🗑️',
        cancel: 'Cancel',
        save: 'Save',
        selectAll: 'Select All',
        deselectAll: 'Deselect All'
      },
      statistics: {
        title: '📈 Statistics Summary',
        totalQuizSets: 'Total Quiz Sets',
        showing: 'Showing',
        totalProblems: 'Total Problems',
        averageProblems: 'Average Problems'
      },
      quizSetList: {
        title: '📋 Quiz Set List',
        count: 'items',
        problemCount: 'Problems',
        category: 'Categories',
        createdDate: 'Created',
        problems: 'problems',
        categories: 'categories'
      },
      modals: {
        editTitle: 'Edit Quiz Set',
        createTitle: 'Create New Quiz Set',
        nameLabel: 'Quiz Set Name',
        nameRequired: 'Quiz Set Name *',
        namePlaceholder: 'Enter quiz set name...',
        descriptionLabel: 'Description',
        descriptionPlaceholder: 'Enter quiz set description...',
        problemSelection: 'Problem Selection',
        problemsSelected: 'problems selected',
        createButtonText: 'Create'
      },
      messages: {
        noQuizSets: 'No quiz sets found',
        noMatchingQuizSets: 'No quiz sets match the criteria',
        totalQuizSets: 'Total Quiz Sets',
        totalProblemsCount: 'Total Problems',
        totalCategoriesCount: 'Total Categories',
        createSamplePrompt: 'No problems or quiz sets found.\n\nWould you like to create sample data?',
        creatingsample: 'Creating sample data...',
        sampleCreated: 'Sample data created successfully',
        sampleCreateError: 'Sample data creation error:',
        loadingData: 'Loading quiz set data...',
        loadError: 'Failed to load data: ',
        deleteConfirm: ' will be deleted?\n\nThis operation cannot be undone.',
        deleteError: 'Failed to delete quiz set',
        nameRequired: 'Please enter a quiz set name',
        selectAtLeastOne: 'Please select at least one problem',
        quizSetUpdated: 'Quiz set updated successfully',
        saveError: 'Failed to save quiz set',
        quizSetCreated: 'Quiz set created successfully',
        createError: 'Failed to create quiz set',
        detailsComingSoon: 'Detail view feature is under development',
        createSampleData: '🌟 Create Sample Data'
      },
      sample: {
        quizSetName: 'Sample Quiz Set',
        quizSetDescription: 'A sample quiz set to help you learn how to use the app.',
        categories: {
          programming: 'Programming',
          math: 'Mathematics'
        },
        problems: {
          jsArray: 'Which method adds an element to the end of an array in JavaScript?',
          jsArrayExplanation: 'The push() method adds new elements to the end of an array.',
          htmlAcronym: 'Is HTML an abbreviation for HyperText Markup Language?',
          htmlExplanation: 'HTML is indeed an abbreviation for HyperText Markup Language.',
          mathBasic: 'Is 2 + 2 = 4?',
          mathBasicExplanation: '2 + 2 = 4 is a correct calculation.',
          pi: 'What is the approximate value of π (pi)?',
          piExplanation: 'The approximate value of π (pi) is 3.14.'
        }
      }
    }
  };

  const currentLang = language as keyof typeof t;

  const createSampleData = async () => {
    try {
      console.log(t[currentLang].messages.creatingsample);
      
      // サンプルカテゴリを追加
      await categoryService.add(t[currentLang].sample.categories.programming);
      await categoryService.add(t[currentLang].sample.categories.math);
      
      // サンプル問題を追加
      const sampleProblems: Omit<Problem, 'id'>[] = [
        {
          category: t[currentLang].sample.categories.programming,
          question: t[currentLang].sample.problems.jsArray,
          type: 'multiple-choice',
          options: ['push()', 'add()', 'append()', 'insert()'],
          correctAnswer: 0,
          explanation: t[currentLang].sample.problems.jsArrayExplanation
        },
        {
          category: t[currentLang].sample.categories.programming,
          question: t[currentLang].sample.problems.htmlAcronym,
          type: 'true-false',
          answer: true,
          explanation: t[currentLang].sample.problems.htmlExplanation
        },
        {
          category: t[currentLang].sample.categories.math,
          question: t[currentLang].sample.problems.mathBasic,
          type: 'true-false',
          answer: true,
          explanation: t[currentLang].sample.problems.mathBasicExplanation
        },
        {
          category: t[currentLang].sample.categories.math,
          question: t[currentLang].sample.problems.pi,
          type: 'multiple-choice',
          options: ['3.14', '2.71', '1.41', '1.73'],
          correctAnswer: 0,
          explanation: t[currentLang].sample.problems.piExplanation
        }
      ];
      
      const problemIds: number[] = [];
      for (const problemData of sampleProblems) {
        const id = await problemService.add(problemData);
        problemIds.push(id);
      }
      
      // サンプル問題集を作成
      await quizSetService.save({
        name: t[currentLang].sample.quizSetName,
        description: t[currentLang].sample.quizSetDescription,
        problemIds: problemIds,
        createdAt: new Date()
      });
      
      console.log(t[currentLang].messages.sampleCreated);
    } catch (error) {
      console.error(t[currentLang].messages.sampleCreateError, error);
    }
  };

  const loadData = async () => {
    try {
      console.log(t[currentLang].messages.loadingData);
      const [quizSetsData, problemsData, categoriesData] = await Promise.all([
        quizSetService.getAll(),
        problemService.getAll(),
        categoryService.getAll()
      ]);

      console.log('読み込み結果:', {
        quizSets: quizSetsData.length,
        problems: problemsData.length,
        categories: categoriesData.length
      });

      // データが空の場合はサンプルデータを作成
      if (problemsData.length === 0 && quizSetsData.length === 0) {
        const shouldCreateSample = confirm(t[currentLang].messages.createSamplePrompt);
        if (shouldCreateSample) {
          await createSampleData();
          // サンプルデータ作成後に再読み込み
          return loadData();
        }
      }

      const extendedQuizSets: ExtendedQuizSet[] = quizSetsData.map(quizSet => {
        const problems = problemsData.filter(p => p.id && quizSet.problemIds.includes(p.id));
        const categories = [...new Set(problems.map(p => p.category))];

        return {
          ...quizSet,
          problemCount: quizSet.problemIds.length,
          categories,
          createdDate: quizSet.createdAt ? quizSet.createdAt.toLocaleDateString('ja-JP') : '-',
          updatedDate: quizSet.updatedAt ? quizSet.updatedAt.toLocaleDateString('ja-JP') : '-'
        };
      });

      console.log('拡張された問題集データ:', extendedQuizSets);
      setQuizSets(extendedQuizSets);
      setAllProblems(problemsData);
      setAllCategories(categoriesData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      alert(t[currentLang].messages.loadError + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteQuizSet = async (id: number) => {
    const quizSet = quizSets.find(qs => qs.id === id);
    if (!quizSet) return;
    
    if (!confirm(`「${quizSet.name}」${t[currentLang].messages.deleteConfirm}`)) return;
    
    try {
      await quizSetService.delete(id);
      await loadData();
    } catch (error) {
      console.error('問題集削除エラー:', error);
      alert(t[currentLang].messages.deleteError);
    }
  };

  const openEditModal = (quizSet: QuizSet) => {
    console.log('編集モーダルを開く:', quizSet);
    setEditingQuizSet(quizSet);
    setEditFormData({
      name: quizSet.name,
      description: quizSet.description || ''
    });
    setSelectedProblems(new Set(quizSet.problemIds));
    setAvailableProblems(allProblems);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingQuizSet(null);
    setEditFormData({
      name: '',
      description: ''
    });
    setSelectedProblems(new Set());
    setAvailableProblems([]);
  };

  const openCreateModal = () => {
    console.log('新規作成モーダルを開く');
    setCreateFormData({
      name: '',
      description: ''
    });
    setCreateSelectedProblems(new Set());
    setAvailableProblems(allProblems);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateFormData({
      name: '',
      description: ''
    });
    setCreateSelectedProblems(new Set());
    setAvailableProblems([]);
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

  const toggleCreateProblemSelection = (problemId: number) => {
    const newSelected = new Set(createSelectedProblems);
    if (newSelected.has(problemId)) {
      newSelected.delete(problemId);
    } else {
      newSelected.add(problemId);
    }
    setCreateSelectedProblems(newSelected);
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

  const selectAllProblemsInCategoryForCreate = (category: string) => {
    const categoryProblems = availableProblems
      .filter(p => p.category === category && p.id)
      .map(p => p.id!);
    
    const newSelected = new Set(createSelectedProblems);
    categoryProblems.forEach(id => newSelected.add(id));
    setCreateSelectedProblems(newSelected);
  };

  const deselectAllProblemsInCategoryForCreate = (category: string) => {
    const categoryProblems = availableProblems
      .filter(p => p.category === category && p.id)
      .map(p => p.id!);
    
    const newSelected = new Set(createSelectedProblems);
    categoryProblems.forEach(id => newSelected.delete(id));
    setCreateSelectedProblems(newSelected);
  };

  const saveQuizSet = async () => {
    if (!editingQuizSet || !editFormData.name.trim()) {
      alert(t[currentLang].messages.nameRequired);
      return;
    }

    if (selectedProblems.size === 0) {
      alert(t[currentLang].messages.selectAtLeastOne);
      return;
    }

    try {
      const updatedQuizSet = {
        ...editingQuizSet,
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        problemIds: Array.from(selectedProblems),
        updatedAt: new Date()
      };
      
      await quizSetService.save(updatedQuizSet);
      await loadData();
      closeEditModal();
      alert(t[currentLang].messages.quizSetUpdated);
    } catch (error) {
      console.error('問題集保存エラー:', error);
      alert(t[currentLang].messages.saveError);
    }
  };

  const createQuizSet = async () => {
    if (!createFormData.name.trim()) {
      alert(t[currentLang].messages.nameRequired);
      return;
    }

    if (createSelectedProblems.size === 0) {
      alert(t[currentLang].messages.selectAtLeastOne);
      return;
    }

    try {
      const newQuizSet = {
        name: createFormData.name.trim(),
        description: createFormData.description.trim(),
        problemIds: Array.from(createSelectedProblems),
        createdAt: new Date()
      };
      
      await quizSetService.save(newQuizSet);
      await loadData();
      closeCreateModal();
      alert(t[currentLang].messages.quizSetCreated);
    } catch (error) {
      console.error('問題集作成エラー:', error);
      alert(t[currentLang].messages.createError);
    }
  };

  // フィルタリングとソート
  const filteredQuizSets = quizSets
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
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? 
          (aValue as number) - (bValue as number) : 
          (bValue as number) - (aValue as number);
      }
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          {/* ヘッダー部分のスケルトン */}
          <header className="mb-8">
            <Skeleton width="w-48" height="h-10" className="mb-4" />
            <Skeleton width="w-64" height="h-9" />
          </header>

          {/* コントロールパネルのスケルトン */}
          <div className="mb-8 bg-white/50 dark:bg-gray-800/50 rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Skeleton width="w-full" height="h-10" />
              <Skeleton width="w-full" height="h-10" />
              <Skeleton width="w-full" height="h-10" />
            </div>
            <div className="flex gap-4">
              <Skeleton width="w-32" height="h-10" />
              <Skeleton width="w-32" height="h-10" />
            </div>
          </div>

          {/* 問題集リストのスケルトン */}
          <SkeletonList count={5} showAvatar={false} asCard={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="quiz-action-button mb-4 px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
          >
            {t[currentLang].backToMenu}
          </button>
          <h1 className="text-3xl font-bold text-purple-900 dark:text-white">{t[currentLang].title}</h1>
        </header>

        {/* コントロールパネル */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-md p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t[currentLang].search.label}</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t[currentLang].search.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t[currentLang].search.categoryLabel}</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">{t[currentLang].search.allCategories}</option>
                  {allCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t[currentLang].search.sortLabel}</label>
                <div className="flex space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
                  >
                    <option value="name">{t[currentLang].search.sortOptions.name}</option>
                    <option value="created">{t[currentLang].search.sortOptions.created}</option>
                    <option value="updated">{t[currentLang].search.sortOptions.updated}</option>
                    <option value="size">{t[currentLang].search.sortOptions.size}</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="quiz-action-button px-3 py-2 rounded-md text-sm transition-all shadow-sm hover:shadow-md transform hover:scale-105 backdrop-blur-sm"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>
            <div className="lg:ml-4 flex space-x-2">
              <button
                onClick={openCreateModal}
                disabled={allProblems.length === 0}
                className="quiz-action-button px-6 py-2 rounded-lg transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                {t[currentLang].buttons.create}
              </button>
              {allProblems.length === 0 && (
                <button
                  onClick={async () => {
                    await createSampleData();
                    await loadData();
                  }}
                  className="quiz-action-button px-4 py-2 rounded-lg transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                >
                  {t[currentLang].buttons.createSample}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="mb-8 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 mb-4">{t[currentLang].statistics.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{quizSets.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].statistics.totalQuizSets}</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredQuizSets.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].statistics.showing}</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {quizSets.reduce((sum, qs) => sum + qs.problemCount, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].statistics.totalProblems}</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {quizSets.length > 0 ? Math.round(quizSets.reduce((sum, qs) => sum + qs.problemCount, 0) / quizSets.length) : 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].statistics.averageProblems}</div>
            </div>
          </div>
        </div>

        {/* 問題集一覧 */}
        <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t[currentLang].quizSetList.title}</h2>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {filteredQuizSets.length}{t[currentLang].quizSetList.count} / {quizSets.length}{t[currentLang].quizSetList.count}
            </div>
          </div>

          {filteredQuizSets.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="space-y-2">
                <p>{quizSets.length === 0 ? t[currentLang].messages.noQuizSets : t[currentLang].messages.noMatchingQuizSets}</p>
                <div className="text-sm space-y-1">
                  <p>{t[currentLang].messages.totalQuizSets}: {quizSets.length}</p>
                  <p>{t[currentLang].messages.totalProblemsCount}: {allProblems.length}</p>
                  <p>{t[currentLang].messages.totalCategoriesCount}: {allCategories.length}</p>
                </div>
                {quizSets.length === 0 && allProblems.length === 0 && (
                  <button
                    onClick={async () => {
                      await createSampleData();
                      await loadData();
                    }}
                    className="quiz-action-button mt-4 px-4 py-2 rounded-lg transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                  >
                    {t[currentLang].messages.createSampleData}
                  </button>
                )}
              </div>
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
                        onClick={() => alert(t[currentLang].messages.detailsComingSoon)}
                        className="quiz-action-button p-1 text-sm rounded"
                        title="詳細表示"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => onShare && quizSet.id && onShare(quizSet.id)}
                        className="quiz-action-button p-1 text-sm rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                        title={language === 'ja' ? '共有' : 'Share'}
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => openEditModal(quizSet)}
                        className="quiz-action-button p-1 text-sm rounded"
                        title="編集"
                      >
                        {t[currentLang].buttons.edit}
                      </button>
                      <button
                        onClick={() => deleteQuizSet(quizSet.id!)}
                        className="p-1 text-red-500 hover:text-red-700 text-sm"
                        title="削除"
                      >
                        {t[currentLang].buttons.delete}
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
                      <span className="text-gray-600 dark:text-gray-300">{t[currentLang].quizSetList.problemCount}:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{quizSet.problemCount}{t[currentLang].quizSetList.problems}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{t[currentLang].quizSetList.category}:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{quizSet.categories.length}{t[currentLang].quizSetList.categories}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{t[currentLang].quizSetList.createdDate}:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{quizSet.createdDate}</span>
                    </div>
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
      </div>

      {/* 編集モーダル */}
      {isEditModalOpen && editingQuizSet && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={closeEditModal}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '800px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '16px'
            }}>
              {t[currentLang].modals.editTitle}
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {t[currentLang].modals.nameRequired}
              </label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder={t[currentLang].modals.namePlaceholder}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {t[currentLang].modals.descriptionLabel}
              </label>
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '80px',
                  boxSizing: 'border-box'
                }}
                placeholder={t[currentLang].modals.descriptionPlaceholder}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {t[currentLang].modals.problemSelection} ({selectedProblems.size}{t[currentLang].modals.problemsSelected})
              </label>
              
              {/* カテゴリ別問題選択 */}
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '16px'
              }}>
                {allCategories.map(category => {
                  const categoryProblems = availableProblems.filter(p => p.category === category);
                  const selectedInCategory = categoryProblems.filter(p => p.id && selectedProblems.has(p.id)).length;
                  
                  return (
                    <div key={category} style={{
                      marginBottom: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '500',
                          color: '#111827',
                          margin: 0
                        }}>
                          {category} ({selectedInCategory}/{categoryProblems.length})
                        </h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => selectAllProblemsInCategory(category)}
                            className="quiz-action-button"
                            style={{
                              padding: '4px 8px',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            {t[currentLang].buttons.selectAll}
                          </button>
                          <button
                            onClick={() => deselectAllProblemsInCategory(category)}
                            className="quiz-action-button"
                            style={{
                              padding: '4px 8px',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            {t[currentLang].buttons.deselectAll}
                          </button>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gap: '8px',
                        maxHeight: '150px',
                        overflowY: 'auto'
                      }}>
                        {categoryProblems.map(problem => (
                          <label 
                            key={problem.id} 
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '8px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={problem.id ? selectedProblems.has(problem.id) : false}
                              onChange={() => problem.id && toggleProblemSelection(problem.id)}
                              style={{ marginTop: '2px' }}
                            />
                            <span style={{
                              fontSize: '14px',
                              color: '#374151',
                              lineHeight: '1.4'
                            }}>
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
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={closeEditModal}
                className="quiz-action-button"
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {t[currentLang].buttons.cancel}
              </button>
              <button
                onClick={saveQuizSet}
                className="quiz-action-button"
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {t[currentLang].buttons.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規作成モーダル */}
      {isCreateModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={closeCreateModal}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '800px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '16px'
            }}>
              {t[currentLang].modals.createTitle}
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {t[currentLang].modals.nameRequired}
              </label>
              <input
                type="text"
                value={createFormData.name}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder={t[currentLang].modals.namePlaceholder}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {t[currentLang].modals.descriptionLabel}
              </label>
              <textarea
                value={createFormData.description}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '80px',
                  boxSizing: 'border-box'
                }}
                placeholder={t[currentLang].modals.descriptionPlaceholder}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {t[currentLang].modals.problemSelection} ({createSelectedProblems.size}{t[currentLang].modals.problemsSelected})
              </label>
              
              {/* カテゴリ別問題選択 */}
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '16px'
              }}>
                {allCategories.map(category => {
                  const categoryProblems = availableProblems.filter(p => p.category === category);
                  const selectedInCategory = categoryProblems.filter(p => p.id && createSelectedProblems.has(p.id)).length;
                  
                  return (
                    <div key={category} style={{
                      marginBottom: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '500',
                          color: '#111827',
                          margin: 0
                        }}>
                          {category} ({selectedInCategory}/{categoryProblems.length})
                        </h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => selectAllProblemsInCategoryForCreate(category)}
                            className="quiz-action-button"
                            style={{
                              padding: '4px 8px',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            {t[currentLang].buttons.selectAll}
                          </button>
                          <button
                            onClick={() => deselectAllProblemsInCategoryForCreate(category)}
                            className="quiz-action-button"
                            style={{
                              padding: '4px 8px',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            {t[currentLang].buttons.deselectAll}
                          </button>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gap: '8px',
                        maxHeight: '150px',
                        overflowY: 'auto'
                      }}>
                        {categoryProblems.map(problem => (
                          <label 
                            key={problem.id} 
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '8px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={problem.id ? createSelectedProblems.has(problem.id) : false}
                              onChange={() => problem.id && toggleCreateProblemSelection(problem.id)}
                              style={{ marginTop: '2px' }}
                            />
                            <span style={{
                              fontSize: '14px',
                              color: '#374151',
                              lineHeight: '1.4'
                            }}>
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
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={closeCreateModal}
                className="quiz-action-button"
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {t[currentLang].buttons.cancel}
              </button>
              <button
                onClick={createQuizSet}
                className="quiz-action-button"
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {t[currentLang].modals.createButtonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}