import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Loader2, Ticket, Star, Users, User, Settings, ShieldCheck, Heart } from 'lucide-react';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import MyTicketsTab from '@/components/profile/MyTicketsTab';
import MyEventsTab from '@/components/profile/MyEventsTab';
import ReferralTab from '@/components/profile/ReferralTab';
import PartnerDashboardTab from '@/components/profile/PartnerDashboardTab';
import OrganizerDashboardTab from '@/components/profile/OrganizerDashboardTab';
import CreatorDashboardTab from '@/components/profile/CreatorDashboardTab';
import MyFavoritesTab from '@/components/profile/MyFavoritesTab';
import { toast } from '@/components/ui/use-toast';
import { useLocation } from 'react-router-dom';

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loadingProfile, fetchNotificationCount } = useData();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("tickets");

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    fetchNotificationCount();
  }, [fetchNotificationCount]);

  if (authLoading || loadingProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-10 flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Non connecté</CardTitle>
            <CardDescription>Veuillez vous connecter pour voir votre profil.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isOrganizer = userProfile?.user_type === 'organizer' || userProfile?.user_type === 'admin' || userProfile?.user_type === 'super_admin';
  const isAdmin = userProfile?.user_type === 'admin' || userProfile?.user_type === 'super_admin';
  const isPartner = userProfile?.user_type === 'partner' || userProfile?.user_type === 'admin' || userProfile?.user_type === 'super_admin';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Section */}
      <ProfileHeader userProfile={userProfile} />

      <main className="container max-w-6xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid gap-6">
          {/* Stats Cards */}
          <ProfileStats userProfile={userProfile} />

          {/* Main Content Tabs */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex justify-center mb-6">
                  <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:flex lg:gap-2 bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="tickets" className="flex gap-2">
                      <Ticket className="w-4 h-4" />
                      <span className="hidden sm:inline">Billets</span>
                    </TabsTrigger>
                    
                    <TabsTrigger value="favorites" className="flex gap-2">
                      <Heart className="w-4 h-4" />
                      <span className="hidden sm:inline">Favoris</span>
                    </TabsTrigger>

                    <TabsTrigger value="referral" className="flex gap-2">
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">Parrainage</span>
                    </TabsTrigger>

                    {isOrganizer && (
                      <TabsTrigger value="organizer" className="flex gap-2">
                        <Star className="w-4 h-4" />
                        <span className="hidden sm:inline">Retrait</span>
                      </TabsTrigger>
                    )}
                    
                    {/* Creator Tab for everyone to see earnings from content creation */}
                    <TabsTrigger value="creator" className="flex gap-2">
                       <User className="w-4 h-4" />
                       <span className="hidden sm:inline">Créateur</span>
                    </TabsTrigger>

                    {isPartner && (
                      <TabsTrigger value="partner" className="flex gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">Partenaire</span>
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <TabsContent value="tickets" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <MyTicketsTab />
                </TabsContent>
                
                <TabsContent value="favorites" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <MyFavoritesTab />
                </TabsContent>

                <TabsContent value="organizer" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-8">
                    <OrganizerDashboardTab />
                    <MyEventsTab />
                  </div>
                </TabsContent>
                
                <TabsContent value="creator" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <CreatorDashboardTab />
                </TabsContent>

                <TabsContent value="partner" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <PartnerDashboardTab />
                </TabsContent>

                <TabsContent value="referral" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <ReferralTab userProfile={userProfile} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;