import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProblemEditorGuideProps {
  onClose: () => void;
}

export function ProblemEditorGuide({ onClose }: ProblemEditorGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '問題作成画面へようこそ！',
      content: 'このガイドでは、問題の作成方法を詳しく説明します。',
      emoji: '👋',
      highlight: null
    },
    {
      title: 'ステップ1: カテゴリーを作成',
      content: '問題を整理するために、まずカテゴリーを作成しましょう。例：「数学」「英語」「日本史」など',
      emoji: '📁',
      highlight: 'category'
    },
    {
      title: 'ステップ2: 問題を作成',
      content: '問題文、正解、解説を入力して問題を作成します。○×問題と多択問題の2種類が作成できます。',
      emoji: '✏️',
      highlight: 'problem'
    },
    {
      title: 'ステップ3: テキストから一括作成',
      content: 'テキストエリアに問題を貼り付けて、一度に複数の問題を作成できます。',
      emoji: '📝',
      highlight: 'import-text'
    },
    {
      title: 'テキスト形式：○×問題',
      content: '○×問題は「カテゴリー」「問題文」「正解(TRUE/FALSE)」「解説」の4項目で作成します。',
      emoji: '⭕',
      highlight: 'import-true-false'
    },
    {
      title: 'テキスト形式：多択問題',
      content: '多択問題は選択肢を追加します。正解は選択肢の番号(0,1,2,3)で指定します。',
      emoji: '🔢',
      highlight: 'import-multiple'
    },
    {
      title: 'インポートの流れ',
      content: 'テキストを貼り付け → プレビューで確認 → インポート実行の3ステップです。',
      emoji: '✅',
      highlight: 'import-flow'
    },
    {
      title: 'CSVエクスポート',
      content: '作成した問題をCSVファイルとして保存できます。バックアップや共有に便利です。',
      emoji: '📤',
      highlight: 'export'
    },
    {
      title: '準備完了！',
      content: 'これで問題を作成する準備が整いました。実際に試してみましょう！',
      emoji: '🎉',
      highlight: null
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const currentStepData = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleSkip();
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-4xl">{currentStepData.emoji}</span>
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
              </div>
              <button
                onClick={handleSkip}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    index <= currentStep ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
              {currentStepData.content}
            </p>

            {/* Visual aid based on step */}
            {currentStepData.highlight === 'category' && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">1</div>
                  <span className="font-semibold text-gray-900 dark:text-white">カテゴリー名を入力</span>
                </div>
                <div className="ml-10 text-gray-600 dark:text-gray-400 text-sm">
                  例: 「日本史」「世界史」「数学」など
                </div>
              </div>
            )}

            {currentStepData.highlight === 'problem' && (
              <div className="mt-6 space-y-3">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">1</div>
                    <span className="font-semibold text-gray-900 dark:text-white">問題文を入力</span>
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center text-white font-bold">2</div>
                    <span className="font-semibold text-gray-900 dark:text-white">正解を選択</span>
                  </div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">3</div>
                    <span className="font-semibold text-gray-900 dark:text-white">解説を入力</span>
                  </div>
                </div>
              </div>
            )}

            {currentStepData.highlight === 'import-text' && (
              <div className="mt-6 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border-2 border-cyan-200 dark:border-cyan-800">
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <p className="font-semibold text-cyan-900 dark:text-cyan-100">📝 テキストエリアの使い方</p>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold">1.</span>
                      <span>テキストエリアに問題データを貼り付ける</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold">2.</span>
                      <span>「プレビュー」ボタンで内容を確認</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold">3.</span>
                      <span>問題なければ「インポート」で取り込み</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStepData.highlight === 'import-true-false' && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                  <p className="font-semibold text-green-900 dark:text-green-100 mb-3">⭕ ○×問題の形式</p>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded font-mono text-xs space-y-1 border border-green-300 dark:border-green-700">
                    <div><span className="text-blue-600 dark:text-blue-400">カテゴリー:</span> 日本史</div>
                    <div><span className="text-blue-600 dark:text-blue-400">問題:</span> 徳川家康は江戸幕府を開いた</div>
                    <div><span className="text-blue-600 dark:text-blue-400">正解:</span> TRUE</div>
                    <div><span className="text-blue-600 dark:text-blue-400">解説:</span> 1603年に徳川家康が江戸幕府を開きました</div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">※ 正解は TRUE（正しい）または FALSE（誤り）</p>
                </div>
              </div>
            )}

            {currentStepData.highlight === 'import-multiple' && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                  <p className="font-semibold text-purple-900 dark:text-purple-100 mb-3">🔢 多択問題の形式</p>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded font-mono text-xs space-y-1 border border-purple-300 dark:border-purple-700">
                    <div><span className="text-blue-600 dark:text-blue-400">カテゴリー:</span> 世界史</div>
                    <div><span className="text-blue-600 dark:text-blue-400">問題:</span> 第一次世界大戦が始まったのは何年か？</div>
                    <div><span className="text-blue-600 dark:text-blue-400">選択肢1:</span> 1912年</div>
                    <div><span className="text-blue-600 dark:text-blue-400">選択肢2:</span> 1914年</div>
                    <div><span className="text-blue-600 dark:text-blue-400">選択肢3:</span> 1916年</div>
                    <div><span className="text-blue-600 dark:text-blue-400">選択肢4:</span> 1918年</div>
                    <div><span className="text-blue-600 dark:text-blue-400">正解:</span> 1</div>
                    <div><span className="text-blue-600 dark:text-blue-400">解説:</span> 1914年にサラエボ事件をきっかけに開戦</div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">※ 正解は選択肢の番号（0=1番目、1=2番目、2=3番目、3=4番目）</p>
                </div>
              </div>
            )}

            {currentStepData.highlight === 'import-flow' && (
              <div className="mt-6 space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">1</div>
                    <span className="font-semibold text-gray-900 dark:text-white">テキストを貼り付け</span>
                  </div>
                  <p className="ml-10 text-sm text-gray-600 dark:text-gray-400">テキストエリアに問題データをコピー＆ペースト</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center text-white font-bold">2</div>
                    <span className="font-semibold text-gray-900 dark:text-white">プレビューで確認</span>
                  </div>
                  <p className="ml-10 text-sm text-gray-600 dark:text-gray-400">「プレビュー」ボタンをクリックして内容を確認</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">3</div>
                    <span className="font-semibold text-gray-900 dark:text-white">インポート実行</span>
                  </div>
                  <p className="ml-10 text-sm text-gray-600 dark:text-gray-400">問題なければ「インポート」ボタンで取り込み完了</p>
                </div>
              </div>
            )}

            {currentStepData.highlight === 'export' && (
              <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                <p className="font-semibold text-orange-900 dark:text-orange-100 mb-3">📤 CSVエクスポートの使い方</p>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-600 dark:text-orange-400 font-bold">1.</span>
                    <span>テキストエリアに問題データを入力</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-600 dark:text-orange-400 font-bold">2.</span>
                    <span>「CSV形式でエクスポート」ボタンをクリック</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-600 dark:text-orange-400 font-bold">3.</span>
                    <span>ファイル名を入力してダウンロード</span>
                  </div>
                  <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-900/40 rounded text-xs">
                    💡 <strong>ヒント:</strong> エクスポートしたCSVファイルは、他の人と共有したり、バックアップとして保存できます
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 px-8 py-6 flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              スキップ
            </button>
            <div className="flex items-center space-x-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  戻る
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                {currentStep === steps.length - 1 ? '始める' : '次へ'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Tooltip component for inline help
interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg bottom-full left-1/2 transform -translate-x-1/2 mb-2"
          >
            {content}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-8 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Help icon component
export function HelpIcon({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip content={tooltip}>
      <button className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </Tooltip>
  );
}
