import { create } from 'zustand';
import type { PluginCategory, PluginDefinition } from '@/types/plugin';
import { fetchPluginCatalog } from '@/services/pluginService';

interface PluginStoreState {
  /** Grouped plugin categories from the API */
  categories: PluginCategory[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetching fails */
  error: string | null;
  /** Whether the catalog has been fetched at least once */
  hasFetched: boolean;

  // Actions
  fetchCatalog: () => Promise<void>;
  getPluginByName: (name: string) => PluginDefinition | undefined;
  searchPlugins: (query: string) => PluginCategory[];
}

export const usePluginStore = create<PluginStoreState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,
  hasFetched: false,

  fetchCatalog: async () => {
    // Skip if already loading
    if (get().isLoading) return;
    // Skip if catalog already fetched
    if (get().hasFetched) return;

    set({ isLoading: true, error: null });

    try {
      const response = await fetchPluginCatalog();
      if (response.success) {
        set({
          categories: response.data,
          isLoading: false,
          hasFetched: true,
        });
      } else {
        set({
          error: 'Failed to fetch plugin catalog',
          isLoading: false,
        });
      }
    } catch (err: any) {
      console.error('[PluginStore] Failed to fetch catalog:', err);
      set({
        error: err?.message || 'Network error',
        isLoading: false,
      });
    }
  },

  getPluginByName: (name: string) => {
    const { categories } = get();
    for (const cat of categories) {
      const plugin = cat.plugins.find((p) => p.name === name);
      if (plugin) return plugin;
    }
    return undefined;
  },

  searchPlugins: (query: string) => {
    const { categories } = get();
    const q = query.toLowerCase().trim();
    if (!q) return categories;

    return categories
      .map((cat) => ({
        ...cat,
        plugins: cat.plugins.filter(
          (p) =>
            p.displayName.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.plugins.length > 0);
  },
}));
