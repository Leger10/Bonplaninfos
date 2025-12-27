import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import MyEventsTab from '@/components/profile/MyEventsTab';
import TransactionsTab from '@/components/profile/TransactionsTab';
import ReferralTab from '@/components/profile/ReferralTab';
import CreatorDashboardTab from '@/components/profile/CreatorDashboardTab';
import MyTicketsTab from '@/components/profile/MyTicketsTab';
import WithdrawalTab from '@/components/profile/WithdrawalTab';
import { Ticket, Calendar, History, Users, Wallet, Sparkles } from 'lucide-react';

const ProfilePageContent = ({ 
  userProfile, 
  userEvents, 
  userTransactions, 
  loadingEvents, 
  referralData
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'events';

  const handleTabChange = (value) => {
    setSearchParams({ tab: value });
  };

  const isOrganizer = ['organizer', 'admin', 'super_admin'].includes(userProfile?.user_type);

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:grid-cols-6 mb-8 h-auto p-1 bg-muted/50 rounded-xl gap-1">
        <TabsTrigger value="events" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-3">
          <Calendar className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Événements</span>
          <span className="sm:hidden">Events</span>
        </TabsTrigger>
        
        {isOrganizer && (
          <TabsTrigger value="creator" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-3">
            <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />
            <span className="hidden sm:inline">Créateur</span>
            <span className="sm:hidden">Créateur</span>
          </TabsTrigger>
        )}
        
        <TabsTrigger value="tickets" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-3">
          <Ticket className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Mes Billets</span>
          <span className="sm:hidden">Billets</span>
        </TabsTrigger>

        <TabsTrigger value="transactions" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-3">
          <History className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Historique</span>
          <span className="sm:hidden">Hist.</span>
        </TabsTrigger>

        <TabsTrigger value="referral" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-3">
          <Users className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Parrainage</span>
          <span className="sm:hidden">Parrain.</span>
        </TabsTrigger>

        {isOrganizer && (
          <TabsTrigger value="withdrawals" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-3">
            <Wallet className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Retraits</span>
            <span className="sm:hidden">Retraits</span>
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="events" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <MyEventsTab 
          userProfile={userProfile} 
          userEvents={userEvents} 
          loadingEvents={loadingEvents} 
        />
      </TabsContent>

      {isOrganizer && (
        <TabsContent value="creator" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CreatorDashboardTab />
        </TabsContent>
      )}

      <TabsContent value="tickets" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <MyTicketsTab />
      </TabsContent>

      <TabsContent value="transactions" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <TransactionsTab transactions={userTransactions} />
      </TabsContent>

      <TabsContent value="referral" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ReferralTab userProfile={userProfile} referralData={referralData} />
      </TabsContent>

      {isOrganizer && (
        <TabsContent value="withdrawals" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <WithdrawalTab userProfile={userProfile} />
        </TabsContent>
      )}
    </Tabs>
  );
};

export default ProfilePageContent;