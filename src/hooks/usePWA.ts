import { useState, useEffect } from 'react';

interface PWAInfo {
  isInstallable: boolean;
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  isOnline: boolean;
  installPrompt: any;
}

interface PWAActions {
  installApp: () => Promise<void>;
  updateApp: () => void;
  scheduleBackup: () => void;
}

export function usePWA(): PWAInfo & PWAActions {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // インストール可能性の検出
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    // アプリがインストール済みかチェック
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    // オンライン/オフライン状態の監視
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);


    // イベントリスナーの登録
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    });

    // Service Worker の登録と更新チェック
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    checkIfInstalled();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      console.log('[PWA] Service Worker registered:', registration);

      // Service Worker の更新チェック
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true);
            }
          });
        }
      });

      // アクティブな Service Worker からのメッセージを受信
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setIsUpdateAvailable(true);
        }
      });

      // 定期的に更新をチェック
      setInterval(() => {
        registration.update();
      }, 60000); // 1分ごと

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  };

  const installApp = async (): Promise<void> => {
    if (!installPrompt) {
      throw new Error('Install prompt not available');
    }

    try {
      const result = await installPrompt.prompt();
      console.log('[PWA] Install prompt result:', result);
      
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      throw error;
    }
  };

  const updateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        const waitingWorker = registration.waiting;
        if (waitingWorker) {
          waitingWorker.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        } else {
          // 強制的に更新をチェック
          registration.update().then(() => {
            window.location.reload();
          });
        }
      });
    }
  };

  const scheduleBackup = () => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // @ts-ignore: sync property may not be available in all environments
        registration.sync?.register('background-backup');
      });
    }
  };

  return {
    isInstallable,
    isInstalled,
    isUpdateAvailable,
    isOnline,
    installPrompt,
    installApp,
    updateApp,
    scheduleBackup
  };
}