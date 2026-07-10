// src/services/favoritesService.ts
import { db } from '../lib/database';
import type { Problem } from '../types';

export const favoritesService = {
  // Toggle favorite status
  async toggleFavorite(problemId: number): Promise<boolean> {
    const problem = await db.problems.get(problemId);
    if (!problem) throw new Error('Problem not found');

    const newFavoriteStatus = !problem.isFavorite;
    await db.problems.update(problemId, {
      isFavorite: newFavoriteStatus,
      favoritedAt: newFavoriteStatus ? new Date() : undefined
    });

    return newFavoriteStatus;
  },

  // Get all favorites with optional category filter
  async getFavorites(categoryFilter?: string): Promise<Problem[]> {
    let favorites = await db.problems
      .filter(p => p.isFavorite === true)
      .toArray();

    if (categoryFilter) {
      favorites = favorites.filter(p => p.category === categoryFilter);
    }

    // Sort by favoritedAt descending (newest first)
    return favorites.sort((a, b) => {
      if (!a.favoritedAt) return 1;
      if (!b.favoritedAt) return -1;
      return b.favoritedAt.getTime() - a.favoritedAt.getTime();
    });
  },

  // Get favorite count
  async getFavoriteCount(): Promise<number> {
    return await db.problems
      .filter(p => p.isFavorite === true)
      .count();
  },

  // Clear all favorites
  async clearAllFavorites(): Promise<void> {
    const favorites = await db.problems
      .filter(p => p.isFavorite === true)
      .toArray();

    await Promise.all(
      favorites.map(p =>
        db.problems.update(p.id!, {
          isFavorite: false,
          favoritedAt: undefined
        })
      )
    );
  }
};
