/**
 * AuthContext - グローバル認証状態管理
 *
 * authService をラップし、React Context で認証状態を
 * アプリ全体に提供する。
 */

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { authService, type AuthUser } from '../services/authService';
import { syncService } from '../services/syncService';
import { setupNetworkListeners } from '../workers/syncQueue';

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

    // 初回マイグレーション（ローカルデータをFirestoreへ）
    setMigrating(true);
    syncService.migrateAnonymousData()
      .then((result) => {
        if (result.success && result.totalRecords > 0) {
          console.log(`[Auth] マイグレーション完了: ${result.totalRecords}件`);
        }
      })
      .catch((err) => console.warn('[Auth] マイグレーションエラー:', err))
      .finally(() => setMigrating(false));

    // ネットワークリスナー（一度だけ）
    if (!networkListenersSetup.current) {
      setupNetworkListeners();
      networkListenersSetup.current = true;
    }
  }, [user]);

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
