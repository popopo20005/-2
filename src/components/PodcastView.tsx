import { useState, useEffect } from 'react';
import { categoryService, problemService, quizSetService, playlistService } from '../lib/database';
import { speechService } from '../services/speechService';
import { NeumorphicButton } from './ui/NeumorphicButton';
import { GlassCard } from './ui/GlassCard';
import { PodcastSettings } from './PodcastSettings';
import { PlaylistCreateModal } from './PlaylistCreateModal';
import { BookOpen, Layers, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, Settings, Timer, ListMusic, Plus } from 'lucide-react';
import type { Problem, QuizSet, PodcastPlaylist } from '../types';

interface PodcastViewProps {
  onBack: () => void;
}

const PodcastView = ({ onBack }: PodcastViewProps) => {
  const [mode, setMode] = useState<'selection' | 'playing'>('selection');
  const [isLoading, setIsLoading] = useState(true);
  const [language] = useState(localStorage.getItem('language') || 'ja');

  // Data
  const [categories, setCategories] = useState<string[]>([]);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [playlists, setPlaylists] = useState<(PodcastPlaylist & { id: number })[]>([]);

  // Selection
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedQuizSet, setSelectedQuizSet] = useState<number | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null);

  // Playing State
  const [currentProblems, setCurrentProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused'>('idle');

  // Settings & Sleep Timer
  const [showSettings, setShowSettings] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null); // minutes
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null); // seconds

  useEffect(() => {
    loadData();
  }, []);

  // Speech service initialization
  useEffect(() => {
    console.log('[PodcastView] Initializing speech service');
    speechService.loadSettings();
    speechService.setMode('podcast'); // Always podcast mode

    return () => {
      console.log('[PodcastView] Cleaning up speech service');
      speechService.stop();
      setIsPlaying(false);
      setMode('selection');
    };
  }, []);

  // Update callbacks when currentIndex or currentProblems changes
  useEffect(() => {
    speechService.setCallbacks({
      onStateChange: (state) => {
        setSpeechState(state === 'waiting-answer' ? 'speaking' : state);
      },
      onQuestionEnd: () => {
        // Automatically move to next problem
        if (currentIndex < currentProblems.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // End of podcast
          speechService.stop();
          setIsPlaying(false);
          setMode('selection');
          setCurrentIndex(0);
        }
      }
    });
  }, [currentIndex, currentProblems.length]);

  // Auto-play when problem changes
  useEffect(() => {
    if (!isPlaying || mode !== 'playing' || !currentProblems[currentIndex]) {
      return;
    }

    console.log('[PodcastView] Problem changed, index:', currentIndex);
    const currentProblem = currentProblems[currentIndex];

    // 前の音声を確実に停止
    speechService.stop();

    // Delay before speaking
    const timer = setTimeout(() => {
      if (!isPlaying) {
        console.log('[PodcastView] Playback stopped, skipping speech');
        return;
      }

      console.log('[PodcastView] Starting speech for problem:', currentIndex);

      if (currentProblem.type === 'multiple-choice') {
        speechService.speakProblemPodcast(
          currentProblem.question,
          currentProblem.options || [],
          currentProblem.correctAnswer || 0,
          currentProblem.explanation,
          currentProblem.category
        );
      } else {
        speechService.speakTrueFalsePodcast(
          currentProblem.question,
          currentProblem.answer ?? false,
          currentProblem.explanation,
          currentProblem.category
        );
      }
    }, 500);

    return () => {
      console.log('[PodcastView] Cleaning up timer for problem:', currentIndex);
      clearTimeout(timer);
      speechService.stop();
    };
  }, [isPlaying, mode, currentIndex, currentProblems]);

  // Sleep Timer
  useEffect(() => {
    if (sleepTimerRemaining === null || sleepTimerRemaining <= 0) return;

    const interval = setInterval(() => {
      setSleepTimerRemaining(prev => {
        if (prev === null || prev <= 1) {
          // Timer expired - stop playback
          speechService.stop();
          setIsPlaying(false);
          setSleepTimer(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerRemaining]);

  const handleSetSleepTimer = (minutes: number) => {
    setSleepTimer(minutes);
    setSleepTimerRemaining(minutes * 60);
  };

  const handleCancelSleepTimer = () => {
    setSleepTimer(null);
    setSleepTimerRemaining(null);
  };

  const t = {
    ja: {
      loading: 'データを読み込み中...',
      pageTitle: { selection: 'ポッドキャスト学習', playing: 'ポッドキャスト再生中' },
      buttons: {
        backToMenu: '← メインメニューに戻る',
        stop: '← 停止して戻る',
        startQuiz: '選択したカテゴリーで開始',
        startQuizSet: '選択した問題集で開始',
        startAllProblems: '全問題で開始'
      },
      labels: {
        selectCategory: 'カテゴリーを選択:',
        selectCategoryOption: 'カテゴリーを選択',
        selectQuizSet: '問題集を選択:',
        selectQuizSetOption: '問題集を選択',
        questionNumber: '問題',
        listening: '聞き流し学習モード',
        noStatistics: '※このモードでは統計データは記録されません'
      },
      sections: {
        categoryQuiz: { title: '📚 カテゴリー別' },
        quizSetQuiz: { title: '📖 問題集' },
        otherQuiz: { title: '🎯 その他' }
      },
      messages: {
        noProblemsFound: '出題する問題がありません'
      }
    },
    en: {
      loading: 'Loading data...',
      pageTitle: { selection: 'Podcast Learning', playing: 'Podcast Playing' },
      buttons: {
        backToMenu: '← Back to Main Menu',
        stop: '← Stop and Return',
        startQuiz: 'Start with Selected Category',
        startQuizSet: 'Start with Selected Quiz Set',
        startAllProblems: 'Start with All Problems'
      },
      labels: {
        selectCategory: 'Select Category:',
        selectCategoryOption: 'Select Category',
        selectQuizSet: 'Select Quiz Set:',
        selectQuizSetOption: 'Select Quiz Set',
        questionNumber: 'Question',
        listening: 'Listening Learning Mode',
        noStatistics: '※ Statistics are not recorded in this mode'
      },
      sections: {
        categoryQuiz: { title: '📚 By Category' },
        quizSetQuiz: { title: '📖 Quiz Set' },
        otherQuiz: { title: '🎯 Other' }
      },
      messages: {
        noProblemsFound: 'No problems found'
      }
    }
  };

  const currentLang = language as keyof typeof t;

  const loadData = async () => {
    try {
      const [categoriesData, quizSetsData, problemsData, playlistsData] = await Promise.all([
        categoryService.getAll(),
        quizSetService.getAll(),
        problemService.getAll(),
        playlistService.getAll()
      ]);
      setCategories(categoriesData);
      setQuizSets(quizSetsData);
      setAllProblems(problemsData);
      setPlaylists(playlistsData.filter((p): p is PodcastPlaylist & { id: number } => p.id !== undefined));
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startPodcast = async (type: 'all' | 'category' | 'quizSet' | 'playlist') => {
    let problems: Problem[] = [];

    try {
      switch (type) {
        case 'all':
          problems = [...allProblems];
          break;
        case 'category':
          if (selectedCategory) {
            problems = allProblems.filter(p => p.category === selectedCategory);
          }
          break;
        case 'quizSet':
          if (selectedQuizSet) {
            const quizSet = await quizSetService.getById(selectedQuizSet);
            if (quizSet) {
              problems = await problemService.getByIds(quizSet.problemIds);
            }
          }
          break;
        case 'playlist':
          if (selectedPlaylist) {
            problems = await playlistService.getProblemsFromPlaylist(selectedPlaylist);
            // Increment play count
            await playlistService.incrementPlayCount(selectedPlaylist);
          }
          break;
      }

      if (problems.length === 0) {
        alert(t[currentLang].messages.noProblemsFound);
        return;
      }

      // Shuffle problems
      const shuffledProblems = [...problems].sort(() => Math.random() - 0.5);
      setCurrentProblems(shuffledProblems);
      setCurrentIndex(0);
      setIsPlaying(true);
      setMode('playing');
    } catch (error) {
      console.error('Podcast start error:', error);
      alert('ポッドキャストの開始に失敗しました');
    }
  };

  const togglePlayPause = () => {
    if (speechState === 'speaking') {
      speechService.pause();
      setIsPlaying(false);
    } else if (speechState === 'paused') {
      speechService.resume();
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    console.log('[PodcastView] Next button clicked');
    speechService.stop(); // 確実に停止

    if (currentIndex < currentProblems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // End of podcast
      handleStop();
    }
  };

  const handlePrevious = () => {
    console.log('[PodcastView] Previous button clicked');
    speechService.stop(); // 確実に停止

    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleStop = () => {
    console.log('[PodcastView] Stop button clicked');
    speechService.stop(); // 確実に停止
    setIsPlaying(false);
    setSpeechState('idle');
    setMode('selection');
    setCurrentProblems([]);
    setCurrentIndex(0);
  };

  const renderSelectionMode = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            🎙️ {t[currentLang].pageTitle.selection}
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            {t[currentLang].labels.listening}
          </p>
          <p className="text-xs text-yellow-400 mt-1">
            {t[currentLang].labels.noStatistics}
          </p>
        </div>
        <NeumorphicButton variant="secondary" onClick={onBack} className="!px-4">
          {t[currentLang].buttons.backToMenu}
        </NeumorphicButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Selection */}
        <GlassCard className="p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/20 text-primary">
              <BookOpen size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">
              {t[currentLang].sections.categoryQuiz.title}
            </h2>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-text-secondary">
              {t[currentLang].labels.selectCategory}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-4 rounded-xl bg-surfaceHighlight border border-white/10 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="">{t[currentLang].labels.selectCategoryOption}</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <NeumorphicButton
              variant="primary"
              fullWidth
              onClick={() => startPodcast('category')}
              disabled={!selectedCategory}
              className="mt-4"
            >
              {t[currentLang].buttons.startQuiz}
            </NeumorphicButton>
          </div>
        </GlassCard>

        {/* Quiz Set Selection */}
        <GlassCard className="p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-accent/20 text-accent">
              <Layers size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">
              {t[currentLang].sections.quizSetQuiz.title}
            </h2>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-text-secondary">
              {t[currentLang].labels.selectQuizSet}
            </label>
            <select
              value={selectedQuizSet ?? ''}
              onChange={(e) => setSelectedQuizSet(Number(e.target.value))}
              className="w-full p-4 rounded-xl bg-surfaceHighlight border border-white/10 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="">{t[currentLang].labels.selectQuizSetOption}</option>
              {quizSets.map(set => (
                <option key={set.id} value={set.id}>{set.name}</option>
              ))}
            </select>
            <NeumorphicButton
              variant="primary"
              fullWidth
              onClick={() => startPodcast('quizSet')}
              disabled={!selectedQuizSet}
              className="mt-4"
            >
              {t[currentLang].buttons.startQuizSet}
            </NeumorphicButton>
          </div>
        </GlassCard>

        {/* Playlist Selection */}
        <GlassCard className="p-4 sm:p-6 space-y-6 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-pink-500/20 text-pink-400">
                <ListMusic size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">
                🎵 プレイリスト
              </h2>
            </div>
            <button
              onClick={() => setShowPlaylistModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-all"
            >
              <Plus size={20} />
              <span className="text-sm font-bold">新規作成</span>
            </button>
          </div>

          {playlists.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <ListMusic size={48} className="mx-auto mb-4 opacity-30" />
              <p>プレイリストがありません</p>
              <p className="text-sm mt-2">お気に入りの問題セットを連続再生しよう</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => {
                    setSelectedPlaylist(playlist.id);
                    startPodcast('playlist');
                  }}
                  className="p-4 rounded-xl border-2 border-white/10 bg-surfaceHighlight hover:border-primary/50 hover:bg-primary/10 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{playlist.emoji || '🎵'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white group-hover:text-primary transition-colors truncate">
                        {playlist.name}
                      </h3>
                      <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                        {playlist.description || '説明なし'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                        <span>{playlist.quizSetIds.length}個のセット</span>
                        <span>•</span>
                        <span>{playlist.totalProblems || 0}問</span>
                        {playlist.playCount && playlist.playCount > 0 && (
                          <>
                            <span>•</span>
                            <span>再生{playlist.playCount}回</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </GlassCard>

        {/* All Problems */}
        <GlassCard className="p-6 space-y-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
              <BookOpen size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">
              {t[currentLang].sections.otherQuiz.title}
            </h2>
          </div>

          <NeumorphicButton
            variant="secondary"
            onClick={() => startPodcast('all')}
            className="w-full md:w-auto"
          >
            <div className="flex items-center gap-2 py-2">
              <span className="text-2xl">📚</span>
              <span>{t[currentLang].buttons.startAllProblems}</span>
            </div>
          </NeumorphicButton>
        </GlassCard>
      </div>
    </div>
  );

  const renderPlayingMode = () => {
    const currentProblem = currentProblems[currentIndex];
    if (!currentProblem) return <div>Loading...</div>;

    return (
      <div className="max-w-4xl mx-auto pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <NeumorphicButton variant="secondary" onClick={handleStop} className="!px-4 !py-2 text-sm">
            {t[currentLang].buttons.stop}
          </NeumorphicButton>

          <div className="flex items-center gap-3">
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-secondary hover:text-primary"
              title="設定"
            >
              <Settings size={20} />
            </button>

            {/* Sleep Timer Button */}
            <div className="relative">
              <button
                onClick={() => {
                  if (sleepTimer) {
                    handleCancelSleepTimer();
                  } else {
                    const minutes = parseInt(prompt('スリープタイマー（分）を入力してください', '30') || '0');
                    if (minutes > 0) {
                      handleSetSleepTimer(minutes);
                    }
                  }
                }}
                className={`p-2 rounded-lg transition-colors ${
                  sleepTimer
                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                    : 'hover:bg-white/10 text-text-secondary hover:text-primary'
                }`}
                title={sleepTimer ? `スリープタイマー: ${Math.floor((sleepTimerRemaining || 0) / 60)}:${String((sleepTimerRemaining || 0) % 60).padStart(2, '0')}` : 'スリープタイマー'}
              >
                <Timer size={20} />
              </button>
              {sleepTimerRemaining && (
                <div className="absolute -top-1 -right-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {Math.floor(sleepTimerRemaining / 60)}:{String(sleepTimerRemaining % 60).padStart(2, '0')}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surfaceHighlight border border-white/10">
              <span className="text-sm text-text-secondary">{t[currentLang].labels.questionNumber}</span>
              <span className="font-bold text-white">{currentIndex + 1} / {currentProblems.length}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-surfaceHighlight rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / currentProblems.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Problem Display */}
        <GlassCard className="p-8 mb-8">
          <div className="flex items-start gap-3 mb-6">
            <div className="px-3 py-1 rounded-lg bg-primary/20 text-primary text-sm font-bold">
              {currentProblem.category}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-6 leading-relaxed">
            {currentProblem.question}
          </h2>

          {currentProblem.options && (
            <div className="space-y-3 mb-6">
              {currentProblem.options.map((option, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    idx === currentProblem.correctAnswer
                      ? 'bg-green-500/20 border-green-500/50'
                      : 'bg-surfaceHighlight border-white/10'
                  }`}
                >
                  <span className="font-medium text-white">{idx + 1}. {option}</span>
                  {idx === currentProblem.correctAnswer && (
                    <span className="ml-2 text-green-400">✓ 正解</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {currentProblem.explanation && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <h3 className="font-bold text-blue-400 mb-2">💡 解説</h3>
              <p className="text-text-secondary leading-relaxed">{currentProblem.explanation}</p>
            </div>
          )}
        </GlassCard>

        {/* Podcast Controls */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
          <GlassCard className="p-6 flex items-center gap-6">
            {/* Previous Button */}
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <SkipBack size={24} className="text-white" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="p-4 rounded-full bg-primary hover:bg-primary/80 transition-all"
            >
              {isPlaying && speechState === 'speaking' ? (
                <Pause size={32} className="text-white" />
              ) : (
                <Play size={32} className="text-white" />
              )}
            </button>

            {/* Next Button */}
            <button
              onClick={handleNext}
              disabled={currentIndex === currentProblems.length - 1}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <SkipForward size={24} className="text-white" />
            </button>

            {/* Status */}
            <div className="ml-4 flex items-center gap-2">
              {isPlaying && speechState === 'speaking' ? (
                <>
                  <Volume2 size={20} className="text-primary animate-pulse" />
                  <span className="text-sm text-text-secondary">読み上げ中...</span>
                </>
              ) : (
                <>
                  <VolumeX size={20} className="text-text-secondary" />
                  <span className="text-sm text-text-secondary">一時停止</span>
                </>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-primary/20 rounded-full blur-md animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {mode === 'selection' && renderSelectionMode()}
      {mode === 'playing' && renderPlayingMode()}

      {/* Settings Modal */}
      {showSettings && (
        <PodcastSettings onClose={() => setShowSettings(false)} />
      )}

      {/* Playlist Create Modal */}
      {showPlaylistModal && (
        <PlaylistCreateModal
          onClose={() => setShowPlaylistModal(false)}
          onPlaylistCreated={() => {
            loadData(); // Refresh playlists
            setShowPlaylistModal(false);
          }}
        />
      )}
    </div>
  );
};

export default PodcastView;
