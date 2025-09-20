import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')!;

// 緊急フォールバックを隠す
const emergencyFallback = document.getElementById('emergency-fallback');
if (emergencyFallback) {
  emergencyFallback.style.display = 'none';
}

// フォールバック表示を隠す
const loadingFallback = document.getElementById('loading-fallback');
if (loadingFallback) {
  loadingFallback.style.display = 'none';
}

// bodyにapp-loadedクラスを追加
document.body.classList.add('app-loaded');

console.log('React app loading...');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
