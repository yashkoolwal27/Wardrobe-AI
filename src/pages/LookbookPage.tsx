import { useEffect, useState } from 'react';
import { useWardrobeStore } from '../store/wardrobeStore';
import { getSavedOutfits, deleteOutfit, toggleOutfitLike } from '../lib/db';
import { PageTransition } from '../components/layout/PageTransition';
import { use3DTilt } from '../hooks/use3DTilt';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Heart, MessageSquare, Trash2, Calendar, X, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SavedOutfit } from '../types';

function OutfitLookbookCard({
  outfit,
  onInspect,
  onDelete,
  onRecreate,
  onLike,
}: {
  outfit: SavedOutfit;
  onInspect: () => void;
  onDelete: () => void;
  onRecreate: () => void;
  onLike: () => void;
}) {
  const tilt = use3DTilt(8); // subtle 3D tilt effect on hover

  return (
    <motion.div
      layoutId={`outfit-card-${outfit.id}`}
      className="card group cursor-pointer flex flex-col relative overflow-hidden"
      style={tilt.style}
      onMouseMove={tilt.onMouseMove}
      onMouseEnter={tilt.onMouseEnter}
      onMouseLeave={tilt.onMouseLeave}
      onClick={onInspect}
    >
      {/* Outfit Image Showcase */}
      <div className="aspect-[4/5] bg-charcoal-950/60 flex items-center justify-center p-4 relative overflow-hidden">
        {outfit.generatedImageUrl ? (
          <img
            src={outfit.generatedImageUrl}
            alt={outfit.name}
            className="max-h-full max-w-full object-contain rounded-lg drop-shadow-md transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          /* Mini grid collage fallback */
          <div className="grid grid-cols-2 gap-2 w-full h-full p-2">
            {outfit.items.slice(0, 4).map((item) => (
              <div key={item.wardrobeItemId} className="glass rounded-lg flex items-center justify-center p-1.5 bg-white/2">
                <img src={item.imageUrl} className="max-h-[85%] max-w-[85%] object-contain" />
              </div>
            ))}
          </div>
        )}

        {/* Floating Category Tags */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {outfit.season && <Badge variant="ivory">{outfit.season}</Badge>}
        </div>
      </div>

      {/* Info Details */}
      <div className="p-4 flex flex-col gap-1.5 bg-white/2">
        <h4 className="font-display text-base font-semibold text-ivory-200 truncate">{outfit.name}</h4>
        <p className="text-xs text-charcoal-400 line-clamp-2 leading-relaxed">{outfit.description}</p>

        {/* Footer interactions info */}
        <div className="flex items-center justify-between mt-3 text-xs text-charcoal-400 pt-3 border-t border-white/5">
          <div className="flex gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
              className={`flex items-center gap-1 transition-colors hover:text-red-400 ${outfit.isLiked ? 'text-red-400' : ''}`}
            >
              <Heart size={14} fill={outfit.isLiked ? 'currentColor' : 'none'} />
              <span>{outfit.likes}</span>
            </button>
            <span className="flex items-center gap-1">
              <MessageSquare size={14} />
              <span>{outfit.comments.length}</span>
            </span>
          </div>

          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecreate();
              }}
              className="text-[10px] font-semibold uppercase text-gold-400 hover:text-gold-300 transition-colors"
            >
              Recreate
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-charcoal-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LookbookPage() {
  const { user, savedOutfits, setSavedOutfits, isLoadingOutfits, setLoadingOutfits, addToast } = useWardrobeStore();
  const [selectedOutfit, setSelectedOutfit] = useState<SavedOutfit | null>(null);
  const [newComment, setNewComment] = useState('');

  // Fetch Lookbook outfits on mount
  useEffect(() => {
    if (user) {
      setLoadingOutfits(true);
      getSavedOutfits(user.id)
        .then(setSavedOutfits)
        .catch((err) => addToast({ type: 'error', title: 'Failed to load lookbook', message: err.message }))
        .finally(() => setLoadingOutfits(false));
    }
  }, [user, setSavedOutfits, setLoadingOutfits, addToast]);

  const handleDeleteOutfit = async (id: string) => {
    if (!window.confirm('Delete this look from your lookbook?')) return;
    try {
      await deleteOutfit(id);
      useWardrobeStore.getState().removeSavedOutfit(id);
      if (selectedOutfit?.id === id) setSelectedOutfit(null);
      addToast({ type: 'success', title: 'Look deleted' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  };

  const handleLike = async (id: string) => {
    if (!user) return;
    try {
      const liked = await toggleOutfitLike(id, user.id);
      useWardrobeStore.getState().toggleLike(id);
      if (selectedOutfit?.id === id) {
        setSelectedOutfit((prev) =>
          prev ? { ...prev, isLiked: liked, likes: prev.likes + (liked ? 1 : -1) } : null
        );
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action failed', message: err.message });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedOutfit || !user) return;

    const comment = {
      id: Math.random().toString(36).slice(2),
      userId: user.id,
      username: user.email.split('@')[0],
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      // Mock db insertion for comments to keep code simple & responsive
      useWardrobeStore.getState().addComment(selectedOutfit.id, comment);
      setSelectedOutfit((prev) => (prev ? { ...prev, comments: [...prev.comments, comment] } : null));
      setNewComment('');
      addToast({ type: 'success', title: 'Comment added' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to comment', message: err.message });
    }
  };

  const handleRecreateLook = (outfit: SavedOutfit) => {
    // Clear and prefill outfit builder store selected slots
    const builder = useWardrobeStore.getState();
    builder.clearOutfit();
    outfit.items.forEach((item) => builder.addToOutfit(item));
    addToast({
      type: 'success',
      title: 'Look Pre-filled',
      message: 'Outfit builder has been populated with item slots.',
    });
    // Navigate to outfit builder
    window.location.hash = '/builder'; // Or use router navigation if HashRouter is active
  };

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="section-title">Lookbook</h1>
          <p className="section-subtitle">Browse and recreate your generated outfit collections.</p>
        </div>

        <div className="divider-gold" />

        {isLoadingOutfits ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/5] bg-white/5" />
                <div className="p-4 flex flex-col gap-2">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : savedOutfits.length === 0 ? (
          <EmptyState variant="lookbook" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {savedOutfits.map((outfit) => (
              <OutfitLookbookCard
                key={outfit.id}
                outfit={outfit}
                onInspect={() => setSelectedOutfit(outfit)}
                onDelete={() => handleDeleteOutfit(outfit.id)}
                onRecreate={() => handleRecreateLook(outfit)}
                onLike={() => handleLike(outfit.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Outfit Inspector Slide-out Drawer */}
      <AnimatePresence>
        {selectedOutfit && (
          <div className="fixed inset-0 z-40 flex justify-end bg-charcoal-950/40 backdrop-blur-xs">
            <div className="absolute inset-0" onClick={() => setSelectedOutfit(null)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="glass-heavy w-full max-w-md h-full relative z-10 flex flex-col border-l border-white/5 p-6 md:p-8"
            >
              {/* Close */}
              <button
                onClick={() => setSelectedOutfit(null)}
                className="absolute top-6 left-6 p-2 rounded-xl glass hover:text-gold-400 hover:border-gold-500/20"
              >
                <X size={16} />
              </button>

              <div className="flex-1 flex flex-col gap-6 mt-16 overflow-y-auto scrollbar-thin pr-2">
                {/* Outfit photo showcase */}
                <div className="aspect-[4/5] glass rounded-2xl flex items-center justify-center p-4 bg-charcoal-950/60 relative overflow-hidden">
                  {selectedOutfit.generatedImageUrl ? (
                    <img
                      src={selectedOutfit.generatedImageUrl}
                      alt={selectedOutfit.name}
                      className="max-h-full max-w-full object-contain rounded-xl drop-shadow-md"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 w-full p-2">
                      {selectedOutfit.items.map((item) => (
                        <div key={item.wardrobeItemId} className="glass rounded-xl flex items-center justify-center p-2 bg-charcoal-950/40">
                          <img src={item.imageUrl} className="max-h-[85%] max-w-[85%] object-contain" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Details info */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    {selectedOutfit.occasion && <Badge variant="gold">{selectedOutfit.occasion}</Badge>}
                    {selectedOutfit.season && <Badge variant="ivory">{selectedOutfit.season}</Badge>}
                  </div>
                  <h3 className="font-display text-xl font-medium text-ivory-200 mt-2">
                    {selectedOutfit.name}
                  </h3>
                  <p className="text-xs text-charcoal-400 flex items-center gap-1.5">
                    <Calendar size={12} /> Styled on {new Date(selectedOutfit.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-charcoal-400 leading-relaxed italic mt-2">
                    "{selectedOutfit.description}"
                  </p>
                </div>

                <div className="divider" />

                {/* Styling tips */}
                {selectedOutfit.stylingTips && selectedOutfit.stylingTips.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Styling Narrative Tips</span>
                    <div className="flex flex-col gap-2">
                      {selectedOutfit.stylingTips.map((tip, idx) => (
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

                {/* Comments box */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Discussion</span>
                  
                  {/* comment list */}
                  <div className="flex flex-col gap-3 max-h-40 overflow-y-auto scrollbar-thin">
                    {selectedOutfit.comments.length === 0 ? (
                      <span className="text-xs text-charcoal-500">No comments yet. Start the conversation!</span>
                    ) : (
                      selectedOutfit.comments.map((comment) => (
                        <div key={comment.id} className="glass p-3 flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-semibold text-gold-400">@{comment.username}</span>
                            <span className="text-charcoal-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span className="text-xs text-ivory-300">{comment.text}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* comment input form */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="input-glass"
                    />
                    <Button type="submit" variant="glass" className="px-3">
                      <Send size={14} />
                    </Button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
export default LookbookPage;
