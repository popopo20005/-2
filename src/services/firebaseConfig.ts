/**
 * Firebase Configuration - Firebase初期設定
 *
 * 環境変数からFirebaseの設定を読み込み、
 * アプリケーション起動時に初期化する。
 *
 * 環境変数 (.env.local):
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// ============================================================
// Firebase設定
// ============================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// ============================================================
// 初期化
// ============================================================

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

/**
 * Firebaseが設定されているか確認
 */
export function isFirebaseConfigured(): boolean {
  return firebaseConfig.apiKey.length > 0 && firebaseConfig.projectId.length > 0;
}

/**
 * Firebase アプリを初期化・取得（Singleton）
 */
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (!isFirebaseConfigured()) {
      throw new Error(
        'Firebase設定が見つかりません。.env.localに以下の環境変数を設定してください:\n' +
        'VITE_FIREBASE_API_KEY\n' +
        'VITE_FIREBASE_PROJECT_ID'
      );
    }
    app = initializeApp(firebaseConfig);
  }
  return app;
}

/**
 * Firebase Auth インスタンスを取得
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

/**
 * Firestore インスタンスを取得
 */
export function getFirestore_(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }
  return firestore;
}
