// This file is not actively used in the main layout based on App.jsx and Header.jsx.
// Keeping it as is but noting it's not the active navigation component being rendered.
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Home, Compass, Calendar, User, LogOut, Wallet, Shield, Gem, Menu, X, Bell, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';

const Navbar = () => {
    const { user, signOut } = useAuth();
    const { userProfile, notificationBellAnimation } = useData();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { t } = useTranslation();

    const getInitial = (name) => name ? name.charAt(0).toUpperCase() : '?';

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };
    
    const navItems = [
        { name: t('nav.home'), path: '/', icon: Home },
        { name: t('nav.discover'), path: '/discover', icon: Compass },
        { name: t('nav.events'), path: '/events', icon: Calendar },
        { name: t('nav.partnership'), path: '/partner-signup', icon: Gem },
    ];
    
    const UserMenu = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                        <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.full_name} />
                        <AvatarFallback>{getInitial(userProfile?.full_name)}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{userProfile?.full_name || t('nav.profile')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('nav.profile')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/wallet')}>
                    <Wallet className="mr-2 h-4 w-4" />
                    <span>{t('nav.wallet')}</span>
                </DropdownMenuItem>
                {userProfile?.user_type?.includes('admin') && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin</span>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('nav.logout')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const NotificationBell = () => {
      const [key, setKey] = useState(0);

      useEffect(() => {
        setKey(prev => prev + 1);
      }, [notificationBellAnimation]);
      
      return (
        <div 
          key={key} 
          className="relative cursor-pointer animate-jump animate-once animate-duration-500 animate-ease-in-out"
          onClick={() => navigate('/notifications')}
        >
          <Bell className="h-6 w-6 text-yellow-400 hover:text-yellow-300 transition-colors" />
        </div>
      );
    }
    
    const navLinkClass = ({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center">
                <NavLink to="/" className="mr-6 flex items-center space-x-2">
                    <img src="https://res.cloudinary.com/dprp6vxv6/image/upload/v1722428610/bpi/logo-BPI-v2-transparent_pmsz7v.png" alt="BonPlanInfos Logo" className="h-10 w-auto" />
                </NavLink>

                <nav className="hidden md:flex flex-1 items-center gap-4">
                    {navItems.map(item => (
                        <NavLink key={item.path} to={item.path} className={navLinkClass}>
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                <div className="md:hidden flex flex-1 justify-end">
                    <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </Button>
                </div>
                
                <div className="hidden md:flex items-center justify-end space-x-2">
                    <ThemeToggle />
                    <LanguageSwitcher />
                    {canCreateEvent(userProfile) && (
                      <Button variant="premium" onClick={() => navigate('/create-event')}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          {t('nav.create_event')}
                      </Button>
                    )}
                    {user ? (
                        <>
                           <NotificationBell/>
                           <UserMenu />
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => navigate('/auth')}>{t('auth.login.title')}</Button>
                            <Button onClick={() => navigate('/auth', { state: { from: location, isSignUp: true } })} className="h-11">{t('auth.register.title')}</Button>
                        </div>
                    )}
                </div>
            </div>

            {isMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 w-full bg-background/95 backdrop-blur-lg border-t border-border/40 py-4">
                    <nav className="flex flex-col gap-2 px-4">
                        {navItems.map(item => (
                            <NavLink key={item.path} to={item.path} className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </NavLink>
                        ))}
                        <div className="border-t border-border/40 my-2"></div>
                        {user ? (
                            <>
                                <NavLink to="/profile" className={navLinkClass} onClick={() => setIsMenuOpen(false)}><User className="h-5 w-5" /><span>{t('nav.profile')}</span></NavLink>
                                <NavLink to="/wallet" className={navLinkClass} onClick={() => setIsMenuOpen(false)}><Wallet className="h-5 w-5" /><span>{t('nav.wallet')}</span></NavLink>
                                <NavLink to="/notifications" className={navLinkClass} onClick={() => setIsMenuOpen(false)}><Bell className="h-5 w-5" /><span>{t('nav.notifications')}</span></NavLink>
                                {userProfile?.user_type?.includes('admin') && (<NavLink to="/admin" className={navLinkClass} onClick={() => setIsMenuOpen(false)}><Shield className="h-5 w-5" /><span>Admin</span></NavLink>)}
                                <Button variant="ghost" onClick={() => { handleSignOut(); setIsMenuOpen(false); }} className="justify-start px-3 py-2 text-muted-foreground"><LogOut className="h-5 w-5 mr-2" /><span>{t('nav.logout')}</span></Button>
                            </>
                        ) : (
                            <>
                                <NavLink to="/auth" className={navLinkClass} onClick={() => setIsMenuOpen(false)}>{t('auth.login.title')}</NavLink>
                                <Button onClick={() => { navigate('/auth', { state: { from: location, isSignUp: true } }); setIsMenuOpen(false); }} className="w-full mt-2 h-11">{t('auth.register.title')}</Button>
                            </>
                        )}
                        <div className="border-t border-border/40 my-2"></div>
                         <div className="p-2 flex justify-around">
                           <LanguageSwitcher />
                           <ThemeToggle />
                         </div>
                    </nav>
                </div>
            )}
        </header>
    );
};

const canCreateEvent = (profile) => {
  return profile && ['organizer', 'admin', 'super_admin'].includes(profile.user_type);
}

export default Navbar;