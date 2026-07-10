/**
 * CreateHub - Claude Design モック 2h 準拠の「つくる」ハブ画面
 * 4つの問題作成方法を提示し、各機能へルーティング
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ClipboardPaste, Camera, PenLine, Wand2, FileText } from 'lucide-react';
import { problemService } from '../lib/database';
import type { View } from '../types';

interface CreateHubProps {
  onNavigate: (view: View, options?: any) => void;
}

export function CreateHub({ onNavigate }: CreateHubProps) {
  const [recentInfo, setRecentInfo] = useState('');
  const language = (localStorage.getItem('language') || 'ja') as 'ja' | 'en';

  useEffect(() => {
    loadRecentInfo();
  }, []);

  const loadRecentInfo = async () => {
    try {
      const problems = await problemService.getAll();
      if (problems.length > 0) {
        // カテゴリ別に集計して最新を表示
        const categoryCounts: Record<string, number> = {};
        for (const p of problems) {
          categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
        }
        const topCategory = Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])[0];
        if (topCategory) {
          setRecentInfo(
            language === 'ja'
              ? `最近つくったもの: ${topCategory[0]} ${topCategory[1]}問`
              : `Recent: ${topCategory[0]} ${topCategory[1]} problems`
          );
        }
      }
    } catch { /* ignore */ }
  };

  const methods = [
    {
      id: 'ai',
      icon: Sparkles,
      title: language === 'ja' ? 'AIで生成' : 'AI Generate',
      description: language === 'ja'
        ? 'テンプレートを選んで穴埋めするだけ。過去問風・類題も。'
        : 'Pick a template, fill in blanks. Past exam style too.',
      badge: language === 'ja' ? 'おすすめ' : 'Recommended',
      isHighlight: true,
      action: () => onNavigate('aiGenerator'),
    },
    {
      id: 'promptWizard',
      icon: Wand2,
      title: language === 'ja' ? 'AIおつかい' : 'AI Handoff',
      description: language === 'ja'
        ? 'プロンプトを生成 → 外部AI(ChatGPT/Claude)で問題作成 → 結果を貼り付け'
        : 'Generate prompt → Create with external AI → Paste results back',
      isHighlight: false,
      action: () => onNavigate('promptWizard'),
    },
    {
      id: 'promptGenerator',
      icon: FileText,
      title: language === 'ja' ? 'プロンプト生成' : 'Prompt Generator',
      description: language === 'ja'
        ? 'カスタムプロンプトを作成してAIに渡す(詳細設定対応)'
        : 'Create custom prompts for AI with detailed settings',
      isHighlight: false,
      action: () => onNavigate('promptGenerator'),
    },
    {
      id: 'paste',
      icon: ClipboardPaste,
      title: language === 'ja' ? '貼り付ける' : 'Paste & Import',
      description: language === 'ja'
        ? 'ノートやリストをペースト → 自動でQ&Aを認識'
        : 'Paste notes or lists → auto-detect Q&A format',
      isHighlight: false,
      action: () => onNavigate('editor', { editorMode: 'paste' }),
    },
    {
      id: 'photo',
      icon: Camera,
      title: language === 'ja' ? '写真・PDFから' : 'From Photo/PDF',
      description: language === 'ja'
        ? '教科書やプリントを撮影して読み取り'
        : 'Scan textbooks or handouts',
      isHighlight: false,
      action: () => onNavigate('editor', { editorMode: 'photo' }),
    },
    {
      id: 'manual',
      icon: PenLine,
      title: language === 'ja' ? '手で入力' : 'Manual Input',
      description: language === 'ja'
        ? '1問ずつていねいに作成(CSV入出力対応)'
        : 'Create one by one (CSV import/export)',
      isHighlight: false,
      action: () => onNavigate('editor', { editorMode: 'manual' }),
    },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#F8FAFC] mb-1">
          {language === 'ja' ? '問題をつくる' : 'Create Problems'}
        </h1>
        <p className="text-[13px] text-[#94A3B8]">
          {language === 'ja' ? 'いちばんラクな方法を選んでください' : 'Pick the easiest method for you'}
        </p>
      </div>

      {/* Method Cards */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-3">
        {methods.map((method, index) => (
          <motion.button
            key={method.id}
            onClick={method.action}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-left w-full"
          >
            <div
              className="rounded-2xl p-[22px] transition-transform active:scale-[0.98]"
              style={
                method.isHighlight
                  ? {
                      background: 'linear-gradient(135deg, rgba(30,58,138,0.3), rgba(22,78,99,0.3))',
                      border: '1px solid rgba(99,102,241,0.4)',
                    }
                  : {
                      background: 'rgba(30,41,59,0.7)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }
              }
            >
              <div className="flex justify-between items-center mb-[6px]">
                <div className="flex items-center gap-2">
                  <method.icon size={18} className={method.isHighlight ? 'text-[#818CF8]' : 'text-[#94A3B8]'} />
                  <span className={`font-bold ${method.isHighlight ? 'text-[17px]' : 'text-base'}`}>
                    {method.title}
                  </span>
                </div>
                {method.badge && (
                  <span className="text-[11px] font-bold text-[#818CF8] bg-[rgba(99,102,241,0.15)] rounded-full px-[10px] py-1">
                    {method.badge}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#94A3B8] leading-[1.7]">
                {method.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Flow explanation */}
      <div className="mt-4 pt-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] text-[#64748B] leading-relaxed">
          {language === 'ja'
            ? '問題を作成 → クイズでプレイ → SM-2で自動復習'
            : 'Create problems → Play quiz → Auto-review with SM-2'}
        </p>
      </div>

      {/* Recent info */}
      {recentInfo && (
        <div className="mt-auto pt-4 text-center text-[12px] text-[#64748B]">
          {recentInfo}
        </div>
      )}
    </div>
  );
}
