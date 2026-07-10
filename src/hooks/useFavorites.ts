// src/hooks/useFavorites.ts
import { useState, useEffect, useCallback } from 'react';
import { favoritesService } from '../services/favoritesService';
import type { Problem } from '../types';

interface UseFavoritesResult {
  favorites: Problem[];
  loading: boolean;
  error: string | null;
  favoriteCount: number;
  toggleFavorite: (problemId: number) => Promise<void>;
  clearAllFavorites: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

export function useFavorites(categoryFilter?: string): UseFavoritesResult {
  const [favorites, setFavorites] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteCount, setFavoriteCount] = useState(0);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [favs, count] = await Promise.all([
        favoritesService.getFavorites(categoryFilter),
        favoritesService.getFavoriteCount()
      ]);
      setFavorites(favs);
      setFavoriteCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = useCallback(async (problemId: number) => {
    try {
      setError(null);
      await favoritesService.toggleFavorite(problemId);
      // Reload favorites to reflect changes
      await loadFavorites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle favorite');
      console.error('Error toggling favorite:', err);
    }
  }, [loadFavorites]);

  const clearAllFavorites = useCallback(async () => {
    try {
      setError(null);
      await favoritesService.clearAllFavorites();
      await loadFavorites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear favorites');
      console.error('Error clearing favorites:', err);
    }
  }, [loadFavorites]);

  const refreshFavorites = useCallback(async () => {
    await loadFavorites();
  }, [loadFavorites]);

  return {
    favorites,
    loading,
    error,
    favoriteCount,
    toggleFavorite,
    clearAllFavorites,
    refreshFavorites
  };
}
