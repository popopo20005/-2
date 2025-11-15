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

### Latest Achievement: Dark Mode UI Background Visibility (2025-11-15)
Successfully resolved dark mode background visibility issues - all cards and components now display correctly:

1. **StatCard Background Opacity Enhancement** ✅
   - File: [src/components/ui/StatCard.tsx](src/components/ui/StatCard.tsx#L94-L171)
   - Fixed: Increased opacity from 0.6 → 0.95 for all 7 themes (learning, success, focus, streak, analysis, progress, achievement)
   - Solution: MutationObserver for real-time dark mode detection with inline style backgrounds

2. **Dashboard Learning Streak Card** ✅
   - File: [src/components/Dashboard.tsx](src/components/Dashboard.tsx#L373-L380)
   - Fixed: Background was invisible (20% opacity → 80% opacity)
   - Root Cause: Tailwind JIT doesn't reliably compile dynamic classes like `dark:from-orange-900/20`
   - Solution: Switched to inline styles with `isDarkMode` state

3. **Card Component Transparency** ✅
   - File: [src/components/ui/Card.tsx](src/components/ui/Card.tsx#L49)
   - Fixed: Added explicit `bg-transparent` when `padding="none"`
   - Impact: Allows child components' gradient backgrounds to show through properly

4. **Verification** ✅
   - Playwright tests: "StatCard - 背景色が表示されている" passing
   - User confirmed: All dark mode backgrounds now visible
   - Commit: b0713f2 "Fix dark mode UI visibility issues"

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
**Current Phase**: Dark Mode UI Optimization Complete
**Status**: Ready for Next Feature
**Recent Commit**: b0713f2 - Fix dark mode UI visibility issues
