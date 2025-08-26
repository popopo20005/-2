import { useState } from 'react';
import { createPortal } from 'react-dom';
import { resetDatabase } from '../lib/database';

interface SettingsProps {
  onBack: () => void;
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
}

export function Settings({ onBack, onToggleDarkMode, isDarkMode }: SettingsProps) {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');
  const [showHelp, setShowHelp] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const [showNotice, setShowNotice] = useState(false);


  // 翻訳テキスト
  const t = {
    ja: {
      title: '⚙️ 設定',
      backButton: '← メインメニューに戻る',
      basicSettings: '🎨 基本設定',
      darkMode: 'ダークモード',
      darkModeDesc: 'アプリの外観を変更します',
      language: '言語設定',
      languageDesc: 'アプリの表示言語を選択してください',
      helpSupport: '📚 ヘルプ・サポート',
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
      languageChanged: '言語設定を変更しました。ページを再読み込みして反映してください。',
      resetConfirm: '⚠️ データベースをリセットしますか？\n\nすべての問題、カテゴリ、履歴、問題集、セッションが削除されます。\nこの操作は元に戻せません。',
      resetSuccess: '✅ データベースをリセットしました。ページを再読み込みしてください。',
      resetError: '❌ データベースのリセットに失敗しました。',
      close: '閉じる',
      understand: '了解しました',
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
      language: 'Language Settings',
      languageDesc: 'Select the display language for the app',
      helpSupport: '📚 Help & Support',
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
      languageChanged: 'Language setting has been changed. Please reload the page to apply changes.',
      resetConfirm: '⚠️ Are you sure you want to reset the database?\n\nAll problems, categories, history, quiz sets, and sessions will be deleted.\nThis operation cannot be undone.',
      resetSuccess: '✅ Database has been reset. Please reload the page.',
      resetError: '❌ Failed to reset the database.',
      close: 'Close',
      understand: 'Understood',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="quiz-action-button mb-4"
          >
            {t[currentLang].backButton}
          </button>
          <h1 className="text-3xl font-bold text-teal-900 dark:text-white">{t[currentLang].title}</h1>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 基本設定 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t[currentLang].basicSettings}
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    {t[currentLang].darkMode}
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-200">
                    {t[currentLang].darkModeDesc}
                  </p>
                </div>
                <button
                  onClick={onToggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDarkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <hr className="border-gray-200 dark:border-gray-700" />
              
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t[currentLang].language}
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-200 mb-3">
                  {t[currentLang].languageDesc}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleLanguageChange('ja')}
                    className={`px-4 py-2 rounded-md transition-colors text-sm ${
                      language === 'ja' 
                        ? 'bg-blue-500 text-white' 
                        : 'quiz-action-button'
                    }`}
                  >
                    🇯🇵 日本語
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`px-4 py-2 rounded-md transition-colors text-sm ${
                      language === 'en' 
                        ? 'bg-blue-500 text-white' 
                        : 'quiz-action-button'
                    }`}
                  >
                    🇺🇸 English
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ヘルプ・サポート */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t[currentLang].helpSupport}
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={() => setShowUsage(true)}
                className="quiz-action-button w-full p-4 text-left"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📖</span>
                  <div>
                    <div className="font-medium">{t[currentLang].usage.title}</div>
                    <div className="text-sm opacity-90">{t[currentLang].usage.desc}</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowHelp(true)}
                className="quiz-action-button w-full p-4 text-left"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">❓</span>
                  <div>
                    <div className="font-medium">{t[currentLang].faq.title}</div>
                    <div className="text-sm opacity-90">{t[currentLang].faq.desc}</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowNotice(true)}
                className="quiz-action-button w-full p-4 text-left"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div>
                    <div className="font-medium">{t[currentLang].notice.title}</div>
                    <div className="text-sm opacity-90">{t[currentLang].notice.desc}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* システム情報 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {t[currentLang].systemInfo}
            </h2>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-200">{t[currentLang].appName}:</span>
                <span className="font-medium text-gray-900 dark:text-white">Minguella</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-200">{t[currentLang].version}:</span>
                <span className="font-medium text-gray-900 dark:text-white">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-200">{t[currentLang].language}:</span>
                <span className="font-medium text-gray-900 dark:text-white">{language === 'ja' ? '日本語' : 'English'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-200">{t[currentLang].theme}:</span>
                <span className="font-medium text-gray-900 dark:text-white">{isDarkMode ? t[currentLang].dark : t[currentLang].light}</span>
              </div>
            </div>
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
          </div>
        </div>

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
                    <h4 className="font-medium mb-2" style={{ color: isDarkMode ? '#fef3c7' : '#1f2937' }}>{t[currentLang].modals.notice.dataManagement.title}</h4>
                    <ul className="text-sm space-y-1" style={{ color: isDarkMode ? '#fde68a' : '#374151' }}>
                      {t[currentLang].modals.notice.dataManagement.items.map((item, index) => (
                        <li key={index} style={{ color: isDarkMode ? '#fde68a' : '#374151' }}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium mb-2" style={{ color: isDarkMode ? '#dbeafe' : '#1f2937' }}>{t[currentLang].modals.notice.network.title}</h4>
                    <ul className="text-sm space-y-1" style={{ color: isDarkMode ? '#bfdbfe' : '#374151' }}>
                      {t[currentLang].modals.notice.network.items.map((item, index) => (
                        <li key={index} style={{ color: isDarkMode ? '#bfdbfe' : '#374151' }}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-medium mb-2" style={{ color: isDarkMode ? '#fecaca' : '#1f2937' }}>{t[currentLang].modals.notice.privacy.title}</h4>
                    <ul className="text-sm space-y-1" style={{ color: isDarkMode ? '#fca5a5' : '#374151' }}>
                      {t[currentLang].modals.notice.privacy.items.map((item, index) => (
                        <li key={index} style={{ color: isDarkMode ? '#fca5a5' : '#374151' }}>• {item}</li>
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

