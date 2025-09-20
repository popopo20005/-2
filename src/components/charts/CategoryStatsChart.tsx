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

interface CategoryStats {
  category: string;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  problemCount: number;
}

interface CategoryStatsChartProps {
  categoryStats: CategoryStats[];
  isDarkMode?: boolean;
}

export function CategoryStatsChart({ categoryStats, isDarkMode = false }: CategoryStatsChartProps) {
  const sortedStats = [...categoryStats].sort((a, b) => b.accuracy - a.accuracy);
  
  const data = {
    labels: sortedStats.map(stat => {
      // ラベルが長い場合は短縮
      return stat.category.length > 12 ? stat.category.substring(0, 12) + '...' : stat.category;
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
            return sortedStats[index].category;
          },
          label: function(context: any) {
            const index = context.dataIndex;
            const stat = sortedStats[index];
            return [
              `正答率: ${stat.accuracy.toFixed(1)}%`,
              `正解数: ${stat.totalCorrect}/${stat.totalAnswered}`,
              `問題数: ${stat.problemCount}問`
            ];
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          font: {
            size: 11,
          },
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
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
    },
  };

  if (categoryStats.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        データがありません
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <Bar data={data} options={options} />
    </div>
  );
}