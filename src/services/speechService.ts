/**
 * 読み上げサービス
 * Web Speech API + Media Session APIを使用してポッドキャスト機能を提供
 *
 * 修正済みバグ:
 * - isActivelySpeaking の二重目的使用 → cancelToken パターンに変更
 * - iOS リトライロジック修正
 * - Chrome speechSynthesis.pause() 15秒バグ対策
 * - voiceschanged イベント待機追加
 */

export type SpeechMode = 'podcast' | 'quiz';
export type SpeechState = 'idle' | 'speaking' | 'paused' | 'waiting-answer';

export interface SpeechSettings {
  rate: number; // 0.5 - 2.0
  pitch: number; // 0.0 - 2.0
  volume: number; // 0.0 - 1.0
  voice: string | null; // 音声の名前
  autoNext: boolean; // 自動的に次の問題へ
  readSpeed: 'slow' | 'normal' | 'fast';
  questionInterval?: number; // 問題間の間隔（ミリ秒）
}

export interface SpeechCallbacks {
  onQuestionStart?: (index: number) => void;
  onQuestionEnd?: (index: number) => void;
  onWaitingAnswer?: () => void;
  onComplete?: () => void;
  onStateChange?: (state: SpeechState) => void;
}

class SpeechService {
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private state: SpeechState = 'idle';
  private callbacks: SpeechCallbacks = {};
  private currentIndex: number = 0;
  private backgroundAudio: HTMLAudioElement | null = null;

  // キャンセルトークン: stop/forceStop時にインクリメント
  // speak系メソッド内で値が変わっていたらキャンセルとみなす
  private cancelToken: number = 0;

  // Chrome pause バグ対策: pause中にkeep-aliveタイマーを回す
  private pauseKeepAliveTimer: ReturnType<typeof setInterval> | null = null;
  // Voice list cache
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;

  private settings: SpeechSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voice: null,
    autoNext: true,
    readSpeed: 'normal',
    questionInterval: 2000, // 2秒
  };

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initMediaSession();
    this.initBackgroundAudio();
    this.initVoices();

    // iOSでページ遷移時に強制停止
    if (this.isIOS()) {
      window.addEventListener('beforeunload', () => {
        this.forceStop();
      });
      window.addEventListener('pagehide', () => {
        this.forceStop();
      });
    }
  }

  /**
   * 音声リストの初期化（voiceschanged対応）
   */
  private initVoices() {
    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        this.cachedVoices = voices.filter(v => v.lang.startsWith('ja'));
        this.voicesLoaded = true;
        console.log('[SpeechService] Voices loaded:', this.cachedVoices.length, 'Japanese voices');
      }
    };

    // 即座に試行
    loadVoices();

    // Chrome: voiceschanged イベントで再取得
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.addEventListener('voiceschanged', loadVoices);
    }

    // フォールバック: 500ms後に再試行
    if (!this.voicesLoaded) {
      setTimeout(loadVoices, 500);
    }
  }

  /**
   * バックグラウンドオーディオの初期化（iOS対策）
   */
  private initBackgroundAudio() {
    if (this.isIOS()) {
      // 無音のAudioを作成（バックグラウンド再生を維持）
      this.backgroundAudio = new Audio();
      this.backgroundAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.backgroundAudio.loop = true;
      this.backgroundAudio.volume = 0.01; // ほぼ無音

      // ユーザーインタラクション時に再生開始
      const startBackgroundAudio = () => {
        if (this.backgroundAudio && this.backgroundAudio.paused) {
          this.backgroundAudio.play().catch(err => {
            console.warn('Background audio play failed:', err);
          });
        }
      };

      // タッチイベントで起動
      document.addEventListener('touchstart', startBackgroundAudio, { once: true });
      document.addEventListener('click', startBackgroundAudio, { once: true });
    }
  }

  /**
   * Media Session APIの初期化（ロック画面コントロール対応）
   */
  private initMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        this.resume();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        this.stop();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.skipToNext();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.skipToPrevious();
      });
    }
  }

  /**
   * Media Sessionのメタデータを更新
   */
  private updateMediaSession(title: string, artist: string = 'Minguella Quiz') {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        album: 'クイズ学習',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ]
      });
    }
  }

  /**
   * 設定を取得
   */
  getSettings(): SpeechSettings {
    return { ...this.settings };
  }

  /**
   * 設定を更新
   */
  updateSettings(newSettings: Partial<SpeechSettings>) {
    this.settings = { ...this.settings, ...newSettings };

    // 速度プリセットを適用（rateが明示的に指定されていない場合のみ）
    if (newSettings.readSpeed && !newSettings.rate) {
      switch (newSettings.readSpeed) {
        case 'slow':
          this.settings.rate = 0.75;
          break;
        case 'normal':
          this.settings.rate = 1.0;
          break;
        case 'fast':
          this.settings.rate = 1.5;
          break;
      }
    }

    // 設定をlocalStorageに保存
    localStorage.setItem('speechSettings', JSON.stringify(this.settings));
  }

  /**
   * 設定を読み込み
   */
  loadSettings() {
    const saved = localStorage.getItem('speechSettings');
    if (saved) {
      try {
        this.settings = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load speech settings:', error);
      }
    }
  }

  /**
   * 利用可能な音声のリストを取得
   */
  getVoices(): SpeechSynthesisVoice[] {
    // キャッシュがあればそれを返す、なければ再取得
    if (this.cachedVoices.length > 0) {
      return this.cachedVoices;
    }
    const voices = this.synthesis.getVoices().filter(voice => voice.lang.startsWith('ja'));
    if (voices.length > 0) {
      this.cachedVoices = voices;
    }
    return voices;
  }

  /**
   * モードを設定（将来の拡張用に残す）
   */
  setMode(_mode: SpeechMode) {
    // 現在はモードによる動作の違いはない
  }

  /**
   * コールバックを設定
   */
  setCallbacks(callbacks: SpeechCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 状態を変更
   */
  private setState(state: SpeechState) {
    this.state = state;
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(state);
    }
  }

  /**
   * iOS判定
   */
  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  /**
   * キャンセルチェック: speak系メソッド内で使う
   * token が変わっていたら true（＝キャンセルされた）
   */
  private isCancelled(token: number): boolean {
    return this.cancelToken !== token;
  }

  /**
   * 強制停止（完全クリーンアップ）
   */
  private forceStop(): void {
    console.log('[SpeechService] Force stopping all speech');
    this.cancelToken++; // すべての進行中 speak を無効化
    this.synthesis.cancel();
    this.currentUtterance = null;
    this.setState('idle');
    this.clearPauseKeepAlive();

    if (this.backgroundAudio && !this.backgroundAudio.paused) {
      this.backgroundAudio.pause();
    }
  }

  /**
   * Chrome pause バグ対策: keep-alive タイマー
   * Chrome では speechSynthesis を ~15秒放置すると停止するため、
   * pause 中に定期的に resume/pause を呼ぶ
   */
  private startPauseKeepAlive() {
    this.clearPauseKeepAlive();
    if (this.isIOS()) return; // iOS では不要

    this.pauseKeepAliveTimer = setInterval(() => {
      if (this.synthesis.paused) {
        this.synthesis.resume();
        this.synthesis.pause();
      }
    }, 10000); // 10秒ごと
  }

  private clearPauseKeepAlive() {
    if (this.pauseKeepAliveTimer) {
      clearInterval(this.pauseKeepAliveTimer);
      this.pauseKeepAliveTimer = null;
    }
  }

  /**
   * 冒頭切れ対策: テキスト先頭に犠牲的バッファを追加
   *
   * Web Speech API (特に Microsoft TTS) では utterance 開始時に
   * audio output の初期化で最初の ~100-150ms が切れる。
   * 同一 utterance 内に句点バッファを埋め込むことで、
   * 切れる部分を無音区間にし、本文を保護する。
   */
  private padTextForClipping(text: string): string {
    // 先頭に句点を追加（~200ms の無音バッファを生成）
    // 句点は TTS エンジンが短い無音として処理する
    return `。${text}`;
  }

  /**
   * テキストを読み上げ（iOS対応版）
   * cancelToken を受け取り、キャンセル検知に使う
   */
  private speak(text: string, token: number): Promise<void> {
    if (!text || text.trim() === '') return Promise.resolve();
    if (this.isCancelled(token)) return Promise.resolve();

    return new Promise((resolve) => {
      // iOS対策：既存のutteranceをキャンセルして遅延
      if (this.isIOS()) {
        this.synthesis.cancel();
        setTimeout(() => {
          if (this.isCancelled(token)) {
            resolve();
            return;
          }
          this.speakWithRetry(this.padTextForClipping(text), token, resolve, 0);
        }, 150);
      } else {
        this.speakWithRetry(this.padTextForClipping(text), token, resolve, 0);
      }
    });
  }

  /**
   * 読み上げ実行（リトライ機能付き）
   */
  private speakWithRetry(
    text: string,
    token: number,
    resolve: (value: void | PromiseLike<void>) => void,
    retryCount: number
  ) {
    // キャンセルチェック
    if (this.isCancelled(token)) {
      console.log('[SpeechService] Speech canceled before start');
      resolve();
      return;
    }

    // iOS対策：長文分割（200文字以上）
    if (this.isIOS() && text.length > 200) {
      this.speakLongTextIOS(text, token).then(resolve);
      return;
    }

    // 日本語音声を取得
    const voices = this.getVoices();
    const selectedVoice = this.settings.voice
      ? voices.find(v => v.name === this.settings.voice) || voices[0] || null
      : voices[0] || null;

    // 本文の utterance を作成
    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = this.settings.rate;
    this.currentUtterance.pitch = this.settings.pitch;
    this.currentUtterance.volume = this.settings.volume;
    if (selectedVoice) this.currentUtterance.voice = selectedVoice;

    let hasEnded = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    this.currentUtterance.onend = () => {
      if (hasEnded) return;
      hasEnded = true;
      if (timeoutId) clearTimeout(timeoutId);
      console.log('[SpeechService] Speech ended normally');
      resolve();
    };

    this.currentUtterance.onerror = (event) => {
      if (hasEnded) return;
      console.error('[SpeechService] Speech error:', event.error, 'Retry count:', retryCount);

      // canceled エラーは正常なキャンセル
      if (event.error === 'canceled') {
        hasEnded = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve();
        return;
      }

      // iOS対策：エラー時に1回だけリトライ
      if (this.isIOS() && retryCount < 1 && !this.isCancelled(token)) {
        console.log('[SpeechService] Retrying speech on iOS...');
        hasEnded = true;
        if (timeoutId) clearTimeout(timeoutId);
        setTimeout(() => {
          this.speakWithRetry(text, token, resolve, retryCount + 1);
        }, 300);
      } else {
        hasEnded = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve(); // エラーでも次に進む
      }
    };

    // iOS対策：タイムアウト（15秒で強制終了）
    if (this.isIOS()) {
      timeoutId = setTimeout(() => {
        if (!hasEnded) {
          console.warn('[SpeechService] Speech timeout on iOS, forcing end');
          hasEnded = true;
          this.synthesis.cancel();
          resolve();
        }
      }, 15000);
    }

    this.synthesis.speak(this.currentUtterance);
  }

  /**
   * iOS向け：長文を分割して読み上げ
   */
  private async speakLongTextIOS(text: string, token: number): Promise<void> {
    const chunks = this.splitText(text, 200);

    for (let i = 0; i < chunks.length; i++) {
      if (this.isCancelled(token)) return;
      await new Promise<void>((resolve) => {
        this.speakWithRetry(chunks[i], token, resolve, 0);
      });
      // チャンク間に小さな遅延
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * テキストを指定文字数で分割
   */
  private splitText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    // 句読点で分割を試みる
    const sentences = text.split(/([。、！？\n])/);

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxLength) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * 安全な待機: キャンセルされたら即座に抜ける
   */
  private waitWithCancel(ms: number, token: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isCancelled(token)) {
        resolve(false);
        return;
      }
      const timer = setTimeout(() => resolve(true), ms);
      // チェック間隔を設ける（長い待機時のレスポンス改善）
      const checker = setInterval(() => {
        if (this.isCancelled(token)) {
          clearTimeout(timer);
          clearInterval(checker);
          resolve(false);
        }
      }, 100);
      // タイマー完了時にcheckerもクリア
      setTimeout(() => clearInterval(checker), ms + 10);
    });
  }

  /**
   * ポッドキャストモード：問題を自動的に読み上げ
   */
  async speakProblemPodcast(
    question: string,
    options: string[],
    correctAnswer: number,
    explanation: string,
    category: string
  ): Promise<void> {
    console.log('[SpeechService] Starting podcast for problem');

    // 既存の読み上げを完全停止し、新しいトークンを取得
    this.forceStop();
    await new Promise(resolve => setTimeout(resolve, 200));

    const token = this.cancelToken; // このセッションのトークン
    this.setState('speaking');
    this.updateMediaSession(`${category}`, 'ポッドキャストモード');

    try {
      // 問題文
      await this.speak(`問題です。${question}`, token);
      if (this.isCancelled(token)) return;

      // 選択肢
      if (options.length > 0) {
        await this.speak('選択肢は次の通りです。', token);
        if (this.isCancelled(token)) return;

        for (let i = 0; i < options.length; i++) {
          if (this.isCancelled(token)) return;
          if (options[i]) {
            await this.speak(`${i + 1}番、${options[i]}`, token);
          }
        }
      }

      if (this.isCancelled(token)) return;

      // 少し間を置く
      if (!await this.waitWithCancel(800, token)) return;

      // 正解発表
      await this.speak(`正解は、${correctAnswer + 1}番、${options[correctAnswer]}です。`, token);
      if (this.isCancelled(token)) return;

      // 解説
      if (explanation) {
        await this.speak(`解説です。${explanation}`, token);
        if (this.isCancelled(token)) return;
      }

      this.setState('idle');

      // 問題間の間隔を待つ
      if (this.settings.questionInterval && this.settings.questionInterval > 0) {
        if (!await this.waitWithCancel(this.settings.questionInterval, token)) return;
      }

      // 自動的に次へ
      if (!this.isCancelled(token) && this.settings.autoNext && this.callbacks.onQuestionEnd) {
        this.callbacks.onQuestionEnd(this.currentIndex);
      }

    } catch (error) {
      console.error('[SpeechService] Speech error:', error);
      this.forceStop();
    }
  }

  /**
   * クイズモード：ユーザーの解答を待つ
   */
  async speakProblemQuiz(
    question: string,
    options: string[],
    category: string
  ): Promise<void> {
    this.forceStop();
    await new Promise(resolve => setTimeout(resolve, 100));

    const token = this.cancelToken;
    this.setState('speaking');
    this.updateMediaSession(`${category}`, 'クイズモード');

    try {
      // 問題文
      await this.speak(`問題です。${question}`, token);
      if (this.isCancelled(token)) return;

      // 選択肢
      if (options.length > 0) {
        await this.speak('選択肢は次の通りです。', token);
        if (this.isCancelled(token)) return;

        for (let i = 0; i < options.length; i++) {
          if (this.isCancelled(token)) return;
          if (options[i]) {
            await this.speak(`${i + 1}番、${options[i]}`, token);
          }
        }
      }

      if (this.isCancelled(token)) return;

      // ユーザーの解答を待つ
      this.setState('waiting-answer');
      if (this.callbacks.onWaitingAnswer) {
        this.callbacks.onWaitingAnswer();
      }

    } catch (error) {
      console.error('Speech error:', error);
      this.setState('idle');
    }
  }

  /**
   * クイズモード：解答後のフィードバック
   */
  async speakAnswerFeedback(
    isCorrect: boolean,
    correctAnswer: number,
    options: string[],
    explanation: string
  ): Promise<void> {
    this.forceStop();
    await new Promise(resolve => setTimeout(resolve, 100));

    const token = this.cancelToken;
    this.setState('speaking');

    try {
      if (isCorrect) {
        await this.speak('正解です！', token);
      } else {
        await this.speak(`不正解です。正解は、${correctAnswer + 1}番、${options[correctAnswer]}です。`, token);
      }

      if (this.isCancelled(token)) return;

      // 解説
      if (explanation) {
        await this.speak(`解説です。${explanation}`, token);
      }

      if (this.isCancelled(token)) return;

      this.setState('idle');

      // 次へ進む準備完了
      if (this.callbacks.onQuestionEnd) {
        this.callbacks.onQuestionEnd(this.currentIndex);
      }

    } catch (error) {
      console.error('Speech error:', error);
      this.setState('idle');
    }
  }

  /**
   * ○×問題用の読み上げ（ポッドキャストモード）
   */
  async speakTrueFalsePodcast(
    question: string,
    answer: boolean,
    explanation: string,
    category: string
  ): Promise<void> {
    console.log('[SpeechService] Starting podcast for true/false problem');

    this.forceStop();
    await new Promise(resolve => setTimeout(resolve, 200));

    const token = this.cancelToken;
    this.setState('speaking');
    this.updateMediaSession(`${category}`, 'ポッドキャストモード');

    try {
      await this.speak(`問題です。${question}。正しいか誤りか。`, token);
      if (this.isCancelled(token)) return;

      // 少し間を置く
      if (!await this.waitWithCancel(800, token)) return;

      await this.speak(`正解は、${answer ? '正しい' : '誤り'}、です。`, token);
      if (this.isCancelled(token)) return;

      if (explanation) {
        await this.speak(`解説です。${explanation}`, token);
        if (this.isCancelled(token)) return;
      }

      this.setState('idle');

      // 問題間の間隔を待つ
      if (this.settings.questionInterval && this.settings.questionInterval > 0) {
        if (!await this.waitWithCancel(this.settings.questionInterval, token)) return;
      }

      if (!this.isCancelled(token) && this.settings.autoNext && this.callbacks.onQuestionEnd) {
        this.callbacks.onQuestionEnd(this.currentIndex);
      }

    } catch (error) {
      console.error('[SpeechService] Speech error:', error);
      this.forceStop();
    }
  }

  /**
   * ○×問題用の読み上げ（クイズモード）
   */
  async speakTrueFalseQuiz(
    question: string,
    category: string
  ): Promise<void> {
    this.forceStop();
    await new Promise(resolve => setTimeout(resolve, 100));

    const token = this.cancelToken;
    this.setState('speaking');
    this.updateMediaSession(`${category}`, 'クイズモード');

    try {
      await this.speak(`問題です。${question}。正しいか誤りか。`, token);
      if (this.isCancelled(token)) return;

      this.setState('waiting-answer');
      if (this.callbacks.onWaitingAnswer) {
        this.callbacks.onWaitingAnswer();
      }

    } catch (error) {
      console.error('Speech error:', error);
      this.setState('idle');
    }
  }

  /**
   * ○×問題の解答フィードバック
   */
  async speakTrueFalseFeedback(
    isCorrect: boolean,
    correctAnswer: boolean,
    explanation: string
  ): Promise<void> {
    this.forceStop();
    await new Promise(resolve => setTimeout(resolve, 100));

    const token = this.cancelToken;
    this.setState('speaking');

    try {
      if (isCorrect) {
        await this.speak('正解です！', token);
      } else {
        await this.speak(`不正解です。正解は、${correctAnswer ? '正しい' : '誤り'}、です。`, token);
      }

      if (this.isCancelled(token)) return;

      if (explanation) {
        await this.speak(`解説です。${explanation}`, token);
      }

      if (this.isCancelled(token)) return;

      this.setState('idle');

      if (this.callbacks.onQuestionEnd) {
        this.callbacks.onQuestionEnd(this.currentIndex);
      }

    } catch (error) {
      console.error('Speech error:', error);
      this.setState('idle');
    }
  }

  /**
   * 一時停止
   */
  pause() {
    if (this.synthesis.speaking) {
      if (this.isIOS()) {
        // iOS: pause() が不安定なので cancel() を使用
        this.synthesis.cancel();
        console.log('iOS: Using cancel() instead of pause()');
      } else {
        this.synthesis.pause();
        // Chrome pause バグ対策: keep-alive 開始
        this.startPauseKeepAlive();
      }
      this.setState('paused');
    }
  }

  /**
   * 再開
   */
  resume() {
    if (this.isIOS()) {
      console.log('iOS: Resume not fully supported, use stop and restart');
      this.setState('idle');
      return;
    }

    this.clearPauseKeepAlive();

    if (this.synthesis.paused) {
      this.synthesis.resume();
      this.setState('speaking');
    }
  }

  /**
   * 停止
   */
  stop() {
    console.log('[SpeechService] Stopping speech');
    this.forceStop();
  }

  /**
   * 次へスキップ
   */
  skipToNext() {
    this.stop();
    if (this.callbacks.onQuestionEnd) {
      this.callbacks.onQuestionEnd(this.currentIndex);
    }
  }

  /**
   * 前へ戻る
   */
  skipToPrevious() {
    this.stop();
    // 前の問題に戻るロジックは呼び出し側で実装
  }

  /**
   * 現在の状態を取得
   */
  getState(): SpeechState {
    return this.state;
  }

  /**
   * 読み上げ中かどうか
   */
  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  /**
   * 一時停止中かどうか
   */
  isPaused(): boolean {
    return this.synthesis.paused;
  }
}

// シングルトンインスタンスをエクスポート
export const speechService = new SpeechService();
