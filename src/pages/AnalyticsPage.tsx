import { useState, useEffect } from 'react';
import { useWardrobeStore } from '../store/wardrobeStore';
import { getWearLogs, logWornOutfit, getWardrobeItems } from '../lib/db';
import { PageTransition } from '../components/layout/PageTransition';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { BarChart2, DollarSign, Plus, Clipboard, CloudSun, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Occasion, WearLog } from '../types';

export function AnalyticsPage() {
  const { user, items, setItems, wearLogs, setWearLogs, addWearLog, addToast } = useWardrobeStore();

  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [occasion, setOccasion] = useState<Occasion>('casual');
  const [weather, setWeather] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch data on mount
  useEffect(() => {
    if (user) {
      if (items.length === 0) getWardrobeItems(user.id).then(setItems);
      getWearLogs(user.id)
        .then(setWearLogs)
        .catch((err) => addToast({ type: 'error', title: 'Failed to load wear logs', message: err.message }));
    }
  }, [user, setItems, setWearLogs, items.length, addToast]);

  const handleLogWear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0 || !user) {
      addToast({ type: 'warning', title: 'No items selected', message: 'Please select at least one item you wore.' });
      return;
    }

    setLogLoading(true);
    try {
      const payload = {
        userId: user.id,
        itemIds: selectedItems,
        wornAt: new Date(date).toISOString(),
        occasion,
        weather: weather || undefined,
        notes: notes || undefined,
      };

      await logWornOutfit(payload);
      
      const newLog: WearLog = {
        id: Math.random().toString(36).slice(2),
        ...payload,
      };
      
      addWearLog(newLog);

      // Increment wear counts in local store
      selectedItems.forEach((id) => {
        const item = items.find((i) => i.id === id);
        if (item) {
          useWardrobeStore.getState().updateItem(id, {
            wearCount: item.wearCount + 1,
            lastWorn: new Date().toISOString(),
          });
        }
      });

      addToast({ type: 'success', title: 'Wear logged', message: 'Stats updated!' });
      setIsLogOpen(false);
      setSelectedItems([]);
      setWeather('');
      setNotes('');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to log wear', message: err.message });
    } finally {
      setLogLoading(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ─── Analytics calculations ─────────────────────────────────
  const totalWears = wearLogs.length;
  
  // Sort items by wear count
  const sortedItems = [...items].sort((a, b) => b.wearCount - a.wearCount);
  const mostWornItem = sortedItems[0]?.wearCount > 0 ? sortedItems[0] : null;
  const leastWornItem = [...items]
    .filter((i) => i.wearCount > 0)
    .sort((a, b) => a.wearCount - b.wearCount)[0] || null;

  // Cost per wear: sum(price) / sum(wears)
  const itemsWithPrice = items.filter((i) => i.price !== undefined);
  const totalSpent = itemsWithPrice.reduce((sum, i) => sum + (i.price ?? 0), 0);
  const totalWearsForPriced = itemsWithPrice.reduce((sum, i) => sum + i.wearCount, 0);
  const avgCostPerWear = totalWearsForPriced > 0 ? totalSpent / totalWearsForPriced : 0;

  // Category wears map for simple SVG chart
  const categoryWears: Record<string, number> = {};
  items.forEach((item) => {
    categoryWears[item.category] = (categoryWears[item.category] || 0) + item.wearCount;
  });
  
  const chartData = Object.entries(categoryWears).map(([category, wears]) => ({
    category,
    wears,
  })).sort((a, b) => b.wears - a.wears);

  const maxWears = Math.max(...chartData.map((d) => d.wears), 1);

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="section-title">Analytics</h1>
            <p className="section-subtitle">Track clothing utilization and cost-per-wear stats.</p>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setIsLogOpen(true)}
            disabled={items.length === 0}
          >
            Log Worn Outfit
          </Button>
        </div>

        <div className="divider-gold" />

        {items.length === 0 ? (
          <EmptyState variant="analytics" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Stat Cards Grid */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <GlassPanel className="p-5 border-white/5 flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
                  <Clipboard size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-charcoal-400 font-semibold uppercase">Total Logged Wears</span>
                  <span className="text-xl font-bold text-gradient-gold">{totalWears}</span>
                </div>
              </GlassPanel>

              <GlassPanel className="p-5 border-white/5 flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DollarSign size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-charcoal-400 font-semibold uppercase">Avg. Cost Per Wear</span>
                  <span className="text-xl font-bold text-ivory-200">
                    ${avgCostPerWear.toFixed(2)}
                  </span>
                </div>
              </GlassPanel>

              <GlassPanel className="p-5 border-white/5 flex flex-col gap-3">
                <span className="text-xs text-charcoal-400 font-semibold uppercase">Utilization Peak</span>
                {mostWornItem ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 glass rounded-lg flex items-center justify-center p-1.5 shrink-0 bg-charcoal-950/40">
                      <img src={mostWornItem.imageUrl} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-ivory-200 truncate">{mostWornItem.description}</span>
                      <span className="text-[10px] text-gold-400 font-medium uppercase mt-0.5">
                        Worn {mostWornItem.wearCount} times
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-charcoal-500 italic">No wear data recorded.</span>
                )}
              </GlassPanel>

              <GlassPanel className="p-5 border-white/5 flex flex-col gap-3">
                <span className="text-xs text-charcoal-400 font-semibold uppercase">Underutilized Item</span>
                {leastWornItem ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 glass rounded-lg flex items-center justify-center p-1.5 shrink-0 bg-charcoal-950/40">
                      <img src={leastWornItem.imageUrl} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-ivory-200 truncate">{leastWornItem.description}</span>
                      <span className="text-[10px] text-amber-500 font-medium uppercase mt-0.5">
                        Worn {leastWornItem.wearCount} times
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-charcoal-500 italic">No wear data recorded.</span>
                )}
              </GlassPanel>
            </div>

            {/* Custom SVG Charts panel */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <GlassPanel variant="heavy" className="p-6 border-white/5 flex flex-col gap-6">
                <h3 className="font-display text-base font-semibold text-gradient-gold flex items-center gap-2">
                  <BarChart2 size={16} /> Category Wear Distribution
                </h3>

                {chartData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-charcoal-500 text-xs italic">
                    Log wears to see category distribution.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {chartData.map((data) => {
                      const percentage = (data.wears / maxWears) * 100;
                      return (
                        <div key={data.category} className="flex flex-col gap-1 text-xs">
                          <div className="flex justify-between text-charcoal-400">
                            <span className="font-semibold uppercase tracking-wider text-[10px] text-ivory-300">
                              {data.category}
                            </span>
                            <span className="font-bold text-gold-400">{data.wears} wears</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassPanel>

              {/* Wear History Log Feed */}
              <GlassPanel className="p-6 border-white/5 flex flex-col gap-4">
                <span className="text-[10px] text-charcoal-400 uppercase font-semibold">Wear History Feed</span>
                <div className="flex flex-col gap-3 max-h-48 overflow-y-auto scrollbar-thin">
                  {wearLogs.length === 0 ? (
                    <span className="text-xs text-charcoal-500 italic">No wear logs logged yet.</span>
                  ) : (
                    wearLogs.map((log) => (
                      <div key={log.id} className="glass p-3.5 flex justify-between items-center text-xs border-white/5">
                        <div className="flex flex-col gap-1 min-w-0 pr-4">
                          <div className="flex gap-1.5 flex-wrap items-center">
                            {log.occasion && <Badge variant="gold" className="text-[9px] py-0">{log.occasion}</Badge>}
                            {log.weather && (
                              <span className="text-[10px] text-charcoal-400 flex items-center gap-1">
                                <CloudSun size={10} /> {log.weather}
                              </span>
                            )}
                          </div>
                          <p className="text-ivory-300 font-medium truncate">
                            {log.itemIds.length} item{log.itemIds.length > 1 ? 's' : ''} worn
                          </p>
                          {log.notes && <p className="text-[10px] text-charcoal-400 italic">"{log.notes}"</p>}
                        </div>
                        <span className="text-[10px] text-charcoal-500 shrink-0 font-semibold">
                          {new Date(log.wornAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </GlassPanel>
            </div>
          </div>
        )}
      </div>

      {/* Log Wear Modal Drawer */}
      <AnimatePresence>
        {isLogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-heavy w-full max-w-md p-6 relative border-white/5 flex flex-col max-h-[85vh]"
            >
              <button
                onClick={() => setIsLogOpen(false)}
                className="absolute top-4 right-4 text-charcoal-400 hover:text-ivory-200 transition-colors cursor-pointer"
                disabled={logLoading}
              >
                <X size={18} />
              </button>

              <h2 className="font-display text-xl font-medium mb-4 text-gradient-gold">
                Log Worn Outfit
              </h2>

              <form onSubmit={handleLogWear} className="flex flex-col gap-4 overflow-y-auto scrollbar-thin pr-1">
                {/* Select Closet Items */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">Select Worn Items</label>
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto scrollbar-thin p-1 border border-white/5 rounded-xl bg-white/2">
                    {items.map((item) => {
                      const isSelected = selectedItems.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItemSelection(item.id)}
                          className={`
                            aspect-square rounded-lg border flex items-center justify-center p-1.5 relative cursor-pointer
                            ${isSelected
                              ? 'border-gold-500 bg-gold-500/10'
                              : 'border-white/5 hover:border-white/10 bg-charcoal-950/20'
                            }
                          `}
                        >
                          <img src={item.thumbnailUrl || item.imageUrl} className="max-h-full max-w-full object-contain" />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-gold-500 flex items-center justify-center text-charcoal-900">
                              <Check size={8} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">Date Worn</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-glass"
                  />
                </div>

                {/* Occasion */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">Occasion</label>
                  <select
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value as Occasion)}
                    className="input-glass"
                  >
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                    <option value="business">Business</option>
                    <option value="sport">Sport</option>
                    <option value="evening">Evening</option>
                    <option value="beach">Beach</option>
                    <option value="outdoor">Outdoor</option>
                  </select>
                </div>

                {/* Weather */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">Weather (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g. Sunny 75°F, Rain"
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                    className="input-glass"
                  />
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">Notes (Optional)</label>
                  <textarea
                    placeholder="Style thoughts, compliments..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="input-glass resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={logLoading}
                  className="mt-2"
                >
                  Save Wear Log
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
export default AnalyticsPage;
