
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { DataProvider, useData } from './DataContext';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasFetchError, setHasFetchError] = useState(false);

  const [forceRefresh, setForceRefresh] = useState(() => () => { });

  const handleSession = useCallback(async (currentSession) => {
    // Check for a specific error indicating an invalid refresh token or network issue
    const isInvalidTokenError = currentSession?.error?.message?.includes('Invalid Refresh Token');
    const isNetworkError = currentSession?.error instanceof TypeError && currentSession.error.message.includes('Failed to fetch');

    if (currentSession === null || isInvalidTokenError || isNetworkError) {
      setUser(null);
      setSession(null);

      if (isInvalidTokenError) {
        setHasFetchError(true);
        toast({
          variant: 'destructive',
          title: 'Session invalide',
          description: 'Votre session a expiré. Veuillez vous reconnecter.',
        });
        await supabase.auth.signOut();
      } else if (isNetworkError) {
        setHasFetchError(true);
        toast({
          title: "Problème de connexion",
          description: "Authentification impossible. Vérifiez votre connexion ou une extension bloquante.",
          variant: "destructive",
          duration: Infinity,
        });
      }
    } else {
      setSession(currentSession);
      setUser(currentSession.user ?? null);
      setHasFetchError(false);
      if (currentSession.user) {
        forceRefresh();
      }
    }

    setLoading(false);
  }, [toast, forceRefresh]);


  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      handleSession(session || { error });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          handleSession(null);
        } else if (session) {
          handleSession(session);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const signUp = useCallback(async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { data, error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { data, error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    hasFetchError,
    signUp,
    signIn,
    signOut,
    setForceRefresh,
  }), [user, session, loading, hasFetchError, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const AuthSync = () => {
  const { setForceRefresh } = useAuth();
  const { forceRefreshUserProfile } = useData();

  useEffect(() => {
    setForceRefresh(() => forceRefreshUserProfile);
  }, [setForceRefresh, forceRefreshUserProfile]);

  return null;
}

export const AuthProviderWithData = ({ children }) => {
  return (
    <AuthProvider>
      <DataProvider>
        <AuthSync />
        {children}
      </DataProvider>
    </AuthProvider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
