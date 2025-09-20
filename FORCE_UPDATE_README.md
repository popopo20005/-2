# 🚨 NETLIFY 強制アップデート手順

## バージョン: 1.4.0-FORCE（タイムスタンプ入りファイル名）

### 1. Netlifyで完全リセット
1. Site settings → Build & deploy
2. **"Clear cache and deploy site"** をクリック
3. Asset optimization を全てOFFにする

### 2. 手動デプロイ（確実な方法）
```bash
distフォルダをZIP圧縮してアップロード
```

### 3. 確認方法
- タイトルに「v1.4.0-FORCE」が表示される
- ファイル名に「1756302353200」のようなタイムスタンプが入る

### 4. 最後の手段（新サイト作成）
既存サイトが更新されない場合：
1. 新しいNetlifyサイトを作成
2. distフォルダをアップロード
3. カスタムドメインを移行

## 現在のファイル構成
- CSS: `index-1756302353200-DqhEZzmG.css`
- JS: `index-1756302353200-BGpeXfL7.js`
- Worker: `qr-scanner-worker.min-1756302353200-D85Z9gVD.js`