import { useState, useEffect } from 'react';
import { quizSetService, problemService, categoryService } from '../lib/database';
import type { QuizSet, Problem } from '../types';

interface QuizSetManagerProps {
  onBack: () => void;
  onStartQuiz?: (quizSetId: number) => void;
  onStartCategoryQuiz?: (quizSetId: number, category: string) => void;
}

interface ExtendedQuizSet extends QuizSet {
  problemCount: number;
  categories: string[];
  createdDate: string;
  updatedDate: string;
}

export function QuizSetManager({ onBack }: QuizSetManagerProps) {
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
  
  // 一括追加モーダル（新しい問題作成用）
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [bulkAddQuizSet, setBulkAddQuizSet] = useState<QuizSet | null>(null);
  const [newProblems, setNewProblems] = useState<Array<{
    category: string;
    question: string;
    type: 'true-false' | 'multiple-choice';
    answer?: boolean;
    options?: string[];
    correctAnswer?: number;
    explanation: string;
  }>>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'manual' | 'file'>('manual');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseMessage, setParseMessage] = useState<string>('');

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
        bulkAdd: '📥 問題を追加',
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
        bulkAddTitle: '新しい問題を作成して追加',
        bulkAddDescription: 'に新しい問題を作成して追加',
        nameLabel: '問題集名',
        nameRequired: '問題集名 *',
        namePlaceholder: '問題集名を入力...',
        descriptionLabel: '説明',
        descriptionPlaceholder: '問題集の説明を入力...',
        problemSelection: '問題選択',
        problemsSelected: '問選択中',
        availableProblems: '追加可能な問題',
        createButtonText: '作成',
        addSelectedText: '選択した問題を追加',
        addNewProblem: '新しい問題を追加',
        problemForm: '問題作成フォーム',
        fileUploadTab: 'ファイルから一括追加',
        manualCreateTab: '手動作成',
        uploadFile: 'ファイルをアップロード',
        uploadDescription: 'CSV または JSON ファイルから問題を一括追加できます',
        fileFormats: 'サポート形式: .csv, .json',
        csvFormat: 'CSV形式',
        jsonFormat: 'JSON形式',
        downloadTemplate: 'テンプレートをダウンロード',
        parseFile: 'ファイルを解析',
        fileParseSuccess: '個の問題を読み込みました',
        fileParseError: 'ファイルの解析に失敗しました',
        questionLabel: '問題文',
        questionPlaceholder: '問題文を入力...',
        categoryLabel: 'カテゴリ',
        typeLabel: '問題タイプ',
        trueFalse: '○×問題',
        multipleChoice: '選択問題',
        answerLabel: '正解',
        optionsLabel: '選択肢',
        explanationLabel: '解説',
        explanationPlaceholder: '解説を入力...',
        addOption: '選択肢を追加',
        removeOption: '削除',
        createProblems: '問題を作成して追加',
        problemCount: '問題'
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
        createSampleData: '🌟 サンプルデータを作成',
        bulkAddSuccess: '個の問題を追加しました',
        bulkAddError: '問題の追加に失敗しました',
        noAvailableProblems: '追加可能な問題がありません'
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
        bulkAdd: '📥 Add Problems',
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
        bulkAddTitle: 'Create and Add New Problems',
        bulkAddDescription: 'Create new problems for',
        nameLabel: 'Quiz Set Name',
        nameRequired: 'Quiz Set Name *',
        namePlaceholder: 'Enter quiz set name...',
        descriptionLabel: 'Description',
        descriptionPlaceholder: 'Enter quiz set description...',
        problemSelection: 'Problem Selection',
        problemsSelected: 'problems selected',
        availableProblems: 'Available Problems',
        createButtonText: 'Create',
        addSelectedText: 'Add Selected Problems',
        addNewProblem: 'Add New Problem',
        problemForm: 'Problem Creation Form',
        fileUploadTab: 'Bulk Upload from File',
        manualCreateTab: 'Manual Creation',
        uploadFile: 'Upload File',
        uploadDescription: 'Bulk add problems from CSV or JSON files',
        fileFormats: 'Supported formats: .csv, .json',
        csvFormat: 'CSV Format',
        jsonFormat: 'JSON Format',
        downloadTemplate: 'Download Template',
        parseFile: 'Parse File',
        fileParseSuccess: 'problems loaded successfully',
        fileParseError: 'Failed to parse file',
        questionLabel: 'Question',
        questionPlaceholder: 'Enter question...',
        categoryLabel: 'Category',
        typeLabel: 'Problem Type',
        trueFalse: 'True/False',
        multipleChoice: 'Multiple Choice',
        answerLabel: 'Answer',
        optionsLabel: 'Options',
        explanationLabel: 'Explanation',
        explanationPlaceholder: 'Enter explanation...',
        addOption: 'Add Option',
        removeOption: 'Remove',
        createProblems: 'Create and Add Problems',
        problemCount: 'problems'
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
        createSampleData: '🌟 Create Sample Data',
        bulkAddSuccess: 'problems added successfully',
        bulkAddError: 'Failed to add problems',
        noAvailableProblems: 'No problems available to add'
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

  // 新しい問題作成・一括追加関数
  const openBulkAddModal = async (quizSet: ExtendedQuizSet) => {
    console.log('openBulkAddModal called with:', quizSet);
    
    setBulkAddQuizSet(quizSet);
    // 最初の問題のテンプレートを作成
    setNewProblems([{
      category: '',
      question: '',
      type: 'true-false',
      answer: true,
      explanation: ''
    }]);
    setCurrentProblemIndex(0);
    setIsBulkAddModalOpen(true);
    
    console.log('Modal should now be open for creating new problems');
  };

  const closeBulkAddModal = () => {
    setIsBulkAddModalOpen(false);
    setBulkAddQuizSet(null);
    setNewProblems([]);
    setCurrentProblemIndex(0);
    setActiveTab('manual');
    setUploadedFile(null);
    setParseMessage('');
  };

  // 新しい問題を追加
  const addNewProblem = () => {
    setNewProblems(prev => [...prev, {
      category: '',
      question: '',
      type: 'true-false',
      answer: true,
      explanation: ''
    }]);
  };

  // 問題を削除
  const removeProblem = (index: number) => {
    if (newProblems.length > 1) {
      setNewProblems(prev => prev.filter((_, i) => i !== index));
      if (currentProblemIndex >= newProblems.length - 1) {
        setCurrentProblemIndex(Math.max(0, newProblems.length - 2));
      }
    }
  };

  // 問題フィールドを更新
  const updateProblem = (index: number, field: string, value: any) => {
    setNewProblems(prev => prev.map((problem, i) => 
      i === index ? { ...problem, [field]: value } : problem
    ));
  };

  // 選択肢を追加
  const addOption = (problemIndex: number) => {
    const problem = newProblems[problemIndex];
    const options = problem.options || ['', ''];
    updateProblem(problemIndex, 'options', [...options, '']);
  };

  // 選択肢を削除
  const removeOption = (problemIndex: number, optionIndex: number) => {
    const problem = newProblems[problemIndex];
    const options = problem.options || [];
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== optionIndex);
      updateProblem(problemIndex, 'options', newOptions);
      // 正解インデックスを調整
      if (problem.correctAnswer !== undefined && problem.correctAnswer >= optionIndex) {
        updateProblem(problemIndex, 'correctAnswer', Math.max(0, problem.correctAnswer - 1));
      }
    }
  };

  // 問題を作成して問題集に追加
  const createAndAddProblems = async () => {
    if (!bulkAddQuizSet || newProblems.length === 0) {
      alert(t[currentLang].messages.selectAtLeastOne);
      return;
    }

    // 問題の検証
    const validProblems = newProblems.filter(problem => {
      if (!problem.category || !problem.question || !problem.explanation) {
        return false;
      }
      if (problem.type === 'multiple-choice') {
        return problem.options && problem.options.length >= 2 && 
               problem.options.every(opt => opt.trim()) &&
               problem.correctAnswer !== undefined;
      }
      return true;
    });

    if (validProblems.length === 0) {
      alert('有効な問題がありません。すべてのフィールドを入力してください。');
      return;
    }

    try {
      // 新しい問題をデータベースに保存
      const createdProblemIds: number[] = [];
      
      for (const problem of validProblems) {
        const problemData = {
          category: problem.category,
          question: problem.question,
          type: problem.type,
          explanation: problem.explanation,
          ...(problem.type === 'true-false' 
            ? { answer: problem.answer }
            : { 
                options: problem.options, 
                correctAnswer: problem.correctAnswer 
              }
          )
        };
        
        const problemId = await problemService.add(problemData);
        createdProblemIds.push(problemId);
        
        // カテゴリーも追加
        await categoryService.add(problem.category);
      }
      
      // 問題集を更新
      const currentProblemIds = bulkAddQuizSet.problemIds || [];
      const updatedQuizSet = {
        ...bulkAddQuizSet,
        problemIds: [...currentProblemIds, ...createdProblemIds],
        updatedAt: new Date()
      };
      
      await quizSetService.update(updatedQuizSet.id!, updatedQuizSet);
      await loadData();
      closeBulkAddModal();
      alert(`${validProblems.length}${t[currentLang].messages.bulkAddSuccess}`);
    } catch (error) {
      console.error('問題作成エラー:', error);
      alert(t[currentLang].messages.bulkAddError);
    }
  };

  // ファイル解析関数
  const parseUploadedFile = async (file: File) => {
    setParseMessage('');
    const fileName = file.name.toLowerCase();
    
    try {
      if (fileName.endsWith('.csv')) {
        await parseCSVFile(file);
      } else if (fileName.endsWith('.json')) {
        await parseJSONFile(file);
      } else {
        throw new Error('サポートされていないファイル形式です。CSV または JSON ファイルを選択してください。');
      }
    } catch (error) {
      console.error('ファイル解析エラー:', error);
      setParseMessage(t[currentLang].modals.fileParseError + ': ' + (error as Error).message);
    }
  };

  // CSV ファイル解析
  const parseCSVFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSVファイルにはヘッダー行とデータ行が必要です。');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const requiredHeaders = ['category', 'question', 'type', 'explanation'];
    
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`必要なカラムがありません: ${missingHeaders.join(', ')}`);
    }

    const problems = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = parseCSVLine(line);
      if (values.length !== headers.length) {
        console.warn(`行 ${i + 1}: カラム数が一致しません`);
        continue;
      }

      const problemData: any = {};
      headers.forEach((header, index) => {
        problemData[header] = values[index];
      });

      // 必要なフィールドの検証
      if (!problemData.category || !problemData.question || !problemData.type || !problemData.explanation) {
        console.warn(`行 ${i + 1}: 必要なフィールドが不足しています`);
        continue;
      }

      const problem: any = {
        category: problemData.category,
        question: problemData.question,
        type: problemData.type === 'multiple-choice' ? 'multiple-choice' : 'true-false',
        explanation: problemData.explanation
      };

      if (problem.type === 'true-false') {
        problem.answer = problemData.answer === 'true' || problemData.answer === '1' || problemData.answer === 'TRUE';
      } else if (problem.type === 'multiple-choice') {
        const options = [
          problemData.option1,
          problemData.option2,
          problemData.option3,
          problemData.option4
        ].filter(opt => opt && opt.trim());
        
        if (options.length < 2) {
          console.warn(`行 ${i + 1}: 多択問題には最低2つの選択肢が必要です`);
          continue;
        }

        problem.options = options;
        problem.correctAnswer = parseInt(problemData.correctAnswer || '0', 10);
        if (problem.correctAnswer >= options.length) {
          problem.correctAnswer = 0;
        }
      }

      problems.push(problem);
    }

    setNewProblems(problems);
    setCurrentProblemIndex(0);
    setParseMessage(`${problems.length}${t[currentLang].modals.fileParseSuccess}`);
  };

  // CSV行を解析（カンマ区切りでクォートを考慮）
  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  // JSON ファイル解析
  const parseJSONFile = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!Array.isArray(data)) {
      throw new Error('JSONファイルは問題の配列である必要があります。');
    }

    const problems = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      if (!item.category || !item.question || !item.type || !item.explanation) {
        console.warn(`問題 ${i + 1}: 必要なフィールドが不足しています`);
        continue;
      }

      const problem: any = {
        category: item.category,
        question: item.question,
        type: item.type === 'multiple-choice' ? 'multiple-choice' : 'true-false',
        explanation: item.explanation
      };

      if (problem.type === 'true-false') {
        problem.answer = Boolean(item.answer);
      } else if (problem.type === 'multiple-choice') {
        if (!Array.isArray(item.options) || item.options.length < 2) {
          console.warn(`問題 ${i + 1}: 多択問題には最低2つの選択肢が必要です`);
          continue;
        }
        problem.options = item.options;
        problem.correctAnswer = parseInt(item.correctAnswer || '0', 10);
        if (problem.correctAnswer >= item.options.length) {
          problem.correctAnswer = 0;
        }
      }

      problems.push(problem);
    }

    setNewProblems(problems);
    setCurrentProblemIndex(0);
    setParseMessage(`${problems.length}${t[currentLang].modals.fileParseSuccess}`);
  };

  // テンプレートファイルをダウンロード
  const downloadTemplate = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      const csvContent = [
        'category,question,type,answer,option1,option2,option3,option4,correctAnswer,explanation',
        'サンプル,これは真偽問題のサンプルです,true-false,true,,,,,,"これは真偽問題の解説です"',
        'サンプル,これは多択問題のサンプルです,multiple-choice,,選択肢1,選択肢2,選択肢3,選択肢4,0,"これは多択問題の解説です"'
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'quiz_template.csv';
      link.click();
    } else if (format === 'json') {
      const jsonContent = [
        {
          category: 'サンプル',
          question: 'これは真偽問題のサンプルです',
          type: 'true-false',
          answer: true,
          explanation: 'これは真偽問題の解説です'
        },
        {
          category: 'サンプル',
          question: 'これは多択問題のサンプルです',
          type: 'multiple-choice',
          options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
          correctAnswer: 0,
          explanation: 'これは多択問題の解説です'
        }
      ];
      
      const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'quiz_template.json';
      link.click();
    }
  };

  // ファイル選択のリセット
  const resetFileUpload = () => {
    setUploadedFile(null);
    setParseMessage('');
    setActiveTab('manual');
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t[currentLang].loading}</p>
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
                        onClick={() => openEditModal(quizSet)}
                        className="quiz-action-button p-1 text-sm rounded"
                        title="編集"
                      >
                        {t[currentLang].buttons.edit}
                      </button>
                      <button
                        onClick={() => openBulkAddModal(quizSet)}
                        className="quiz-action-button p-1 text-sm rounded bg-green-500 hover:bg-green-600"
                        title="問題を追加"
                      >
                        {t[currentLang].buttons.bulkAdd}
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

      {/* 一括追加モーダル */}
      {console.log('Rendering modal check, isBulkAddModalOpen:', isBulkAddModalOpen)}
      {isBulkAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
              {t[currentLang].modals.bulkAddTitle}
            </h3>
            
            {bulkAddQuizSet && (
              <p style={{ marginBottom: '16px', color: '#666' }}>
                {t[currentLang].modals.bulkAddDescription}「{bulkAddQuizSet.name}」
              </p>
            )}

            {/* タブ選択 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => setActiveTab('manual')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: activeTab === 'manual' ? '#3b82f6' : 'transparent',
                    color: activeTab === 'manual' ? 'white' : '#374151',
                    borderBottom: activeTab === 'manual' ? '2px solid #3b82f6' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  {t[currentLang].modals.manualCreateTab}
                </button>
                <button
                  onClick={() => setActiveTab('file')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: activeTab === 'file' ? '#3b82f6' : 'transparent',
                    color: activeTab === 'file' ? 'white' : '#374151',
                    borderBottom: activeTab === 'file' ? '2px solid #3b82f6' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  {t[currentLang].modals.fileUploadTab}
                </button>
              </div>
            </div>

            {/* ファイルアップロードタブ */}
            {activeTab === 'file' && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
                  {t[currentLang].modals.uploadDescription}
                </p>
                <p style={{ marginBottom: '16px', color: '#888', fontSize: '12px' }}>
                  {t[currentLang].modals.fileFormats}
                </p>

                {/* テンプレートダウンロード */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ marginBottom: '8px', fontWeight: '500' }}>{t[currentLang].modals.downloadTemplate}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => downloadTemplate('csv')}
                      className="quiz-action-button"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      {t[currentLang].modals.csvFormat}
                    </button>
                    <button
                      onClick={() => downloadTemplate('json')}
                      className="quiz-action-button"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      {t[currentLang].modals.jsonFormat}
                    </button>
                  </div>
                </div>

                {/* ファイルアップロード */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t[currentLang].modals.uploadFile}
                  </label>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadedFile(file);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '2px dashed #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: '#f9fafb'
                    }}
                  />
                </div>

                {uploadedFile && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ marginBottom: '8px', fontSize: '14px' }}>
                      選択ファイル: <strong>{uploadedFile.name}</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => parseUploadedFile(uploadedFile)}
                        className="quiz-action-button"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        {t[currentLang].modals.parseFile}
                      </button>
                      <button
                        onClick={() => {
                          setUploadedFile(null);
                          setParseMessage('');
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        リセット
                      </button>
                    </div>
                  </div>
                )}

                {parseMessage && (
                  <div style={{ 
                    padding: '8px 12px', 
                    marginBottom: '16px',
                    backgroundColor: parseMessage.includes('失敗') ? '#fee2e2' : '#dcfce7',
                    color: parseMessage.includes('失敗') ? '#dc2626' : '#16a34a',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    {parseMessage}
                  </div>
                )}
              </div>
            )}

{/* 手動問題作成フォーム */}
            {activeTab === 'manual' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                  {t[currentLang].modals.problemForm} ({newProblems.length} {t[currentLang].modals.problemCount})
                </h4>
                <button
                  onClick={addNewProblem}
                  className="quiz-action-button"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  {t[currentLang].modals.addNewProblem}
                </button>
              </div>

              {/* 問題ナビゲーション */}
              {newProblems.length > 1 && (
                <div style={{ marginBottom: '12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {newProblems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentProblemIndex(index)}
                      className={currentProblemIndex === index ? "quiz-action-button" : "glassmorphism"}
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '12px',
                        border: '1px solid #d1d5db'
                      }}
                    >
                      問題 {index + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* 現在の問題フォーム */}
              {newProblems[currentProblemIndex] && (
                <div style={{ 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px', 
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        {t[currentLang].modals.categoryLabel} *
                      </label>
                      <input
                        type="text"
                        value={newProblems[currentProblemIndex].category}
                        onChange={(e) => updateProblem(currentProblemIndex, 'category', e.target.value)}
                        placeholder="カテゴリを入力..."
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        {t[currentLang].modals.typeLabel}
                      </label>
                      <select
                        value={newProblems[currentProblemIndex].type}
                        onChange={(e) => {
                          const type = e.target.value as 'true-false' | 'multiple-choice';
                          updateProblem(currentProblemIndex, 'type', type);
                          if (type === 'multiple-choice') {
                            updateProblem(currentProblemIndex, 'options', ['', '']);
                            updateProblem(currentProblemIndex, 'correctAnswer', 0);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px'
                        }}
                      >
                        <option value="true-false">{t[currentLang].modals.trueFalse}</option>
                        <option value="multiple-choice">{t[currentLang].modals.multipleChoice}</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      {t[currentLang].modals.questionLabel} *
                    </label>
                    <textarea
                      value={newProblems[currentProblemIndex].question}
                      onChange={(e) => updateProblem(currentProblemIndex, 'question', e.target.value)}
                      placeholder={t[currentLang].modals.questionPlaceholder}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* 回答部分 */}
                  {newProblems[currentProblemIndex].type === 'true-false' ? (
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        {t[currentLang].modals.answerLabel}
                      </label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="radio"
                            name={`answer-${currentProblemIndex}`}
                            checked={newProblems[currentProblemIndex].answer === true}
                            onChange={() => updateProblem(currentProblemIndex, 'answer', true)}
                          />
                          ○（正しい）
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="radio"
                            name={`answer-${currentProblemIndex}`}
                            checked={newProblems[currentProblemIndex].answer === false}
                            onChange={() => updateProblem(currentProblemIndex, 'answer', false)}
                          />
                          ×（間違い）
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        {t[currentLang].modals.optionsLabel} *
                      </label>
                      {(newProblems[currentProblemIndex].options || []).map((option, optIndex) => (
                        <div key={optIndex} style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' }}>
                          <input
                            type="radio"
                            name={`correct-${currentProblemIndex}`}
                            checked={newProblems[currentProblemIndex].correctAnswer === optIndex}
                            onChange={() => updateProblem(currentProblemIndex, 'correctAnswer', optIndex)}
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(newProblems[currentProblemIndex].options || [])];
                              newOptions[optIndex] = e.target.value;
                              updateProblem(currentProblemIndex, 'options', newOptions);
                            }}
                            placeholder={`選択肢 ${optIndex + 1}`}
                            style={{
                              flex: 1,
                              padding: '6px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px'
                            }}
                          />
                          {(newProblems[currentProblemIndex].options || []).length > 2 && (
                            <button
                              onClick={() => removeOption(currentProblemIndex, optIndex)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            >
                              {t[currentLang].modals.removeOption}
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addOption(currentProblemIndex)}
                        className="quiz-action-button"
                        style={{ padding: '4px 8px', fontSize: '12px', marginTop: '4px' }}
                      >
                        {t[currentLang].modals.addOption}
                      </button>
                    </div>
                  )}

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      {t[currentLang].modals.explanationLabel} *
                    </label>
                    <textarea
                      value={newProblems[currentProblemIndex].explanation}
                      onChange={(e) => updateProblem(currentProblemIndex, 'explanation', e.target.value)}
                      placeholder={t[currentLang].modals.explanationPlaceholder}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* 問題削除ボタン */}
                  {newProblems.length > 1 && (
                    <div style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => removeProblem(currentProblemIndex)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        この問題を削除
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeBulkAddModal}
                className="glassmorphism"
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {t[currentLang].buttons.cancel}
              </button>
              <button
                onClick={createAndAddProblems}
                disabled={newProblems.length === 0}
                className="quiz-action-button"
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: newProblems.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: newProblems.length === 0 ? 0.5 : 1,
                  transition: 'background-color 0.2s'
                }}
              >
                {t[currentLang].modals.createProblems} ({newProblems.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}