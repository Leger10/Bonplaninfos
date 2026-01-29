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

// Initialize with empty object to prevent destructuring errors if provider is missing
const DataContext = createContext({});

export const useData = () => {
  return useContext(DataContext);
};

// Utility for fetch retries with exponential backoff
const fetchWithRetry = async (
  fn,
  retries = 3,
  delay = 1000,
  fallbackValue = null,
) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      console.error("All fetch retries failed:", error);
      return { data: fallbackValue, error };
    }
    console.warn(
      `Fetch failed, retrying in ${delay}ms... (${retries} attempts left)`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 1.5, fallbackValue);
  }
};

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Core Data State
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
  const [notificationBellAnimation, setNotificationBellAnimation] =
    useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Cache mechanism
  const profileCache = useRef({ data: null, userId: null, timestamp: 0 });
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Visual & Sound Effects State
  const [visualEffects, setVisualEffects] = useState([]);
  const [soundEffect, setSoundEffect] = useState(null);

  // --- Effects Handlers ---
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

  // --- Fetching Logic ---

  // 1. Fetch User Profile with Cache and Performance Monitoring
  const fetchUserProfile = useCallback(async () => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const now = Date.now();
    const isCacheValid =
      profileCache.current.data &&
      profileCache.current.userId === user.id &&
      now - profileCache.current.timestamp < CACHE_DURATION;

    // Use cache if valid and not forced refresh (refreshTrigger increments on force)
    if (isCacheValid && refreshTrigger === 0) {
      console.log("Using cached user profile");
      setUserProfile(profileCache.current.data);
      return;
    }

    setLoadingProfile(true);
    console.time("fetchUserProfile");

    try {
      // Use .maybeSingle() for safe query handling of potentially missing profiles
      const { data, error } = await fetchWithRetry(
        () =>
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        3,
        500,
        null,
      );

      if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setUserProfile(data);
        // Update Cache
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
    } finally {
      console.timeEnd("fetchUserProfile");
      setLoadingProfile(false);
    }
  }, [user, refreshTrigger]);

  // 2. Fetch App Settings
  const fetchAppSettings = useCallback(async () => {
    try {
      const { data, error } = await fetchWithRetry(
        () => supabase.from("app_settings").select("*").limit(1).maybeSingle(),
        2,
        1000,
        {},
      );

      if (!error && data) {
        setAppSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.warn("Exception fetching app_settings:", err);
    }
  }, []);

  // 3. Fetch Welcome Popups
  const fetchWelcomePopups = useCallback(async () => {
    try {
      const { data, error } = await fetchWithRetry(
        () =>
          supabase
            .from("welcome_popups")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
        2,
        1000,
        [],
      );

      if (!error && data) {
        setWelcomePopups(data);
      }
    } catch (err) {
      console.warn("Exception fetching welcome_popups:", err);
    }
  }, []);

  // 4. Fetch Notification Count
  const fetchNotificationCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (!error) {
        setNotificationCount(count || 0);
      }
    } catch (err) {
      console.error("Error fetching notification count:", err);
    }
  }, [user]);

  // 5. Update User Profile Function
  const updateUserProfile = useCallback(
    async (userId, updates) => {
      setLoadingProfile(true);
      console.log("Updating profile:", Object.keys(updates));
      try {
        // Use RPC for secure update including email/bio
        const { data, error } = await supabase.rpc("update_user_profile", {
          p_user_id: userId,
          p_full_name: updates.full_name,
          p_email: updates.email,
          p_phone: updates.phone,
          p_city: updates.city,
          p_country: updates.country,
          p_bio: updates.bio,
          p_avatar_url: updates.avatar_url,
        });

        if (error) throw error;

        console.log("Profile updated successfully");

        // Force refresh to update local state immediately
        await fetchUserProfile();
        // Or more aggressively invalidate cache
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

  // Initial Data Load (Parallelized)
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
  }, [fetchAppSettings, fetchWelcomePopups]);

  // Profile & Notification Load on User Change
  useEffect(() => {
    fetchUserProfile();
    fetchNotificationCount();
  }, [fetchUserProfile, fetchNotificationCount]);

  // Realtime Subscription for Profile and Notifications
  useEffect(() => {
    if (!user) return;

    // Profile updates
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

    // Notification updates (New events, etc.)
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
          triggerSoundEffect("notification"); // Play sound in app
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [user, fetchUserProfile, fetchNotificationCount, triggerSoundEffect]);

  const forceRefreshUserProfile = useCallback(() => {
    // Invalidate cache and trigger refresh
    profileCache.current = { ...profileCache.current, timestamp: 0 };
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const triggerNotificationAnimation = useCallback(() => {
    setNotificationBellAnimation(true);
    setTimeout(() => setNotificationBellAnimation(false), 1000);
  }, []);

  // Helper to fetch events with optimized selection
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

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching events:", error);
      return [];
    }
  }, []);

  // Helper to fetch promotions
  const getPromotions = useCallback(async (filters = {}) => {
    try {
      let query = supabase
        .from("event_promotions")
        .select("*, organizer:organizer_id(full_name, email)")
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
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
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
