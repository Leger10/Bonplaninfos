import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, Calendar, User, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';

const BottomNav = ({ isMenuOpen }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: t('nav.home') },
    { path: '/discover', icon: Compass, label: t('nav.discover') },
    { path: '/events', icon: Calendar, label: t('nav.events') },
    { path: '/wallet', icon: Wallet, label: t('nav.wallet'), requiresAuth: true },
    { path: '/profile', icon: User, label: t('nav.profile'), requiresAuth: true },
  ];

  const isVisible = !['/auth', '/admin', '/secretary'].some(path => location.pathname.startsWith(path));

  if (!isVisible || isMenuOpen) {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 z-30 w-full h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <nav className="grid h-full grid-cols-5">
        {navItems.map((item) => {
          if (item.requiresAuth && !user) {
             // To keep the layout consistent, we can render a disabled-like item or just null
             // Here we just skip it
             return null;
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors',
                  isActive ? 'text-primary' : 'hover:text-foreground'
                )
              }
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;