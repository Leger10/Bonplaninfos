import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Coins, Wallet, Bell, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { Badge } from '@/components/ui/badge';

const Navbar = () => {
    const { user, signOut } = useAuth();
    const { userProfile, adminConfig, notificationBellAnimation } = useData();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const navLinks = [
        { to: '/', text: t('nav.home') },
        { to: '/discover', text: t('nav.discover') },
        { to: '/events', text: t('nav.events') },
        { to: '/marketing', text: t('nav.partnership') }
    ];

    const totalCoins = (userProfile?.coin_balance || 0) + (userProfile?.free_coin_balance || 0);
    const logoUrl = adminConfig?.logo_url || "https://res.cloudinary.com/dprp6vxv6/image/upload/v1722428610/bpi/logo-BPI-v2-transparent_pmsz7v.png";

    const fetchUnreadCount = async () => {
        if (!user) return;
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
        if (!error) {
            setUnreadCount(count);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
    }, [user, notificationBellAnimation]);

    useEffect(() => {
        if (!user) return;
        const channel = supabase.channel('realtime-notifications-count')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                () => {
                    fetchUnreadCount();
                }
            ).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleSignOut = async () => {
      await signOut();
      navigate('/');
    };

    const bellVariants = {
        rest: { rotate: 0 },
        shake: { rotate: [0, -15, 15, -15, 15, 0], transition: { duration: 0.5 } }
    };

    return (
        <header className="fixed top-0 z-40 w-full bg-background/80 backdrop-blur-lg border-b border-border">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center">
                    <img alt="BonPlanInfos Logo" className="h-10 w-auto mr-2" src={logoUrl} />
                </Link>

                <nav className="hidden md:flex items-center space-x-6">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) =>
                                `text-sm font-medium transition-colors hover:text-primary ${
                                    isActive ? 'text-primary' : 'text-muted-foreground'
                                }`
                            }
                        >
                            {link.text}
                        </NavLink>
                    ))}
                </nav>

                <div className="flex items-center space-x-2">
                    <div className="hidden md:flex items-center space-x-2">
                        <ThemeToggle />
                        <LanguageSwitcher />
                    </div>
                    {user ? (
                        <>
                            <div className="flex md:hidden items-center">
                                <Button variant="ghost" size="icon" onClick={() => navigate('/notifications')} className="relative">
                                    <motion.div key={notificationBellAnimation} variants={bellVariants} animate="shake" initial="rest">
                                        <Bell className="h-6 w-6" />
                                    </motion.div>
                                    {unreadCount > 0 && (
                                        <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 gradient-red text-white text-xs">{unreadCount}</Badge>
                                    )}
                                </Button>
                            </div>
                            <div className="hidden md:flex items-center space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => navigate('/notifications')} className="relative">
                                    <motion.div key={notificationBellAnimation} variants={bellVariants} animate="shake" initial="rest">
                                        <Bell className="h-5 w-5" />
                                    </motion.div>
                                    {unreadCount > 0 && (
                                        <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 gradient-red text-white text-xs">{unreadCount}</Badge>
                                    )}
                                </Button>
                                <Button variant="ghost" className="h-10 px-3 flex items-center gap-2" onClick={() => navigate('/wallet')}>
                                    <Coins className="h-5 w-5 text-yellow-400" />
                                    <span className="font-bold">{totalCoins}</span>
                                </Button>
                                <Button variant="outline" className="h-10 px-3" onClick={() => navigate('/profile')}>
                                    <UserCircle className="h-5 w-5 mr-2" />
                                    {t('nav.profile')}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="hidden md:flex items-center space-x-2">
                            <Button variant="ghost" onClick={() => navigate('/auth')}>{t('auth.login.title')}</Button>
                            <Button className="gradient-gold text-background" onClick={() => navigate('/auth?register=true')}>{t('auth.register.title')}</Button>
                        </div>
                    )}
                    <div className="md:hidden">
                        <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </Button>
                    </div>
                </div>
            </div>

        <AnimatePresence>
            {isMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="md:hidden overflow-hidden"
                >
                    <nav className="flex flex-col items-stretch space-y-1 p-4 border-t">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                onClick={() => setIsMenuOpen(false)}
                                className={({ isActive }) =>
                                    `px-4 py-2 rounded-md text-base font-medium transition-colors hover:bg-muted ${
                                        isActive ? 'bg-muted text-primary' : 'text-foreground'
                                    }`
                                }
                            >
                                {link.text}
                            </NavLink>
                        ))}
                        <div className="border-t border-border w-full my-2" />
                        {user ? (
                            <>
                                <Button variant="ghost" className="w-full justify-start text-base" onClick={() => { navigate('/profile'); setIsMenuOpen(false); }}>{t('nav.profile')}</Button>
                                <Button variant="ghost" className="w-full justify-start text-base" onClick={() => { navigate('/wallet'); setIsMenuOpen(false); }}>{t('nav.wallet')}</Button>
                                <Button variant="destructive" className="w-full justify-start text-base" onClick={handleSignOut}>Déconnexion</Button>
                            </>
                        ) : (
                            <>
                                <Button variant="ghost" className="w-full justify-start text-base" onClick={() => { navigate('/auth'); setIsMenuOpen(false); }}>{t('auth.login.title')}</Button>
                                <Button className="w-full text-base gradient-gold text-background" onClick={() => { navigate('/auth?register=true'); setIsMenuOpen(false); }}>{t('auth.register.title')}</Button>
                            </>
                        )}
                        <div className="flex items-center justify-center pt-4">
                          <ThemeToggle />
                          <LanguageSwitcher />
                        </div>
                    </nav>
                </motion.div>
            )}
        </AnimatePresence>
        </header>
    );
};

export default Navbar;