import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Compass, Ticket, User } from 'lucide-react';

const BottomNav = () => {
  const { t } = useTranslation();

  const navItems = [
    { path: '/', icon: Home, label: t('nav.home') },
    { path: '/discover', icon: Compass, label: t('nav.discover') },
    { path: '/events', icon: Ticket, label: t('nav.events') },
    { path: '/profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border/50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] flex md:hidden z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 min-w-0 text-center gap-1 transition-colors duration-200 ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          <item.icon className="w-6 h-6" />
          <span className="text-xs font-medium truncate">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;