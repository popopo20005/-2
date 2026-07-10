import { useState, useEffect, useCallback } from 'react';
import { Crown } from 'lucide-react';
import { getResponseTimeStatistics } from '../services/responseTimeService';
import { createPortal } from 'react-dom';
import { db, resetDatabase } from '../lib/database';
import { demonstrateLearningStateEstimation } from '../lib/learningStateDemo';
import { authService, type AuthUser } from '../services/authService';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getAllAnalyses, removeSession, getExamGrowthSummary, type GrowthStatus } from '../services/subtopicAnalysisService';
import { EXAM_PRESETS } from '../lib/examPresets';
import { userPresetService } from '../services/userPresetService';
import type { PersonalSubtopicAnalysis } from '../types/subtopicAnalysis';
import type { View } from '../types';

interface SettingsProps {
  onBack: () => void;
  onToggleDarkMode?: () => void;
  isDarkMode: boolean;
  language?: 'ja' | 'en';
  onShowOnboarding?: () => void;
  onNavigate?: (view: View) => void;
}

export function Settings({ onBack, isDarkMode, language: propsLanguage, onShowOnboarding, onNavigate }: SettingsProps) {
  const [language, setLanguage] = useState(propsLanguage || localStorage.getItem('language') || 'ja');
  const [showHelp, setShowHelp] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [subjectiveFeedbackEnabled, setSubjectiveFeedbackEnabled] = useState(() => {
    const saved = localStorage.getItem('subjective-feedback-enabled');
    return saved === null ? true : saved === 'true'; // デフォルトで有効
  });

  // ユーザー名設定
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('userName') || '田中 太郎';
  });

  // 解答時間設定
  const [tfTimePerQuestion, setTfTimePerQuestion] = useState(() => {
    return parseInt(localStorage.getItem('tfTimePerQuestion') || '10');
  });
  const [mcTimePerQuestion, setMcTimePerQuestion] = useState(() => {
    return parseInt(localStorage.getItem('mcTimePerQuestion') || '120');
  });
  const [autoAdjustTime, setAutoAdjustTime] = useState(() => {
    return localStorage.getItem('autoAdjustTime') === 'true';
  });

  // サブトピック分析データ管理
  interface AnalysisDataEntry {
    name: string;
    growthStatuses: GrowthStatus[];
    analyses: PersonalSubtopicAnalysis[];
  }
  const [analysisData, setAnalysisData] = useState<Map<string, AnalysisDataEntry>>(new Map());
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ examId: string; category: string; sessionId?: string } | null>(null);

  const loadAnalysisData = useCallback(async () => {
    const allAnalyses = await db.personalSubtopicAnalyses.toArray();
    if (allAnalyses.length === 0) {
      setAnalysisData(new Map());
      return;
    }

    // examId でグループ化
    const grouped = new Map<string, PersonalSubtopicAnalysis[]>();
    for (const a of allAnalyses) {
      const list = grouped.get(a.examId) || [];
      list.push(a);
      grouped.set(a.examId, list);
    }

    // プリセット名マッピング
    const presetNameMap = new Map<string, string>();
    for (const p of EXAM_PRESETS) {
      presetNameMap.set(p.id, p.name);
    }
    const customPresets = await userPresetService.getAll();
    for (const p of customPresets) {
      presetNameMap.set(p.presetId, p.name);
    }

    // 成長状態を取得
    const result = new Map<string, AnalysisDataEntry>();
    for (const [examId, analyses] of grouped) {
      const growthStatuses = await getExamGrowthSummary(examId);
      result.set(examId, {
        name: presetNameMap.get(examId) || examId,
        growthStatuses,
        analyses,
      });
    }

    setAnalysisData(result);
  }, []);

  useEffect(() => {
    loadAnalysisData();
  }, [loadAnalysisData]);

  const handleDeleteSession = async (examId: string, category: string, sessionId: string) => {
    await removeSession(examId, category, sessionId);
    setDeleteConfirm(null);
    await loadAnalysisData();
  };

  const handleDeleteAllForExam = async (examId: string) => {
    const analyses = await getAllAnalyses(examId);
    for (const a of analyses) {
      for (const s of a.sessions) {
        await removeSession(examId, a.category, s.id);
      }
    }
    setDeleteConfirm(null);
    setExpandedExam(null);
    await loadAnalysisData();
  };

  // アカウント認証
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (authService.isConfigured()) {
      const unsub = authService.onAuthStateChange((user) => setCurrentUser(user));
      return unsub;
    }
  }, []);

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await authService.signInWithGoogle();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Google ログインに失敗しました');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      if (authTab === 'login') {
        await authService.signInWithEmail(authEmail, authPassword);
      } else {
        await authService.createUser(authEmail, authPassword);
      }
      setAuthEmail('');
      setAuthPassword('');
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : '認証に失敗しました');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await authService.signOut();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'ログアウトに失敗しました');
    } finally {
      setAuthLoading(false);
    }
  };

  // 解答時間統計
  const [responseTimeStats, setResponseTimeStats] = useState<{
    tfCount: number;
    tfAverage: number;
    mcCount: number;
    mcAverage: number;
    canAutoPersonalize: boolean;
  } | null>(null);

  // 統計情報を取得
  useEffect(() => {
    const loadStats = async () => {
      const stats = await getResponseTimeStatistics();
      setResponseTimeStats({
        tfCount: stats.stats.tfCount,
        tfAverage: Math.round(stats.stats.tfAverageMs / 1000),
        mcCount: stats.stats.mcCount,
        mcAverage: Math.round(stats.stats.mcAverageMs / 1000),
        canAutoPersonalize: stats.canAutoPersonalize
      });
    };
    loadStats();
  }, []);


  // 翻訳テキスト
  const t = {
    ja: {
      title: '⚙️ 設定',
      backButton: '← メインメニューに戻る',
      basicSettings: '🎨 基本設定',
      darkMode: 'ダークモード',
      darkModeDesc: 'アプリの外観を変更します',
      userName: 'ユーザー名',
      userNameDesc: 'ダッシュボードに表示される名前を設定します',
      userNamePlaceholder: '名前を入力してください',
      language: '言語設定',
      languageDesc: 'アプリの表示言語を選択してください',
      subjectiveFeedback: '学習効果測定',
      subjectiveFeedbackDesc: '問題回答後に理解度を記録します（オン/オフ切り替え可能）',
      timeSettings: '⏱️ 解答時間設定',
      timeSettingsDesc: '問題タイプ別の推奨解答時間をカスタマイズ',
      tfTime: '○×問題の解答時間',
      tfTimeDesc: '1問あたりの目安時間（秒）',
      mcTime: '選択問題の解答時間',
      mcTimeDesc: '1問あたりの目安時間（秒）',
      autoAdjust: '自動調整',
      autoAdjustDesc: 'あなたの実際の解答時間から自動で調整（近日実装予定）',
      helpSupport: '📚 ヘルプ・サポート',
      homepage: {
        title: '🏠 公式ホームページ',
        desc: '詳しい使い方や質問の回答をチェック'
      },
      usage: {
        title: '📖 使い方説明',
        desc: 'アプリの基本的な使い方を確認'
      },
      faq: {
        title: '❓ よくある質問',
        desc: '困ったときのヘルプ'
      },
      notice: {
        title: '⚠️ 使用上の注意',
        desc: '重要な注意事項'
      },
      systemInfo: '💻 システム情報',
      appName: 'アプリ名',
      version: 'バージョン',
      theme: 'テーマ',
      light: 'ライト',
      dark: 'ダーク',
      debug: '🔧 デバッグ・メンテナンス',
      resetDb: 'データベースリセット',
      resetDbDesc: '問題が表示されない場合やデータベースに問題がある場合に使用してください。',
      resetDbButton: '🗑️ データベースをリセット',
      showOnboarding: 'チュートリアルの再表示',
      showOnboardingDesc: 'アプリの使い方を最初から確認できます。',
      showOnboardingButton: '📚 チュートリアルを表示',
      languageChanged: '言語設定を変更しました。ページを再読み込みして反映してください。',
      on: 'オン',
      off: 'オフ',
      resetConfirm: '⚠️ データベースをリセットしますか？\n\nすべての問題、カテゴリ、履歴、問題集、セッションが削除されます。\nこの操作は元に戻せません。',
      resetSuccess: '✅ データベースをリセットしました。ページを再読み込みしてください。',
      resetError: '❌ データベースのリセットに失敗しました。',
      close: '閉じる',
      understand: '了解しました',
      learningStateEstimation: {
        title: '🔬 学習状態推定システム（新機能）',
        description: '理解度と正解/不正解の組み合わせから、確信度・適当回答・体感難易度を自動推定します',
        testButton: '📊 推定システムをテスト',
        testComplete: 'コンソールで推定結果を確認してください！'
      },
      subtopicData: {
        title: '📊 サブトピック分析データ',
        desc: '学習データから蓄積されたサブトピック重要度の分析データを管理します。',
        noData: 'まだ分析データがありません。学習プラン作成画面からサブトピック分析を行うとデータが蓄積されます。',
        sessions: 'セッション',
        problems: '問題',
        deleteSession: '削除',
        deleteAll: '全削除',
        confirmTitle: 'セッションを削除しますか？',
        confirmAllTitle: 'この試験の全分析データを削除しますか？',
        confirmDesc: 'この操作は元に戻せません。',
        cancel: 'キャンセル',
        confirmDelete: '削除する',
        confidence: '信頼度',
      },
      modals: {
        usage: {
          title: '📖 Minguella の使い方',
          quiz: {
            title: '🎯 クイズ機能',
            items: [
              'カテゴリ別・問題集別でクイズを開始できます',
              '間違えた問題のみで復習が可能です',
              '途中で保存して後から再開できます'
            ]
          },
          editor: {
            title: '✏️ 問題編集',
            items: [
              '○×問題と多択問題を作成できます',
              'CSVファイルで一括インポート・エクスポートが可能です',
              'カテゴリごとに問題を整理できます'
            ]
          },
          quizSets: {
            title: '📚 問題集管理',
            items: [
              '独自の問題集を作成・編集できます',
              '検索・フィルタリング機能で効率的に管理',
              '問題集ごとの詳細統計を確認'
            ]
          },
          stats: {
            title: '📊 統計・履歴',
            items: [
              '学習進捗を詳細に分析できます',
              '苦手問題を自動で抽出してプレイ',
              '解答履歴の詳細検索・管理'
            ]
          },
          backup: {
            title: '💾 バックアップ',
            items: [
              '自動バックアップでデータを保護',
              '手動でバックアップ作成・復元',
              'データの外部エクスポート・インポート'
            ]
          }
        },
        faq: {
          title: '❓ よくある質問',
          items: [
            {
              q: 'Q: 問題が表示されません',
              a: 'A: まず問題編集画面で問題を作成してください。または、データベースリセットを試してみてください。'
            },
            {
              q: 'Q: クイズの途中で終了してしまいました',
              a: 'A: クイズ開始画面で「保存されたクイズ」から再開できます。自動的に進捗が保存されています。'
            },
            {
              q: 'Q: CSVインポートの形式は？',
              a: 'A: カテゴリ、問題文、正解、解説の順番でCSVを作成してください。多択問題の場合は選択肢も含めてください。'
            },
            {
              q: 'Q: データが消えてしまいました',
              a: 'A: バックアップ機能で定期的にデータを保存してください。自動バックアップも有効にできます。'
            },
            {
              q: 'Q: アプリをインストールできますか？',
              a: 'A: PWA対応済みです。ブラウザで「ホーム画面に追加」を選択してアプリとして使用できます。'
            }
          ]
        },
        notice: {
          title: '⚠️ 使用上の注意',
          dataManagement: {
            title: '💾 データ管理について',
            items: [
              'データはブラウザ内に保存されます',
              'ブラウザのデータを削除するとアプリのデータも消えます',
              '定期的にバックアップを取ることを推奨します'
            ]
          },
          network: {
            title: '🌐 ネットワークについて',
            items: [
              '基本的にオフラインで動作します',
              'PWAとしてインストール可能です',
              '共有機能を使用する場合はネットワークが必要です'
            ]
          },
          privacy: {
            title: '🔒 プライバシーについて',
            items: [
              '個人情報は収集していません',
              '学習データはローカルに保存されます',
              '共有機能を使用する際は内容にご注意ください'
            ]
          }
        }
      }
    },
    en: {
      title: '⚙️ Settings',
      backButton: '← Back to Main Menu',
      basicSettings: '🎨 Basic Settings',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Change the app appearance',
      userName: 'User Name',
      userNameDesc: 'Set the name displayed on the dashboard',
      userNamePlaceholder: 'Enter your name',
      language: 'Language Settings',
      languageDesc: 'Select the display language for the app',
      subjectiveFeedback: 'Learning Assessment',
      subjectiveFeedbackDesc: 'Record understanding level after answering (ON/OFF toggle)',
      timeSettings: '⏱️ Response Time Settings',
      timeSettingsDesc: 'Customize recommended response time by question type',
      tfTime: 'True/False Question Time',
      tfTimeDesc: 'Target time per question (seconds)',
      mcTime: 'Multiple Choice Question Time',
      mcTimeDesc: 'Target time per question (seconds)',
      autoAdjust: 'Auto-adjust',
      autoAdjustDesc: 'Automatically adjust from your actual response time',
      helpSupport: '📚 Help & Support',
      homepage: {
        title: '🏠 Official Homepage',
        desc: 'Check detailed usage guides and FAQ'
      },
      usage: {
        title: '📖 How to Use',
        desc: 'Learn the basic usage of the app'
      },
      faq: {
        title: '❓ FAQ',
        desc: 'Help when you\'re in trouble'
      },
      notice: {
        title: '⚠️ Usage Notes',
        desc: 'Important notices'
      },
      systemInfo: '💻 System Information',
      appName: 'App Name',
      version: 'Version',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      debug: '🔧 Debug & Maintenance',
      resetDb: 'Database Reset',
      resetDbDesc: 'Use this if problems are not displayed or there are database issues.',
      resetDbButton: '🗑️ Reset Database',
      showOnboarding: 'Show Tutorial Again',
      showOnboardingDesc: 'Review how to use the app from the beginning.',
      showOnboardingButton: '📚 Show Tutorial',
      languageChanged: 'Language setting has been changed. Please reload the page to apply changes.',
      on: 'ON',
      off: 'OFF',
      resetConfirm: '⚠️ Are you sure you want to reset the database?\n\nAll problems, categories, history, quiz sets, and sessions will be deleted.\nThis operation cannot be undone.',
      resetSuccess: '✅ Database has been reset. Please reload the page.',
      resetError: '❌ Failed to reset the database.',
      close: 'Close',
      understand: 'Understood',
      learningStateEstimation: {
        title: '🔬 Learning State Estimation System (New Feature)',
        description: 'Automatically estimates confidence, casual answers, and perceived difficulty from understanding and correct/incorrect combinations',
        testButton: '📊 Test Estimation System',
        testComplete: 'Check the estimation results in the console!'
      },
      subtopicData: {
        title: '📊 Subtopic Analysis Data',
        desc: 'Manage subtopic importance analysis data accumulated from your learning data.',
        noData: 'No analysis data yet. Analyze subtopics from the study plan creation screen to accumulate data.',
        sessions: 'Sessions',
        problems: 'Problems',
        deleteSession: 'Delete',
        deleteAll: 'Delete All',
        confirmTitle: 'Delete this session?',
        confirmAllTitle: 'Delete all analysis data for this exam?',
        confirmDesc: 'This action cannot be undone.',
        cancel: 'Cancel',
        confirmDelete: 'Delete',
        confidence: 'Confidence',
      },
      modals: {
        usage: {
          title: '📖 How to Use Minguella',
          quiz: {
            title: '🎯 Quiz Features',
            items: [
              'Start quizzes by category or quiz set',
              'Review with wrong answers only',
              'Save progress and resume later'
            ]
          },
          editor: {
            title: '✏️ Problem Editor',
            items: [
              'Create true/false and multiple choice problems',
              'Bulk import/export with CSV files',
              'Organize problems by categories'
            ]
          },
          quizSets: {
            title: '📚 Quiz Set Management',
            items: [
              'Create and edit custom quiz sets',
              'Efficient management with search and filtering',
              'View detailed statistics for each quiz set'
            ]
          },
          stats: {
            title: '📊 Statistics & History',
            items: [
              'Analyze learning progress in detail',
              'Automatically extract and play difficult problems',
              'Detailed search and management of answer history'
            ]
          },
          backup: {
            title: '💾 Backup',
            items: [
              'Protect data with automatic backups',
              'Manually create and restore backups',
              'External data export and import'
            ]
          }
        },
        faq: {
          title: '❓ Frequently Asked Questions',
          items: [
            {
              q: 'Q: Problems are not displayed',
              a: 'A: First, create problems in the problem editor. Or try resetting the database.'
            },
            {
              q: 'Q: Quiz ended in the middle',
              a: 'A: You can resume from "Saved Quizzes" on the quiz start screen. Progress is automatically saved.'
            },
            {
              q: 'Q: What is the CSV import format?',
              a: 'A: Create CSV with category, question, answer, explanation in order. Include options for multiple choice questions.'
            },
            {
              q: 'Q: Data has been lost',
              a: 'A: Use the backup feature to save data regularly. Automatic backup can also be enabled.'
            },
            {
              q: 'Q: Can I install the app?',
              a: 'A: PWA supported. Select "Add to Home Screen" in your browser to use as an app.'
            }
          ]
        },
        notice: {
          title: '⚠️ Usage Notes',
          dataManagement: {
            title: '💾 About Data Management',
            items: [
              'Data is stored within the browser',
              'Deleting browser data will also delete app data',
              'Regular backups are recommended'
            ]
          },
          network: {
            title: '🌐 About Network',
            items: [
              'Works offline by default',
              'Can be installed as PWA',
              'Network required for sharing features'
            ]
          },
          privacy: {
            title: '🔒 About Privacy',
            items: [
              'No personal information is collected',
              'Learning data is stored locally',
              'Be careful with content when using sharing features'
            ]
          }
        }
      }
    }
  };

  const currentLang = language as keyof typeof t;

  const handleResetDatabase = async () => {
    if (confirm(t[currentLang].resetConfirm)) {
      try {
        await resetDatabase();
        alert(t[currentLang].resetSuccess);
        window.location.reload();
      } catch (error) {
        console.error('データベースリセットエラー:', error);
        alert(t[currentLang].resetError);
      }
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
    alert(t[newLanguage as keyof typeof t].languageChanged);
  };

  // 解答時間設定のハンドラー
  const handleTfTimeChange = (value: number) => {
    setTfTimePerQuestion(value);
    localStorage.setItem('tfTimePerQuestion', value.toString());
  };

  const handleMcTimeChange = (value: number) => {
    setMcTimePerQuestion(value);
    localStorage.setItem('mcTimePerQuestion', value.toString());
  };

  const handleAutoAdjustToggle = () => {
    const newValue = !autoAdjustTime;
    setAutoAdjustTime(newValue);
    localStorage.setItem('autoAdjustTime', newValue.toString());
  };

  const handleSubjectiveFeedbackToggle = () => {
    const newValue = !subjectiveFeedbackEnabled;
    console.log('Toggling subjective feedback:', {
      currentValue: subjectiveFeedbackEnabled,
      newValue,
      localStorage_before: localStorage.getItem('subjective-feedback-enabled')
    });
    setSubjectiveFeedbackEnabled(newValue);
    localStorage.setItem('subjective-feedback-enabled', newValue.toString());
    console.log('After toggle:', {
      localStorage_after: localStorage.getItem('subjective-feedback-enabled')
    });
  };

  // ユーザー名変更ハンドラー
  const handleUserNameChange = (newName: string) => {
    setUserName(newName);
    localStorage.setItem('userName', newName);
  };


  return (
    <div className="min-h-screen p-8" style={{ background: '#0F172A' }}>
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 rounded-xl text-[14px] text-[#CBD5E1] transition-colors hover:text-[#F8FAFC]"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {t[currentLang].backButton}
          </button>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">{t[currentLang].title}</h1>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 基本設定 */}
          <div className="rounded-2xl shadow-lg p-6" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-xl font-semibold text-[#F8FAFC] mb-6">
              {t[currentLang].basicSettings}
            </h2>

            <div className="space-y-6">
              {/* ユーザー名設定 */}
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2">
                  {t[currentLang].userName}
                </label>
                <p className="text-sm text-[#94A3B8] mb-3">
                  {t[currentLang].userNameDesc}
                </p>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => handleUserNameChange(e.target.value)}
                  placeholder={t[currentLang].userNamePlaceholder}
                  className="w-full px-3 py-2 rounded-md text-[#F8FAFC] focus:ring-2 focus:ring-[#6366F1] focus:border-transparent placeholder-[#64748B]"
                  style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#F8FAFC]">
                    {t[currentLang].subjectiveFeedback}
                  </label>
                  <p className="text-sm text-[#94A3B8]">
                    {t[currentLang].subjectiveFeedbackDesc}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* 大きなクリックエリア */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Toggle button clicked!', {
                        current: subjectiveFeedbackEnabled,
                        new: !subjectiveFeedbackEnabled
                      });
                      handleSubjectiveFeedbackToggle();
                    }}
                    className="px-4 py-2 rounded-lg transition-all cursor-pointer hover:shadow-md text-[14px]"
                    style={{
                      minWidth: '80px',
                      textAlign: 'center',
                      background: subjectiveFeedbackEnabled ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.1)',
                      border: subjectiveFeedbackEnabled ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.1)',
                      color: subjectiveFeedbackEnabled ? '#818CF8' : '#94A3B8'
                    }}
                  >
                    {subjectiveFeedbackEnabled ? `${t[currentLang].on}` : `${t[currentLang].off}`}
                  </button>

                  {/* 従来のトグルボタンも残す */}
                  <div
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      subjectiveFeedbackEnabled ? 'bg-[#6366F1]' : 'bg-white/10'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Small toggle clicked!');
                      handleSubjectiveFeedbackToggle();
                    }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        subjectiveFeedbackEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 学習状態推定システムのデモ */}
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <h4 className="text-sm font-medium text-[#818CF8] mb-2">
                  {t[currentLang].learningStateEstimation.title}
                </h4>
                <p className="text-xs text-[#94A3B8] mb-3">
                  {t[currentLang].learningStateEstimation.description}
                </p>
                <button
                  onClick={() => {
                    const result = demonstrateLearningStateEstimation();
                    console.log('推定システムデモ実行完了:', result);
                    alert(t[currentLang].learningStateEstimation.testComplete);
                  }}
                  className="px-3 py-2 bg-[#6366F1] hover:bg-[#5558E6] text-white text-sm rounded-xl transition"
                >
                  {t[currentLang].learningStateEstimation.testButton}
                </button>
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

              {/* ⏱️ 解答時間設定 */}
              <div>
                <h3 className="text-xl font-semibold text-[#F8FAFC] mb-2">
                  {t[currentLang].timeSettings}
                </h3>
                <p className="text-sm text-[#94A3B8] mb-4">
                  {t[currentLang].timeSettingsDesc}
                </p>

                {/* ○×問題の解答時間 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                    {t[currentLang].tfTime}
                  </label>
                  <p className="text-xs text-[#64748B] mb-2">
                    {t[currentLang].tfTimeDesc}
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      value={tfTimePerQuestion}
                      onChange={(e) => handleTfTimeChange(parseInt(e.target.value))}
                      className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                    />
                    <span className="text-lg font-semibold text-[#F8FAFC] min-w-[60px] text-right">
                      {tfTimePerQuestion}秒
                    </span>
                  </div>
                </div>

                {/* 選択問題の解答時間 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                    {t[currentLang].mcTime}
                  </label>
                  <p className="text-xs text-[#64748B] mb-2">
                    {t[currentLang].mcTimeDesc}
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="30"
                      max="300"
                      step="10"
                      value={mcTimePerQuestion}
                      onChange={(e) => handleMcTimeChange(parseInt(e.target.value))}
                      className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                    />
                    <span className="text-lg font-semibold text-[#F8FAFC] min-w-[60px] text-right">
                      {mcTimePerQuestion}秒
                    </span>
                  </div>
                </div>

                {/* 自動調整 */}
                <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-sm font-medium text-[#F8FAFC]">
                        🤖 自動調整
                      </label>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        あなたの実際の解答時間から自動で最適化
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        ※ 適当回答除外: ○×1秒未満・選択3秒未満は計算対象外
                      </p>
                    </div>
                    <button
                      onClick={handleAutoAdjustToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoAdjustTime
                          ? 'bg-[#6366F1]'
                          : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoAdjustTime ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 統計情報の表示 */}
                  {responseTimeStats && (
                    <div className="text-xs space-y-1 text-[#94A3B8] pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex justify-between">
                        <span>○×問題:</span>
                        <span className="font-semibold">
                          {responseTimeStats.tfCount > 0
                            ? `平均 ${responseTimeStats.tfAverage}秒 (${responseTimeStats.tfCount}問のデータ)`
                            : 'データなし'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>選択問題:</span>
                        <span className="font-semibold">
                          {responseTimeStats.mcCount > 0
                            ? `平均 ${responseTimeStats.mcAverage}秒 (${responseTimeStats.mcCount}問のデータ)`
                            : 'データなし'}
                        </span>
                      </div>
                      {responseTimeStats.canAutoPersonalize ? (
                        <p className="text-[#34D399] mt-2">
                          十分なデータがあります。自動調整が有効です。
                        </p>
                      ) : (
                        <p className="text-[#F59E0B] mt-2">
                          データが不足しています。10問以上解答すると自動調整が有効になります。
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2">
                  {t[currentLang].language}
                </label>
                <p className="text-sm text-[#94A3B8] mb-3">
                  {t[currentLang].languageDesc}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleLanguageChange('ja')}
                    className={`px-4 py-2 rounded-xl transition-colors text-sm ${
                      language === 'ja'
                        ? 'bg-[#6366F1] text-white'
                        : 'text-[#CBD5E1]'
                    }`}
                    style={language !== 'ja' ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' } : {}}
                  >
                    日本語
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`px-4 py-2 rounded-xl transition-colors text-sm ${
                      language === 'en'
                        ? 'bg-[#6366F1] text-white'
                        : 'text-[#CBD5E1]'
                    }`}
                    style={language !== 'en' ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' } : {}}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ヘルプ・サポート */}
          <div className="rounded-2xl shadow-lg p-6" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-xl font-semibold text-[#F8FAFC] mb-6">
              {t[currentLang].helpSupport}
            </h2>

            <div className="space-y-2">
              {[
                { onClick: () => window.open('https://minguella-website.netlify.app/', '_blank'), icon: '🏠', title: t[currentLang].homepage.title, desc: t[currentLang].homepage.desc, extra: <span className="ml-auto text-[#64748B] text-sm">↗</span> },
                { onClick: () => setShowUsage(true), icon: '📖', title: t[currentLang].usage.title, desc: t[currentLang].usage.desc },
                { onClick: () => setShowHelp(true), icon: '❓', title: t[currentLang].faq.title, desc: t[currentLang].faq.desc },
                { onClick: () => setShowNotice(true), icon: '⚠️', title: t[currentLang].notice.title, desc: t[currentLang].notice.desc },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.onClick}
                  className="w-full px-[18px] py-[13px] text-left rounded-xl transition-colors hover:bg-white/5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{item.icon}</span>
                    <div>
                      <div className="font-medium text-[14px] text-[#CBD5E1]">{item.title}</div>
                      <div className="text-sm text-[#64748B]">{item.desc}</div>
                    </div>
                    {item.extra}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* システム情報 */}
          <div className="rounded-2xl shadow-lg p-6" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-xl font-semibold text-[#F8FAFC] mb-6">
              {t[currentLang].systemInfo}
            </h2>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between px-[18px] py-[13px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-[14px] text-[#94A3B8]">{t[currentLang].appName}:</span>
                <span className="font-medium text-[#F8FAFC]">Minguella</span>
              </div>
              <div className="flex justify-between px-[18px] py-[13px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-[14px] text-[#94A3B8]">{t[currentLang].version}:</span>
                <span className="font-medium text-[#F8FAFC]">1.0.0</span>
              </div>
              <div className="flex justify-between px-[18px] py-[13px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-[14px] text-[#94A3B8]">{t[currentLang].language}:</span>
                <span className="font-medium text-[#F8FAFC]">{language === 'ja' ? '日本語' : 'English'}</span>
              </div>
              <div className="flex justify-between px-[18px] py-[13px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-[14px] text-[#94A3B8]">{t[currentLang].theme}:</span>
                <span className="font-medium text-[#F8FAFC]">{isDarkMode ? t[currentLang].dark : t[currentLang].light}</span>
              </div>
            </div>
          </div>

          {/* アカウント認証 */}
          {authService.isConfigured() && (
            <div className="rounded-2xl shadow-lg p-6" style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 className="text-xl font-semibold text-[#F8FAFC] mb-6">
                👤 アカウント
              </h2>

              {currentUser ? (
                /* ログイン済み状態 */
                <div className="space-y-4">
                  <div className="rounded-lg p-4" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-sm font-medium text-[#34D399]">ログイン済み</p>
                    <p className="text-sm text-[#10B981] mt-1">
                      {currentUser.email || currentUser.displayName || 'アノニマス'}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={authLoading}
                    className="w-full px-4 py-2 rounded-xl text-[#CBD5E1] text-sm transition-all disabled:opacity-50 hover:bg-white/5"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {authLoading ? '処理中...' : 'ログアウト'}
                  </button>
                </div>
              ) : (
                /* 未ログイン状態 */
                <div className="space-y-4">
                  {/* Google ログイン */}
                  <button
                    onClick={handleGoogleLogin}
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[#CBD5E1] text-sm font-medium transition-all disabled:opacity-50 hover:bg-white/5"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.154-1.85H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.975 2.684-6.775z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H-.027v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.957H.927A8.996 8.996 0 000 9c0 1.452.348 2.827.927 4.043l3.037-2.333z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.927 4.957L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    Googleでログイン
                  </button>

                  {/* メール・パスワード認証 */}
                  <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* タブ切り替え */}
                    <div className="flex gap-1 mb-3 rounded-md p-0.5" style={{ background: 'rgba(15,23,42,0.5)' }}>
                      <button
                        onClick={() => { setAuthTab('login'); setAuthError(''); }}
                        className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${
                          authTab === 'login'
                            ? 'text-[#F8FAFC] shadow-sm'
                            : 'text-[#64748B] hover:text-[#CBD5E1]'
                        }`}
                        style={authTab === 'login' ? { background: 'rgba(99,102,241,0.3)' } : {}}
                      >
                        ログイン
                      </button>
                      <button
                        onClick={() => { setAuthTab('register'); setAuthError(''); }}
                        className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${
                          authTab === 'register'
                            ? 'text-[#F8FAFC] shadow-sm'
                            : 'text-[#64748B] hover:text-[#CBD5E1]'
                        }`}
                        style={authTab === 'register' ? { background: 'rgba(99,102,241,0.3)' } : {}}
                      >
                        新規登録
                      </button>
                    </div>

                    {/* フォーム */}
                    <div className="space-y-2">
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="メールアドレス"
                        className="w-full px-3 py-2 text-sm rounded-md text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                        style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="パスワード（6文字以上）"
                        onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                        className="w-full px-3 py-2 text-sm rounded-md text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                        style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      {authError && (
                        <p className="text-xs text-[#EF4444]">{authError}</p>
                      )}
                      <button
                        onClick={handleEmailAuth}
                        disabled={authLoading || !authEmail || !authPassword}
                        className="w-full px-4 py-2 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-xl transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {authLoading ? '処理中...' : authTab === 'login' ? 'ログイン' : '新規登録'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* サブスクリプション管理 */}
          <SubscriptionSection onNavigate={onNavigate} />

          {/* サブトピック分析データ管理 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t[currentLang].subtopicData.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t[currentLang].subtopicData.desc}
            </p>

            {analysisData.size === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t[currentLang].subtopicData.noData}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from(analysisData.entries()).map(([examId, entry]) => (
                  <div key={examId} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                    {/* プリセットヘッダー */}
                    <div
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setExpandedExam(expandedExam === examId ? null : examId)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-400">
                          {expandedExam === examId ? '▾' : '▸'}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {entry.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({entry.analyses.length} {currentLang === 'ja' ? 'カテゴリ' : 'categories'})
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ examId, category: '__all__' });
                        }}
                        className="px-2 py-1 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      >
                        {t[currentLang].subtopicData.deleteAll}
                      </button>
                    </div>

                    {/* カテゴリ一覧（展開時） */}
                    {expandedExam === examId && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {entry.growthStatuses.map((gs) => {
                          const analysis = entry.analyses.find(a => a.category === gs.category);
                          const categoryKey = `${examId}:${gs.category}`;
                          const isExpanded = expandedCategory === categoryKey;

                          return (
                            <div key={gs.category} className="px-3 py-2">
                              {/* カテゴリヘッダー */}
                              <div
                                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded p-1 -mx-1 transition-colors"
                                onClick={() => setExpandedCategory(isExpanded ? null : categoryKey)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{gs.growthEmoji}</span>
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {gs.category}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ({gs.growthLabel[currentLang]})
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                  <span>{t[currentLang].subtopicData.sessions}: {gs.sessionCount}</span>
                                  <span>{t[currentLang].subtopicData.problems}: {gs.totalProblems}</span>
                                  <span>{t[currentLang].subtopicData.confidence}: {gs.confidence}</span>
                                </div>
                              </div>

                              {/* セッション一覧（展開時） */}
                              {isExpanded && analysis && (
                                <div className="mt-2 ml-8 space-y-1">
                                  {analysis.sessions.map((session) => (
                                    <div
                                      key={session.id}
                                      className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-700/30 rounded text-sm"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-gray-600 dark:text-gray-300">
                                          {new Date(session.analyzedAt).toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US')}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                          ({session.totalProblems}{currentLang === 'ja' ? '問' : ' problems'})
                                        </span>
                                        {session.sourceYear && (
                                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                            {session.sourceYear}{currentLang === 'ja' ? '年' : ''}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => setDeleteConfirm({ examId, category: gs.category, sessionId: session.id })}
                                        className="px-2 py-0.5 text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                      >
                                        {t[currentLang].subtopicData.deleteSession}
                                      </button>
                                    </div>
                                  ))}

                                  {/* サブトピック分布プレビュー */}
                                  {analysis.mergedDistribution && Object.keys(analysis.mergedDistribution).length > 0 && (
                                    <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                                      <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                                        {currentLang === 'ja' ? 'サブトピック分布:' : 'Subtopic distribution:'}
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {Object.entries(analysis.mergedDistribution)
                                          .sort(([, a], [, b]) => b - a)
                                          .slice(0, 8)
                                          .map(([name, count]) => (
                                            <span
                                              key={name}
                                              className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 rounded"
                                            >
                                              {name}: {count}
                                            </span>
                                          ))}
                                        {Object.keys(analysis.mergedDistribution).length > 8 && (
                                          <span className="text-xs text-purple-500 dark:text-purple-400">
                                            +{Object.keys(analysis.mergedDistribution).length - 8}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* デバッグ・メンテナンス */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t[currentLang].debug}
            </h2>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                {t[currentLang].resetDb}
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                {t[currentLang].resetDbDesc}
              </p>
              <button
                onClick={handleResetDatabase}
                className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-all text-sm shadow-md hover:shadow-lg backdrop-blur-sm"
              >
                {t[currentLang].resetDbButton}
              </button>
            </div>

            {/* チュートリアル再表示 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                {t[currentLang].showOnboarding}
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                {t[currentLang].showOnboardingDesc}
              </p>
              <button
                onClick={() => {
                  localStorage.removeItem('onboardingCompleted');
                  onShowOnboarding?.();
                }}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-all text-sm shadow-md hover:shadow-lg backdrop-blur-sm"
              >
                {t[currentLang].showOnboardingButton}
              </button>
            </div>
          </div>
        </div>

        {/* 削除確認ダイアログ */}
        {deleteConfirm && createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-6"
              style={{ maxWidth: '400px', width: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {deleteConfirm.category === '__all__'
                  ? t[currentLang].subtopicData.confirmAllTitle
                  : t[currentLang].subtopicData.confirmTitle}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t[currentLang].subtopicData.confirmDesc}
              </p>
              {deleteConfirm.category !== '__all__' && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  {deleteConfirm.category} - {deleteConfirm.sessionId && (
                    <span className="text-gray-500">Session ID: {deleteConfirm.sessionId.slice(0, 8)}...</span>
                  )}
                </p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t[currentLang].subtopicData.cancel}
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirm.category === '__all__') {
                      handleDeleteAllForExam(deleteConfirm.examId);
                    } else if (deleteConfirm.sessionId) {
                      handleDeleteSession(deleteConfirm.examId, deleteConfirm.category, deleteConfirm.sessionId);
                    }
                  }}
                  className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  {t[currentLang].subtopicData.confirmDelete}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* 使い方説明モーダル */}
        {showUsage && createPortal(
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setShowUsage(false)}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600"
              style={{
                maxWidth: '1024px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t[currentLang].modals.usage.title}</h3>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] bg-white dark:bg-gray-800">
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base border-b border-gray-200 dark:border-gray-600 pb-2">{t[currentLang].modals.usage.quiz.title}</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-2">
                      {t[currentLang].modals.usage.quiz.items.map((item, index) => (
                        <li key={index} className="flex items-start bg-green-50 dark:bg-green-900/20 p-2 rounded border-l-4 border-green-400">
                          <span className="text-green-600 mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base border-b border-gray-200 dark:border-gray-600 pb-2">{t[currentLang].modals.usage.editor.title}</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-2">
                      {t[currentLang].modals.usage.editor.items.map((item, index) => (
                        <li key={index} className="flex items-start bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border-l-4 border-yellow-400">
                          <span className="text-yellow-600 mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base border-b border-gray-200 dark:border-gray-600 pb-2">{t[currentLang].modals.usage.quizSets.title}</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-2">
                      {t[currentLang].modals.usage.quizSets.items.map((item, index) => (
                        <li key={index} className="flex items-start bg-purple-50 dark:bg-purple-900/20 p-2 rounded border-l-4 border-purple-400">
                          <span className="text-purple-600 mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base border-b border-gray-200 dark:border-gray-600 pb-2">{t[currentLang].modals.usage.stats.title}</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-2">
                      {t[currentLang].modals.usage.stats.items.map((item, index) => (
                        <li key={index} className="flex items-start bg-orange-50 dark:bg-orange-900/20 p-2 rounded border-l-4 border-orange-400">
                          <span className="text-orange-600 mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base border-b border-gray-200 dark:border-gray-600 pb-2">{t[currentLang].modals.usage.backup.title}</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-2">
                      {t[currentLang].modals.usage.backup.items.map((item, index) => (
                        <li key={index} className="flex items-start bg-cyan-50 dark:bg-cyan-900/20 p-2 rounded border-l-4 border-cyan-400">
                          <span className="text-cyan-600 mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setShowUsage(false)}
                  className="quiz-action-button"
                >
                  {t[currentLang].close}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ヘルプモーダル */}
        {showHelp && createPortal(
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setShowHelp(false)}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600"
              style={{
                maxWidth: '1024px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t[currentLang].modals.faq.title}</h3>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] bg-white dark:bg-gray-800">
                <div className="space-y-4">
                  {t[currentLang].modals.faq.items.map((item, index) => (
                    <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base">{item.q}</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed bg-blue-50 dark:bg-blue-900/20 p-3 rounded border-l-4 border-blue-400">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setShowHelp(false)}
                  className="quiz-action-button"
                >
                  {t[currentLang].close}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* 注意事項モーダル */}
        {showNotice && createPortal(
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setShowNotice(false)}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600"
              style={{
                maxWidth: '1024px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t[currentLang].modals.notice.title}</h3>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] bg-white dark:bg-gray-800">
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">{t[currentLang].modals.notice.dataManagement.title}</h4>
                    <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                      {t[currentLang].modals.notice.dataManagement.items.map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">{t[currentLang].modals.notice.network.title}</h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      {t[currentLang].modals.notice.network.items.map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">{t[currentLang].modals.notice.privacy.title}</h4>
                    <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                      {t[currentLang].modals.notice.privacy.items.map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setShowNotice(false)}
                  className="quiz-action-button"
                >
                  {t[currentLang].understand}
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

// ============================================================
// サブスクリプション管理セクション
// ============================================================

const PLAN_BADGE_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  basic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  premium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function SubscriptionSection({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const { plan, periodEnd, cancelAtPeriodEnd, openCustomerPortal, loading } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManageSubscription = async () => {
    setError(null);
    setPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : '管理画面を開けませんでした');
      setPortalLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Crown className="size-5 text-amber-500" />
        サブスクリプション
      </h2>

      <div className="space-y-4">
        {/* 現在のプラン */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">現在のプラン</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE_COLORS[plan]}`}>
            {plan === 'free' ? 'スタンダード' : plan === 'basic' ? 'プロ' : 'プレミアム'}
          </span>
        </div>

        {/* 請求情報（有料プランのみ） */}
        {plan !== 'free' && periodEnd && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {cancelAtPeriodEnd ? '終了日' : '次回請求日'}
            </span>
            <span className="text-sm text-gray-900 dark:text-white">
              {periodEnd.toLocaleDateString('ja-JP')}
            </span>
          </div>
        )}

        {cancelAtPeriodEnd && (
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              期間終了時にキャンセルされます
            </p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* アクションボタン */}
        <div className="flex flex-col gap-2">
          {plan === 'free' ? (
            <button
              onClick={() => onNavigate?.('pricing')}
              className="w-full py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all text-sm flex items-center justify-center gap-2"
            >
              <Crown className="size-4" />
              プランをアップグレード
            </button>
          ) : (
            <>
              <button
                onClick={() => onNavigate?.('pricing')}
                className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all text-sm"
              >
                プラン変更
              </button>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all text-sm disabled:opacity-50"
              >
                {portalLoading ? '読み込み中...' : 'お支払い管理（Stripe）'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
