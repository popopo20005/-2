import { useState } from 'react';
import { BookOpen, TrendingUp, Target, ArrowLeft, ArrowRight } from 'lucide-react';

interface TourStepProps {
  onComplete: () => void;
  onBack: () => void;
  language?: 'ja' | 'en';
  selectedGoal?: string;
}

type TourSlide = {
  icon: typeof BookOpen;
  title: string;
  description: string;
  color: string;
  bgColor: string;
};

/**
 * オンボーディング: アプリツアー画面
 *
 * 3画面のクイックツアーでアプリの使い方を紹介
 */
export function TourStep({ onComplete, onBack, language = 'ja', selectedGoal }: TourStepProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // 目標に応じたスライドの説明文をカスタマイズ
  const getGoalBasedDescriptions = () => {
    const goalDescriptions = {
      ja: {
        exam: {
          slide1: '試験に頻出する問題を解いて、本番で自信を持って回答できるようにしましょう。間違えた問題は自動的に復習リストに追加されます。',
          slide2: '試験までの残り日数と学習進捗を確認。苦手分野を把握して、効率的に試験対策を進めましょう。',
          slide3: '試験前の総復習に最適。忘れかけた知識を確実に定着させて、試験本番で実力を発揮しましょう。',
        },
        daily: {
          slide1: '毎日少しずつ問題を解いて、学習を習慣化しましょう。継続することで着実に知識が身につきます。',
          slide2: '連続学習日数（ストリーク）を記録。毎日の積み重ねがあなたの成長を可視化します。',
          slide3: '毎日の復習で知識を定着。無理なく続けられるペースで、確実にスキルアップしていきましょう。',
        },
        skill: {
          slide1: '専門分野の問題に挑戦して、スキルを磨きましょう。難易度の高い問題にも積極的に取り組むことが成長への近道です。',
          slide2: 'スキルレベルの向上を数値で確認。正答率の推移を見ながら、着実に専門性を高めていきましょう。',
          slide3: '定期的な復習で専門知識を強化。実務で使える確かなスキルを身につけましょう。',
        },
        review: {
          slide1: '既に学んだ内容を確認する問題に取り組みましょう。忘れている箇所を発見することが大切です。',
          slide2: '復習の進捗状況を可視化。どの分野を重点的に復習すべきか、一目で分かります。',
          slide3: '間隔反復法で効率的に復習。忘却曲線に基づいた最適なタイミングで問題が出題されます。',
        },
      },
      en: {
        exam: {
          slide1: 'Practice frequently tested problems to build confidence for the real exam. Incorrect answers are automatically added to your review list.',
          slide2: 'Track days until exam and study progress. Identify weak areas and prepare efficiently for your test.',
          slide3: 'Perfect for pre-exam review. Solidify forgotten knowledge and perform at your best on test day.',
        },
        daily: {
          slide1: 'Build a learning habit by solving problems daily. Consistent practice leads to steady knowledge growth.',
          slide2: 'Track your learning streak. Daily accumulation visualizes your progress and growth.',
          slide3: 'Daily review for knowledge retention. Improve your skills at a sustainable, comfortable pace.',
        },
        skill: {
          slide1: 'Challenge yourself with specialized problems to sharpen your skills. Tackling difficult problems is key to growth.',
          slide2: 'Monitor your skill level numerically. Watch your accuracy improve as you build expertise.',
          slide3: 'Strengthen professional knowledge through regular review. Build practical, job-ready skills.',
        },
        review: {
          slide1: 'Test your existing knowledge and discover what you have forgotten. Identifying gaps is essential.',
          slide2: 'Visualize review progress. See at a glance which areas need more focused review.',
          slide3: 'Efficient review with spaced repetition. Problems appear at optimal timing based on the forgetting curve.',
        },
      },
    };

    const goal = selectedGoal || 'daily';
    const descriptions = goalDescriptions[language][goal as keyof typeof goalDescriptions['ja']];

    return descriptions || {
      slide1: language === 'ja'
        ? '問題集から好きなトピックを選んで、クイズに挑戦しましょう。正解・不正解に応じて自動的に復習スケジュールが組まれます。'
        : 'Choose your favorite topic from quiz sets and take the challenge. Review schedules are automatically created based on your answers.',
      slide2: language === 'ja'
        ? 'ダッシュボードで学習の進捗を確認できます。連続学習日数や正答率など、あなたの成長が一目で分かります。'
        : 'View your learning progress on the dashboard. See your growth at a glance with streak days, accuracy rates, and more.',
      slide3: language === 'ja'
        ? '間隔反復法により、忘れかけたタイミングで復習問題が表示されます。継続することで確実に知識が定着します。'
        : 'With spaced repetition, review problems appear just when you are about to forget. Consistent practice ensures knowledge retention.',
    };
  };

  const goalDescriptions = getGoalBasedDescriptions();

  const content = {
    ja: {
      step: 'ステップ 5 / 5',
      title: 'アプリの使い方',
      subtitle: '3つのステップで効率的に学習',
      slides: [
        {
          icon: BookOpen,
          title: '問題を解く',
          description: goalDescriptions.slide1,
          color: '#3b82f6',
          bgColor: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
        },
        {
          icon: TrendingUp,
          title: '進捗を確認',
          description: goalDescriptions.slide2,
          color: '#8b5cf6',
          bgColor: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
        },
        {
          icon: Target,
          title: '復習を続ける',
          description: goalDescriptions.slide3,
          color: '#10b981',
          bgColor: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
        },
      ] as TourSlide[],
      prevButton: '前へ',
      nextButton: '次へ',
      completeButton: '始める！',
      skipButton: 'スキップ',
      backButton: '戻る',
    },
    en: {
      step: 'Step 5 / 5',
      title: 'How to Use',
      subtitle: '3 steps for efficient learning',
      slides: [
        {
          icon: BookOpen,
          title: 'Solve Problems',
          description: goalDescriptions.slide1,
          color: '#3b82f6',
          bgColor: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
        },
        {
          icon: TrendingUp,
          title: 'Check Progress',
          description: goalDescriptions.slide2,
          color: '#8b5cf6',
          bgColor: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
        },
        {
          icon: Target,
          title: 'Keep Reviewing',
          description: goalDescriptions.slide3,
          color: '#10b981',
          bgColor: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
        },
      ] as TourSlide[],
      prevButton: 'Previous',
      nextButton: 'Next',
      completeButton: 'Get Started!',
      skipButton: 'Skip',
      backButton: 'Back',
    },
  };

  const t = content[language];
  const currentSlideData = t.slides[currentSlide];
  const Icon = currentSlideData.icon;

  const handleNext = () => {
    if (currentSlide < t.slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleComplete = () => {
    // オンボーディング完了をlocalStorageに保存
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete();
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
                width: '100%',
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

          {/* スライドインジケーター（ドット） */}
          <div className="flex justify-center gap-3">
            {t.slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                style={{
                  height: '10px',
                  width: index === currentSlide ? '32px' : '10px',
                  borderRadius: '9999px',
                  background: index === currentSlide ? 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: index === currentSlide ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none'
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* スライドコンテンツ */}
          <div
            style={{
              borderRadius: '20px',
              background: '#ffffff',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              padding: '48px 32px',
              minHeight: '380px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div className="text-center space-y-6" key={currentSlide}>
              {/* アイコン */}
              <div className="flex justify-center">
                <div
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '24px',
                    background: currentSlideData.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 12px 28px ${currentSlideData.color}40`
                  }}
                >
                  <Icon style={{ width: '48px', height: '48px', color: '#ffffff' }} />
                </div>
              </div>

              {/* タイトル */}
              <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>
                {currentSlideData.title}
              </h2>

              {/* 説明 */}
              <p className="leading-relaxed max-w-lg mx-auto" style={{ fontSize: '15px', color: '#4b5563' }}>
                {currentSlideData.description}
              </p>

              {/* スライド番号 */}
              <p className="text-sm font-semibold" style={{ color: '#9ca3af' }}>
                {currentSlide + 1} / {t.slides.length}
              </p>
            </div>
          </div>

          {/* ナビゲーションボタン */}
          <div className="flex justify-between items-center pt-4 gap-4">
            <div className="flex gap-3">
              {currentSlide === 0 ? (
                <button
                  onClick={onBack}
                  className="font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3"
                  style={{
                    background: '#ffffff',
                    border: '2px solid #d1d5db',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    padding: '16px 32px',
                    fontSize: '16px',
                    color: '#374151'
                  }}
                >
                  <ArrowLeft className="size-5" />
                  {t.backButton}
                </button>
              ) : (
                <button
                  onClick={handlePrev}
                  className="font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3"
                  style={{
                    background: '#ffffff',
                    border: '2px solid #d1d5db',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    padding: '16px 32px',
                    fontSize: '16px',
                    color: '#374151'
                  }}
                >
                  <ArrowLeft className="size-5" />
                  {t.prevButton}
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {currentSlide < t.slides.length - 1 ? (
                <>
                  <button
                    onClick={handleComplete}
                    className="font-semibold rounded-xl hover:opacity-80 transition-all duration-300"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '12px 24px',
                      fontSize: '16px',
                      color: '#6b7280',
                      cursor: 'pointer'
                    }}
                  >
                    {t.skipButton}
                  </button>
                  <button
                    onClick={handleNext}
                    className="font-bold rounded-3xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-4"
                    style={{
                      background: '#1f2937',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
                      padding: '20px 48px',
                      fontSize: '22px',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 16px 50px rgba(0, 0, 0, 0.4)';
                      e.currentTarget.style.background = '#111827';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)';
                      e.currentTarget.style.background = '#1f2937';
                    }}
                  >
                    <span style={{ color: '#ffffff' }}>{t.nextButton}</span>
                    <ArrowRight className="size-8" style={{ color: '#ffffff' }} />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleComplete}
                  className="font-bold rounded-3xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-4"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 12px 40px rgba(16, 185, 129, 0.4)',
                    padding: '20px 56px',
                    fontSize: '24px',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    minWidth: '240px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 16px 50px rgba(16, 185, 129, 0.6)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.4)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span style={{ color: '#ffffff' }}>{t.completeButton}</span>
                  <ArrowRight className="size-8" style={{ color: '#ffffff' }} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
