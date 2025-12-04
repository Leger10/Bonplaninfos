import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Calendar, Plus, User, Wallet, Settings, LogOut, Menu, X, Shield, UserCheck, Bell, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';

const Navbar = () => {
  const { user, signOut, permissions } = useAuth();
  const { userProfile } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Accueil' },
    { path: '/events', icon: Calendar, label: 'Événements' },
    { path: '/promotions', icon: ShoppingBag, label: 'Promos' },
    ...(user && (permissions?.role === 'organizer' || permissions?.role === 'admin' || permissions?.role === 'super_admin') ? [{ path: '/create-event', icon: Plus, label: 'Créer' }] : [])
  ];

  const userItems = [
    { path: '/wallet', icon: Wallet, label: 'Portefeuille' },
    { path: '/profile', icon: User, label: 'Profil' }
  ];

  const adminItems = [
    ...(permissions?.role === 'admin' || permissions?.role === 'super_admin' ? [{ path: '/admin', icon: Shield, label: 'Admin' }] : []),
    ...(permissions?.role === 'secretary' ? [{ path: '/secretary', icon: UserCheck, label: 'Secrétaire' }] : [])
  ];

  const isActive = path => location.pathname === path;
  const unreadNotifications = 3; // Simulation

  return (
    <nav className="sticky top-0 z-50 glass-effect border-b border-[#C9A227]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-gold rounded-lg flex items-center justify-center">
              <span className="text-[#0B0B0D] font-bold text-sm">BP</span>
            </div>
            <span className="text-xl font-bold text-[#C9A227]">BonPlaninfos</span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(item => (
              <Link key={item.path} to={item.path} className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive(item.path) ? 'bg-[#C9A227] text-[#0B0B0D]' : 'text-gray-300 hover:text-[#0B0B0D] hover:bg-[#C9A227]'}`}>
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
            {adminItems.map(item => (
              <Link key={item.path} to={item.path} className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive(item.path) ? 'bg-[#E53935] text-white' : 'text-gray-300 hover:text-white hover:bg-[#E53935]'}`}>
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user && userProfile ? (
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')} className="relative text-gray-300 hover:text-[#C9A227]">
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 gradient-red text-white text-xs border-2 border-[#111]">
                      {unreadNotifications}
                    </Badge>
                  )}
                </Button>

                <div className="flex items-center space-x-2 bg-[#C9A227]/10 px-3 py-1 rounded-full cursor-pointer" onClick={() => navigate('/wallet')}>
                  <Wallet className="w-4 h-4 text-[#C9A227]" />
                  <span className="text-sm font-medium text-[#C9A227]">
                    {userProfile.total_coins || 0} pièces
                  </span>
                </div>

                <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/profile')}>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={userProfile.avatar_url} />
                    <AvatarFallback className="bg-[#C9A227] text-[#0B0B0D]">
                      {userProfile.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-300">{userProfile.name}</span>
                </div>

                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-300 hover:text-[#E53935]">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" onClick={() => navigate('/auth')} className="text-gray-300 hover:text-[#C9A227]">
                  Connexion
                </Button>
                <Button onClick={() => navigate('/auth')} className="gradient-gold text-[#0B0B0D] hover:opacity-90">
                  Inscription
                </Button>
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm" className="md:hidden text-gray-300" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden glass-effect border-t border-[#C9A227]/20">
          <div className="px-4 py-4 space-y-2">
            {navItems.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${isActive(item.path) ? 'bg-[#C9A227] text-[#0B0B0D]' : 'text-gray-300 hover:text-[#0B0B0D] hover:bg-[#C9A227]'}`}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            {user && (
              <div className="border-t border-[#C9A227]/20 pt-4 space-y-2">
                {userItems.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${isActive(item.path) ? 'bg-[#C9A227] text-[#0B0B0D]' : 'text-gray-300 hover:text-[#0B0B0D] hover:bg-[#C9A227]'}`}>
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}

            {adminItems.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${isActive(item.path) ? 'bg-[#E53935] text-white' : 'text-gray-300 hover:text-white hover:bg-[#E53935]'}`}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            {user ? (
              <div className="pt-4 border-t border-[#C9A227]/20 space-y-2">
                <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-300 hover:text-[#0B0B0D] hover:bg-[#C9A227]">
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Paramètres</span>
                </Link>
                <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#E53935]">
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Déconnexion</span>
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-[#C9A227]/20 space-y-2">
                <Button onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }} className="w-full justify-start text-gray-300 hover:text-[#C9A227]">
                  Connexion
                </Button>
                <Button onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }} className="w-full gradient-gold text-[#0B0B0D] hover:opacity-90">
                  Inscription
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
};
export default Navbar;