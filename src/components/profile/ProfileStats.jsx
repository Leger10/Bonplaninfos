import React from 'react';
import { Coins, Calendar, Trophy, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const ProfileStats = ({ userProfile, eventCount }) => {
  if (!userProfile) return null;

  const stats = [
    {
      icon: Coins,
      label: 'Pièces Achetées',
      value: userProfile.coin_balance || 0,
      color: 'text-blue-400',
    },
    {
      icon: Sparkles,
      label: 'Cadeaux de Bienvenue',
      value: userProfile.free_coin_balance || 0,
      color: 'text-green-400',
    },
    {
      icon: Trophy,
      label: 'Gains',
      value: userProfile.available_earnings || 0,
      color: 'text-yellow-400',
    },
    {
      icon: Calendar,
      label: 'Événements',
      value: eventCount,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className="glass-effect border-border">
          <CardContent className="p-4">
            <div className="flex items-center">
              <stat.icon className={`w-8 h-8 ${stat.color} mr-3`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProfileStats;