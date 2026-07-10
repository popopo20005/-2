/**
 * AIHandoff - おつかい画面 (コピー後・戻り待ち)
 * Claude Design モック 4d 準拠
 * 外部AIへのディープリンク + クリップボード検知 + 貼り付けプレビュー
 */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { View } from '../types';

interface AIHandoffProps {
  language: 'ja' | 'en';
  onNavigate: (view: View, options?: any) => void;
  onBack: () => void;
}

interface ParsedProblem {
  question: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  category?: string;
  difficulty?: string;
}

export function AIHandoff({ language, onNavigate, onBack }: AIHandoffProps) {
  const [clipboardDetected, setClipboardDetected] = useState(false);
  const [, setPastedContent] = useState('');
  const [parsedProblems, setParsedProblems] = useState<ParsedProblem[]>([]);
  const [autoFixCount, setAutoFixCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // クリップボード検知（フォーカス復帰時）
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.length > 50 && (text.includes('{') || text.includes('Q') || text.includes('問'))) {
          setClipboardDetected(true);
        }
      } catch { /* clipboard permission denied */ }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      let text = '';
      try {
        text = await navigator.clipboard.readText();
      } catch {
        // Clipboard API不可の場合はテキストエリアで受け取る
      }
      if (text) {
        processContent(text);
      }
    } catch { /* ignore */ }
  }, []);

  const handleManualPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      processContent(text);
    }
  };

  const processContent = (text: string) => {
    setPastedContent(text);
    let problems: ParsedProblem[] = [];
    let fixes = 0;
    let errors = 0;

    // JSON形式を試行
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let parsed = JSON.parse(jsonMatch[0]);

        // questions配列を見つける
        const questions = parsed.questions || parsed.data || (Array.isArray(parsed) ? parsed : null);

        if (questions && Array.isArray(questions)) {
          for (const q of questions) {
            const problem: ParsedProblem = {
              question: q.question || q.text || q.問題文 || '',
              options: q.options || q.choices || q.選択肢 || [],
              correctAnswer: typeof q.correctAnswer === 'string' ? (parseInt(q.correctAnswer, 10) || 0) : (q.correctAnswer ?? q.answer ?? 0),
              explanation: q.explanation || q.解説 || '',
              category: q.category || parsed.category || '',
              difficulty: q.difficulty || '',
            };

            // 自動修正: correctAnswerが文字列→数値
            if (typeof q.correctAnswer === 'string') fixes++;
            // 自動修正: 選択肢の重複
            if (problem.options && new Set(problem.options).size < problem.options.length) {
              problem.options = [...new Set(problem.options)];
              fixes++;
            }

            if (problem.question) {
              problems.push(problem);
            } else {
              errors++;
            }
          }
        }
      }
    } catch {
      // JSONパース失敗 → テキスト形式を試行
      const lines = text.split('\n').filter(l => l.trim());
      let currentQ: ParsedProblem | null = null;

      for (const line of lines) {
        const qMatch = line.match(/^[QqＱ]\.?\s*(\d+)?[.．:：\s]*(.+)/);
        const aMatch = line.match(/^[AaＡ]\.?\s*(\d+)?[.．:：\s]*(.+)/);

        if (qMatch) {
          if (currentQ) problems.push(currentQ);
          currentQ = { question: qMatch[2].trim() };
        } else if (aMatch && currentQ) {
          currentQ.explanation = aMatch[2].trim();
        }
      }
      if (currentQ) problems.push(currentQ);
    }

    setParsedProblems(problems);
    setAutoFixCount(fixes);
    setErrorCount(errors);
    setShowPreview(problems.length > 0);
  };

  const handleImport = () => {
    // 問題をインポートしてライブラリへ
    const importData = parsedProblems.map(p => ({
      question: p.question,
      options: p.options || [],
      correctAnswer: p.correctAnswer ?? 0,
      explanation: p.explanation || '',
      category: p.category || '',
      type: 'multiple-choice' as const,
    }));

    onNavigate('editor' as View, {
      editorMode: 'import',
      importData,
    });
  };

  const aiLinks = [
    { name: 'ChatGPT', color: '#10A37F', url: 'https://chat.openai.com' },
    { name: 'Claude', color: '#D97757', url: 'https://claude.ai' },
    { name: 'Gemini', color: 'linear-gradient(135deg,#4285F4,#9B72CB)', url: 'https://gemini.google.com' },
  ];

  // プレビュー表示（screen 4e）
  if (showPreview) {
    return (
      <div className="h-full bg-[#0F172A] text-[#F8FAFC] flex flex-col max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full px-6 pt-4 pb-10">
        <div className="flex justify-between items-center mb-[18px]">
          <button onClick={() => setShowPreview(false)} className="text-[#64748B] text-[15px]">✕</button>
          <span className="text-[15px] font-bold">
            {language === 'ja' ? 'JSONを認識しました' : 'JSON Detected'}
          </span>
          <span className="w-5" />
        </div>

        {/* Stats */}
        <div className="flex gap-2 mb-[18px]">
          <div className="flex-1 rounded-[12px] py-3 px-2 text-center"
               style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)' }}>
            <div className="text-[18px] font-bold text-[#34D399]">{parsedProblems.length}</div>
            <div className="text-[10px] text-[#64748B]">{language === 'ja' ? '問題を認識' : 'Detected'}</div>
          </div>
          <div className="flex-1 rounded-[12px] py-3 px-2 text-center"
               style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <div className="text-[18px] font-bold text-[#FBBF24]">{autoFixCount}</div>
            <div className="text-[10px] text-[#64748B]">{language === 'ja' ? '自動修正' : 'Auto-fixed'}</div>
          </div>
          <div className="flex-1 rounded-[12px] py-3 px-2 text-center"
               style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-[18px] font-bold text-[#94A3B8]">{errorCount}</div>
            <div className="text-[10px] text-[#64748B]">{language === 'ja' ? 'エラー' : 'Errors'}</div>
          </div>
        </div>

        {/* Auto-fix details */}
        {autoFixCount > 0 && (
          <div className="rounded-[12px] px-4 py-3 mb-[14px]"
               style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <p className="text-[12px] text-[#FDE68A] leading-[1.8]">
              {language === 'ja'
                ? `自動修正: ${autoFixCount}件の修正を適用しました`
                : `Auto-fixed: ${autoFixCount} corrections applied`}
            </p>
          </div>
        )}

        {/* Problem list */}
        <div className="flex flex-col gap-[10px] flex-1 overflow-auto">
          {parsedProblems.slice(0, 3).map((p, i) => (
            <div key={i} className="rounded-[14px] px-[18px] py-[14px]"
                 style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-[11px] text-[#64748B] mb-1">
                Q{i + 1} {p.category && `・ ${p.category}`} {p.difficulty && `・ ${p.difficulty}`}
              </div>
              <div className="text-[14px] font-semibold leading-[1.6]">{p.question}</div>
            </div>
          ))}
          {parsedProblems.length > 3 && (
            <p className="text-center text-[12px] text-[#64748B]">
              {language === 'ja' ? `ほか${parsedProblems.length - 3}問…` : `${parsedProblems.length - 3} more...`}
            </p>
          )}
        </div>

        {/* Import CTA */}
        <motion.button
          onClick={handleImport}
          className="w-full h-[56px] rounded-2xl flex items-center justify-center text-[16px] font-bold mt-4"
          style={{ background: '#10B981', color: '#052E22', boxShadow: '0 0 20px rgba(16,185,129,0.35)' }}
          whileTap={{ scale: 0.97 }}
        >
          {parsedProblems.length}{language === 'ja' ? '問を取り込む' : ' problems to import'}
        </motion.button>
      </div>
    );
  }

  // おつかい画面（screen 4d）
  return (
    <div className="h-full bg-[#0F172A] text-[#F8FAFC] flex flex-col max-w-md md:max-w-2xl lg:max-w-4xl mx-auto w-full px-6 pt-4 pb-10">
      {/* Header */}
      <div className="flex justify-between mb-[22px]">
        <button onClick={onBack} className="text-[#64748B] text-[14px]">
          {language === 'ja' ? '← プロンプトへ' : '← To Prompt'}
        </button>
        <span className="text-[14px] font-semibold">
          {language === 'ja' ? 'AIにわたす' : 'Send to AI'}
        </span>
        <span className="w-[60px]" />
      </div>

      {/* Copied badge */}
      <div className="self-center mb-6 rounded-full px-5 py-2 text-[13px] font-bold text-[#34D399]"
           style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)' }}>
        {language === 'ja' ? '✓ プロンプトをコピーしました' : '✓ Prompt copied'}
      </div>

      {/* Step 1: Open AI */}
      <p className="text-[12px] font-semibold text-[#64748B] mb-[10px]">
        {language === 'ja' ? '1. お使いのAIに貼り付けて送信' : '1. Paste in your AI and send'}
      </p>
      <div className="flex gap-[10px] mb-[22px]">
        {aiLinks.map(ai => (
          <a
            key={ai.name}
            href={ai.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-[14px] py-4 px-2 text-center"
            style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div
              className="w-[34px] h-[34px] rounded-[10px] mx-auto mb-2"
              style={{ background: ai.color.startsWith('linear') ? ai.color : ai.color }}
            />
            <div className="text-[12px] font-semibold">{ai.name}</div>
            <div className="text-[10px] text-[#64748B]">{language === 'ja' ? '開く ↗' : 'Open ↗'}</div>
          </a>
        ))}
      </div>

      {/* Step 2: Paste back */}
      <p className="text-[12px] font-semibold text-[#64748B] mb-[10px]">
        {language === 'ja' ? '2. AIの返事をコピーして、ここに戻る' : '2. Copy AI response and come back'}
      </p>
      <div
        className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-[10px] mb-[14px] cursor-pointer"
        style={{
          background: 'rgba(15,23,42,0.8)',
          border: '1.5px dashed rgba(99,102,241,0.5)',
        }}
        onClick={handlePaste}
        onPaste={handleManualPaste}
        tabIndex={0}
        contentEditable
        suppressContentEditableWarning
      >
        <div
          className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-[20px] text-[#818CF8]"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)' }}
        >
          ⇩
        </div>
        <p className="text-[14px] font-semibold text-[#C7D2FE]">
          {language === 'ja' ? 'ここをタップして貼り付け' : 'Tap here to paste'}
        </p>
        <p className="text-[12px] text-[#64748B]">
          {language === 'ja' ? '形式がくずれていても自動修正します' : 'Auto-fixes formatting issues'}
        </p>
      </div>

      {/* Clipboard detection banner */}
      {clipboardDetected && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handlePaste}
          className="rounded-[14px] px-[18px] py-[14px] flex justify-between items-center"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.35)' }}
        >
          <span className="text-[13px] text-[#C7D2FE]">
            {language === 'ja' ? 'クリップボードにAIの返事があります' : 'AI response in clipboard'}
          </span>
          <span className="bg-[#6366F1] rounded-full px-4 py-2 text-[12px] font-bold">
            {language === 'ja' ? '貼り付ける' : 'Paste'}
          </span>
        </motion.button>
      )}
    </div>
  );
}
