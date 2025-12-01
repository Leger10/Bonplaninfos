import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Gift, Repeat, Settings, Wallet, LayoutDashboard } from 'lucide-react';
import MyEventsTab from '@/components/profile/MyEventsTab';
import ReferralTab from '@/components/profile/ReferralTab';
import TransactionsTab from '@/components/profile/TransactionsTab';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WithdrawalTab from '@/components/profile/WithdrawalTab';
import OrganizerDashboardTab from '@/components/profile/OrganizerDashboardTab';

const ProfilePageContent = ({ 
  userProfile, 
  userEvents, 
  userTransactions, 
  loadingEvents, 
  referralData, 
  organizerStats, 
  loadingOrganizerStats,
  activeTab = 'events' 
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentTab, setCurrentTab] = useState(activeTab);
  
  const isOrganizer = userProfile?.user_type === 'organizer' || userProfile?.user_type === 'admin' || userProfile?.user_type === 'super_admin';

  // Synchroniser l'onglet actif avec l'URL
  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const handleTabChange = (value) => {
    setCurrentTab(value);
    if (value === 'settings') {
      navigate('/settings');
    } else {
      // Mettre à jour l'URL sans recharger la page
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('tab', value);
      navigate(`/profile?${newSearchParams.toString()}`, { replace: true });
    }
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="flex flex-wrap h-auto p-1">
        {isOrganizer && (
          <TabsTrigger value="dashboard" className="flex items-center text-xs sm:text-sm">
            <LayoutDashboard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Tableau de bord</span>
            <span className="sm:hidden">Dashboard</span>
          </TabsTrigger>
        )}
        <TabsTrigger value="events" className="flex items-center text-xs sm:text-sm">
          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Événements</span>
          <span className="sm:hidden">Events</span>
        </TabsTrigger>
        <TabsTrigger value="referrals" className="flex items-center text-xs sm:text-sm">
          <Gift className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Parrainage</span>
          <span className="sm:hidden">Refs</span>
        </TabsTrigger>
        <TabsTrigger value="transactions" className="flex items-center text-xs sm:text-sm">
          <Repeat className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Transactions</span>
          <span className="sm:hidden">Transactions</span>
        </TabsTrigger>
        {isOrganizer && (
          <TabsTrigger value="withdrawals" className="flex items-center text-xs sm:text-sm">
            <Wallet className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Retraits</span>
            <span className="sm:hidden">Retraits</span>
          </TabsTrigger>
        )}
        <TabsTrigger value="settings" className="flex items-center text-xs sm:text-sm">
          <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Paramètres</span>
          <span className="sm:hidden">Settings</span>
        </TabsTrigger>
      </TabsList>

      {isOrganizer && (
        <TabsContent value="dashboard" className="mt-4">
          <OrganizerDashboardTab stats={organizerStats} loading={loadingOrganizerStats} />
        </TabsContent>
      )}

      <TabsContent value="events" className="mt-4">
        <MyEventsTab userProfile={userProfile} userEvents={userEvents} loadingEvents={loadingEvents} />
      </TabsContent>

      <TabsContent value="referrals" className="mt-4">
        <ReferralTab referralData={referralData} />
      </TabsContent>

      <TabsContent value="transactions" className="mt-4">
        <TransactionsTab userTransactions={userTransactions} />
      </TabsContent>

      {isOrganizer && (
        <TabsContent value="withdrawals" className="mt-4">
          <WithdrawalTab />
        </TabsContent>
      )}
    </Tabs>
  );
};

export default ProfilePageContent;