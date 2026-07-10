/**
 * FeatureUnlockMoment - 機能解放の全画面演出
 * Claude Design モック 2m 準拠
 * 紙吹雪 + バッジ表示の報酬演出
 */
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import type { FeatureDefinition } from '../services/featureUnlockService';

interface FeatureUnlockMomentProps {
  feature: FeatureDefinition;
  language: 'ja' | 'en';
  triggerLabel?: string;
  onAction: () => void;
  onDismiss: () => void;
}

export function FeatureUnlockMoment({
  feature,
  language,
  triggerLabel,
  onAction,
  onDismiss,
}: FeatureUnlockMomentProps) {
  useEffect(() => {
    // 紙吹雪を試みる
    try {
      import('canvas-confetti').then(confetti => {
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.35 },
          colors: ['#6366F1', '#818CF8', '#34D399', '#F472B6', '#FBBF24'],
        });
      });
    } catch { /* confetti not available */ }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-center px-8"
      style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(99,102,241,0.25), transparent), #0F172A',
      }}
    >
      {/* 装飾パーティクル */}
      <span className="absolute" style={{ top: '18%', left: '20%', width: 8, height: 8, borderRadius: 2, background: '#818CF8', transform: 'rotate(20deg)' }} />
      <span className="absolute" style={{ top: '12%', right: '24%', width: 6, height: 6, borderRadius: '9999px', background: '#34D399' }} />
      <span className="absolute" style={{ top: '28%', right: '14%', width: 8, height: 8, borderRadius: 2, background: '#F472B6', transform: 'rotate(-15deg)' }} />
      <span className="absolute" style={{ top: '30%', left: '12%', width: 6, height: 6, borderRadius: '9999px', background: '#FBBF24' }} />

      {/* トリガーラベル */}
      {triggerLabel && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[13px] font-bold text-[#818CF8] tracking-[0.14em] mb-5"
        >
          {triggerLabel}
        </motion.p>
      )}

      {/* アイコン */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        className="w-[110px] h-[110px] rounded-[28px] flex items-center justify-center mb-7"
        style={{
          background: 'rgba(99,102,241,0.15)',
          border: '1.5px solid rgba(99,102,241,0.5)',
          boxShadow: '0 0 40px rgba(99,102,241,0.4)',
        }}
      >
        <div
          className="w-[44px] h-[44px] rounded-full"
          style={{
            border: '4px solid #818CF8',
            borderTopColor: 'transparent',
            transform: 'rotate(45deg)',
          }}
        />
      </motion.div>

      {/* タイトル */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-[26px] font-bold text-white mb-3 leading-relaxed"
      >
        {language === 'ja' ? feature.name : feature.nameEn}
        {language === 'ja' ? 'が\n解放されました' : '\nUnlocked!'}
      </motion.h1>

      {/* 説明 */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-[14px] text-[#94A3B8] leading-[1.9] mb-9 whitespace-pre-line"
      >
        {language === 'ja' ? feature.description : feature.descriptionEn}
      </motion.p>

      {/* CTAボタン */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        onClick={onAction}
        className="w-full max-w-sm h-[56px] rounded-2xl bg-[#6366F1] flex items-center justify-center text-[17px] font-bold text-white mb-3"
        style={{ boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
        whileTap={{ scale: 0.97 }}
      >
        {language === 'ja' ? 'さっそく見る' : 'Check it out'}
      </motion.button>

      <button
        onClick={onDismiss}
        className="text-[13px] text-[#64748B] font-semibold"
      >
        {language === 'ja' ? 'あとで' : 'Later'}
      </button>
    </motion.div>
  );
}
