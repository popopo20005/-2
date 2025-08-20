import { useEffect, useRef } from 'react';

export const useQuizActionButton = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (element) {
      // 強制的にスタイルを適用
      element.style.backgroundColor = '#06b6d4';
      element.style.color = 'white';
      element.style.border = '1px solid #22d3ee';
      element.style.setProperty('background-color', '#06b6d4', 'important');
      element.style.setProperty('color', 'white', 'important');
      element.style.setProperty('border', '1px solid #22d3ee', 'important');
      
      // ホバー効果のためのイベントリスナー
      const handleMouseEnter = () => {
        element.style.setProperty('background-color', '#0891b2', 'important');
      };
      
      const handleMouseLeave = () => {
        element.style.setProperty('background-color', '#06b6d4', 'important');
      };
      
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  return ref;
};

export const quizActionButtonStyle = {
  backgroundColor: '#06b6d4',
  color: 'white',
  border: '1px solid #22d3ee'
};