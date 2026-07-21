// ============================================================
// Wardrobe AI — Global Zustand Store
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  WardrobeItem,
  SavedOutfit,
  UserProfile,
  OutfitItem,
  FilterState,
  Toast,
  ClothingCategory,
  WearLog,
} from '../types';

// ─── Auth slice ───────────────────────────────────────────────
interface AuthState {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  isLoadingAuth: boolean;
  setUser: (user: { id: string; email: string } | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoadingAuth: (v: boolean) => void;
}

// ─── Wardrobe slice ───────────────────────────────────────────
interface WardrobeState {
  items: WardrobeItem[];
  isLoadingItems: boolean;
  filters: FilterState;
  setItems: (items: WardrobeItem[]) => void;
  addItem: (item: WardrobeItem) => void;
  updateItem: (id: string, updates: Partial<WardrobeItem>) => void;
  removeItem: (id: string) => void;
  setLoadingItems: (v: boolean) => void;
  setFilter: (key: keyof FilterState, value: string) => void;
  resetFilters: () => void;
}

// ─── Outfit Builder slice ─────────────────────────────────────
interface OutfitBuilderState {
  selectedItems: OutfitItem[];
  isGenerating: boolean;
  generationError: string | null;
  lastGeneratedOutfit: SavedOutfit | null;
  bodyPhotoBase64: string | null;
  addToOutfit: (item: OutfitItem) => void;
  removeFromOutfit: (category: ClothingCategory) => void;
  clearOutfit: () => void;
  setGenerating: (v: boolean) => void;
  setGenerationError: (err: string | null) => void;
  setLastGeneratedOutfit: (outfit: SavedOutfit | null) => void;
  setBodyPhoto: (base64: string | null) => void;
}

// ─── Lookbook slice ───────────────────────────────────────────
interface LookbookState {
  savedOutfits: SavedOutfit[];
  isLoadingOutfits: boolean;
  setSavedOutfits: (outfits: SavedOutfit[]) => void;
  addSavedOutfit: (outfit: SavedOutfit) => void;
  removeSavedOutfit: (id: string) => void;
  toggleLike: (id: string) => void;
  addComment: (outfitId: string, comment: SavedOutfit['comments'][0]) => void;
  setLoadingOutfits: (v: boolean) => void;
}

// ─── Wear Tracking slice ──────────────────────────────────────
interface WearTrackingState {
  wearLogs: WearLog[];
  setWearLogs: (logs: WearLog[]) => void;
  addWearLog: (log: WearLog) => void;
}

// ─── UI slice ─────────────────────────────────────────────────
interface UIState {
  toasts: Toast[];
  sidebarExpanded: boolean;
  uploadModalOpen: boolean;
  itemDetailId: string | null;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toggleSidebar: () => void;
  setUploadModalOpen: (v: boolean) => void;
  setItemDetailId: (id: string | null) => void;
}

// ─── Settings slice ───────────────────────────────────────────
interface SettingsState {
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
}

// ─── Combined store ───────────────────────────────────────────
type StoreState = AuthState &
  WardrobeState &
  OutfitBuilderState &
  LookbookState &
  WearTrackingState &
  UIState &
  SettingsState;

const DEFAULT_FILTERS: FilterState = {
  category: 'all',
  season: 'all',
  occasion: 'all',
  color: 'all',
  search: '',
};

export const useWardrobeStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // ── Auth ─────────────────────────────────────────────────
      user: null,
      profile: null,
      isLoadingAuth: true,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoadingAuth: (v) => set({ isLoadingAuth: v }),

      // ── Wardrobe ─────────────────────────────────────────────
      items: [],
      isLoadingItems: false,
      filters: DEFAULT_FILTERS,
      setItems: (items) => set({ items }),
      addItem: (item) => set((s) => ({ items: [item, ...s.items] })),
      updateItem: (id, updates) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setLoadingItems: (v) => set({ isLoadingItems: v }),
      setFilter: (key, value) =>
        set((s) => ({ filters: { ...s.filters, [key]: value } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      // ── Outfit Builder ────────────────────────────────────────
      selectedItems: [],
      isGenerating: false,
      generationError: null,
      lastGeneratedOutfit: null,
      bodyPhotoBase64: null,
      addToOutfit: (item) =>
        set((s) => {
          // Replace item in same category (one item per category slot)
          const filtered = s.selectedItems.filter(
            (i) => i.category !== item.category
          );
          return { selectedItems: [...filtered, item] };
        }),
      removeFromOutfit: (category) =>
        set((s) => ({
          selectedItems: s.selectedItems.filter((i) => i.category !== category),
        })),
      clearOutfit: () =>
        set({ selectedItems: [], lastGeneratedOutfit: null, generationError: null }),
      setGenerating: (v) => set({ isGenerating: v }),
      setGenerationError: (err) => set({ generationError: err }),
      setLastGeneratedOutfit: (outfit) => set({ lastGeneratedOutfit: outfit }),
      setBodyPhoto: (base64) => set({ bodyPhotoBase64: base64 }),

      // ── Lookbook ─────────────────────────────────────────────
      savedOutfits: [],
      isLoadingOutfits: false,
      setSavedOutfits: (savedOutfits) => set({ savedOutfits }),
      addSavedOutfit: (outfit) =>
        set((s) => ({ savedOutfits: [outfit, ...s.savedOutfits] })),
      removeSavedOutfit: (id) =>
        set((s) => ({ savedOutfits: s.savedOutfits.filter((o) => o.id !== id) })),
      toggleLike: (id) =>
        set((s) => ({
          savedOutfits: s.savedOutfits.map((o) =>
            o.id === id
              ? { ...o, isLiked: !o.isLiked, likes: o.likes + (o.isLiked ? -1 : 1) }
              : o
          ),
        })),
      addComment: (outfitId, comment) =>
        set((s) => ({
          savedOutfits: s.savedOutfits.map((o) =>
            o.id === outfitId
              ? { ...o, comments: [...o.comments, comment] }
              : o
          ),
        })),
      setLoadingOutfits: (v) => set({ isLoadingOutfits: v }),

      // ── Wear Tracking ─────────────────────────────────────────
      wearLogs: [],
      setWearLogs: (wearLogs) => set({ wearLogs }),
      addWearLog: (log) => set((s) => ({ wearLogs: [log, ...s.wearLogs] })),

      // ── UI ────────────────────────────────────────────────────
      toasts: [],
      sidebarExpanded: false,
      uploadModalOpen: false,
      itemDetailId: null,
      addToast: (toast) => {
        const id = Math.random().toString(36).slice(2);
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        // Auto-remove after duration
        const duration = toast.duration ?? 4000;
        setTimeout(() => {
          get().removeToast(id);
        }, duration);
      },
      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      toggleSidebar: () =>
        set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      setUploadModalOpen: (v) => set({ uploadModalOpen: v }),
      setItemDetailId: (id) => set({ itemDetailId: id }),

      // ── Settings ─────────────────────────────────────────────
      geminiApiKey: '',
      setGeminiApiKey: (key) => {
        set({ geminiApiKey: key });
        if (key) localStorage.setItem('wardrobe_ai_gemini_key', key);
        else localStorage.removeItem('wardrobe_ai_gemini_key');
      },
    }),
    {
      name: 'wardrobe-ai-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist settings and UI state — server data refreshed on mount
      partialize: (state) => ({
        sidebarExpanded: state.sidebarExpanded,
        geminiApiKey: state.geminiApiKey,
        filters: state.filters,
        // Cache wardrobe for fast initial render (will be overwritten by DB fetch)
        items: state.items,
        savedOutfits: state.savedOutfits,
      }),
    }
  )
);

// ─── Derived selectors ────────────────────────────────────────
export const selectFilteredItems = (state: StoreState): WardrobeItem[] => {
  const { items, filters } = state;
  return items.filter((item) => {
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.season !== 'all' && !item.season.includes(filters.season as never)) return false;
    if (filters.occasion !== 'all' && !item.occasion.includes(filters.occasion as never)) return false;
    if (filters.color !== 'all' && !item.color.some((c) => c.toLowerCase().includes(filters.color.toLowerCase()))) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
        item.color.some((c) => c.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });
};
