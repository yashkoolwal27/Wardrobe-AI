import { useEffect, useState, useRef } from 'react';
import { useWardrobeStore } from '../store/wardrobeStore';
import { getWardrobeItems, saveWardrobeItem, updateWardrobeItem, deleteWardrobeItem } from '../lib/db';
import { uploadClothingItem, fileToBase64 } from '../lib/storage';
import { removeBackground } from '../lib/bgRemoval';
import { analyzeClothingItem } from '../lib/gemini';
import { PageTransition } from '../components/layout/PageTransition';
import { ClosetScene } from '../scenes/ClosetScene';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Upload, Search, RotateCcw, X, Grid, Layers, Check, Edit2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { WardrobeItem, ClothingCategory, Season, Occasion } from '../types';

const CATEGORY_OPTIONS: { id: ClothingCategory; label: string }[] = [
  { id: 'top',       label: 'Top' },
  { id: 'bottom',    label: 'Bottom' },
  { id: 'footwear',  label: 'Footwear' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'accessory', label: 'Accessory' },
  { id: 'bag',       label: 'Bag' },
  { id: 'dress',     label: 'Dress' },
];

const SEASON_OPTIONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const OCCASION_OPTIONS: Occasion[] = ['casual', 'formal', 'business', 'sport', 'evening', 'beach', 'outdoor'];

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

  // Compute filtered items inline
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

  // Upload modal states
  const [uploadStep, setUploadStep] = useState<'select' | 'processing' | 'review'>('select');
  const [processingStatus, setProcessingStatus] = useState('');
  const [savingItem, setSavingItem] = useState(false);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [cleanBlob, setCleanBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Editable item fields for review modal
  const [itemCategory, setItemCategory] = useState<ClothingCategory>('top');
  const [itemDescription, setItemDescription] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemSeasons, setItemSeasons] = useState<Season[]>(['all']);
  const [itemOccasions, setItemOccasions] = useState<Occasion[]>(['casual']);

  // Editing existing item state
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editCategory, setEditCategory] = useState<ClothingCategory>('top');
  const [editDescription, setEditDescription] = useState('');

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

  // Handle file selection & initiate processing
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setRawFile(file);
    setUploadStep('processing');

    try {
      // Step 1: Gemini AI Vision Analysis & Bounding Box Detection
      setProcessingStatus('Analyzing clothing & detecting item (AI)...');
      const base64Data = await fileToBase64(file);
      const mime = (file.type === 'image/jpeg' || file.type === 'image/webp') ? file.type : 'image/png';

      let analysis: any;
      try {
        analysis = await analyzeClothingItem(base64Data, mime as any);
      } catch (aiErr) {
        console.warn('[Wardrobe] AI analysis fallback:', aiErr);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        analysis = {
          category: file.name.toLowerCase().includes('pant') || file.name.toLowerCase().includes('jean') || file.name.toLowerCase().includes('trouser') ? 'bottom' : 'top',
          color: ['neutral'],
          season: ['all'],
          occasion: ['casual'],
          description: cleanName.charAt(0).toUpperCase() + cleanName.slice(1) || 'Clothing Item',
          tags: ['clothing'],
          brand: '',
        };
      }

      // Step 2: Extract clothing item, crop to bounding box & remove background
      setProcessingStatus('Extracting cloth & removing background...');
      const cleaned = await removeBackground(file, analysis.box_2d);
      setCleanBlob(cleaned);

      const localPreview = URL.createObjectURL(cleaned);
      setPreviewUrl(localPreview);

      // Pre-fill review form fields
      setItemCategory(analysis.category || 'top');
      setItemDescription(analysis.description || file.name.replace(/\.[^/.]+$/, ''));
      setItemBrand(analysis.brand || '');
      setItemSeasons(analysis.season || ['all']);
      setItemOccasions(analysis.occasion || ['casual']);

      // Move to review step so user CAN EDIT / SELECT CATEGORY
      setUploadStep('review');
    } catch (err: any) {
      console.error('[Wardrobe] Processing error:', err);
      addToast({ type: 'error', title: 'Processing error', message: err.message });
      setUploadStep('select');
    }
  };

  // Save the reviewed item to database
  const handleSaveReviewedItem = async () => {
    if (!cleanBlob || !rawFile || !user) return;

    setSavingItem(true);
    try {
      const uploadFile = new File([cleanBlob], `${Date.now()}-${rawFile.name}`, { type: cleanBlob.type || 'image/png' });
      const { url, thumbnailUrl } = await uploadClothingItem(uploadFile);

      const savedItem = await saveWardrobeItem({
        userId: user.id,
        imageUrl: url,
        thumbnailUrl,
        category: itemCategory,
        color: ['classic'],
        season: itemSeasons,
        occasion: itemOccasions,
        brand: itemBrand || undefined,
        description: itemDescription.trim() || 'Clothing Item',
        tags: [itemCategory, ...itemSeasons],
      });

      useWardrobeStore.getState().addItem(savedItem);
      addToast({
        type: 'success',
        title: 'Item added to closet!',
        message: `${itemDescription} saved under ${itemCategory.toUpperCase()}.`,
      });

      closeUploadModal();
    } catch (err: any) {
      console.error('[Wardrobe] Save error:', err);
      addToast({ type: 'error', title: 'Failed to save item', message: err.message });
    } finally {
      setSavingItem(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadOpen(false);
    setUploadStep('select');
    setRawFile(null);
    setCleanBlob(null);
    setPreviewUrl('');
    setProcessingStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  // Update category of existing item
  const handleSaveItemEdit = async () => {
    if (!selectedItem) return;
    try {
      await updateWardrobeItem(selectedItem.id, {
        category: editCategory,
        description: editDescription.trim() || selectedItem.description,
      });

      useWardrobeStore.getState().updateItem(selectedItem.id, {
        category: editCategory,
        description: editDescription.trim() || selectedItem.description,
      });

      setSelectedItem((prev) => prev ? { ...prev, category: editCategory, description: editDescription.trim() || prev.description } : null);
      setIsEditingItem(false);
      addToast({ type: 'success', title: 'Item updated', message: `Category changed to ${editCategory.toUpperCase()}` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update failed', message: err.message });
    }
  };

  const toggleSeason = (s: Season) => {
    setItemSeasons((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const toggleOccasion = (o: Occasion) => {
    setItemOccasions((prev) =>
      prev.includes(o) ? prev.filter((item) => item !== o) : [...prev, o]
    );
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
                    onClick={() => {
                      setSelectedItem(item);
                      setEditCategory(item.category);
                      setEditDescription(item.description);
                      setIsEditingItem(false);
                    }}
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

          <button
            onClick={() => setViewMode(viewMode === '3d' ? 'grid' : '3d')}
            disabled={items.length === 0}
            className="glass p-2 hover:text-gold-400 hover:border-gold-500/20 text-ivory-300"
            title="Toggle View Mode"
          >
            {viewMode === '3d' ? <Grid size={16} /> : <Layers size={16} />}
          </button>

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

      {/* Upload & Category Selection Modal */}
      <AnimatePresence>
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-heavy w-full max-w-lg p-6 relative border-white/10 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <button
                onClick={closeUploadModal}
                className="absolute top-4 right-4 text-charcoal-400 hover:text-ivory-200 transition-colors"
                disabled={savingItem}
              >
                <X size={18} />
              </button>

              <h2 className="font-display text-xl font-medium mb-4 text-gradient-gold">
                {uploadStep === 'review' ? 'Choose Category & Details' : 'Upload Clothing Item'}
              </h2>

              {uploadStep === 'select' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-white/15 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-gold-500/40 hover:bg-white/5 transition-all group"
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
                    Drag and drop clothing photo, or click to browse
                  </p>
                  <p className="text-xs text-charcoal-500">
                    Supports PNG, JPG, WEBP. You will choose the category next.
                  </p>
                </div>
              )}

              {uploadStep === 'processing' && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-gold-500 animate-spin" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold text-gold-400 animate-pulse">Processing Photo...</span>
                    <span className="text-xs text-charcoal-400">{processingStatus}</span>
                  </div>
                </div>
              )}

              {uploadStep === 'review' && (
                <div className="flex flex-col gap-5">
                  {/* Photo cutout preview */}
                  <div className="aspect-square max-h-44 glass rounded-xl flex items-center justify-center p-4 bg-charcoal-950/60 mx-auto">
                    <img src={previewUrl} className="max-h-full max-w-full object-contain drop-shadow" alt="Preview" />
                  </div>

                  {/* Explicit Category Selection */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                      Select Category *
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {CATEGORY_OPTIONS.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setItemCategory(cat.id)}
                          className={`
                            py-2 px-2 rounded-xl text-xs font-semibold uppercase border transition-all flex items-center justify-center gap-1
                            ${itemCategory === cat.id
                              ? 'bg-gold-500/20 border-gold-500 text-gold-400 shadow-gold-glow-sm'
                              : 'bg-white/2 border-white/5 text-charcoal-400 hover:border-white/15 hover:text-ivory-300'
                            }
                          `}
                        >
                          {itemCategory === cat.id && <Check size={12} />}
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">Description / Title</label>
                    <input
                      type="text"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="E.g. Black Slim Fit Denim Jeans"
                      className="input-glass"
                    />
                  </div>

                  {/* Seasons Multi-select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">Seasons</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SEASON_OPTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSeason(s)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase border transition-all ${
                            itemSeasons.includes(s)
                              ? 'bg-gold-500/15 border-gold-500/30 text-gold-400'
                              : 'bg-white/2 border-white/5 text-charcoal-500'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Occasion Multi-select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">Occasion</label>
                    <div className="flex flex-wrap gap-1.5">
                      {OCCASION_OPTIONS.map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => toggleOccasion(o)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize border transition-all ${
                            itemOccasions.includes(o)
                              ? 'bg-ivory-200/15 border-ivory-200/30 text-ivory-200'
                              : 'bg-white/2 border-white/5 text-charcoal-500'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="glass"
                      onClick={closeUploadModal}
                      className="flex-1"
                      disabled={savingItem}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSaveReviewedItem}
                      loading={savingItem}
                      className="flex-1"
                    >
                      Add to Closet
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Detail Sheet Drawer & Category Editor */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-40 flex justify-end bg-charcoal-950/40 backdrop-blur-xs">
            <div className="absolute inset-0" onClick={() => setSelectedItem(null)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="glass-heavy w-full max-w-md h-full relative z-10 flex flex-col border-l border-white/5 p-6 md:p-8"
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 left-6 p-2 rounded-xl glass hover:text-gold-400 hover:border-gold-500/20"
              >
                <X size={16} />
              </button>

              <button
                onClick={() => handleDeleteItem(selectedItem.id)}
                className="absolute top-6 right-6 px-3 py-1.5 rounded-xl border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-900/20 transition-all cursor-pointer"
              >
                Delete Item
              </button>

              <div className="flex-1 flex flex-col gap-6 mt-16 overflow-y-auto scrollbar-thin pr-2">
                <div className="aspect-square glass rounded-2xl flex items-center justify-center p-8 bg-charcoal-950/60 relative">
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.description}
                    className="max-h-full max-w-full object-contain drop-shadow-md"
                  />
                </div>

                {isEditingItem ? (
                  <div className="flex flex-col gap-3 p-4 glass rounded-xl border-gold-500/20">
                    <span className="text-xs font-semibold text-gold-400 uppercase">Edit Category & Details</span>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-charcoal-400 uppercase font-semibold">Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as ClothingCategory)}
                        className="input-glass text-xs"
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-charcoal-400 uppercase font-semibold">Description</label>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="input-glass text-xs"
                      />
                    </div>

                    <div className="flex gap-2 mt-1">
                      <Button size="sm" variant="glass" onClick={() => setIsEditingItem(false)}>Cancel</Button>
                      <Button size="sm" variant="primary" onClick={handleSaveItemEdit}>Save Changes</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gold-400 tracking-widest uppercase">
                        {selectedItem.category}
                      </span>
                      <button
                        onClick={() => {
                          setEditCategory(selectedItem.category);
                          setEditDescription(selectedItem.description);
                          setIsEditingItem(true);
                        }}
                        className="text-xs text-charcoal-400 hover:text-gold-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 size={12} /> Change Category
                      </button>
                    </div>
                    <h3 className="font-display text-xl font-medium text-ivory-200">
                      {selectedItem.description}
                    </h3>
                    {selectedItem.brand && (
                      <span className="text-xs text-charcoal-400 font-medium">Brand: {selectedItem.brand}</span>
                    )}
                  </div>
                )}

                <div className="divider" />

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

                <div className="flex flex-col gap-3">
                  {selectedItem.color.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Colors</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.color.map((c) => (
                          <Badge key={c} variant="glass">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

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
