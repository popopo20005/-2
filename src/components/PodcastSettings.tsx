import { useState, useEffect } from 'react';
import { speechService, type SpeechSettings } from '../services/speechService';
import { GlassCard } from './ui/GlassCard';
import { NeumorphicButton } from './ui/NeumorphicButton';
import { Volume2, Gauge, Clock, X } from 'lucide-react';

interface PodcastSettingsProps {
  onClose: () => void;
}

export const PodcastSettings = ({ onClose }: PodcastSettingsProps) => {
  const [settings, setSettings] = useState<SpeechSettings>(speechService.getSettings());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    // 音声リストの取得
    const loadVoices = () => {
      const availableVoices = speechService.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();

    // 音声リストが非同期で読み込まれることがあるため、イベントリスナーを追加
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleSave = () => {
    speechService.updateSettings(settings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: SpeechSettings = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voice: null,
      autoNext: true,
      readSpeed: 'normal',
      questionInterval: 2000, // 2秒
    };
    setSettings(defaultSettings);
  };

  const handleSpeedPreset = (preset: 'slow' | 'normal' | 'fast') => {
    const rateMap = { slow: 0.75, normal: 1.0, fast: 1.5 };
    setSettings({ ...settings, readSpeed: preset, rate: rateMap[preset] });
  };

  const handleCustomSpeed = (rate: number) => {
    // カスタム速度の場合はreadSpeedをnullにしてプリセット上書きを防ぐ
    setSettings({ ...settings, rate, readSpeed: 'normal' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">🎙️ ポッドキャスト設定</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text-secondary hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Speed Presets */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              <Gauge size={18} className="text-primary" />
              速度プリセット
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['slow', 'normal', 'fast'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleSpeedPreset(preset)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    settings.readSpeed === preset
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-white/10 bg-surfaceHighlight text-text-secondary hover:border-primary/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {preset === 'slow' && '🐢 遅い'}
                      {preset === 'normal' && '🚶 普通'}
                      {preset === 'fast' && '🏃 速い'}
                    </div>
                    <div className="text-xs mt-1">
                      {preset === 'slow' && '×0.75'}
                      {preset === 'normal' && '×1.0'}
                      {preset === 'fast' && '×1.5'}
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => handleCustomSpeed(2.5)}
                className="p-3 rounded-xl border-2 transition-all border-white/10 bg-surfaceHighlight text-text-secondary hover:border-primary/50"
              >
                <div className="text-center">
                  <div className="text-lg font-bold">⚡ 超速</div>
                  <div className="text-xs mt-1">×2.5</div>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Speed */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              <Gauge size={18} className="text-primary" />
              読み上げ速度: {settings.rate.toFixed(2)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={settings.rate}
              onChange={(e) => handleCustomSpeed(parseFloat(e.target.value))}
              className="w-full h-2 bg-surfaceHighlight rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-text-secondary">
              <span>遅い (0.5x)</span>
              <span>超高速 (3.0x)</span>
            </div>
          </div>

          {/* Volume */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              <Volume2 size={18} className="text-primary" />
              音量: {Math.round(settings.volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(e) => setSettings({ ...settings, volume: parseFloat(e.target.value) })}
              className="w-full h-2 bg-surfaceHighlight rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>

          {/* Pitch */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              🎵 音の高さ: {settings.pitch.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.pitch}
              onChange={(e) => setSettings({ ...settings, pitch: parseFloat(e.target.value) })}
              className="w-full h-2 bg-surfaceHighlight rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-text-secondary">
              <span>低い (0.5)</span>
              <span>高い (2.0)</span>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              🎤 音声選択
            </label>
            <select
              value={settings.voice || ''}
              onChange={(e) => setSettings({ ...settings, voice: e.target.value || null })}
              className="w-full p-3 rounded-xl bg-surfaceHighlight border border-white/10 text-white
                focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="">デフォルト（自動選択）</option>
              {voices.map((voice, index) => (
                <option key={index} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
            <p className="text-xs text-text-secondary">
              💡 日本語音声が複数ある場合、好みの音声を選択できます
            </p>
          </div>

          {/* Question Interval */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-white">
              <Clock size={18} className="text-primary" />
              問題間の間隔: {(settings.questionInterval || 2000) / 1000}秒
            </label>
            <input
              type="range"
              min="0"
              max="10000"
              step="500"
              value={settings.questionInterval || 2000}
              onChange={(e) => setSettings({ ...settings, questionInterval: parseInt(e.target.value) })}
              className="w-full h-2 bg-surfaceHighlight rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-text-secondary">
              <span>なし (0秒)</span>
              <span>長い (10秒)</span>
            </div>
          </div>

          {/* Auto Next */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surfaceHighlight border border-white/10">
            <div>
              <p className="font-bold text-white">自動で次の問題へ</p>
              <p className="text-xs text-text-secondary mt-1">
                問題読み上げ完了後、自動的に次の問題に進みます
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoNext}
                onChange={(e) => setSettings({ ...settings, autoNext: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <NeumorphicButton variant="secondary" onClick={handleReset} className="flex-1">
              リセット
            </NeumorphicButton>
            <NeumorphicButton variant="primary" onClick={handleSave} className="flex-1">
              保存
            </NeumorphicButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
