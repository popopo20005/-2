/**
 * メモ管理コンポーネント
 *
 * 学習メモの閲覧・検索・編集・エクスポート機能を提供
 */

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  StickyNote,
  Search,
  Download,
  Tag,
  FileText,
  BarChart3,
  Edit2,
  Trash2,
  X,
  CheckSquare,
  Square,
  Book
} from 'lucide-react';
import {
  getAllProblemsWithNotes,
  searchNotes,
  getNoteStatistics,
  downloadNotes,
  deleteNote,
  saveNote,
  getQuizSetsWithNoteCount,
  downloadNotebook,
  generateNotebookWithTemplate,
  NOTEBOOK_TEMPLATES,
  type ProblemWithNote,
  type NoteStatistics,
  type ExportFormat,
} from '../services/noteService';
import type { NotebookTemplateType } from '../types';
import { MarkdownPreview } from './MarkdownPreview';
import toast from 'react-hot-toast';

interface NoteManagerProps {
  onBack: () => void;
}

export function NoteManager({ onBack }: NoteManagerProps) {
  const [problems, setProblems] = useState<ProblemWithNote[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<ProblemWithNote[]>([]);
  const [statistics, setStatistics] = useState<NoteStatistics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<ProblemWithNote | null>(null);
  const [editText, setEditText] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState<Set<number>>(new Set());
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [quizSetsWithNotes, setQuizSetsWithNotes] = useState<Array<{ id: number; name: string; noteCount: number }>>([]);

  // Notebook template selection
  const [selectedQuizSetForNotebook, setSelectedQuizSetForNotebook] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotebookTemplateType>('standard');
  const [notebookPreview, setNotebookPreview] = useState<string | null>(null);
  const [showNotebookPreview, setShowNotebookPreview] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  // 初期データ読み込み
  useEffect(() => {
    loadData();
  }, []);

  // 検索・フィルタリング
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      performSearch();
    } else if (selectedTag) {
      filterByTag();
    } else {
      setFilteredProblems(problems);
    }
  }, [searchQuery, selectedTag, problems]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allProblems, stats] = await Promise.all([
        getAllProblemsWithNotes(),
        getNoteStatistics(),
      ]);
      setProblems(allProblems);
      setFilteredProblems(allProblems);
      setStatistics(stats);
    } catch (error) {
      console.error('データの読み込みに失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    try {
      const results = await searchNotes(searchQuery);
      setFilteredProblems(results.map((r) => r.problem));
    } catch (error) {
      console.error('検索に失敗:', error);
    }
  };

  const filterByTag = () => {
    if (!selectedTag) {
      setFilteredProblems(problems);
      return;
    }
    const filtered = problems.filter((p) =>
      p.noteTags?.some((t) => t.toLowerCase() === selectedTag.toLowerCase())
    );
    setFilteredProblems(filtered);
  };

  // 選択トグル
  const toggleSelectForExport = (problemId: number) => {
    setSelectedForExport((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(problemId)) {
        newSet.delete(problemId);
      } else {
        newSet.add(problemId);
      }
      return newSet;
    });
  };

  // すべて選択
  const selectAll = () => {
    const problemIds = filteredProblems
      .filter(p => p.id !== undefined)
      .map(p => p.id!);
    setSelectedForExport(new Set(problemIds));
  };

  // すべて選択解除
  const deselectAll = () => {
    setSelectedForExport(new Set());
  };

  const handleExport = (format: ExportFormat) => {
    if (selectedForExport.size === 0) {
      downloadNotes(format);
    } else {
      downloadSelectedNotes(Array.from(selectedForExport), format);
    }
    deselectAll();
  };

  // 選択されたメモのみエクスポート（一時的な関数）
  const downloadSelectedNotes = async (problemIds: number[], format: ExportFormat) => {
    try {
      const selectedProblems = problems.filter(p => p.id && problemIds.includes(p.id));
      const content = format === 'json'
        ? JSON.stringify(selectedProblems.map(p => ({
            id: p.id,
            question: p.question,
            category: p.category,
            userNotes: p.userNotes,
            noteTags: p.noteTags,
            noteUpdatedAt: p.noteUpdatedAt?.toISOString(),
          })), null, 2)
        : format === 'markdown'
        ? generateMarkdown(selectedProblems)
        : generateCSV(selectedProblems);

      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/plain',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'csv';
      link.download = `study-notes-selected-${timestamp}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('エクスポートに失敗:', error);
    }
  };

  const generateMarkdown = (probs: ProblemWithNote[]): string => {
    let markdown = '# 学習メモ (選択)\n\n';
    markdown += `エクスポート日時: ${new Date().toLocaleString('ja-JP')}\n\n`;
    markdown += `総メモ数: ${probs.length}\n\n`;
    markdown += '---\n\n';

    probs.forEach((p, index) => {
      markdown += `## ${index + 1}. ${p.question}\n\n`;
      markdown += `**カテゴリ**: ${p.category}\n\n`;

      if (p.noteTags && p.noteTags.length > 0) {
        markdown += `**タグ**: ${p.noteTags.map((t) => `\`${t}\``).join(', ')}\n\n`;
      }

      if (p.noteUpdatedAt) {
        markdown += `**更新日時**: ${p.noteUpdatedAt.toLocaleString('ja-JP')}\n\n`;
      }

      markdown += '### メモ\n\n';
      markdown += `${p.userNotes}\n\n`;
      markdown += '---\n\n';
    });

    return markdown;
  };

  const generateCSV = (probs: ProblemWithNote[]): string => {
    const headers = ['ID', 'カテゴリ', '問題文', 'メモ', 'タグ', '更新日時'];
    const rows = [headers];

    probs.forEach((p) => {
      const row = [
        p.id?.toString() || '',
        p.category || '',
        escapeCSV(p.question),
        escapeCSV(p.userNotes || ''),
        p.noteTags?.join(';') || '',
        p.noteUpdatedAt?.toISOString() || '',
      ];
      rows.push(row);
    });

    return rows.map((row) => row.join(',')).join('\n');
  };

  const escapeCSV = (text: string): string => {
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const handleEditNote = (problem: ProblemWithNote) => {
    setEditingNote(problem);
    setEditText(problem.userNotes || '');
    setEditTags(problem.noteTags || []);
    setNewTag('');
  };

  const handleSaveEdit = async () => {
    if (!editingNote || !editingNote.id) return;

    try {
      await saveNote(editingNote.id, editText, editTags);
      await loadData();
      setEditingNote(null);
    } catch (error) {
      console.error('メモの保存に失敗:', error);
    }
  };

  const handleDeleteNote = async (problemId: number) => {
    if (!confirm('このメモを削除してもよろしいですか？')) return;

    try {
      await deleteNote(problemId);
      await loadData();
    } catch (error) {
      console.error('メモの削除に失敗:', error);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  // ノートブック作成モーダルを開く
  const openNotebookModal = async () => {
    const quizSets = await getQuizSetsWithNoteCount();
    setQuizSetsWithNotes(quizSets);
    setShowNotebookModal(true);
  };

  // ノートブックをダウンロード
  const handleDownloadNotebook = async (quizSetId: number) => {
    try {
      await downloadNotebook(quizSetId);
      toast.success('ノートブックをダウンロードしました');
      setShowNotebookModal(false);
    } catch (error) {
      console.error('ノートブックのダウンロードに失敗:', error);
      toast.error('ノートブックのダウンロードに失敗しました');
    }
  };

  // プレビューを生成
  const handleGeneratePreview = async (quizSetId: number, templateType: NotebookTemplateType) => {
    setGeneratingPreview(true);
    try {
      const preview = await generateNotebookWithTemplate(quizSetId, templateType);
      setNotebookPreview(preview);
      setShowNotebookPreview(true);
    } catch (error) {
      console.error('プレビュー生成に失敗:', error);
      toast.error('プレビューの生成に失敗しました');
    } finally {
      setGeneratingPreview(false);
    }
  };

  // プレビューからノートブックをダウンロード
  const handleDownloadFromPreview = () => {
    if (!notebookPreview || !selectedQuizSetForNotebook) return;

    try {
      const blob = new Blob([notebookPreview], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const quizSet = quizSetsWithNotes.find(qs => qs.id === selectedQuizSetForNotebook);
      const timestamp = new Date().toISOString().split('T')[0];
      const templateName = NOTEBOOK_TEMPLATES.find(t => t.type === selectedTemplate)?.name || 'notebook';
      link.download = `notebook-${quizSet?.name || 'unknown'}-${templateName}-${timestamp}.md`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('ノートブックをダウンロードしました');
      setShowNotebookPreview(false);
      setShowNotebookModal(false);
    } catch (error) {
      console.error('ダウンロードに失敗:', error);
      toast.error('ダウンロードに失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={onBack} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline">
            ← 戻る
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                <StickyNote className="inline-block mr-2" size={32} />
                学習メモ
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {statistics?.totalNotes || 0}件のメモ（問題の{statistics?.notesPercentage || 0}%）
              </p>
            </div>
            <div className="flex gap-2">
              {selectedForExport.size > 0 && (
                <>
                  <Button
                    onClick={deselectAll}
                    variant="ghost"
                    className="flex items-center gap-2"
                    title="選択を解除"
                  >
                    <Square size={18} />
                    解除
                  </Button>
                  <Button
                    onClick={selectAll}
                    variant="ghost"
                    className="flex items-center gap-2"
                    title="すべて選択"
                  >
                    <CheckSquare size={18} />
                    すべて選択
                  </Button>
                </>
              )}
              {selectedForExport.size === 0 && filteredProblems.length > 0 && (
                <Button
                  onClick={selectAll}
                  variant="ghost"
                  className="flex items-center gap-2"
                  title="すべて選択"
                >
                  <CheckSquare size={18} />
                  すべて選択
                </Button>
              )}
              <Button
                onClick={openNotebookModal}
                variant="primary"
                className="flex items-center gap-2"
                title="問題集ごとにメモをまとめてノートブックを作成"
              >
                <Book size={18} />
                ノートブック作成
              </Button>
              <Button
                onClick={() => setShowStats(!showStats)}
                variant="outline"
                className="flex items-center gap-2"
                style={{ color: 'rgb(17, 24, 39)' }}
                title="メモの統計情報を表示/非表示"
              >
                <BarChart3 size={18} />
                統計
              </Button>
              <Button
                onClick={() => handleExport('json')}
                variant="outline"
                className="flex items-center gap-2"
                style={{ color: 'rgb(17, 24, 39)' }}
                title="メモをJSON形式でダウンロード"
              >
                <Download size={18} />
                JSON
                {selectedForExport.size > 0 && ` (${selectedForExport.size})`}
              </Button>
              <Button
                onClick={() => handleExport('markdown')}
                variant="outline"
                className="flex items-center gap-2"
                style={{ color: 'rgb(17, 24, 39)' }}
                title="メモをMarkdown形式でダウンロード"
              >
                <FileText size={18} />
                Markdown
                {selectedForExport.size > 0 && ` (${selectedForExport.size})`}
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        {showStats && statistics && (
          <Card className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">📊 統計情報</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">総メモ数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.totalNotes}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">カバー率</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.notesPercentage}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">平均文字数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.averageNoteLength}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">タグ数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.topTags.length}</p>
              </div>
            </div>

            {/* Top Tags */}
            {statistics.topTags.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">人気のタグ</p>
                <div className="flex flex-wrap gap-2">
                  {statistics.topTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag.tag}
                      onClick={() => setSelectedTag(tag.tag)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedTag === tag.tag
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tag.tag} ({tag.count})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Search & Filter */}
        <Card className="mb-6 p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="メモ・問題文・タグを検索..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(searchQuery || selectedTag) && (
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag(null);
                }}
                variant="outline"
                style={{ color: 'rgb(17, 24, 39)' }}
              >
                クリア
              </Button>
            )}
          </div>
          {selectedTag && (
            <div className="mt-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                フィルター: <strong>{selectedTag}</strong>
              </span>
            </div>
          )}
        </Card>

        {/* Notes List */}
        {filteredProblems.length === 0 ? (
          <Card className="p-12 text-center">
            <StickyNote className="mx-auto mb-4 text-gray-400" size={64} />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {searchQuery || selectedTag ? 'メモが見つかりません' : 'メモがありません'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || selectedTag
                ? '検索条件を変更してください'
                : '問題にメモを追加して、学習内容を記録しましょう'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProblems.map((problem) => (
              <Card key={problem.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Checkbox */}
                    {problem.id !== undefined && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectForExport(problem.id!);
                        }}
                        className="flex-shrink-0 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title={selectedForExport.has(problem.id) ? '選択解除' : '選択'}
                      >
                        {selectedForExport.has(problem.id) ? (
                          <CheckSquare size={20} className="text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>
                    )}
                    <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded">
                        {problem.category}
                      </span>
                      {problem.noteTags && problem.noteTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {problem.noteTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded flex items-center gap-1"
                            >
                              <Tag size={12} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {problem.question}
                    </h3>
                    {problem.noteUpdatedAt && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        更新: {new Date(problem.noteUpdatedAt).toLocaleString('ja-JP')}
                      </p>
                    )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditNote(problem)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => problem.id && handleDeleteNote(problem.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">
                    {problem.userNotes}
                  </pre>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Notebook Selection Modal */}
        {showNotebookModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Book size={28} />
                    ノートブック作成
                  </h2>
                  <button
                    onClick={() => {
                      setShowNotebookModal(false);
                      setSelectedQuizSetForNotebook(null);
                      setSelectedTemplate('standard');
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                {!selectedQuizSetForNotebook ? (
                  // Step 1: Quiz Set Selection
                  <>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      問題集を選択してください。選択した問題集のメモをまとめたノートブックを作成します。
                    </p>

                    {quizSetsWithNotes.length === 0 ? (
                      <div className="text-center py-12">
                        <Book size={48} className="mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 dark:text-gray-400">
                          メモがある問題集がありません
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {quizSetsWithNotes.map((quizSet) => (
                          <button
                            key={quizSet.id}
                            onClick={() => setSelectedQuizSetForNotebook(quizSet.id)}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-transparent hover:border-blue-500 transition-all"
                          >
                            <div className="flex-1 text-left">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {quizSet.name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {quizSet.noteCount}個のメモ
                              </p>
                            </div>
                            <div className="text-blue-600 dark:text-blue-400">→</div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 flex justify-end">
                      <Button
                        onClick={() => setShowNotebookModal(false)}
                        variant="outline"
                        style={{ color: 'rgb(17, 24, 39)' }}
                      >
                        閉じる
                      </Button>
                    </div>
                  </>
                ) : (
                  // Step 2: Template Selection
                  <>
                    <button
                      onClick={() => setSelectedQuizSetForNotebook(null)}
                      className="mb-4 text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
                    >
                      ← 問題集選択に戻る
                    </button>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      ノートブックのテンプレートを選択してください。各テンプレートは異なる学習スタイルに最適化されています。
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {NOTEBOOK_TEMPLATES.map((template) => (
                        <button
                          key={template.type}
                          onClick={() => setSelectedTemplate(template.type)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            selectedTemplate === template.type
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">{template.emoji}</span>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {template.name}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {template.description}
                          </p>
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleGeneratePreview(selectedQuizSetForNotebook, selectedTemplate)}
                        variant="outline"
                        disabled={generatingPreview}
                        className="flex-1"
                        style={{ color: 'rgb(17, 24, 39)' }}
                      >
                        {generatingPreview ? '生成中...' : 'プレビュー'}
                      </Button>
                      <Button
                        onClick={() => handleDownloadNotebook(selectedQuizSetForNotebook)}
                        variant="primary"
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        <Download size={16} />
                        ダウンロード（標準版）
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Edit Modal */}
        {editingNote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">メモを編集</h2>
                  <button
                    onClick={() => setEditingNote(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">問題</p>
                  <p className="font-medium text-gray-900 dark:text-white">{editingNote.question}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">メモ（Markdown対応）</label>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full h-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                    placeholder="Markdown形式でメモを入力..."
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">タグ</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-2"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="新しいタグを入力..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <Button onClick={handleAddTag} variant="outline" style={{ color: 'rgb(17, 24, 39)' }}>
                      追加
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSaveEdit} variant="primary" className="flex-1">
                    保存
                  </Button>
                  <Button onClick={() => setEditingNote(null)} variant="outline" style={{ color: 'rgb(17, 24, 39)' }}>
                    キャンセル
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Notebook Preview Modal */}
        {showNotebookPreview && notebookPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText size={28} />
                    ノートブックプレビュー
                  </h2>
                  <button
                    onClick={() => setShowNotebookPreview(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-900 dark:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  選択したテンプレート: {NOTEBOOK_TEMPLATES.find(t => t.type === selectedTemplate)?.emoji}{' '}
                  {NOTEBOOK_TEMPLATES.find(t => t.type === selectedTemplate)?.name}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
                  <MarkdownPreview content={notebookPreview} />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 flex-shrink-0">
                <Button
                  onClick={handleDownloadFromPreview}
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  このノートブックをダウンロード
                </Button>
                <Button
                  onClick={() => {
                    setShowNotebookPreview(false);
                    setNotebookPreview(null);
                  }}
                  variant="outline"
                  style={{ color: 'rgb(17, 24, 39)' }}
                >
                  閉じる
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
