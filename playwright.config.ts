import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定
 * UI表示の自動検証用
 */
export default defineConfig({
  testDir: './tests',

  /* テストの並列実行設定 */
  fullyParallel: true,

  /* CIで失敗したテストのみ再試行 */
  forbidOnly: !!process.env.CI,

  /* CIではリトライなし */
  retries: process.env.CI ? 2 : 0,

  /* 並列ワーカー数 */
  workers: process.env.CI ? 1 : undefined,

  /* レポーター */
  reporter: 'html',

  /* 共通設定 */
  use: {
    /* ベースURL（開発サーバー） */
    baseURL: 'http://localhost:5173',

    /* 失敗時のスクリーンショット */
    screenshot: 'only-on-failure',

    /* トレース（デバッグ用） */
    trace: 'on-first-retry',

    /* ビューポート */
    viewport: { width: 1280, height: 720 },
  },

  /* プロジェクト設定 */
  projects: [
    {
      name: 'chromium-light',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
      },
    },
    {
      name: 'chromium-dark',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  /* 開発サーバー */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
