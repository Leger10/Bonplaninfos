import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, TrendingUp, History, Wallet, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// Constante pour la conversion (1 coin = 10 FCFA)
const COIN_TO_FCFA_RATE = 10;

// Utilitaire de formatage FCFA
const formatFCFA = (coins) => {
  const fcfa = Math.floor(coins * COIN_TO_FCFA_RATE);
  return new Intl.NumberFormat('fr-FR').format(fcfa) + ' FCFA';
};

export default function InfluencerCommissionsPanel() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [balanceCoins, setBalanceCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCommissions = async () => {
    if (!user) return;
    
    try {
      // Get Balance in coins from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('available_earnings')
        .eq('id', user.id)
        .maybeSingle();
        
      if (profileError) throw profileError;
      setBalanceCoins(profile?.available_earnings || 0);

      // Get History with proper joins
      const { data: history, error: historyError } = await supabase
        .from('influencer_commissions')
        .select(`
          id,
          amount,
          status,
          created_at,
          promo_code_id,
          promo_codes!inner (
            code,
            event_id,
            events!inner (
              id,
              title
            )
          )
        `)
        .eq('influencer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (historyError) throw historyError;
      
      // Transformer les données pour un accès plus facile
      const transformedHistory = history?.map(item => ({
        id: item.id,
        amount: item.amount,
        status: item.status,
        created_at: item.created_at,
        promo_code: item.promo_codes?.code,
        event_title: item.promo_codes?.events?.title
      })) || [];
      
      setCommissions(transformedHistory);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos commissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchCommissions();
    toast({
      title: "Actualise",
      description: "Vos commissions ont ete mises a jour",
    });
  };

  useEffect(() => {
    if (user) {
      fetchCommissions();
    }
  }, [user]);

  // Set up Realtime subscription for new commissions
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('commissions_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'influencer_commissions',
          filter: `influencer_id=eq.${user.id}`
        }, 
        () => {
          fetchCommissions();
          toast({
            title: "Nouvelle commission !",
            description: "Vous avez recu une nouvelle commission",
            className: "bg-green-600 text-white",
          });
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          setBalanceCoins(payload.new?.available_earnings || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
          <CardContent className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            <p className="text-sm mt-2">Chargement de vos commissions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-primary-foreground">
            <Wallet className="w-5 h-5" /> Solde Commissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {formatFCFA(balanceCoins)}
          </div>
          <div className="text-sm text-primary-foreground/80 mt-2 font-medium flex items-center gap-1">
            <Coins className="w-4 h-4" /> Equivalent a {balanceCoins.toLocaleString()} pieces (π)
          </div>
          <p className="text-sm text-primary-foreground/70 mt-1">
            {balanceCoins > 0 ? "Disponible pour retrait" : "Aucune commission disponible"}
          </p>
        </CardContent>
      </Card>

      {/* History Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> Historique des gains
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Actualiser
          </Button>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center justify-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p>Aucune commission pour le moment.</p>
              <p className="text-sm mt-1">Partagez vos codes promo pour commencer a gagner !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commissions.map((comm) => (
                <div 
                  key={comm.id} 
                  className="flex justify-between items-center p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div>
                    <div className="font-bold text-base font-mono">
                      {comm.promo_code || 'Code inconnu'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Evenement : <span className="font-medium text-foreground">{comm.event_title || 'N/A'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(comm.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-green-600 font-bold text-lg">
                      <TrendingUp className="w-4 h-4" /> +{formatFCFA(comm.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {comm.amount} pieces
                    </div>
                    <BadgeStatus status={comm.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Résumé des gains totaux */}
          {commissions.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total des commissions</span>
                <span className="text-xl font-bold text-green-600">
                  {formatFCFA(commissions.reduce((sum, c) => sum + c.amount, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-muted-foreground">Nombre de transactions</span>
                <span className="text-sm font-medium">{commissions.length}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Composant Badge pour le statut
const BadgeStatus = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'paid':
        return 'Paye';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annule';
      default:
        return status;
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor()} mt-1`}>
      {getStatusText()}
    </span>
  );
};