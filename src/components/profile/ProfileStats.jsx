import React, { useEffect, useState } from 'react';
import { Coins, Calendar, Trophy, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { COIN_TO_FCFA_RATE } from '@/constants/coinRates';
import { useWalletSecurity } from '@/hooks/useWalletSecurity';
import PinVerificationModal from '@/components/common/PinVerificationModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

const ProfileStats = ({ userProfile, eventCount }) => {
    const { t, ready } = useTranslation();
    const { isWalletUnlocked, showPinModal, openPinModal, closePinModal, unlockWallet } = useWalletSecurity(userProfile?.id);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userProfile) {
            setIsLoading(false);
        }
    }, [userProfile]);

    // Attendre que les traductions soient chargées
    if (!ready) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="overflow-hidden shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (isLoading || !userProfile) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="overflow-hidden shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const formatNumber = (amount) => {
        if (!isWalletUnlocked) return `🔒 ${t('profileStats.locked')}`;
        const val = parseInt(amount || 0, 10);
        return val.toLocaleString();
    };

    const formatFcfa = (amount) => {
        if (!isWalletUnlocked) return `🔒 ${t('profileStats.locked')}`;
        const val = parseInt(amount || 0, 10);
        return (val * COIN_TO_FCFA_RATE).toLocaleString();
    };

    const stats = [
        {
            icon: Coins,
            label: t('profileStats.balance'),
            value: formatNumber(userProfile.coin_balance),
            subValue: `${formatFcfa(userProfile.coin_balance)} FCFA`,
            color: 'text-blue-400',
            bgColor: 'from-blue-500/20 to-blue-600/20',
            borderColor: 'border-blue-500/30',
            isProtected: true,
            showSubValue: true
        },
        {
            icon: Trophy,
            label: t('profileStats.availableEarnings'),
            value: formatNumber(userProfile.available_earnings),
            subValue: `${formatFcfa(userProfile.available_earnings)} FCFA`,
            color: 'text-green-400',
            bgColor: 'from-green-500/20 to-green-600/20',
            borderColor: 'border-green-500/30',
            isProtected: true,
            showSubValue: true
        },
        {
            icon: Calendar,
            label: t('profileStats.events'),
            value: eventCount?.toLocaleString() || '0',
            color: 'text-purple-400',
            bgColor: 'from-purple-500/20 to-purple-600/20',
            borderColor: 'border-purple-500/30',
            isProtected: false,
            showSubValue: false
        },
    ];

    return (
        <div className="relative mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {stats.map((stat, index) => (
                    <Card
                        key={index}
                        className={`bg-gradient-to-br ${stat.bgColor} border ${stat.borderColor} overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300`}
                    >
                        <CardContent className="p-3 md:p-4">
                            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left">
                                <div className={`p-2 rounded-full bg-opacity-20 mb-2 md:mb-0 md:mr-3 ${stat.color.replace('text-', 'bg-')} bg-opacity-20`}>
                                    {stat.isProtected && !isWalletUnlocked ? (
                                        <Lock className={`w-5 h-5 md:w-8 md:h-8 ${stat.color} opacity-70`} />
                                    ) : (
                                        <stat.icon className={`w-5 h-5 md:w-8 md:h-8 ${stat.color}`} />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    {!isWalletUnlocked && stat.isProtected ? (
                                        <p className="text-lg md:text-xl font-bold text-foreground">
                                            🔒 {t('profileStats.locked')}
                                        </p>
                                    ) : (
                                        <>
                                            <div className="flex items-baseline justify-center md:justify-start gap-1">
                                                <p className="text-lg md:text-xl font-bold text-foreground">
                                                    {stat.value}
                                                </p>
                                                {stat.icon === Coins && (
                                                    <span className="text-xs text-muted-foreground">π</span>
                                                )}
                                            </div>
                                            {stat.showSubValue && (
                                                <p className="text-xs md:text-sm font-medium text-green-600 dark:text-green-400 mt-0.5">
                                                    {stat.subValue}
                                                </p>
                                            )}
                                        </>
                                    )}
                                    <p className="text-xs md:text-sm text-muted-foreground truncate mt-1">
                                        {stat.label}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Global unlock button for ProfileStats */}
            {!isWalletUnlocked && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-xl border border-border/50">
                    <Button
                        onClick={openPinModal}
                        variant="default"
                        className="shadow-lg animate-in zoom-in-95 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6 py-2"
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        {t('profileStats.unlockButton')}
                    </Button>
                </div>
            )}

            <PinVerificationModal
                isOpen={showPinModal}
                onClose={closePinModal}
                onSuccess={unlockWallet}
                userId={userProfile.id}
                userProfile={userProfile}
            />
        </div>
    );
};

export default ProfileStats;