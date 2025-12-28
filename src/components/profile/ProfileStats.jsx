import React from 'react';
import { Coins, Calendar, Trophy, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const ProfileStats = ({ userProfile, eventCount }) => {
  if (!userProfile) return null;

  const stats = [
    {
      icon: Coins,
      label: 'Pièces',
      value: userProfile.coin_balance || 0,
      color: 'text-blue-400',
    },
    {
      icon: Sparkles,
      label: 'Bonus',
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
      label: 'Events',
      value: eventCount,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className="glass-effect border-border overflow-hidden">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left">
              <div className={`p-2 rounded-full bg-opacity-10 mb-2 md:mb-0 md:mr-3 ${stat.color.replace('text-', 'bg-')}`}>
                 <stat.icon className={`w-5 h-5 md:w-8 md:h-8 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg md:text-2xl font-bold text-foreground truncate">{stat.value}</p>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProfileStats;