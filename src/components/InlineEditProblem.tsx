import { useState, useEffect } from 'react';
import type { Problem } from '../types';

interface InlineEditProblemProps {
  problem: Problem;
  onSave: (updatedProblem: Problem) => void;
  onCancel: () => void;
  language: 'ja' | 'en';
}

export function InlineEditProblem({ problem, onSave, onCancel, language }: InlineEditProblemProps) {
  const [formData, setFormData] = useState({
    category: problem.category,
    question: problem.question,
    type: problem.type,
    answer: problem.answer,
    explanation: problem.explanation,
    options: problem.options && problem.options.length > 0 ? problem.options : ['', ''],
    correctAnswer: problem.correctAnswer || 0
  });

  const t = {
    ja: {
      category: 'カテゴリー',
      question: '問題文',
      type: '種類',
      answer: '正解',
      explanation: '解説',
      options: '選択肢',
      save: '保存',
      cancel: 'キャンセル',
      multipleChoice: '選択問題',
      trueFalse: '○×問題',
      true: '○（正しい）',
      false: '×（誤り）',
      option: '選択肢',
      addOption: '選択肢を追加',
      removeOption: '削除',
      minOptionsWarning: '最低2つの選択肢が必要です'
    },
    en: {
      category: 'Category',
      question: 'Question',
      type: 'Type',
      answer: 'Answer',
      explanation: 'Explanation',
      options: 'Options',
      save: 'Save',
      cancel: 'Cancel',
      multipleChoice: 'Multiple Choice',
      trueFalse: 'True/False',
      true: 'True',
      false: 'False',
      option: 'Option',
      addOption: 'Add Option',
      removeOption: 'Remove',
      minOptionsWarning: 'At least 2 options are required'
    }
  };

  const currentLang = language;

  const handleAddOption = () => {
    if (formData.options.length >= 10) {
      alert(currentLang === 'ja' ? '選択肢は最大10個までです' : 'Maximum 10 options allowed');
      return;
    }
    setFormData({
      ...formData,
      options: [...formData.options, '']
    });
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length <= 2) {
      alert(t[currentLang].minOptionsWarning);
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      options: newOptions,
      // 正解が削除された選択肢だった場合は0にリセット
      correctAnswer: formData.correctAnswer >= newOptions.length ? 0 : formData.correctAnswer
    });
  };

  const handleSave = () => {
    const updatedProblem: Problem = {
      ...problem,
      category: formData.category,
      question: formData.question,
      type: formData.type,
      explanation: formData.explanation,
      ...(formData.type === 'multiple-choice' ? {
        options: formData.options,
        correctAnswer: formData.correctAnswer,
        answer: false
      } : {
        answer: formData.answer,
        options: [],
        correctAnswer: 0
      })
    };
    onSave(updatedProblem);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  useEffect(() => {
    // フォーカスを最初の入力欄に設定
    const firstInput = document.querySelector<HTMLInputElement>('#inline-edit-category');
    if (firstInput) {
      firstInput.focus();
      firstInput.select();
    }
  }, []);

  return (
    <tr className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400">
      <td colSpan={4} className="p-4">
        <div className="space-y-3" onKeyDown={handleKeyDown}>
          {/* カテゴリーと種類 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t[currentLang].category}
              </label>
              <input
                id="inline-edit-category"
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t[currentLang].type}
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'true-false' | 'multiple-choice' })}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
              >
                <option value="true-false">{t[currentLang].trueFalse}</option>
                <option value="multiple-choice">{t[currentLang].multipleChoice}</option>
              </select>
            </div>
          </div>

          {/* 問題文 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t[currentLang].question}
            </label>
            <textarea
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              rows={2}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* 正解（○×問題の場合） */}
          {formData.type === 'true-false' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t[currentLang].answer}
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={formData.answer === true}
                    onChange={() => setFormData({ ...formData, answer: true })}
                    className="form-radio text-green-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t[currentLang].true}</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={formData.answer === false}
                    onChange={() => setFormData({ ...formData, answer: false })}
                    className="form-radio text-red-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t[currentLang].false}</span>
                </label>
              </div>
            </div>
          )}

          {/* 選択肢（選択問題の場合） */}
          {formData.type === 'multiple-choice' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t[currentLang].options}
              </label>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={formData.correctAnswer === index}
                      onChange={() => setFormData({ ...formData, correctAnswer: index })}
                      className="form-radio text-green-600 flex-shrink-0"
                      title={`${t[currentLang].option} ${index + 1}を正解にする`}
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...formData.options];
                        newOptions[index] = e.target.value;
                        setFormData({ ...formData, options: newOptions });
                      }}
                      placeholder={`${t[currentLang].option} ${index + 1}`}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      disabled={formData.options.length <= 2}
                      className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      title={t[currentLang].removeOption}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddOption}
                  disabled={formData.options.length >= 10}
                  className="mt-2 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={formData.options.length >= 10 ? (currentLang === 'ja' ? '選択肢は最大10個まで' : 'Maximum 10 options') : ''}
                >
                  <span className="text-base">+</span>
                  {t[currentLang].addOption} ({formData.options.length}/10)
                </button>
              </div>
            </div>
          )}

          {/* 解説 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t[currentLang].explanation}
            </label>
            <textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              rows={2}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t[currentLang].cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm quiz-action-button rounded transition-all shadow-md hover:shadow-lg"
            >
              {t[currentLang].save} (Ctrl+Enter)
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
            Esc: {t[currentLang].cancel} | Ctrl+Enter: {t[currentLang].save}
          </div>
        </div>
      </td>
    </tr>
  );
}
