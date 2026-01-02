import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Users, Eye, DollarSign, Calendar, Info, Wallet, Trophy, Plus, PieChart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import WithdrawalTab from '@/components/profile/WithdrawalTab';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CreatorEarningsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Call the updated RPC function (which internally updates stats if needed)
      // Note: calculate_creator_estimates is good for real-time look
      const { data, error } = await supabase.rpc('calculate_creator_estimates', {
        p_creator_id: user.id
      });

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error("Error fetching creator stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const currentMonth = stats?.current_month || {};
  const lastMonth = stats?.last_month || {};

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Espace Créateur
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos revenus d'engagement et vos ventes directes
          </p>
        </div>
        <Button onClick={() => navigate('/create-event')} className="bg-gradient-to-r from-blue-600 to-indigo-600">
          <Plus className="w-4 h-4 mr-2" /> Créer un événement
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Eye className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="bg-white/50 text-blue-700 border-blue-200">Ce mois</Badge>
            </div>
            <div className="text-2xl font-bold text-blue-900">{currentMonth.views || 0}</div>
            <p className="text-xs text-blue-600 mt-1">Vues sur événements simples (+{currentMonth.views * 1} pts)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <Users className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="bg-white/50 text-purple-700 border-purple-200">Ce mois</Badge>
            </div>
            <div className="text-2xl font-bold text-purple-900">{currentMonth.referrals || 0}</div>
            <p className="text-xs text-purple-600 mt-1">Filleuls (+{currentMonth.referrals * 10} pts)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                <Trophy className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="bg-white/50 text-amber-700 border-amber-200">Score Total</Badge>
            </div>
            <div className="text-2xl font-bold text-amber-900">{currentMonth.score || 0} pts</div>
            <p className="text-xs text-amber-600 mt-1">Vues + (Filleuls × 10)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <PieChart className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="bg-white/50 text-emerald-700 border-emerald-200">Estimé</Badge>
            </div>
            <div className="text-2xl font-bold text-emerald-900">{formatCurrency(currentMonth.estimated_earnings || 0)}</div>
            <p className="text-xs text-emerald-600 mt-1">Pool Total: {formatCurrency(currentMonth.pool_total || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="withdrawals">Retraits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Calculation Explanation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" /> Détail du Calcul ({format(new Date(), 'MMMM', {locale: fr})})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-2">
                    <div className="flex justify-between border-b pb-2">
                        <span>Votre Score:</span>
                        <span className="font-bold">{currentMonth.score} pts</span>
                    </div>
                    <div className="flex justify-between border-b pb-2 text-muted-foreground">
                        <span>Total Scores Système (Estimé):</span>
                        <span>{Math.round(currentMonth.score / (currentMonth.estimated_earnings / (currentMonth.pool_total || 1)) || 1).toLocaleString()} pts</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                        <span>Pool Global (0.5% CA):</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(currentMonth.pool_total)}</span>
                    </div>
                    <div className="flex justify-between pt-2 text-base font-bold">
                        <span>Votre Part:</span>
                        <span className="text-primary">{formatCurrency(currentMonth.estimated_earnings)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic mt-2">
                        * Estimation basée sur l'activité actuelle. Le montant final sera calculé à la fin du mois.
                    </p>
                </div>
              </CardContent>
            </Card>

            {/* Previous Month Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-muted-foreground" /> Mois Précédent
                </CardTitle>
                <CardDescription>
                  Gains validés le 5 du mois
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lastMonth.amount !== undefined ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-2">Gains Pool Finalisés ({format(new Date(lastMonth.month || new Date()), 'MMMM yyyy', {locale: fr})})</p>
                    <div className="text-3xl font-bold text-foreground mb-4">
                      {formatCurrency(lastMonth.amount)}
                    </div>
                    {lastMonth.status === 'claimed' || lastMonth.status === 'distributed' ? (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                        Versé sur solde
                      </Badge>
                    ) : (
                      <div className="text-sm text-amber-600 font-medium">
                        En attente de distribution par l'admin
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun historique pour le mois dernier.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2">1. Événements Simples (Pool)</h3>
                <p className="text-sm text-blue-700 mb-2">
                Standard & Protégé
                </p>
                <ul className="text-xs text-blue-600 list-disc list-inside space-y-1">
                <li>Source: Vues, Parrainage, Bonus</li>
                <li>Calcul: Score d'engagement mensuel</li>
                <li>Distribution: Part du pool global (0.5% du CA)</li>
                <li><strong>Pas de revenu direct sur l'événement</strong></li>
                </ul>
            </div>

            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <h3 className="font-semibold text-emerald-900 mb-2">2. Événements Interactifs (Direct)</h3>
                <p className="text-sm text-emerald-700 mb-2">
                Billetterie, Tombola, Vote, Stands
                </p>
                <ul className="text-xs text-emerald-600 list-disc list-inside space-y-1">
                <li>Source: Ventes directes aux participants</li>
                <li>Calcul: 95% pour vous, 5% plateforme</li>
                <li>Distribution: Immédiate (Solde "Événements")</li>
                <li><strong>Les vues ne génèrent pas de revenus ici</strong></li>
                </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="withdrawals">
          <WithdrawalTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreatorEarningsPage;