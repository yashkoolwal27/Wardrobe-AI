import { NavLink } from 'react-router-dom';
import { Shirt, Sparkles, Heart, BarChart2, User, Settings } from 'lucide-react';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/wardrobe',  icon: <Shirt size={18} />,    label: 'Closet' },
  { path: '/builder',  icon: <Sparkles size={18} />,  label: 'Builder'   },
  { path: '/lookbook', icon: <Heart size={18} />,     label: 'Lookbook'  },
  { path: '/analytics',icon: <BarChart2 size={18} />, label: 'Stats' },
  { path: '/profile',  icon: <User size={18} />,      label: 'Profile'   },
  { path: '/settings', icon: <Settings size={18} />,  label: 'Settings'  },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-dark border-t border-white/5 flex items-center justify-around z-40 px-2 pb-safe">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `
            flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200 relative
            ${isActive ? 'text-gold-400 font-semibold' : 'text-charcoal-400 hover:text-ivory-300'}
          `}
        >
          {({ isActive }) => (
            <>
              <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] tracking-wide font-medium">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-gold-400 absolute bottom-1" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
