import React from 'react';
import { motion } from 'framer-motion';

interface ThreeDBarChartProps {
    data: { label: string; value: number }[];
    maxVal?: number;
    color?: string;
    height?: number;
    className?: string;
}

export const ThreeDBarChart: React.FC<ThreeDBarChartProps> = ({
    data,
    maxVal,
    color: _color = 'blue',
    height = 200,
    className = ''
}) => {
    const maxValue = maxVal || Math.max(...data.map(d => d.value), 1);

    // データが空の場合のメッセージ
    if (data.length === 0) {
        return (
            <div className={`w-full ${className} flex items-center justify-center`} style={{ height: `${height}px` }}>
                <p className="text-white/60 text-sm">データがありません</p>
            </div>
        );
    }

    // バーの高さを計算（ラベル分の余白を引く）
    const barAreaHeight = height - 30; // ラベル用に30px確保

    return (
        <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
            <div className="flex items-end justify-center gap-4 h-full pb-8">
                {data.map((item, index) => {
                    // 最小10%の高さを確保
                    const percentage = Math.max((item.value / maxValue) * 100, 10);
                    const barHeight = (percentage / 100) * barAreaHeight;

                    return (
                        <div key={index} className="flex flex-col items-center group" style={{ width: '60px' }}>
                            {/* Bar Container */}
                            <div
                                className="relative w-full flex items-end justify-center"
                                style={{ height: `${barAreaHeight}px` }}
                            >
                                {/* Bar Background (Track) */}
                                <div
                                    className="absolute bottom-0 w-full bg-slate-600/40 rounded-t-lg border border-slate-500/20"
                                    style={{ height: `${barAreaHeight}px` }}
                                />

                                {/* Animated Bar */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: barHeight }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 100,
                                        damping: 20,
                                        delay: index * 0.1
                                    }}
                                    className="w-full relative rounded-t-lg z-10"
                                    style={{
                                        background: 'linear-gradient(to top, #3b82f6, #60a5fa)',
                                        boxShadow: '0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.3)',
                                        filter: 'brightness(1.3)',
                                    }}
                                >
                                    {/* Top Highlight (3D effect) */}
                                    <div className="absolute top-0 inset-x-0 h-[2px] bg-white/50 rounded-t-lg" />

                                    {/* Side Highlight */}
                                    <div className="absolute left-0 inset-y-0 w-[1px] bg-white/20" />

                                    {/* Tooltip */}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-800 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap">
                                        {item.value.toFixed(1)}%
                                        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                    </div>
                                </motion.div>
                            </div>

                            {/* Label */}
                            <span className="mt-2 text-xs text-white truncate w-full text-center font-medium">
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
