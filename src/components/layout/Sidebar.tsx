import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, NavLink } from 'react-router-dom';
import { Shirt, Sparkles, Heart, BarChart2, User, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { supabase } from '../../lib/supabase';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/wardrobe',  icon: <Shirt size={20} />,    label: 'Wardrobe'  },
  { path: '/builder',  icon: <Sparkles size={20} />,  label: 'Builder'   },
  { path: '/lookbook', icon: <Heart size={20} />,     label: 'Lookbook'  },
  { path: '/analytics',icon: <BarChart2 size={20} />, label: 'Analytics' },
  { path: '/profile',  icon: <User size={20} />,      label: 'Profile'   },
  { path: '/settings', icon: <Settings size={20} />,  label: 'Settings'  },
];

export function Sidebar() {
  const { sidebarExpanded, toggleSidebar, profile, setUser, setProfile } = useWardrobeStore();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <motion.aside
      animate={{ width: sidebarExpanded ? 220 : 72 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="relative hidden md:flex flex-col h-screen glass-dark border-r border-white/5 z-40 shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center shrink-0">
          <Sparkles size={18} className="text-gold-400" />
        </div>
        <AnimatePresence>
          {sidebarExpanded && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-display text-lg font-semibold text-gradient-gold whitespace-nowrap"
            >
              Wardrobe AI
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 p-2 flex-1 mt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink key={item.path} to={item.path} className="group relative">
              <motion.div
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${isActive
                    ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20'
                    : 'text-charcoal-400 hover:text-ivory-300 hover:bg-white/5'
                  }
                `}
                whileTap={{ scale: 0.97 }}
              >
                <span className="shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {sidebarExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-gold-500/10 border border-gold-500/20"
                    style={{ zIndex: -1 }}
                  />
                )}
              </motion.div>
              {/* Tooltip for collapsed state */}
              {!sidebarExpanded && (
                <div className="
                  absolute left-full ml-2 top-1/2 -translate-y-1/2
                  glass px-2.5 py-1.5 text-xs text-ivory-300 whitespace-nowrap
                  opacity-0 pointer-events-none group-hover:opacity-100
                  transition-opacity duration-150 z-50
                ">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section: Profile + toggle */}
      <div className="p-2 border-t border-white/5 flex flex-col gap-1">
        {/* Profile mini card */}
        {profile && (
          <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${sidebarExpanded ? '' : 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center shrink-0 text-xs font-semibold text-gold-400">
              {profile.displayName?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <AnimatePresence>
              {sidebarExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col min-w-0"
                >
                  <span className="text-xs font-medium text-ivory-300 truncate">{profile.displayName}</span>
                  <span className="text-xs text-charcoal-500 truncate">{profile.email}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-charcoal-500 hover:text-red-400 hover:bg-red-900/10 transition-all duration-200 group"
        >
          <LogOut size={18} className="shrink-0" />
          <AnimatePresence>
            {sidebarExpanded && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-sm whitespace-nowrap">
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Toggle collapse */}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full py-2.5 px-3 rounded-xl text-charcoal-500 hover:text-ivory-300 hover:bg-white/5 transition-all"
        >
          <motion.div animate={{ rotate: sidebarExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronRight size={18} />
          </motion.div>
        </button>
      </div>
    </motion.aside>
  );
}
