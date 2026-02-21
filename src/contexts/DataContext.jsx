import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";
import { retrySupabaseRequest } from "@/lib/supabaseHelper";

const DataContext = createContext({});

export const useData = () => {
  return useContext(DataContext);
};

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState(null);
  const [welcomePopups, setWelcomePopups] = useState([]);
  const [appSettings, setAppSettings] = useState({
    app_name: "BonPlanInfos",
    maintenance_mode: false,
    coin_to_fcfa_rate: 10,
    min_withdrawal_pi: 50,
    support_email: "support@bonplaninfos.net",
  });
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [notificationBellAnimation, setNotificationBellAnimation] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [globalError, setGlobalError] = useState(null);

  const profileCache = useRef({ data: null, userId: null, timestamp: 0 });
  const fetchFailureCount = useRef(0); // Circuit breaker counter
  const CACHE_DURATION = 5 * 60 * 1000; 

  const [visualEffects, setVisualEffects] = useState([]);
  const [soundEffect, setSoundEffect] = useState(null);

  const addVisualEffect = useCallback((type) => {
    const id = Math.random().toString(36).substr(2, 9);
    setVisualEffects((prev) => [...prev, { id, type }]);
  }, []);

  const removeVisualEffect = useCallback((id) => {
    setVisualEffects((prev) => prev.filter((effect) => effect.id !== id));
  }, []);

  const triggerSoundEffect = useCallback((effectName) => {
    setSoundEffect(effectName);
  }, []);

  const clearSoundEffect = useCallback(() => {
    setSoundEffect(null);
  }, []);

  const fetchUserProfile = useCallback(async () => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    // Circuit breaker: Stop trying after 3 consecutive failures
    if (fetchFailureCount.current >= 3) {
      console.warn("Fetch profile stopped due to repeated failures.");
      return;
    }

    const now = Date.now();
    const isCacheValid =
      profileCache.current.data &&
      profileCache.current.userId === user.id &&
      now - profileCache.current.timestamp < CACHE_DURATION;

    if (isCacheValid && refreshTrigger === 0) {
      console.log("Using cached user profile");
      setUserProfile(profileCache.current.data);
      return;
    }

    setLoadingProfile(true);
    console.time("fetchUserProfile");

    try {
      const { data, error } = await retrySupabaseRequest(
        () => supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      );

      if (error) {
        console.error("Error fetching profile:", error);
        fetchFailureCount.current += 1;
        
        if (error.code === "NETWORK_ERROR") {
           // Only toast on first failure to avoid spam
           if (fetchFailureCount.current === 1) {
             toast({
               title: "Erreur de connexion",
               description: "Impossible de charger votre profil. Vérifiez votre connexion.",
               variant: "destructive"
             });
           }
        }
      } else if (data) {
        setUserProfile(data);
        fetchFailureCount.current = 0; // Reset on success
        setGlobalError(null);
        profileCache.current = {
          data: data,
          userId: user.id,
          timestamp: Date.now(),
        };
      } else {
        console.warn(
          `Profile missing for user ${user.id} in DataContext (should have been auto-created)`,
        );
      }
    } catch (err) {
      console.error("Exception fetching profile:", err);
      fetchFailureCount.current += 1;
    } finally {
      console.timeEnd("fetchUserProfile");
      setLoadingProfile(false);
    }
  }, [user?.id, refreshTrigger, toast]); // Depend on user.id, not user object

  const fetchAppSettings = useCallback(async () => {
    try {
      const { data, error } = await retrySupabaseRequest(
        () => supabase.from("app_settings").select("*").limit(1).maybeSingle()
      );

      if (!error && data) {
        setAppSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.warn("Exception fetching app_settings:", err);
    }
  }, []);

  const fetchWelcomePopups = useCallback(async () => {
    try {
      const { data, error } = await retrySupabaseRequest(
        () => supabase
            .from("welcome_popups")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
      );

      if (!error && data) {
        setWelcomePopups(data);
      }
    } catch (err) {
      console.warn("Exception fetching welcome_popups:", err);
    }
  }, []);

  const fetchNotificationCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count, error } = await retrySupabaseRequest(
        () => supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false)
      );

      if (!error) {
        setNotificationCount(count || 0);
      }
    } catch (err) {
      console.error("Error fetching notification count:", err);
    }
  }, [user?.id]); // Depend on user.id

  const updateUserProfile = useCallback(
    async (userId, updates) => {
      setLoadingProfile(true);
      console.log("Updating profile:", Object.keys(updates));
      try {
        const { data, error } = await retrySupabaseRequest(
          () => supabase.rpc("update_user_profile", {
            p_user_id: userId,
            p_full_name: updates.full_name,
            p_email: updates.email,
            p_phone: updates.phone,
            p_city: updates.city,
            p_country: updates.country,
            p_bio: updates.bio,
            p_avatar_url: updates.avatar_url,
          })
        );

        if (error) throw error;

        console.log("Profile updated successfully");
        await fetchUserProfile();
        profileCache.current = { ...profileCache.current, timestamp: 0 };
        setRefreshTrigger((prev) => prev + 1);

        return { success: true, data };
      } catch (error) {
        console.error("Profile update error:", error);
        return { success: false, error };
      } finally {
        setLoadingProfile(false);
      }
    },
    [fetchUserProfile],
  );

  useEffect(() => {
    let isMounted = true;

    const loadGlobalData = async () => {
      if (!navigator.onLine) {
        toast({
          title: "Mode hors ligne",
          description: "Vérifiez votre connexion internet.",
          variant: "warning",
        });
      }

      setLoading(true);
      try {
        await Promise.all([fetchAppSettings(), fetchWelcomePopups()]);
      } catch (e) {
        console.error("Global data load error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadGlobalData();

    return () => {
      isMounted = false;
    };
  }, [fetchAppSettings, fetchWelcomePopups, toast]);

  useEffect(() => {
    fetchUserProfile();
    fetchNotificationCount();
  }, [fetchUserProfile, fetchNotificationCount]);

  useEffect(() => {
    if (!user) return;

    const profileChannel = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Profile updated via realtime:", payload);
          profileCache.current = { ...profileCache.current, timestamp: 0 };
          fetchUserProfile();
        },
      )
      .subscribe();

    const notificationChannel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New notification received:", payload);
          fetchNotificationCount();
          setNotificationBellAnimation(true);
          setTimeout(() => setNotificationBellAnimation(false), 1000);
          triggerSoundEffect("notification"); 
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [user?.id, fetchUserProfile, fetchNotificationCount, triggerSoundEffect]);

  const forceRefreshUserProfile = useCallback(() => {
    fetchFailureCount.current = 0; // Reset circuit breaker on manual refresh
    profileCache.current = { ...profileCache.current, timestamp: 0 };
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const triggerNotificationAnimation = useCallback(() => {
    setNotificationBellAnimation(true);
    setTimeout(() => setNotificationBellAnimation(false), 1000);
  }, []);

  const getEvents = useCallback(async (filters = {}) => {
    try {
      let query = supabase
        .from("events")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (filters.organizer_id) {
        query = query.eq("organizer_id", filters.organizer_id);
      }

      if (filters.country) {
        query = query.eq("country", filters.country);
      }

      const { data, error } = await retrySupabaseRequest(() => query);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching events:", error);
      return [];
    }
  }, []);

  const getPromotions = useCallback(async (filters = {}) => {
    try {
      let query = supabase
        .from("event_promotions")
        .select("*, organizer:organizer_id(full_name, email)")
        .order("created_at", { ascending: false });

      const { data, error } = await retrySupabaseRequest(() => query);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching promotions:", error);
      return [];
    }
  }, []);

  const value = {
    userProfile,
    welcomePopups,
    appSettings,
    loading,
    loadingProfile,
    notificationBellAnimation,
    notificationCount,
    fetchNotificationCount,
    forceRefreshUserProfile,
    updateUserProfile,
    triggerNotificationAnimation,
    refreshData: () => {
      fetchAppSettings();
      fetchWelcomePopups();
      forceRefreshUserProfile();
      fetchNotificationCount();
    },
    getEvents,
    getPromotions,
    visualEffects,
    addVisualEffect,
    removeVisualEffect,
    soundEffect,
    triggerSoundEffect,
    clearSoundEffect,
    globalError
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};