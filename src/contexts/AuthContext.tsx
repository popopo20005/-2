/**
 * AuthContext - グローバル認証状態管理
 *
 * authService をラップし、React Context で認証状態を
 * アプリ全体に提供する。
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { authService, type AuthUser } from '../services/authService';
import { syncService } from '../services/syncService';
import { processSyncQueue, setupNetworkListeners } from '../workers/syncQueue';

// ============================================================
// Context 型定義
// ============================================================

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  migrating: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createUser: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================
// AuthProvider
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const networkListenersSetup = useRef(false);
  const isSyncing = useRef(false);

  // Firestoreからデータを取り込む共通関数
  const pullSync = useCallback(async () => {
    if (!authService.getCurrentUser() || isSyncing.current) return;
    isSyncing.current = true;
    try {
      const pullResult = await syncService.pullFromFirestore();
      if (pullResult.success && (pullResult.problems > 0 || pullResult.quizSets > 0)) {
        console.log(`[Auth] Pull同期完了: Problems +${pullResult.problems}, QuizSets +${pullResult.quizSets}`);
        // 新データが取り込まれたことをコンポーネントに通知
        window.dispatchEvent(new CustomEvent('syncCompleted', { detail: pullResult }));
      }
    } catch (err) {
      console.warn('[Auth] Pull同期エラー:', err);
    } finally {
      isSyncing.current = false;
    }
  }, []);

  useEffect(() => {
    if (!authService.isConfigured()) {
      setLoading(false);
      return;
    }

    const unsubscribe = authService.onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ログイン時にマイグレーション + ネットワークリスナー設定
  useEffect(() => {
    if (!user) return;

    // 双方向同期（ローカル→Firestore + Firestore→ローカル）
    setMigrating(true);
    syncService.migrateAnonymousData()
      .then((result) => {
        if (result.success && result.totalRecords > 0) {
          console.log(`[Auth] マイグレーション完了: ${result.totalRecords}件`);
        }
      })
      .catch((err) => console.warn('[Auth] マイグレーションエラー (pullSyncは続行):', err))
      .then(() => pullSync())
      .catch((err) => console.warn('[Auth] Pull同期エラー:', err))
      // 前回までに送れなかった分を送る
      .then(() => processSyncQueue())
      .catch((err) => console.warn('[Auth] キュー同期エラー:', err))
      .finally(() => setMigrating(false));

    // ネットワークリスナー（一度だけ）
    if (!networkListenersSetup.current) {
      setupNetworkListeners();
      networkListenersSetup.current = true;
    }
  }, [user, pullSync]);

  // アプリがフォアグラウンドに戻った時にFirestoreから同期
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Auth] アプリ復帰 → Firestore同期開始');
        pullSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, pullSync]);

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const signInWithEmail = async (email: string, password: string) => {
    await authService.signInWithEmail(email, password);
  };

  const createUser = async (email: string, password: string) => {
    await authService.createUser(email, password);
  };

  const handleSignOut = async () => {
    await authService.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        migrating,
        signInWithGoogle,
        signInWithEmail,
        createUser,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// useAuth フック
// ============================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
