import { useState } from 'react';
import { Modal } from './ui/Modal';
import { User, Save } from 'lucide-react';

interface UserNameSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onSave: (name: string) => void;
  language?: 'ja' | 'en';
}

/**
 * ユーザー名設定モーダル
 */
export function UserNameSettings({
  isOpen,
  onClose,
  currentName,
  onSave,
  language = 'ja',
}: UserNameSettingsProps) {
  const [name, setName] = useState(currentName);

  const content = {
    ja: {
      title: 'ユーザー名を設定',
      label: 'お名前',
      placeholder: '例: 田中太郎',
      helperText: 'ダッシュボードで表示される名前です',
      saveButton: '保存',
      cancelButton: 'キャンセル',
    },
    en: {
      title: 'Set Username',
      label: 'Your Name',
      placeholder: 'e.g. John Doe',
      helperText: 'This name will be displayed on your dashboard',
      saveButton: 'Save',
      cancelButton: 'Cancel',
    },
  };

  const t = content[language];

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.title} maxWidth="sm">
      <div className="space-y-4">
        {/* アイコン */}
        <div className="flex justify-center">
          <div className="size-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <User className="size-8 text-white" />
          </div>
        </div>

        {/* 入力フィールド */}
        <div className="space-y-2">
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t.label}
          </label>
          <input
            id="username"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t.placeholder}
            className="
              w-full px-4 py-3 rounded-lg
              border-2 border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-700
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:border-blue-500 dark:focus:border-blue-400
              focus:ring-4 focus:ring-blue-500/20
              transition-all duration-200
              outline-none
            "
            autoFocus
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t.helperText}
          </p>
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="
              flex-1 px-4 py-3 rounded-lg
              font-medium
              text-gray-700 dark:text-gray-300
              bg-gray-100 dark:bg-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-600
              transition-colors duration-200
            "
          >
            {t.cancelButton}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="
              flex-1 px-4 py-3 rounded-lg
              font-medium
              text-white
              bg-gradient-to-r from-blue-600 to-purple-600
              hover:from-blue-700 hover:to-purple-700
              disabled:from-gray-400 disabled:to-gray-400
              disabled:cursor-not-allowed
              transition-all duration-200
              flex items-center justify-center gap-2
            "
          >
            <Save className="size-4" />
            {t.saveButton}
          </button>
        </div>
      </div>
    </Modal>
  );
}
