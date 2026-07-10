/**
 * PromptWizard - プロンプト作成画面 (スマート生成・1画面完結)
 * Claude Design モック 4c 準拠
 * 弱点・学習履歴を自動反映してプロンプトを生成
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { detectTopWeaknesses } from '../services/weaknessDetectionService';
import { problemService } from '../lib/database';
import type { View } from '../types';

interface PromptWizardProps {
  language: 'ja' | 'en';
  onNavigate: (view: View, options?: any) => void;
  onBack: () => void;
}

type SourceType = 'weakness' | 'category' | 'paste';
type FormatType = 'json' | 'text';

export function PromptWizard({ language, onNavigate, onBack }: PromptWizardProps) {
  const [source, setSource] = useState<SourceType>('weakness');
  const [questionCount, setQuestionCount] = useState(20);
  const [format, setFormat] = useState<FormatType>('json');
  const [questionType, setQuestionType] = useState('4択');
  const [weaknessLabel, setWeaknessLabel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    generatePromptPreview();
  }, [source, questionCount, format, questionType, selectedCategory]);

  const loadData = async () => {
    try {
      const weaknesses = await detectTopWeaknesses();
      if (weaknesses.length > 0) {
        setWeaknessLabel(weaknesses.map(w => w.category).join('・'));
      }
      const problems = await problemService.getAll();
      const cats = [...new Set(problems.map(p => p.category))];
      setCategories(cats);
      if (cats.length > 0) setSelectedCategory(cats[0]);
    } catch { /* ignore */ }
  };

  const generatePromptPreview = () => {
    const sourceText = source === 'weakness' ? weaknessLabel || '弱点分野' : selectedCategory || 'カテゴリ';
    const formatInstruction = format === 'json'
      ? `\n出力フォーマット: JSON\n\`\`\`json\n{ "category": "${sourceText}", "questions": [ { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "..." } ] }\n\`\`\``
      : `\n出力フォーマット: テキスト(問題文 / 選択肢 / 正解 / 解説)`;

    setPrompt(
      `# クイズ問題作成指示(${format === 'json' ? 'JSON' : 'テキスト'}形式)\n` +
      `対象: ${sourceText}\n` +
      `難易度: 自動(直近の正答率に合わせる)\n` +
      `問題数: ${questionCount}問 / ${questionType}` +
      formatInstruction
    );
  };

  const handleCopyAndGo = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch { /* clipboard not available */ }
    localStorage.setItem('promptGenerated', 'true');
    onNavigate('aiHandoff' as View, { prompt, questionCount });
  };

  const sourceOptions: { id: SourceType; label: string; labelEn: string }[] = [
    { id: 'weakness', label: `弱点から(${weaknessLabel || '分析中'})`, labelEn: `From weakness (${weaknessLabel || 'analyzing'})` },
    { id: 'category', label: 'カテゴリを選ぶ', labelEn: 'Choose category' },
    { id: 'paste', label: '資料を貼り付け', labelEn: 'Paste reference' },
  ];

  return (
    <div className="h-full bg-[#0F172A] text-[#F8FAFC] flex flex-col max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full px-6 pt-4 pb-10">
      {/* Header */}
      <div className="flex justify-between mb-[18px]">
        <button onClick={onBack} className="text-[#64748B] text-[14px]">
          {language === 'ja' ? '← 戻る' : '← Back'}
        </button>
        <span className="text-[14px] font-semibold">
          {language === 'ja' ? 'プロンプトをつくる' : 'Create Prompt'}
        </span>
        <button
          onClick={() => onNavigate('editor' as View, { editorMode: 'manual' })}
          className="text-[13px] text-[#64748B]"
        >
          {language === 'ja' ? '手動設定' : 'Manual'}
        </button>
      </div>

      {/* Source selection */}
      <p className="text-[12px] font-semibold text-[#64748B] mb-2">
        {language === 'ja' ? 'なにから問題をつくる?' : 'What to create from?'}
      </p>
      <div className="flex flex-wrap gap-2 mb-[18px]">
        {sourceOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setSource(opt.id)}
            className="rounded-full px-4 py-2 text-[13px] font-semibold transition-colors"
            style={source === opt.id
              ? { background: 'rgba(99,102,241,0.15)', border: '1.5px solid #6366F1' }
              : { background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }
            }
          >
            {language === 'ja' ? opt.label : opt.labelEn}
          </button>
        ))}
      </div>

      {/* Category selector (when source=category) */}
      {source === 'category' && categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-[18px]">
          {categories.slice(0, 6).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="rounded-full px-3 py-[6px] text-[12px]"
              style={selectedCategory === cat
                ? { background: 'rgba(99,102,241,0.15)', border: '1.5px solid #6366F1' }
                : { background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Count + Type */}
      <div className="flex gap-[10px] mb-[18px]">
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-[#64748B] mb-2">
            {language === 'ja' ? '問題数: ' : 'Count: '}
            <span className="text-[#818CF8] font-bold">{questionCount}</span>
          </p>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={questionCount}
            onChange={e => setQuestionCount(Number(e.target.value))}
            className="w-full accent-[#6366F1]"
          />
        </div>
        <div className="w-[110px]">
          <p className="text-[12px] font-semibold text-[#64748B] mb-2">
            {language === 'ja' ? '形式' : 'Type'}
          </p>
          <select
            value={questionType}
            onChange={e => setQuestionType(e.target.value)}
            className="w-full rounded-[10px] px-3 py-2 text-[13px] bg-[rgba(30,41,59,0.7)] border border-white/10 text-white"
          >
            <option value="4択">4{language === 'ja' ? '択' : '-choice'}</option>
            <option value="○×">○×</option>
            <option value="混合">{language === 'ja' ? '混合' : 'Mixed'}</option>
          </select>
        </div>
      </div>

      {/* Format */}
      <div className="flex items-center gap-[10px] mb-[18px]">
        <span className="text-[12px] font-semibold text-[#64748B]">
          {language === 'ja' ? '出力フォーマット' : 'Output format'}
        </span>
        <button
          onClick={() => setFormat('json')}
          className="rounded-full px-[14px] py-[6px] text-[12px] font-bold"
          style={format === 'json'
            ? { background: 'rgba(99,102,241,0.15)', border: '1.5px solid #6366F1' }
            : { background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }
          }
        >
          JSON <span className="text-[#34D399]">{language === 'ja' ? '推奨' : 'Rec.'}</span>
        </button>
        <button
          onClick={() => setFormat('text')}
          className="rounded-full px-[14px] py-[6px] text-[12px]"
          style={format === 'text'
            ? { background: 'rgba(99,102,241,0.15)', border: '1.5px solid #6366F1' }
            : { background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }
          }
        >
          {language === 'ja' ? 'テキスト' : 'Text'}
        </button>
      </div>

      {/* Preview */}
      <div
        className="rounded-[14px] px-4 py-[14px] mb-2 flex-1 overflow-auto"
        style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex justify-between mb-2">
          <span className="text-[11px] font-bold text-[#64748B]">
            {language === 'ja' ? 'プレビュー' : 'Preview'}
          </span>
          <span className="text-[11px] text-[#818CF8]">
            {language === 'ja' ? '全文をみる' : 'Full text'}
          </span>
        </div>
        <pre className="text-[11px] text-[#94A3B8] leading-[1.9] font-mono whitespace-pre-wrap">
          {prompt}
        </pre>
      </div>

      <p className="text-[11px] text-[#64748B] mb-[14px]">
        {language === 'ja' ? '弱点・学習履歴が自動で反映されています' : 'Weakness & history auto-reflected'}
      </p>

      {/* CTA */}
      <motion.button
        onClick={handleCopyAndGo}
        className="w-full h-[56px] rounded-2xl bg-[#6366F1] flex items-center justify-center text-[16px] font-bold text-white"
        style={{ boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
        whileTap={{ scale: 0.97 }}
      >
        {language === 'ja' ? 'コピーしてAIにわたす →' : 'Copy & send to AI →'}
      </motion.button>
    </div>
  );
}
