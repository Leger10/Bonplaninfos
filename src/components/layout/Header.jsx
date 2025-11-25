import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Menu, User, Wallet, LogOut, PlusCircle, Home, Compass, Calendar, HeartHandshake as Handshake } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/NotificationBell';
import logo from '@/assets/logo.png';
const AppLogo = () => {
  console.log('Logo path:', logo); // Vérifiez ce qui s'affiche dans la console
  
  return (
    <NavLink to="/" className="flex items-center gap-2">
      <img src={logo} alt="BonPlanInfos Logo" className="h-8 w-auto" />
      <span className="hidden sm:inline-block font-bold text-lg">BonPlanInfos</span>
    </NavLink>
  );
};

const UserMenu = ({ user, userProfile, handleLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.full_name} />
            <AvatarFallback>{userProfile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userProfile?.full_name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>{t('nav.profile')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/wallet')}>
          <Wallet className="mr-2 h-4 w-4" />
          <span>{t('nav.wallet')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('nav.logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MobileMenu = ({ navLinks, user, userProfile, handleLogout, isMenuOpen, setMenuOpen }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
    setMenuOpen(false);
  };
  
  const canCreateEvent = (profile) => {
    return profile && ['organizer', 'admin', 'super_admin'].includes(profile.user_type);
  };

  return (
    <Sheet open={isMenuOpen} onOpenChange={setMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col z-50">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>
            <AppLogo />
          </SheetTitle>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto px-4 pb-4">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                className="justify-start text-base h-11"
                onClick={() => handleNavigation(item.path)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {t(item.name)}
              </Button>
            ))}
            {user && canCreateEvent(userProfile) && (
              <Button
                variant="ghost"
                className="justify-start text-base h-11"
                onClick={() => handleNavigation('/create-event')}
              >
                <PlusCircle className="mr-3 h-5 w-5" />
                {t('nav.create_event')}
              </Button>
            )}
          </nav>
        </div>
        <SheetFooter className="p-4 border-t flex-col sm:flex-col sm:space-x-0 gap-4">
            <div className="flex items-center justify-between w-full">
                <span className="text-sm text-muted-foreground">{t('Theme')}</span>
                <ThemeToggle />
            </div>
            <div className="flex items-center justify-between w-full">
                <span className="text-sm text-muted-foreground">{t('Language')}</span>
                <LanguageSwitcher />
            </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

const Header = () => {
  const { t } = useTranslation();
  const { user, signOut: handleLogout } = useAuth();
  const { userProfile } = useData();
  const navigate = useNavigate();
  const [isMenuOpen, setMenuOpen] = React.useState(false);

  const navLinks = [
    { name: 'nav.home', path: '/', icon: Home },
    { name: 'nav.discover', path: '/discover', icon: Compass },
    { name: 'nav.events', path: '/events', icon: Calendar },
    { name: 'nav.partnership', path: '/marketing', icon: Handshake },
  ];

  const canCreateEvent = (profile) => {
    return profile && ['organizer', 'admin', 'super_admin'].includes(profile.user_type);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="md:hidden">
            <MobileMenu navLinks={navLinks} user={user} userProfile={userProfile} handleLogout={handleLogout} isMenuOpen={isMenuOpen} setMenuOpen={setMenuOpen} />
          </div>
          <div className="hidden md:flex">
            <AppLogo />
          </div>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            {navLinks.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'transition-colors hover:text-foreground/80',
                    isActive ? 'text-foreground font-semibold' : 'text-foreground/60'
                  )
                }
              >
                {t(item.name)}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex items-center gap-2">
             {canCreateEvent(userProfile) && (
                  <Button variant="premium" size="sm" onClick={() => navigate('/create-event')}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('nav.create_event')}
                  </Button>
            )}
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          {user ? (
            <>
              <NotificationBell />
              <UserMenu user={user} userProfile={userProfile} handleLogout={handleLogout} />
            </>
          ) : (
            <Button onClick={() => navigate('/auth')} className="h-11">{t('auth.login.button')}</Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;