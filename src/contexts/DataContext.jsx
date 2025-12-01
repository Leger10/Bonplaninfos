import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from './SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { user, loading: authLoading, session, hasFetchError: authHasFetchError } = useAuth();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState(null);
  const [adminConfig, setAdminConfig] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [visualEffects, setVisualEffects] = useState([]);
  const [soundEffect, setSoundEffect] = useState(null);
  const [dataFetchError, setDataFetchError] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const hasFetchError = authHasFetchError || dataFetchError;

  const triggerVisualEffect = useCallback((type) => {
    const id = Date.now();
    setVisualEffects(prev => [...prev, { id, type }]);
  }, []);

  const removeVisualEffect = useCallback((id) => {
    setVisualEffects(prev => prev.filter(effect => !effect.id.toString().startsWith(id.toString().split('-')[0])));
  }, []);

  const triggerSoundEffect = useCallback((effect) => {
    setSoundEffect(effect);
  }, []);

  const clearSoundEffect = useCallback(() => {
    setSoundEffect(null);
  }, []);

  const fetchNotificationCount = useCallback(async () => {
    if (!user) {
      setNotificationCount(0);
      return;
    }
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setNotificationCount(count || 0);
    } catch (error) {
      console.error("Error fetching notification count:", error);
      setNotificationCount(0);
    }
  }, [user]);

  const fetchUserProfile = useCallback(async (currentUser) => {
    if (!currentUser || !currentUser.id) {
      setUserProfile(null);
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116: 0 rows returned
        throw error;
      }
      
      setUserProfile(data);
      setDataFetchError(false);

    } catch (error) {
        console.error('Error fetching user profile:', error);
        if(error instanceof TypeError && error.message.includes('Failed to fetch')) {
             setDataFetchError(true);
             toast({
                title: "Problème de connexion",
                description: "Profil inaccessible. Une extension (ex: antivirus) pourrait bloquer les requêtes.",
                variant: "destructive",
                duration: Infinity,
            });
        }
      setUserProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [toast]);

  const forceRefreshUserProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser(); // Re-fetch user from supabase
    if (currentUser) {
      return fetchUserProfile(currentUser);
    }
    return Promise.resolve();
  }, [fetchUserProfile]);


  const fetchAdminConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      const { data: coinPacksData, error: coinPacksError } = await supabase
        .from('coin_packs')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (coinPacksError) throw coinPacksError;

      const { data: promotionPacksData, error: promotionPacksError } = await supabase
        .from('promotion_packs')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (promotionPacksError) throw promotionPacksError;

      setAdminConfig({
        ...settingsData,
        coin_packs: coinPacksData || [],
        promotion_packs: promotionPacksData || [],
      });
      setDataFetchError(false);
    } catch (error) {
      console.error('Error fetching admin config:', error);
      if(error instanceof TypeError && error.message.includes('Failed to fetch')) {
             setDataFetchError(true);
             toast({
                title: "Problème de connexion",
                description: "Configuration inaccessible. Une extension (ex: antivirus) pourrait bloquer les requêtes.",
                variant: "destructive",
                duration: Infinity,
            });
        }
      setAdminConfig(null);
    } finally {
      setLoadingConfig(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchNotificationCount();
      const channel = supabase
        .channel('realtime-notifications')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
          (payload) => {
            fetchNotificationCount();
            const newNotification = payload.new;
            if (newNotification.sound_enabled) {
              if (newNotification.type === 'earning') {
                triggerSoundEffect('coin');
                triggerVisualEffect('bubbles');
              } else {
                 triggerSoundEffect(newNotification.sound_effect || 'default');
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, triggerSoundEffect, triggerVisualEffect, fetchNotificationCount]);

  useEffect(() => {
    if (!authLoading) {
      fetchUserProfile(user);
    }
    if (!hasFetchError) {
      fetchAdminConfig();
    }
  }, [user, authLoading, hasFetchError, fetchUserProfile, fetchAdminConfig]);

  const updateUserProfile = async (userId, updates) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      setUserProfile(data);
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const getEvents = useCallback(async (filters = {}) => {
    let query = supabase.from('events').select('*, organizer:organizer_id(full_name)');
    if (filters.organizer_id) query = query.eq('organizer_id', filters.organizer_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.country) query = query.eq('country', filters.country);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching events:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) throw error;
    }
    return data || [];
  }, []);

  const getPromotions = useCallback(async (filters = {}) => {
    let query = supabase
      .from('event_promotions')
      .select('*, event:event_id(*, organizer:organizer_id(full_name)), pack:promotion_pack_id(*)');
    
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.country) {
      query = query.eq('event.country', filters.country);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching promotions:', error);
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) throw error;
        return [];
    }
    
    if (!data) return [];

    return data.map(p => {
        const eventData = p.event || {};
        const packData = p.pack || {};
        return {
            id: p.id,
            event_id: eventData.id,
            title: eventData.title,
            description: eventData.description,
            cover_image: eventData.cover_image,
            category: eventData.category_id,
            city: eventData.city,
            organizer_id: eventData.organizer_id,
            organizer: eventData.organizer,
            pack_name: packData.name,
            pack_expires_at: p.end_date,
            cost_pi: p.cost_pi,
            created_at: p.created_at,
            status: p.status,
        }
    }).filter(p => p.event_id);
  }, []);

  const getUserTransactions = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching transactions:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) throw error;
    }
    return data || [];
  }, []);


// Dans votre DataContext, ajoutez cette fonction :
const refreshUserProfile = useCallback(async () => {
  if (!user) return;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    
    setUserProfile(data);
    return data;
  } catch (error) {
    console.error('Erreur rafraîchissement profil:', error);
    throw error;
  }
}, [user]);

  // Dans DataContext.jsx - AJOUTER CETTE FONCTION
const refreshCoinBalance = useCallback(async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (data) {
      setUserProfile(prev => ({
        ...prev,
        coin_balance: data.coin_balance
      }));
    }
  } catch (error) {
    console.error('Erreur rafraîchissement solde coin_balance:', error);
  }
}, []);
  const getAnalyticsData = useCallback(async (range) => {
    const getStartDate = (range) => {
      const date = new Date();
      if (range === '7d') date.setDate(date.getDate() - 7);
      else if (range === '30d') date.setDate(date.getDate() - 30);
      else if (range === '90d') date.setDate(date.getDate() - 90);
      else if (range === '1y') date.setFullYear(date.getFullYear() - 1);
      return date.toISOString();
    };
    const startDate = getStartDate(range);

    const [
      { data: users, error: usersError },
      { data: transactions, error: transactionsError },
      { data: events, error: eventsError },
      { data: totalSpentData, error: totalSpentError },
      { data: totalPurchasedData, error: totalPurchasedError },
      { data: adminCredits, error: adminCreditsError }
    ] = await Promise.all([
        supabase.from('profiles').select('id, country, city, created_at, user_type, is_active').gte('created_at', startDate),
        supabase.from('transactions').select('user_id, transaction_type, amount_fcfa, created_at').gte('created_at', startDate),
        supabase.from('events').select('organizer_id, created_at').gte('created_at', startDate),
        supabase.from('coin_spending').select('amount'),
        supabase.from('user_coin_transactions').select('total_coins').eq('status', 'completed'),
        supabase.from('admin_logs').select('details, target_user:target_id(country)').eq('action_type', 'user_credited').neq('details->>reversed', 'true').gte('created_at', startDate)
    ]);

    if (usersError || transactionsError || eventsError || totalSpentError || totalPurchasedError || adminCreditsError) {
      console.error('Analytics fetch error:', { usersError, transactionsError, eventsError, totalSpentError, totalPurchasedError, adminCreditsError });
      throw new Error('Failed to fetch analytics data');
    }

    const totalSpent = totalSpentData.reduce((sum, t) => sum + t.amount, 0);
    const totalPurchased = totalPurchasedData.reduce((sum, t) => sum + t.total_coins, 0);

    return { users, transactions, events, totalSpent, totalPurchased, adminCredits };
  }, []);

  const forceRefreshAdminConfig = useCallback(() => {
    return fetchAdminConfig();
  }, [fetchAdminConfig]);

  const value = {
    userProfile,
    loadingProfile,
    adminConfig,
    loadingConfig,
    hasFetchError,
    forceRefreshUserProfile,
    forceRefreshAdminConfig,
    updateUserProfile,
    getEvents,
    getPromotions,
    getUserTransactions,
    refreshUserProfile,
    refreshCoinBalance,
    getAnalyticsData,
    visualEffects,
    triggerVisualEffect,
    removeVisualEffect,
    soundEffect,
    triggerSoundEffect,
    clearSoundEffect,
    notificationCount,
    fetchNotificationCount,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};