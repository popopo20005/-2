import type { Problem } from '../types';

interface ProblemPreviewProps {
  problem: Problem;
  language: 'ja' | 'en';
  position: { x: number; y: number };
}

export function ProblemPreview({ problem, language, position }: ProblemPreviewProps) {
  const maxWidth = 400;
  const maxHeight = 500;
  const adjustedX = Math.min(position.x, window.innerWidth - maxWidth - 20);
  const adjustedY = Math.min(position.y, window.innerHeight - maxHeight - 20);

  return (
    <div className="fixed z-50 bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg shadow-2xl p-4 max-w-md animate-fadeIn" style={{ left: `${adjustedX}px`, top: `${adjustedY}px`, maxHeight: `${maxHeight}px`, width: `${maxWidth}px` }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">{problem.category}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{problem.type === 'multiple-choice' ? (language === 'ja' ? '選択式' : 'Multiple Choice') : (language === 'ja' ? '〇×式' : 'True/False')}</span>
      </div>
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{language === 'ja' ? '問題' : 'Question'}</h4>
        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{problem.question}</p>
      </div>
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{problem.type === 'multiple-choice' ? (language === 'ja' ? '選択肢' : 'Options') : (language === 'ja' ? '解答' : 'Answer')}</h4>
        {problem.type === 'multiple-choice' ? (<ul className="space-y-1">{problem.options?.map((option, index) => (<li key={index} className={`text-sm p-2 rounded ${problem.correctAnswer === index ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium' : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{index + 1}. {option}</li>))}</ul>) : (<p className="text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-2 rounded font-medium">{problem.answer ? (language === 'ja' ? '〇' : 'True') : (language === 'ja' ? '×' : 'False')}</p>)}
      </div>
      {problem.explanation && (<div><h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{language === 'ja' ? '解説' : 'Explanation'}</h4><p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-y-auto max-h-32">{problem.explanation}</p></div>)}
    </div>
  );
}
