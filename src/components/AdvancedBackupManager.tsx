/**
 * AdvancedBackupManager - 拡張バックアップマネージャー
 *
 * Task#21: データエクスポート/インポート強化
 *
 * 機能:
 * - 全データの完全バックアップ
 * - 選択的インポート（データ種類ごと）
 * - データ検証とマイグレーション
 * - クラウドストレージ連携準備
 */

import { useState, useRef } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import toast from 'react-hot-toast';
import {
  downloadFullBackup,
  importData,
  validateImportData,
  DEFAULT_IMPORT_OPTIONS,
  type ImportOptions,
  type ImportResult,
  type ValidationResult,
} from '../services/exportImportService';
import { Download, Upload, CheckCircle, AlertCircle, Settings, FileJson, Database } from 'lucide-react';

interface AdvancedBackupManagerProps {
  onBack?: () => void;
}

export function AdvancedBackupManager({ onBack }: AdvancedBackupManagerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importOptions, setImportOptions] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 全データエクスポート
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadFullBackup();
      toast.success('バックアップをダウンロードしました');
    } catch (error) {
      console.error('[AdvancedBackupManager] エクスポートエラー:', error);
      toast.error('バックアップのダウンロードに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  // ファイル選択
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationResult(null);
    setImportResult(null);

    // ファイルを読み込んでバリデーション
    try {
      const fileContent = await file.text();
      const validation = validateImportData(fileContent);
      setValidationResult(validation);

      if (!validation.valid) {
        toast.error('バックアップファイルが不正です');
      } else if (validation.warnings.length > 0) {
        toast('警告があります', { icon: '⚠️' });
      } else {
        toast.success('バックアップファイルは正常です');
      }
    } catch (error) {
      console.error('[AdvancedBackupManager] ファイル読み込みエラー:', error);
      toast.error('ファイルの読み込みに失敗しました');
    }
  };

  // インポート実行
  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('ファイルを選択してください');
      return;
    }

    if (validationResult && !validationResult.valid) {
      toast.error('不正なバックアップファイルです');
      return;
    }

    // 確認ダイアログ
    if (!confirm('データをインポートしますか？既存のデータが変更される可能性があります。')) {
      return;
    }

    setIsImporting(true);
    try {
      const fileContent = await selectedFile.text();
      const result = await importData(fileContent, importOptions);
      setImportResult(result);

      if (result.success) {
        toast.success(`インポート完了: ${result.imported.problems}問題, ${result.imported.history}履歴`);
      } else {
        toast.error(`インポートに失敗しました: ${result.errors.length}個のエラー`);
      }
    } catch (error) {
      console.error('[AdvancedBackupManager] インポートエラー:', error);
      toast.error('インポート中にエラーが発生しました');
    } finally {
      setIsImporting(false);
    }
  };

  // インポートオプション変更
  const handleOptionChange = (key: keyof ImportOptions, value: boolean) => {
    setImportOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Database className="text-blue-600" size={32} />
              拡張バックアップマネージャー
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              全データの完全バックアップとインポート
            </p>
          </div>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              ← 戻る
            </Button>
          )}
        </div>

        {/* エクスポートセクション */}
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Download size={20} />
            完全バックアップのエクスポート
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            全ての学習データ（問題、履歴、目標、統計など）を1つのJSONファイルとしてエクスポートします。
          </p>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <FileJson size={16} />
            {isExporting ? 'エクスポート中...' : '完全バックアップをダウンロード'}
          </Button>
        </Card>

        {/* インポートセクション */}
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Upload size={20} />
            バックアップのインポート
          </h2>

          {/* ファイル選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              バックアップファイルを選択
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-900 dark:text-white
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900 dark:file:text-blue-300
                dark:hover:file:bg-blue-800"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                選択中: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* バリデーション結果 */}
          {validationResult && (
            <div className="mb-6">
              <div
                className={`p-4 rounded-lg border ${
                  validationResult.valid
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {validationResult.valid ? (
                    <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                  )}
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {validationResult.valid ? '検証成功' : '検証失敗'}
                  </h3>
                </div>

                {/* バージョン情報 */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  バージョン: {validationResult.version}
                </p>

                {/* データタイプ */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  データタイプ: {validationResult.dataTypes.join(', ')}
                </p>

                {/* エラー */}
                {validationResult.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
                      エラー:
                    </p>
                    <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                      {validationResult.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 警告 */}
                {validationResult.warnings.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                      警告:
                    </p>
                    <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400">
                      {validationResult.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* インポートオプション */}
          {validationResult?.valid && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Settings size={18} />
                インポートオプション
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={importOptions.includeProblems}
                    onChange={(e) => handleOptionChange('includeProblems', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">問題データ</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={importOptions.includeHistory}
                    onChange={(e) => handleOptionChange('includeHistory', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">学習履歴</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={importOptions.includeQuizSets}
                    onChange={(e) => handleOptionChange('includeQuizSets', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">問題集</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={importOptions.includeCards}
                    onChange={(e) => handleOptionChange('includeCards', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">復習カード</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={importOptions.includeSessions}
                    onChange={(e) => handleOptionChange('includeSessions', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">学習時間セッション</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={importOptions.includeGoals}
                    onChange={(e) => handleOptionChange('includeGoals', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">目標</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={importOptions.includeStats}
                    onChange={(e) => handleOptionChange('includeStats', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">統計データ</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={importOptions.overwriteExisting}
                    onChange={(e) => handleOptionChange('overwriteExisting', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">既存データを上書き</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={importOptions.validateData}
                    onChange={(e) => handleOptionChange('validateData', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">データ検証を実行</span>
                </label>
              </div>
            </div>
          )}

          {/* インポート実行ボタン */}
          <Button
            variant="success"
            onClick={handleImport}
            disabled={!selectedFile || !validationResult?.valid || isImporting}
            className="flex items-center gap-2"
          >
            <Upload size={16} />
            {isImporting ? 'インポート中...' : 'インポート実行'}
          </Button>
        </Card>

        {/* インポート結果 */}
        {importResult && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              インポート結果
            </h2>

            {/* ステータス */}
            <div
              className={`p-4 rounded-lg mb-4 ${
                importResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <p className="font-semibold text-gray-900 dark:text-white">
                {importResult.success ? '✅ 成功' : '❌ 失敗'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                所要時間: {(importResult.duration / 1000).toFixed(2)}秒
              </p>
            </div>

            {/* インポート統計 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">問題</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {importResult.imported.problems}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  スキップ: {importResult.skipped.problems}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">履歴</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importResult.imported.history}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  スキップ: {importResult.skipped.history}
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">問題集</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {importResult.imported.quizSets}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  スキップ: {importResult.skipped.quizSets}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">目標</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {importResult.imported.goals}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  スキップ: {importResult.skipped.goals}
                </p>
              </div>
            </div>

            {/* エラー */}
            {importResult.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">エラー:</h3>
                <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
                  {importResult.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 警告 */}
            {importResult.warnings.length > 0 && (
              <div>
                <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">警告:</h3>
                <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                  {importResult.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
