// src/hooks/useTags.ts
import { useState, useEffect, useCallback } from 'react';
import { tagsService, type TagWithCount } from '../services/tagsService';
import type { Problem } from '../types';

interface UseTagsResult {
  allTags: TagWithCount[];
  loading: boolean;
  error: string | null;
  addTag: (problemId: number, tag: string) => Promise<void>;
  removeTag: (problemId: number, tag: string) => Promise<void>;
  updateTags: (problemId: number, tags: string[]) => Promise<void>;
  getByTags: (tags: string[], mode?: 'AND' | 'OR') => Promise<Problem[]>;
  renameTag: (oldTag: string, newTag: string) => Promise<void>;
  deleteTag: (tag: string) => Promise<void>;
  refreshTags: () => Promise<void>;
}

export function useTags(): UseTagsResult {
  const [allTags, setAllTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tags = await tagsService.getAllTags();
      setAllTags(tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
      console.error('Error loading tags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllTags();
  }, [loadAllTags]);

  const addTag = useCallback(async (problemId: number, tag: string) => {
    try {
      setError(null);
      await tagsService.addTag(problemId, tag);
      await loadAllTags(); // Refresh tag list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag');
      console.error('Error adding tag:', err);
      throw err;
    }
  }, [loadAllTags]);

  const removeTag = useCallback(async (problemId: number, tag: string) => {
    try {
      setError(null);
      await tagsService.removeTag(problemId, tag);
      await loadAllTags(); // Refresh tag list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag');
      console.error('Error removing tag:', err);
      throw err;
    }
  }, [loadAllTags]);

  const updateTags = useCallback(async (problemId: number, tags: string[]) => {
    try {
      setError(null);
      await tagsService.updateTags(problemId, tags);
      await loadAllTags(); // Refresh tag list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tags');
      console.error('Error updating tags:', err);
      throw err;
    }
  }, [loadAllTags]);

  const getByTags = useCallback(async (tags: string[], mode: 'AND' | 'OR' = 'AND'): Promise<Problem[]> => {
    try {
      setError(null);
      return await tagsService.getByTags(tags, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to filter by tags');
      console.error('Error filtering by tags:', err);
      throw err;
    }
  }, []);

  const renameTag = useCallback(async (oldTag: string, newTag: string) => {
    try {
      setError(null);
      await tagsService.renameTag(oldTag, newTag);
      await loadAllTags(); // Refresh tag list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename tag');
      console.error('Error renaming tag:', err);
      throw err;
    }
  }, [loadAllTags]);

  const deleteTag = useCallback(async (tag: string) => {
    try {
      setError(null);
      await tagsService.deleteTag(tag);
      await loadAllTags(); // Refresh tag list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
      console.error('Error deleting tag:', err);
      throw err;
    }
  }, [loadAllTags]);

  const refreshTags = useCallback(async () => {
    await loadAllTags();
  }, [loadAllTags]);

  return {
    allTags,
    loading,
    error,
    addTag,
    removeTag,
    updateTags,
    getByTags,
    renameTag,
    deleteTag,
    refreshTags
  };
}
