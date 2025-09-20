import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface QuizSet {
  id?: number;
  name: string;
}

interface QuizSetStats {
  quizSet: QuizSet;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  lastPlayed?: Date;
}

interface QuizSetStatsChartProps {
  quizSetStats: QuizSetStats[];
  isDarkMode?: boolean;
}

export function QuizSetStatsChart({ quizSetStats, isDarkMode = false }: QuizSetStatsChartProps) {
  // 正答率で降順ソート、上位10件まで表示
  const sortedStats = [...quizSetStats]
    .filter(stat => stat.totalAnswered > 0) // 解答がある問題集のみ
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 10);

  const data = {
    labels: sortedStats.map(stat => {
      // ラベルが長い場合は短縮
      return stat.quizSet.name.length > 15 ? stat.quizSet.name.substring(0, 15) + '...' : stat.quizSet.name;
    }),
    datasets: [
      {
        label: '正答率 (%)',
        data: sortedStats.map(stat => stat.accuracy),
        backgroundColor: sortedStats.map(stat => {
          if (stat.accuracy >= 80) return 'rgba(34, 197, 94, 0.8)';   // green
          if (stat.accuracy >= 60) return 'rgba(234, 179, 8, 0.8)';   // yellow
          return 'rgba(239, 68, 68, 0.8)';                            // red
        }),
        borderColor: sortedStats.map(stat => {
          if (stat.accuracy >= 80) return 'rgba(34, 197, 94, 1)';
          if (stat.accuracy >= 60) return 'rgba(234, 179, 8, 1)';
          return 'rgba(239, 68, 68, 1)';
        }),
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDarkMode ? '#f9fafb' : '#111827',
        bodyColor: isDarkMode ? '#f9fafb' : '#111827',
        borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
        borderWidth: 1,
        callbacks: {
          title: function(context: any) {
            const index = context[0].dataIndex;
            return sortedStats[index].quizSet.name;
          },
          label: function(context: any) {
            const index = context.dataIndex;
            const stat = sortedStats[index];
            return [
              `正答率: ${stat.accuracy.toFixed(1)}%`,
              `正解数: ${stat.totalCorrect}/${stat.totalAnswered}`,
              `最終プレイ: ${stat.lastPlayed ? new Date(stat.lastPlayed).toLocaleDateString('ja-JP') : '未プレイ'}`
            ];
          }
        }
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)',
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          callback: function(value: any) {
            return value + '%';
          },
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          font: {
            size: 11,
          },
        },
      },
    },
  };

  if (sortedStats.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        プレイした問題集がありません
      </div>
    );
  }

  // 高さを動的に調整（項目数に応じて）
  const chartHeight = Math.max(240, sortedStats.length * 40);

  return (
    <div style={{ height: `${chartHeight}px` }} className="w-full">
      <Bar data={data} options={options} />
    </div>
  );
}