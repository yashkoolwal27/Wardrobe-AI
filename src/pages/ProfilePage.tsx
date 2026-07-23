import { useState, useEffect } from 'react';
import { useWardrobeStore } from '../store/wardrobeStore';
import { getWardrobeByCode, updateUserProfile } from '../lib/db';
import { PageTransition } from '../components/layout/PageTransition';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { ClosetScene } from '../scenes/ClosetScene';
import { Copy, ArrowRight, X, Inbox, Share2, Check, Camera, User as UserIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PrivacySetting, UserProfile, WardrobeItem } from '../types';

export function ProfilePage() {
  const { user, profile, setProfile, addToast } = useWardrobeStore();

  const [privacy, setPrivacy] = useState<PrivacySetting>('public');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [copied, setCopied] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Friend browse states
  const [friendCode, setFriendCode] = useState('');
  const [friendWardrobe, setFriendWardrobe] = useState<{
    profile: UserProfile;
    items: WardrobeItem[];
  } | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);

  const [bodyPhotoUrl, setBodyPhotoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (profile) {
      setPrivacy(profile.privacy);
      setDisplayName(profile.displayName);
      setBio(profile.bio ?? '');
      setBodyPhotoUrl(profile.bodyPhotoUrl);
    }
  }, [profile]);

  const handleBodyPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Url = event.target?.result as string;
        setBodyPhotoUrl(base64Url);
        await updateUserProfile(user.id, { bodyPhotoUrl: base64Url });
        if (profile) setProfile({ ...profile, bodyPhotoUrl: base64Url });
        addToast({ type: 'success', title: 'Body Photo Saved', message: 'Your full body photo will now be used for AI styling!' });
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Upload failed', message: err.message });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdateLoading(true);
    try {
      await updateUserProfile(user.id, {
        displayName,
        bio,
        privacy,
        bodyPhotoUrl,
      });

      // Update state store
      if (profile) {
        setProfile({
          ...profile,
          displayName,
          bio,
          privacy,
          bodyPhotoUrl,
        });
      }

      addToast({ type: 'success', title: 'Profile updated' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update failed', message: err.message });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.shareCode);
    setCopied(true);
    addToast({ type: 'info', title: 'Copied', message: 'Share code copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBrowseFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCode.trim()) return;

    setFriendLoading(true);
    setFriendWardrobe(null);

    try {
      const res = await getWardrobeByCode(friendCode.trim().toUpperCase());
      if (res) {
        setFriendWardrobe(res);
        addToast({ type: 'success', title: 'Wardrobe loaded', message: `Viewing @${res.profile.username}'s public closet.` });
      } else {
        addToast({ type: 'error', title: 'Wardrobe not found', message: 'The code is invalid, or the wardrobe is private.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error loading wardrobe', message: err.message });
    } finally {
      setFriendLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Edit Profile & Share Code */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div>
            <h1 className="section-title">Profile</h1>
            <p className="section-subtitle">Manage your wardrobe settings and sharing options.</p>
          </div>

          <div className="divider-gold" />

          {profile && (
            <GlassPanel variant="heavy" className="p-6 border-white/5 flex flex-col gap-6">
              {/* User Avatar details */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-xl font-semibold text-gold-400 shrink-0">
                  {profile.displayName?.[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-semibold text-ivory-200 truncate">{profile.displayName}</span>
                  <span className="text-xs text-charcoal-400 truncate">@{profile.username}</span>
                </div>
              </div>

              {/* Share Code panel */}
              <div className="glass-gold p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gold-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 size={12} /> Share Code
                  </span>
                  <span className="text-charcoal-500">Public Access</span>
                </div>
                <div className="flex justify-between items-center bg-charcoal-950/40 rounded-xl px-4 py-3 border border-gold-500/10">
                  <span className="font-mono text-lg font-bold text-ivory-200 tracking-wider">
                    {profile.shareCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="text-gold-400 hover:text-gold-300 transition-colors p-1.5 rounded-lg glass"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <span className="text-[10px] text-charcoal-400 leading-normal">
                  Give this code to a friend so they can browse your wardrobe in 3D.
                </span>
              </div>

              {/* Full Body Photo for Virtual Try-On */}
              <div className="glass p-4 flex flex-col gap-3 border-gold-500/20">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gold-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} /> Full Body Styling Photo
                  </span>
                  <span className="text-charcoal-500">Virtual Try-On</span>
                </div>

                {bodyPhotoUrl ? (
                  <div className="flex items-center gap-3 bg-charcoal-950/60 p-2.5 rounded-xl border border-white/5">
                    <div className="w-14 h-20 rounded-lg overflow-hidden glass shrink-0 relative bg-charcoal-900">
                      <img src={bodyPhotoUrl} alt="Full Body Photo" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <span className="text-xs font-semibold text-ivory-200">Body Photo Active</span>
                      <span className="text-[10px] text-charcoal-400">Used for personalized AI Virtual Try-On styling.</span>
                      <label className="text-[10px] font-semibold text-gold-400 hover:text-gold-300 cursor-pointer flex items-center gap-1">
                        <Camera size={10} /> Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBodyPhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="border border-dashed border-gold-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gold-500/5 transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBodyPhotoUpload}
                      className="hidden"
                    />
                    <div className="w-8 h-8 rounded-full bg-gold-500/10 flex items-center justify-center mb-1 text-gold-400">
                      <UserIcon size={16} />
                    </div>
                    <span className="text-xs font-semibold text-ivory-200 mb-0.5">Upload Full Body Photo</span>
                    <span className="text-[10px] text-charcoal-500">Upload your picture to style clothes on your body!</span>
                  </label>
                )}
              </div>

              {/* Edit form */}
              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-glass"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="input-glass resize-none scrollbar-thin"
                  />
                </div>

                {/* Privacy Toggle */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">Privacy Settings</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['public', 'private', 'approval'] as PrivacySetting[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPrivacy(mode)}
                        className={`
                          px-2 py-2.5 rounded-xl border text-[10px] font-semibold uppercase transition-colors
                          ${privacy === mode
                            ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                            : 'border-white/5 bg-white/2 text-charcoal-400 hover:border-white/10'
                          }
                        `}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={updateLoading}
                  className="w-full mt-2"
                >
                  Save Settings
                </Button>
              </form>
            </GlassPanel>
          )}
        </div>

        {/* Right Column: Enter Share Code & Browse Friend Wardrobe */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div>
            <h1 className="section-title">Explore</h1>
            <p className="section-subtitle">View your friends' public closets in real-time 3D.</p>
          </div>

          <div className="divider-gold" />

          <GlassPanel variant="heavy" className="p-6 border-white/5 flex flex-col gap-6">
            <h2 className="font-display text-lg font-medium text-ivory-200">
              Enter a Friend's Code
            </h2>
            <form onSubmit={handleBrowseFriend} className="flex gap-2">
              <input
                type="text"
                placeholder="E.g. A9K2L8B"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                className="input-glass uppercase font-mono text-center tracking-widest text-lg py-2.5"
                maxLength={8}
              />
              <Button
                type="submit"
                variant="glass"
                loading={friendLoading}
                icon={<ArrowRight size={14} />}
              >
                Browse Closet
              </Button>
            </form>
          </GlassPanel>

          {/* Friend Closet Container (If loaded) */}
          <AnimatePresence>
            {friendWardrobe && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="glass rounded-2xl overflow-hidden flex flex-col flex-1 h-[450px] relative border-white/5"
              >
                {/* Header HUD */}
                <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
                  <div className="glass px-4 py-2 flex items-center gap-2 pointer-events-auto">
                    <div className="w-5 h-5 rounded-md bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-[10px] text-gold-400 font-bold">
                      {friendWardrobe.profile.displayName[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-ivory-300">
                      @{friendWardrobe.profile.username}'s Closet (Read-Only)
                    </span>
                  </div>

                  <button
                    onClick={() => setFriendWardrobe(null)}
                    className="glass p-2 hover:text-gold-400 hover:border-gold-500/20 pointer-events-auto"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* 3D Scene Viewport */}
                <div className="flex-1 w-full h-full relative">
                  {friendWardrobe.items.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-charcoal-950">
                      <Inbox size={32} className="text-charcoal-700 mb-2" />
                      <span className="text-xs text-charcoal-500">This closet is empty.</span>
                    </div>
                  ) : (
                    <ClosetScene
                      items={friendWardrobe.items}
                      onSelectItem={(item) => addToast({
                        type: 'info',
                        title: item.description,
                        message: `Category: ${item.category} | Brand: ${item.brand || 'N/A'}`
                      })}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
export default ProfilePage;
