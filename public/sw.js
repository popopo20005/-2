const CACHE_NAME = 'minguella-v1.0.2';
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

  let payload = {
    title: 'Minguella',
    body: 'クイズの時間です！学習を続けましょう。',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'default-notification',
    requireInteraction: false,
    data: { url: '/?action=quiz' },
    actions: []
  };

  // プッシュメッセージからペイロードを取得
  if (event.data) {
    try {
      const data = event.data.json();
      payload = {
        title: data.title || payload.title,
        body: data.body || payload.body,
        icon: data.icon || payload.icon,
        badge: data.badge || payload.badge,
        tag: data.tag || payload.tag,
        requireInteraction: data.requireInteraction || payload.requireInteraction,
        data: data.data || payload.data,
        actions: data.actions || []
      };
    } catch (error) {
      console.error('[SW] Failed to parse push notification data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
      vibrate: [200, 100, 200],
      data: payload.data,
      actions: payload.actions
    })
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  // アクションに応じたURLを決定
  let url = '/';
  switch (event.action) {
    case 'quiz':
    case 'start':
      url = '/?action=quiz';
      break;
    case 'review':
      url = '/?action=review';
      break;
    case 'stats':
      url = '/?action=stats';
      break;
    case 'later':
    case 'dismiss':
      // 何もしない
      return;
    default:
      // カスタムデータからURLを取得
      if (event.notification.data && event.notification.data.url) {
        url = event.notification.data.url;
      } else if (event.notification.data && event.notification.data.goalId) {
        url = `/?view=goalManager&goalId=${event.notification.data.goalId}`;
      }
      break;
  }

  // クリック追跡用のメッセージを送信
  event.waitUntil(
    Promise.all([
      // タブを開くまたはフォーカス
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          // 既存のタブがあるかチェック
          for (const client of clients) {
            const clientUrl = new URL(client.url);
            const targetUrl = new URL(url, self.location.origin);

            if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
              // タブにメッセージを送信
              client.postMessage({
                type: 'NOTIFICATION_CLICKED',
                action: event.action,
                data: event.notification.data
              });
              return client.focus();
            }
          }

          // 新しいタブを開く
          if (self.clients.openWindow) {
            return self.clients.openWindow(url);
          }
        }),

      // 通知クリックをIndexedDBに記録
      recordNotificationClick(event.notification)
    ])
  );
});

// 通知クリックをIndexedDBに記録
async function recordNotificationClick(notification) {
  try {
    if (!notification.data || !notification.data.notificationId) {
      return;
    }

    const db = await openDatabase();
    const tx = db.transaction(['notificationHistory'], 'readwrite');
    const store = tx.objectStore('notificationHistory');

    const request = store.get(notification.data.notificationId);
    request.onsuccess = () => {
      const record = request.result;
      if (record) {
        record.clicked = true;
        record.clickedAt = new Date();
        store.put(record);
      }
    };

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    console.log('[SW] Notification click recorded');
  } catch (error) {
    console.error('[SW] Failed to record notification click:', error);
  }
}

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'background-backup') {
    event.waitUntil(
      performBackgroundBackup()
    );
  }

  if (event.tag === 'data-aggregation') {
    event.waitUntil(
      performDataAggregation()
    );
  }

  if (event.tag === 'cache-cleanup') {
    event.waitUntil(
      performCacheCleanup()
    );
  }

  if (event.tag === 'notification-check') {
    event.waitUntil(
      checkAndSendScheduledNotifications()
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

  if (event.data && event.data.type === 'CHECK_NOTIFICATIONS') {
    // 通知チェックをトリガー
    event.waitUntil(checkAndSendScheduledNotifications());
  }

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    // 即座に通知を表示
    const payload = event.data.payload;
    if (payload) {
      event.waitUntil(
        self.registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: payload.badge || '/icons/icon-72x72.png',
          tag: payload.tag || `notification-${Date.now()}`,
          requireInteraction: payload.requireInteraction || false,
          vibrate: [200, 100, 200],
          data: payload.data,
          actions: payload.actions || []
        })
      );
    }
  }
});

// エラーハンドリング
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

// スケジュール済み通知のチェックと送信
async function checkAndSendScheduledNotifications() {
  try {
    console.log('[SW] Checking scheduled notifications...');

    // 通知設定を確認
    const settings = await getNotificationSettings();
    if (!settings || !settings.enabled) {
      console.log('[SW] Notifications are disabled');
      return;
    }

    // 日次リマインダーのチェック
    if (settings.dailyReminder) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [reminderHour, reminderMin] = settings.dailyReminderTime.split(':').map(Number);
      const reminderTime = reminderHour * 60 + reminderMin;

      // リマインダー時刻の前後30分以内
      if (Math.abs(currentTime - reminderTime) <= 30) {
        const lastReminder = await getLastReminderTime();
        const hoursSinceLastReminder = (Date.now() - lastReminder) / (1000 * 60 * 60);

        // 最後のリマインダーから23時間以上経過している場合のみ送信
        if (hoursSinceLastReminder >= 23) {
          await showDailyReminder();
          await saveLastReminderTime();
        }
      }
    }

    console.log('[SW] Scheduled notifications check completed');
  } catch (error) {
    console.error('[SW] Failed to check scheduled notifications:', error);
  }
}

// 通知設定を取得（LocalStorage経由）
async function getNotificationSettings() {
  try {
    // Service WorkerではLocalStorageに直接アクセスできないため、
    // 代わりにIndexedDBまたはCacheAPIを使用
    const cache = await caches.open('notification-settings');
    const response = await cache.match('/notification-settings');

    if (response) {
      return await response.json();
    }

    // デフォルト設定
    return {
      enabled: false,
      dailyReminder: false,
      dailyReminderTime: '09:00'
    };
  } catch (error) {
    console.error('[SW] Failed to get notification settings:', error);
    return null;
  }
}

// 最後のリマインダー時刻を取得
async function getLastReminderTime() {
  try {
    const cache = await caches.open('notification-settings');
    const response = await cache.match('/last-reminder-time');

    if (response) {
      const data = await response.json();
      return data.timestamp;
    }

    return 0;
  } catch (error) {
    console.error('[SW] Failed to get last reminder time:', error);
    return 0;
  }
}

// 最後のリマインダー時刻を保存
async function saveLastReminderTime() {
  try {
    const cache = await caches.open('notification-settings');
    const data = { timestamp: Date.now() };
    const response = new Response(JSON.stringify(data));

    await cache.put('/last-reminder-time', response);
    console.log('[SW] Last reminder time saved');
  } catch (error) {
    console.error('[SW] Failed to save last reminder time:', error);
  }
}

// 日次リマインダーを表示
async function showDailyReminder() {
  const hour = new Date().getHours();
  let greeting = 'おはようございます';
  if (hour >= 12 && hour < 18) greeting = 'こんにちは';
  if (hour >= 18) greeting = 'こんばんは';

  await self.registration.showNotification(`📖 ${greeting}`, {
    body: '今日も学習を始めましょう！',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'daily-reminder',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: '/?action=quiz' },
    actions: [
      { action: 'start', title: '学習を始める' },
      { action: 'dismiss', title: '閉じる' }
    ]
  });

  console.log('[SW] Daily reminder shown');
}

// バックグラウンドデータ集計
async function performDataAggregation() {
  try {
    console.log('[SW] Starting background data aggregation...');

    const startTime = Date.now();
    const results = {
      tasksCompleted: [],
      errors: []
    };

    // 1. 日次統計の集計
    try {
      await aggregateDailyStats();
      results.tasksCompleted.push('Daily statistics aggregated');
    } catch (error) {
      console.error('[SW] Daily stats aggregation failed:', error);
      results.errors.push('Daily stats: ' + error.message);
    }

    // 2. カテゴリ統計の更新
    try {
      await updateCategoryStats();
      results.tasksCompleted.push('Category stats updated');
    } catch (error) {
      console.error('[SW] Category stats update failed:', error);
      results.errors.push('Category stats: ' + error.message);
    }

    // 3. 古いデータのクリーンアップ
    try {
      const cleanupCount = await cleanupOldData();
      results.tasksCompleted.push(`Old data cleaned (${cleanupCount} records)`);
    } catch (error) {
      console.error('[SW] Data cleanup failed:', error);
      results.errors.push('Cleanup: ' + error.message);
    }

    const duration = Date.now() - startTime;

    // 結果をキャッシュに保存
    const cache = await caches.open('aggregation-results');
    const result = {
      timestamp: new Date().toISOString(),
      duration,
      results
    };
    await cache.put(
      '/aggregation-result',
      new Response(JSON.stringify(result))
    );

    console.log(`[SW] Data aggregation completed in ${duration}ms:`, results);
  } catch (error) {
    console.error('[SW] Data aggregation failed:', error);
  }
}

// 日次統計を集計
async function aggregateDailyStats() {
  const db = await openDatabase();

  // 過去7日間のデータを処理
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const startOfDay = date.getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // 履歴から統計を計算
    const tx = db.transaction(['history'], 'readonly');
    const store = tx.objectStore('history');
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(startOfDay, endOfDay);

    const histories = await new Promise((resolve, reject) => {
      const results = [];
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });

    console.log(`[SW] ${date.toISOString().split('T')[0]}: ${histories.length} records`);
  }
}

// カテゴリ統計を更新
async function updateCategoryStats() {
  const db = await openDatabase();

  const tx = db.transaction(['history', 'categoryStats'], 'readwrite');
  const historyStore = tx.objectStore('history');
  const statsStore = tx.objectStore('categoryStats');

  // 全履歴を取得してカテゴリ別に集計
  const histories = await new Promise((resolve, reject) => {
    const request = historyStore.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  // カテゴリ別に集計
  const categoryMap = new Map();

  for (const history of histories) {
    if (!history.category) continue;

    if (!categoryMap.has(history.category)) {
      categoryMap.set(history.category, {
        category: history.category,
        totalAttempts: 0,
        correctAttempts: 0,
        lastStudyDate: history.timestamp
      });
    }

    const stats = categoryMap.get(history.category);
    stats.totalAttempts++;
    if (history.isCorrect) {
      stats.correctAttempts++;
    }
    if (history.timestamp > stats.lastStudyDate) {
      stats.lastStudyDate = history.timestamp;
    }
  }

  // 統計をDBに保存
  for (const [category, stats] of categoryMap) {
    stats.accuracy = stats.totalAttempts > 0
      ? stats.correctAttempts / stats.totalAttempts
      : 0;
    stats.analyzedAt = new Date();

    // 既存のレコードを検索
    const existingStats = await new Promise((resolve) => {
      const index = statsStore.index('category');
      const request = index.get(category);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });

    if (existingStats) {
      // 更新
      await new Promise((resolve, reject) => {
        const request = statsStore.put({ ...stats, id: existingStats.id });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } else {
      // 新規作成
      await new Promise((resolve, reject) => {
        const request = statsStore.add(stats);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  console.log(`[SW] Updated stats for ${categoryMap.size} categories`);
}

// 古いデータをクリーンアップ
async function cleanupOldData() {
  const db = await openDatabase();
  const retentionDays = 365;
  const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  let deletedCount = 0;

  // 古い通知履歴を削除
  const tx = db.transaction(['notificationHistory'], 'readwrite');
  const store = tx.objectStore('notificationHistory');
  const index = store.index('sentAt');
  const range = IDBKeyRange.upperBound(cutoffDate);

  await new Promise((resolve, reject) => {
    const request = index.openCursor(range);

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });

  console.log(`[SW] Deleted ${deletedCount} old notification records`);
  return deletedCount;
}

// キャッシュクリーンアップ
async function performCacheCleanup() {
  try {
    console.log('[SW] Starting cache cleanup...');

    const cacheNames = await caches.keys();
    const retentionDays = 7;
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const cacheName of cacheNames) {
      // 動的キャッシュのみクリーンアップ
      if (cacheName.includes('dynamic')) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          try {
            const response = await cache.match(request);
            if (response) {
              const dateHeader = response.headers.get('date');
              if (dateHeader) {
                const responseTime = new Date(dateHeader).getTime();
                if (responseTime < cutoffTime) {
                  await cache.delete(request);
                  deletedCount++;
                }
              }
            }
          } catch (error) {
            console.error('[SW] Cache entry cleanup error:', error);
          }
        }
      }
    }

    console.log(`[SW] Cache cleanup completed: ${deletedCount} entries deleted`);
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}

// 定期実行タイマー（Periodic Background Sync APIのフォールバック）
let aggregationTimer = null;

function scheduleNextAggregation() {
  if (aggregationTimer) {
    clearTimeout(aggregationTimer);
  }

  // 毎日深夜3時に実行
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(3, 0, 0, 0);

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const delay = nextRun.getTime() - now.getTime();

  aggregationTimer = setTimeout(async () => {
    await performDataAggregation();
    scheduleNextAggregation(); // 次回をスケジュール
  }, delay);

  console.log(`[SW] Next aggregation scheduled for ${nextRun.toISOString()}`);
}

// Service Worker起動時にスケジュール開始
scheduleNextAggregation();

console.log('[SW] Service worker script loaded');