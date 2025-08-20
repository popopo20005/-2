const CACHE_NAME = 'minguella-v1.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;

// キャッシュするリソース
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// インストール時
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// アクティブ化時
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// フェッチイベント（ネットワークリクエストの処理）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 外部リソース（API等）は除外
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // GET リクエストのみキャッシュ対象
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // キャッシュにない場合はネットワークから取得
        console.log('[SW] Fetching from network:', request.url);
        return fetch(request)
          .then((networkResponse) => {
            // レスポンスが有効な場合のみキャッシュ
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                })
                .catch((error) => {
                  console.error('[SW] Failed to cache dynamic resource:', error);
                });
            }
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Network request failed:', error);
            
            // ネットワークエラー時のフォールバック
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            throw error;
          });
      })
  );
});

// プッシュ通知の処理
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'クイズの時間です！学習を続けましょう。',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/?action=quiz'
    },
    actions: [
      {
        action: 'quiz',
        title: 'クイズを開始',
        icon: '/icons/shortcut-quiz-96x96.png'
      },
      {
        action: 'stats',
        title: '統計を確認',
        icon: '/icons/shortcut-stats-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Minguella', options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  let url = '/';
  if (event.action === 'quiz') {
    url = '/?action=quiz';
  } else if (event.action === 'stats') {
    url = '/?action=stats';
  } else if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // 既存のタブがあるかチェック
        for (const client of clients) {
          if (client.url === self.location.origin + url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 新しいタブを開く
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-backup') {
    event.waitUntil(
      performBackgroundBackup()
    );
  }
});

// バックグラウンドバックアップ処理
async function performBackgroundBackup() {
  try {
    console.log('[SW] Performing background backup...');
    
    // IndexedDBにアクセスしてバックアップを作成
    // この実装は簡略化されています
    const db = await openDatabase();
    const backupData = await createBackupData(db);
    
    // ローカルストレージに保存
    await saveBackupToLocalStorage(backupData);
    
    console.log('[SW] Background backup completed');
  } catch (error) {
    console.error('[SW] Background backup failed:', error);
  }
}

// データベースを開く（簡略化版）
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('QuizAppDB');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// バックアップデータを作成（簡略化版）
async function createBackupData(db) {
  // 実際の実装では、すべてのテーブルからデータを取得
  return {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    type: 'background'
  };
}

// ローカルストレージにバックアップを保存（簡略化版）
async function saveBackupToLocalStorage(backupData) {
  // 実際の実装では、IndexedDBのbackupsテーブルに保存
  console.log('[SW] Backup data saved:', backupData);
}

// メッセージハンドリング
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'REQUEST_UPDATE') {
    // アップデートをチェック
    self.registration.update();
  }
  
  if (event.data && event.data.type === 'SCHEDULE_BACKUP') {
    // バックグラウンド同期を登録
    self.registration.sync.register('background-backup');
  }
});

// エラーハンドリング
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service worker script loaded');