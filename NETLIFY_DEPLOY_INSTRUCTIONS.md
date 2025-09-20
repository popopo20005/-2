# Netlifyデプロイ緊急対応手順

## 🚨 後処理が終了しないバグの対処法

### 即座に実行する手順（推奨）
1. **Netlifyダッシュボード**で「Site settings」→「Build & deploy」
2. **「Asset optimization」を全てOFFにする**
   - Bundle CSS: OFF
   - Bundle JS: OFF
   - Minify CSS: OFF
   - Minify JS: OFF
   - Compress images: OFF
3. **「Clear cache」**をクリック
4. **手動デプロイを実行**

### 手動デプロイ方法
```bash
cd "C:\Users\kanta\Desktop\quiz-app-deploy"
rm -rf dist
npm run build
```

Netlifyサイトで：
1. 「Deploys」タブ
2. `dist`フォルダ全体をドラッグ&ドロップ

### 🔧 強制キャッシュクリア方法
1. **ブラウザ**：
   - Ctrl+Shift+Delete → 全期間のキャッシュ削除
   - シークレットモード で確認

2. **Netlify側**：
   - 「Functions」→「Clear cache」
   - 「Edge Functions」→「Clear cache」
   - CDN purge を実行

### バージョン確認方法
- ブラウザのタイトルバーに「v1.3.0」と表示されるか確認
- 開発者ツールのConsoleで`document.title`をチェック

## 🎯 最新機能（v1.3.0）
- ✅ カテゴリー別間違い問題機能
- ✅ 最新版/全履歴の選択機能  
- ✅ カテゴリークイズ選択に戻るボタン
- ✅ 強制キャッシュ無効化設定