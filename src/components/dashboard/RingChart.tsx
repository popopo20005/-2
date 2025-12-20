import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface RingChartProps {
    current: number;
    target: number;
    label: string;
    subLabel?: string;
    color?: string;
}

export const RingChart: React.FC<RingChartProps> = ({ current, target, label, subLabel, color = '#6366F1' }) => {
    const percentage = Math.min(100, Math.round((current / target) * 100));
    const remaining = 100 - percentage;

    const data = {
        labels: ['Completed', 'Remaining'],
        datasets: [
            {
                data: [percentage, remaining],
                backgroundColor: [color, 'rgba(255, 255, 255, 0.05)'],
                borderColor: ['transparent', 'transparent'],
                borderWidth: 0,
                borderRadius: 20,
                cutout: '85%',
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
                enabled: false,
            },
        },
        animation: {
            animateScale: true,
            animateRotate: true,
            duration: 2000,
            easing: 'easeOutQuart',
        },
    };

    return (
        <div className="relative w-48 h-48 mx-auto">
            {/* Glow Effect */}
            <div
                className="absolute inset-0 rounded-full blur-xl opacity-30"
                style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
            />

            <div className="relative z-10 w-full h-full">
                <Doughnut data={data} options={options as any} />
            </div>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-bold text-text-primary drop-shadow-lg">
                    {percentage}%
                </span>
                <span className="text-xs text-text-secondary uppercase tracking-wider mt-1">
                    {label}
                </span>
                {subLabel && (
                    <span className="text-[10px] text-text-muted mt-1">
                        {subLabel}
                    </span>
                )}
            </div>
        </div>
    );
};
