import React from 'react';
import { Coins, Calendar, Trophy, Sparkles, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { COIN_TO_FCFA_RATE } from '@/constants/coinRates';

const ProfileStats = ({ userProfile, eventCount }) => {
    if (!userProfile) return null;

    const formatValue = (amount, showFcfa = true) => {
        const val = parseInt(amount || 0, 10);
        const fcfa = val * COIN_TO_FCFA_RATE;
        
        if (showFcfa) {
            return {
                main: `${val.toLocaleString('fr-FR')} π`,
                sub: `${fcfa.toLocaleString('fr-FR')} FCFA`,
                full: `${val.toLocaleString('fr-FR')} π (${fcfa.toLocaleString('fr-FR')} F)`
            };
        }
        return {
            main: val.toLocaleString('fr-FR'),
            sub: val > 1 ? 'événements' : 'événement',
            full: `${val.toLocaleString('fr-FR')} ${val > 1 ? 'événements' : 'événement'}`
        };
    };

    const stats = [
        {
            icon: Coins,
            label: 'Pièces',
            value: formatValue(userProfile.coin_balance),
            color: 'text-blue-400',
            bgColor: 'from-blue-500/20 to-blue-600/20',
            borderColor: 'border-blue-500/30',
        },
        // // {
        // //     icon: Sparkles,
        // //     label: 'Bonus',
        // //     value: formatValue(userProfile.free_coin_balance),
        // //      color: 'text-yellow-400',
        //     bgColor: 'from-yellow-500/20 to-yellow-600/20',
        // //     borderColor: 'border-green-500/30',
        // // },
        {
            icon: Trophy,
            label: 'Gains',
            value: formatValue(userProfile.available_earnings),
           color: 'text-green-400',
            bgColor: 'from-green-500/20 to-green-600/20',
            borderColor: 'border-yellow-500/30',
        },
        {
            icon: Calendar,
            label: 'Events',
            value: formatValue(eventCount, false),
            color: 'text-purple-400',
            bgColor: 'from-purple-500/20 to-purple-600/20',
            borderColor: 'border-purple-500/30',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat, index) => (
                <Card 
                    key={index} 
                    className={`
                        relative overflow-hidden bg-gradient-to-br ${stat.bgColor} 
                        border ${stat.borderColor} hover:scale-105 transition-all duration-300
                    `}
                >
                    <CardContent className="p-4">
                        {/* Effet de brillance */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-2xl" />
                        
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                <span className="text-xs text-gray-400">{stat.label}</span>
                            </div>
                            
                            <p className={`text-xl font-bold ${stat.color} mb-0.5`}>
                                {stat.value.main}
                            </p>
                            
                            {stat.value.sub && (
                                <p className="text-xs text-gray-500">
                                    {stat.value.sub}
                                </p>
                            )}
                            
                            {/* Indicateur de tendance pour les gains */}
                            {stat.icon === Trophy && userProfile.available_earnings > 0 && (
                                <div className="absolute bottom-0 right-0 text-yellow-500/20">
                                    <Trophy className="w-8 h-8" />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default ProfileStats;