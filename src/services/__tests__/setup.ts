/**
 * Vitest Setup File - IndexedDB Polyfill
 */

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

// グローバルにIndexedDBを設定
if (typeof globalThis.indexedDB === 'undefined') {
  globalThis.indexedDB = new IDBFactory();
}
