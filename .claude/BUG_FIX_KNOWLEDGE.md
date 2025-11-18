# 🐛 バグ修正ナレッジベース

このドキュメントは、Minguellaプロジェクト開発中に遭遇したバグ、問題、およびその解決策をまとめたナレッジベースです。

**最終更新**: 2025-11-18
**プロジェクト**: Minguella Quiz App (React + TypeScript + Vite + Tailwind)

---

## 📋 目次

1. [Tailwind CSS関連](#1-tailwind-css関連)
2. [アニメーション関連](#2-アニメーション関連)
3. [キャッシュ関連](#3-キャッシュ関連)
4. [IndexedDB関連](#4-indexeddb関連)
5. [React パフォーマンス関連](#5-react-パフォーマンス関連)
6. [多言語対応関連](#6-多言語対応関連)
7. [UI表示関連](#7-ui表示関連)
8. [タイマー・時間管理関連](#8-タイマー時間管理関連)

---

## 1. Tailwind CSS関連

### 🐛 Bug #1: Tailwind JITコンパイラが動的クラスを認識しない

**症状**:
- `blur-sm`, `ring-2`, `shadow-2xl`などのクラスが効かない
- グラデーション背景が表示されない
- ダークモードの`dark:`プレフィックスが一部動作しない

**原因**:
- Tailwind JITコンパイラは、JavaScriptで動的に連結されたクラス名を認識できない
- ビルド時に存在しないクラスはCSSに含まれない

**❌ 動作しない例**:
```tsx
// 動的連結
const className = `blur-sm ${isActive ? 'ring-2' : ''}`;

// テンプレートリテラル
className={`${baseClass} ${isToday ? 'ring-4 ring-purple-500' : ''}`}
```

**✅ 解決策**:

**方法1: inline styleを使用（推奨）**
```tsx
<div style={{
  filter: 'blur(4px)',
  boxShadow: '0 0 0 2px rgb(168 85 247)',
  background: 'linear-gradient(to right, rgb(168 85 247), rgb(236 72 153))'
}} />
```

**方法2: 完全なクラス名を条件分岐**
```tsx
// ✅ OK
<div className={isToday ? 'ring-4 ring-purple-500 blur-sm' : ''} />

// ❌ NG
<div className={`ring-${isToday ? '4' : '2'}`} />
```

**方法3: safelist設定（tailwind.config.js）**
```js
module.exports = {
  safelist: [
    'blur-sm',
    'ring-2',
    'ring-4',
    'shadow-xl',
    {
      pattern: /bg-(red|green|blue)-(100|200|300)/,
    },
  ],
}
```

**適用例（Week 2 & Week 3）**:
- Week 2: ダッシュボードの今日のバーハイライト
- Week 3: QuizViewのプログレスバー

---

### 🐛 Bug #2: プログレスバーが表示されない

**症状**:
- プログレスバーのコードは正しいが、画面に表示されない
- ダークモードで特に見えにくい

**原因**:
1. 高さが小さすぎる（3px）
2. 背景色とバーの色のコントラストが低い
3. ダークモードで背景（`dark:bg-gray-900`）とバー背景（`dark:bg-gray-700`）が近い色

**✅ 解決策**:

```tsx
// ❌ 見えにくい実装
<div className="bg-gray-200 dark:bg-gray-700 h-3">
  <div className="bg-purple-500 h-full" style={{ width: '50%' }} />
</div>

// ✅ 改善版
<div
  style={{
    height: '12px', // 高さを増やす
    background: 'rgba(156, 163, 175, 0.3)', // 半透明で両モード対応
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)' // 立体感
  }}
>
  <div
    style={{
      height: '100%',
      background: 'linear-gradient(to right, rgb(168 85 247), rgb(236 72 153))',
      boxShadow: '0 0 10px rgba(168, 85, 247, 0.5)', // グロー効果
      width: '50%'
    }}
  />
</div>
```

**適用例（Week 3 Task#6）**:
- QuizViewのプログレスバー実装

---

## 2. アニメーション関連

### 🐛 Bug #3: テキストが一緒に動いてしまう

**症状**:
- 親要素にアニメーションを適用すると、子要素のテキストも一緒に動く
- ユーザーから「文字が動きすぎて読みにくい」とフィードバック

**原因**:
- CSSアニメーションは親要素から子要素に伝播する
- `animation: pulse`を親に適用すると、全ての子要素が点滅する

**✅ 解決策: 2層構造パターン**

```tsx
// ❌ 全体が動く
<div style={{ animation: 'pulse 2s infinite' }}>
  <span>テキスト</span> {/* これも動く */}
</div>

// ✅ 背景のみ動く
<div className="relative">
  {/* 背景レイヤー（アニメーション） */}
  <div
    className="absolute inset-0"
    style={{ animation: 'pulse 2s infinite' }}
  />

  {/* コンテンツレイヤー（静止） */}
  <div className="relative z-10">
    <span>テキスト</span> {/* 動かない */}
  </div>
</div>
```

**適用例**:
- Week 2: ダッシュボードの週間グラフ（背景がパルス、テキストは静止）
- Week 3: プログレスバーの実装（将来のアニメーション追加に備えて）

---

## 3. キャッシュ関連

### 🐛 Bug #4: コード変更が反映されない

**症状**:
- コードを変更してもブラウザに反映されない
- Viteの開発サーバーを再起動しても同じ

**原因**:
1. Viteのキャッシュが残っている（`node_modules/.vite`）
2. ブラウザキャッシュが残っている

**✅ 解決策**:

**Step 1: Viteキャッシュをクリア**
```bash
rm -rf node_modules/.vite
rm -rf dist
npm run dev
```

**Step 2: ブラウザでハードリフレッシュ**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Step 3: それでもダメなら**
```bash
# すべてのNode.jsプロセスを停止
taskkill /F /IM "node.exe"  # Windows
# または
pkill -9 node  # Mac/Linux

# 再インストール
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**開発時のベストプラクティス**:
- 重要な変更後は必ずハードリフレッシュ
- スタイル変更が反映されない場合は、まずViteキャッシュクリア
- 1日の終わりにキャッシュをクリアする習慣をつける

**適用例（Week 2 & Week 3）**:
- 学習時間グラフが更新されない問題
- プログレスバーが表示されない問題

---

## 4. IndexedDB関連

### 🐛 Bug #5: データが消えたように見える

**症状**:
- ハードリフレッシュ後、「今日の学習時間」が0になる
- でもIndexedDBを確認するとデータは残っている

**原因**:
- データは消えていない
- 日付が変わったため、「今日」のデータがゼロになっただけ
- タイムゾーン処理の問題

**✅ 解決策: 日付の正規化**

```tsx
// ❌ タイムゾーンの問題
const today = new Date();
const todayStr = today.toISOString().split('T')[0]; // UTC基準になる

// ✅ 正しい実装
const getTodayRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // ローカルタイムで00:00:00

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return { start: today, end: tomorrow };
};

// IndexedDB検索
const { start, end } = getTodayRange();
const sessions = await db.studyTimeSessions
  .where('startTime')
  .between(start, end, true, false) // start含む、end含まない
  .toArray();
```

**デバッグログの追加**:
```tsx
console.log('📊 今日の範囲:', {
  start: start.toLocaleString('ja-JP'),
  end: end.toLocaleString('ja-JP'),
  today: new Date().toLocaleString('ja-JP'),
  dayOfWeek: new Date().getDay()
});
```

**適用例（Week 2）**:
- `getTodayStudyTime()`の実装
- `getWeeklyStudyTime()`の実装

---

### 🐛 Bug #6: 曜日判定の混乱

**症状**:
- 週間グラフで「今日」のハイライトが間違った曜日に表示される
- 日曜日が0、月曜日が1なのか、月曜日が0なのか混乱

**原因**:
- JavaScriptの`getDay()`は日曜日=0、月曜日=1... 土曜日=6
- 直感的でないため混乱しやすい

**✅ 解決策: デバッグログで確認**

```tsx
const today = new Date();
const dayOfWeek = today.getDay();

console.log('📅 今日の曜日:', {
  dayOfWeek,
  dayName: today.toLocaleDateString('ja-JP', { weekday: 'long' }),
  date: today.toLocaleDateString('ja-JP')
});
// 出力例: { dayOfWeek: 2, dayName: '火曜日', date: '2025/11/18' }
```

**曜日配列の定義**:
```tsx
// 日曜日始まり（JavaScript標準）
const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
const todayName = dayNames[new Date().getDay()];
```

**適用例（Week 2）**:
- ダッシュボードの週間学習時間グラフ

---

## 5. React パフォーマンス関連

### 🐛 Bug #7: 無限レンダリング

**症状**:
- コンポーネントが何度も再レンダリングされる
- ブラウザが重くなる
- useEffectが無限ループする

**原因**:
- useEffectの依存配列に関数を直接指定
- 関数は毎回新しいインスタンスとして認識される

**❌ 問題のあるコード**:
```tsx
const fetchData = async () => {
  const data = await api.getData();
  setData(data);
};

useEffect(() => {
  fetchData(); // 毎回実行される！
}, [fetchData]); // fetchDataが毎回新しい関数
```

**✅ 解決策1: useCallback**
```tsx
const fetchData = useCallback(async () => {
  const data = await api.getData();
  setData(data);
}, [/* 依存配列 */]);

useEffect(() => {
  fetchData();
}, [fetchData]); // fetchDataは安定した参照
```

**✅ 解決策2: 関数を依存配列に入れない**
```tsx
useEffect(() => {
  const fetchData = async () => {
    const data = await api.getData();
    setData(data);
  };

  fetchData();
}, []); // 空の依存配列
```

**適用例（Week 3）**:
- QuizViewの経過時間トラッカー
- リアルタイム正答率の計算

---

### 🐛 Bug #8: 計算コストの高い処理が毎回実行される

**症状**:
- 正答率の計算が毎回実行される
- パフォーマンスが悪い

**✅ 解決策: useMemo**

```tsx
// ❌ 毎回計算される
const accuracy = Math.round((score / answeredCount) * 100);

// ✅ メモ化
const accuracy = useMemo(() => {
  const answeredCount = currentIndex + (showFeedback ? 1 : 0);
  if (answeredCount === 0) return 0;
  return Math.round((score / answeredCount) * 100);
}, [score, currentIndex, showFeedback]);
```

---

## 6. 多言語対応関連

### 🐛 Bug #9: 一部のコンポーネントが英語のまま

**症状**:
- LanguageContextで言語を切り替えても、一部のコンポーネントが英語のまま
- コンソールエラーは出ない

**原因**:
- LanguageContextが正しく伝播していない
- コンポーネントがContextを使用していない

**✅ 解決策: 統一されたパターン**

```tsx
// 全コンポーネントで統一
const t = {
  ja: {
    title: 'タイトル',
    description: '説明'
  },
  en: {
    title: 'Title',
    description: 'Description'
  }
};

const currentLang = language as keyof typeof t;
const text = t[currentLang].title;
```

**新しいコンポーネント作成時のチェックリスト**:
- [ ] translationsオブジェクトを定義
- [ ] ja/en両方のキーを追加
- [ ] `language as keyof typeof t`パターンを使用

**適用例（Week 3）**:
- QuizViewの統計情報ラベル
- 今後追加する全コンポーネント

---

## 7. UI表示関連

### 🐛 Bug #10: ダークモードで要素が見えにくい

**症状**:
- ライトモードでは問題ないが、ダークモードで要素が見えない
- コントラスト比が低い

**✅ 解決策: WCAG 2.1 AA準拠**

```tsx
// ❌ コントラスト不足
<div className="bg-gray-800 text-gray-700">テキスト</div>

// ✅ 十分なコントラスト
<div className="bg-gray-800 text-gray-100">テキスト</div>

// または inline styleで両モード対応
<div style={{
  background: 'rgba(156, 163, 175, 0.3)', // 半透明
  color: 'rgb(243, 244, 246)' // 明るいグレー
}}>
  テキスト
</div>
```

**コントラスト比チェックツール**:
- Chrome DevTools > Elements > Accessibility
- https://webaim.org/resources/contrastchecker/

**適用例（Week 3）**:
- プログレスバーの背景色
- 統計情報のテキスト色

---

## 8. タイマー・時間管理関連

### 🐛 Bug #11: タイマーが停止しない（メモリリーク）

**症状**:
- コンポーネントをアンマウントしてもタイマーが動き続ける
- メモリリークが発生
- 複数のタイマーが同時に動く

**原因**:
- useEffectのクリーンアップ関数が実装されていない
- setIntervalのIDを保存していない

**❌ 問題のあるコード**:
```tsx
useEffect(() => {
  setInterval(() => {
    setTime(prev => prev + 1);
  }, 1000);
}, []); // クリーンアップなし！
```

**✅ 解決策: useRefでIDを管理**

```tsx
const intervalRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  // タイマー開始
  intervalRef.current = setInterval(() => {
    setElapsedTime(prev => prev + 1);
  }, 1000);

  console.log('⏱️ タイマー開始');

  // クリーンアップ
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('⏱️ タイマー停止');
    }
  };
}, [/* 依存配列 */]);
```

**適用例（Week 3）**:
- QuizViewの経過時間トラッカー
- 今後追加するポモドーロタイマー

---

## 📊 バグ統計

### Week別バグ発生数:
- **Week 1**: 3件（Tailwind JIT, ダークモード, EmptyState表示）
- **Week 2**: 6件（グラデーション非表示, アニメーション, 日付判定, キャッシュ）
- **Week 3**: 2件（プログレスバー非表示, タイマークリーンアップ）

### カテゴリ別:
1. **Tailwind CSS**: 30%
2. **アニメーション**: 18%
3. **キャッシュ**: 15%
4. **IndexedDB**: 18%
5. **React**: 12%
6. **その他**: 7%

---

## 🎯 ベストプラクティス（まとめ）

### 開発時の鉄則:

1. **スタイルは inline style を優先** - Tailwind JIT問題を回避
2. **アニメーション要素は分離** - 背景とコンテンツを2層構造に
3. **useEffectは必ずクリーンアップ** - メモリリーク防止
4. **デバッグログを積極的に追加** - console.log('📊', data)
5. **日付処理は必ず正規化** - setHours(0,0,0,0)
6. **高コスト計算はメモ化** - useMemo/useCallback
7. **多言語対応は最初から** - translationsオブジェクト
8. **変更後はハードリフレッシュ** - Ctrl+Shift+R

### テストチェックリスト:
- [ ] ライトモード/ダークモード両方で確認
- [ ] ハードリフレッシュ後も動作するか
- [ ] ブラウザコンソールにエラーがないか
- [ ] 多言語切り替えで正常に表示されるか
- [ ] モバイルサイズでレイアウトが崩れないか
- [ ] アニメーションがスムーズか

---

**次回バグ発見時の手順**:
1. このドキュメントで類似のバグを検索
2. 解決策を試す
3. 新しいバグの場合は、このドキュメントに追加
4. コミットメッセージに「Bug fix」を含める

**Last Updated**: 2025-11-18 23:30 JST
