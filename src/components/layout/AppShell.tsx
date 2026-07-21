import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '../ui/Toast';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { supabase } from '../../lib/supabase';
import { getUserProfile } from '../../lib/db';
import { Sparkles } from 'lucide-react';

export function AppShell() {
  const { user, setUser, setProfile, isLoadingAuth, setLoadingAuth } = useWardrobeStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Listen to Supabase Auth State changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? '' });
        getUserProfile(session.user.id).then((profile) => {
          if (profile) setProfile(profile);
        });
      }
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? '' });
          const profile = await getUserProfile(session.user.id);
          if (profile) setProfile(profile);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoadingAuth(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setProfile, setLoadingAuth]);

  // Handle Auth Redirects
  useEffect(() => {
    if (!isLoadingAuth) {
      if (!user && location.pathname !== '/auth') {
        navigate('/auth');
      } else if (user && location.pathname === '/auth') {
        navigate('/wardrobe');
      }
    }
  }, [user, isLoadingAuth, location.pathname, navigate]);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-charcoal-900 gap-4">
        {renderPlaceholder()}
      </div>
    );
  }

  // If not authed, return outlet (which will render /auth)
  if (!user) {
    return (
      <div className="w-full min-h-screen bg-charcoal-900 flex items-center justify-center relative overflow-hidden bg-noise">
        <Outlet />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-charcoal-900 text-ivory-300 flex flex-col md:flex-row overflow-hidden bg-noise relative">
      <Sidebar />
      <main className="flex-1 h-full flex flex-col relative overflow-hidden pb-16 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}

function renderPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center animate-bounce">
        <Sparkles size={24} className="text-gold-400 animate-pulse" />
      </div>
      <span className="text-sm font-medium text-gold-400/80 tracking-widest font-display uppercase animate-pulse">
        Wardrobe AI
      </span>
    </div>
  );
}

