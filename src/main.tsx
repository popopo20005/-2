import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from 'react-hot-toast'

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
  // StrictMode disabled temporarily for CSV preview performance debugging
  // <StrictMode>
  <>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: 'rgba(31, 41, 55, 0.95)',
          color: '#fff',
          padding: '16px',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
      }}
    />
  </>
  // </StrictMode>,
)
