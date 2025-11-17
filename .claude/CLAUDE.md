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
- ✅ Pomodoro timer usable (Week 4)

---

**Last Updated**: 2025-11-18
**Current Phase**: Week 2 Complete - Learning Time Tracking
**Status**: Ready for Week 3 (Engagement Enhancement)
**Recent Commits**:
- `3f4e337` - Fix Week 2: Today highlight bar visibility with absolute positioning
- `2902940` - Add debug logs for learning time tracking diagnosis
- `15fe2d4` - Enhance design tokens
- `cd1727e` - Add EmptyState and Skeleton components
**8-Week Plan Progress**: Week 2/8 ✅ (25% complete)
