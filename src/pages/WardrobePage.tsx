import { useEffect, useState, useRef } from 'react';
import { useWardrobeStore } from '../store/wardrobeStore';
import { getWardrobeItems, saveWardrobeItem, deleteWardrobeItem } from '../lib/db';
import { uploadClothingItem, fileToBase64 } from '../lib/storage';
import { removeBackground } from '../lib/bgRemoval';
import { analyzeClothingItem } from '../lib/gemini';
import { PageTransition } from '../components/layout/PageTransition';
import { ClosetScene } from '../scenes/ClosetScene';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Upload, Search, RotateCcw, X, Tag, Grid, Layers
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { WardrobeItem } from '../types';

export function WardrobePage() {
  const {
    user,
    items,
    setItems,
    setLoadingItems,
    filters,
    setFilter,
    resetFilters,
    addToast,
  } = useWardrobeStore();

  // Compute filtered items inline to prevent React getSnapshot caching loops
  const filteredItems = items.filter((item) => {
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.season !== 'all' && !item.season.includes(filters.season as any)) return false;
    if (filters.occasion !== 'all' && !item.occasion.includes(filters.occasion as any)) return false;
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
  const [viewMode, setViewMode] = useState<'3d' | 'grid'>('3d');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);

  // Upload progress states
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch items on mount
  useEffect(() => {
    if (user) {
      setLoadingItems(true);
      getWardrobeItems(user.id)
        .then(setItems)
        .catch((err) => {
          addToast({ type: 'error', title: 'Failed to load wardrobe', message: err.message });
        })
        .finally(() => setLoadingItems(false));
    }
  }, [user, setItems, setLoadingItems, addToast]);

  // Handle clothing file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // Step 1: Remove Background (lightweight chroma-keying canvas fallback)
      setUploadStep('Removing background...');
      const cleanImageBlob = await removeBackground(file);

      // Convert clean image to base64 for Gemini vision analysis
      const base64Data = await fileToBase64(new File([cleanImageBlob], file.name));
      
      // Call Gemini 2.0 Flash Vision with fallback protection
      let analysis: any;
      try {
        setUploadStep('Analyzing image (AI)...');
        const mimeType = (cleanImageBlob.type === 'image/jpeg' || cleanImageBlob.type === 'image/webp')
          ? cleanImageBlob.type
          : 'image/png';
        analysis = await analyzeClothingItem(base64Data, mimeType as any);
      } catch (aiErr: any) {
        console.warn('[Wardrobe] AI analysis skipped due to error:', aiErr);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        analysis = {
          category: 'top',
          color: ['classic'],
          season: ['all'],
          occasion: ['casual'],
          description: cleanName.charAt(0).toUpperCase() + cleanName.slice(1) || 'Custom Clothing Item',
          tags: ['wardrobe'],
          brand: null,
        };
      }

      // Step 2: Upload item image to Cloudinary (with base64 fallback)
      setUploadStep('Uploading to storage...');
      const uploadFile = new File([cleanImageBlob], `${Date.now()}-${file.name}`, { type: cleanImageBlob.type || 'image/png' });
      const { url, thumbnailUrl } = await uploadClothingItem(uploadFile);

      // Step 3: Save metadata to Supabase
      setUploadStep('Saving to closet...');
      const savedItem = await saveWardrobeItem({
        userId: user.id,
        imageUrl: url,
        thumbnailUrl: thumbnailUrl,
        category: analysis.category || 'top',
        color: analysis.color || [],
        season: analysis.season || ['all'],
        occasion: analysis.occasion || ['casual'],
        brand: analysis.brand ?? undefined,
        description: analysis.description || 'Wardrobe Item',
        tags: analysis.tags || [],
      });

      // Update local store state
      useWardrobeStore.getState().addItem(savedItem);
      addToast({
        type: 'success',
        title: 'Item added successfully',
        message: `${(analysis.description || 'Item saved').slice(0, 50)}...`,
      });
      setIsUploadOpen(false);
    } catch (err: any) {
      console.error('[Wardrobe] Upload failed:', err);
      addToast({
        type: 'error',
        title: 'Upload failed',
        message: err.message || 'An error occurred while uploading. Please try again.',
      });
    } finally {
      setUploading(false);
      setUploadStep('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this item from your wardrobe?')) return;
    try {
      await deleteWardrobeItem(id);
      useWardrobeStore.getState().removeItem(id);
      setSelectedItem(null);
      addToast({ type: 'success', title: 'Item removed from closet' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to delete item', message: err.message });
    }
  };

  return (
    <PageTransition className="relative flex flex-col h-full pb-16 md:pb-0 overflow-hidden">
      {/* 3D Scene Viewport / Grid Container */}
      <div className="flex-1 w-full relative">
        {viewMode === '3d' && items.length > 0 ? (
          <ClosetScene items={filteredItems} onSelectItem={setSelectedItem} />
        ) : (
          <div className="absolute inset-0 p-6 md:p-8 overflow-y-auto scrollbar-thin">
            {filteredItems.length === 0 ? (
              <EmptyState variant={items.length === 0 ? 'wardrobe' : 'search'} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layoutId={`item-${item.id}`}
                    onClick={() => setSelectedItem(item)}
                    className="card group cursor-pointer aspect-square relative flex items-center justify-center p-4 bg-white/5 hover:bg-white/10"
                  >
                    <img
                      src={item.thumbnailUrl || item.imageUrl}
                      alt={item.description}
                      className="max-h-[85%] max-w-[85%] object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-charcoal-900/60 backdrop-blur-xs py-1 px-2 rounded-lg border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] uppercase font-semibold text-gold-400 truncate">{item.category}</span>
                      <span className="text-[10px] text-charcoal-400 font-medium">Worn: {item.wearCount}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Filter Overlay */}
      <div className="absolute top-6 left-6 right-6 z-20 flex flex-col sm:flex-row gap-3 pointer-events-none">
        {/* Search */}
        <div className="glass flex items-center px-4 py-2 w-full sm:max-w-xs pointer-events-auto shadow-glass">
          <Search size={16} className="text-charcoal-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search items, color, tags..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-ivory-300 placeholder-charcoal-400 w-full"
          />
        </div>

        {/* Categories/filters */}
        <div className="flex gap-2 flex-wrap items-center pointer-events-auto">
          {/* Category Dropdown */}
          <select
            value={filters.category}
            onChange={(e) => setFilter('category', e.target.value)}
            className="glass px-3 py-2 text-xs text-ivory-300 outline-none cursor-pointer hover:border-gold-500/20"
          >
            <option value="all">All Categories</option>
            <option value="top">Tops</option>
            <option value="bottom">Bottoms</option>
            <option value="footwear">Footwear</option>
            <option value="outerwear">Outerwear</option>
            <option value="accessory">Accessories</option>
            <option value="bag">Bags</option>
            <option value="dress">Dresses</option>
          </select>

          {/* Season Dropdown */}
          <select
            value={filters.season}
            onChange={(e) => setFilter('season', e.target.value)}
            className="glass px-3 py-2 text-xs text-ivory-300 outline-none cursor-pointer hover:border-gold-500/20"
          >
            <option value="all">All Seasons</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="autumn">Autumn</option>
            <option value="winter">Winter</option>
          </select>

          {/* View Toggle */}
          <button
            onClick={() => setViewMode(viewMode === '3d' ? 'grid' : '3d')}
            disabled={items.length === 0}
            className="glass p-2 hover:text-gold-400 hover:border-gold-500/20 text-ivory-300"
            title="Toggle View Mode"
          >
            {viewMode === '3d' ? <Grid size={16} /> : <Layers size={16} />}
          </button>

          {/* Reset Filters */}
          {(filters.category !== 'all' || filters.season !== 'all' || filters.search) && (
            <button
              onClick={resetFilters}
              className="glass p-2 text-charcoal-400 hover:text-gold-400 hover:border-gold-500/20"
              title="Reset Filters"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        {/* Action Button: Add Item */}
        <div className="sm:ml-auto pointer-events-auto">
          <Button
            variant="primary"
            size="sm"
            icon={<Upload size={14} />}
            onClick={() => setIsUploadOpen(true)}
          >
            Upload Item
          </Button>
        </div>
      </div>

      {/* Upload Modal Drawer */}
      <AnimatePresence>
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-heavy w-full max-w-md p-6 relative border-white/5"
            >
              <button
                onClick={() => setIsUploadOpen(false)}
                className="absolute top-4 right-4 text-charcoal-400 hover:text-ivory-200 transition-colors"
                disabled={uploading}
              >
                <X size={18} />
              </button>

              <h2 className="font-display text-xl font-medium mb-4 text-gradient-gold">
                Upload clothing photo
              </h2>

              {uploading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-gold-500 animate-spin" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold text-gold-400 animate-pulse">Processing...</span>
                    <span className="text-xs text-charcoal-400">{uploadStep}</span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-gold-500/40 hover:bg-white/5 transition-all group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform group-hover:border-gold-500/20">
                    <Upload size={20} className="text-charcoal-400 group-hover:text-gold-400 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-ivory-300 mb-1">
                    Drag and drop file here, or click to browse
                  </p>
                  <p className="text-xs text-charcoal-500">
                    Supports PNG, JPG, WEBP. Background will be removed.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Detail Sheet Drawer */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-40 flex justify-end bg-charcoal-950/40 backdrop-blur-xs">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={() => setSelectedItem(null)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="glass-heavy w-full max-w-md h-full relative z-10 flex flex-col border-l border-white/5 p-6 md:p-8"
            >
              {/* Close */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 left-6 p-2 rounded-xl glass hover:text-gold-400 hover:border-gold-500/20"
              >
                <X size={16} />
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDeleteItem(selectedItem.id)}
                className="absolute top-6 right-6 px-3 py-1.5 rounded-xl border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-900/20 transition-all cursor-pointer"
              >
                Delete Item
              </button>

              <div className="flex-1 flex flex-col gap-6 mt-16 overflow-y-auto scrollbar-thin pr-2">
                {/* Photo showcase */}
                <div className="aspect-square glass rounded-2xl flex items-center justify-center p-8 bg-charcoal-950/60 relative">
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.description}
                    className="max-h-full max-w-full object-contain drop-shadow-md"
                  />
                </div>

                {/* Details */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold text-gold-400 tracking-widest uppercase">
                    {selectedItem.category}
                  </span>
                  <h3 className="font-display text-xl font-medium text-ivory-200">
                    {selectedItem.description}
                  </h3>
                  {selectedItem.brand && (
                    <span className="text-xs text-charcoal-400 font-medium">Brand: {selectedItem.brand}</span>
                  )}
                </div>

                <div className="divider" />

                {/* Wear stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass p-3 flex flex-col gap-1">
                    <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Total Wears</span>
                    <span className="text-lg font-bold text-gradient-gold">{selectedItem.wearCount}</span>
                  </div>
                  <div className="glass p-3 flex flex-col gap-1">
                    <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Last Worn</span>
                    <span className="text-xs font-semibold text-ivory-300 truncate">
                      {selectedItem.lastWorn ? new Date(selectedItem.lastWorn).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Tags section */}
                <div className="flex flex-col gap-3">
                  {/* Colors */}
                  {selectedItem.color.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-charcoal-400 uppercase font-semibold flex items-center gap-1">
                        Colors
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.color.map((c) => (
                          <Badge key={c} variant="glass">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seasons */}
                  {selectedItem.season.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Seasons</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.season.map((s) => (
                          <Badge key={s} variant="gold">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Occasions */}
                  {selectedItem.occasion.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Occasions</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.occasion.map((o) => (
                          <Badge key={o} variant="ivory">{o}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  {selectedItem.tags.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-charcoal-400 uppercase font-semibold flex items-center gap-1">
                        <Tag size={10} /> Keywords
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.tags.map((t) => (
                          <Badge key={t} variant="glass" className="opacity-80">#{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
export default WardrobePage;
