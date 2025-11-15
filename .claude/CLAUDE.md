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

### Latest Achievement: Week 1 - Design System Foundation (2025-11-15)
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

**Last Updated**: 2025-11-15
**Current Phase**: Week 1 Complete - Design System Foundation
**Status**: Ready for Week 2 (Learning Time Tracking)
**Recent Commits**:
- `15fe2d4` - Enhance design tokens
- `cd1727e` - Add EmptyState and Skeleton components
- `84af951` - Optimize Badge component
**8-Week Plan Progress**: Week 1/8 ✅ (12.5% complete)
