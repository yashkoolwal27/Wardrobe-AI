import { useState, useEffect } from 'react';
import { useWardrobeStore } from '../store/wardrobeStore';
import { getWardrobeItems, saveOutfit } from '../lib/db';
import { uploadGeneratedOutfit } from '../lib/storage';
import { generateOutfitImage } from '../lib/gemini';
import { PageTransition } from '../components/layout/PageTransition';
import { OutfitStageScene } from '../scenes/OutfitStageScene';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Sparkles, Trash2, Save, X, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingCategory, SavedOutfit } from '../types';

const CATEGORIES: { id: ClothingCategory; label: string }[] = [
  { id: 'accessory', label: 'Accessories' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'top',       label: 'Tops' },
  { id: 'bottom',    label: 'Bottoms' },
  { id: 'footwear',  label: 'Footwear' },
  { id: 'bag',       label: 'Bags' },
];

export function OutfitBuilderPage() {
  const {
    user,
    items,
    setItems,
    selectedItems,
    addToOutfit,
    removeFromOutfit,
    clearOutfit,
    isGenerating,
    setGenerating,
    setGenerationError,
    lastGeneratedOutfit,
    setLastGeneratedOutfit,
    addToast,
  } = useWardrobeStore();

  const [activeCategory, setActiveCategory] = useState<ClothingCategory>('top');
  const [outfitName, setOutfitName] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [revealResult, setRevealResult] = useState(false);
  const [mobileTab, setMobileTab] = useState<'closet' | 'mannequin'>('closet');

  // Fetch wardrobe items if needed
  useEffect(() => {
    if (user && items.length === 0) {
      getWardrobeItems(user.id).then(setItems);
    }
  }, [user, items.length, setItems]);

  // Filter wardrobe items for active tab
  const categoryItems = items.filter((item) => item.category === activeCategory);

  // Trigger Gemini Outfit Generation
  const handleGenerateOutfit = async () => {
    if (selectedItems.length === 0) {
      addToast({ type: 'warning', title: 'Empty stage', message: 'Add at least one clothing item to style.' });
      return;
    }

    setGenerating(true);
    setGenerationError(null);
    setRevealResult(false);

    try {
      // Gather base64 images of selected items
      const selectedItemDetails = selectedItems.map((selected) => {
        const item = items.find((i) => i.id === selected.wardrobeItemId);
        return {
          url: item?.imageUrl || '',
          category: selected.category,
          label: item?.description || 'Clothing Item',
        };
      });

      // Download and convert images to base64 for Gemini payload
      const imagePayloads = await Promise.all(
        selectedItemDetails.map(async (detail) => {
          const res = await fetch(detail.url);
          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });
          return { base64, mimeType: blob.type, label: detail.label };
        })
      );

      // Call Gemini compositing/styling engine
      const result = await generateOutfitImage(imagePayloads);

      // Store results in temporary local lookbook object
      const outfitId = Math.random().toString(36).slice(2);
      const mockSavedOutfit: SavedOutfit = {
        id: outfitId,
        userId: user?.id || '',
        name: '',
        items: selectedItems,
        generatedImageUrl: result.generatedImageUrl || undefined,
        description: result.description,
        stylingTips: result.stylingTips,
        occasion: result.occasion,
        season: result.season,
        likes: 0,
        comments: [],
        createdAt: new Date().toISOString(),
      };

      if (result.generatedImageBlob) {
        // Cache blob temporarily in order to upload on save
        (mockSavedOutfit as any)._imageBlob = result.generatedImageBlob;
      }

      setLastGeneratedOutfit(mockSavedOutfit);
      setRevealResult(true);
      addToast({ type: 'success', title: 'AI Outfit Generated', message: result.description.slice(0, 60) + '...' });
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'Failed to generate outfit');
      addToast({ type: 'error', title: 'Generation failed', message: err.message });
    } finally {
      setGenerating(false);
    }
  };

  // Save generated outfit to Supabase Lookbook
  const handleSaveOutfit = async () => {
    if (!outfitName.trim()) {
      addToast({ type: 'warning', title: 'Name required', message: 'Please name this look before saving.' });
      return;
    }
    if (!lastGeneratedOutfit) return;

    setSaveLoading(true);
    try {
      let finalImageUrl = lastGeneratedOutfit.generatedImageUrl;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const imageBlob = (lastGeneratedOutfit as any)._imageBlob as Blob | undefined;

      // If we have an AI-generated image, upload it to Firebase Storage for permanence
      if (imageBlob) {
        addToast({ type: 'info', title: 'Saving media...', message: 'Uploading look preview to storage' });
        const uploadedUrl = await uploadGeneratedOutfit(imageBlob, lastGeneratedOutfit.id);
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const savedLook = await saveOutfit({
        ...lastGeneratedOutfit,
        name: outfitName,
        generatedImageUrl: finalImageUrl,
      });

      useWardrobeStore.getState().addSavedOutfit(savedLook);
      addToast({ type: 'success', title: 'Look saved!', message: 'View it anytime in your Lookbook.' });
      
      // Clean outfit builder
      clearOutfit();
      setOutfitName('');
      setRevealResult(false);
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', title: 'Save failed', message: err.message });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <PageTransition className="p-0 md:p-0 flex flex-col md:flex-row h-full overflow-hidden">
      
      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex w-full p-3 border-b border-white/5 bg-charcoal-900/60 backdrop-blur-md sticky top-0 z-30 justify-center">
        <div className="flex bg-charcoal-950/60 p-1 rounded-xl border border-white/5 w-full max-w-sm">
          <button
            onClick={() => setMobileTab('closet')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mobileTab === 'closet'
                ? 'bg-gold-500/10 border border-gold-500/20 text-gold-400 shadow-md'
                : 'text-charcoal-400'
            }`}
          >
            Closet Items
          </button>
          <button
            onClick={() => setMobileTab('mannequin')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'mannequin'
                ? 'bg-gold-500/10 border border-gold-500/20 text-gold-400 shadow-md'
                : 'text-charcoal-400'
            }`}
          >
            Mannequin Stage
            {selectedItems.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Left panel: Wardrobe Closet Item Browser */}
      <GlassPanel className={`w-full md:w-80 border-r border-white/5 flex flex-col z-10 shrink-0 ${
        mobileTab === 'closet' ? 'flex h-full pb-16 md:pb-0' : 'hidden md:flex md:h-full'
      }`}>
        {/* Tabs */}
        <div className="flex gap-1.5 p-4 border-b border-white/5 overflow-x-auto scrollbar-thin">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors
                ${activeCategory === cat.id
                  ? 'bg-gold-500/10 border border-gold-500/20 text-gold-400'
                  : 'text-charcoal-400 hover:text-ivory-300'
                }
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* List of active category items */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {categoryItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Star size={28} className="text-charcoal-700 mb-2" />
              <span className="text-xs text-charcoal-500">No {activeCategory}s in closet.</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {categoryItems.map((item) => {
                const isSelected = selectedItems.some((s) => s.wardrobeItemId === item.id);
                return (
                  <motion.div
                    key={item.id}
                    layoutId={`selector-${item.id}`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      addToOutfit({
                        wardrobeItemId: item.id,
                        category: item.category,
                        imageUrl: item.imageUrl,
                      })
                    }
                    className={`
                      aspect-square rounded-xl glass p-2 flex items-center justify-center relative cursor-pointer group
                      ${isSelected ? 'border-gold-500/40 bg-gold-500/5' : 'hover:border-white/15'}
                    `}
                  >
                    <img
                      src={item.thumbnailUrl || item.imageUrl}
                      alt={item.description}
                      className="max-h-[85%] max-w-[85%] object-contain drop-shadow"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-gold-500 flex items-center justify-center text-charcoal-900">
                        <Star size={8} fill="currentColor" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selection Tray HUD */}
        <div className="p-4 border-t border-white/5 flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-charcoal-400 uppercase font-semibold">Active Look Slots</span>
            <button onClick={clearOutfit} className="text-charcoal-500 hover:text-red-400 transition-colors flex items-center gap-1 font-semibold">
              <Trash2 size={12} /> Clear
            </button>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {CATEGORIES.map((cat) => {
              const selected = selectedItems.find((s) => s.category === cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => selected && removeFromOutfit(cat.id)}
                  className={`
                    aspect-square rounded-lg border flex items-center justify-center relative cursor-pointer group
                    ${selected
                      ? 'border-gold-500/30 bg-gold-500/5'
                      : 'border-white/5 bg-white/2 hover:border-white/10'
                    }
                  `}
                  title={selected ? `Remove ${cat.label}` : `Empty ${cat.label}`}
                >
                  {selected ? (
                    <img src={selected.imageUrl} className="max-h-[85%] max-w-[85%] object-contain" />
                  ) : (
                    <span className="text-[9px] uppercase font-semibold text-charcoal-600 truncate px-0.5">
                      {cat.id.slice(0, 3)}
                    </span>
                  )}
                  {selected && (
                    <div className="absolute inset-0 bg-red-950/75 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={12} className="text-red-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </GlassPanel>

      {/* Center panel: 3D Stage scene */}
      <div className={`flex-1 relative ${
        mobileTab === 'mannequin' ? 'flex h-full min-h-[350px] pb-16 md:pb-0' : 'hidden md:flex md:h-full'
      }`}>
        <OutfitStageScene selectedItems={selectedItems} isGenerating={isGenerating} />
        
        {/* Style generate floating controls */}
        {selectedItems.length > 0 && !isGenerating && !revealResult && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <Button
              variant="primary"
              size="lg"
              icon={<Sparkles size={16} />}
              onClick={handleGenerateOutfit}
            >
              Generate AI Outfit
            </Button>
          </div>
        )}
      </div>

      {/* Right panel: Styled Look Reveal Drawer */}
      <AnimatePresence>
        {revealResult && lastGeneratedOutfit && (
          <div className="fixed inset-0 z-30 flex justify-end bg-charcoal-950/30 backdrop-blur-xs">
            {/* Click outside to close drawer */}
            <div className="absolute inset-0" onClick={() => setRevealResult(false)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="glass-heavy w-full max-w-md h-full relative z-10 flex flex-col border-l border-white/5 p-6 md:p-8"
            >
              <button
                onClick={() => setRevealResult(false)}
                className="absolute top-6 left-6 p-2 rounded-xl glass hover:text-gold-400 hover:border-gold-500/20"
              >
                <X size={16} />
              </button>

              <div className="flex-1 flex flex-col gap-6 mt-16 overflow-y-auto scrollbar-thin pr-2">
                {/* Generation result image showcase */}
                <div className="aspect-[4/5] glass rounded-2xl flex items-center justify-center bg-charcoal-950/70 p-4 relative overflow-hidden">
                  {lastGeneratedOutfit.generatedImageUrl ? (
                    <img
                      src={lastGeneratedOutfit.generatedImageUrl}
                      alt="Generated outfit result"
                      className="max-h-full max-w-full object-contain rounded-xl drop-shadow-lg"
                    />
                  ) : (
                    /* Fallback stylized collage cards grid */
                    <div className="grid grid-cols-2 gap-4 w-full h-full p-4 overflow-y-auto scrollbar-thin">
                      {lastGeneratedOutfit.items.map((item) => (
                        <div key={item.wardrobeItemId} className="glass aspect-square flex items-center justify-center p-2">
                          <img src={item.imageUrl} className="max-h-[85%] max-w-[85%] object-contain" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Narrative description */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-2 items-center">
                    {lastGeneratedOutfit.occasion && (
                      <Badge variant="gold">{lastGeneratedOutfit.occasion}</Badge>
                    )}
                    {lastGeneratedOutfit.season && (
                      <Badge variant="ivory">{lastGeneratedOutfit.season}</Badge>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-medium text-ivory-200 mt-2">
                    Styling Narrative
                  </h3>
                  <p className="text-sm text-charcoal-400 leading-relaxed italic">
                    "{lastGeneratedOutfit.description}"
                  </p>
                </div>

                {/* Styling tips */}
                {lastGeneratedOutfit.stylingTips && lastGeneratedOutfit.stylingTips.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Styling Tips</span>
                    <div className="flex flex-col gap-2.5">
                      {lastGeneratedOutfit.stylingTips.map((tip, idx) => (
                        <div key={idx} className="flex gap-3 items-start text-xs text-ivory-300">
                          <span className="w-5 h-5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <p className="leading-relaxed mt-0.5">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="divider" />

                {/* Save Lookbook form */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Save to Lookbook</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Name this look (e.g. Autumn Gala)"
                      value={outfitName}
                      onChange={(e) => setOutfitName(e.target.value)}
                      className="input-glass"
                    />
                    <Button
                      variant="primary"
                      loading={saveLoading}
                      icon={<Save size={14} />}
                      onClick={handleSaveOutfit}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
export default OutfitBuilderPage;
