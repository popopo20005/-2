import { TrendingUp, Target, Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  language?: 'ja' | 'en';
}

export function WelcomeStep({ onNext, language = 'ja' }: WelcomeStepProps) {
  const content = {
    ja: {
      step: 'ステップ 1 / 5',
      title: 'Minguella へようこそ',
      subtitle: '効率的な学習で目標を達成しましょう',
      feature1: 'スマート学習',
      feature2: '進捗管理',
      feature3: '目標達成',
      startButton: '始める',
    },
    en: {
      step: 'Step 1 / 5',
      title: 'Welcome to Minguella',
      subtitle: 'Achieve your goals through efficient learning',
      feature1: 'Smart Learning',
      feature2: 'Progress Tracking',
      feature3: 'Goal Achievement',
      startButton: 'Get Started',
    },
  };

  const t = content[language];

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
                width: '20%',
                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.6)',
                borderRadius: '9999px',
                transition: 'all 0.7s ease-out'
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* ロゴ */}
          <div className="text-center space-y-3">
            <div style={{ display: 'inline-block' }}>
              <div
                style={{
                  width: '280px',
                  height: '280px',
                  margin: '0 auto 16px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.25)',
                  padding: '6px'
                }}
              >
                <img
                  src="/icon-192.png"
                  alt="Minguella"
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '16px',
                    objectFit: 'cover'
                  }}
                />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>
                {t.title}
              </h1>
            </div>

            <p className="text-sm" style={{ color: '#4b5563' }}>
              {t.subtitle}
            </p>
          </div>

          {/* 特徴カード */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div
              className="p-4 rounded-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              style={{
                background: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
            >
              <div
                className="size-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)'
                }}
              >
                <Sparkles className="size-8" style={{ color: '#ffffff' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: '#111827' }}>{t.feature1}</p>
            </div>
            <div
              className="p-4 rounded-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              style={{
                background: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
            >
              <div
                className="size-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  boxShadow: '0 8px 20px rgba(240, 147, 251, 0.4)'
                }}
              >
                <TrendingUp className="size-8" style={{ color: '#ffffff' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: '#111827' }}>{t.feature2}</p>
            </div>
            <div
              className="p-4 rounded-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              style={{
                background: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
            >
              <div
                className="size-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  boxShadow: '0 8px 20px rgba(79, 172, 254, 0.4)'
                }}
              >
                <Target className="size-8" style={{ color: '#ffffff' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: '#111827' }}>{t.feature3}</p>
            </div>
          </div>

          {/* ボタン */}
          <button
            onClick={onNext}
            className="w-full font-bold rounded-3xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-4"
            style={{
              background: '#1f2937',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
              padding: '20px 48px',
              fontSize: '22px',
              color: '#ffffff'
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
            <span style={{ color: '#ffffff' }}>{t.startButton}</span>
            <ArrowRight className="size-8" style={{ color: '#ffffff' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
