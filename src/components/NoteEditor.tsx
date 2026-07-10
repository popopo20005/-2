// src/components/NoteEditor.tsx
import { useState, useEffect } from 'react';
import { MarkdownPreview } from './MarkdownPreview';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Edit, Eye, Save, Info, Tag, X, FileText } from 'lucide-react';
import * as noteService from '../services/noteService';
import { templateService } from '../services/templateService';
import { db } from '../lib/database';
import type { NoteTemplate } from '../types';

export interface NoteEditorProps {
  problemId: number;
  initialNote: string;
  initialTags?: string[];
  onSave: (note: string, tags: string[]) => Promise<void>;
  className?: string;
}

type TabMode = 'edit' | 'preview';

/**
 * 学習メモエディタコンポーネント
 * Markdown対応のタブ切替式エディタ
 */
export function NoteEditor({
  problemId,
  initialNote,
  initialTags = [],
  onSave,
  className = ''
}: NoteEditorProps) {
  const [note, setNote] = useState(initialNote);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  const [tab, setTab] = useState<TabMode>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);

  // デフォルトテンプレートの初期化とテンプレート読み込み
  useEffect(() => {
    const initTemplates = async () => {
      // デフォルトテンプレートを初期化（初回のみ）
      await templateService.initializeDefaults();

      // すべてのテンプレートを読み込み
      const allTemplates = await templateService.getAll();
      setTemplates(allTemplates);
    };

    initTemplates();
  }, []);

  // 既存のメモとタグを読み込み
  useEffect(() => {
    const loadNote = async () => {
      const problem = await db.problems.get(problemId);
      if (problem) {
        setNote(problem.userNotes || '');
        setTags(problem.noteTags || []);
      }
    };
    loadNote();
  }, [problemId]);

  // テンプレートメニューの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showTemplateMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('.template-menu-container')) {
          setShowTemplateMenu(false);
        }
      }
    };

    if (showTemplateMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showTemplateMenu]);

  const hasChanges = note !== initialNote || JSON.stringify(tags) !== JSON.stringify(initialTags);

  const handleSave = async () => {
    if (!hasChanges) {
      toast('変更がありません', {
        icon: 'ℹ️',
        position: 'top-center',
        duration: 2000
      });
      return;
    }

    setIsSaving(true);
    try {
      // noteServiceで保存
      await noteService.saveNote(problemId, note, tags);

      // 親コンポーネントのコールバックも呼び出し
      await onSave(note, tags);

      toast.success('メモを保存しました', {
        position: 'top-center',
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error('メモの保存に失敗しました', {
        position: 'top-center',
        duration: 2000
      });
    } finally {
      setIsSaving(false);
    }
  };

  // タグの追加
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  // タグの削除
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Enterキーでタグを追加
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const insertMarkdown = (syntax: string, placeholder: string = '') => {
    const textarea = document.getElementById(`note-textarea-${problemId}`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = note.substring(start, end);
    const textToInsert = selectedText || placeholder;

    let newText = '';
    let cursorOffset = 0;

    switch (syntax) {
      case 'bold':
        newText = note.substring(0, start) + `**${textToInsert}**` + note.substring(end);
        cursorOffset = start + 2;
        break;
      case 'italic':
        newText = note.substring(0, start) + `*${textToInsert}*` + note.substring(end);
        cursorOffset = start + 1;
        break;
      case 'code':
        newText = note.substring(0, start) + `\`${textToInsert}\`` + note.substring(end);
        cursorOffset = start + 1;
        break;
      case 'link':
        newText = note.substring(0, start) + `[${textToInsert || 'リンクテキスト'}](URL)` + note.substring(end);
        cursorOffset = start + 1;
        break;
      case 'list':
        newText = note.substring(0, start) + `\n- ${textToInsert || '項目'}` + note.substring(end);
        cursorOffset = start + 3;
        break;
      case 'h1':
        newText = note.substring(0, start) + `\n# ${textToInsert || '見出し1'}` + note.substring(end);
        cursorOffset = start + 3;
        break;
      case 'h2':
        newText = note.substring(0, start) + `\n## ${textToInsert || '見出し2'}` + note.substring(end);
        cursorOffset = start + 4;
        break;
      default:
        return;
    }

    setNote(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorOffset, cursorOffset);
    }, 0);
  };

  // テンプレート挿入
  const insertTemplate = (template: NoteTemplate) => {
    if (note.trim().length > 0) {
      // 既存のメモがある場合は確認
      if (confirm('既存のメモに追加しますか？（キャンセルすると上書きされます）')) {
        setNote(note + '\n\n---\n\n' + template.content);
      } else {
        setNote(template.content);
      }
    } else {
      setNote(template.content);
    }

    setShowTemplateMenu(false);
    toast.success('テンプレートを挿入しました', {
      position: 'top-center',
      duration: 2000
    });
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            📝 学習メモ
          </span>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Markdown記法のヘルプ"
          >
            <Info size={16} />
          </button>
          <div className="relative template-menu-container">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              title="メモテンプレート"
            >
              <FileText size={16} />
            </button>
            {showTemplateMenu && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 z-10 max-h-96 overflow-y-auto">
                <div className="p-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">メモテンプレート</p>
                  {templates.length > 0 ? (
                    templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => insertTemplate(template)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-2"
                      >
                        <span>{template.emoji || '📝'}</span>
                        <span className="flex-1">{template.name}</span>
                        {!template.isDefault && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">カスタム</span>
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2">テンプレートがありません</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Buttons */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setTab('edit')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${tab === 'edit'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <Edit size={14} />
              <span>編集</span>
            </button>
            <button
              onClick={() => setTab('preview')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${tab === 'preview'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <Eye size={14} />
              <span>プレビュー</span>
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${hasChanges
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Save size={14} />
            <span>{isSaving ? '保存中...' : '保存'}</span>
          </button>
        </div>
      </div>

      {/* Markdown Help */}
      {showHelp && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-b border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm overflow-hidden"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-gray-900 dark:text-gray-300">
            <div><code className="bg-white dark:bg-gray-700 px-1 text-gray-900 dark:text-white">**太字**</code> → <strong>太字</strong></div>
            <div><code className="bg-white dark:bg-gray-700 px-1 text-gray-900 dark:text-white">*イタリック*</code> → <em>イタリック</em></div>
            <div><code className="bg-white dark:bg-gray-700 px-1 text-gray-900 dark:text-white">`コード`</code> → <code className="bg-gray-200 dark:bg-gray-700 px-1 text-gray-900 dark:text-white">コード</code></div>
            <div><code className="bg-white dark:bg-gray-700 px-1 text-gray-900 dark:text-white"># 見出し1</code></div>
            <div><code className="bg-white dark:bg-gray-700 px-1 text-gray-900 dark:text-white">- リスト</code></div>
            <div><code className="bg-white dark:bg-gray-700 px-1 text-gray-900 dark:text-white">[リンク](URL)</code></div>
          </div>
        </motion.div>
      )}

      {/* Toolbar (Edit mode only) */}
      {tab === 'edit' && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 flex-wrap">
          <button
            onClick={() => insertMarkdown('bold', '太字')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-gray-900 dark:text-white"
            title="太字"
          >
            <strong className="text-sm">B</strong>
          </button>
          <button
            onClick={() => insertMarkdown('italic', 'イタリック')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-gray-900 dark:text-white"
            title="イタリック"
          >
            <em className="text-sm">I</em>
          </button>
          <button
            onClick={() => insertMarkdown('code', 'code')}
            className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors font-mono text-sm text-gray-900 dark:text-white"
            title="インラインコード"
          >
            &lt;&gt;
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            onClick={() => insertMarkdown('h1', '見出し')}
            className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-sm font-bold text-gray-900 dark:text-white"
            title="見出し1"
          >
            H1
          </button>
          <button
            onClick={() => insertMarkdown('h2', '見出し')}
            className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-sm font-semibold text-gray-900 dark:text-white"
            title="見出し2"
          >
            H2
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            onClick={() => insertMarkdown('list', '項目')}
            className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-sm text-gray-900 dark:text-white"
            title="リスト"
          >
            • リスト
          </button>
          <button
            onClick={() => insertMarkdown('link', 'リンク')}
            className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-sm text-gray-900 dark:text-white"
            title="リンク"
          >
            🔗 リンク
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="p-4">
        {tab === 'edit' ? (
          <textarea
            id={`note-textarea-${problemId}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ここにメモを入力してください...&#10;&#10;Markdown記法が使えます：&#10;- **太字**, *イタリック*, `コード`&#10;- # 見出し&#10;- - リスト&#10;- [リンク](URL)"
            className="
              w-full h-64 p-3
              bg-white dark:bg-gray-900
              border border-gray-300 dark:border-gray-600
              rounded-lg
              text-gray-900 dark:text-white
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              resize-y
              font-mono text-sm
            "
          />
        ) : (
          <div className="min-h-[16rem] max-h-[32rem] overflow-y-auto">
            <MarkdownPreview content={note} />
          </div>
        )}
      </div>

      {/* タグ管理セクション */}
      <div className="px-4 pb-4 border-t border-gray-300 dark:border-gray-600 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Tag size={16} className="text-gray-600 dark:text-gray-400" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            タグ
          </label>
        </div>

        {/* タグ表示 */}
        <div className="flex gap-2 mb-3 flex-wrap min-h-[32px]">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 transition-colors"
                  title="タグを削除"
                >
                  <X size={14} />
                </button>
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500 italic">
              タグを追加してメモを分類できます
            </span>
          )}
        </div>

        {/* タグ入力 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="タグを入力してEnter"
            className="
              flex-1 px-3 py-2
              bg-white dark:bg-gray-900
              border border-gray-300 dark:border-gray-600
              rounded-lg
              text-sm
              text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
            "
          />
          <button
            onClick={handleAddTag}
            disabled={!tagInput.trim() || tags.includes(tagInput.trim())}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                !tagInput.trim() || tags.includes(tagInput.trim())
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
