import type { ProblemCSV } from '../lib/csvUtils';

interface CSVPreviewProps {
  data: ProblemCSV[];
  errors: string[];
  warnings: string[];
  onClose: () => void;
  onConfirm: () => void;
  language?: 'ja' | 'en';
}

export function CSVPreview({ data, errors, warnings, onClose, onConfirm, language = 'ja' }: CSVPreviewProps) {
  console.log('=== CSVPreview Rendering ===');
  console.log('Data length:', data?.length);
  console.log('Errors length:', errors?.length);
  console.log('Warnings length:', warnings?.length);
  console.trace('Render stack trace');

  // Safety check for data
  if (!data || !Array.isArray(data)) {
    console.error('CSVPreview: Invalid data prop', data);
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
            エラー
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            CSVデータの読み込みに失敗しました。
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  const t = {
    ja: {
      title: 'CSVプレビュー',
      subtitle: '最初の10行を表示',
      totalRows: '合計行数',
      errors: 'エラー',
      warnings: '警告',
      noErrors: 'エラーはありません',
      noWarnings: '警告はありません',
      columns: {
        category: 'カテゴリ',
        question: '問題',
        answer: '答え',
        explanation: '解説',
        options: '選択肢',
        type: 'タイプ'
      },
      buttons: {
        cancel: 'キャンセル',
        import: 'インポート実行'
      },
      typeLabels: {
        'multiple-choice': '多択',
        'true-false': '○×'
      }
    },
    en: {
      title: 'CSV Preview',
      subtitle: 'Showing first 10 rows',
      totalRows: 'Total rows',
      errors: 'Errors',
      warnings: 'Warnings',
      noErrors: 'No errors',
      noWarnings: 'No warnings',
      columns: {
        category: 'Category',
        question: 'Question',
        answer: 'Answer',
        explanation: 'Explanation',
        options: 'Options',
        type: 'Type'
      },
      buttons: {
        cancel: 'Cancel',
        import: 'Confirm Import'
      },
      typeLabels: {
        'multiple-choice': 'Multiple Choice',
        'true-false': 'True/False'
      }
    }
  };

  const texts = t[language];
  const hasErrors = errors.length > 0;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div
        className="rounded-lg w-full overflow-hidden flex flex-col shadow-2xl"
        style={{
          maxWidth: '72rem',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          opacity: 1
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700" style={{ backgroundColor: '#ffffff' }}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2" style={{ color: '#111827' }}>
            {texts.title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400" style={{ color: '#4b5563' }}>
            {texts.subtitle} - {texts.totalRows}: {data.length}
          </p>
        </div>

        {/* Errors and Warnings */}
        {(errors.length > 0 || warnings.length > 0) && (
          <div className="p-6 space-y-4 border-b border-gray-200 dark:border-gray-700" style={{ backgroundColor: '#ffffff' }}>
            {errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                  {texts.errors} ({errors.length})
                </h3>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 max-h-32 overflow-y-auto">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  {texts.warnings} ({warnings.length})
                </h3>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 max-h-32 overflow-y-auto">
                  {warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {errors.length === 0 && warnings.length === 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                  ✓ {texts.noErrors}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Preview Table */}
        <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: '#ffffff' }}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" style={{ backgroundColor: '#ffffff' }}>
              <thead className="sticky top-0" style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    {texts.columns.category}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[300px]" style={{ color: '#6b7280' }}>
                    {texts.columns.question}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    {texts.columns.answer}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    {texts.columns.options}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px]" style={{ color: '#6b7280' }}>
                    {texts.columns.explanation}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200" style={{ backgroundColor: '#ffffff' }}>
                {data.map((row, index) => {
                  // Memoize options check to prevent recalculation
                  const options = [row.option1, row.option2, row.option3, row.option4];
                  const validOptions = options.filter(opt => opt && opt.trim());
                  const hasOptions = validOptions.length > 0;

                  return (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" style={{ color: '#6b7280' }}>
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white" style={{ color: '#111827' }}>
                        {row.category ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {row.category}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs" style={{ color: '#9ca3af' }}>(empty)</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white" style={{ color: '#111827' }}>
                        <div className="line-clamp-2">{row.question || '(empty)'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {!row.answer ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            (empty)
                          </span>
                        ) : hasOptions ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            {row.answer}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            row.answer?.toLowerCase() === 'true' || row.answer === '○'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {row.answer}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300" style={{ color: '#374151' }}>
                        {hasOptions ? (
                          <div className="space-y-1">
                            {validOptions.map((opt, i) => (
                              <div key={`opt-${index}-${i}`} className="text-xs line-clamp-1" style={{ color: '#374151' }}>
                                {i + 1}. {opt}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300" style={{ color: '#374151' }}>
                        <div className="line-clamp-2">{row.explanation || '(empty)'}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3" style={{ backgroundColor: '#ffffff' }}>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            style={{ color: '#374151', borderColor: '#d1d5db' }}
          >
            {texts.buttons.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={hasErrors}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              hasErrors
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
            }`}
            style={hasErrors ? { backgroundColor: '#d1d5db', color: '#6b7280' } : { backgroundColor: '#2563eb', color: '#ffffff' }}
          >
            {texts.buttons.import}
          </button>
        </div>
      </div>
    </div>
  );
}
