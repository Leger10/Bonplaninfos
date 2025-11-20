import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Loader2 } from 'lucide-react';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfilePageContent from '@/components/profile/ProfilePageContent';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading, hasFetchError: authError } = useAuth();
  const { userProfile, loadingProfile, getEvents, hasFetchError: dataContextError } = useData();
  const [userEvents, setUserEvents] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [referralData, setReferralData] = useState({ count: 0, coins: 0 });
  const [organizerStats, setOrganizerStats] = useState(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingOrganizerStats, setLoadingOrganizerStats] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const isLoading = authLoading || loadingProfile;

  const fetchPageData = useCallback(async () => {
    if (!user || !userProfile) {
      setLoadingContent(false);
      setLoadingOrganizerStats(false);
      return;
    }
    
    setLoadingContent(true);
    setLoadingOrganizerStats(true);
    try {
      const isOrganizer = ['organizer', 'admin', 'super_admin'].includes(userProfile.user_type);

      const promises = [
        getEvents({ organizer_id: user.id }),
        supabase.from('coin_spending').select('*').eq('user_id', user.id),
        supabase.from('user_coin_transactions').select('*').eq('user_id', user.id).eq('transaction_type', 'coin_purchase'),
        supabase.from('transactions').select('*').eq('user_id', user.id).in('transaction_type', ['earning', 'manual_credit', 'credit_reversal']),
        supabase.from('referral_rewards').select('id, referrer_reward').eq('referrer_id', user.id),
        isOrganizer ? supabase.from('organizer_balances').select('*').eq('organizer_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ];

      const [eventsRes, spendingRes, purchasesRes, earningsRes, referralsRes, orgStatsRes] = await Promise.all(promises);
      
      setUserEvents(eventsRes || []);
      
      const allTransactions = [
        ...(spendingRes.data || []),
        ...(purchasesRes.data?.map(t => ({...t, transaction_type: 'coin_purchase'})) || []),
        ...(earningsRes.data || [])
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setUserTransactions(allTransactions);
      
      if (referralsRes.data) {
          setReferralData({
              count: referralsRes.data.length,
              coins: referralsRes.data.reduce((acc, r) => acc + (r.referrer_reward || 0), 0)
          });
      }

      if (orgStatsRes.error && orgStatsRes.error.code !== 'PGRST116') throw orgStatsRes.error;
      setOrganizerStats(orgStatsRes.data);

    } catch (error) {
      console.error("Failed to fetch user data:", error);
      toast({
        title: t('profile_page.loading_error_title'),
        description: t('profile_page.loading_error_desc'),
        variant: "destructive",
      });
    } finally {
      setLoadingContent(false);
      setLoadingOrganizerStats(false);
    }
  }, [user, userProfile, getEvents, toast, t]);
  
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast({
          title: t('profile_page.unauthorized_title'),
          description: t('profile_page.unauthorized_desc'),
          variant: 'destructive',
        });
        navigate('/auth');
      } else if (userProfile) { // Ensure userProfile is loaded before fetching data dependent on it
        fetchPageData();
      }
    }
  }, [user, authLoading, userProfile, navigate, toast, fetchPageData, t]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (authError || dataContextError || !userProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <p className="text-destructive font-bold text-lg mb-4">{t('profile_page.connection_failed_title')}</p>
        <p className="text-muted-foreground mb-6">{t('profile_page.connection_failed_desc')}</p>
        <Button onClick={() => navigate('/auth')}>
          {t('profile_page.go_to_login')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t('profile_page.helmet_title', { name: userProfile.full_name || 'Mon Profil' })} - BonPlanInfos</title>
        <meta name="description" content={t('profile_page.helmet_desc', { name: userProfile.full_name })} />
      </Helmet>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ProfileHeader />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="my-8"
        >
          <ProfileStats userProfile={userProfile} eventCount={userEvents.length} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ProfilePageContent 
            userProfile={userProfile} 
            userEvents={userEvents} 
            userTransactions={userTransactions}
            loadingEvents={loadingContent} 
            referralData={referralData}
            organizerStats={organizerStats}
            loadingOrganizerStats={loadingOrganizerStats}
          />
        </motion.div>
      </main>
    </div>
  );
};

export default ProfilePage;