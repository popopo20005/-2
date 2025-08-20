// 強制的にボタンスタイルを適用する関数 - ボタン要素のみ
export const forceQuizActionButtonStyles = () => {
  const applyStyles = () => {
    // ボタン要素のみを対象とする
    const buttons = document.querySelectorAll('button.quiz-action-button, input[type="button"].quiz-action-button, input[type="submit"].quiz-action-button');
    buttons.forEach((button) => {
      const htmlButton = button as HTMLElement;
      // ボタン要素かどうかを確認
      if (htmlButton.tagName.toLowerCase() === 'button' || 
          (htmlButton.tagName.toLowerCase() === 'input' && 
           ['button', 'submit'].includes((htmlButton as HTMLInputElement).type))) {
        htmlButton.style.setProperty('background', 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 'important');
        htmlButton.style.setProperty('color', 'white', 'important');
        htmlButton.style.setProperty('border', '2px solid #22d3ee', 'important');
        htmlButton.style.setProperty('border-radius', '12px', 'important');
        htmlButton.style.setProperty('box-shadow', '0 4px 12px rgba(6, 182, 212, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)', 'important');
        htmlButton.style.setProperty('font-weight', '600', 'important');
        htmlButton.style.setProperty('transition', 'all 0.2s ease', 'important');
        
        // ボタン内のテキスト要素も白色に
        const textElements = htmlButton.querySelectorAll('h3, p, span');
        textElements.forEach((textEl) => {
          (textEl as HTMLElement).style.setProperty('color', 'white', 'important');
        });
      }
    });
  };

  // 即座に適用
  applyStyles();
  
  // DOM変更を監視して再適用
  const observer = new MutationObserver(() => {
    applyStyles();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
  
  // 定期的にも実行
  setInterval(applyStyles, 1000);
  
  return () => observer.disconnect();
};

// ページロード時に実行
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', forceQuizActionButtonStyles);
  
  // すでにロード済みの場合は即座に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceQuizActionButtonStyles);
  } else {
    forceQuizActionButtonStyles();
  }
}