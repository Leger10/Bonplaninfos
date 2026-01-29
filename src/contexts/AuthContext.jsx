import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { checkAuthentication, initAuthListener } from '@/lib/authUtils';

const AuthContext = createContext(undefined);

// Helper for retrying promises with exponential backoff
const retryPromise = async (fn, retries = 3, delay = 500) => {
  try {
    return await fn();
  } catch (error) {
    // Critical: Catch Refresh Token errors immediately
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';
    const errorStatus = error?.status || '';
    const apiErrorCode = error?.error_code || ''; // Supabase specific
    
    const isRefreshTokenError = 
        errorMessage.includes('refresh_token_not_found') || 
        errorMessage.includes('Invalid Refresh Token') ||
        errorCode === 'refresh_token_not_found' ||
        apiErrorCode === 'refresh_token_not_found';

    if (isRefreshTokenError) {
        // Throw a specific error that we can catch and handle by logging out
        throw new Error('CRITICAL_AUTH_ERROR: Refresh Token Invalid');
    }

    // Don't retry 4xx errors (client errors)
    const isAuthError = errorStatus === 400 || errorStatus === 401 || errorStatus === 403 || 
                        (errorCode && (errorCode === 403 || errorCode === '403' || errorCode === 'bad_jwt' || errorCode === 'session_not_found')) ||
                        (errorMessage && (errorMessage.includes('bad_jwt') || errorMessage.includes('invalid claim') || errorMessage.includes('session_id')));

    if (isAuthError) {
      throw error;
    }

    if (retries <= 0) throw error;
    
    const isNetworkError = errorMessage && (
      errorMessage.includes('Failed to fetch') || 
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('Load failed')
    );
    
    if (isNetworkError) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryPromise(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasFetchError, setHasFetchError] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(() => () => { });

  const clearSessionData = useCallback(() => {
    console.log("Cleaning session data due to auth error...");
    try {
        // Clear all Supabase related items
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-')) {
                localStorage.removeItem(key);
            }
        }
        // Also clear supabase.auth.token if it exists (legacy)
        localStorage.removeItem('supabase.auth.token');
        
        // Clear session storage as well
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        // Clear redirect path
        localStorage.removeItem('redirectAfterLogin');
    } catch (e) {
        console.warn("Error clearing storage:", e);
    }
    
    setUser(null);
    setSession(null);
    setLicense(null);
  }, []);

  const fetchLicense = useCallback(async (userId) => {
    if (!userId) return;
    try {
        const { data: activeLicenseData } = await supabase
            .from('admin_licences')
            .select('*')
            .eq('admin_id', userId)
            .eq('statut', 'actif');

        if (activeLicenseData && activeLicenseData.length > 0) {
            const bestLicense = activeLicenseData.sort((a, b) => new Date(b.date_fin) - new Date(a.date_fin))[0];
            setLicense(bestLicense);
            return;
        } 
        
        const { data: anyLicenseData } = await supabase
            .from('admin_licences')
            .select('*')
            .eq('admin_id', userId)
            .limit(1);
            
        if (anyLicenseData && anyLicenseData.length > 0) {
            setLicense(anyLicenseData[0]);
        } else {
            setLicense(null);
        }
    } catch (err) {
        console.error("License fetch error:", err);
    }
  }, []);

  const handleSession = useCallback(async (currentSession, error = null) => {
    const sessionError = error || currentSession?.error;
    
    if (sessionError) {
        const errorMessage = sessionError.message || '';
        const errorCode = sessionError.code || sessionError.error_code || '';
        
        // Handle Critical Auth Errors
        if (errorMessage.includes('CRITICAL_AUTH_ERROR') || 
            errorMessage.includes('refresh_token_not_found') || 
            errorMessage.includes('Invalid Refresh Token') ||
            errorCode === 'refresh_token_not_found') {
            
            console.error("Critical Auth Error detected. Logging out.");
            clearSessionData();
            setLoading(false);
            setSessionChecked(true);
            return;
        }

        if (errorCode === 'session_not_found' || errorMessage.includes('session_not_found')) {
            clearSessionData();
            setLoading(false);
            setSessionChecked(true);
            return;
        }

        if (errorMessage.includes('session_id claim')) {
            clearSessionData();
            setLoading(false);
            setSessionChecked(true);
            return;
        }

        const isBadJwtError = 
            errorMessage.includes('bad_jwt') ||
            errorMessage.includes('invalid claim') || 
            errorMessage.includes('not found') ||
            errorMessage.includes('JWT');

        if (isBadJwtError) {
            clearSessionData();
        } else {
            setHasFetchError(true);
        }
        setLoading(false);
        setSessionChecked(true);
        return;
    }

    if (currentSession?.user) {
        const currentUser = currentSession.user;
        
        // CHECK IF USER IS ACTIVE
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_active')
                .eq('id', currentUser.id)
                .maybeSingle();
            
            if (profile && profile.is_active === false) {
                console.warn("User is deactivated. Logging out.");
                await supabase.auth.signOut();
                clearSessionData();
                setLoading(false);
                setSessionChecked(true);
                return; 
            }
        } catch (e) {
            console.error("Profile active check failed", e);
        }

        try {
            // Ensure profile exists
            const { error: profileError } = await supabase.rpc('ensure_user_profile_exists', {
                p_user_id: currentUser.id,
                p_email: currentUser.email,
                p_full_name: currentUser.user_metadata?.full_name
            });

            if (profileError) {
                console.error("Profile check error:", profileError);
            }
        } catch (e) {
            console.error("Profile verification exception:", e);
        }

        setSession(currentSession);
        setUser(currentUser);
        setHasFetchError(false);
        await fetchLicense(currentUser.id);
        
        if (typeof forceRefresh === 'function') {
            forceRefresh();
        }
    } else {
        setSession(null);
        setUser(null);
        setLicense(null);
    }

    setLoading(false);
    setSessionChecked(true);
  }, [forceRefresh, clearSessionData, fetchLicense]);

  // Global Error Handler for Edge Functions Auth
  useEffect(() => {
    const handleUnhandledRejection = async (event) => {
      const reason = event.reason;
      
      // Detect Supabase Edge Function Auth Errors
      const isAuthError = 
        reason?.message?.includes('AuthSessionMissingError') || 
        reason?.message?.includes('Invalid token') ||
        reason?.message?.includes('Unauthorized') ||
        (reason?.details && reason.details.__isAuthError) ||
        (reason?.name === 'FunctionsHttpError' && reason?.context?.json?.error === 'Unauthorized: Invalid token');

      if (isAuthError) {
        console.warn("Caught unhandled auth error (likely Edge Function). Attempting recovery...", reason);
        event.preventDefault(); // Prevent browser console error if possible
        
        // Attempt to refresh the session
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
            console.error("Session refresh failed during recovery. Logging out.");
            clearSessionData();
            window.location.href = '/auth';
        } else if (data.session) {
            console.log("Session successfully recovered.");
            // Update context state
            handleSession(data.session);
        }
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [clearSessionData, handleSession]);

  // Check initial session
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
        try {
            setLoading(true);
            
            // Attempt to get session using checkAuthentication utility
            const { isAuthenticated, user: authUser, session: authSession } = await checkAuthentication();
            
            if (!mounted) return;

            if (isAuthenticated && authUser && authSession) {
                await handleSession(authSession);
            } else {
                await handleSession(null);
            }
        } catch (err) {
            if (mounted) {
                await handleSession(null, err);
            }
        }
    };

    initSession();

    // Set up auth state listener
    const cleanup = initAuthListener();
    
    // Listen for custom auth events
    const handleAuthChange = (event) => {
      if (event.detail?.user) {
        setUser(event.detail.user);
        if (event.detail.session) {
          setSession(event.detail.session);
        }
      } else {
        setUser(null);
        setSession(null);
      }
    };
    
    window.addEventListener('authStateChanged', handleAuthChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log("Auth state change:", event);
        
        if (event === 'SIGNED_OUT') {
          clearSessionData();
          setLoading(false);
          setSessionChecked(true);
        } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          handleSession(session);
        }
      }
    );

    return () => {
      mounted = false;
      cleanup();
      subscription?.unsubscribe();
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, [handleSession, clearSessionData]);

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Force check profile status immediately after sign in
      if (data?.user) {
          const { data: profile } = await supabase
              .from('profiles')
              .select('is_active')
              .eq('id', data.user.id)
              .maybeSingle();
          
          if (profile && profile.is_active === false) {
              await supabase.auth.signOut();
              throw new Error('ACCOUNT_DEACTIVATED');
          }
      }

      setUser(data.user);
      setSession(data.session);
      
      // Check for redirect path
      const redirectPath = localStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectPath;
      }
      
      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Signup function
  const signup = useCallback(async (email, password, metadata) => {
    try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: metadata }
        });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    console.log("Logout started");
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            // Ignore specific errors during logout
            if (error.message?.includes('session_id claim') || error.message?.includes('JWT') || error.status === 403) {
                console.log("JWT error caught and ignored during logout");
            } else {
                console.warn("Supabase signOut warning (ignoring):", error.message);
            }
        }
    } catch (error) {
        console.log("Logout exception caught and ignored:", error);
    } finally {
        clearSessionData();
        
        toast({
            title: "Déconnexion réussie",
            description: "Vous avez été déconnecté avec succès.",
        });
        
        // Force reload to clear any in-memory state
        window.location.href = '/login';
    }
  }, [clearSessionData, toast]);

  // Check authentication before protected actions
  const requireAuth = useCallback(async (actionName = 'cette action') => {
    const { isAuthenticated } = await checkAuthentication();
    
    if (!isAuthenticated) {
      toast({
        title: "Authentification requise",
        description: `Vous devez être connecté pour ${actionName}.`,
        variant: "destructive",
      });
      
      // Store current path for redirect
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('redirectAfterLogin', currentPath);
      
      window.location.href = '/login';
      return false;
    }
    
    return true;
  }, [toast]);

  // Refresh session if needed
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        return { success: false, error: error.message };
      }
      
      if (data.session) {
        setUser(data.session.user);
        setSession(data.session);
        return { success: true, user: data.session.user, session: data.session };
      }
      
      return { success: false, error: 'No session after refresh' };
    } catch (error) {
      console.error('Session refresh error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const refreshLicense = useCallback(async () => {
    if (user) {
        await fetchLicense(user.id);
    }
  }, [user, fetchLicense]);

  // Helper to invoke functions with auto-retry on auth error
  const invokeFunction = useCallback(async (functionName, options = {}) => {
    // Wrap the invoke call in retryPromise to handle network errors
    return retryPromise(async () => {
        try {
            const { data, error } = await supabase.functions.invoke(functionName, options);
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            // Handle auth errors specifically
            if (error.message?.includes('AuthSessionMissingError') || error.context?.json?.error === 'Unauthorized: Invalid token') {
                 console.log("Auth error in invokeFunction, attempting refresh...");
                 const { error: refreshError } = await supabase.auth.refreshSession();
                 if (!refreshError) {
                     // Retry once
                     return await supabase.functions.invoke(functionName, options);
                 }
            }
            throw error;
        }
    });
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    license,
    loading,
    hasFetchError,
    sessionChecked,
    login,
    signup,
    logout,
    requireAuth,
    refreshSession,
    setForceRefresh,
    refreshLicense,
    invokeFunction,
    isAuthenticated: !!user,
  }), [
    user, session, license, loading, hasFetchError, sessionChecked, 
    login, signup, logout, requireAuth, refreshSession, 
    setForceRefresh, refreshLicense, invokeFunction
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = (Component) => {
  return function WithAuthComponent(props) {
    const { user, loading, sessionChecked, isAuthenticated } = useAuth();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
      const checkAccess = async () => {
        if (sessionChecked && !loading) {
          if (!isAuthenticated || !user) {
            // Store current path for redirect
            const currentPath = window.location.pathname + window.location.search;
            localStorage.setItem('redirectAfterLogin', currentPath);
            
            // Redirect to login
            window.location.href = '/login';
            return;
          }
          setIsChecking(false);
        }
      };

      checkAccess();
    }, [user, loading, sessionChecked, isAuthenticated]);

    if (loading || isChecking) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};