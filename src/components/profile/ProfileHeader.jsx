import React from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Share2, 
  Camera, 
  MapPin, 
  ShieldCheck, 
  LogOut,
  LayoutDashboard,
  Crown,
  Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import WhatsAppCommunityButton from '@/components/WhatsAppCommunityButton';
const ProfileHeader = () => {
  const { user, signOut } = useAuth();
  const { userProfile } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleShareProfile = () => {
    const url = `${window.location.origin}/profile/${user?.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Lien copié !",
      description: "Le lien de votre profil a été copié dans le presse-papier.",
    });
  };

  const isSuperAdmin = userProfile?.user_type === 'super_admin';
  const isAdmin = userProfile?.user_type === 'admin';
  const isSecretary = userProfile?.user_type === 'secretary';
  
  // Check if user has any administrative privileges
  const hasAdminAccess = isSuperAdmin || isAdmin || isSecretary;

  const handleAdminNavigation = () => {
    if (isSecretary) {
        navigate('/secretary');
    } else {
        navigate('/admin');
    }
  };

  return (
    <div className="relative mb-8">
      {/* Cover Image Placeholder */}
      <div className="h-32 md:h-48 rounded-t-2xl bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* Profile Info Card */}
      <div className="bg-black rounded-b-2xl shadow-sm border-x border-b border-gray-800 px-4 pb-6 md:px-8 relative">
        <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 md:-mt-16 mb-4 gap-4">
          
          {/* Avatar */}
          <div className="relative group">
            <div className="rounded-full p-1 bg-black shadow-sm">
              <Avatar className="h-24 w-24 md:h-32 md:w-32 border-2 border-gray-800 shadow-md">
                <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.full_name} className="object-cover" />
                <AvatarFallback className="text-2xl bg-gray-900 text-white">
                  {userProfile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <Button 
              size="icon" 
              variant="secondary" 
              className="absolute bottom-2 right-2 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 hover:bg-gray-700"
              onClick={() => navigate('/settings')}
            >
              <Camera className="h-4 w-4 text-white" />
            </Button>
          </div>

          {/* User Details */}
          <div className="flex-1 space-y-1 mt-2 md:mb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                {userProfile?.full_name || 'Utilisateur'}
              </h1>
              {userProfile?.is_verified && (
                <ShieldCheck className="h-5 w-5 text-blue-500" />
              )}
              {isSuperAdmin && (
                <Badge variant="outline" className="bg-purple-900 text-purple-300 border-purple-700 gap-1">
                  <Crown className="h-3 w-3" /> Super Admin
                </Badge>
              )}
              {isSecretary && (
                <Badge variant="outline" className="bg-blue-900 text-blue-300 border-blue-700 gap-1">
                  <Briefcase className="h-3 w-3" /> Secrétaire
                </Badge>
              )}
              
            </div>
            
            <p className="text-gray-300 font-medium">@{userProfile?.username || user?.email?.split('@')[0]}</p>
            
            {(userProfile?.city || userProfile?.country) && (
              <div className="flex items-center text-sm text-gray-400 mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                {userProfile?.city}{userProfile?.city && userProfile?.country ? ', ' : ''}{userProfile?.country}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto mt-4 md:mt-0 bg-gray-900 p-4 rounded-lg">
            {hasAdminAccess && (
              <Button 
                onClick={handleAdminNavigation}
                className="bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-md hover:shadow-lg transition-all hover:from-gray-700 hover:to-gray-800"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                {isSecretary ? 'Accéder à mon Administration' : "Administration"}
              </Button>
            )}
            
            <div className="mt-6">
        <WhatsAppCommunityButton />
      </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/settings')}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-400 hover:text-red-300 hover:bg-gray-800" 
              onClick={signOut}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Bio */}
        {userProfile?.bio && (
          <p className="text-sm text-gray-400 mt-4 max-w-2xl">
            {userProfile.bio}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;