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
  X
} from 'lucide-react';
import {
  getAllProblemsWithNotes,
  searchNotes,
  getNoteStatistics,
  downloadNotes,
  deleteNote,
  saveNote,
  type ProblemWithNote,
  type NoteStatistics,
  type ExportFormat,
} from '../services/noteService';

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

  const handleExport = (format: ExportFormat) => {
    downloadNotes(format);
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
              <Button
                onClick={() => setShowStats(!showStats)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <BarChart3 size={18} />
                統計
              </Button>
              <Button
                onClick={() => handleExport('json')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download size={18} />
                JSON
              </Button>
              <Button
                onClick={() => handleExport('markdown')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText size={18} />
                Markdown
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        {showStats && statistics && (
          <Card className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
            <h2 className="text-xl font-semibold mb-4">📊 統計情報</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">総メモ数</p>
                <p className="text-2xl font-bold">{statistics.totalNotes}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">カバー率</p>
                <p className="text-2xl font-bold">{statistics.notesPercentage}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">平均文字数</p>
                <p className="text-2xl font-bold">{statistics.averageNoteLength}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">タグ数</p>
                <p className="text-2xl font-bold">{statistics.topTags.length}</p>
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

        {/* Edit Modal */}
        {editingNote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">メモを編集</h2>
                  <button
                    onClick={() => setEditingNote(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">問題</p>
                  <p className="font-medium">{editingNote.question}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">メモ（Markdown対応）</label>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full h-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                    placeholder="Markdown形式でメモを入力..."
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">タグ</label>
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
                    <Button onClick={handleAddTag} variant="outline">
                      追加
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSaveEdit} variant="primary" className="flex-1">
                    保存
                  </Button>
                  <Button onClick={() => setEditingNote(null)} variant="outline">
                    キャンセル
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
