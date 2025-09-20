import { useState, useEffect } from 'react';
import { recommendationEngine } from '../lib/recommendationEngine';
import type { StudyRecommendation, LearningSchedule, DifficultyAdjustment } from '../lib/recommendationEngine';

interface RecommendationDashboardProps {
  onBack: () => void;
  onStartQuiz?: (params?: any) => void;
  onNavigateToSettings?: (view: 'sessionSettings' | 'reminderSettings' | 'difficultySettings') => void;
  isDarkMode?: boolean;
  language?: 'ja' | 'en';
}

export function RecommendationDashboard({ onBack, onStartQuiz, onNavigateToSettings, language = 'ja' }: RecommendationDashboardProps) {
  // 翻訳テキスト
  const t = {
    ja: {
      title: '🎯 学習推薦',
      backButton: '← 戻る',
      loading: '推薦データを読み込み中...',
      loadingLog: '推薦データを読み込み中...',
      loadingComplete: '推薦データ読み込み完了:',
      loadingError: '推薦データの読み込みに失敗:',
      // タブ
      personalRecommendations: '📋 パーソナル推薦',
      optimalSchedule: '📅 最適スケジュール',
      difficultyAdjustment: '⚖️ 難易度調整',
      quickSettings: '⚡ クイック設定',
      sessionSettings: 'セッション設定',
      reminderSettings: 'リマインダー',
      difficultySettings: '難易度調整',
      // 優先度
      highPriority: '高優先度',
      mediumPriority: '中優先度',
      lowPriority: '低優先度',
      estimatedEffect: '推定効果:',
      // サクセスメッセージ
      sessionUpdateSuccess: 'セッション設定を更新しました！',
      newSessionLength: '新しいセッション長:',
      difficultyUpdateSuccess: '難易度を調整しました！',
      minutes: '分',
      level: 'レベル',
      // 推薦空状態
      preparingRecommendations: '推薦データを準備中',
      moreDataNeeded: 'もう少し学習データが蓄積されると、パーソナライズされた推薦が表示されます。',
      // 推薦メッセージ
      lowAccuracyMessage: '{accuracy}%と低下しています。集中的な学習をお勧めします。',
      recentMistakesMessage: '最近間違えた問題が{count}問あります。復習で理解を深めましょう。',
      optimalSessionMessage: 'あなたの学習パターンから、{length}分のセッションが最も効率的です。',
      optimalTimeMessage: '{time}時頃があなたの最適な学習時間です。その時間に学習スケジュールを設定しませんか？',
      quizSetStrengthening: '{quizSetName}の強化',
      reviewMistakes: '間違えた問題の復習',
      sessionOptimization: 'セッション長の最適化',
      optimalTimeSuggestion: '最適な学習時間の提案',
      startQuizSet: '{quizSetName}の問題を解く',
      reviewProblems: '復習問題を解く',
      changeSessionSettings: 'セッション設定を変更',
      setReminder: 'リマインダーを設定',
      // その他のメッセージ
      optimalStudyTimeNow: '今が学習の最適時間です',
      startStudyNow: 'あなたのパフォーマンスが高い時間帯です。今すぐ学習を始めませんか？',
      startQuizAction: 'クイズを始める',
      adaptiveDifficultyTitle: '適応的難易度調整',
      // システムメッセージ
      automaticAdjustment: '推薦システムによる自動調整',
      overallCategory: '全体',
      // スケジュールタブ
      recommendedSessionSettings: '📚 推奨セッション設定',
      sessionLength: 'セッション長',
      breakInterval: '休憩間隔',
      weeklyGoal: '週間目標',
      questions: '問',
      applySessionSettings: '⚡ セッション設定を適用',
      optimalStudyTime: '⏰ 最適学習時間',
      peakPerformanceTime: 'これらの時間帯にあなたのパフォーマンスが最も高くなります',
      startQuizNow: '🎯 今すぐクイズを始める',
      learningRhythmSuggestion: '📊 学習リズム提案',
      efficientLearningMethod: '💡 効率的な学習法',
      pomodoroSuggestion: '{sessionLength}分学習して{breakInterval}分休憩するポモドーロテクニックがお勧めです。週に{weeklyPace}問のペースで進めましょう。',
      // 難易度調整タブ
      adaptiveDifficultyAdjustment: '⚖️ 適応的難易度調整',
      currentDifficulty: '現在の難易度',
      recommendedDifficulty: '推奨難易度',
      adjustmentReason: '🎯 調整理由',
      confidence: '信頼度:',
      adjustDifficulty: '難易度を調整',
      learningProgressPrediction: '📈 学習進捗予測',
      expectedAccuracyImprovement: '予想正答率向上',
      goalAchievementPeriod: '目標達成期間',
      weeks: '週間'
    },
    en: {
      title: '🎯 Learning Recommendations',
      backButton: '← Back',
      loading: 'Loading recommendation data...',
      loadingLog: 'Loading recommendation data...',
      loadingComplete: 'Recommendation data loaded:',
      loadingError: 'Failed to load recommendation data:',
      // Tabs
      personalRecommendations: '📋 Personal Recommendations',
      optimalSchedule: '📅 Optimal Schedule',
      difficultyAdjustment: '⚖️ Difficulty Adjustment',
      quickSettings: '⚡ Quick Settings',
      sessionSettings: 'Session Settings',
      reminderSettings: 'Reminders',
      difficultySettings: 'Difficulty Adjustment',
      // Priority
      highPriority: 'High Priority',
      mediumPriority: 'Medium Priority',
      lowPriority: 'Low Priority',
      estimatedEffect: 'Estimated Effect:',
      // Success messages
      sessionUpdateSuccess: 'Session settings updated!',
      newSessionLength: 'New session length:',
      difficultyUpdateSuccess: 'Difficulty adjusted!',
      minutes: ' min',
      level: 'Level',
      // Empty recommendations
      preparingRecommendations: 'Preparing recommendation data',
      moreDataNeeded: 'Personalized recommendations will appear as more learning data is accumulated.',
      // Recommendation messages
      lowAccuracyMessage: 'Accuracy has dropped to {accuracy}%. We recommend intensive study.',
      recentMistakesMessage: 'You have {count} recently incorrect problems. Review to deepen understanding.',
      optimalSessionMessage: 'Based on your learning patterns, {length}-minute sessions are most efficient.',
      optimalTimeMessage: 'Around {time} o\'clock is your optimal study time. Would you like to set a study schedule for that time?',
      quizSetStrengthening: '{quizSetName} Strengthening',
      reviewMistakes: 'Review Incorrect Problems',
      sessionOptimization: 'Session Length Optimization',
      optimalTimeSuggestion: 'Optimal Study Time Suggestion',
      startQuizSet: 'Practice {quizSetName} problems',
      reviewProblems: 'Review problems',
      changeSessionSettings: 'Change session settings',
      setReminder: 'Set reminder',
      // Other messages
      optimalStudyTimeNow: 'Now is the optimal time to study',
      startStudyNow: 'This is when your performance is highest. Would you like to start studying now?',
      startQuizAction: 'Start Quiz',
      adaptiveDifficultyTitle: 'Adaptive Difficulty Adjustment',
      // System messages
      automaticAdjustment: 'Automatic adjustment by recommendation system',
      overallCategory: 'Overall',
      // Schedule tab
      recommendedSessionSettings: '📚 Recommended Session Settings',
      sessionLength: 'Session Length',
      breakInterval: 'Break Interval',
      weeklyGoal: 'Weekly Goal',
      questions: ' questions',
      applySessionSettings: '⚡ Apply Session Settings',
      optimalStudyTime: '⏰ Optimal Study Time',
      peakPerformanceTime: 'Your performance is highest during these time periods',
      startQuizNow: '🎯 Start Quiz Now',
      learningRhythmSuggestion: '📊 Learning Rhythm Suggestion',
      efficientLearningMethod: '💡 Efficient Learning Method',
      pomodoroSuggestion: 'The Pomodoro Technique of studying for {sessionLength} minutes and resting for {breakInterval} minutes is recommended. Proceed at a pace of {weeklyPace} questions per week.',
      // Difficulty adjustment tab
      adaptiveDifficultyAdjustment: '⚖️ Adaptive Difficulty Adjustment',
      currentDifficulty: 'Current Difficulty',
      recommendedDifficulty: 'Recommended Difficulty',
      adjustmentReason: '🎯 Adjustment Reason',
      confidence: 'Confidence:',
      adjustDifficulty: 'Adjust Difficulty',
      learningProgressPrediction: '📈 Learning Progress Prediction',
      expectedAccuracyImprovement: 'Expected Accuracy Improvement',
      goalAchievementPeriod: 'Goal Achievement Period',
      weeks: ' weeks'
    }
  };

  const currentLang = language as keyof typeof t;
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);

  // 推薦テキストを翻訳する関数
  const translateRecommendationText = (text: string, type: 'title' | 'description' | 'actionText'): string => {
    // 正答率低下メッセージの翻訳
    const accuracyPattern = /正答率(\d+\.?\d*)%と低下しています。集中的な学習をお勧めします。/;
    const accuracyMatch = text.match(accuracyPattern);
    if (accuracyMatch) {
      return t[currentLang].lowAccuracyMessage.replace('{accuracy}', accuracyMatch[1]);
    }

    // 間違えた問題の復習メッセージの翻訳
    const mistakesPattern = /最近間違えた問題が(\d+)問あります。復習で理解を深めましょう。/;
    const mistakesMatch = text.match(mistakesPattern);
    if (mistakesMatch) {
      return t[currentLang].recentMistakesMessage.replace('{count}', mistakesMatch[1]);
    }

    // セッション長最適化メッセージの翻訳
    const sessionPattern = /あなたの学習パターンから、(\d+)分のセッションが最も効率的です。/;
    const sessionMatch = text.match(sessionPattern);
    if (sessionMatch) {
      return t[currentLang].optimalSessionMessage.replace('{length}', sessionMatch[1]);
    }

    // 最適学習時間メッセージの翻訳
    const timePattern = /(\d+)時頃があなたの最適な学習時間です。その時間に学習スケジュールを設定しませんか？/;
    const timeMatch = text.match(timePattern);
    if (timeMatch) {
      return t[currentLang].optimalTimeMessage.replace('{time}', timeMatch[1]);
    }

    // タイトルの翻訳
    if (type === 'title') {
      if (text.includes('の強化')) {
        const quizSetName = text.replace('の強化', '');
        return t[currentLang].quizSetStrengthening.replace('{quizSetName}', quizSetName);
      }
      if (text === '間違えた問題の復習') {
        return t[currentLang].reviewMistakes;
      }
      if (text === 'セッション長の最適化') {
        return t[currentLang].sessionOptimization;
      }
      if (text === '最適な学習時間の提案') {
        return t[currentLang].optimalTimeSuggestion;
      }
    }

    // アクションテキストの翻訳
    if (type === 'actionText') {
      if (text.includes('の問題を解く')) {
        const quizSetName = text.replace('の問題を解く', '');
        return t[currentLang].startQuizSet.replace('{quizSetName}', quizSetName);
      }
      if (text === '復習問題を解く') {
        return t[currentLang].reviewProblems;
      }
      if (text === 'セッション設定を変更') {
        return t[currentLang].changeSessionSettings;
      }
      if (text === 'リマインダーを設定') {
        return t[currentLang].setReminder;
      }
    }

    // 翻訳パターンに該当しない場合は元のテキストを返す
    return text;
  };
  const [schedule, setSchedule] = useState<LearningSchedule | null>(null);
  const [difficultyAdjustment, setDifficultyAdjustment] = useState<DifficultyAdjustment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'schedule' | 'difficulty'>('recommendations');

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      console.log(t[currentLang].loadingLog);

      const [recsResult, scheduleResult, difficultyResult] = await Promise.all([
        recommendationEngine.generatePersonalizedRecommendations(language),
        recommendationEngine.generateOptimalSchedule(),
        recommendationEngine.calculateAdaptiveDifficulty(language)
      ]);

      console.log(t[currentLang].loadingComplete, { recsResult, scheduleResult, difficultyResult });

      setRecommendations(recsResult);
      setSchedule(scheduleResult);
      setDifficultyAdjustment(difficultyResult);
    } catch (error) {
      console.error(t[currentLang].loadingError, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecommendationAction = (recommendation: StudyRecommendation) => {
    console.log('推薦アクション実行:', {
      type: recommendation.type,
      data: recommendation.data,
      onStartQuiz: !!onStartQuiz
    });

    if (recommendation.type === 'focus_category' && onStartQuiz) {
      // カテゴリー別クイズの開始
      console.log('カテゴリー別クイズ開始:', recommendation.data?.category);
      onStartQuiz({
        category: recommendation.data?.category,
        mode: 'categoryQuiz'
      });
    } else if (recommendation.type === 'review_problems' && onStartQuiz) {
      // 復習問題の開始
      console.log('復習問題開始:', {
        problemIds: recommendation.data?.problemIds,
        problemCount: recommendation.data?.problemIds?.length
      });
      onStartQuiz({
        problemIds: recommendation.data?.problemIds,
        mode: 'review'
      });
    } else if (recommendation.type === 'optimal_timing') {
      // 今すぐクイズを開始
      console.log('最適タイミングクイズ開始');
      if (onStartQuiz) {
        onStartQuiz();
      }
    } else if (recommendation.type === 'session_length') {
      // セッション設定を直接変更
      console.log('セッション長調整');
      handleSessionLengthAdjustment(recommendation);
    } else if (recommendation.type === 'difficulty_adjustment') {
      // 難易度を直接調整
      console.log('難易度調整');
      handleDifficultyAdjustment(recommendation);
    } else {
      console.log('未対応の推薦タイプ:', recommendation.type);
    }
  };

  const handleSessionLengthAdjustment = (recommendation: StudyRecommendation) => {
    // 推奨セッション長を直接適用
    const recommendedLength = recommendation.data?.recommendedSessionLength || 25;
    const sessionConfig = {
      sessionLength: recommendedLength,
      breakLength: Math.max(5, Math.round(recommendedLength * 0.2)), // セッション長の20%を休憩に
      longBreakLength: Math.max(15, Math.round(recommendedLength * 0.6)),
      sessionsBeforeLongBreak: 4,
      autoBreakReminder: true,
      focusMode: 'custom' as const,
      targetProblemsPerSession: Math.max(5, Math.round(recommendedLength / 3)),
      difficultyProgression: 'adaptive' as const,
      reminderSound: true,
      backgroundMusic: false,
      distractionBlocking: false,
      sessionEndAction: 'manual_continue' as const
    };

    // LocalStorageに保存
    localStorage.setItem('session-config', JSON.stringify(sessionConfig));

    // フィードバック表示
    console.log(`${t[currentLang].sessionUpdateSuccess} ${t[currentLang].newSessionLength} ${recommendedLength}${t[currentLang].minutes}`);

    // 成功メッセージを表示（より良いUX）
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
    successMessage.innerHTML = `
      <div class="flex items-center">
        <span class="mr-2">✅</span>
        <span>${t[currentLang].sessionUpdateSuccess}<br>${t[currentLang].newSessionLength} ${recommendedLength}${t[currentLang].minutes}</span>
      </div>
    `;
    document.body.appendChild(successMessage);
    setTimeout(() => successMessage.remove(), 3000);
  };

  const handleDifficultyAdjustment = (recommendation: StudyRecommendation) => {
    // 推奨難易度を直接適用
    const currentLevel = recommendation.data?.currentLevel || 3;
    const recommendedLevel = recommendation.data?.recommendedLevel || 3;

    // 保存されている難易度プロファイルを読み込み
    const savedProfile = localStorage.getItem('difficulty-profile');
    let difficultyProfile: any = {
      overall: currentLevel,
      categories: {},
      adaptiveMode: true,
      autoAdjustment: true,
      adjustmentSensitivity: 'medium',
      targetAccuracy: 75,
      challengeMode: false,
      gradualProgression: true
    };

    if (savedProfile) {
      try {
        difficultyProfile = { ...difficultyProfile, ...JSON.parse(savedProfile) };
      } catch (e) {
        console.warn('Failed to parse saved difficulty profile');
      }
    }

    // 全体難易度を更新
    difficultyProfile.overall = recommendedLevel;

    // LocalStorageに保存
    localStorage.setItem('difficulty-profile', JSON.stringify(difficultyProfile));

    // 履歴に追加
    const historyEntry = {
      date: new Date().toISOString().split('T')[0],
      category: t[currentLang].overallCategory,
      oldDifficulty: currentLevel,
      newDifficulty: recommendedLevel,
      reason: recommendation.data?.reason || t[currentLang].automaticAdjustment,
      performance: recommendation.data?.accuracy || 0,
      confidence: recommendation.data?.confidence || 0.9
    };

    const savedHistory = localStorage.getItem('difficulty-history');
    let history: any[] = [];
    if (savedHistory) {
      try {
        history = JSON.parse(savedHistory);
      } catch (e) {
        console.warn('Failed to parse difficulty history');
      }
    }

    history.unshift(historyEntry);
    localStorage.setItem('difficulty-history', JSON.stringify(history.slice(0, 50)));

    // フィードバック表示
    console.log(`${t[currentLang].difficultyUpdateSuccess} ${t[currentLang].level} ${currentLevel} → ${t[currentLang].level} ${recommendedLevel}`);

    // 成功メッセージを表示（より良いUX）
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-50';
    successMessage.innerHTML = `
      <div class="flex items-center">
        <span class="mr-2">⚖️</span>
        <span>${t[currentLang].difficultyUpdateSuccess}<br>${t[currentLang].level} ${currentLevel} → ${t[currentLang].level} ${recommendedLevel}</span>
      </div>
    `;
    document.body.appendChild(successMessage);
    setTimeout(() => successMessage.remove(), 3000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '💡';
      default: return '📝';
    }
  };

  const formatHour = (hour: number) => {
    return `${hour}:00`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">{t[currentLang].loading}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t[currentLang].title}</h1>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all shadow-md"
            >
              {t[currentLang].backButton}
            </button>
          </div>

          {/* タブナビゲーション */}
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'recommendations'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t[currentLang].personalRecommendations}
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'schedule'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t[currentLang].optimalSchedule}
            </button>
            <button
              onClick={() => setActiveTab('difficulty')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                activeTab === 'difficulty'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t[currentLang].difficultyAdjustment}
            </button>
          </div>

          {/* クイック設定アクセス */}
          {onNavigateToSettings && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">{t[currentLang].quickSettings}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => onNavigateToSettings('sessionSettings')}
                  className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-800/30 transition"
                >
                  <span>⏰</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].sessionSettings}</span>
                </button>
                <button
                  onClick={() => onNavigateToSettings('reminderSettings')}
                  className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-800/30 transition"
                >
                  <span>🔔</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].reminderSettings}</span>
                </button>
                <button
                  onClick={() => onNavigateToSettings('difficultySettings')}
                  className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-800/30 transition"
                >
                  <span>⚖️</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t[currentLang].difficultySettings}</span>
                </button>
              </div>
            </div>
          )}
        </header>

        {/* パーソナル推薦タブ */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            {recommendations.length > 0 ? (
              recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border-l-4 ${getPriorityColor(recommendation.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{getPriorityIcon(recommendation.priority)}</span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {translateRecommendationText(recommendation.title, 'title')}
                        </h3>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          recommendation.priority === 'high'
                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            : recommendation.priority === 'medium'
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                            : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        }`}>
                          {recommendation.priority === 'high' ? t[currentLang].highPriority :
                           recommendation.priority === 'medium' ? t[currentLang].mediumPriority : t[currentLang].lowPriority}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        {translateRecommendationText(recommendation.description, 'description')}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t[currentLang].estimatedEffect} {recommendation.estimatedImpact}/10
                          </div>
                          <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${recommendation.estimatedImpact * 10}%` }}
                            ></div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRecommendationAction(recommendation)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          {translateRecommendationText(recommendation.actionText, 'actionText')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t[currentLang].preparingRecommendations}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t[currentLang].moreDataNeeded}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 最適スケジュールタブ */}
        {activeTab === 'schedule' && schedule && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].recommendedSessionSettings}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">{t[currentLang].sessionLength}</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {schedule.recommendedSessionLength}{t[currentLang].minutes}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">{t[currentLang].breakInterval}</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {schedule.breakIntervals}{t[currentLang].minutes}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">{t[currentLang].weeklyGoal}</span>
                    <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {schedule.weeklyGoal}{t[currentLang].questions}
                    </span>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => handleSessionLengthAdjustment({
                        type: 'session_length',
                        title: t[currentLang].sessionOptimization,
                        description: t[currentLang].optimalSessionMessage.replace('{length}', schedule.recommendedSessionLength.toString()),
                        priority: 'medium' as const,
                        actionText: t[currentLang].changeSessionSettings,
                        estimatedImpact: 8,
                        data: {
                          recommendedSessionLength: schedule.recommendedSessionLength
                        }
                      })}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      {t[currentLang].applySessionSettings}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].optimalStudyTime}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {schedule.optimalTimes.map((hour, index) => (
                    <div
                      key={index}
                      className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg p-3 text-center font-semibold"
                    >
                      {formatHour(hour)}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 mb-4">
                  {t[currentLang].peakPerformanceTime}
                </p>
                <button
                  onClick={() => handleRecommendationAction({
                    type: 'optimal_timing',
                    title: t[currentLang].optimalStudyTimeNow,
                    description: t[currentLang].startStudyNow,
                    priority: 'medium' as const,
                    actionText: t[currentLang].startQuizAction,
                    estimatedImpact: 7,
                    data: {}
                  })}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  {t[currentLang].startQuizNow}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].learningRhythmSuggestion}</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">{t[currentLang].efficientLearningMethod}</h4>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    {t[currentLang].pomodoroSuggestion
                      .replace('{sessionLength}', schedule.recommendedSessionLength.toString())
                      .replace('{breakInterval}', schedule.breakIntervals.toString())
                      .replace('{weeklyPace}', Math.ceil(schedule.weeklyGoal / 7).toString())}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 難易度調整タブ */}
        {activeTab === 'difficulty' && difficultyAdjustment && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].adaptiveDifficultyAdjustment}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t[currentLang].currentDifficulty}</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {t[currentLang].level} {difficultyAdjustment.currentLevel}
                  </div>
                  <div className="flex justify-center space-x-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < difficultyAdjustment.currentLevel
                            ? 'bg-blue-400'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t[currentLang].recommendedDifficulty}</div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {t[currentLang].level} {difficultyAdjustment.recommendedLevel}
                  </div>
                  <div className="flex justify-center space-x-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < difficultyAdjustment.recommendedLevel
                            ? 'bg-green-400'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{t[currentLang].adjustmentReason}</h4>
                <p className="text-gray-700 dark:text-gray-300">{difficultyAdjustment.reason}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t[currentLang].confidence}</span>
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${difficultyAdjustment.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {(difficultyAdjustment.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                {difficultyAdjustment.recommendedLevel !== difficultyAdjustment.currentLevel && (
                  <button
                    onClick={() => handleDifficultyAdjustment({
                      type: 'difficulty_adjustment',
                      title: t[currentLang].adaptiveDifficultyTitle,
                      description: difficultyAdjustment.reason,
                      priority: 'medium' as const,
                      actionText: t[currentLang].adjustDifficulty,
                      estimatedImpact: Math.round(difficultyAdjustment.confidence * 10),
                      data: {
                        currentLevel: difficultyAdjustment.currentLevel,
                        recommendedLevel: difficultyAdjustment.recommendedLevel,
                        reason: difficultyAdjustment.reason,
                        confidence: difficultyAdjustment.confidence
                      }
                    })}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    {t[currentLang].adjustDifficulty}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t[currentLang].learningProgressPrediction}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">+15%</div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">{t[currentLang].expectedAccuracyImprovement}</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">2{t[currentLang].weeks}</div>
                    <div className="text-sm text-green-800 dark:text-green-200">{t[currentLang].goalAchievementPeriod}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}