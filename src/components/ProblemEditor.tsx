import { useState, useEffect } from 'react';
import { categoryService, problemService, quizSetService } from '../lib/database';
import type { Problem } from '../types';

interface ProblemEditorProps {
  onBack: () => void;
}

export function ProblemEditor({ onBack }: ProblemEditorProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
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
    options: ['', '', '', ''],
    correctAnswer: 0
  });
  
  // フィルター状態
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  
  // カテゴリー管理状態
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // インポート・エクスポート状態
  const [csvText, setCsvText] = useState('');
  const [showCsvFormat, setShowCsvFormat] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  
  // 問題集作成オプション
  const [createQuizSet, setCreateQuizSet] = useState(false);
  const [quizSetName, setQuizSetName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProblems();
  }, [problems, categoryFilter, searchFilter]);

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
      const [categoriesData, problemsData] = await Promise.all([
        categoryService.getAll(),
        problemService.getAll()
      ]);
      setCategories(categoriesData);
      setProblems(problemsData);
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
    
    setFilteredProblems(filtered);
  };

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

      if (editingProblem?.id) {
        await problemService.update({ ...problemData, id: editingProblem.id });
      } else {
        await problemService.add(problemData);
      }
      
      await loadData();
      clearForm();
    } catch (error) {
      console.error('問題保存エラー:', error);
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
      options: problem.options || ['', '', '', ''],
      correctAnswer: problem.correctAnswer || 0
    });
  };

  const handleDeleteProblem = async (problemId: number) => {
    if (!confirm(t[currentLang].messages.confirmDeleteProblem)) return;
    
    try {
      await problemService.delete(problemId);
      await loadData();
    } catch (error) {
      console.error('問題削除エラー:', error);
    }
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
      correctAnswer: 0
    });
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
              correctAnswer: parseInt(quiz.answer) || 0
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
    if (problems.length === 0) {
      alert(t[currentLang].messages.noProblemsToExport);
      return;
    }

    const csvHeader = 'category,question,answer,explanation,option1,option2,option3,option4\n';
    const csvRows = problems.map(problem => {
      const category = `"${problem.category.replace(/"/g, '""')}"`;
      const question = `"${problem.question.replace(/"/g, '""')}"`;
      const explanation = `"${problem.explanation.replace(/"/g, '""')}"`;
      
      if (problem.type === 'multiple-choice' && problem.options) {
        const answer = problem.correctAnswer?.toString() || '0';
        const options = problem.options.map(opt => `"${opt.replace(/"/g, '""')}"`);
        while (options.length < 4) options.push('""');
        return `${category},${question},${answer},${explanation},${options.join(',')}`;
      } else {
        const answer = problem.answer ? 'TRUE' : 'FALSE';
        return `${category},${question},${answer},${explanation},"","","",""`;
      }
    });

    const csvContent = csvHeader + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `minguella_problems_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const parseTextToQuizData = (text: string) => {
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
      if (line.match(/^_{10,}/) || line.match(/^-{10,}/) || line.match(/^={10,}/)) {
        // 前の問題を保存（区切り線前に）
        if (currentQuestion && currentAnswer !== '' && currentExplanation) {
          const options = ['', '', '', ''];
          for (let j = 0; j < Math.min(currentOptions.length, 4); j++) {
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
            option4: options[3]
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
      const isClearCategoryPattern = line.match(/^第\d+章\s+.+/) || 
                                    line.match(/^Chapter\s+\d+/) || 
                                    line.match(/^[#]+\s*.+/) ||
                                    line.match(/^小テスト\d*[：:]\s*.+/) ||
                                    line.match(/^テスト\d*[：:]\s*.+/) ||
                                    line.match(/^Quiz\s*\d*[：:]\s*.+/) ||
                                    (line.match(/^\d+\.\s*.+/) && afterSeparator);
                                    
      if (isClearCategoryPattern && (afterSeparator || i === 0 || lines[i-1].trim() === '')) {
        // 前の問題を保存（カテゴリー変更前に）
        if (currentQuestion && currentAnswer !== '' && currentExplanation) {
          const options = ['', '', '', ''];
          for (let j = 0; j < Math.min(currentOptions.length, 4); j++) {
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
            option4: options[3]
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
          const options = ['', '', '', ''];
          for (let j = 0; j < Math.min(currentOptions.length, 4); j++) {
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
            option4: options[3]
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
      
      // 選択肢検出
      if (line.match(/^[1-5]\.\s+.+/) || line.match(/^[ABCDE]\.\s+.+/) || line.match(/^[（(][1-5][）)]\s+.+/)) {
        const optionText = line.replace(/^[1-5ABCDE（(][1-5）)]*\.\s*/, '').replace(/^[（(][1-5][）)]\s*/, '').trim();
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
          if (!isNaN(numAnswer) && numAnswer >= 1 && numAnswer <= 5) {
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
      const options = ['', '', '', ''];
      for (let j = 0; j < Math.min(currentOptions.length, 4); j++) {
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
        option4: options[3]
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
    const csvHeader = 'category,question,answer,explanation,option1,option2,option3,option4\n';
    const csvRows = quizData.map(quiz => {
      const category = `"${quiz.category.replace(/"/g, '""')}"`;
      const question = `"${quiz.question.replace(/"/g, '""')}"`;
      const answer = quiz.answer;
      const explanation = `"${quiz.explanation.replace(/"/g, '""')}"`;
      const option1 = `"${quiz.option1.replace(/"/g, '""')}"`;
      const option2 = `"${quiz.option2.replace(/"/g, '""')}"`;
      const option3 = `"${quiz.option3.replace(/"/g, '""')}"`;
      const option4 = `"${quiz.option4.replace(/"/g, '""')}"`;
      
      return `${category},${question},${answer},${explanation},${option1},${option2},${option3},${option4}`;
    });

    const csvContent = csvHeader + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `generated_problems_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    alert(`${quizData.length}個の問題をCSVファイルに変換しました。`);
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
          <button
            onClick={onBack}
            className="quiz-action-button mb-4 px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
          >
            {t[currentLang].buttons.backToMenu}
          </button>
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
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t[currentLang].labels.selectCategory}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t[currentLang].labels.problemType}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'true-false' | 'multiple-choice' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder={t[currentLang].labels.explanationPlaceholder}
                />
              </div>

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
          <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4">
            {t[currentLang].sections.importExport}
          </h2>
          
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
              
              <button
                onClick={handleExportCsv}
                className="quiz-action-button w-full px-4 py-2 rounded-md transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
              >
                {t[currentLang].buttons.export}
              </button>
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder={t[currentLang].importExport.csvDataPlaceholder}
              />
              
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

              {/* AIツール用プロンプト表示 */}
              <div className="mt-4">
                <button
                  onClick={() => setShowPrompts(!showPrompts)}
                  className="quiz-action-button w-full px-4 py-2 rounded-md transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                >
                  {t[currentLang].buttons.showPrompts}
                </button>
              </div>

              {showPrompts && (
                <div className="mt-4 space-y-4">
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

                  {/* 多択問題用プロンプト */}
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-md font-medium text-green-900 dark:text-green-100">多択問題用プロンプト</h4>
                      <button
                        onClick={() => copyToClipboard(multipleChoicePrompt, '多択問題用')}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        {t[currentLang].buttons.copyPrompt}
                      </button>
                    </div>
                    <pre className="text-xs text-green-800 dark:text-green-200 whitespace-pre-wrap bg-white dark:bg-gray-800 p-3 rounded border max-h-40 overflow-y-auto">
                      {multipleChoicePrompt}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 問題一覧 */}
        <div className="mt-8 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-orange-900 dark:text-orange-100 mb-4">{t[currentLang].sections.problemList}</h2>
          
          <div className="mb-4 flex space-x-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-4 text-gray-900 dark:text-white">{t[currentLang].labels.tableHeaders.category}</th>
                  <th className="text-left py-2 px-4 text-gray-900 dark:text-white">{t[currentLang].labels.tableHeaders.question}</th>
                  <th className="text-left py-2 px-4 text-gray-900 dark:text-white">{t[currentLang].labels.tableHeaders.type}</th>
                  <th className="text-left py-2 px-4 text-gray-900 dark:text-white">{t[currentLang].labels.tableHeaders.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.map((problem) => (
                  <tr key={problem.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 px-4 text-gray-900 dark:text-white">{problem.category}</td>
                    <td className="py-2 px-4 text-gray-900 dark:text-white">
                      {problem.question.length > 50 ? problem.question.substring(0, 50) + '...' : problem.question}
                    </td>
                    <td className="py-2 px-4 text-gray-900 dark:text-white">
                      {problem.type === 'multiple-choice' ? t[currentLang].labels.multipleChoiceShort : t[currentLang].labels.trueFalseShort}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditProblem(problem)}
                          className="quiz-action-button text-sm px-2 py-1 rounded transition-all"
                        >
                          {t[currentLang].buttons.edit}
                        </button>
                        <button
                          onClick={() => problem.id && handleDeleteProblem(problem.id)}
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
    </div>
  );
}