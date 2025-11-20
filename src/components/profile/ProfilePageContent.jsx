import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Gift, Repeat, Settings, Wallet, LayoutDashboard } from 'lucide-react';
import MyEventsTab from '@/components/profile/MyEventsTab';
import ReferralTab from '@/components/profile/ReferralTab';
import TransactionsTab from '@/components/profile/TransactionsTab';
import { useNavigate } from 'react-router-dom';
import WithdrawalTab from '@/components/profile/WithdrawalTab';
import OrganizerDashboardTab from '@/components/profile/OrganizerDashboardTab';

const ProfilePageContent = ({ userProfile, userEvents, userTransactions, loadingEvents, referralData, organizerStats, loadingOrganizerStats }) => {
  const navigate = useNavigate();
  const isOrganizer = userProfile?.user_type === 'organizer' || userProfile?.user_type === 'admin' || userProfile?.user_type === 'super_admin';

  return (
    <Tabs defaultValue={isOrganizer ? "dashboard" : "events"} className="w-full">
      <TabsList>
        {isOrganizer && <TabsTrigger value="dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />Tableau de bord</TabsTrigger>}
        <TabsTrigger value="events"><Calendar className="w-4 h-4 mr-2" />Événements</TabsTrigger>
        <TabsTrigger value="referrals"><Gift className="w-4 h-4 mr-2" />Parrainage</TabsTrigger>
        <TabsTrigger value="transactions"><Repeat className="w-4 h-4 mr-2" />Transactions</TabsTrigger>
        {isOrganizer && <TabsTrigger value="withdrawals"><Wallet className="w-4 h-4 mr-2" />Retraits</TabsTrigger>}
        <TabsTrigger value="settings" onClick={() => navigate('/settings')}><Settings className="w-4 h-4 mr-2" />Paramètres</TabsTrigger>
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