# CLAUDE.md - Quiz App Project Memory

This file provides guidance to Claude Code when working with this React/TypeScript quiz application.

## 📋 Project Overview

**Project Name**: Minguella - Interactive Quiz Application
**Tech Stack**: React 18 + TypeScript + Vite + Tailwind CSS + IndexedDB
**Purpose**: PWA quiz application with spaced repetition learning system

## 🏗️ Project Structure

```
quiz-app-deploy/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components (Button, Card, StatCard)
│   │   ├── MainMenu.tsx    # Main navigation
│   │   ├── Dashboard.tsx   # Main dashboard with statistics
│   │   ├── ProblemEditor.tsx
│   │   └── ShareCenter.tsx
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks (usePWA, etc.)
│   ├── lib/               # Utilities
│   │   ├── database.ts    # IndexedDB operations
│   │   ├── qrShare.ts     # QR code sharing
│   │   └── sm2Algorithm.ts # Spaced repetition algorithm
│   ├── styles/            # Design tokens and global styles
│   │   ├── designTokens.ts
│   │   └── index.css      # Tailwind + custom CSS
│   └── types/             # TypeScript types
├── tests/
│   └── ui-validation/     # Playwright UI tests (16 tests)
├── .claude/
│   ├── commands/          # 30 SuperClaude slash commands
│   ├── agents/            # 20 specialized AI agents
│   └── settings.local.json
└── public/                # Static assets

```

## 🎯 Recent Work & Context

### Latest Achievement: Week 2 - Learning Time Tracking Complete (2025-11-18)
Successfully completed Week 2 of 8-week development plan - implemented comprehensive learning time tracking system:

#### **Week 2 Day 1-2: Learning Time Tracking Infrastructure** ✅
   - File: [src/lib/studyTimeService.ts](src/lib/studyTimeService.ts)
   - Features: Session management (start/pause/resume/end), in-memory cache, IndexedDB persistence
   - DB: Extended IndexedDB to version 10 with studyTimeSessions table
   - Commit: `3f4e337`

#### **Week 2 Day 3: Dashboard Integration** ✅
   - File: [src/components/Dashboard.tsx](src/components/Dashboard.tsx)
   - Features: Today's study time display (sub-minute support), weekly study time graph (7 days)
   - UI: Purple gradient highlight for today's bar with glow effect and pulse animation
   - Commit: `3f4e337`

#### **Week 2 Day 4-5: Quiz Auto-tracking** ✅
   - File: [src/components/QuizView.tsx](src/components/QuizView.tsx)
   - Features: Auto-start session on quiz begin, auto-end on quiz complete (3 exit points)
   - Debug: Added comprehensive logging for tracking verification
   - Commit: `3f4e337`

#### **Week 2 UI/UX Polish** ✅
   - Today's bar highlight: 2-layer structure (animated background + static content)
   - Glow effect: 3-layer box-shadow (2px border + 20px inner + 40px outer)
   - Animation: Background gradient pulses, text remains static
   - Result: Clean, professional appearance with subtle motion

### Previous Achievement: Week 1 - Design System Foundation (2025-11-15)
Successfully completed Week 1 of 8-week development plan - established comprehensive design system foundation:

#### 1. **Design Tokens Enhancement** ✅
   - File: [src/styles/designTokens.ts](src/styles/designTokens.ts)
   - Added: `spacing.values` - CSS variable format (xs: 4px → 2xl: 48px)
   - Added: `borderRadius` - Complete border radius system with Tailwind & CSS variables
   - Added: `effects.glass` - Glassmorphism effect (backdrop-blur + semi-transparent)
   - Added: `effects.neumorphism` - Neumorphism shadow presets
   - Commit: `15fe2d4`

#### 2. **EmptyState Component** ✅
   - File: [src/components/ui/EmptyState.tsx](src/components/ui/EmptyState.tsx)
   - Features: 7 built-in presets (noQuizSets, noProblems, noHistory, etc.)
   - Support: Primary/secondary action buttons, custom illustrations, compact mode
   - Usage: Display when data is empty with actionable next steps
   - Commit: `cd1727e`

#### 3. **Skeleton Loader System** ✅
   - File: [src/components/ui/Skeleton.tsx](src/components/ui/Skeleton.tsx)
   - Variants: 8 specialized components (Text, Card, List, StatCard, StatGrid, Chart)
   - Features: Custom width/height, circle mode, dark mode support
   - Usage: Loading placeholders for async data
   - Commit: `cd1727e`

#### 4. **Badge Component Enhancement** ✅
   - File: [src/components/ui/Badge.tsx](src/components/ui/Badge.tsx)
   - Added: `info` variant (cyan color scheme)
   - Total variants: 7 (default, secondary, success, warning, error, info, outline)
   - Commit: `84af951`

#### 5. **UI Component Library Index** ✅
   - File: [src/components/ui/index.ts](src/components/ui/index.ts)
   - Exports: All UI components with TypeScript types
   - Usage: Clean imports `import { EmptyState, Skeleton } from '@/components/ui'`

### Previous Work: Dark Mode UI Fixes (2025-11-15)
- StatCard background opacity: 0.6 → 0.95
- Dashboard learning streak card: 20% → 80% opacity
- Card component: Added `bg-transparent` for padding="none"
- Commits: `b0713f2`, `a65d86b`

## 🔧 Development Commands

### Essential Commands
```bash
# Development
npm run dev                 # Start dev server (port 5174)
npm run build              # Production build
npm run preview            # Preview production build

# Testing
npm run test:ui            # Run Playwright UI tests (all)
npm run test:ui:light      # Light mode tests only
npm run test:ui:dark       # Dark mode tests only

# UI test with headed browser
npx playwright test --headed

# Update test screenshots
npx playwright test --update-snapshots
```

### SuperClaude Commands (Now Available)

**📖 完全なコマンドリファレンス**: [COMMANDS_QUICK_REFERENCE.md](.claude/COMMANDS_QUICK_REFERENCE.md)

**重要**: Claude Codeは、ユーザーのタスクに応じて積極的にコマンドを提案してください。

```bash
# Planning & Design (7 commands)
/brainstorm "feature idea"      # アイデア出し、要件定義
/design "system architecture"   # アーキテクチャ設計
/estimate "task complexity"     # 工数見積もり
/spec-panel "specification"     # 仕様分析
/business-panel "strategy"      # ビジネス分析
/recommend                      # 最適なコマンド推奨
/workflow "workflow name"       # ワークフロー自動化

# Development (5 commands)
/implement "feature"            # 機能実装
/build "target"                 # ビルド・パッケージング
/improve "code section"         # リファクタリング
/cleanup "target"               # コードクリーンアップ
/explain "concept"              # コード説明

# Test & Quality (4 commands)
/test "component"               # テスト生成・実行
/analyze "security|performance" # コード分析
/troubleshoot "bug"             # デバッグ
/reflect "implementation"       # 振り返り

# Documentation (2 commands)
/document "target"              # ドキュメント生成
/help                           # ヘルプ表示

# Version Control (1 command)
/git "operation"                # Git操作

# Project Management (3 commands)
/pm "project task"              # プロジェクト管理
/task "task name"               # タスク追跡
/agent "agent-name"             # エージェント起動

# Research (1 command)
/research "topic"               # ディープリサーチ

# Utilities (7 commands)
/index-repo                     # リポジトリインデックス
/index "target"                 # インデックス作成
/select-tool "task"             # ツール選択
/spawn "parallel tasks"         # 並列実行
/load "session"                 # セッション読み込み
/save "session"                 # セッション保存
/sc                             # 全コマンド一覧

# Total: 30 commands
```

**推奨ワークフロー例**:
- 新機能開発: `/brainstorm` → `/design` → `/implement` → `/test` → `/document`
- バグ修正: `/troubleshoot` → `/implement` → `/test`
- コード品質向上: `/analyze` → `/improve` → `/cleanup`

## 🎨 Design System

### Color Themes (Gradient Tokens)
- **Learning**: Blue gradient (`#eff6ff` → `#e0f2fe`)
- **Success**: Green gradient (`#f0fdf4` → `#dcfce7`)
- **Focus**: Purple gradient (`#faf5ff` → `#f3e8ff`)
- **Streak**: Orange gradient (`#fff7ed` → `#fed7aa`)

### Dark Mode Implementation
- Mode: Tailwind `darkMode: 'class'`
- Toggle: Via `document.documentElement.classList.toggle('dark')`
- Storage: localStorage `darkMode: 'true'`
- Components use React hooks with MutationObserver for dark mode detection

### UI Components
- **Card**: Base container with hover/click effects
- **Button**: 7 variants (primary, secondary, success, warning, error, ghost, outline)
- **StatCard**: Statistical display with gradient backgrounds and progress bars

## 🧪 Testing Strategy

### Playwright UI Tests (16 tests total)
- **Light Mode Tests** (8 tests): `dashboard-light.spec.ts`
  - Layout verification
  - StatCard rendering
  - Button interactions
  - Navigation flows
  - Screenshot comparison

- **Dark Mode Tests** (8 tests): `dashboard-dark.spec.ts`
  - Dark theme rendering
  - Gradient visibility
  - Text contrast
  - Component states

### Test Configuration
- Browser: Chromium (both light & dark projects)
- Screenshots: `tests/ui-validation/*.spec.ts-snapshots/`
- Max diff tolerance: 2%

## 🔐 Known Issues & Solutions

### Issue: Tailwind `dark:` Classes Not Applying
**Root Cause**: JIT compiler doesn't recognize dynamically concatenated classes
**Solution**: Use inline styles with React state for dark mode colors

### Issue: HMR Not Reflecting Changes
**Solution**: Clear Vite cache (`node_modules/.vite`) and restart dev server

### Issue: StatCard Gradients Not Showing
**Solved**: Don't use `bg-transparent` class when applying inline `background` styles

## 🚀 Next Steps & Roadmap

### Immediate Priorities
1. ~~Fix dark mode UI issues~~ ✅ COMPLETED
2. Implement SuperClaude framework ✅ IN PROGRESS
3. Set up MCP servers for enhanced development
4. Create comprehensive documentation

### Planned Features
- Spaced repetition dashboard improvements
- CSV import/export enhancements
- Mobile PWA optimizations
- Accessibility improvements (WCAG 2.1 AA)

## 🤖 Available AI Agents

The project now has access to 20+ specialized agents in `.claude/agents/`:
- **pm-agent**: Project management and task coordination
- **deep-research**: Autonomous web research
- **frontend-architect**: React/UI expertise
- **backend-architect**: Server/API design
- **security-engineer**: Security auditing
- **performance-engineer**: Performance optimization
- **quality-engineer**: Testing and QA
- **technical-writer**: Documentation generation
- And 13+ more specialized agents...

Use `/agents` command or request explicitly: "Use the [agent-name] agent to..."

## 📚 Critical Files for Context

When starting a new session, review these files:
1. **PLANNING.md** - Architecture and design principles
2. **TASK.md** - Current tasks and priorities
3. **KNOWLEDGE.md** - Accumulated insights and learnings
4. **This file (CLAUDE.md)** - Project context and memory

## 🌐 External Resources

- **GitHub Repo**: [quiz-app-deploy]
- **Vite Docs**: https://vitejs.dev/
- **React Docs**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Playwright**: https://playwright.dev/

---

## 🎯 Week 3 Preparation

### Week 3 Overview: Engagement Enhancement (Week 3-4 in Plan)
**Duration**: 2 weeks
**Focus**: Progress display enhancement + Micro-interactions

#### Phase 2 UI/UX Improvements:

**6. Progress Display Enhancement** (2 days)
- File: [src/components/QuizView.tsx](src/components/QuizView.tsx)
- Features:
  - Progress bar (completion percentage)
  - Current question number / total questions
  - Elapsed time display
  - Real-time accuracy rate
  - Milestone notifications (every 5 questions)
- Design:
  ```
  ┌─────────────────────────────────────┐
  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━ 60%  │
  │ 問題 12/20  ⏱️ 03:45  💯 85%      │
  └─────────────────────────────────────┘
  ```

**7. Skeleton Loaders** (1 day)
- Library: `react-loading-skeleton`
- Target files:
  - [src/components/QuizSetManager.tsx](src/components/QuizSetManager.tsx)
  - [src/components/Statistics.tsx](src/components/Statistics.tsx)
  - Chart components
- Features:
  - Card list skeletons
  - Statistics screen skeletons
  - Chart skeletons
  - Pulse animation
  - Smooth transitions

**8. Micro-interactions** (2 days)
- Libraries: `framer-motion`, `react-hot-toast`, `canvas-confetti`
- Implementations:
  - Button hover scale effect
  - Correct answer ✅ animation + confetti
  - Incorrect answer ❌ animation + shake
  - Card swipe animation
  - Level-up celebration modal
  - Streak achievement fire effect
  - Toast notifications

#### Phase 2 Feature Improvements:

**9. Learning Calendar Heatmap** (2 days)
- Library: `react-calendar-heatmap`
- File: [src/components/StudyDiary.tsx](src/components/StudyDiary.tsx) (new)
- Features:
  - 365-day learning activity calendar
  - Color intensity based on daily study amount
  - Hover for detailed information
  - Consecutive learning days highlight
  - Utilize existing History data

**10. Pomodoro Timer** (2 days)
- Files:
  - [src/components/PomodoroTimer.tsx](src/components/PomodoroTimer.tsx) (new)
  - [src/components/QuizView.tsx](src/components/QuizView.tsx) (integration)
- Features:
  - Customizable intervals (default 25min/5min)
  - Audio/visual alerts
  - Focus session count tracking
  - Quiz screen integration
  - Time adjustment in settings
- Technical:
  - Web Audio API for notification sounds
  - LocalStorage for settings
  - Background timer (Service Worker)

### Required Libraries for Week 3:
```bash
npm install react-loading-skeleton framer-motion react-hot-toast canvas-confetti react-calendar-heatmap
```

### Week 3 Success Criteria:
- ✅ Quiz screen dramatically improved
- ✅ Learning calendar operational
- ✅ Smooth animations throughout
- ✅ Pomodoro timer usable

---

### Latest Achievement: Week 3 - Engagement Enhancement Complete (2025-11-20)
Successfully completed Week 3 of 8-week development plan - implemented comprehensive engagement features:

#### **Week 3 Task#6: Progress Display Enhancement** ✅
   - File: [src/components/QuizView.tsx](src/components/QuizView.tsx)
   - Features: Progress bar, question counter, elapsed time, real-time accuracy, milestone notifications
   - Already implemented in previous sessions

#### **Week 3 Task#7: Skeleton Loaders** ✅
   - File: [src/components/ui/Skeleton.tsx](src/components/ui/Skeleton.tsx)
   - Library: `react-loading-skeleton` (installed)
   - Features: 8 specialized skeleton components with dark mode support

#### **Week 3 Task#8: Micro-interactions** ✅
   - Files: [src/components/QuizView.tsx](src/components/QuizView.tsx)
   - Libraries: `framer-motion`, `react-hot-toast`, `canvas-confetti` (all installed)
   - Features: Button hover effects, correct/incorrect animations, confetti, toast notifications

#### **Week 3 Task#9: Learning Calendar Heatmap** ✅
   - File: [src/components/StudyCalendar.tsx](src/components/StudyCalendar.tsx)
   - Features: 365-day calendar, SM-2 review schedule integration, card name display, duplicate removal
   - Result: Shows learning history and upcoming review schedule

#### **Week 3 Task#10: Pomodoro Timer** ✅
   - Files: [src/contexts/PomodoroContext.tsx](src/contexts/PomodoroContext.tsx), [src/components/PomodoroTimer.tsx](src/components/PomodoroTimer.tsx)
   - Features: Global state management, 4 presets (Pomodoro/Deep Work/Light/Custom), Web Audio API notifications
   - Integration: Added to Guide component, persists across navigation

---

## 🎯 Week 4 Preparation

### Week 4 Overview: Data Utilization + Visual Enhancement (Week 5-6 in Plan)
**Duration**: 2 weeks
**Focus**: Responsive design + Weakness detection + Goal management

#### Phase 2 UI/UX Improvements (Continued):

**11. Responsive Design Optimization** (2 days)
- Target: All components
- Features:
  - Mobile: Single column, large tap targets
  - Tablet: 2-column layout
  - Desktop: 3-column layout
  - Thumb zone respect (iOS 44×44pt, Android 48×48dp)
  - Swipe gesture support
- Tailwind breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px)

**12. Dark Mode Improvement** (1 day)
- Files: [src/styles/designTokens.ts](src/styles/designTokens.ts), all components
- Features:
  - WCAG 2.1 AA compliance (contrast ratio 4.5:1+)
  - Color palette optimization
  - Gradient effects
  - Smooth transition animations
  - Auto-detection (system settings)

**13. Framer Motion Integration** (2 days)
- Library: `framer-motion` (already installed)
- File: [src/utils/animations.ts](src/utils/animations.ts) (new)
- Features:
  - Page transition animations (fade, slide, scale)
  - Card flip animations
  - Stagger animations (list display)
  - Hover effects
  - Common animation config file

#### Phase 3 Feature Improvements:

**14. Weakness Detection** (3 days)
- Files:
  - [src/services/weaknessDetectionService.ts](src/services/weaknessDetectionService.ts) (new)
  - [src/components/Dashboard.tsx](src/components/Dashboard.tsx) (integration)
  - [src/components/Statistics.tsx](src/components/Statistics.tsx) (detail view)
- Features:
  - Category-wise accuracy analysis
  - Highlight categories with <60% accuracy as "weakness"
  - Dedicated learning mode for weak categories
  - "Today's recommended problems" feature
  - Algorithm: `weakness_score = (1 - accuracy) × frequency × days_since_last_study`

**15. Goal Setting & Progress Management** (3 days)
- Files:
  - [src/lib/database.ts](src/lib/database.ts) (add goals table)
  - [src/components/GoalManager.tsx](src/components/GoalManager.tsx) (new)
  - [src/components/Dashboard.tsx](src/components/Dashboard.tsx) (integration)
- DB Schema:
  ```typescript
  goals: {
    id: number;
    type: 'short' | 'medium' | 'long';
    title: string;
    targetValue: number;
    currentValue: number;
    unit: 'problems' | 'hours' | 'streak' | 'accuracy';
    deadline?: Date;
    isCompleted: boolean;
  }
  ```
- Features:
  - Short-term goals (100 problems this week)
  - Medium-term goals (500 problems this month)
  - Long-term goals (master all problems by exam date)
  - Progress display
  - Celebration on achievement (confetti + modal)

### Week 4 Success Criteria:
- ✅ Responsive on all devices
- ✅ Weakness auto-detection working
- ✅ Goal management system operational
- ✅ Dark mode polished
- ✅ Smooth animations with Framer Motion

---

## 🔄 開発計画の再構築 (2025-11-20)

### 新方針：バックエンド優先 + Figma統合UI/UX

**背景**: Week 1-3でUI/UX基盤は完成。Week 4-7はデータドリブン機能とロジックに集中し、Week 8でFigmaを使用してUI/UXを一括リファクタリング。

---

## 📅 Week 4-8: 再構築済み開発計画

### **Week 4: データ分析基盤** (2025-11-20 ~ 11-27)
**Focus**: 弱点検出 + 目標管理のロジック実装

#### Task#14: 弱点分野の自動検出 (3日間)
- **ファイル**:
  - `src/services/weaknessDetectionService.ts` (新規)
  - `src/lib/database.ts` (categoryStats追加)
- **機能**:
  - カテゴリー別正答率の集計アルゴリズム
  - 弱点スコア計算: `(1 - accuracy) × frequency × days_since_last_study`
  - トップ3弱点カテゴリーの抽出
  - 推奨問題セットの自動生成
- **DB設計**:
  ```typescript
  categoryStats: {
    id: number;
    category: string;
    totalAttempts: number;
    correctCount: number;
    accuracy: number;
    lastStudied: Date;
    weaknessScore: number;
  }
  ```

#### Task#15: 目標設定と進捗管理 (3日間)
- **ファイル**:
  - `src/lib/database.ts` (goalsテーブル追加)
  - `src/services/goalService.ts` (新規)
  - `src/components/GoalManager.tsx` (新規、シンプルUI)
- **機能**:
  - CRUD操作（目標の作成・更新・削除）
  - 進捗計算ロジック
  - 目標達成判定アルゴリズム
  - データ集計と統計処理
- **DB設計**:
  ```typescript
  goals: {
    id: number;
    type: 'short' | 'medium' | 'long';
    title: string;
    targetValue: number;
    currentValue: number;
    unit: 'problems' | 'hours' | 'streak' | 'accuracy';
    deadline?: Date;
    isCompleted: boolean;
    createdAt: Date;
  }
  ```

**Week 4 成果物**: 学習データ分析エンジン + 目標管理システム

---

### **Week 5: パーソナライゼーション** (2025-11-27 ~ 12-04)

#### Task#16: 適応的問題推奨システム (4日間)
- **ファイル**:
  - `src/services/recommendationEngine.ts` (新規)
  - `src/lib/adaptiveDifficulty.ts` (新規)
- **機能**:
  - ユーザーの正答率ベースの難易度調整
  - 学習履歴からの最適問題推奨
  - スペースドリピティション統合
  - 推奨アルゴリズム:
    ```typescript
    score = weakness_score × 0.4 +
            time_since_review × 0.3 +
            difficulty_match × 0.3
    ```
- **最適化**:
  - IndexedDBクエリの効率化
  - キャッシング戦略

#### Task#17: 学習データ統計処理 (2日間)
- **ファイル**:
  - `src/services/statisticsAggregator.ts` (新規)
  - 既存Statisticsコンポーネントへの統合
- **機能**:
  - 週次・月次データ集計
  - トレンド分析（移動平均）
  - パフォーマンス予測
  - データエクスポート用JSON生成

**Week 5 成果物**: 個別最適化学習エンジン

---

### **Week 6: 通知とバックグラウンド** (2025-12-04 ~ 12-11)

#### Task#18: Web Push API統合 (3日間)
- **ファイル**:
  - `src/services/notificationService.ts` (新規)
  - `public/sw.js` (Service Worker拡張)
- **機能**:
  - Push API登録とサブスクリプション
  - 通知許可フロー
  - バックグラウンド通知送信
  - 通知タイプ:
    - 復習リマインダー（SM-2ベース）
    - 目標達成通知
    - ストリーク継続アラート

#### Task#19: バックグラウンドタスク (2日間)
- **ファイル**:
  - `src/workers/dataAggregator.ts` (新規)
  - Service Worker統合
- **機能**:
  - 定期的なデータ集計（日次統計）
  - 古いデータのクリーンアップ
  - キャッシュ最適化
  - オフライン同期準備

**Week 6 成果物**: プッシュ通知システム + バックグラウンド処理

---

### **Week 7: データ管理と最適化** (2025-12-11 ~ 12-18)

#### Task#20: 学習メモ機能 (2日間)
- **ファイル**:
  - `src/lib/database.ts` (Problem拡張)
  - `src/services/noteService.ts` (新規)
- **機能**:
  - Markdown形式メモ
  - 全文検索（Fuse.js）
  - メモのエクスポート
- **DB拡張**:
  ```typescript
  problems: {
    // 既存フィールド...
    userNotes?: string;
    noteUpdatedAt?: Date;
  }
  ```

#### Task#21: データエクスポート/インポート強化 (2日間)
- **ファイル**:
  - `src/services/exportService.ts` (拡張)
  - `src/services/importService.ts` (拡張)
- **機能**:
  - 全データの完全バックアップ（JSON）
  - 選択的インポート
  - データ検証とマイグレーション
  - クラウドストレージ連携準備

#### Task#22: パフォーマンス最適化 (2日間)
- **対象**:
  - IndexedDBクエリ最適化
  - コード分割（React.lazy）
  - 画像最適化（WebP）
  - Lighthouseスコア90+達成

**Week 7 成果物**: データ管理完全システム + 最適化済みアプリ

---

### **Week 8: UI/UX総仕上げ** (2025-12-18 ~ 12-25)

#### Task#23: Figmaデザインシステム再設計 (2日間)
- **成果物**:
  - 完全なデザインシステム（Figma）
  - コンポーネントライブラリ
  - カラーパレット最適化
  - タイポグラフィ体系

#### Task#24: コンポーネント一括リファクタリング (3日間)
- **対象**: 全コンポーネント
- **作業**:
  - Figmaデザインに基づく再実装
  - レスポンシブデザイン完全対応
  - アクセシビリティ改善（WCAG AA）
  - アニメーション統合

#### Task#25: 最終テストとバグ修正 (2日間)
- **テスト**:
  - Playwright E2Eテスト拡充
  - クロスブラウザテスト
  - モバイル実機テスト
  - パフォーマンステスト
- **バグ修正**: 全既知問題の解決

**Week 8 成果物**: プロダクション準備完了

---

## 📊 改善後の工数配分

| Week | フェーズ | 工数 | UI/UX | バックエンド |
|------|---------|------|-------|-------------|
| 1-3 | 完了 | 15日 | ✅ 80% | ✅ 60% |
| 4 | データ分析 | 6日 | 10% | 90% |
| 5 | パーソナライゼーション | 6日 | 10% | 90% |
| 6 | 通知・バックグラウンド | 5日 | 5% | 95% |
| 7 | データ管理・最適化 | 6日 | 10% | 90% |
| 8 | UI/UX総仕上げ | 7日 | 100% | 0% |

**合計**: 45日（Week 4-8で30日、Week 1-3で15日）

---

**Last Updated**: 2025-11-20
**Current Phase**: Week 4 Start - Data Analysis Foundation
**Status**: Implementing Weakness Detection & Goal Management
**Recent Achievements**:
- ✅ Week 3 Complete: Engagement Enhancement
- ✅ Framer Motion Integration
- ✅ Dark Mode WCAG 2.1 AA Compliance
- ✅ Horizontal padding fixes
**8-Week Plan Progress**: Week 4/8 (50% complete)
**Next Milestone**: Week 4 - Weakness Detection Service
