import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { categoryService, problemService, quizSetService } from '../lib/database';
import type { Problem } from '../types';
import { CSVPreview } from './CSVPreview';
import { exportToCSV, downloadCSV, downloadTemplate, type ProblemCSV } from '../lib/csvUtils';
import { ProblemEditorGuide } from './ProblemEditorGuide';
import { useTags } from '../hooks/useTags';
import { TagManager } from './TagManager';
import { NoteEditor } from './NoteEditor';
import { actionHistoryService } from '../services/actionHistoryService';
import { UndoToast } from './UndoToast';
import { checkDuplicate, type DuplicateCheckResult } from '../lib/duplicateDetection';
import { DuplicateWarningModal } from './DuplicateWarningModal';
import { DuplicateResolveModal } from './DuplicateResolveModal';
import { SelectionManager } from '../lib/selectionManager';
import { BulkSelectionToolbar } from './BulkSelectionToolbar';
import { BulkActionModal } from './BulkActionModal';
import { KeyboardShortcutManager } from '../lib/keyboardShortcuts';
import { QuickActionMenu, type QuickAction } from './QuickActionMenu';
import { ShortcutHelpModal } from './ShortcutHelpModal';
import {
  Edit2,
  Copy,
  Trash2,
  Share2,
  Star
} from 'lucide-react';

interface ProblemEditorProps {
  onBack: () => void;
}

export function ProblemEditor({ onBack }: ProblemEditorProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Language state management
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');
  
  // フォーム状態
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    question: '',
    type: 'true-false' as 'true-false' | 'multiple-choice',
    answer: true,
    explanation: '',
    options: ['', ''],
    correctAnswer: 0,
    userNotes: '',
    noteTags: [] as string[],
    tags: [] as string[]
  });
  
  // フィルター状態
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  
  // カテゴリー管理状態
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // インポート・エクスポート状態
  const [csvText, setCsvText] = useState('');

  // 重複チェック状態（保存時）
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<DuplicateCheckResult | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [forceSave, setForceSave] = useState(false);

  // 問題一覧での重複検出状態
  const [duplicateProblemsMap, setDuplicateProblemsMap] = useState<Map<number, Problem[]>>(new Map());
  const [showDuplicateResolveModal, setShowDuplicateResolveModal] = useState(false);
  const [selectedDuplicateProblem, setSelectedDuplicateProblem] = useState<Problem | null>(null);
  const [showCsvFormat, setShowCsvFormat] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  
  // 問題集作成オプション
  const [createQuizSet, setCreateQuizSet] = useState(false);
  const [quizSetName, setQuizSetName] = useState('');

  // 問題詳細モーダルの状態
  const [showProblemDetailModal, setShowProblemDetailModal] = useState(false);
  const [selectedProblemDetail, setSelectedProblemDetail] = useState<Problem | null>(null);

  // CSV プレビュー状態
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<ProblemCSV[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [parsedProblems, setParsedProblems] = useState<Omit<Problem, 'id'>[]>([]);

  // ガイド表示状態
  const [showGuide, setShowGuide] = useState(false);

  // インポート・エクスポートヘルプの表示状態
  const [showImportHelp, setShowImportHelp] = useState(false);

  // 一括選択状態
  const [selectionManager] = useState(() => new SelectionManager());
  const [selectedCount, setSelectedCount] = useState(0);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [quizSets, setQuizSets] = useState<any[]>([]);

  // クイックアクションメニュー状態
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    problemId: number;
  } | null>(null);
  const [shortcutManager] = useState(() => new KeyboardShortcutManager());
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  // タッチ長押し用のref
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchPositionRef = useRef<{ x: number; y: number } | null>(null);

  // タグリフレッシュ用のフック
  const { refreshTags } = useTags();

  useEffect(() => {
    loadData();
  }, []);

  // 初回訪問時にガイドを表示
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('problemEditorGuideShown');
    if (!hasSeenGuide) {
      setShowGuide(true);
    }
  }, []);

  // Language change detection
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

  // Register keyboard shortcuts
  useEffect(() => {
    // Edit shortcut (E key)
    shortcutManager.register('edit', {
      key: 'e',
      description: language === 'ja' ? '選択した問題を編集' : 'Edit selected problem',
      category: language === 'ja' ? '編集操作' : 'Edit Operations',
      action: () => {
        const selected = selectionManager.getSelectedIds();
        if (selected.length === 1) {
          const problem = problems.find(p => p.id === selected[0]);
          if (problem) {
            handleEditProblem(problem);
          }
        } else if (contextMenu && contextMenu.problemId) {
          const problem = problems.find(p => p.id === contextMenu.problemId);
          if (problem) {
            handleEditProblem(problem);
          }
        }
      }
    });

    // Delete shortcut (Delete/Backspace key)
    shortcutManager.register('delete', {
      key: 'Delete',
      description: language === 'ja' ? '選択した問題を削除' : 'Delete selected problems',
      category: language === 'ja' ? '編集操作' : 'Edit Operations',
      action: () => {
        const selected = selectionManager.getSelectedIds();
        if (selected.length > 0) {
          selected.forEach(id => handleDeleteProblem(id));
        } else if (contextMenu && contextMenu.problemId) {
          handleDeleteProblem(contextMenu.problemId);
        }
      },
      preventDefault: true
    });

    // Duplicate shortcut (D key)
    shortcutManager.register('duplicate', {
      key: 'd',
      description: language === 'ja' ? '問題を複製' : 'Duplicate problem',
      category: language === 'ja' ? '編集操作' : 'Edit Operations',
      action: () => {
        if (contextMenu && contextMenu.problemId) {
          const problem = problems.find(p => p.id === contextMenu.problemId);
          if (problem) {
            handleDuplicateProblem(problem);
          }
        }
      }
    });

    // Help shortcut (? key)
    shortcutManager.register('help', {
      key: '?',
      shift: true,
      description: language === 'ja' ? 'ショートカットヘルプを表示' : 'Show keyboard shortcuts',
      category: language === 'ja' ? '表示操作' : 'View Operations',
      action: () => setShowShortcutHelp(true)
    });

    return () => {
      shortcutManager.destroy();
    };
  }, [language, problems, contextMenu, selectionManager]);

  // Translation objects
  const t = {
    ja: {
      loading: 'データを読み込み中...',
      pageTitle: '問題編集',
      buttons: {
        backToMenu: '← メインメニューに戻る',
        add: '追加',
        delete: '削除',
        save: '保存',
        update: '更新',
        clear: 'クリア',
        edit: '編集',
        import: 'テキストをインポート',
        export: 'CSV形式でエクスポート',
        generateCsv: 'テキストからCSV生成',
        showPrompts: 'AIツール用プロンプト表示',
        copyPrompt: 'プロンプトをコピー'
      },
      sections: {
        categoryManagement: '📂 カテゴリー管理',
        problemAdd: '✏️ 問題追加',
        problemEdit: '✏️ 問題編集',
        importExport: '📤 インポート・エクスポート',
        problemList: '📋 問題一覧'
      },
      labels: {
        newCategoryName: '新しいカテゴリー名',
        registeredCategories: '登録済みカテゴリー:',
        category: 'カテゴリー',
        selectCategory: 'カテゴリーを選択',
        problemType: '問題タイプ',
        trueFalse: '○×問題',
        multipleChoice: '多択問題',
        question: '問題文',
        questionPlaceholder: '問題文を入力...',
        answer: '答え',
        correct: '○ (正しい)',
        incorrect: '× (間違い)',
        options: '選択肢',
        optionPlaceholder: '選択肢',
        explanation: '解説',
        explanationPlaceholder: '解説を入力...',
        tableHeaders: {
          category: 'カテゴリー',
          question: '問題文',
          type: 'タイプ',
          actions: '操作'
        },
        multipleChoiceShort: '多択',
        trueFalseShort: '○×',
        allCategories: 'すべてのカテゴリー',
        searchPlaceholder: '問題文で検索...'
      },
      importExport: {
        createQuizSetOption: 'インポートした問題から問題集を作成する',
        quizSetNamePlaceholder: '問題集名を入力...',
        csvFileImport: 'CSVファイルからインポート',
        csvFormatDetails: 'CSVフォーマット詳細 (AIプロンプト例)',
        textToCsv: 'テキストからCSV生成',
        textToCsvDescription: '以下のテキストエリアに、指定のフォーマットでCSVデータを貼り付け、ファイルを生成・ダウンロード、またはインポートできます。',
        csvDataPlaceholder: 'CSVデータを貼り付け...'
      },
      messages: {
        confirmDeleteCategory: 'カテゴリー「{categoryName}」を削除しますか？',
        confirmDeleteProblem: 'この問題を削除しますか？',
        allFieldsRequired: 'すべての必須項目を入力してください',
        minimumTwoOptions: '選択肢は最低2つ必要です',
        problemsImported: '{count}件の問題をインポートしました',
        quizSetCreated: '\n問題集「{name}」も作成されました',
        csvImportError: 'CSVファイルの読み込みに失敗しました',
        csvDataRequired: 'CSVデータを入力してください',
        csvImportFailed: 'CSVデータの読み込みに失敗しました',
        noProblemsToExport: 'エクスポートする問題がありません',
        noProblemsFound: '問題が見つかりません',
        quizSetNameRequired: '問題集を作成する場合は問題集名を入力してください',
        csvFormatPrompt: `以下のテキスト群を、指定するCSVフォーマットに厳密に従って変換してください。

**入力テキスト:**
[ここに変換したい問題文のテキスト群を貼り付ける]

**出力CSVフォーマットのルール:**
1. **エンコーディング:** UTF-8
2. **1行目 (ヘッダー行):** 必ず以下の文字列のみを出力してください。
   category,question,answer,explanation,option1,option2,option3,option4
3. **2行目以降 (データ行):**
   - 各行は1つの問題を表し、必ず「カテゴリー」「問題文」「答え」「解説」「選択肢1-4」の8つのフィールドで構成
   - 各フィールドはカンマ (,) で区切る
   - 「カテゴリー」「問題文」「解説」「選択肢」は必ずダブルクォーテーション (") で囲む
   - ○×問題の場合：「答え」は TRUE または FALSE、選択肢は空文字列 ""
   - 多択問題の場合：「答え」は正解選択肢のインデックス (0,1,2,3)、選択肢は実際の選択肢文
   - フィールド内のダブルクォーテーションは2つ続けて ("") 表現

**出力例:**
"数学","1 + 1 = 2である","TRUE","基本的な算数です","","","",""
"歴史","日本の首都は？","0","日本の政治の中心地です","東京","大阪","京都","名古屋"`
      }
    },
    en: {
      loading: 'Loading data...',
      pageTitle: 'Problem Editor',
      buttons: {
        backToMenu: '← Back to Main Menu',
        add: 'Add',
        delete: 'Delete',
        save: 'Save',
        update: 'Update',
        clear: 'Clear',
        edit: 'Edit',
        import: 'Import Text',
        export: 'Export as CSV',
        generateCsv: 'Generate CSV from Text',
        showPrompts: 'Show AI Tool Prompts',
        copyPrompt: 'Copy Prompt'
      },
      sections: {
        categoryManagement: '📂 Category Management',
        problemAdd: '✏️ Add Problem',
        problemEdit: '✏️ Edit Problem',
        importExport: '📤 Import・Export',
        problemList: '📋 Problem List'
      },
      labels: {
        newCategoryName: 'New category name',
        registeredCategories: 'Registered Categories:',
        category: 'Category',
        selectCategory: 'Select Category',
        problemType: 'Problem Type',
        trueFalse: 'True/False',
        multipleChoice: 'Multiple Choice',
        question: 'Question',
        questionPlaceholder: 'Enter question...',
        answer: 'Answer',
        correct: '○ (Correct)',
        incorrect: '× (Incorrect)',
        options: 'Options',
        optionPlaceholder: 'Option',
        explanation: 'Explanation',
        explanationPlaceholder: 'Enter explanation...',
        tableHeaders: {
          category: 'Category',
          question: 'Question',
          type: 'Type',
          actions: 'Actions'
        },
        multipleChoiceShort: 'Multiple',
        trueFalseShort: '○×',
        allCategories: 'All Categories',
        searchPlaceholder: 'Search by question...'
      },
      importExport: {
        createQuizSetOption: 'Create quiz set from imported problems',
        quizSetNamePlaceholder: 'Enter quiz set name...',
        csvFileImport: 'Import from CSV File',
        csvFormatDetails: 'CSV Format Details (AI Prompt Example)',
        textToCsv: 'Generate CSV from Text',
        textToCsvDescription: 'Paste CSV data in the specified format in the text area below to generate files for download or import.',
        csvDataPlaceholder: 'Paste CSV data...'
      },
      messages: {
        confirmDeleteCategory: 'Delete category "{categoryName}"?',
        confirmDeleteProblem: 'Delete this problem?',
        allFieldsRequired: 'Please fill in all required fields',
        minimumTwoOptions: 'At least 2 options are required',
        problemsImported: '{count} problems imported',
        quizSetCreated: '\nQuiz set "{name}" was also created',
        csvImportError: 'Failed to read CSV file',
        csvDataRequired: 'Please enter CSV data',
        csvImportFailed: 'Failed to read CSV data',
        noProblemsToExport: 'No problems to export',
        noProblemsFound: 'No problems found',
        quizSetNameRequired: 'Please enter quiz set name when creating a quiz set',
        csvFormatPrompt: `Convert the following text group strictly according to the specified CSV format.

**Input Text:**
[Paste the text group you want to convert here]

**CSV Format Rules:**
1. **Encoding:** UTF-8
2. **Line 1 (Header):** Must output only the following string:
   category,question,answer,explanation,option1,option2,option3,option4
3. **Line 2 onwards (Data rows):**
   - Each row represents one problem and must consist of 8 fields: "Category", "Question", "Answer", "Explanation", "Options 1-4"
   - Fields are separated by commas (,)
   - "Category", "Question", "Explanation", "Options" must be enclosed in double quotes (")
   - For True/False questions: "Answer" is TRUE or FALSE, options are empty strings ""
   - For Multiple Choice questions: "Answer" is the correct option index (0,1,2,3), options are actual option text
   - Double quotes within fields are represented as two consecutive quotes ("")

**Output Example:**
"Math","1 + 1 = 2","TRUE","Basic arithmetic","","","",""
"History","What is the capital of Japan?","0","Political center of Japan","Tokyo","Osaka","Kyoto","Nagoya"`
      }
    }
  };

  const currentLang = language as keyof typeof t;

  const loadData = async () => {
    try {
      const [categoriesData, problemsData, quizSetsData] = await Promise.all([
        categoryService.getAll(),
        problemService.getAll(),
        quizSetService.getAll()
      ]);
      setCategories(categoriesData);
      setProblems(problemsData);
      setQuizSets(quizSetsData);

      // 重複検出は手動実行のみ（ボタンクリック時）
      // 自動実行は無効化しました（パフォーマンス改善のため）
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // バックグラウンドで重複を検出（UIをブロックしないようにする）
  const detectDuplicatesInBackground = (problemsData: Problem[]) => {
    console.log(`🔍 重複検出開始: ${problemsData.length}件の問題を検査中...`);
    toast.loading('重複問題を検出中...', { id: 'duplicate-detection' });

    setTimeout(async () => {
      try {
        const duplicatesMap = new Map<number, Problem[]>();

        for (const problem of problemsData) {
          if (!problem.id) continue;

          // この問題と重複している問題を検索
          const result = await checkDuplicate(problem.question, problem.id, 90);

          if (result.isDuplicate && result.duplicates.length > 0) {
            duplicatesMap.set(problem.id, result.duplicates);
            console.log(`⚠️ 重複発見: "${problem.question.substring(0, 30)}..." (類似度: ${result.similarity}%)`);
          }
        }

        setDuplicateProblemsMap(duplicatesMap);
        console.log(`✅ 重複検出完了: ${duplicatesMap.size}件の重複問題を発見`);
        toast.success(`重複検出完了: ${duplicatesMap.size}件の重複を発見`, { id: 'duplicate-detection' });
      } catch (error) {
        console.error('❌ 重複検出エラー:', error);
        toast.error('重複検出に失敗しました', { id: 'duplicate-detection' });
      }
    }, 100);
  };

  // useMemoでフィルタリングを最適化（再レンダリング時に不要な計算を防ぐ）
  const filteredProblems = useMemo(() => {
    let filtered = problems;

    if (categoryFilter) {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (searchFilter) {
      filtered = filtered.filter(p =>
        p.question.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    return filtered;
  }, [problems, categoryFilter, searchFilter]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      await categoryService.add(newCategoryName.trim());
      setCategories([...categories, newCategoryName.trim()]);
      setNewCategoryName('');
    } catch (error) {
      console.error('カテゴリー追加エラー:', error);
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    const confirmMessage = t[currentLang].messages.confirmDeleteCategory.replace('{categoryName}', categoryName);
    if (!confirm(confirmMessage)) return;
    
    try {
      await categoryService.delete(categoryName);
      setCategories(categories.filter(c => c !== categoryName));
    } catch (error) {
      console.error('カテゴリー削除エラー:', error);
    }
  };

  const handleSaveProblem = async () => {
    if (!formData.category || !formData.question || !formData.explanation) {
      alert(t[currentLang].messages.allFieldsRequired);
      return;
    }

    if (formData.type === 'multiple-choice') {
      const validOptions = formData.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        alert(t[currentLang].messages.minimumTwoOptions);
        return;
      }
    }

    // 重複チェック（forceSaveフラグが立っていない場合のみ）
    if (!forceSave) {
      const result = await checkDuplicate(
        formData.question,
        editingProblem?.id,
        90 // 類似度閾値90%
      );

      if (result.isDuplicate) {
        // 重複が検出された場合、警告モーダルを表示
        setDuplicateCheckResult(result);
        setShowDuplicateModal(true);
        return;
      }
    }

    // 重複チェックをパスした場合、または強制保存の場合
    try {
      let problemData: Omit<Problem, 'id'>;
      
      if (formData.type === 'true-false') {
        problemData = {
          category: formData.category,
          question: formData.question,
          type: formData.type,
          explanation: formData.explanation,
          answer: formData.answer
        };
      } else {
        problemData = {
          category: formData.category,
          question: formData.question,
          type: formData.type,
          explanation: formData.explanation,
          options: formData.options.filter(opt => opt.trim()),
          correctAnswer: formData.correctAnswer
        };
      }

      // メモフィールドとタグを追加
      const problemDataWithNotes = {
        ...problemData,
        userNotes: formData.userNotes,
        noteTags: formData.noteTags,
        noteUpdatedAt: formData.userNotes ? new Date() : undefined,
        tags: formData.tags,
        taggedAt: formData.tags.length > 0 ? new Date() : undefined
      };

      if (editingProblem?.id) {
        await problemService.update({ ...problemDataWithNotes, id: editingProblem.id });
      } else {
        await problemService.add(problemDataWithNotes);
      }

      await loadData();
      clearForm();

      // 保存後、強制保存フラグをリセット
      setForceSave(false);
    } catch (error) {
      console.error('問題保存エラー:', error);
      setForceSave(false);
    }
  };

  const handleEditProblem = (problem: Problem) => {
    setEditingProblem(problem);
    setFormData({
      category: problem.category,
      question: problem.question,
      type: problem.type || 'true-false',
      answer: problem.answer !== undefined ? problem.answer : true,
      explanation: problem.explanation,
      options: problem.options && problem.options.length > 0 ? problem.options : ['', ''],
      correctAnswer: problem.correctAnswer || 0,
      userNotes: problem.userNotes || '',
      noteTags: problem.noteTags || [],
      tags: problem.tags || []
    });

    // Scroll to the top of the page to show the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProblem = async (problemId: number) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    try {
      // アクション記録（ロールバック用）
      const actionId = actionHistoryService.recordAction('delete', 'problem', problem);

      // 削除実行
      await problemService.delete(problemId);
      await loadData();

      // カスタムトースト表示
      toast.custom((t) => (
        <UndoToast
          message={`問題「${problem.question.substring(0, 30)}...」を削除しました`}
          onUndo={async () => {
            try {
              await actionHistoryService.rollback(actionId);
              await loadData();
              toast.success('削除を取り消しました', { position: 'top-center' });
            } catch (error) {
              console.error('Rollback failed:', error);
              toast.error('元に戻せませんでした', { position: 'top-center' });
            }
          }}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ), {
        duration: 5000,
        position: 'bottom-center'
      });
    } catch (error) {
      console.error('問題削除エラー:', error);
      toast.error('削除に失敗しました', { position: 'top-center' });
    }
  };

  const handleDuplicateProblem = async (problem: Problem) => {
    try {
      // 問題のコピーを作成（IDを除く）
      const duplicatedProblem = {
        category: problem.category,
        question: problem.question + ' (コピー)',
        type: problem.type,
        answer: problem.answer,
        explanation: problem.explanation,
        options: problem.options,
        correctAnswer: problem.correctAnswer,
        userNotes: problem.userNotes,
        noteTags: problem.noteTags,
        tags: problem.tags
      };

      // アクション記録
      const actionId = actionHistoryService.recordAction('create', 'problem', duplicatedProblem);

      // 新規問題として追加
      await problemService.add(duplicatedProblem);
      await loadData();

      toast.custom((t) => (
        <UndoToast
          message={`問題を複製しました`}
          onUndo={async () => {
            try {
              await actionHistoryService.rollback(actionId);
              await loadData();
              toast.success('複製を取り消しました', { position: 'top-center' });
            } catch (error) {
              console.error('Rollback failed:', error);
              toast.error('元に戻せませんでした', { position: 'top-center' });
            }
          }}
          onDismiss={() => toast.dismiss(t.id)}
        />
      ), {
        duration: 5000,
        position: 'bottom-center'
      });
    } catch (error) {
      console.error('問題複製エラー:', error);
      toast.error('複製に失敗しました', { position: 'top-center' });
    }
  };

  // コンテキストメニューハンドラー
  const handleContextMenu = (event: React.MouseEvent, problemId: number) => {
    event.preventDefault();
    setContextMenu({
      position: { x: event.clientX, y: event.clientY },
      problemId
    });
  };

  // タッチ長押しハンドラー
  const handleTouchStart = (event: React.TouchEvent, problemId: number) => {
    const touch = event.touches[0];
    touchPositionRef.current = { x: touch.clientX, y: touch.clientY };

    // 1秒後にコンテキストメニューを表示
    longPressTimerRef.current = setTimeout(() => {
      if (touchPositionRef.current) {
        setContextMenu({
          position: touchPositionRef.current,
          problemId
        });
        // 振動フィードバック（対応デバイスのみ）
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
    }, 1000);
  };

  const handleTouchMove = () => {
    // タッチが移動したらタイマーをキャンセル
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    // タッチが終了したらタイマーをキャンセル
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchPositionRef.current = null;
  };

  // クイックアクション一覧を生成
  const getQuickActions = (problemId: number): QuickAction[] => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return [];

    const currentLang = language as 'ja' | 'en';

    return [
      {
        id: 'edit',
        label: currentLang === 'ja' ? '編集' : 'Edit',
        icon: Edit2,
        shortcut: 'E',
        action: () => handleEditProblem(problem)
      },
      {
        id: 'duplicate',
        label: currentLang === 'ja' ? '複製' : 'Duplicate',
        icon: Copy,
        shortcut: 'D',
        action: () => handleDuplicateProblem(problem)
      },
      {
        id: 'favorite',
        label: problem.isFavorite
          ? (currentLang === 'ja' ? 'お気に入り解除' : 'Unfavorite')
          : (currentLang === 'ja' ? 'お気に入り' : 'Favorite'),
        icon: Star,
        shortcut: 'F',
        color: problem.isFavorite ? 'warning' as const : 'default' as const,
        action: async () => {
          if (problem.id) {
            try {
              const updatedProblem = {
                ...problem,
                isFavorite: !problem.isFavorite
              };
              await problemService.update(updatedProblem);
              setProblems(problems.map(p => p.id === problem.id ? updatedProblem : p));
              toast.success(
                updatedProblem.isFavorite
                  ? (currentLang === 'ja' ? 'お気に入りに追加しました' : 'Added to favorites')
                  : (currentLang === 'ja' ? 'お気に入りから削除しました' : 'Removed from favorites'),
                { position: 'top-center' }
              );
            } catch (error) {
              console.error('Failed to toggle favorite:', error);
              toast.error(currentLang === 'ja' ? '更新に失敗しました' : 'Failed to update', { position: 'top-center' });
            }
          }
        }
      },
      {
        id: 'share',
        label: currentLang === 'ja' ? '共有' : 'Share',
        icon: Share2,
        shortcut: 'S',
        action: async () => {
          try {
            const shareText = `【問題】${problem.question}\n\n【カテゴリー】${problem.category}\n\n【解説】${problem.explanation || 'なし'}`;
            await navigator.clipboard.writeText(shareText);
            toast.success(currentLang === 'ja' ? 'クリップボードにコピーしました' : 'Copied to clipboard', { position: 'top-center' });
          } catch (error) {
            console.error('Failed to copy:', error);
            toast.error(currentLang === 'ja' ? 'コピーに失敗しました' : 'Failed to copy', { position: 'top-center' });
          }
        },
        divider: true
      },
      {
        id: 'delete',
        label: currentLang === 'ja' ? '削除' : 'Delete',
        icon: Trash2,
        shortcut: 'Del',
        color: 'danger' as const,
        action: () => {
          if (problem.id) {
            handleDeleteProblem(problem.id);
          }
        }
      }
    ];
  };

  // 一括選択関連の関数
  const handleSelectAll = () => {
    const problemIds = filteredProblems.map(p => p.id!).filter(id => id !== undefined);
    selectionManager.selectAll(problemIds);
    setSelectedCount(selectionManager.getSelectedCount());
  };

  const handleDeselectAll = () => {
    selectionManager.deselectAll();
    setSelectedCount(0);
  };

  const handleToggleSelection = (problemId: number) => {
    selectionManager.toggle(problemId);
    setSelectedCount(selectionManager.getSelectedCount());
  };

  const handleFilterSelect = (filter: any) => {
    selectionManager.selectByFilter(filteredProblems, filter);
    setSelectedCount(selectionManager.getSelectedCount());
  };

  const handleBulkActionComplete = async () => {
    selectionManager.deselectAll();
    setSelectedCount(0);
    await loadData();
  };

  const clearForm = () => {
    setEditingProblem(null);
    setFormData({
      category: '',
      question: '',
      type: 'true-false',
      answer: true,
      explanation: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      userNotes: '',
      noteTags: [],
      tags: []
    });
  };

  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('problemEditorGuideShown', 'true');
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 問題集作成オプションが有効で問題集名が空の場合はエラー
    if (createQuizSet && !quizSetName.trim()) {
      alert(t[currentLang].messages.quizSetNameRequired);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvData = e.target?.result as string;
        const addedCount = await parseCsvAndImport(csvData, createQuizSet, quizSetName);
        await loadData();
        
        let message = t[currentLang].messages.problemsImported.replace('{count}', addedCount.toString());
        if (createQuizSet && quizSetName.trim()) {
          message += t[currentLang].messages.quizSetCreated.replace('{name}', quizSetName.trim());
        }
        alert(message);
        
        // 問題集作成オプションをリセット
        setCreateQuizSet(false);
        setQuizSetName('');
      } catch (error) {
        console.error('CSVインポートエラー:', error);
        alert(t[currentLang].messages.csvImportError);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const parseCsvAndImport = async (csvData: string, createQuizSetOption: boolean = false, quizSetNameOption: string = '') => {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) throw new Error('CSVデータが不正です');

    // ヘッダー行をスキップ
    const dataLines = lines.slice(1);
    const addedProblemIds: number[] = [];
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      const values = parseCsvLine(line);
      if (values.length < 4) continue;

      const [category, question, answer, explanation, ...options] = values;
      
      // カテゴリーを自動追加
      try {
        await categoryService.add(category);
      } catch (error) {
        // カテゴリーが既に存在する場合は無視
      }

      let problemData: Omit<Problem, 'id'>;
      
      if (options.length > 0 && options.some(opt => opt.trim())) {
        // 多択問題
        const validOptions = options.filter(opt => opt.trim());
        const correctIndex = answer.toLowerCase() === 'true' ? 0 : 
                           !isNaN(Number(answer)) ? Number(answer) : 0;
        
        problemData = {
          category,
          question,
          type: 'multiple-choice',
          explanation,
          options: validOptions,
          correctAnswer: Math.min(correctIndex, validOptions.length - 1)
        };
      } else {
        // ○×問題
        problemData = {
          category,
          question,
          type: 'true-false',
          explanation,
          answer: answer.toLowerCase() === 'true'
        };
      }

      const problemId = await problemService.add(problemData);
      addedProblemIds.push(problemId);
    }

    // 問題集作成オプションが有効な場合、問題集を作成
    if (createQuizSetOption && quizSetNameOption.trim() && addedProblemIds.length > 0) {
      const quizSetData = {
        name: quizSetNameOption.trim(),
        problemIds: addedProblemIds,
        subjects: [], // 基本的な問題集では科目は空
        subjectMap: {} // 基本的な問題集では科目マップは空
      };
      
      await quizSetService.save(quizSetData);
    }

    return addedProblemIds.length;
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
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

  const handleCsvTextImport = async () => {
    alert('handleCsvTextImport関数が実行されました');
    console.log('handleCsvTextImport開始');
    
    if (!csvText.trim()) {
      alert(t[currentLang].messages.csvDataRequired);
      return;
    }

    // 問題集作成オプションが有効で問題集名が空の場合はエラー
    if (createQuizSet && !quizSetName.trim()) {
      alert(t[currentLang].messages.quizSetNameRequired);
      return;
    }

    try {
      let addedCount = 0;
      
      console.log('インポート開始 - テキスト長:', csvText.length);
      console.log('最初の200文字:', csvText.substring(0, 200));
      
      // CSVフォーマットかチェック（ヘッダー行があるか）
      if (csvText.includes('category,question,answer,explanation')) {
        console.log('CSVフォーマットとして処理');
        // すでにCSVフォーマットの場合
        addedCount = await parseCsvAndImport(csvText, createQuizSet, quizSetName);
      } else {
        console.log('テキストフォーマットとして処理');
        // テキストフォーマットの場合、まず解析してからインポート
        const quizData = parseTextToQuizData(csvText);
        
        console.log('解析結果:', quizData.length, '個の問題');
        console.log('解析されたデータ:', quizData);
        
        if (quizData.length === 0) {
          alert('有効な問題データが見つかりませんでした。フォーマットを確認してください。\n\nコンソールでデバッグ情報を確認してください。');
          return;
        }

        // 問題集を作成（必要な場合）
        let quizSetId: number | undefined;
        if (createQuizSet && quizSetName.trim()) {
          try {
            quizSetId = await quizSetService.save({
              name: quizSetName.trim(),
              description: `${quizData.length}個の問題を含む問題集`,
              problemIds: [],
              createdAt: new Date(),
              updatedAt: new Date()
            });
          } catch (error) {
            console.error('問題集作成エラー:', error);
          }
        }

        // 各問題をデータベースに追加
        console.log('データベース追加開始');
        for (let i = 0; i < quizData.length; i++) {
          const quiz = quizData[i];
          console.log(`問題 ${i + 1}/${quizData.length} を処理中:`, quiz);
          
          // カテゴリーを自動追加
          try {
            console.log('カテゴリー追加:', quiz.category);
            await categoryService.add(quiz.category);
          } catch (error) {
            console.log('カテゴリー追加エラー（既存の可能性）:', error);
          }

          // 多択問題かどうかを判定
          const isMultipleChoice = quiz.option1 || quiz.option2 || quiz.option3 || quiz.option4;
          
          const problemData: Omit<Problem, 'id'> = {
            category: quiz.category,
            question: quiz.question,
            type: isMultipleChoice ? 'multiple-choice' : 'true-false',
            answer: isMultipleChoice ? false : (quiz.answer === 'TRUE'),
            explanation: quiz.explanation,
            ...(isMultipleChoice && {
              options: [quiz.option1, quiz.option2, quiz.option3, quiz.option4].filter(opt => opt),
              correctAnswer: (parseInt(quiz.answer) - 1) || 0 // 1-indexed→0-indexedに変換
            })
          };

          console.log('問題データ:', problemData);

          try {
            const problemId = await problemService.add(problemData);
            console.log('問題追加成功 ID:', problemId);
            
            // 問題集に問題を追加
            if (quizSetId && problemId) {
              console.log('問題集に追加:', quizSetId, problemId);
              // 問題集の問題IDリストを更新
              const quizSet = await quizSetService.getById(quizSetId);
              if (quizSet) {
                quizSet.problemIds.push(problemId);
                await quizSetService.save(quizSet);
              }
            }
            
            addedCount++;
          } catch (error) {
            console.error('問題追加エラー:', error);
            console.error('エラーの詳細:', error);
          }
        }
        console.log('データベース追加完了, 追加数:', addedCount);
      }
      
      await loadData();
      setCsvText('');
      
      let message = t[currentLang].messages.problemsImported.replace('{count}', addedCount.toString());
      if (createQuizSet && quizSetName.trim()) {
        message += t[currentLang].messages.quizSetCreated.replace('{name}', quizSetName.trim());
      }
      alert(message);
      
      // 問題集作成オプションをリセット
      setCreateQuizSet(false);
      setQuizSetName('');
    } catch (error) {
      console.error('インポートエラー:', error);
      alert(t[currentLang].messages.csvImportFailed);
    }
  };

  const handleExportCsv = () => {
    // テキストエリアに内容がない場合はエラー
    if (!csvText.trim()) {
      alert('下のテキストエリアに問題データを入力してください。\n\n入力後に「CSV形式でエクスポート」ボタンを押すと、入力した問題のみがCSVファイルとしてエクスポートされます。');
      return;
    }

    // テキストエリアの内容を解析してエクスポート
    try {
      console.log('📝 Exporting from text area content');
      const quizData = parseTextToQuizData(csvText);

      if (quizData.length === 0) {
        alert('テキストエリアから有効な問題データが見つかりませんでした。フォーマットを確認してください。');
        return;
      }

      // クイズデータをProblem型に変換
      const problemsToExport: Problem[] = quizData.map(quiz => {
        const hasOptions = quiz.option1 || quiz.option2 || quiz.option3 || quiz.option4 || quiz.option5 || quiz.option6 || quiz.option7 || quiz.option8 || quiz.option9 || quiz.option10;
        const isMultipleChoice = Boolean(hasOptions);

        if (isMultipleChoice) {
          // 多択問題の場合: correctAnswerフィールドを使用
          // quiz.correctAnswerがある場合はそのまま（0-indexed）、なければanswerから変換
          const correctAnswerIndex = quiz.correctAnswer !== undefined
            ? quiz.correctAnswer
            : parseInt(quiz.answer) - 1; // 1-indexed→0-indexedに変換
          return {
            category: quiz.category,
            question: quiz.question,
            correctAnswer: correctAnswerIndex,
            explanation: quiz.explanation,
            options: [quiz.option1, quiz.option2, quiz.option3, quiz.option4, quiz.option5, quiz.option6, quiz.option7, quiz.option8, quiz.option9, quiz.option10].filter(opt => opt),
            type: 'multiple-choice' as const
          };
        } else {
          // ○×問題の場合: answerフィールドを使用
          return {
            category: quiz.category,
            question: quiz.question,
            answer: quiz.answer === 'TRUE',
            explanation: quiz.explanation,
            type: 'true-false' as const
          };
        }
      });

      // ファイル名を入力してもらう
      const defaultFilename = `minguella_problems_${new Date().toISOString().split('T')[0]}`;
      const userFilename = prompt('CSVファイル名を入力してください（拡張子なし）:', defaultFilename);

      // キャンセルされた場合は中止
      if (userFilename === null) {
        console.log('CSV export cancelled by user');
        return;
      }

      // ファイル名が空の場合はデフォルト名を使用
      const filename = (userFilename.trim() || defaultFilename) + '.csv';

      const csvContent = exportToCSV(problemsToExport);
      downloadCSV(csvContent, filename);
      alert(`${problemsToExport.length}個の問題を「${filename}」としてエクスポートしました`);
    } catch (error) {
      console.error('Export from text error:', error);
      alert('CSVエクスポートに失敗しました');
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplate();
    alert('CSVテンプレートをダウンロードしました');
  };

  const handleCsvPreview = () => {
    if (!csvText.trim()) {
      alert('テキストを入力してください');
      return;
    }

    console.log('=== Preview Debug ===');
    console.log('Text length:', csvText.length);
    console.log('First 200 chars:', csvText.substring(0, 200));

    try {
      // テキスト形式を解析
      const quizData = parseTextToQuizData(csvText);

      if (quizData.length === 0) {
        alert('有効な問題データが見つかりませんでした。フォーマットを確認してください。');
        return;
      }

      // ProblemCSV形式に変換
      const previewData: ProblemCSV[] = quizData.map(quiz => ({
        category: quiz.category,
        question: quiz.question,
        answer: quiz.answer,
        explanation: quiz.explanation,
        option1: quiz.option1 || '',
        option2: quiz.option2 || '',
        option3: quiz.option3 || '',
        option4: quiz.option4 || '',
        option5: quiz.option5 || '',
        option6: quiz.option6 || '',
        option7: quiz.option7 || '',
        option8: quiz.option8 || '',
        option9: quiz.option9 || '',
        option10: quiz.option10 || '',
        type: (quiz.option1 || quiz.option2 || quiz.option3 || quiz.option4 || quiz.option5 || quiz.option6 || quiz.option7 || quiz.option8 || quiz.option9 || quiz.option10) ? 'multiple-choice' : 'true-false'
      }));

      // Problem型に変換
      const problems: Omit<Problem, 'id'>[] = quizData.map(quiz => {
        const hasOptions = quiz.option1 || quiz.option2 || quiz.option3 || quiz.option4 || quiz.option5 || quiz.option6 || quiz.option7 || quiz.option8 || quiz.option9 || quiz.option10;
        const isMultipleChoice = Boolean(hasOptions);

        if (isMultipleChoice) {
          // 多択問題の場合: correctAnswerフィールドを使用
          // quiz.correctAnswerがある場合はそのまま（0-indexed）、なければanswerから変換
          const correctAnswerIndex = quiz.correctAnswer !== undefined
            ? quiz.correctAnswer
            : parseInt(quiz.answer) - 1; // 1-indexed→0-indexedに変換
          return {
            category: quiz.category,
            question: quiz.question,
            correctAnswer: correctAnswerIndex,
            explanation: quiz.explanation,
            options: [quiz.option1, quiz.option2, quiz.option3, quiz.option4, quiz.option5, quiz.option6, quiz.option7, quiz.option8, quiz.option9, quiz.option10].filter(opt => opt),
            type: 'multiple-choice' as const
          };
        } else {
          // ○×問題の場合: answerフィールドを使用
          return {
            category: quiz.category,
            question: quiz.question,
            answer: quiz.answer === 'TRUE',
            explanation: quiz.explanation,
            type: 'true-false' as const
          };
        }
      });

      console.log('Parse result:', {
        problemsCount: problems.length,
        previewCount: previewData.length
      });
      console.log('Preview data:', previewData);

      setCsvPreviewData(previewData);
      setCsvErrors([]);
      setCsvWarnings([]);
      setParsedProblems(problems);
      setShowCsvPreview(true);
    } catch (error) {
      console.error('Parse error:', error);
      alert(`データの解析中にエラーが発生しました: ${(error as Error).message}`);
    }
  };

  const handleConfirmImport = async () => {
    setShowCsvPreview(false);

    try {
      console.log('=== Import Start ===');
      console.log('Parsed problems count:', parsedProblems.length);
      console.log('Parsed problems:', parsedProblems);

      const addedProblemIds: number[] = [];

      for (let i = 0; i < parsedProblems.length; i++) {
        const problem = parsedProblems[i];
        console.log(`Processing problem ${i + 1}:`, problem);
        if (problem.options) {
          console.log(`  Options for problem ${i + 1}:`, problem.options);
        }

        // カテゴリーを自動追加
        try {
          await categoryService.add(problem.category);
        } catch (error) {
          // カテゴリーが既に存在する場合は無視
          console.log('Category add error (ignored):', error);
        }

        try {
          const problemId = await problemService.add(problem);
          addedProblemIds.push(problemId);
          console.log(`Problem ${i + 1} added with ID:`, problemId);
        } catch (error) {
          console.error(`Failed to add problem ${i + 1}:`, error);
          console.error('Error message:', (error as Error).message);
          console.error('Error details:', error);
          throw error;
        }
      }

      // 問題集作成オプション
      if (createQuizSet && quizSetName.trim() && addedProblemIds.length > 0) {
        const quizSetData = {
          name: quizSetName.trim(),
          problemIds: addedProblemIds,
          subjects: [],
          subjectMap: {}
        };
        await quizSetService.save(quizSetData);
      }

      alert(`${addedProblemIds.length}個の問題をインポートしました${createQuizSet ? `\n問題集「${quizSetName}」を作成しました` : ''}`);
      setCsvText('');
      setQuizSetName('');
      setCreateQuizSet(false);
      await loadData();
    } catch (error) {
      console.error('Import error:', error);
      alert('インポート中にエラーが発生しました');
    }
  };

  // JSON形式からクイズデータへの変換
  // 対応する構造:
  //   1. { category, problems: [...] }
  //   2. { problems: [{ category, ... }, ...] }
  //   3. [ { category, problems: [...] }, ... ]  （複数カテゴリーの配列）
  //   4. [ { category, question, options, ... }, ... ]  （フラット）
  const parseJSONToQuizData = (jsonData: any) => {
    type QuizRow = {
      category: string;
      question: string;
      answer: string;
      explanation: string;
      correctAnswer?: number; // 追加: 0-indexedの正解インデックス
      option1: string;
      option2: string;
      option3: string;
      option4: string;
      option5: string;
      option6: string;
      option7: string;
      option8: string;
      option9: string;
      option10: string;
    };
    const quizData: QuizRow[] = [];

    if (!jsonData) {
      throw new Error('Invalid JSON structure');
    }

    // 配列ルートの場合: 再帰的に各要素を処理
    if (Array.isArray(jsonData)) {
      jsonData.forEach((entry) => {
        quizData.push(...parseJSONToQuizData(entry));
      });
      return quizData;
    }

    if (typeof jsonData !== 'object') {
      throw new Error('Invalid JSON structure');
    }

    // ルートにcategoryがあれば全体のデフォルトとして使う
    const rootCategory: string = (jsonData.category && typeof jsonData.category === 'string')
      ? jsonData.category
      : '';

    // problems配列がある場合（構造1または2）
    if (Array.isArray(jsonData.problems)) {
      jsonData.problems.forEach((problem: any, index: number) => {
        if (!problem || !problem.question || !Array.isArray(problem.options) || typeof problem.correctAnswer !== 'number') {
          console.warn(`Problem ${index + 1} has invalid structure, skipping`);
          return;
        }

        // 選択肢を10個の配列に展開
        const options = ['', '', '', '', '', '', '', '', '', ''];
        for (let i = 0; i < Math.min(problem.options.length, 10); i++) {
          options[i] = problem.options[i] || '';
        }

        // correctAnswerを1-indexedの文字列に変換（0 → "1", 1 → "2", etc.）
        const answerIndex = problem.correctAnswer + 1;

        // 個別problem.categoryを優先、なければrootCategoryを使う
        const resolvedCategory: string =
          (problem.category && typeof problem.category === 'string' && problem.category.trim())
            ? problem.category.trim()
            : (rootCategory || 'その他');

        quizData.push({
          category: resolvedCategory,
          question: problem.question,
          answer: answerIndex.toString(),
          correctAnswer: problem.correctAnswer, // 追加: 0-indexedの正解インデックスを保持
          explanation: problem.explanation || '',
          option1: options[0],
          option2: options[1],
          option3: options[2],
          option4: options[3],
          option5: options[4],
          option6: options[5],
          option7: options[6],
          option8: options[7],
          option9: options[8],
          option10: options[9],
        });
      });
      return quizData;
    }

    // problems配列がなく、ルートオブジェクトがそのまま問題 (構造4のフラット要素)
    if (jsonData.question && Array.isArray(jsonData.options) && typeof jsonData.correctAnswer === 'number') {
      const options = ['', '', '', '', '', '', '', '', '', ''];
      for (let i = 0; i < Math.min(jsonData.options.length, 10); i++) {
        options[i] = jsonData.options[i] || '';
      }
      const answerIndex = jsonData.correctAnswer + 1;
      quizData.push({
        category: (rootCategory && rootCategory.trim()) || 'その他',
        question: jsonData.question,
        answer: answerIndex.toString(),
        correctAnswer: jsonData.correctAnswer, // 追加: 0-indexedの正解インデックスを保持
        explanation: jsonData.explanation || '',
        option1: options[0],
        option2: options[1],
        option3: options[2],
        option4: options[3],
        option5: options[4],
        option6: options[5],
        option7: options[6],
        option8: options[7],
        option9: options[8],
        option10: options[9],
      });
      return quizData;
    }

    throw new Error('problems must be an array');
  };

  const parseTextToQuizData = (text: string) => {
    // JSON形式の検出と処理
    const trimmedText = text.trim();
    if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
      try {
        const jsonData = JSON.parse(trimmedText);
        return parseJSONToQuizData(jsonData);
      } catch (error) {
        console.error('JSON parsing error:', error);
        // JSON形式ではないか、無効なJSONの場合は通常のテキスト解析にフォールバック
      }
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const quizData: Array<{
      category: string;
      question: string;
      answer: string;
      explanation: string;
      option1: string;
      option2: string;
      option3: string;
      option4: string;
      option5: string;
      option6: string;
      option7: string;
      option8: string;
      option9: string;
      option10: string;
    }> = [];

    let currentCategory = '';
    let currentQuestion = '';
    let currentAnswer = '';
    let currentExplanation = '';
    let currentOptions: string[] = [];
    let inQuestion = false;
    let afterSeparator = false; // 区切り線直後かどうかのフラグ

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 区切り線を検出（次の行がカテゴリーの可能性）
      // アンダースコア/ハイフン/イコールが3つ以上、または空行が連続する場合
      if (line.match(/^_{3,}/) || line.match(/^-{3,}/) || line.match(/^={3,}/) || (line.trim() === '' && i > 0 && lines[i-1].trim() === '')) {
        // 前の問題を保存（区切り線前に）
        if (currentQuestion && currentAnswer !== '' && currentExplanation) {
          const options = ['', '', '', '', '', '', '', '', '', ''];
          for (let j = 0; j < Math.min(currentOptions.length, 10); j++) {
            options[j] = currentOptions[j];
          }

          quizData.push({
            category: currentCategory || 'その他',
            question: currentQuestion,
            answer: currentAnswer,
            explanation: currentExplanation,
            option1: options[0],
            option2: options[1],
            option3: options[2],
            option4: options[3],
            option5: options[4],
            option6: options[5],
            option7: options[6],
            option8: options[7],
            option9: options[8],
            option10: options[9]
          });
          
          // 問題データをリセット
          currentQuestion = '';
          currentAnswer = '';
          currentExplanation = '';
          currentOptions = [];
          inQuestion = false;
        }
        afterSeparator = true; // 区切り線直後フラグを設定
        continue;
      }
      
      // カテゴリー検出（区切り線直後 または 行頭の明確なパターン）
      const isExplicitCategoryPattern = line.match(/^第\d+章\s+.+/) ||
                                    line.match(/^Chapter\s+\d+/) ||
                                    line.match(/^[#]+\s*.+/) ||
                                    line.match(/^小テスト\d*[：:]\s*.+/) ||
                                    line.match(/^テスト\d*[：:]\s*.+/) ||
                                    line.match(/^Quiz\s*\d*[：:]\s*.+/) ||
                                    (line.match(/^\d+\.\s*.+/) && afterSeparator);

      // プロンプト生成テンプレート互換: 次の非空行が「問題N」なら、この行は
      // 単体のカテゴリー名（例: "数学", "臨床栄養学"）とみなす
      const nextLine = lines[i + 1];
      const isNextLineProblem = nextLine && (
        nextLine.match(/^問題\d+/) ||
        nextLine.match(/^Question\s*\d+/i)
      );
      const isPlainCategoryName = isNextLineProblem &&
        !line.match(/^問題/) &&
        !line.match(/^Question/i) &&
        !line.match(/^(10|[1-9])\.\s/) &&
        !line.match(/^[ABCDEFGHIJ]\.\s/) &&
        !line.match(/^[（(](10|[1-9])[）)]/) &&
        !line.startsWith('正解') &&
        !line.startsWith('答え') &&
        !line.startsWith('Answer') &&
        !line.startsWith('解説') &&
        !line.startsWith('説明') &&
        !line.startsWith('Explanation') &&
        !line.match(/^_{3,}/) &&
        !line.match(/^-{3,}/) &&
        !line.match(/^={3,}/) &&
        line.length > 0 &&
        line.length <= 100; // カテゴリー名は短い想定

      const isClearCategoryPattern = isExplicitCategoryPattern || isPlainCategoryName;

      if (isClearCategoryPattern && (afterSeparator || i === 0 || lines[i-1].trim() === '' || isPlainCategoryName)) {
        // 前の問題を保存（カテゴリー変更前に）
        if (currentQuestion && currentAnswer !== '' && currentExplanation) {
          const options = ['', '', '', '', '', '', '', '', '', ''];
          for (let j = 0; j < Math.min(currentOptions.length, 10); j++) {
            options[j] = currentOptions[j];
          }

          quizData.push({
            category: currentCategory || 'その他',
            question: currentQuestion,
            answer: currentAnswer,
            explanation: currentExplanation,
            option1: options[0],
            option2: options[1],
            option3: options[2],
            option4: options[3],
            option5: options[4],
            option6: options[5],
            option7: options[6],
            option8: options[7],
            option9: options[8],
            option10: options[9]
          });
        }
        
        // 新しいカテゴリーを設定
        currentCategory = line.replace(/^[#]+\s*/, '')
                             .replace(/^第\d+章\s+/, '')
                             .replace(/^Chapter\s+\d+\s*/, '')
                             .replace(/^小テスト\d*[：:]\s*/, '')
                             .replace(/^テスト\d*[：:]\s*/, '')
                             .replace(/^Quiz\s*\d*[：:]\s*/, '')
                             .replace(/^\d+\.\s*/, '');
        
        // 問題データをリセット
        currentQuestion = '';
        currentAnswer = '';
        currentExplanation = '';
        currentOptions = [];
        inQuestion = false;
        afterSeparator = false; // フラグをリセット
        continue;
      }
      
      // 区切り線直後でない場合はフラグをリセット
      if (afterSeparator && line.trim() !== '') {
        afterSeparator = false;
      }
      
      // 問題番号検出
      if (line.match(/^問題\d+/) || line.match(/^Question\s*\d+/) || line.match(/^\d+\)/)) {
        if (currentQuestion && currentAnswer !== '' && currentExplanation) {
          // 前の問題を保存
          const options = ['', '', '', '', '', '', '', '', '', ''];
          for (let j = 0; j < Math.min(currentOptions.length, 10); j++) {
            options[j] = currentOptions[j];
          }

          quizData.push({
            category: currentCategory || 'その他',
            question: currentQuestion,
            answer: currentAnswer,
            explanation: currentExplanation,
            option1: options[0],
            option2: options[1],
            option3: options[2],
            option4: options[3],
            option5: options[4],
            option6: options[5],
            option7: options[6],
            option8: options[7],
            option9: options[8],
            option10: options[9]
          });
        }
        // 新しい問題の開始
        currentQuestion = '';
        currentAnswer = '';
        currentExplanation = '';
        currentOptions = [];
        inQuestion = true;
        continue;
      }
      
      // 選択肢検出（1～10対応）
      if (line.match(/^(10|[1-9])\.\s+.+/) || line.match(/^[ABCDEFGHIJ]\.\s+.+/) || line.match(/^[（(](10|[1-9])[）)]\s+.+/)) {
        const optionText = line.replace(/^(10|[1-9]|[ABCDEFGHIJ]|[（(](10|[1-9])[）)])\.\s*/, '').replace(/^[（(](10|[1-9])[）)]\s*/, '').trim();
        currentOptions.push(optionText);
        inQuestion = false;
        continue;
      }

      // 正解検出
      if (line.startsWith('正解：') || line.startsWith('Answer:') || line.startsWith('答え：')) {
        const answerText = line.replace(/^(正解：|Answer:|答え：)/, '').trim();
        if (answerText === '○' || answerText.toLowerCase() === 'true' || answerText === 'T') {
          currentAnswer = 'TRUE';
        } else if (answerText === '×' || answerText.toLowerCase() === 'false' || answerText === 'F') {
          currentAnswer = 'FALSE';
        } else {
          // 数字の場合（多択問題）
          const numAnswer = parseInt(answerText);
          if (!isNaN(numAnswer) && numAnswer >= 1 && numAnswer <= 10) {
            currentAnswer = (numAnswer - 1).toString(); // 0-indexedに変換
          } else {
            currentAnswer = answerText;
          }
        }
        inQuestion = false;
        continue;
      }
      
      // 解説検出
      if (line.startsWith('解説：') || line.startsWith('Explanation:') || line.startsWith('説明：')) {
        currentExplanation = line.replace(/^(解説：|Explanation:|説明：)/, '').trim();
        continue;
      }
      
      // 問題文の続き
      if (inQuestion) {
        currentQuestion += (currentQuestion ? ' ' : '') + line;
      }
      // 解説の続き（問題番号やカテゴリーでなければ解説の続き）
      else if (currentExplanation && !line.startsWith('問題') && !line.startsWith('Question') && !line.match(/^\d+\)/) && !isClearCategoryPattern) {
        currentExplanation += ' ' + line;
      }
    }
    
    // 最後の問題を保存
    if (currentQuestion && currentAnswer !== '' && currentExplanation) {
      const options = ['', '', '', '', '', '', '', '', '', ''];
      for (let j = 0; j < Math.min(currentOptions.length, 10); j++) {
        options[j] = currentOptions[j];
      }

      quizData.push({
        category: currentCategory || 'その他',
        question: currentQuestion,
        answer: currentAnswer,
        explanation: currentExplanation,
        option1: options[0],
        option2: options[1],
        option3: options[2],
        option4: options[3],
        option5: options[4],
        option6: options[5],
        option7: options[6],
        option8: options[7],
        option9: options[8],
        option10: options[9]
      });
    }
    
    return quizData;
  };

  const generateCsvFromText = () => {
    if (!csvText.trim()) {
      alert(t[currentLang].messages.csvDataRequired);
      return;
    }

    // テキストを解析してクイズデータに変換
    const quizData = parseTextToQuizData(csvText);
    
    if (quizData.length === 0) {
      alert('有効な問題データが見つかりませんでした。フォーマットを確認してください。');
      return;
    }

    // CSVフォーマットに変換
    const csvHeader = 'category,question,answer,explanation,option1,option2,option3,option4,option5,option6,option7,option8,option9,option10\n';
    const csvRows = quizData.map(quiz => {
      const category = `"${quiz.category.replace(/"/g, '""')}"`;
      const question = `"${quiz.question.replace(/"/g, '""')}"`;
      const answer = quiz.answer;
      const explanation = `"${quiz.explanation.replace(/"/g, '""')}"`;
      const option1 = `"${quiz.option1.replace(/"/g, '""')}"`;
      const option2 = `"${quiz.option2.replace(/"/g, '""')}"`;
      const option3 = `"${quiz.option3.replace(/"/g, '""')}"`;
      const option4 = `"${quiz.option4.replace(/"/g, '""')}"`;
      const option5 = `"${quiz.option5.replace(/"/g, '""')}"`;
      const option6 = `"${quiz.option6.replace(/"/g, '""')}"`;
      const option7 = `"${quiz.option7.replace(/"/g, '""')}"`;
      const option8 = `"${quiz.option8.replace(/"/g, '""')}"`;
      const option9 = `"${quiz.option9.replace(/"/g, '""')}"`;
      const option10 = `"${quiz.option10.replace(/"/g, '""')}"`;

      return `${category},${question},${answer},${explanation},${option1},${option2},${option3},${option4},${option5},${option6},${option7},${option8},${option9},${option10}`;
    });

    // ファイル名を入力してもらう
    const defaultFilename = `generated_problems_${new Date().toISOString().split('T')[0]}`;
    const userFilename = prompt('CSVファイル名を入力してください（拡張子なし）:', defaultFilename);

    // キャンセルされた場合は中止
    if (userFilename === null) {
      console.log('CSV generation cancelled by user');
      return;
    }

    // ファイル名が空の場合はデフォルト名を使用
    const filename = (userFilename.trim() || defaultFilename) + '.csv';

    const csvContent = csvHeader + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    alert(`${quizData.length}個の問題を「${filename}」として変換しました。`);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${type}プロンプトをクリップボードにコピーしました。`);
    }).catch(() => {
      alert('コピーに失敗しました。手動でコピーしてください。');
    });
  };

  const trueFalsePrompt = `以下のテキストを、クイズアプリで読み込める標準フォーマットに変換してください。

**重要な変換ルール:**
1. 各問題の最後に必ず区切り線（アンダースコア40個）を追加
2. 章タイトルの前に区切り線は不要
3. 問題番号は必ず単独行に
4. 正解は「正解：○」または「正解：×」の形式
5. 解説は「解説： 」で始める（コロンの後にスペース1個）
6. 不完全な問題や解説は修正・補完する

**出力フォーマット例:**
\`\`\`
第1章 骨格筋の筋収縮と運動能力
問題1
骨格筋は自分で動かすことができる随意筋で、運動神経によって支配されている。
正解：○
解説： 骨格筋は意識的に動かすことができる随意筋で、運動神経によって支配されています。これに対し、心筋と平滑筋は不随意筋で自律神経によって支配されます。
________________________________________
問題2
心筋と平滑筋は両方とも不随意筋で、自律神経によって支配されている。
正解：○
解説： 心筋と平滑筋は意識的にコントロールできない不随意筋です。心筋は心臓の拍動を、平滑筋は内臓の動きなどを制御し、どちらも自律神経によって支配されています。
________________________________________
第2章 エネルギー代謝
問題21
植物のデンプンと動物のグリコーゲンは、どちらも糖質の貯蔵形態である。
正解：○
解説： 植物はデンプンの形で、動物（人間含む）はグリコーゲンの形で糖質を貯蔵しています。どちらもグルコースが多数結合した多糖類です。
________________________________________
\`\`\`

**修正が必要な場合の対応:**
- 途中で切れた解説は適切に補完
- 問題文が不完全な場合は文脈から推測して完成
- 正解や解説が欠けている場合は追加
- 問題番号の連番を調整

提供されたテキストをこの形式で変換してください。区切り線を忘れずに各問題の最後に追加することが重要です。`;

  const multipleChoicePrompt = `以下のテキストを、クイズアプリで読み込める多択問題の標準フォーマットに変換してください。

**重要な変換ルール:**
1. 各問題の最後に必ず区切り線（アンダースコア40個）を追加
2. 問題番号は必ず単独行に
3. 正解は選択肢番号（1、2、3、4、5）で表記
4. 選択肢は「1. 」「2. 」「3. 」「4. 」「5. 」で始める
5. 解説は「解説： 」で始める（コロンの後にスペース1個）
6. 不完全な問題や解説は修正・補完する

**出力フォーマット例:**
\`\`\`
第1章 循環器疾患
問題1
心筋梗塞の主な原因はどれか。
1. 心房細動
2. 冠動脈の閉塞
3. 心室中隔欠損
4. 僧帽弁狭窄症
5. 大動脈弁閉鎖不全症
正解：2
解説： 心筋梗塞は冠動脈が血栓などで閉塞し、心筋への血流が遮断されることで起こります。冠動脈の閉塞が主な原因です。
________________________________________
問題2
高血圧の診断基準（成人）として正しいのはどれか。
1. 収縮期血圧130mmHg以上
2. 拡張期血圧80mmHg以上
3. 収縮期血圧140mmHg以上または拡張期血圧90mmHg以上
4. 収縮期血圧150mmHg以上
5. 拡張期血圧100mmHg以上
正解：3
解説： 成人の高血圧診断基準は、収縮期血圧140mmHg以上または拡張期血圧90mmHg以上です。これは日本高血圧学会のガイドラインに基づいています。
________________________________________
\`\`\`

**修正が必要な場合の対応:**
- 選択肢が不足している場合は適切に補完（最低4択、最大5択）
- 正解番号が不明な場合は内容から判断して設定
- 途中で切れた解説は適切に補完
- 問題文が不完全な場合は文脈から推測して完成

提供されたテキストをこの形式で変換してください。区切り線を忘れずに各問題の最後に追加することが重要です。`;

  const jsonFormatPrompt = `# クイズ問題作成指示（JSON形式）

以下の**JSON形式**に従って、クイズ問題を作成してください。

## 📋 JSON出力フォーマット（厳守）

\`\`\`json
{
  "category": "カテゴリ名",
  "problems": [
    {
      "question": "問題文",
      "options": [
        "選択肢1の内容",
        "選択肢2の内容",
        "選択肢3の内容",
        "選択肢4の内容",
        "選択肢5の内容"
      ],
      "correctAnswer": 2,
      "explanation": "1.(×) 選択肢1の解説\n2.(×) 選択肢2の解説\n3.(✓) 選択肢3の解説（正解）\n4.(×) 選択肢4の解説\n5.(×) 選択肢5の解説"
    }
  ]
}
\`\`\`

## ⚠️ 最重要ルール（必ず守ること）

### 1. correctAnswerは0始まりのインデックス番号
- **0** = options配列の最初の要素（選択肢1）
- **1** = options配列の2番目の要素（選択肢2）
- **2** = options配列の3番目の要素（選択肢3）
- **3** = options配列の4番目の要素（選択肢4）
- **4** = options配列の5番目の要素（選択肢5）

### 2. optionsは必ず正確に5要素の配列
- 要素数が4つ以下、または6つ以上は**エラー**になります
- 不足する場合は「該当なし」などで埋めてください

### 3. カテゴリーは必ず指定
- 空文字や省略は避けてください
- 例: "第1章 基礎知識"、"一般常識"、"歴史"など

### 4. explanationには全ての選択肢に対する解説を番号付きリスト形式で含める
- **形式**: 各選択肢を「番号.(マーク) 解説文」の形式で記載
  - 正解には **(✓)** を付ける
  - 不正解には **(×)** を付ける
  - 各選択肢は **改行（\\n）** で区切る
- **例**: \`"1.(×) 解説1\\n2.(✓) 解説2（正解）\\n3.(×) 解説3\\n4.(×) 解説4\\n5.(×) 解説5"\`
- **目的**: 学習者が各選択肢の正誤とその理由を明確に理解できるようにする

## ✅ 正しい例（複数パターン）

### 例1: 正解が1番目の選択肢の場合
\`\`\`json
{
  "category": "理科・生物",
  "problems": [
    {
      "question": "光合成を行う細胞内の器官は何か",
      "options": [
        "葉緑体",
        "ミトコンドリア",
        "核",
        "液胞",
        "細胞壁"
      ],
      "correctAnswer": 0,
      "explanation": "1.(✓) 葉緑体は光エネルギーを使って二酸化炭素と水から糖を合成します（光合成）。\n2.(×) ミトコンドリアはエネルギー（ATP）を産生する器官です。\n3.(×) 核は遺伝情報（DNA）を保管・管理する器官です。\n4.(×) 液胞は水分や栄養分を貯蔵する器官です。\n5.(×) 細胞壁は植物細胞を保護し形を保つ構造です。"
    }
  ]
}
\`\`\`

### 例2: 正解が3番目の選択肢の場合
\`\`\`json
{
  "category": "数学・算数",
  "problems": [
    {
      "question": "円周率πの近似値として最も正確なものはどれか",
      "options": [
        "3.00",
        "3.10",
        "3.14",
        "3.20",
        "3.50"
      ],
      "correctAnswer": 2,
      "explanation": "1.(×) 3.00は円周率の整数部分のみで、誤差が大きすぎます。\n2.(×) 3.10も誤差が大きく、円周率の近似値として不適切です。\n3.(✓) 円周率πは約3.14159...なので、小数第2位までの3.14が最も正確です。\n4.(×) 3.20は円周率より大きく、明らかに不正確です。\n5.(×) 3.50は円周率の値から大きく外れています。"
    }
  ]
}
\`\`\`

### 例3: 正解が5番目の選択肢の場合
\`\`\`json
{
  "category": "日本史",
  "problems": [
    {
      "question": "江戸幕府が開かれた年は",
      "options": [
        "1500年",
        "1550年",
        "1600年",
        "1603年",
        "1650年"
      ],
      "correctAnswer": 3,
      "explanation": "1.(×) 1500年は室町時代後期で、江戸幕府とは関係ありません。\n2.(×) 1550年頃は戦国時代真っ只中です。\n3.(×) 1600年は関ヶ原の戦いの年ですが、幕府開府はまだです。\n4.(✓) 1603年に徳川家康が征夷大将軍に任命され、江戸幕府を開きました。\n5.(×) 1650年は江戸幕府成立後の時代です。"
    }
  ]
}
\`\`\`

### 例4: 複数問題を含む場合
\`\`\`json
{
  "category": "一般科学",
  "problems": [
    {
      "question": "水の化学式は何か",
      "options": [
        "H2O",
        "CO2",
        "O2",
        "N2",
        "CH4"
      ],
      "correctAnswer": 0,
      "explanation": "1.(✓) H2Oは水の化学式で、水素原子2つと酸素原子1つから構成されます。\n2.(×) CO2は二酸化炭素の化学式です。\n3.(×) O2は酸素分子の化学式です。\n4.(×) N2は窒素分子の化学式です。\n5.(×) CH4はメタン（天然ガスの主成分）の化学式です。"
    },
    {
      "question": "二酸化炭素の化学式は何か",
      "options": [
        "H2O",
        "CO2",
        "O2",
        "N2",
        "CH4"
      ],
      "correctAnswer": 1,
      "explanation": "1.(×) H2Oは水の化学式です。\n2.(✓) CO2は二酸化炭素の化学式で、炭素原子1つと酸素原子2つから構成されます。\n3.(×) O2は酸素分子の化学式です。\n4.(×) N2は窒素分子の化学式です。\n5.(×) CH4はメタン（天然ガスの主成分）の化学式です。"
    }
  ]
}
\`\`\`

## ❌ よくある間違い例

### 間違い1: correctAnswerが1始まりになっている
\`\`\`json
// ❌ 間違い
{
  "correctAnswer": 1  // これは2番目の選択肢を指す（1始まりではない！）
}

// ✅ 正しい（1番目の選択肢を指定したい場合）
{
  "correctAnswer": 0  // 0始まりなので、0が1番目
}
\`\`\`

### 間違い2: 選択肢が4つしかない
\`\`\`json
// ❌ 間違い
{
  "options": [
    "選択肢1",
    "選択肢2",
    "選択肢3",
    "選択肢4"
  ]
}

// ✅ 正しい（必ず5つ）
{
  "options": [
    "選択肢1",
    "選択肢2",
    "選択肢3",
    "選択肢4",
    "該当なし"
  ]
}
\`\`\`

### 間違い3: explanationに正解しか書かれていない
\`\`\`json
// ❌ 間違い（正解の説明のみ）
{
  "explanation": "正解は「ミトコンドリア」です。ミトコンドリアは酸素を取り入れて、細胞の活動に必要なエネルギーを生成します。"
}

// ✅ 正しい（全選択肢を番号付きリスト形式で解説）
{
  "explanation": "1.(×) リボソームはタンパク質を合成する器官です。\n2.(✓) ミトコンドリアは酸素を取り入れてエネルギー（ATP）を産生します。\n3.(×) ゴルジ体は物質の輸送と分泌を担当します。\n4.(×) 中心体は細胞分裂時に重要な役割を果たします。\n5.(×) 核は遺伝情報（DNA）を保管・管理します。"
}
\`\`\`

### 間違い4: 番号付きリスト形式を使っていない
\`\`\`json
// ❌ 間違い（文章形式）
{
  "explanation": "正解は「水素」です。原子番号1番の水素は宇宙の質量の約75%を占めます。ヘリウムは2番目に多く約24%です。"
}

// ✅ 正しい（番号付きリスト形式）
{
  "explanation": "1.(×) ヘリウムは宇宙で2番目に多い元素（約24%）です。\n2.(×) リチウムは原子番号3番の元素です。\n3.(×) 酸素は地球上では多いですが、宇宙全体では少数派です。\n4.(✓) 水素は原子番号1番で、宇宙の質量の約75%を占める最も多い元素です。\n5.(×) 炭素は生命に重要ですが、宇宙全体では少数派です。"
}
\`\`\`

## 🎯 出力時の最終チェック

出力前に以下を確認してください：
- [ ] correctAnswerが0-4の範囲内
- [ ] optionsが正確に5要素
- [ ] correctAnswerと実際の正解選択肢が一致
- [ ] categoryが空でない
- [ ] explanationに正解の選択肢名が含まれている
- [ ] **explanationに全ての選択肢（正解＋不正解）の解説が含まれている**
- [ ] JSON形式として有効（カンマ、クォートの位置）

上記JSON形式に**完全に従って**出力してください。`;

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="quiz-action-button px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
            >
              {t[currentLang].buttons.backToMenu}
            </button>
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              title="ガイドを表示"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>使い方ガイド</span>
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t[currentLang].pageTitle}</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* カテゴリー管理 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
              {t[currentLang].sections.categoryManagement}
            </h2>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={t[currentLang].labels.newCategoryName}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={handleAddCategory}
                  className="quiz-action-button px-4 py-2 rounded-md transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                >
                  {t[currentLang].buttons.add}
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t[currentLang].labels.registeredCategories}
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <span className="text-gray-900 dark:text-white">{category}</span>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="text-red-500 hover:text-red-700 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 rounded px-2 py-1 transition-all"
                      >
                        {t[currentLang].buttons.delete}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 問題フォーム */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">
              {editingProblem ? t[currentLang].sections.problemEdit : t[currentLang].sections.problemAdd}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t[currentLang].labels.category}
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{t[currentLang].labels.selectCategory}</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder={currentLang === 'ja' ? '新カテゴリー' : 'New category'}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-32"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newCategoryName.trim()) return;
                        await handleAddCategory();
                        setFormData({ ...formData, category: newCategoryName.trim() });
                      }}
                      className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors font-medium"
                      title={currentLang === 'ja' ? 'カテゴリーを追加' : 'Add category'}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t[currentLang].labels.problemType}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'true-false' | 'multiple-choice' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="true-false">{t[currentLang].labels.trueFalse}</option>
                  <option value="multiple-choice">{t[currentLang].labels.multipleChoice}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t[currentLang].labels.question}
                </label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={t[currentLang].labels.questionPlaceholder}
                />
              </div>

              {formData.type === 'true-false' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].labels.answer}
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.answer === true}
                        onChange={() => setFormData({ ...formData, answer: true })}
                        className="mr-2"
                      />
                      <span className="text-gray-900 dark:text-white">{t[currentLang].labels.correct}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.answer === false}
                        onChange={() => setFormData({ ...formData, answer: false })}
                        className="mr-2"
                      />
                      <span className="text-gray-900 dark:text-white">{t[currentLang].labels.incorrect}</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t[currentLang].labels.options}
                  </label>
                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={formData.correctAnswer === index}
                          onChange={() => setFormData({ ...formData, correctAnswer: index })}
                          title={currentLang === 'ja' ? '正解として選択' : 'Select as correct answer'}
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...formData.options];
                            newOptions[index] = e.target.value;
                            setFormData({ ...formData, options: newOptions });
                          }}
                          placeholder={`${t[currentLang].labels.optionPlaceholder} ${index + 1}`}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        {formData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOptions = formData.options.filter((_, i) => i !== index);
                              const newCorrectAnswer = formData.correctAnswer === index
                                ? 0
                                : formData.correctAnswer > index
                                  ? formData.correctAnswer - 1
                                  : formData.correctAnswer;
                              setFormData({ ...formData, options: newOptions, correctAnswer: newCorrectAnswer });
                            }}
                            className="px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title={currentLang === 'ja' ? '選択肢を削除' : 'Remove option'}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {formData.options.length < 10 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, options: [...formData.options, ''] });
                      }}
                      className="mt-2 px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      + {currentLang === 'ja' ? '選択肢を追加' : 'Add option'} ({formData.options.length}/10)
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t[currentLang].labels.explanation}
                </label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={t[currentLang].labels.explanationPlaceholder}
                />
              </div>

              {/* タグ管理 */}
              {editingProblem?.id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    タグ
                  </label>
                  <TagManager
                    problemId={editingProblem.id}
                    currentTags={formData.tags}
                    onTagsChange={async (tags) => {
                      setFormData({ ...formData, tags });
                      await refreshTags(); // TagFilterを即座に更新
                    }}
                  />
                </div>
              )}

              {/* 学習メモ */}
              {editingProblem?.id && (
                <div>
                  <NoteEditor
                    problemId={editingProblem.id}
                    initialNote={formData.userNotes}
                    initialTags={formData.noteTags}
                    onSave={async (note, tags) => {
                      setFormData({ ...formData, userNotes: note, noteTags: tags });
                      // 即座に保存
                      await problemService.update({
                        ...editingProblem,
                        userNotes: note,
                        noteTags: tags,
                        noteUpdatedAt: new Date()
                      });
                    }}
                  />
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={handleSaveProblem}
                  className="quiz-action-button flex-1 px-4 py-2 rounded-md transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                >
                  {editingProblem ? t[currentLang].buttons.update : t[currentLang].buttons.save}
                </button>
                <button
                  onClick={clearForm}
                  className="quiz-action-button px-4 py-2 rounded-md transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                >
                  {t[currentLang].buttons.clear}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* インポート・エクスポート */}
        <div className="mt-8 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100">
              {t[currentLang].sections.importExport}
            </h2>
            <button
              onClick={() => setShowImportHelp(!showImportHelp)}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800/60 text-purple-900 dark:text-purple-100 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{showImportHelp ? '使い方を閉じる' : '使い方を見る'}</span>
            </button>
          </div>

          {/* 使い方ヘルプセクション */}
          {showImportHelp && (
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border-2 border-purple-300 dark:border-purple-700 p-6 space-y-6">
              {/* AIツール用プロンプト */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 flex items-center space-x-2">
                  <span>🤖</span>
                  <span>AIツールで問題を生成</span>
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  ChatGPT、Claude、Geminiなどに以下のプロンプトを送信して、問題データを生成できます：
                </p>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">プロンプト例</span>
                    <button
                      onClick={() => {
                        const promptText = `以下の形式で、日本史の問題を5問作成してください：

カテゴリー: [カテゴリー名]
問題: [問題文]
正解: [TRUE または FALSE、または選択肢番号 0-3]
解説: [解説文]

○×問題の場合：
- 正解は TRUE（正しい）または FALSE（誤り）

多択問題の場合：
- 選択肢1: [選択肢]
- 選択肢2: [選択肢]
- 選択肢3: [選択肢]
- 選択肢4: [選択肢]
- 正解: [0-3の番号（0=1番目、1=2番目、2=3番目、3=4番目）]`;
                        navigator.clipboard.writeText(promptText);
                        alert('プロンプトをクリップボードにコピーしました！');
                      }}
                      className="text-xs px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded transition-all"
                    >
                      📋 コピー
                    </button>
                  </div>
                  <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
{`以下の形式で、日本史の問題を5問作成してください：

カテゴリー: [カテゴリー名]
問題: [問題文]
正解: [TRUE または FALSE、または選択肢番号 0-3]
解説: [解説文]

○×問題の場合：
- 正解は TRUE（正しい）または FALSE（誤り）

多択問題の場合：
- 選択肢1: [選択肢]
- 選択肢2: [選択肢]
- 選択肢3: [選択肢]
- 選択肢4: [選択肢]
- 正解: [0-3の番号（0=1番目、1=2番目、2=3番目、3=4番目）]`}
                  </pre>
                </div>
              </div>

              {/* ○×問題の例 */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-green-900 dark:text-green-100 flex items-center space-x-2">
                  <span>⭕</span>
                  <span>○×問題の形式</span>
                </h3>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-300 dark:border-green-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-green-700 dark:text-green-300">例</span>
                    <button
                      onClick={() => {
                        const example = `カテゴリー: 日本史
問題: 徳川家康は江戸幕府を開いた
正解: TRUE
解説: 1603年に徳川家康が江戸幕府を開きました`;
                        navigator.clipboard.writeText(example);
                        alert('例をクリップボードにコピーしました！');
                      }}
                      className="text-xs px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded transition-all"
                    >
                      📋 コピー
                    </button>
                  </div>
                  <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
{`カテゴリー: 日本史
問題: 徳川家康は江戸幕府を開いた
正解: TRUE
解説: 1603年に徳川家康が江戸幕府を開きました`}
                  </pre>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                    💡 正解は <code className="bg-green-200 dark:bg-green-800 px-1 rounded">TRUE</code>（正しい）または <code className="bg-green-200 dark:bg-green-800 px-1 rounded">FALSE</code>（誤り）
                  </p>
                </div>
              </div>

              {/* 多択問題の例 */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 flex items-center space-x-2">
                  <span>🔢</span>
                  <span>多択問題の形式</span>
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-300 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">例</span>
                    <button
                      onClick={() => {
                        const example = `カテゴリー: 世界史
問題: 第一次世界大戦が始まったのは何年か？
選択肢1: 1912年
選択肢2: 1914年
選択肢3: 1916年
選択肢4: 1918年
正解: 1
解説: 1914年にサラエボ事件をきっかけに開戦`;
                        navigator.clipboard.writeText(example);
                        alert('例をクリップボードにコピーしました！');
                      }}
                      className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-all"
                    >
                      📋 コピー
                    </button>
                  </div>
                  <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
{`カテゴリー: 世界史
問題: 第一次世界大戦が始まったのは何年か？
選択肢1: 1912年
選択肢2: 1914年
選択肢3: 1916年
選択肢4: 1918年
正解: 1
解説: 1914年にサラエボ事件をきっかけに開戦`}
                  </pre>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    💡 正解は選択肢の番号：<code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">0</code>=1番目、<code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">1</code>=2番目、<code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">2</code>=3番目、<code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">3</code>=4番目
                  </p>
                </div>
              </div>

              {/* インポート手順 */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100 flex items-center space-x-2">
                  <span>📥</span>
                  <span>インポート手順</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-300 dark:border-orange-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">貼り付け</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">下のテキストエリアにAI生成データを貼り付け</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-300 dark:border-orange-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">プレビュー</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">「プレビュー」ボタンで内容確認</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-300 dark:border-orange-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">インポート</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">問題なければ「インポート」実行</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 問題集作成オプション */}
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                id="create-quiz-set"
                checked={createQuizSet}
                onChange={(e) => setCreateQuizSet(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="create-quiz-set" className="text-sm font-medium text-gray-900 dark:text-white">
                {t[currentLang].importExport.createQuizSetOption}
              </label>
            </div>
            {createQuizSet && (
              <div className="ml-7">
                <input
                  type="text"
                  value={quizSetName}
                  onChange={(e) => setQuizSetName(e.target.value)}
                  placeholder={t[currentLang].importExport.quizSetNamePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CSVファイルインポート */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t[currentLang].importExport.csvFileImport}
              </h3>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
              />
              
              <div className="space-y-2">
                <button
                  onClick={() => setShowCsvFormat(!showCsvFormat)}
                  className="text-blue-500 hover:text-blue-700 text-sm underline hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-2 py-1 transition-all"
                >
                  {t[currentLang].importExport.csvFormatDetails}
                </button>
                
                {showCsvFormat && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md text-sm">
                    <div className="text-gray-900 dark:text-white whitespace-pre-wrap font-mono">
                      {t[currentLang].messages.csvFormatPrompt}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={handleExportCsv}
                  className="quiz-action-button w-full px-4 py-2 rounded-md transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                >
                  {t[currentLang].buttons.export}
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                >
                  📥 CSVテンプレートをダウンロード
                </button>
              </div>
            </div>

            {/* テキストからCSV生成 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t[currentLang].importExport.textToCsv}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t[currentLang].importExport.textToCsvDescription}
              </p>
              
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                onPaste={(e) => {
                  // ペースト操作を許可
                  e.stopPropagation();
                }}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white selection:bg-blue-200 selection:text-gray-900 dark:selection:bg-blue-700 dark:selection:text-white"
                placeholder={t[currentLang].importExport.csvDataPlaceholder}
              />
              
              <div className="space-y-2">
                <button
                  onClick={handleCsvPreview}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-all shadow-md hover:shadow-lg"
                >
                  👁️ CSVプレビュー（検証付き）
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      console.log('インポートボタンクリック');
                      console.log('createQuizSet:', createQuizSet);
                      console.log('quizSetName:', quizSetName);
                      console.log('csvText length:', csvText.length);
                      handleCsvTextImport();
                    }}
                    disabled={createQuizSet && !quizSetName.trim()}
                    className="quiz-action-button flex-1 px-4 py-2 rounded-md transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                    title={createQuizSet && !quizSetName.trim() ? t[currentLang].messages.quizSetNameRequired : ""}
                  >
                    {t[currentLang].buttons.import}
                  </button>
                  <button
                    onClick={generateCsvFromText}
                    className="quiz-action-button flex-1 px-4 py-2 rounded-md transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                  >
                    {t[currentLang].buttons.generateCsv}
                  </button>
                </div>
              </div>

              {/* AIツール用プロンプト表示 */}
              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                  <strong className="text-blue-900 dark:text-blue-100">💡 外部AIで問題を一括作成</strong>
                  <p className="mt-1 text-xs">
                    ChatGPT、Claude、Gemini等の外部AIにプロンプトをコピーして、問題を自動生成できます。
                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full font-bold">JSON形式（推奨）</span>が最も高精度です。
                  </p>
                </div>
                <button
                  onClick={() => setShowPrompts(!showPrompts)}
                  className="quiz-action-button w-full px-4 py-2 rounded-md transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                >
                  {showPrompts ? '🔼 AIプロンプトを閉じる' : '🔽 AIプロンプトを表示'}
                </button>
              </div>

              {showPrompts && (
                <div className="mt-4 space-y-4">
                  {/* 使い方ガイド */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg p-4">
                    <h4 className="text-md font-bold text-indigo-900 dark:text-indigo-100 mb-3 flex items-center space-x-2">
                      <span>📖</span>
                      <span>使い方（3ステップ）</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-indigo-200 dark:border-indigo-700">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">コピー</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          下のプロンプトから1つ選び、「📋 コピー」ボタンでクリップボードにコピー
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-indigo-200 dark:border-indigo-700">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">生成</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          ChatGPT/Claude/Gemini等にプロンプトを貼り付けて問題を生成
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-indigo-200 dark:border-indigo-700">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">インポート</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          生成された問題を上のテキストエリアに貼り付け→「インポート」
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ○×問題用プロンプト */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-md font-medium text-blue-900 dark:text-blue-100">○×問題用プロンプト</h4>
                      <button
                        onClick={() => copyToClipboard(trueFalsePrompt, '○×問題用')}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        {t[currentLang].buttons.copyPrompt}
                      </button>
                    </div>
                    <pre className="text-xs text-blue-800 dark:text-blue-200 whitespace-pre-wrap bg-white dark:bg-gray-800 p-3 rounded border max-h-40 overflow-y-auto">
                      {trueFalsePrompt}
                    </pre>
                  </div>

                  {/* 多択問題用プロンプト（テキスト形式） */}
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-md font-medium text-green-900 dark:text-green-100">多択問題用プロンプト（テキスト形式）</h4>
                      <button
                        onClick={() => copyToClipboard(multipleChoicePrompt, '多択問題用（テキスト形式）')}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        {t[currentLang].buttons.copyPrompt}
                      </button>
                    </div>
                    <pre className="text-xs text-green-800 dark:text-green-200 whitespace-pre-wrap bg-white dark:bg-gray-800 p-3 rounded border max-h-40 overflow-y-auto">
                      {multipleChoicePrompt}
                    </pre>
                  </div>

                  {/* JSON形式プロンプト（推奨・高精度） */}
                  <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-md font-medium text-purple-900 dark:text-purple-100">JSON形式プロンプト</h4>
                        <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">推奨</span>
                        <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">高精度</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(jsonFormatPrompt, 'JSON形式')}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                      >
                        {t[currentLang].buttons.copyPrompt}
                      </button>
                    </div>
                    <div className="mb-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-800/30 p-2 rounded">
                      ✨ <strong>なぜJSON形式が優れているか：</strong>
                      <ul className="ml-4 mt-1 list-disc">
                        <li>構造的強制：JSON構文エラーで即座にミス検出</li>
                        <li>型の保証：正解番号は必ず数値（0-4）</li>
                        <li>配列の明示性：選択肢は必ず5要素の配列</li>
                        <li>曖昧性ゼロ：番号付けや区切り文字の解釈ミスなし</li>
                        <li>AI出力精度：テキスト形式70-80% → JSON形式90-95%+</li>
                      </ul>
                    </div>
                    <pre className="text-xs text-purple-800 dark:text-purple-200 whitespace-pre-wrap bg-white dark:bg-gray-800 p-3 rounded border max-h-60 overflow-y-auto">
                      {jsonFormatPrompt}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 問題一覧 */}
        <div className="mt-8 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-orange-900 dark:text-orange-100">{t[currentLang].sections.problemList}</h2>
              {duplicateProblemsMap.size > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  ⚠️ {duplicateProblemsMap.size}件の重複問題を検出
                </p>
              )}
            </div>
            <button
              onClick={() => detectDuplicatesInBackground(problems)}
              disabled={problems.length === 0}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium shadow-md hover:shadow-lg transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
              title={currentLang === 'ja' ? '重複問題を手動で検出' : 'Manually detect duplicates'}
            >
              {currentLang === 'ja' ? '🔍 重複検出' : '🔍 Detect Duplicates'}
            </button>
          </div>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t[currentLang].labels.allCategories}</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={t[currentLang].labels.searchPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* 一括選択ツールバー */}
          <BulkSelectionToolbar
            selectedCount={selectedCount}
            totalCount={filteredProblems.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBulkAction={() => setShowBulkActionModal(true)}
            categories={categories}
            onFilterSelect={handleFilterSelect}
            language={currentLang}
          />

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="w-12 py-2 px-4"></th>
                  <th className="text-left py-2 px-4 text-gray-900 dark:text-white">{t[currentLang].labels.tableHeaders.category}</th>
                  <th className="text-left py-2 px-4 text-gray-900 dark:text-white">{t[currentLang].labels.tableHeaders.question}</th>
                  <th className="text-left py-2 px-4 text-gray-900 dark:text-white">{t[currentLang].labels.tableHeaders.type}</th>
                  <th className="text-left py-2 px-4 text-gray-900 dark:text-white">{t[currentLang].labels.tableHeaders.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.map((problem) => (
                  <tr
                    key={problem.id}
                    className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                      problem.id && selectionManager.isSelected(problem.id) ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                    }`}
                    onContextMenu={(e) => problem.id && handleContextMenu(e, problem.id)}
                    onTouchStart={(e) => problem.id && handleTouchStart(e, problem.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <td className="py-2 px-4">
                      <input
                        type="checkbox"
                        checked={problem.id ? selectionManager.isSelected(problem.id) : false}
                        onChange={() => problem.id && handleToggleSelection(problem.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </td>
                    <td className="py-2 px-4 text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{problem.category}</span>
                        {problem.id && duplicateProblemsMap.has(problem.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDuplicateProblem(problem);
                              setShowDuplicateResolveModal(true);
                            }}
                            className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-bold hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                            title={currentLang === 'ja' ? `${duplicateProblemsMap.get(problem.id!)?.length}件の重複` : `${duplicateProblemsMap.get(problem.id!)?.length} duplicates`}
                          >
                            {currentLang === 'ja' ? '重複' : 'Duplicate'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td
                      className="py-2 px-4 text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProblemDetail(problem);
                        setShowProblemDetailModal(true);
                      }}
                      title={currentLang === 'ja' ? 'クリックして詳細を表示' : 'Click to show details'}
                    >
                      {problem.question.length > 50 ? problem.question.substring(0, 50) + '...' : problem.question}
                    </td>
                    <td className="py-2 px-4 text-gray-900 dark:text-white">
                      {problem.type === 'multiple-choice' ? t[currentLang].labels.multipleChoiceShort : t[currentLang].labels.trueFalseShort}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (problem.id) {
                              try {
                                const updatedProblem = {
                                  ...problem,
                                  isFavorite: !problem.isFavorite
                                };
                                await problemService.update(updatedProblem);
                                setProblems(problems.map(p => p.id === problem.id ? updatedProblem : p));
                              } catch (error) {
                                console.error('Failed to toggle favorite:', error);
                              }
                            }
                          }}
                          className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800 text-lg"
                        >
                          {problem.isFavorite ? '⭐' : '☆'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Edit button clicked', problem);
                            handleEditProblem(problem);
                          }}
                          className="quiz-action-button text-sm px-2 py-1 rounded transition-all"
                        >
                          {t[currentLang].buttons.edit}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            problem.id && handleDeleteProblem(problem.id);
                          }}
                          className="text-red-500 hover:text-red-700 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 rounded px-2 py-1 transition-all"
                        >
                          {t[currentLang].buttons.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredProblems.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t[currentLang].messages.noProblemsFound}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 問題詳細モーダル */}
      {showProblemDetailModal && selectedProblemDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowProblemDetailModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
              <h3 className="text-xl font-bold">📋 問題詳細</h3>
              <button
                onClick={() => setShowProblemDetailModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* カテゴリ */}
              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">カテゴリ</label>
                <p className="mt-1 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {selectedProblemDetail.category}
                </p>
              </div>

              {/* 問題文 */}
              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">問題文</label>
                <p className="mt-1 text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500 whitespace-pre-wrap">
                  {selectedProblemDetail.question}
                </p>
              </div>

              {/* 選択肢（多択問題の場合） */}
              {selectedProblemDetail.type === 'multiple-choice' && selectedProblemDetail.options && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">選択肢</label>
                  <div className="mt-1 space-y-2">
                    {selectedProblemDetail.options.map((option, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-l-4 ${
                          index === selectedProblemDetail.correctAnswer
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-900 dark:text-green-100'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                        }`}
                      >
                        <span className="font-semibold">{index + 1}. </span>
                        {option}
                        {index === selectedProblemDetail.correctAnswer && (
                          <span className="ml-2 text-green-600 dark:text-green-400 font-bold">✓ 正解</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 正解（○×問題の場合） */}
              {selectedProblemDetail.type === 'true-false' && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">正解</label>
                  <p className="mt-1 text-gray-900 dark:text-white bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border-l-4 border-green-500">
                    {selectedProblemDetail.answer ? '○ 正しい' : '✕ 誤り'}
                  </p>
                </div>
              )}

              {/* 解説 */}
              <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">解説</label>
                <p className="mt-1 text-gray-900 dark:text-white bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500 whitespace-pre-wrap">
                  {selectedProblemDetail.explanation}
                </p>
              </div>

              {/* タグ */}
              {selectedProblemDetail.tags && selectedProblemDetail.tags.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">タグ</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedProblemDetail.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ユーザーノート */}
              {selectedProblemDetail.userNotes && (
                <div>
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">📝 ユーザーノート</label>
                  <p className="mt-1 text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border-l-4 border-yellow-500 whitespace-pre-wrap">
                    {selectedProblemDetail.userNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV プレビューモーダル */}
      {showCsvPreview && (
        <CSVPreview
          data={csvPreviewData}
          errors={csvErrors}
          warnings={csvWarnings}
          onClose={() => setShowCsvPreview(false)}
          onConfirm={handleConfirmImport}
          language={language as 'ja' | 'en'}
        />
      )}

      {/* 問題作成ガイド */}
      {showGuide && (
        <ProblemEditorGuide onClose={handleCloseGuide} />
      )}

      {/* 重複警告モーダル */}
      {showDuplicateModal && duplicateCheckResult && (
        <DuplicateWarningModal
          duplicates={duplicateCheckResult.duplicates}
          similarity={duplicateCheckResult.similarity}
          onEdit={() => {
            setShowDuplicateModal(false);
            setDuplicateCheckResult(null);
            // フォームに戻る（問題文入力欄にフォーカスを当てる）
          }}
          onSaveAnyway={() => {
            setShowDuplicateModal(false);
            setDuplicateCheckResult(null);
            setForceSave(true);
            // 強制保存フラグを立てて再度保存処理を実行
            setTimeout(() => handleSaveProblem(), 0);
          }}
          onCancel={() => {
            setShowDuplicateModal(false);
            setDuplicateCheckResult(null);
          }}
        />
      )}

      {/* 一括操作モーダル */}
      {showBulkActionModal && (
        <BulkActionModal
          selectedProblemIds={selectionManager.getSelectedIds()}
          onClose={() => setShowBulkActionModal(false)}
          onComplete={handleBulkActionComplete}
          categories={categories}
          quizSets={quizSets}
          language={currentLang}
        />
      )}

      {/* クイックアクションメニュー */}
      {contextMenu && (
        <QuickActionMenu
          position={contextMenu.position}
          actions={getQuickActions(contextMenu.problemId)}
          onClose={() => setContextMenu(null)}
          language={language as 'ja' | 'en'}
        />
      )}

      {/* ショートカットヘルプモーダル */}
      <ShortcutHelpModal
        isOpen={showShortcutHelp}
        onClose={() => setShowShortcutHelp(false)}
        shortcutManager={shortcutManager}
        language={language as 'ja' | 'en'}
      />

      {/* 重複解消モーダル */}
      {showDuplicateResolveModal && selectedDuplicateProblem && selectedDuplicateProblem.id && (
        <DuplicateResolveModal
          problem={selectedDuplicateProblem}
          duplicates={duplicateProblemsMap.get(selectedDuplicateProblem.id) || []}
          onDeleteProblem={async (problemId) => {
            await handleDeleteProblem(problemId);
            // モーダルを閉じる
            setShowDuplicateResolveModal(false);
            setSelectedDuplicateProblem(null);
          }}
          onClose={() => {
            setShowDuplicateResolveModal(false);
            setSelectedDuplicateProblem(null);
          }}
          language={currentLang}
        />
      )}
    </div>
  );
}