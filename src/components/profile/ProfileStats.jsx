// components/ProfileStats.jsx
import React from 'react';
import { Coins, Calendar, Trophy, Sparkles, RefreshCw, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';

const ProfileStats = ({ userProfile, eventCount }) => {
  const { refreshUserProfile } = useData();

  if (!userProfile) return null;

  const handleRefresh = async () => {
    await refreshUserProfile();
  };

  // Taux de conversion : 1π = 10 FCFA
  const conversionRate = 10;

  // Calcul du revenu net
  const totalEarnings = userProfile.total_earnings || 0;
  const availableEarnings = userProfile.available_earnings || 0;
  const netEarningsAvailable = Math.floor(totalEarnings * 0.95) - availableEarnings;

  const stats = [
    {
      icon: Coins,
      label: 'Pièces Achetées',
      value: userProfile.coin_balance || 0,
      fcfaValue: (userProfile.coin_balance || 0) * conversionRate,
      color: 'text-blue-400',
      bgColor: 'from-blue-500/10 to-blue-600/10',
      borderColor: 'border-blue-500/20',
      type: 'coins'
    },
    {
      icon: Sparkles,
      label: 'Pièces Bonus',
      value: userProfile.free_coin_balance || 0,
      fcfaValue: (userProfile.free_coin_balance || 0) * conversionRate,
      color: 'text-green-400',
      bgColor: 'from-green-500/10 to-green-600/10',
      borderColor: 'border-green-500/20',
      type: 'coins'
    },
    {
      icon: Trophy,
      label: 'Gains Disponibles',
      value: userProfile.available_earnings || 0,
      fcfaValue: (userProfile.available_earnings || 0) * conversionRate,
      color: 'text-yellow-400',
      bgColor: 'from-yellow-500/10 to-yellow-600/10',
      borderColor: 'border-yellow-500/20',
      isEarnings: true,
      type: 'coins'
    },
    
    {
      icon: Calendar,
      label: 'Événements',
      value: eventCount,
      color: 'text-pink-400',
      bgColor: 'from-pink-500/10 to-pink-600/10',
      borderColor: 'border-pink-500/20',
      type: 'count'
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Mes Statistiques</h2>
        <Button 
          onClick={handleRefresh}
          variant="outline" 
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className={`glass-effect border-2 ${stat.borderColor} bg-gradient-to-br ${stat.bgColor}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <stat.icon className={`w-8 h-8 ${stat.color} mr-3`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    {stat.type === 'coins' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ≈ {stat.fcfaValue.toLocaleString('fr-FR')} FCFA
                      </p>
                    )}
                  </div>
                </div>
               
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Légende du taux de conversion */}
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          💰 Taux de conversion : <strong>1π = 10 FCFA</strong> • 📊 Revenu Net = 95% des gains totaux
        </p>
      </div>
    </div>
  );
};

export default ProfileStats;