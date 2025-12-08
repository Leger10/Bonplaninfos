import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Skeleton } from '@/components/ui/skeleton';
import WhatsAppCommunityButton from '@/components/WhatsAppCommunityButton';

const ProfileHeader = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { userProfile, loadingProfile } = useData();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loadingProfile && !userProfile) {
    return (
      <div className="p-4 md:p-6 bg-gradient-to-br from-background to-background/80 rounded-b-3xl shadow-lg mb-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="mt-6">
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  const isAdmin = userProfile?.user_type === 'admin' || userProfile?.user_type === 'super_admin';
  const isSecretary = userProfile?.user_type === 'secretary';

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-background to-background/80 rounded-b-3xl shadow-lg mb-6">
      <div className="flex items-center space-x-4">
        <Avatar className="w-20 h-20 border-4 border-primary">
          <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.full_name} />
          <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground">
            {getInitials(userProfile?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <h1 className="text-2xl font-bold text-white truncate">{userProfile?.full_name || 'Utilisateur'}</h1>
          <p className="text-sm text-muted-foreground truncate">{userProfile?.email}</p>
          <p className="text-xs text-primary capitalize mt-1">{userProfile?.user_type?.replace('_', ' ')}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              <Shield className="w-4 h-4 mr-2" />
              Tableau de bord
            </Button>
          )}
          {isSecretary && (
            <Button variant="outline" size="sm" onClick={() => navigate('/secretary')}>
              <Shield className="w-4 h-4 mr-2" />
              Administration
            </Button>
          )}
        </div>
        <Button variant="destructive" size="sm" onClick={handleSignOut} className="flex-shrink-0">
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </div>
      <div className="mt-6">
        <WhatsAppCommunityButton />
      </div>
    </div>
  );
};

export default ProfileHeader;