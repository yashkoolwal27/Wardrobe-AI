import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useWardrobeStore } from '../store/wardrobeStore';
import { getUserProfile } from '../lib/db';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Sparkles, Mail, Lock, User } from 'lucide-react';

export function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const addToast = useWardrobeStore((s) => s.addToast);
  const setUser = useWardrobeStore((s) => s.setUser);
  const setProfile = useWardrobeStore((s) => s.setProfile);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast({ type: 'warning', title: 'Missing fields', message: 'Please enter your email and password.' });
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName) {
          addToast({ type: 'warning', title: 'Name required', message: 'Please enter your display name.' });
          setLoading(false);
          return;
        }

        // Call signUp and pass display_name in metadata so the trigger can read it
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          if (data.session) {
            // User is logged in automatically (email confirmation is disabled)
            setUser({ id: data.user.id, email: data.user.email ?? '' });
            const profile = await getUserProfile(data.user.id);
            if (profile) setProfile(profile);
            addToast({ type: 'success', title: 'Account created', message: 'Welcome to Wardrobe AI!' });
          } else {
            // Email confirmation is enabled
            setVerificationSent(true);
            addToast({
              type: 'info',
              title: 'Verification Link Sent',
              message: 'Check your email inbox to verify your account.',
              duration: 8000,
            });
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email ?? '' });
          const profile = await getUserProfile(data.user.id);
          if (profile) setProfile(profile);
          addToast({ type: 'success', title: 'Signed in successfully' });
        }
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Authentication failed', message: err.message || 'An error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        {/* App Title header */}
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center shadow-gold-glow-sm">
            <Sparkles size={22} className="text-gold-400" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-gradient-gold">
            Wardrobe AI
          </h1>
          <p className="text-sm text-charcoal-400 max-w-xs leading-relaxed">
            Your personal digital wardrobe & premium AI outfit generator.
          </p>
        </div>

        {/* Card */}
        {verificationSent ? (
          <GlassPanel variant="heavy" className="p-8 border-white/5 relative overflow-hidden flex flex-col items-center text-center gap-5">
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />
            
            <div className="w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 shadow-gold-glow-sm">
              <Mail size={28} className="animate-pulse" />
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="font-display text-xl font-medium text-ivory-200">
                Confirm your email
              </h2>
              <p className="text-sm text-charcoal-400 leading-relaxed">
                We sent a verification link to <strong className="text-gold-400">{email}</strong>.
              </p>
              <p className="text-xs text-charcoal-500 leading-relaxed max-w-xs mx-auto mt-2">
                Please click the link in that email to activate your account. Once verified, you can sign in below.
              </p>
            </div>

            <div className="divider w-full my-2" />

            <Button
              variant="glass"
              onClick={() => {
                setVerificationSent(false);
                setIsSignUp(false); // Switch back to login mode
              }}
              className="w-full"
            >
              Back to Sign In
            </Button>
          </GlassPanel>
        ) : (
          <GlassPanel variant="heavy" className="p-8 border-white/5 relative overflow-hidden">
            {/* subtle ambient light circle behind card */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />

            <h2 className="font-display text-xl font-medium mb-6 text-ivory-200">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              {isSignUp && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">Display Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-3.5 text-charcoal-500" />
                    <input
                      type="text"
                      required
                      placeholder="E.g. Sophia Loren"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input-glass pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-charcoal-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-glass pl-10"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-charcoal-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-glass pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full mt-2"
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>
            </form>

            <div className="divider my-6" />

            <p className="text-center text-xs text-charcoal-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-gold-400 hover:text-gold-300 font-semibold cursor-pointer underline underline-offset-4"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </GlassPanel>
        )}
      </motion.div>
    </div>
  );
}
export default AuthPage;
