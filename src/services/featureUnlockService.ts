/**
 * featureUnlockService - 段階的機能解放システム
 * Claude Design モック 2a/2b/2m 準拠
 *
 * Day1: プレイ・クイック5・つくる のみ
 * Level/日数に応じて機能を順次解放
 * 解放の瞬間を報酬として演出
 */

export interface FeatureDefinition {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  unlockCondition: {
    type: 'level' | 'day' | 'always';
    value: number;
  };
  group: 'learning' | 'analysis' | 'data' | 'social';
}

export interface UnlockState {
  unlockedFeatures: string[];
  pendingUnlocks: string[]; // 解放済みだが未表示
  lastCheckedLevel: number;
  lastCheckedDay: number;
}

// 全機能定義と解放条件
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  // 常に解放
  { id: 'play', name: 'プレイ', nameEn: 'Play', description: 'クイズをプレイ', descriptionEn: 'Play quizzes', unlockCondition: { type: 'always', value: 0 }, group: 'learning' },
  { id: 'quick5', name: 'クイック5', nameEn: 'Quick 5', description: '5問だけサッと学習', descriptionEn: 'Quick 5 problems', unlockCondition: { type: 'always', value: 0 }, group: 'learning' },
  { id: 'create', name: 'つくる', nameEn: 'Create', description: '問題をつくる', descriptionEn: 'Create problems', unlockCondition: { type: 'always', value: 0 }, group: 'learning' },
  { id: 'library', name: 'ライブラリ', nameEn: 'Library', description: '問題セット管理', descriptionEn: 'Manage problem sets', unlockCondition: { type: 'always', value: 0 }, group: 'learning' },

  // Lv.2 解放
  { id: 'studyPlan', name: '学習プラン', nameEn: 'Study Plan', description: 'あなた専用の学習計画', descriptionEn: 'Your personalized study plan', unlockCondition: { type: 'level', value: 2 }, group: 'learning' },
  { id: 'flashcard', name: 'フラッシュカード', nameEn: 'Flashcards', description: 'SM-2式の自己評価カード', descriptionEn: 'SM-2 self-evaluation cards', unlockCondition: { type: 'level', value: 2 }, group: 'learning' },

  // Lv.3 解放
  { id: 'pomodoro', name: 'ポモドーロ', nameEn: 'Pomodoro', description: '集中タイマー', descriptionEn: 'Focus timer', unlockCondition: { type: 'level', value: 3 }, group: 'learning' },
  { id: 'audioStudy', name: '音声学習', nameEn: 'Audio Study', description: 'ながら学習', descriptionEn: 'Listen & learn', unlockCondition: { type: 'level', value: 3 }, group: 'learning' },

  // Day 7 解放
  { id: 'weeklyReview', name: '週次レビュー', nameEn: 'Weekly Review', description: '1週間のふりかえり', descriptionEn: 'Review your week', unlockCondition: { type: 'day', value: 7 }, group: 'analysis' },

  // Lv.5 解放
  { id: 'trendAnalysis', name: '月次・トレンド・予測', nameEn: 'Trends & Predictions', description: '学習データの詳細分析', descriptionEn: 'Detailed learning analytics', unlockCondition: { type: 'level', value: 5 }, group: 'analysis' },
  { id: 'weaknessAnalysis', name: '弱点分析', nameEn: 'Weakness Analysis', description: '苦手分野の深堀り', descriptionEn: 'Deep dive into weak areas', unlockCondition: { type: 'level', value: 5 }, group: 'analysis' },

  // Lv.7 解放
  { id: 'goalManager', name: '目標管理', nameEn: 'Goal Manager', description: '短期・中期・長期の目標', descriptionEn: 'Short/mid/long-term goals', unlockCondition: { type: 'level', value: 7 }, group: 'data' },
  { id: 'noteManager', name: '学習メモ', nameEn: 'Notes', description: 'Markdown形式のメモ', descriptionEn: 'Markdown notes', unlockCondition: { type: 'level', value: 7 }, group: 'data' },

  // Lv.10 解放
  { id: 'backup', name: 'バックアップ', nameEn: 'Backup', description: 'データの保存と復元', descriptionEn: 'Save & restore data', unlockCondition: { type: 'level', value: 10 }, group: 'data' },
  { id: 'share', name: '共有', nameEn: 'Share', description: 'QRコードでセット共有', descriptionEn: 'Share via QR code', unlockCondition: { type: 'always', value: 0 }, group: 'social' },
];

const STORAGE_KEY = 'featureUnlockState';

function getState(): UnlockState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {
    unlockedFeatures: FEATURE_DEFINITIONS.filter(f => f.unlockCondition.type === 'always').map(f => f.id),
    pendingUnlocks: [],
    lastCheckedLevel: 1,
    lastCheckedDay: 1,
  };
}

function saveState(state: UnlockState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * レベルと日数に基づいて新しく解放される機能をチェック
 * @returns 新しく解放された機能のリスト（演出用）
 */
export function checkUnlocks(currentLevel: number, currentDay: number): FeatureDefinition[] {
  const state = getState();
  const newUnlocks: FeatureDefinition[] = [];

  for (const feature of FEATURE_DEFINITIONS) {
    if (state.unlockedFeatures.includes(feature.id)) continue;

    let shouldUnlock = false;
    if (feature.unlockCondition.type === 'always') {
      shouldUnlock = true;
    } else if (feature.unlockCondition.type === 'level' && currentLevel >= feature.unlockCondition.value) {
      shouldUnlock = true;
    } else if (feature.unlockCondition.type === 'day' && currentDay >= feature.unlockCondition.value) {
      shouldUnlock = true;
    }

    if (shouldUnlock) {
      state.unlockedFeatures.push(feature.id);
      state.pendingUnlocks.push(feature.id);
      newUnlocks.push(feature);
    }
  }

  state.lastCheckedLevel = currentLevel;
  state.lastCheckedDay = currentDay;
  saveState(state);

  return newUnlocks;
}

/**
 * 機能が解放済みかどうか
 */
export function isFeatureUnlocked(featureId: string): boolean {
  const state = getState();
  return state.unlockedFeatures.includes(featureId);
}

/**
 * 解放演出を表示済みにする
 */
export function markUnlockShown(featureId: string): void {
  const state = getState();
  state.pendingUnlocks = state.pendingUnlocks.filter(id => id !== featureId);
  saveState(state);
}

/**
 * 未表示の解放演出があるか
 */
export function getPendingUnlocks(): FeatureDefinition[] {
  const state = getState();
  return FEATURE_DEFINITIONS.filter(f => state.pendingUnlocks.includes(f.id));
}

/**
 * まだロック中の機能（ホームの「これから解放される機能」用）
 */
export function getLockedFeatures(): FeatureDefinition[] {
  const state = getState();
  return FEATURE_DEFINITIONS.filter(f =>
    !state.unlockedFeatures.includes(f.id) && f.unlockCondition.type !== 'always'
  );
}

/**
 * 次に解放される機能（予告用）
 */
export function getNextUnlock(currentLevel: number, currentDay: number): { feature: FeatureDefinition; remaining: string } | null {
  const locked = getLockedFeatures();
  if (locked.length === 0) return null;

  // 最も近い条件の機能を探す
  let closest: FeatureDefinition | null = null;
  let closestDistance = Infinity;

  for (const f of locked) {
    let distance: number;
    if (f.unlockCondition.type === 'level') {
      distance = f.unlockCondition.value - currentLevel;
    } else if (f.unlockCondition.type === 'day') {
      distance = f.unlockCondition.value - currentDay;
    } else {
      continue;
    }
    if (distance > 0 && distance < closestDistance) {
      closestDistance = distance;
      closest = f;
    }
  }

  if (!closest) return null;

  const remaining = closest.unlockCondition.type === 'level'
    ? `Lv.${closest.unlockCondition.value}で解放`
    : `${closest.unlockCondition.value}日目で解放`;

  return { feature: closest, remaining };
}

/**
 * a-PDCAサイクルのステップ定義
 */
export type CycleStep = 'create' | 'import' | 'diagnose' | 'plan' | 'study' | 'review';

export interface CycleStepInfo {
  id: CycleStep;
  label: string;
  labelEn: string;
  icon: string;
}

export const CYCLE_STEPS: CycleStepInfo[] = [
  { id: 'create', label: 'つくる', labelEn: 'Create', icon: '✏' },
  { id: 'import', label: '取り込む', labelEn: 'Import', icon: '⇩' },
  { id: 'diagnose', label: '診断', labelEn: 'Diagnose', icon: '🔍' },
  { id: 'plan', label: 'プラン', labelEn: 'Plan', icon: '📋' },
  { id: 'study', label: '学習', labelEn: 'Study', icon: '📖' },
  { id: 'review', label: '見直し', labelEn: 'Review', icon: '🔄' },
];

const CYCLE_STATE_KEY = 'cycleState';

export interface CycleState {
  currentStep: CycleStep;
  cycleCount: number; // 何周目
  completedSteps: CycleStep[];
}

export function getCycleState(): CycleState {
  try {
    const saved = localStorage.getItem(CYCLE_STATE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { currentStep: 'create', cycleCount: 1, completedSteps: [] };
}

export function advanceCycleStep(completedStep: CycleStep): CycleState {
  const state = getCycleState();
  if (!state.completedSteps.includes(completedStep)) {
    state.completedSteps.push(completedStep);
  }

  const stepIndex = CYCLE_STEPS.findIndex(s => s.id === completedStep);
  const nextIndex = (stepIndex + 1) % CYCLE_STEPS.length;

  if (nextIndex === 0) {
    // サイクル完了 → 2周目
    state.cycleCount++;
    state.completedSteps = [];
  }

  state.currentStep = CYCLE_STEPS[nextIndex].id;
  localStorage.setItem(CYCLE_STATE_KEY, JSON.stringify(state));
  return state;
}
