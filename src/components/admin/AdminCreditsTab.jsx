import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Coins, Search, DollarSign, Euro, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const AdminCreditsTab = () => {
  const { userProfile, adminConfig } = useData();
  const [creditLogs, setCreditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totals, setTotals] = useState({
    totalCoins: 0,
    totalFCFA: 0,
    totalEUR: 0,
    totalUSD: 0
  });

  // Récupérer les taux de conversion depuis la configuration
  const coinToFcfaRate = adminConfig?.coin_to_fcfa_rate || 10;
  const eurRate = adminConfig?.currency_eur_rate || 650;
  const usdRate = adminConfig?.currency_usd_rate || 550;

  const fetchCreditLogs = useCallback(async () => {
    if (!userProfile?.country) return;
    setLoading(true);

    try {
      // Trouver tous les secrétaires et super admins
      const { data: actors, error: actorsError } = await supabase
        .from('profiles')
        .select('id')
        .in('user_type', ['super_admin', 'secretary']);

      if (actorsError) throw actorsError;
      const actorIds = actors.map(a => a.id);

      let query = supabase
        .from('admin_logs')
        .select(`
          id,
          created_at,
          details,
          actor:actor_id (full_name, user_type),
          target_user:target_id (full_name, email, country, city)
        `)
        .in('actor_id', actorIds)
        .eq('action_type', 'user_credited')
        .eq('target_user.country', userProfile.country)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`target_user.full_name.ilike.%${searchTerm}%,target_user.email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const filteredLogs = data.filter(log => !(log.details?.reversed));
      setCreditLogs(filteredLogs);

      // Calculer les totaux
      const totalCoins = filteredLogs.reduce((sum, log) => sum + (log.details?.amount || 0), 0);
      const totalFCFA = totalCoins * coinToFcfaRate;
      const totalEUR = totalFCFA / eurRate;
      const totalUSD = totalFCFA / usdRate;

      setTotals({
        totalCoins,
        totalFCFA,
        totalEUR,
        totalUSD
      });

    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de charger l'historique des crédits.",
        variant: 'destructive'
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.country, searchTerm, coinToFcfaRate, eurRate, usdRate]);

  useEffect(() => {
    fetchCreditLogs();
  }, [fetchCreditLogs]);

  // Formater les nombres
  const formatCurrency = (amount, currency = 'FCFA') => {
    return new Intl.NumberFormat('fr-FR', {
      style: currency !== 'FCFA' ? 'currency' : undefined,
      currency: currency === 'EUR' ? 'EUR' : currency === 'USD' ? 'USD' : undefined,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + (currency === 'FCFA' ? ' FCFA' : '');
  };

  return (
    <Card className="glass-effect shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-500" />
          Historique des Crédits
          <Badge variant="secondary" className="ml-2">
            Zone: {userProfile?.country}
          </Badge>
        </CardTitle>
        <p className="text-muted-foreground">
          Liste des utilisateurs de votre pays crédités par les Super Admins et secrétaires.
        </p>
      </CardHeader>

      <CardContent>
        {/* Cartes des totaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Pièces */}
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800">Total Pièces</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {totals.totalCoins.toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="p-2 bg-amber-500 rounded-full">
                  <Coins className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total FCFA */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Valeur FCFA</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(totals.totalFCFA)}
                  </p>
                </div>
                <div className="p-2 bg-green-500 rounded-full">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Taux: 1pièces = {coinToFcfaRate} FCFA
              </p>
            </CardContent>
          </Card>

          {/* Total EUR */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Valeur EUR</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(totals.totalEUR, 'EUR')}
                  </p>
                </div>
                <div className="p-2 bg-blue-500 rounded-full">
                  <Euro className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                1€ = {eurRate.toLocaleString('fr-FR')} FCFA
              </p>
            </CardContent>
          </Card>

          {/* Total USD */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Valeur USD</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(totals.totalUSD, 'USD')}
                  </p>
                </div>
                <div className="p-2 bg-purple-500 rounded-full">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-1">
                1$ = {usdRate.toLocaleString('fr-FR')} FCFA
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Barre de recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email d'utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Statistiques rapides */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{creditLogs.length} crédit(s) distribués</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Moyenne: {creditLogs.length > 0 ? Math.round(totals.totalCoins / creditLogs.length) : 0} pièces par crédit</span>
          </div>
        </div>

        {/* Tableau des crédits */}
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-primary w-8 h-8" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur Crédité</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Valeur FCFA</TableHead>
                <TableHead>Crédité par</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="6" className="text-center py-8 text-muted-foreground">
                    <Coins className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucun crédit trouvé dans votre zone.</p>
                  </TableCell>
                </TableRow>
              ) : (
                creditLogs.map(log => {
                  const coinAmount = log.details?.amount || 0;
                  const fcfaValue = coinAmount * coinToFcfaRate;

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell>
                        <p className="font-semibold">{log.target_user?.full_name || 'Utilisateur inconnu'}</p>
                        <p className="text-xs text-muted-foreground">{log.target_user?.email}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{log.target_user?.city || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{log.target_user?.country}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-bold text-amber-600">
                          {coinAmount.toLocaleString('fr-FR')}
                          <Coins className="w-4 h-4" />
                        </div>
                      </TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        {formatCurrency(fcfaValue)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{log.actor?.full_name}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {log.actor?.user_type?.replace('_', ' ') || 'Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString('fr-FR')}
                        <br />
                        <span className="text-xs">
                          {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminCreditsTab;