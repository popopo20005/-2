/**
 * XP Float Animation
 * Shows "+N XP" floating up and fading when triggered
 * Uses Framer Motion for smooth animation
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface XPFloat {
  id: number;
  amount: number;
  x: number;
}

interface XPFloatAnimationProps {
  trigger: number; // increment to spawn a new float
  amount?: number;
}

let floatIdCounter = 0;

export function XPFloatAnimation({
  trigger,
  amount = 10,
}: XPFloatAnimationProps) {
  const [floats, setFloats] = useState<XPFloat[]>([]);

  useEffect(() => {
    if (trigger === 0) return;

    const newFloat: XPFloat = {
      id: ++floatIdCounter,
      amount,
      x: 45 + Math.random() * 10, // 45-55% horizontal
    };

    setFloats(prev => [...prev, newFloat]);

    // Auto-remove after animation
    const timer = setTimeout(() => {
      setFloats(prev => prev.filter(f => f.id !== newFloat.id));
    }, 1200);

    return () => clearTimeout(timer);
  }, [trigger, amount]);

  // Respect prefers-reduced-motion
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40"
      aria-hidden="true"
    >
      <AnimatePresence>
        {floats.map(float => (
          <motion.div
            key={float.id}
            className="absolute font-bold text-2xl select-none whitespace-nowrap"
            style={{
              left: `${float.x}%`,
              top: '40%',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
            initial={{
              opacity: 0,
              y: 0,
              scale: 0.5,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -80,
              scale: [0.5, 1.2, 1, 0.8],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1,
              ease: 'easeOut',
              opacity: { times: [0, 0.1, 0.7, 1] },
              scale: { times: [0, 0.2, 0.4, 1] },
            }}
          >
            <span className="bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400
                             bg-clip-text text-transparent drop-shadow-lg">
              +{float.amount} XP
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
