import { useState } from 'react';
import { FileText, Upload, Sparkles, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { db } from '../../lib/database';
import type { Problem } from '../../types/index';

interface ImportStepProps {
  onNext: () => void;
  onBack: () => void;
  language?: 'ja' | 'en';
  selectedGoal?: string;
}

type ImportOption = 'csv' | 'sample' | 'skip';

/**
 * オンボーディング: データインポート画面
 *
 * CSV読み込み、サンプル問題、スキップのいずれかを選択
 */
export function ImportStep({ onNext, onBack, language = 'ja', selectedGoal }: ImportStepProps) {
  const [selectedOption, setSelectedOption] = useState<ImportOption | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // 目標に応じたサブタイトルとレコメンデーションを生成
  const getGoalBasedContent = () => {
    const baseContent = {
      ja: {
        exam: {
          subtitle: '試験合格を目指すあなたへ：過去問や模擬試験をインポートしましょう',
          sampleDesc: '試験対策に最適な5問で開始',
        },
        daily: {
          subtitle: '毎日学習を習慣化：少しずつ問題を追加していきましょう',
          sampleDesc: '軽い問題で学習習慣をスタート',
        },
        skill: {
          subtitle: 'スキルアップを目指すあなたへ：専門分野の問題を準備しましょう',
          sampleDesc: '基礎から始める5問のサンプル',
        },
        review: {
          subtitle: '復習中心の学習：既存の知識を確認する問題を用意しましょう',
          sampleDesc: '復習に最適な5問で開始',
        },
      },
      en: {
        exam: {
          subtitle: 'For exam success: Import past papers or practice tests',
          sampleDesc: '5 problems optimized for exam prep',
        },
        daily: {
          subtitle: 'Build daily habits: Add problems gradually',
          sampleDesc: 'Start your learning habit with easy problems',
        },
        skill: {
          subtitle: 'For skill development: Prepare specialized problems',
          sampleDesc: '5 sample problems from basics',
        },
        review: {
          subtitle: 'Review-focused learning: Prepare problems to test existing knowledge',
          sampleDesc: 'Start with 5 review-optimized problems',
        },
      },
    };

    const goalContent = selectedGoal ? baseContent[language][selectedGoal as keyof typeof baseContent['ja']] : null;

    return {
      subtitle: goalContent?.subtitle || (language === 'ja'
        ? 'CSVファイルから問題を読み込むか、サンプル問題で始めましょう'
        : 'Import from CSV file or start with sample problems'),
      sampleDesc: goalContent?.sampleDesc || (language === 'ja'
        ? '5問のサンプルで今すぐ開始'
        : 'Start immediately with 5 sample problems'),
    };
  };

  const goalBasedContent = getGoalBasedContent();

  const content = {
    ja: {
      step: 'ステップ 4 / 5',
      title: '問題をインポート',
      subtitle: goalBasedContent.subtitle,
      csvTitle: 'CSVファイルから読み込む',
      csvDesc: '既存の問題集をインポート',
      sampleTitle: 'サンプル問題で始める',
      sampleDesc: goalBasedContent.sampleDesc,
      skipTitle: 'スキップ',
      skipDesc: '後で自分で問題を作成',
      uploadButton: 'ファイルを選択',
      importSampleButton: 'サンプルを読み込む',
      nextButton: '次へ',
      backButton: '戻る',
      importing: '読み込み中...',
      importSuccessMessage: '問題を読み込みました！',
    },
    en: {
      step: 'Step 4 / 5',
      title: 'Import Problems',
      subtitle: goalBasedContent.subtitle,
      csvTitle: 'Import from CSV',
      csvDesc: 'Import existing problem sets',
      sampleTitle: 'Start with Samples',
      sampleDesc: goalBasedContent.sampleDesc,
      skipTitle: 'Skip',
      skipDesc: 'Create problems later',
      uploadButton: 'Select File',
      importSampleButton: 'Load Samples',
      nextButton: 'Next',
      backButton: 'Back',
      importing: 'Importing...',
      importSuccessMessage: 'Problems imported successfully!',
    },
  };

  const t = content[language];

  // サンプル問題データ
  const sampleProblems: Omit<Problem, 'id'>[] = [
    {
      question: language === 'ja' ? '日本の首都はどこですか？' : 'What is the capital of Japan?',
      options: language === 'ja' ? ['大阪', '東京', '京都', '名古屋'] : ['Osaka', 'Tokyo', 'Kyoto', 'Nagoya'],
      correctAnswer: 1,
      explanation: language === 'ja' ? '日本の首都は東京です。' : 'The capital of Japan is Tokyo.',
      category: language === 'ja' ? '地理' : 'Geography',
      type: 'multiple-choice' as const,
    },
    {
      question: language === 'ja' ? '光の速度は約何km/sですか？' : 'What is the speed of light (approx.)?',
      options: language === 'ja' ? ['100,000 km/s', '200,000 km/s', '300,000 km/s', '400,000 km/s'] : ['100,000 km/s', '200,000 km/s', '300,000 km/s', '400,000 km/s'],
      correctAnswer: 2,
      explanation: language === 'ja' ? '光の速度は真空中で約299,792 km/s（約30万km/s）です。' : 'The speed of light in vacuum is approximately 299,792 km/s.',
      category: language === 'ja' ? '物理' : 'Physics',
      type: 'multiple-choice' as const,
    },
    {
      question: language === 'ja' ? '水の化学式は？' : 'What is the chemical formula of water?',
      options: ['H2O', 'CO2', 'O2', 'N2'],
      correctAnswer: 0,
      explanation: language === 'ja' ? '水は水素原子2個と酸素原子1個からなり、H2Oと表されます。' : 'Water consists of 2 hydrogen atoms and 1 oxygen atom, represented as H2O.',
      category: language === 'ja' ? '化学' : 'Chemistry',
      type: 'multiple-choice' as const,
    },
    {
      question: language === 'ja' ? 'DNAの二重らせん構造を発見したのは誰？' : 'Who discovered the DNA double helix structure?',
      options: language === 'ja'
        ? ['アインシュタイン', 'ダーウィン', 'ワトソンとクリック', 'ニュートン']
        : ['Einstein', 'Darwin', 'Watson and Crick', 'Newton'],
      correctAnswer: 2,
      explanation: language === 'ja'
        ? 'ワトソンとクリックが1953年にDNAの二重らせん構造を発見しました。'
        : 'Watson and Crick discovered the DNA double helix structure in 1953.',
      category: language === 'ja' ? '生物' : 'Biology',
      type: 'multiple-choice' as const,
    },
    {
      question: language === 'ja' ? '1 + 1 = ？' : '1 + 1 = ?',
      options: ['1', '2', '3', '4'],
      correctAnswer: 1,
      explanation: language === 'ja' ? '1に1を足すと2になります。' : '1 plus 1 equals 2.',
      category: language === 'ja' ? '算数' : 'Math',
      type: 'multiple-choice' as const,
    },
  ];

  const handleImportSample = async () => {
    setIsImporting(true);
    try {
      // サンプル問題セットを作成
      const quizSetId = await db.quizSets.add({
        name: language === 'ja' ? 'サンプル問題集' : 'Sample Quiz Set',
        description: language === 'ja' ? 'オンボーディングで追加されたサンプル問題' : 'Sample problems added during onboarding',
        problemIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 問題を追加
      const problemIds: number[] = [];
      for (const problem of sampleProblems) {
        const problemId = await db.problems.add({
          ...problem,
        });
        problemIds.push(problemId);
      }

      // QuizSetのproblemIdsを更新
      await db.quizSets.update(quizSetId, { problemIds });

      setImportSuccess(true);
      setSelectedOption('sample');

      // 少し待ってから次へ
      setTimeout(() => {
        onNext();
      }, 1500);
    } catch (error) {
      console.error('Failed to import sample problems:', error);
      alert(language === 'ja' ? 'サンプル問題の読み込みに失敗しました' : 'Failed to import sample problems');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // CSV読み込みロジックは後で実装（既存のCSVインポート機能を使用）
    setSelectedOption('csv');
    alert(language === 'ja' ? 'CSV読み込み機能は開発中です' : 'CSV import feature is under development');
  };

  const handleSkip = () => {
    setSelectedOption('skip');
    onNext();
  };

  return (
    <div
      style={{
        background: 'linear-gradient(to bottom right, #eff6ff, #ffffff, #faf5ff)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* プログレスバー - 最上部に固定 */}
      <div style={{
        width: '100%',
        padding: '16px 16px 0 16px',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ maxWidth: '448px', margin: '0 auto', paddingBottom: '16px' }}>
          <p style={{
            textAlign: 'center',
            fontWeight: '600',
            marginBottom: '12px',
            fontSize: '14px',
            color: '#374151'
          }}>
            {t.step}
          </p>
          <div
            style={{
              height: '8px',
              borderRadius: '9999px',
              overflow: 'hidden',
              background: '#e5e7eb',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <div
              style={{
                height: '100%',
                width: '80%',
                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.6)',
                borderRadius: '9999px',
                transition: 'all 0.7s ease-out'
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto flex flex-col items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* タイトル */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
              {t.title}
            </h1>
            <p className="text-sm" style={{ color: '#4b5563' }}>
              {t.subtitle}
            </p>
          </div>

          {/* インポート成功メッセージ */}
          {importSuccess && (
            <div style={{
              background: '#f0fdf4',
              border: '2px solid #86efac',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <CheckCircle2 style={{ width: '24px', height: '24px', color: '#16a34a' }} />
              <p style={{ color: '#15803d', fontWeight: '600' }}>
                {t.importSuccessMessage}
              </p>
            </div>
          )}

          {/* オプション選択 */}
          <div className="space-y-4">
            {/* オプション1: CSV読み込み */}
            <div style={{
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: selectedOption === 'csv' ? '3px solid #3b82f6' : '2px solid rgba(0,0,0,0.1)',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: selectedOption === 'csv' ? '0 12px 24px rgba(59, 130, 246, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
              padding: '24px'
            }}>
              <div className="flex items-start gap-4">
                <div style={{
                  flexShrink: 0,
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 16px rgba(59, 130, 246, 0.4)'
                }}>
                  <Upload style={{ width: '28px', height: '28px', color: '#ffffff' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1" style={{ color: '#111827' }}>
                    {t.csvTitle}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: '#4b5563' }}>
                    {t.csvDesc}
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 font-semibold rounded-lg transition-all duration-300"
                      style={{
                        background: '#ffffff',
                        border: '2px solid #3b82f6',
                        padding: '10px 20px',
                        fontSize: '14px',
                        color: '#3b82f6',
                        cursor: 'pointer'
                      }}
                      onClick={() => document.getElementById('csv-upload')?.click()}
                    >
                      <FileText className="size-4" />
                      {t.uploadButton}
                    </button>
                  </label>
                </div>
              </div>
            </div>

            {/* オプション2: サンプル問題 */}
            <div style={{
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: selectedOption === 'sample' ? '3px solid #8b5cf6' : '2px solid rgba(0,0,0,0.1)',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: selectedOption === 'sample' ? '0 12px 24px rgba(139, 92, 246, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
              padding: '24px'
            }}>
              <div className="flex items-start gap-4">
                <div style={{
                  flexShrink: 0,
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 16px rgba(139, 92, 246, 0.4)'
                }}>
                  <Sparkles style={{ width: '28px', height: '28px', color: '#ffffff' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1" style={{ color: '#111827' }}>
                    {t.sampleTitle}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: '#4b5563' }}>
                    {t.sampleDesc}
                  </p>
                  <button
                    onClick={handleImportSample}
                    disabled={isImporting || importSuccess}
                    className="inline-flex items-center gap-2 font-bold rounded-xl transition-all duration-300"
                    style={{
                      background: (isImporting || importSuccess) ? '#9ca3af' : 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                      padding: '10px 20px',
                      fontSize: '14px',
                      color: '#ffffff',
                      cursor: (isImporting || importSuccess) ? 'not-allowed' : 'pointer',
                      border: 'none',
                      boxShadow: (isImporting || importSuccess) ? 'none' : '0 4px 12px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    <Sparkles className="size-4" />
                    {isImporting ? t.importing : t.importSampleButton}
                  </button>
                </div>
              </div>
            </div>

            {/* オプション3: スキップ */}
            <div
              onClick={handleSkip}
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s',
                border: selectedOption === 'skip' ? '3px solid #6b7280' : '2px solid rgba(0,0,0,0.1)',
                borderRadius: '16px',
                background: '#ffffff',
                boxShadow: selectedOption === 'skip' ? '0 12px 24px rgba(107, 114, 128, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
                padding: '24px'
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1" style={{ color: '#111827' }}>
                    {t.skipTitle}
                  </h3>
                  <p className="text-sm" style={{ color: '#4b5563' }}>
                    {t.skipDesc}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ナビゲーションボタン */}
          <div className="flex justify-between pt-4 gap-4">
            <button
              onClick={onBack}
              disabled={isImporting}
              className="font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3"
              style={{
                background: '#ffffff',
                border: '2px solid #d1d5db',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                padding: '16px 32px',
                fontSize: '16px',
                color: '#374151',
                cursor: isImporting ? 'not-allowed' : 'pointer',
                opacity: isImporting ? 0.6 : 1
              }}
            >
              <ArrowLeft className="size-5" />
              {t.backButton}
            </button>
            <button
              onClick={onNext}
              disabled={!selectedOption || isImporting}
              className="font-bold rounded-3xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-4"
              style={{
                background: (selectedOption && !isImporting) ? '#1f2937' : '#9ca3af',
                boxShadow: (selectedOption && !isImporting) ? '0 12px 40px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '20px 48px',
                fontSize: '22px',
                color: '#ffffff',
                cursor: (selectedOption && !isImporting) ? 'pointer' : 'not-allowed',
                opacity: (selectedOption && !isImporting) ? 1 : 0.6
              }}
              onMouseEnter={(e) => {
                if (selectedOption && !isImporting) {
                  e.currentTarget.style.boxShadow = '0 16px 50px rgba(0, 0, 0, 0.4)';
                  e.currentTarget.style.background = '#111827';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedOption && !isImporting) {
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.background = '#1f2937';
                }
              }}
            >
              <span style={{ color: '#ffffff' }}>{t.nextButton}</span>
              <ArrowRight className="size-8" style={{ color: '#ffffff' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
