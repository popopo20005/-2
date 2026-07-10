// src/components/TemplateManager.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Edit, Trash2, Eye, Download, Upload,
  FileText, Copy, Search, X, CheckSquare, Square
} from 'lucide-react';
import { templateService } from '../services/templateService';
import { MarkdownPreview } from './MarkdownPreview';
import type { NoteTemplate } from '../types';

interface TemplateManagerProps {
  onBack: () => void;
}

type ModalMode = 'create' | 'edit' | 'preview' | null;

const EMOJI_OPTIONS = ['📋', '💡', '❌', '🔧', '🔗', '📝', '✨', '🎯', '💯', '🚀', '⚡', '🔥', '📚', '🎓', '🧠', '💪'];

const CATEGORY_OPTIONS: Array<{ value: NoteTemplate['category']; label: string }> = [
  { value: 'learning', label: '学習ポイント' },
  { value: 'error', label: 'つまずきポイント' },
  { value: 'solution', label: '解法パターン' },
  { value: 'reference', label: '参考リンク・資料' },
  { value: 'custom', label: 'カスタム' }
];

/**
 * テンプレート管理コンポーネント
 * カスタムテンプレートのCRUD操作、プレビュー、インポート/エクスポート機能を提供
 */
export function TemplateManager({ onBack }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedForExport, setSelectedForExport] = useState<Set<number>>(new Set());

  // フォーム状態
  const [formData, setFormData] = useState<Omit<NoteTemplate, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    emoji: '📝',
    content: '',
    category: 'custom',
    isDefault: false
  });

  // テンプレート読み込み
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const allTemplates = await templateService.getAll();
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('テンプレートの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 検索フィルター
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // モーダルを開く
  const openCreateModal = () => {
    setFormData({
      name: '',
      emoji: '📝',
      content: '',
      category: 'custom',
      isDefault: false
    });
    setSelectedTemplate(null);
    setModalMode('create');
  };

  const openEditModal = (template: NoteTemplate) => {
    setFormData({
      name: template.name,
      emoji: template.emoji || '📝',
      content: template.content,
      category: template.category,
      isDefault: template.isDefault || false
    });
    setSelectedTemplate(template);
    setModalMode('edit');
  };

  const openPreviewModal = (template: NoteTemplate) => {
    setSelectedTemplate(template);
    setModalMode('preview');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedTemplate(null);
  };

  // テンプレート作成
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('テンプレート名を入力してください');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('テンプレート内容を入力してください');
      return;
    }

    try {
      await templateService.create(formData);
      toast.success('テンプレートを作成しました');
      closeModal();
      loadTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('テンプレートの作成に失敗しました');
    }
  };

  // テンプレート更新
  const handleUpdate = async () => {
    if (!selectedTemplate?.id) return;

    if (!formData.name.trim()) {
      toast.error('テンプレート名を入力してください');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('テンプレート内容を入力してください');
      return;
    }

    try {
      await templateService.update(selectedTemplate.id, formData);
      toast.success('テンプレートを更新しました');
      closeModal();
      loadTemplates();
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('テンプレートの更新に失敗しました');
    }
  };

  // テンプレート削除
  const handleDelete = async (template: NoteTemplate) => {
    if (template.isDefault) {
      toast.error('デフォルトテンプレートは削除できません');
      return;
    }

    if (!confirm(`「${template.name}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      if (template.id) {
        await templateService.delete(template.id);
        toast.success('テンプレートを削除しました');
        loadTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('テンプレートの削除に失敗しました');
    }
  };

  // テンプレート複製
  const handleDuplicate = async (template: NoteTemplate) => {
    try {
      if (template.id) {
        await templateService.duplicate(template.id);
        toast.success('テンプレートを複製しました');
        loadTemplates();
      }
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      toast.error('テンプレートの複製に失敗しました');
    }
  };

  // 選択トグル
  const toggleSelectForExport = (templateId: number) => {
    setSelectedForExport((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  // すべて選択
  const selectAll = () => {
    const customTemplateIds = templates
      .filter(t => !t.isDefault && t.id !== undefined)
      .map(t => t.id!);
    setSelectedForExport(new Set(customTemplateIds));
  };

  // すべて選択解除
  const deselectAll = () => {
    setSelectedForExport(new Set());
  };

  // エクスポート（JSON）
  const handleExport = () => {
    if (selectedForExport.size === 0) {
      toast.error('エクスポートするテンプレートを選択してください');
      return;
    }

    const templatesToExport = templates.filter(
      t => t.id !== undefined && selectedForExport.has(t.id)
    );

    if (templatesToExport.length === 0) {
      toast.error('エクスポートするテンプレートがありません');
      return;
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      templates: templatesToExport.map(t => ({
        name: t.name,
        emoji: t.emoji,
        content: t.content,
        category: t.category
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note-templates-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`${templatesToExport.length}個のテンプレートをエクスポートしました`);
    deselectAll();
  };

  // インポート（JSON）
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.templates || !Array.isArray(data.templates)) {
          toast.error('無効なファイル形式です');
          return;
        }

        let imported = 0;
        for (const templateData of data.templates) {
          try {
            await templateService.create({
              name: templateData.name || '名称未設定',
              emoji: templateData.emoji || '📝',
              content: templateData.content || '',
              category: templateData.category || 'custom',
              isDefault: false
            });
            imported++;
          } catch (error) {
            console.error('Failed to import template:', error);
          }
        }

        if (imported > 0) {
          toast.success(`${imported}個のテンプレートをインポートしました`);
          loadTemplates();
        } else {
          toast.error('テンプレートのインポートに失敗しました');
        }
      } catch (error) {
        console.error('Failed to import templates:', error);
        toast.error('ファイルの読み込みに失敗しました');
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen p-6" style={{ background: '#0F172A' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors"
            >
              <ArrowLeft size={20} />
              戻る
            </button>
            <h1 className="text-3xl font-bold text-[#F8FAFC] flex items-center gap-2">
              <FileText size={32} />
              テンプレート管理
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {selectedForExport.size > 0 && (
              <>
                <button
                  onClick={deselectAll}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors"
                  title="選択を解除"
                >
                  <Square size={18} />
                  解除
                </button>
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors"
                  title="すべて選択"
                >
                  <CheckSquare size={18} />
                  すべて選択
                </button>
              </>
            )}
            {selectedForExport.size === 0 && templates.filter(t => !t.isDefault).length > 0 && (
              <button
                onClick={selectAll}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors"
                title="すべて選択"
              >
                <CheckSquare size={18} />
                すべて選択
              </button>
            )}
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors"
              title="JSONファイルからインポート"
            >
              <Upload size={18} />
              インポート
            </button>
            <button
              onClick={handleExport}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 transition-colors ${
                selectedForExport.size === 0
                  ? 'text-[#64748B] cursor-not-allowed opacity-50'
                  : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/5'
              }`}
              title="JSONファイルにエクスポート"
              disabled={selectedForExport.size === 0}
            >
              <Download size={18} />
              エクスポート
              {selectedForExport.size > 0 && ` (${selectedForExport.size})`}
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366F1] text-white font-medium hover:bg-[#5558E6] transition-colors"
            >
              <Plus size={20} />
              新規作成
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" size={20} />
            <input
              type="text"
              placeholder="テンプレートを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 text-[#F8FAFC] placeholder-[#64748B] focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all"
              style={{ background: 'rgba(15,23,42,0.5)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#64748B] hover:text-[#CBD5E1]"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-2xl border border-white/10" style={{ background: 'rgba(30,41,59,0.7)' }}>
            <div className="text-sm text-[#94A3B8]">総テンプレート数</div>
            <div className="text-2xl font-bold text-[#F8FAFC] mt-1">
              {templates.length}
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-white/10" style={{ background: 'rgba(30,41,59,0.7)' }}>
            <div className="text-sm text-[#94A3B8]">デフォルトテンプレート</div>
            <div className="text-2xl font-bold text-[#F8FAFC] mt-1">
              {templates.filter(t => t.isDefault).length}
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-white/10" style={{ background: 'rgba(30,41,59,0.7)' }}>
            <div className="text-sm text-[#94A3B8]">カスタムテンプレート</div>
            <div className="text-2xl font-bold text-[#F8FAFC] mt-1">
              {templates.filter(t => !t.isDefault).length}
            </div>
          </div>
        </div>

        {/* Template List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1]"></div>
            <p className="mt-4 text-[#94A3B8]">読み込み中...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-white/10" style={{ background: 'rgba(30,41,59,0.7)' }}>
            <FileText size={48} className="mx-auto text-[#64748B] mb-4" />
            <p className="text-[#94A3B8] text-lg">
              {searchQuery ? 'テンプレートが見つかりませんでした' : 'テンプレートがありません'}
            </p>
            {!searchQuery && (
              <button
                onClick={openCreateModal}
                className="mt-4 px-6 py-2 rounded-xl bg-[#6366F1] text-white font-medium hover:bg-[#5558E6] transition-colors"
              >
                最初のテンプレートを作成
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  layout
                >
                  <div
                    className="p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg hover:shadow-black/20"
                    style={{ background: 'rgba(30,41,59,0.7)' }}
                  >
                    {/* Template Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        {/* Checkbox for custom templates only */}
                        {!template.isDefault && template.id !== undefined && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectForExport(template.id!);
                            }}
                            className="flex-shrink-0 text-[#94A3B8] hover:text-[#818CF8] transition-colors"
                            title={selectedForExport.has(template.id) ? '選択解除' : '選択'}
                          >
                            {selectedForExport.has(template.id) ? (
                              <CheckSquare size={20} className="text-[#818CF8]" />
                            ) : (
                              <Square size={20} />
                            )}
                          </button>
                        )}
                        <span className="text-2xl">{template.emoji || '📝'}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#F8FAFC] truncate">
                            {template.name}
                          </h3>
                          {template.isDefault && (
                            <span className="text-xs text-[#818CF8]">
                              デフォルト
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Template Preview */}
                    <div className="mb-3">
                      <div className="text-sm text-[#94A3B8] line-clamp-3 whitespace-pre-wrap">
                        {template.content}
                      </div>
                    </div>

                    {/* Category Badge */}
                    {template.category && (
                      <div className="mb-3">
                        <span
                          className="inline-block px-2 py-1 text-xs rounded-full text-[#94A3B8] border border-white/10"
                          style={{ background: 'rgba(15,23,42,0.5)' }}
                        >
                          {CATEGORY_OPTIONS.find(c => c.value === template.category)?.label || template.category}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                      <button
                        onClick={() => openPreviewModal(template)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-[#CBD5E1] hover:bg-white/5 rounded-lg transition-colors"
                        title="プレビュー"
                      >
                        <Eye size={16} />
                        プレビュー
                      </button>
                      {!template.isDefault && (
                        <>
                          <button
                            onClick={() => openEditModal(template)}
                            className="p-2 text-[#CBD5E1] hover:bg-white/5 rounded-lg transition-colors"
                            title="編集"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(template)}
                            className="p-2 text-[#CBD5E1] hover:bg-white/5 rounded-lg transition-colors"
                            title="複製"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(template)}
                            className="p-2 text-[#EF4444] hover:bg-red-900/20 rounded-lg transition-colors"
                            title="削除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {template.isDefault && (
                        <button
                          onClick={() => handleDuplicate(template)}
                          className="p-2 text-[#CBD5E1] hover:bg-white/5 rounded-lg transition-colors"
                          title="複製"
                        >
                          <Copy size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Create/Edit Modal */}
        {(modalMode === 'create' || modalMode === 'edit') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div
              className="w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ background: 'rgba(30,41,59,0.95)' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-[#F8FAFC]">
                  {modalMode === 'create' ? '新規テンプレート作成' : 'テンプレート編集'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    テンプレート名 <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-white/10 rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                    style={{ background: 'rgba(15,23,42,0.5)' }}
                    placeholder="例: 問題解析メモ"
                  />
                </div>

                {/* Emoji */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    絵文字
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setFormData({ ...formData, emoji })}
                        className={`text-2xl p-2 rounded-lg transition-all ${
                          formData.emoji === emoji
                            ? 'ring-2 ring-[#6366F1] bg-[#6366F1]/20'
                            : 'hover:bg-white/10'
                        }`}
                        style={{ background: formData.emoji === emoji ? undefined : 'rgba(15,23,42,0.5)' }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    カテゴリー
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as NoteTemplate['category'] })}
                    className="w-full px-3 py-2 border border-white/10 rounded-xl text-[#F8FAFC] focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                    style={{ background: 'rgba(15,23,42,0.5)' }}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    テンプレート内容（Markdown対応） <span className="text-[#EF4444]">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 border border-white/10 rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:ring-2 focus:ring-[#6366F1] focus:border-transparent font-mono text-sm"
                    style={{ background: 'rgba(15,23,42,0.5)' }}
                    placeholder="# 見出し&#10;&#10;## セクション1&#10;- 項目1&#10;- 項目2&#10;&#10;## セクション2&#10;-"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl border border-white/10 text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={modalMode === 'create' ? handleCreate : handleUpdate}
                    className="px-4 py-2 rounded-xl bg-[#6366F1] text-white font-medium hover:bg-[#5558E6] transition-colors"
                  >
                    {modalMode === 'create' ? '作成' : '更新'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {modalMode === 'preview' && selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div
              className="w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ background: 'rgba(30,41,59,0.95)' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-[#F8FAFC]">
                  {selectedTemplate.emoji || '📝'} {selectedTemplate.name}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-[#94A3B8]">
                  {selectedTemplate.category && (
                    <span
                      className="px-2 py-1 rounded-full border border-white/10"
                      style={{ background: 'rgba(15,23,42,0.5)' }}
                    >
                      {CATEGORY_OPTIONS.find(c => c.value === selectedTemplate.category)?.label || selectedTemplate.category}
                    </span>
                  )}
                  {selectedTemplate.isDefault && (
                    <span className="px-2 py-1 rounded-full bg-[#6366F1]/20 text-[#818CF8]">
                      デフォルト
                    </span>
                  )}
                </div>

                {/* Preview */}
                <div
                  className="border border-white/10 rounded-xl p-4 max-h-96 overflow-y-auto"
                  style={{ background: 'rgba(15,23,42,0.5)' }}
                >
                  <MarkdownPreview content={selectedTemplate.content} />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                  {!selectedTemplate.isDefault && (
                    <button
                      onClick={() => {
                        closeModal();
                        openEditModal(selectedTemplate);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors"
                    >
                      <Edit size={16} />
                      編集
                    </button>
                  )}
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl bg-[#6366F1] text-white font-medium hover:bg-[#5558E6] transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
