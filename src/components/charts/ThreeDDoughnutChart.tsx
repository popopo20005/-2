import React from 'react';
import { motion } from 'framer-motion';

interface ThreeDDoughnutChartProps {
    data: { label: string; value: number; color: string }[];
    size?: number;
    thickness?: number;
    className?: string;
    centerLabel?: string;
    centerSubLabel?: string;
}

export const ThreeDDoughnutChart: React.FC<ThreeDDoughnutChartProps> = ({
    data,
    size = 200,
    thickness = 20,
    className = '',
    centerLabel,
    centerSubLabel
}) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    const radius = size / 2;
    const innerRadius = radius - thickness;

    let currentAngle = 0;

    // Helper to calculate arc path
    const describeArc = (x: number, y: number, innerR: number, outerR: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(x, y, outerR, endAngle);
        const end = polarToCartesian(x, y, outerR, startAngle);
        const start2 = polarToCartesian(x, y, innerR, endAngle);
        const end2 = polarToCartesian(x, y, innerR, startAngle);

        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        const d = [
            "M", start.x, start.y,
            "A", outerR, outerR, 0, largeArcFlag, 0, end.x, end.y,
            "L", end2.x, end2.y,
            "A", innerR, innerR, 0, largeArcFlag, 1, start2.x, start2.y,
            "Z"
        ].join(" ");

        return d;
    };

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                <defs>
                    {data.map((_, index) => (
                        <filter key={`glow-${index}`} id={`glow-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    ))}
                </defs>

                {data.map((item, index) => {
                    const angle = (item.value / total) * 360;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + angle;
                    currentAngle += angle;

                    // Don't render if value is 0
                    if (item.value <= 0) return null;

                    // If only one item and it's 100%, render a full circle ring
                    const isFullCircle = data.length === 1 || (data.filter(d => d.value > 0).length === 1 && item.value > 0);
                    const path = isFullCircle
                        ? describeArc(radius, radius, innerRadius, radius, 0, 359.99)
                        : describeArc(radius, radius, innerRadius, radius, startAngle, endAngle);

                    return (
                        <motion.path
                            key={index}
                            d={path}
                            fill={item.color}
                            filter={`url(#glow-${index})`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.2, duration: 0.5, type: "spring" }}
                            whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                            className="cursor-pointer"
                        >
                            <title>{`${item.label}: ${item.value}`}</title>
                        </motion.path>
                    );
                })}
            </svg>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {centerLabel && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-3xl font-bold text-white drop-shadow-lg"
                    >
                        {centerLabel}
                    </motion.div>
                )}
                {centerSubLabel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="text-sm text-white font-medium"
                    >
                        {centerSubLabel}
                    </motion.div>
                )}
            </div>
        </div>
    );
};
