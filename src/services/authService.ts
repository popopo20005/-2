/**
 * Auth Service - Firebase認証システム
 *
 * Google・メール認証をサポートし、ログイン状態の変更を
 * リアルタイムで監視する。アノニマスデータのマイグレーションも含む。
 *
 * 認証フロー:
 * 1. ログイン（Google / メール・パスワード）
 * 2. ログイン状態の変更リスナーで状態更新
 * 3. アノニマスデータの自動マイグレーション（初回ログイン時）
 * 4. ログアウト
 */

import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './firebaseConfig';

// ============================================================
// 型定義
// ============================================================

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export type AuthChangeCallback = (user: AuthUser | null) => void;

// ============================================================
// AuthService クラス
// ============================================================

class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners: Set<AuthChangeCallback> = new Set();
  private unsubscribe: Unsubscribe | null = null;
  private googleProvider: GoogleAuthProvider | null = null;

  constructor() {
    // Firebase が設定されている場合のみリスナーを開始
    if (isFirebaseConfigured()) {
      this.startListening();
    }
  }

  /**
   * Firebase が設定されているか確認
   */
  isConfigured(): boolean {
    return isFirebaseConfigured();
  }

  /**
   * 認証状態の変化リスナーを開始
   */
  private startListening(): void {
    try {
      const auth = getFirebaseAuth();
      this.unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        this.currentUser = firebaseUser ? this.toAuthUser(firebaseUser) : null;
        this.notifyListeners();
      });
    } catch (e) {
      console.warn('[Auth] リスナー開始に失敗:', e);
    }
  }

  /**
   * Firebase User → AuthUser に変換
   */
  private toAuthUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isAnonymous: user.isAnonymous,
    };
  }

  /**
   * リスナーに通知
   */
  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  // ============================================================
  // 認証操作
  // ============================================================

  /**
   * Google アカウントでログイン
   */
  async signInWithGoogle(): Promise<AuthUser> {
    if (!this.isConfigured()) {
      throw new Error('Firebase が設定されていません');
    }

    const auth = getFirebaseAuth();
    if (!this.googleProvider) {
      this.googleProvider = new GoogleAuthProvider();
    }

    try {
      const result = await signInWithPopup(auth, this.googleProvider);
      return this.toAuthUser(result.user);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('popup-closed')) {
          throw new Error('ログインポップアップが閉じられました');
        }
      }
      throw new Error('Google ログインに失敗しました');
    }
  }

  /**
   * メール・パスワードでログイン
   */
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    if (!this.isConfigured()) {
      throw new Error('Firebase が設定されていません');
    }

    const auth = getFirebaseAuth();

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return this.toAuthUser(result.user);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('wrong-password') || error.message.includes('invalid-credential')) {
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }
        if (error.message.includes('user-not-found')) {
          throw new Error('アカウントが見つかりません');
        }
      }
      throw new Error('ログインに失敗しました');
    }
  }

  /**
   * 新規アカウント作成
   */
  async createUser(email: string, password: string): Promise<AuthUser> {
    if (!this.isConfigured()) {
      throw new Error('Firebase が設定されていません');
    }

    const auth = getFirebaseAuth();

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return this.toAuthUser(result.user);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('email-already-in-use')) {
          throw new Error('このメールアドレスは既に登録されています');
        }
        if (error.message.includes('invalid-email')) {
          throw new Error('メールアドレスの形式が不正です');
        }
        if (error.message.includes('weak-password')) {
          throw new Error('パスワードが短すぎます（6文字以上）');
        }
      }
      throw new Error('アカウント作成に失敗しました');
    }
  }

  /**
   * ログアウト
   */
  async signOut(): Promise<void> {
    if (!this.isConfigured()) return;

    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
    } catch (e) {
      console.error('[Auth] ログアウトエラー:', e);
      throw new Error('ログアウトに失敗しました');
    }
  }

  // ============================================================
  // 状態取得
  // ============================================================

  /**
   * 現在のログインユーザーを取得
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * ログインされているか確認
   */
  isSignedIn(): boolean {
    return this.currentUser !== null;
  }

  /**
   * 認証状態変化のリスナーを登録
   */
  onAuthStateChange(callback: AuthChangeCallback): () => void {
    this.listeners.add(callback);
    // 現在の状態を即時通知
    callback(this.currentUser);
    // アンサブスクライブ関数を返す
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * リソース解放
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }
}

export const authService = new AuthService();
