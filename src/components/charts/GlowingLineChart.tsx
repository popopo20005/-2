import React from 'react';
import { motion } from 'framer-motion';

interface GlowingLineChartProps {
    data: number[];
    labels: string[];
    color?: string;
    height?: number;
    className?: string;
}

export const GlowingLineChart: React.FC<GlowingLineChartProps> = ({
    data,
    labels,
    color = '#3b82f6', // blue-500
    height = 200,
    className = ''
}) => {
    // データが空の場合
    if (data.length === 0) {
        return (
            <div className={`w-full ${className} flex items-center justify-center`} style={{ height: `${height}px` }}>
                <p className="text-white/60 text-sm">データがありません</p>
            </div>
        );
    }

    // データが1件の場合は棒グラフ風に表示
    if (data.length === 1) {
        const value = data[0];
        const maxVal = Math.max(value, 1);
        const barHeight = (value / maxVal) * (height - 40);

        return (
            <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
                <div className="flex flex-col items-center justify-end h-full pb-8">
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: barHeight, opacity: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="w-16 rounded-t-lg relative"
                        style={{
                            background: `linear-gradient(to top, ${color}, ${color}aa)`,
                            boxShadow: `0 0 20px ${color}80, 0 0 40px ${color}40`
                        }}
                    >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-white font-bold">
                            {value}
                        </div>
                    </motion.div>
                    <span className="mt-2 text-xs text-white">{labels[0]}</span>
                </div>
            </div>
        );
    }

    // 2件以上の場合は折れ線グラフ
    const maxVal = Math.max(...data, 1);
    const minVal = 0; // Assuming 0 baseline for now
    const range = maxVal - minVal || 1;

    // Calculate points
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - minVal) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    // Create area path (close the loop)
    const areaPath = `${points} 100,100 0,100`;

    return (
        <div className={`w-full ${className}`}>
            <div className="relative w-full" style={{ height: `${height}px` }}>
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                >
                    {/* Defs for gradients */}
                    <defs>
                        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                        <filter id={`glow-${color.replace('#', '')}`} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Area Fill */}
                    <motion.path
                        d={`M ${areaPath} Z`}
                        fill={`url(#gradient-${color.replace('#', '')})`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />

                    {/* Line */}
                    <motion.polyline
                        points={points}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter={`url(#glow-${color.replace('#', '')})`}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                    />

                    {/* Data Points */}
                    {data.map((val, i) => {
                        const x = (i / (data.length - 1)) * 100;
                        const y = 100 - ((val - minVal) / range) * 100;
                        return (
                            <motion.circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="3" // Radius in SVG units, might need adjustment based on viewBox
                                fill="white"
                                stroke={color}
                                strokeWidth="1.5"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 1.5 + i * 0.1, type: "spring" }}
                            >
                                <title>{`${labels[i]}: ${val}`}</title>
                            </motion.circle>
                        );
                    })}
                </svg>

                {/* X-Axis Labels */}
                <div className="absolute bottom-0 left-0 right-0 translate-y-6 flex justify-between px-2">
                    {labels.map((label, i) => (
                        <span key={i} className="text-xs text-white">
                            {label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
