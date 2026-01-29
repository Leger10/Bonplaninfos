/**
 * Authentication utilities for Supabase
 * Handles session persistence, token refresh, and authentication checks
 */

import { supabase } from './customSupabaseClient';

/**
 * Check if user is authenticated and session is valid
 * @returns {Promise<{isAuthenticated: boolean, user: object|null, session: object|null}>}
 */
export const checkAuthentication = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session check error:', error);
      return { isAuthenticated: false, user: null, session: null };
    }
    
    if (!session) {
      return { isAuthenticated: false, user: null, session: null };
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.log('Session expired, attempting refresh');
      
      // Try to refresh the session
      const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession.session) {
        console.error('Session refresh failed:', refreshError);
        return { isAuthenticated: false, user: null, session: null };
      }
      
      return {
        isAuthenticated: true,
        user: refreshedSession.user,
        session: refreshedSession.session,
      };
    }
    
    return {
      isAuthenticated: true,
      user: session.user,
      session: session,
    };
  } catch (error) {
    console.error('Authentication check error:', error);
    return { isAuthenticated: false, user: null, session: null };
  }
};

/**
 * Ensure user is authenticated before proceeding
 * @param {Function} action - The action to perform if authenticated
 * @param {Object} options - Options
 * @param {boolean} options.redirectToLogin - Whether to redirect to login if not authenticated
 * @param {string} options.redirectPath - Path to redirect to (default: '/login')
 * @returns {Promise<any>} - Result of the action or null if not authenticated
 */
export const withAuthentication = async (action, options = {}) => {
  const {
    redirectToLogin = true,
    redirectPath = '/login',
    showToast = true,
  } = options;
  
  const { isAuthenticated, user } = await checkAuthentication();
  
  if (!isAuthenticated || !user) {
    if (showToast && typeof window !== 'undefined' && window.toast) {
      window.toast({
        title: 'Session expirée',
        description: 'Votre session a expiré. Merci de vous reconnecter.',
        variant: 'destructive',
        duration: 5000,
      });
    }
    
    if (redirectToLogin && typeof window !== 'undefined') {
      // Store current path for redirect after login
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('redirectAfterLogin', currentPath);
      
      window.location.href = redirectPath;
    }
    
    return null;
  }
  
  try {
    return await action(user);
  } catch (error) {
    // Handle specific authentication errors
    if (error.message?.includes('JWT') || error.message?.includes('session')) {
      console.error('Authentication error in action:', error);
      
      if (showToast && typeof window !== 'undefined' && window.toast) {
        window.toast({
          title: 'Session expirée',
          description: 'Votre session a expiré. Merci de vous reconnecter.',
          variant: 'destructive',
          duration: 5000,
        });
      }
      
      // Clear invalid session
      await supabase.auth.signOut();
      
      if (redirectToLogin && typeof window !== 'undefined') {
        window.location.href = redirectPath;
      }
    }
    
    throw error;
  }
};

/**
 * Initialize authentication state listener
 * @returns {Function} - Cleanup function to remove listener
 */
export const initAuthListener = () => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          // Session is valid, update global state if needed
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('authStateChanged', { 
              detail: { user: session?.user, event } 
            }));
          }
          break;
          
        case 'SIGNED_OUT':
          // Clear any stored data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('redirectAfterLogin');
            window.dispatchEvent(new CustomEvent('authStateChanged', { 
              detail: { user: null, event } 
            }));
          }
          break;
          
        case 'INITIAL_SESSION':
          // Initial session check
          if (session) {
            console.log('Initial session loaded for user:', session.user?.id);
          }
          break;
      }
    }
  );
  
  return () => {
    subscription?.unsubscribe();
  };
};

/**
 * Get current user with session validation
 * @returns {Promise<object|null>} - Current user or null
 */
export const getCurrentUser = async () => {
  const { user } = await checkAuthentication();
  return user;
};

/**
 * Secure RPC call with authentication check
 * @param {string} rpcName - Name of the RPC function
 * @param {object} params - Parameters for the RPC
 * @param {object} options - Additional options
 * @returns {Promise<any>} - RPC result
 */
export const secureRpcCall = async (rpcName, params, options = {}) => {
  return withAuthentication(async (user) => {
    const { data, error } = await supabase.rpc(rpcName, {
      ...params,
      p_user_id: user.id,
    });
    
    if (error) throw error;
    return data;
  }, options);
};