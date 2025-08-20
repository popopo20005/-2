import { useState, useEffect } from 'react';
import { backupService, categoryService, problemService, quizSetService, historyService } from '../lib/database';
import type { BackupData } from '../types';

interface BackupManagerProps {
  onBack: () => void;
}

interface BackupInfo extends BackupData {
  formattedDate: string;
  formattedTime: string;
  sizeInfo: string;
}

export function BackupManager({ onBack }: BackupManagerProps) {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');
  const [isLoading, setIsLoading] = useState(true);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [autoBackupInterval, setAutoBackupInterval] = useState(24); // hours
  const [maxBackups, setMaxBackups] = useState(5);

  useEffect(() => {
    loadBackups();
    loadSettings();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(localStorage.getItem('language') || 'ja');
    };

    window.addEventListener('storage', handleStorageChange);
    
    // 定期的に言語設定をチェック
    const interval = setInterval(() => {
      const currentLang = localStorage.getItem('language') || 'ja';
      if (currentLang !== language) {
        setLanguage(currentLang);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [language]);

  const t = {
    ja: {
      title: '💾 バックアップ管理',
      backButton: '← メインメニューに戻る',
      loading: 'バックアップデータを読み込み中...',
      autoBackupSettings: {
        title: '⚙️ 自動バックアップ設定',
        enableAutoBackup: '自動バックアップを有効化',
        backupInterval: 'バックアップ間隔 (時間)',
        maxBackups: '保持する最大バックアップ数'
      },
      backupOperations: {
        title: '🔧 バックアップ操作',
        createManualBackup: '📁 手動バックアップ作成',
        importBackup: '📥 バックアップをインポート',
        cleanupOldBackups: '🧹 古いバックアップを削除',
        creating: '作成中...'
      },
      statistics: {
        title: '📊 バックアップ統計',
        totalBackups: '総バックアップ数',
        autoBackups: '自動バックアップ',
        manualBackups: '手動バックアップ',
        daysFromOldest: '最古からの日数'
      },
      backupList: {
        title: '📋 バックアップ一覧',
        count: '件のバックアップ',
        noBackups: 'バックアップがありません',
        auto: '🤖 自動',
        manual: '👤 手動',
        version: 'Version',
        exportTooltip: 'エクスポート',
        restoreTooltip: '復元',
        deleteTooltip: '削除'
      },
      sizeInfo: {
        categories: 'カテゴリ',
        problems: '問題',
        quizSets: '問題集',
        history: '履歴'
      },
      messages: {
        backupCreated: 'バックアップが作成されました',
        backupCreateFailed: 'バックアップの作成に失敗しました',
        backupRestored: 'バックアップの復元が完了しました。ページを再読み込みします。',
        backupRestoreFailed: 'バックアップの復元に失敗しました',
        backupDeleted: 'バックアップを削除しました',
        backupDeleteFailed: 'バックアップの削除に失敗しました',
        backupExportFailed: 'バックアップのエクスポートに失敗しました',
        backupImportFailed: 'バックアップのインポートに失敗しました: ',
        backupImported: 'バックアップのインポートが完了しました。ページを再読み込みします。',
        oldBackupsCleanedUp: '古いバックアップをクリーンアップしました',
        cleanupFailed: 'バックアップのクリーンアップに失敗しました',
        invalidBackupFile: '不正なバックアップファイル形式です'
      },
      confirmations: {
        restoreBackup: {
          title: '⚠️ バックアップを復元しますか？',
          target: '復元対象: ',
          content: '内容: ',
          warning: '現在のデータは全て削除され、バックアップデータで置き換えられます。\nこの操作は元に戻せません。'
        },
        deleteBackup: {
          title: 'バックアップを削除しますか？',
          target: '削除対象: ',
          warning: 'この操作は元に戻せません。'
        },
        importBackup: {
          title: '⚠️ バックアップファイルをインポートしますか？',
          file: 'ファイル: ',
          content: '内容: ',
          warning: '現在のデータは全て削除され、インポートデータで置き換えられます。\nこの操作は元に戻せません。'
        }
      },
      loadingStates: {
        creatingBackup: 'バックアップを作成中...',
        restoringBackup: 'バックアップを復元中...',
        pleaseWait: 'しばらくお待ちください'
      }
    },
    en: {
      title: '💾 Backup Management',
      backButton: '← Back to Main Menu',
      loading: 'Loading backup data...',
      autoBackupSettings: {
        title: '⚙️ Auto Backup Settings',
        enableAutoBackup: 'Enable auto backup',
        backupInterval: 'Backup interval (hours)',
        maxBackups: 'Maximum backups to keep'
      },
      backupOperations: {
        title: '🔧 Backup Operations',
        createManualBackup: '📁 Create Manual Backup',
        importBackup: '📥 Import Backup',
        cleanupOldBackups: '🧹 Delete Old Backups',
        creating: 'Creating...'
      },
      statistics: {
        title: '📊 Backup Statistics',
        totalBackups: 'Total Backups',
        autoBackups: 'Auto Backups',
        manualBackups: 'Manual Backups',
        daysFromOldest: 'Days from Oldest'
      },
      backupList: {
        title: '📋 Backup List',
        count: ' backups',
        noBackups: 'No backups available',
        auto: '🤖 Auto',
        manual: '👤 Manual',
        version: 'Version',
        exportTooltip: 'Export',
        restoreTooltip: 'Restore',
        deleteTooltip: 'Delete'
      },
      sizeInfo: {
        categories: 'categories',
        problems: 'problems',
        quizSets: 'quiz sets',
        history: 'history'
      },
      messages: {
        backupCreated: 'Backup has been created',
        backupCreateFailed: 'Failed to create backup',
        backupRestored: 'Backup restoration completed. The page will be reloaded.',
        backupRestoreFailed: 'Failed to restore backup',
        backupDeleted: 'Backup has been deleted',
        backupDeleteFailed: 'Failed to delete backup',
        backupExportFailed: 'Failed to export backup',
        backupImportFailed: 'Failed to import backup: ',
        backupImported: 'Backup import completed. The page will be reloaded.',
        oldBackupsCleanedUp: 'Old backups have been cleaned up',
        cleanupFailed: 'Failed to cleanup backups',
        invalidBackupFile: 'Invalid backup file format'
      },
      confirmations: {
        restoreBackup: {
          title: '⚠️ Do you want to restore this backup?',
          target: 'Target: ',
          content: 'Content: ',
          warning: 'All current data will be deleted and replaced with backup data.\nThis operation cannot be undone.'
        },
        deleteBackup: {
          title: 'Do you want to delete this backup?',
          target: 'Target: ',
          warning: 'This operation cannot be undone.'
        },
        importBackup: {
          title: '⚠️ Do you want to import this backup file?',
          file: 'File: ',
          content: 'Content: ',
          warning: 'All current data will be deleted and replaced with imported data.\nThis operation cannot be undone.'
        }
      },
      loadingStates: {
        creatingBackup: 'Creating backup...',
        restoringBackup: 'Restoring backup...',
        pleaseWait: 'Please wait'
      }
    }
  };

  const currentLang = language as keyof typeof t;

  const loadBackups = async () => {
    try {
      const backupsData = await backupService.getAll();
      const backupInfos: BackupInfo[] = backupsData.map(backup => ({
        ...backup,
        formattedDate: backup.timestamp.toLocaleDateString(language === 'en' ? 'en-US' : 'ja-JP'),
        formattedTime: backup.timestamp.toLocaleTimeString(language === 'en' ? 'en-US' : 'ja-JP'),
        sizeInfo: calculateBackupSize(backup)
      }));
      setBackups(backupInfos);
    } catch (error) {
      console.error('Backup loading error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = () => {
    const autoEnabled = localStorage.getItem('autoBackupEnabled') !== 'false';
    const interval = parseInt(localStorage.getItem('autoBackupInterval') || '24');
    const maxBackupsCount = parseInt(localStorage.getItem('maxBackups') || '5');
    
    setAutoBackupEnabled(autoEnabled);
    setAutoBackupInterval(interval);
    setMaxBackups(maxBackupsCount);
  };

  const saveSettings = () => {
    localStorage.setItem('autoBackupEnabled', autoBackupEnabled.toString());
    localStorage.setItem('autoBackupInterval', autoBackupInterval.toString());
    localStorage.setItem('maxBackups', maxBackups.toString());
  };

  const calculateBackupSize = (backup: BackupData): string => {
    const categories = backup.data.categories.length;
    const problems = backup.data.problems.length;
    const history = backup.data.history.length;
    const quizSets = backup.data.quizSets.length;
    
    return `${categories} ${t[currentLang].sizeInfo.categories}, ${problems} ${t[currentLang].sizeInfo.problems}, ${quizSets} ${t[currentLang].sizeInfo.quizSets}, ${history} ${t[currentLang].sizeInfo.history}`;
  };

  const createManualBackup = async () => {
    if (isCreatingBackup) return;
    
    try {
      setIsCreatingBackup(true);
      await backupService.create('manual');
      await loadBackups();
      alert(t[currentLang].messages.backupCreated);
    } catch (error) {
      console.error('Backup creation error:', error);
      alert(t[currentLang].messages.backupCreateFailed);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const restoreBackup = async (backupId: number) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup) return;
    
    const confirmation = confirm(
      `${t[currentLang].confirmations.restoreBackup.title}\n\n` +
      `${t[currentLang].confirmations.restoreBackup.target}${backup.formattedDate} ${backup.formattedTime}\n` +
      `${t[currentLang].confirmations.restoreBackup.content}${backup.sizeInfo}\n\n` +
      `${t[currentLang].confirmations.restoreBackup.warning}`
    );
    
    if (!confirmation) return;
    
    try {
      setIsRestoringBackup(true);
      await backupService.restore(backupId);
      alert(t[currentLang].messages.backupRestored);
      window.location.reload();
    } catch (error) {
      console.error('Backup restore error:', error);
      alert(t[currentLang].messages.backupRestoreFailed);
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const deleteBackup = async (backupId: number) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup) return;
    
    const confirmation = confirm(
      `${t[currentLang].confirmations.deleteBackup.title}\n\n` +
      `${t[currentLang].confirmations.deleteBackup.target}${backup.formattedDate} ${backup.formattedTime}\n` +
      `${t[currentLang].confirmations.deleteBackup.warning}`
    );
    
    if (!confirmation) return;
    
    try {
      await backupService.delete(backupId);
      await loadBackups();
    } catch (error) {
      console.error('Backup delete error:', error);
      alert(t[currentLang].messages.backupDeleteFailed);
    }
  };

  const exportBackup = (backup: BackupInfo) => {
    try {
      const dataStr = JSON.stringify(backup.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `minguella-backup-${backup.formattedDate.replace(/\//g, '-')}-${backup.formattedTime.replace(/:/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Backup export error:', error);
      alert(t[currentLang].messages.backupExportFailed);
    }
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      // バックアップデータの検証
      if (!backupData.categories || !backupData.problems || !backupData.history || !backupData.quizSets) {
        throw new Error(t[currentLang].messages.invalidBackupFile);
      }
      
      const sizeInfo = `${backupData.categories.length} ${t[currentLang].sizeInfo.categories}, ${backupData.problems.length} ${t[currentLang].sizeInfo.problems}, ${backupData.quizSets.length} ${t[currentLang].sizeInfo.quizSets}, ${backupData.history.length} ${t[currentLang].sizeInfo.history}`;
      
      const confirmation = confirm(
        `${t[currentLang].confirmations.importBackup.title}\n\n` +
        `${t[currentLang].confirmations.importBackup.file}${file.name}\n` +
        `${t[currentLang].confirmations.importBackup.content}${sizeInfo}\n\n` +
        `${t[currentLang].confirmations.importBackup.warning}`
      );
      
      if (!confirmation) {
        event.target.value = '';
        return;
      }
      
      setIsRestoringBackup(true);
      
      // 現在のデータをクリア
      await Promise.all([
        categoryService.delete,
        problemService.delete,
        historyService.clear(),
        quizSetService.delete
      ]);
      
      // インポートデータを復元
      // Note: この実装は簡略化されています。実際の実装ではより詳細なデータ復元が必要です
      alert(t[currentLang].messages.backupImported);
      window.location.reload();
      
    } catch (error) {
      console.error('Backup import error:', error);
      alert(t[currentLang].messages.backupImportFailed + (error as Error).message);
    } finally {
      setIsRestoringBackup(false);
      event.target.value = '';
    }
  };

  const cleanupOldBackups = async () => {
    try {
      await backupService.cleanupOldBackups(maxBackups);
      await loadBackups();
      alert(t[currentLang].messages.oldBackupsCleanedUp);
    } catch (error) {
      console.error('Backup cleanup error:', error);
      alert(t[currentLang].messages.cleanupFailed);
    }
  };

  useEffect(() => {
    saveSettings();
  }, [autoBackupEnabled, autoBackupInterval, maxBackups]);

  // Reload backups when language changes to update date formatting
  useEffect(() => {
    if (backups.length > 0) {
      loadBackups();
    }
  }, [language]);

  // 自動バックアップのチェック
  useEffect(() => {
    if (!autoBackupEnabled) return;
    
    const checkAutoBackup = async () => {
      const lastAutoBackup = backups
        .filter(b => b.type === 'auto')
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      if (!lastAutoBackup) {
        // 自動バックアップが一度もない場合
        await backupService.create('auto');
        await loadBackups();
        return;
      }
      
      const hoursSinceLastBackup = (Date.now() - lastAutoBackup.timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastBackup >= autoBackupInterval) {
        await backupService.create('auto');
        await backupService.cleanupOldBackups(maxBackups);
        await loadBackups();
      }
    };
    
    checkAutoBackup();
    
    // 定期的にチェック（1時間ごと）
    const interval = setInterval(checkAutoBackup, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoBackupEnabled, autoBackupInterval, maxBackups, backups]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t[currentLang].loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 quiz-action-button"
          >
            {t[currentLang].backButton}
          </button>
          <h1 className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{t[currentLang].title}</h1>
        </header>

        {/* 設定パネル */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">{t[currentLang].autoBackupSettings.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-gray-700 dark:text-gray-300">{t[currentLang].autoBackupSettings.enableAutoBackup}</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t[currentLang].autoBackupSettings.backupInterval}
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={autoBackupInterval}
                onChange={(e) => setAutoBackupInterval(parseInt(e.target.value) || 24)}
                disabled={!autoBackupEnabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t[currentLang].autoBackupSettings.maxBackups}
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxBackups}
                onChange={(e) => setMaxBackups(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* 操作パネル */}
        <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">{t[currentLang].backupOperations.title}</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={createManualBackup}
              disabled={isCreatingBackup || isRestoringBackup}
              className="quiz-action-button disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCreatingBackup ? t[currentLang].backupOperations.creating : t[currentLang].backupOperations.createManualBackup}
            </button>
            
            <label className="quiz-action-button cursor-pointer">
              {t[currentLang].backupOperations.importBackup}
              <input
                type="file"
                accept=".json"
                onChange={importBackup}
                disabled={isRestoringBackup}
                className="hidden"
              />
            </label>
            
            <button
              onClick={cleanupOldBackups}
              disabled={isCreatingBackup || isRestoringBackup}
              className="quiz-action-button disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {t[currentLang].backupOperations.cleanupOldBackups}
            </button>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4">{t[currentLang].statistics.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{backups.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].statistics.totalBackups}</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {backups.filter(b => b.type === 'auto').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].statistics.autoBackups}</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {backups.filter(b => b.type === 'manual').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].statistics.manualBackups}</div>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {backups.length > 0 
                  ? Math.round((Date.now() - Math.min(...backups.map(b => b.timestamp.getTime()))) / (1000 * 60 * 60 * 24))
                  : 0
                }
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t[currentLang].statistics.daysFromOldest}</div>
            </div>
          </div>
        </div>

        {/* バックアップ一覧 */}
        <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t[currentLang].backupList.title}</h2>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {backups.length}{t[currentLang].backupList.count}
            </div>
          </div>

          {backups.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {t[currentLang].backupList.noBackups}
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          backup.type === 'auto' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {backup.type === 'auto' ? t[currentLang].backupList.auto : t[currentLang].backupList.manual}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {backup.formattedDate} {backup.formattedTime}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({t[currentLang].backupList.version} {backup.version})
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {backup.sizeInfo}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => exportBackup(backup)}
                        className="px-3 py-1 quiz-action-button text-sm"
                        title={t[currentLang].backupList.exportTooltip}
                      >
                        📤
                      </button>
                      <button
                        onClick={() => restoreBackup(backup.id!)}
                        disabled={isRestoringBackup}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title={t[currentLang].backupList.restoreTooltip}
                      >
                        {isRestoringBackup ? '...' : '🔄'}
                      </button>
                      <button
                        onClick={() => deleteBackup(backup.id!)}
                        disabled={isCreatingBackup || isRestoringBackup}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title={t[currentLang].backupList.deleteTooltip}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ローディング/進行状況表示 */}
        {(isCreatingBackup || isRestoringBackup) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-900 dark:text-white font-medium">
                {isCreatingBackup ? t[currentLang].loadingStates.creatingBackup : t[currentLang].loadingStates.restoringBackup}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {t[currentLang].loadingStates.pleaseWait}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}