// ============================================================
// Database layer — Supabase wrapper
// Thin abstraction so swapping to another backend only changes this file.
// ============================================================

import { supabase } from './supabase';
import type {
  WardrobeItem,
  SavedOutfit,
  UserProfile,
  WearLog,
} from '../types';

// ─── Helper: map Supabase row → WardrobeItem ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(row: any): WardrobeItem {
  return {
    id: row.id,
    userId: row.user_id,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    category: row.category as any,
    color: row.color ?? [],
    season: row.season ?? [],
    occasion: row.occasion ?? [],
    brand: row.brand ?? undefined,
    description: row.description ?? '',
    tags: row.tags ?? [],
    price: row.price ?? undefined,
    purchaseDate: row.purchase_date ?? undefined,
    wearCount: row.wear_count ?? 0,
    lastWorn: row.last_worn ?? undefined,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOutfit(row: any): SavedOutfit {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    items: row.items ?? [],
    generatedImageUrl: row.generated_image_url ?? undefined,
    description: row.description ?? undefined,
    stylingTips: row.styling_tips ?? [],
    occasion: row.occasion ?? undefined,
    season: row.season ?? undefined,
    likes: row.likes ?? 0,
    isLiked: row.is_liked ?? false,
    comments: row.comments ?? [],
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email ?? '',
    username: row.username ?? '',
    displayName: row.display_name ?? '',
    avatarUrl: row.avatar_url ?? undefined,
    bodyPhotoUrl: row.body_photo_url ?? undefined,
    bio: row.bio ?? undefined,
    shareCode: row.share_code ?? '',
    privacy: row.privacy ?? 'private',
    createdAt: row.created_at,
  };
}

// ─── Wardrobe Items ───────────────────────────────────────────
export async function getWardrobeItems(userId: string): Promise<WardrobeItem[]> {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapItem);
}

export async function saveWardrobeItem(
  item: Omit<WardrobeItem, 'id' | 'createdAt' | 'wearCount'>
): Promise<WardrobeItem> {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .insert({
      user_id: item.userId,
      image_url: item.imageUrl,
      thumbnail_url: item.thumbnailUrl,
      category: item.category,
      color: item.color,
      season: item.season,
      occasion: item.occasion,
      brand: item.brand,
      description: item.description,
      tags: item.tags,
      price: item.price,
      purchase_date: item.purchaseDate,
    })
    .select()
    .single();

  if (error) throw error;
  return mapItem(data);
}

export async function updateWardrobeItem(
  id: string,
  updates: Partial<WardrobeItem>
): Promise<void> {
  const { error } = await supabase
    .from('wardrobe_items')
    .update({
      category: updates.category,
      color: updates.color,
      season: updates.season,
      occasion: updates.occasion,
      brand: updates.brand,
      description: updates.description,
      tags: updates.tags,
      price: updates.price,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteWardrobeItem(id: string): Promise<void> {
  const { error } = await supabase.from('wardrobe_items').delete().eq('id', id);
  if (error) throw error;
}

export async function incrementWearCount(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_wear_count', { item_id: itemId });
  if (error) {
    // Fallback if the RPC doesn't exist yet
    const { data } = await supabase
      .from('wardrobe_items')
      .select('wear_count')
      .eq('id', itemId)
      .single();
    await supabase
      .from('wardrobe_items')
      .update({ wear_count: (data?.wear_count ?? 0) + 1, last_worn: new Date().toISOString() })
      .eq('id', itemId);
  }
}

// ─── Saved Outfits ────────────────────────────────────────────
export async function getSavedOutfits(userId: string): Promise<SavedOutfit[]> {
  const { data, error } = await supabase
    .from('saved_outfits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapOutfit);
}

export async function saveOutfit(
  outfit: Omit<SavedOutfit, 'id' | 'createdAt' | 'likes' | 'isLiked' | 'comments'>
): Promise<SavedOutfit> {
  const { data, error } = await supabase
    .from('saved_outfits')
    .insert({
      user_id: outfit.userId,
      name: outfit.name,
      items: outfit.items,
      generated_image_url: outfit.generatedImageUrl,
      description: outfit.description,
      styling_tips: outfit.stylingTips ?? [],
      occasion: outfit.occasion,
      season: outfit.season,
    })
    .select()
    .single();

  if (error) throw error;
  return mapOutfit(data);
}

export async function deleteOutfit(id: string): Promise<void> {
  const { error } = await supabase.from('saved_outfits').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleOutfitLike(outfitId: string, userId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('outfit_id', outfitId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id);
    await supabase.rpc('decrement_outfit_likes', { outfit_id: outfitId });
    return false;
  } else {
    await supabase.from('likes').insert({ outfit_id: outfitId, user_id: userId });
    await supabase.rpc('increment_outfit_likes', { outfit_id: outfitId });
    return true;
  }
}

// ─── Public wardrobe by share code ───────────────────────────
export async function getWardrobeByCode(code: string): Promise<{
  profile: UserProfile;
  items: WardrobeItem[];
} | null> {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('share_code', code.toUpperCase())
    .eq('privacy', 'public')
    .single();

  if (profileError || !profileData) return null;

  const profile = mapProfile(profileData);
  const { data: itemsData } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  return { profile, items: (itemsData ?? []).map(mapItem) };
}

// ─── User Profile ─────────────────────────────────────────────
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return mapProfile(data);
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatarUrl' | 'bodyPhotoUrl' | 'privacy'>>
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: updates.displayName,
      bio: updates.bio,
      avatar_url: updates.avatarUrl,
      body_photo_url: updates.bodyPhotoUrl,
      privacy: updates.privacy,
    })
    .eq('id', userId);

  if (error) throw error;
}

export async function generateShareCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── Wear Logs ────────────────────────────────────────────────
export async function getWearLogs(userId: string): Promise<WearLog[]> {
  const { data, error } = await supabase
    .from('wear_logs')
    .select('*')
    .eq('user_id', userId)
    .order('worn_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    outfitId: row.outfit_id ?? undefined,
    itemIds: row.item_ids ?? [],
    wornAt: row.worn_at,
    occasion: row.occasion as any,
    weather: row.weather ?? undefined,
    notes: row.notes ?? undefined,
  }));
}

export async function logWornOutfit(log: Omit<WearLog, 'id'>): Promise<void> {
  const { error } = await supabase.from('wear_logs').insert({
    user_id: log.userId,
    outfit_id: log.outfitId,
    item_ids: log.itemIds,
    worn_at: log.wornAt,
    occasion: log.occasion,
    weather: log.weather,
    notes: log.notes,
  });

  if (error) throw error;

  // Increment wear counts for all items
  for (const itemId of log.itemIds) {
    await incrementWearCount(itemId).catch(() => {}); // non-critical
  }
}
