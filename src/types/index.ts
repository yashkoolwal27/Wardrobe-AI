// ============================================================
// Wardrobe AI — Core TypeScript Types
// ============================================================

export type ClothingCategory =
  | 'top'
  | 'bottom'
  | 'footwear'
  | 'accessory'
  | 'outerwear'
  | 'dress'
  | 'bag';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all';

export type Occasion =
  | 'casual'
  | 'formal'
  | 'business'
  | 'sport'
  | 'evening'
  | 'beach'
  | 'outdoor';

export type PrivacySetting = 'public' | 'private' | 'approval';

export interface WardrobeItem {
  id: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: ClothingCategory;
  color: string[];
  season: Season[];
  occasion: Occasion[];
  brand?: string;
  description: string;
  tags: string[];
  price?: number;
  purchaseDate?: string;
  wearCount: number;
  lastWorn?: string;
  createdAt: string;
  // Position in 3D scene (assigned at runtime)
  scenePosition?: [number, number, number];
}

export interface OutfitItem {
  wardrobeItemId: string;
  category: ClothingCategory;
  imageUrl: string;
}

export interface SavedOutfit {
  id: string;
  userId: string;
  name: string;
  items: OutfitItem[];
  generatedImageUrl?: string;
  description?: string;
  stylingTips?: string[];
  occasion?: Occasion;
  season?: Season;
  likes: number;
  isLiked?: boolean;
  comments: OutfitComment[];
  createdAt: string;
}

export interface OutfitComment {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  text: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  shareCode: string;
  privacy: PrivacySetting;
  geminiApiKey?: string;
  createdAt: string;
}

export interface WearLog {
  id: string;
  userId: string;
  outfitId?: string;
  itemIds: string[];
  wornAt: string;
  occasion?: Occasion;
  weather?: string;
  notes?: string;
}

export interface GeminiAnalysisResult {
  category: ClothingCategory;
  color: string[];
  season: Season[];
  occasion: Occasion[];
  description: string;
  tags: string[];
  brand?: string;
}

export interface OutfitGenerationResult {
  generatedImageUrl: string | null;
  generatedImageBlob: Blob | null;
  description: string;
  stylingTips: string[];
  occasion: Occasion;
  season: Season;
}

// UI State types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface FilterState {
  category: ClothingCategory | 'all';
  season: Season | 'all';
  occasion: Occasion | 'all';
  color: string | 'all';
  search: string;
}
