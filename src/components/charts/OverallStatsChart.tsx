import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface OverallStatsChartProps {
  totalCorrect: number;
  totalIncorrect: number;
  isDarkMode?: boolean;
  language?: 'ja' | 'en';
}

export function OverallStatsChart({ totalCorrect, totalIncorrect, isDarkMode = false, language = 'ja' }: OverallStatsChartProps) {
  // 翻訳テキスト
  const t = {
    ja: {
      correct: '正解',
      incorrect: '不正解',
      accuracy: '正答率',
      times: '回'
    },
    en: {
      correct: 'Correct',
      incorrect: 'Incorrect',
      accuracy: 'Accuracy',
      times: ' times'
    }
  };

  const currentLang = language as keyof typeof t;
  const data = {
    labels: [t[currentLang].correct, t[currentLang].incorrect],
    datasets: [
      {
        data: [totalCorrect, totalIncorrect],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // green-500
          'rgba(239, 68, 68, 0.8)',   // red-500
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(34, 197, 94, 0.9)',
          'rgba(239, 68, 68, 0.9)',
        ],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          color: isDarkMode ? '#f9fafb' : '#111827',
          font: {
            size: 14,
            weight: 500,
          },
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDarkMode ? '#f9fafb' : '#111827',
        bodyColor: isDarkMode ? '#f9fafb' : '#111827',
        borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = totalCorrect + totalIncorrect;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value}${t[currentLang].times} (${percentage}%)`;
          }
        }
      },
    },
    cutout: '60%',
  };

  const totalAnswered = totalCorrect + totalIncorrect;
  const accuracy = totalAnswered > 0 ? ((totalCorrect / totalAnswered) * 100).toFixed(1) : '0.0';

  return (
    <div className="relative">
      <div className="h-64 w-full">
        <Doughnut data={data} options={options} />
      </div>
      {/* 中央に正答率を表示 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {accuracy}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t[currentLang].accuracy}
          </div>
        </div>
      </div>
    </div>
  );
}