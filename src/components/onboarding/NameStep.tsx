import { useState } from 'react';
import { User, ArrowRight, ArrowLeft } from 'lucide-react';

interface NameStepProps {
  onNext: (name: string) => void;
  onBack: () => void;
  language?: 'ja' | 'en';
}

export function NameStep({ onNext, onBack, language = 'ja' }: NameStepProps) {
  const [name, setName] = useState('');

  const content = {
    ja: {
      step: 'ステップ 2 / 5',
      title: 'お名前を教えてください',
      subtitle: 'ダッシュボードに表示される名前です',
      placeholder: '例: 田中 太郎',
      note: '※ 後で設定画面から変更できます',
      backButton: '戻る',
      nextButton: '次へ',
    },
    en: {
      step: 'Step 2 / 5',
      title: 'What\'s your name?',
      subtitle: 'This name will be displayed on your dashboard',
      placeholder: 'e.g., John Doe',
      note: '* You can change this later in settings',
      backButton: 'Back',
      nextButton: 'Next',
    },
  };

  const t = content[language];

  const handleNext = () => {
    const finalName = name.trim() || (language === 'ja' ? '田中 太郎' : 'User');
    onNext(finalName);
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
                width: '40%',
                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.6)',
                borderRadius: '9999px',
                transition: 'all 0.7s ease-out'
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 120px)', padding: '24px' }}>
        <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* アイコン */}
          <div className="text-center space-y-4">
            <div
              className="size-24 mx-auto rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.35)'
              }}
            >
              <User className="size-12" style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>
                {t.title}
              </h1>
              <p className="text-sm" style={{ color: '#4b5563' }}>
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* 名前入力フィールド */}
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.placeholder}
              className="w-full px-4 py-3 text-lg rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
              style={{
                background: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                color: '#111827'
              }}
              autoFocus
            />
            <p className="text-xs text-center" style={{ color: '#6b7280' }}>
              {t.note}
            </p>
          </div>

          {/* ボタン */}
          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="flex-1 font-bold rounded-3xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3"
              style={{
                background: '#e5e7eb',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                padding: '16px 32px',
                fontSize: '16px',
                color: '#374151'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
                e.currentTarget.style.background = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.background = '#e5e7eb';
              }}
            >
              <ArrowLeft className="size-5" />
              <span>{t.backButton}</span>
            </button>
            <button
              onClick={handleNext}
              className="flex-1 font-bold rounded-3xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3"
              style={{
                background: '#1f2937',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
                padding: '16px 32px',
                fontSize: '16px',
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
              <span>{t.nextButton}</span>
              <ArrowRight className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
