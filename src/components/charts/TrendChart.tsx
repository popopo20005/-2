import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RecentActivity {
  date: string;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
}

interface TrendChartProps {
  recentActivity: RecentActivity[];
  isDarkMode?: boolean;
}

export function TrendChart({ recentActivity, isDarkMode = false }: TrendChartProps) {
  // データを日付順にソート
  const sortedActivity = [...recentActivity].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const data = {
    labels: sortedActivity.map(activity => formatDate(activity.date)),
    datasets: [
      {
        label: '正答率 (%)',
        data: sortedActivity.map(activity => activity.accuracy),
        borderColor: 'rgba(59, 130, 246, 1)',     // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue-500 with opacity
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: '解答数',
        data: sortedActivity.map(activity => activity.totalAnswered),
        borderColor: 'rgba(34, 197, 94, 1)',      // green-500
        backgroundColor: 'rgba(34, 197, 94, 0.1)', // green-500 with opacity
        fill: false,
        tension: 0.4,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: isDarkMode ? '#f9fafb' : '#111827',
          font: {
            size: 12,
            weight: 500,
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
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
            const activity = sortedActivity[index];
            return new Date(activity.date).toLocaleDateString('ja-JP');
          },
          label: function(context: any) {
            const index = context.dataIndex;
            const activity = sortedActivity[index];
            if (context.datasetIndex === 0) {
              return `正答率: ${activity.accuracy.toFixed(1)}% (${activity.totalCorrect}/${activity.totalAnswered})`;
            } else {
              return `解答数: ${activity.totalAnswered}問`;
            }
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)',
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          font: {
            size: 11,
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
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
        title: {
          display: true,
          text: '正答率 (%)',
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          font: {
            size: 12,
            weight: 500,
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          callback: function(value: any) {
            return value + '問';
          },
        },
        title: {
          display: true,
          text: '解答数',
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          font: {
            size: 12,
            weight: 500,
          },
        },
      },
    },
  };

  if (recentActivity.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        データがありません
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}