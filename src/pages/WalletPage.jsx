import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Coins, Landmark, DollarSign, Wallet as WalletIcon, RefreshCw, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const WalletPage = () => {
    const { user } = useAuth();
    const { userProfile, loadingProfile, adminConfig, forceRefreshUserProfile } = useData();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await forceRefreshUserProfile();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    if (loadingProfile) {
        return (
            <div className="flex justify-center items-center h-screen bg-background">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || !userProfile) {
        return (
            <div className="p-4 text-center">
                <p>{t('profile_page.unauthorized_desc')}</p>
                <Button onClick={() => navigate('/auth')}>{t('auth.login.button')}</Button>
            </div>
        );
    }

    const { free_coin_balance, coin_balance, available_earnings } = userProfile;
    const totalCoins = (free_coin_balance || 0) + (coin_balance || 0);
    const earningsInFcfa = (available_earnings || 0) * (adminConfig?.coin_to_fcfa_rate || 10);

    const StatCard = ({ icon, title, value, color, description, isCurrency = false }) => (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className={`overflow-hidden bg-gradient-to-br ${color} text-white`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    {icon}
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">
                        {isCurrency ? value.toLocaleString() : value}
                    </div>
                    {description && <p className="text-xs text-white/80">{description}</p>}
                </CardContent>
            </Card>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{t('wallet_page.title')}</h1>
                <Button onClick={handleRefresh} variant="ghost" size="icon" disabled={isRefreshing}>
                    <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <StatCard 
                    icon={<WalletIcon className="h-6 w-6 text-white/80" />}
                    title={t('wallet_page.total_balance')}
                    value={totalCoins.toLocaleString()}
                    color="from-blue-500 to-indigo-600"
                    description={`(${free_coin_balance?.toLocaleString() || 0} ${t('wallet_page.free_coins')} + ${coin_balance?.toLocaleString() || 0} ${t('wallet_page.paid_coins')})`}
                />
                 <StatCard 
                    icon={<DollarSign className="h-6 w-6 text-white/80" />}
                    title={t('wallet_page.available_earnings')}
                    value={available_earnings?.toLocaleString() || 0}
                    color="from-green-500 to-teal-600"
                    description={t('wallet_page.earnings_in_fcfa', { amount: earningsInFcfa.toLocaleString() })}
                />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                     <Card className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                        <CardHeader>
                            <CardTitle>{t('wallet_page.buy_coins_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <p className="text-center mb-4">{t('wallet_page.buy_coins_desc')}</p>
                            <Button onClick={() => navigate('/packs')} className="bg-white text-orange-500 hover:bg-white/90">
                               <ShoppingCart className="mr-2 h-4 w-4" /> {t('wallet_page.buy_coins_button')}
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Coins className="text-primary" /> {t('wallet_page.balance_details_title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                            <span className="font-medium">{t('wallet_page.free_coins')}</span>
                            <span className="font-bold text-lg text-green-400">{free_coin_balance?.toLocaleString() || 0} π</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                            <span className="font-medium">{t('wallet_page.paid_coins')}</span>
                            <span className="font-bold text-lg text-blue-400">{coin_balance?.toLocaleString() || 0} π</span>
                        </div>
                        <p className="text-xs text-muted-foreground pt-2">
                          {t('wallet_page.free_coins_desc')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Landmark className="text-primary" /> {t('wallet_page.withdrawal_title')}</CardTitle>
                        <CardDescription>{t('wallet_page.withdrawal_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 rounded-lg bg-background text-center mb-4">
                            <p className="text-sm text-muted-foreground">{t('wallet_page.available_earnings')}</p>
                            <p className="text-3xl font-bold text-green-400">{available_earnings?.toLocaleString() || 0} π</p>
                             <p className="text-sm text-muted-foreground">{t('wallet_page.earnings_in_fcfa', { amount: earningsInFcfa.toLocaleString() })}</p>
                        </div>
                         <Button className="w-full" disabled={(available_earnings || 0) < (adminConfig?.min_withdrawal_pi || 5000)}>
                            {t('wallet_page.request_withdrawal_button')}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                           {t('wallet_page.withdrawal_minimum', { amount: adminConfig?.min_withdrawal_pi || 5000 })}
                        </p>
                    </CardContent>
                </Card>
            </div>
            
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                <Card className="mt-8 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Historique des Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">L'historique des transactions sera bientôt disponible ici.</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default WalletPage;