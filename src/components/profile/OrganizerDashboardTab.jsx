import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Users, Eye, DollarSign, Calendar, Zap, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const OrganizerDashboardTab = ({ stats: initialStats, loading: initialLoading }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(initialLoading);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);
  
  useEffect(() => {
    setLoading(initialLoading);
  }, [initialLoading]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Aucune donnée disponible pour le tableau de bord.</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Solde Total",
      value: `${(stats.available_balance || 0).toLocaleString()} π`,
      subValue: `${(stats.total_balance_fcfa || 0).toLocaleString('fr-FR')} FCFA`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Événements Actifs",
      value: stats.totalEvents,
      subValue: `${stats.promotedEvents} promus`,
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Vues Totales",
      value: (stats.totalViews || 0).toLocaleString('fr-FR'),
      icon: Eye,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Interactions",
      value: (stats.totalInteractions || 0).toLocaleString('fr-FR'),
      icon: Users,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    }
  ];

  const balanceBreakdown = [
    { label: "Interactions", value: stats.interaction_earnings, color: "bg-blue-500" },
    { label: "Billets", value: stats.event_revenues, color: "bg-green-500" },
    { label: "Abonnements", value: stats.subscription_earnings, color: "bg-purple-500" },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Tableau de bord Organisateur</h2>
          <p className="text-muted-foreground">Vue d'ensemble de vos performances</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/create-event')} variant="default">
            <Zap className="w-4 h-4 mr-2" />
            Créer un événement
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="glass-effect">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {index === 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Actif
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                {stat.subValue && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subValue}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {balanceBreakdown.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Répartition du Solde
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {balanceBreakdown.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm font-bold">{item.value} π</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${(item.value / stats.totalBalance) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Résumé Financier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Gagné</p>
              <p className="text-xl font-bold text-green-600">{(stats.total_earnings || 0).toLocaleString()} π</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Retiré</p>
              <p className="text-xl font-bold text-orange-600">{(stats.total_withdrawn || 0).toLocaleString()} π</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Disponible</p>
              <p className="text-xl font-bold text-blue-600">{(stats.available_balance || 0).toLocaleString()} π</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => navigate('/create-event')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Créer un événement
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => navigate('/boost')}
            >
              <Zap className="w-4 h-4 mr-2" />
              Promouvoir un événement
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => navigate('/profile?tab=withdrawals')}
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Demander un retrait
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizerDashboardTab;