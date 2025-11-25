import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, Calendar, CreditCard, History, RotateCcw, Wallet, MapPin } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import SecretaryUserManagementTab from '@/components/secretary/SecretaryUserManagementTab';
import CreditManagement from '@/components/admin/CreditManagement';
import WithdrawalManagement from '@/components/admin/WithdrawalManagement';
import WithdrawalHistoryTab from '@/components/admin/WithdrawalHistoryTab';
import ReversedCreditsTab from '@/components/admin/ReversedCreditsTab';
import SecretaryEventLocationModerationTab from '@/components/secretary/SecretaryEventLocationModerationTab';

const SecretaryDashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { userProfile, loadingProfile } = useData();
    const [allUsers, setAllUsers] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const fetchData = useCallback(async () => {
        if (!userProfile?.country) return;
        setLoadingData(true);
        try {
            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('*')
                .eq('country', userProfile.country);

            if (usersError) throw usersError;

            setAllUsers(usersData || []);
        } catch (error) {
            toast({ title: t('common.error_title'), description: "Impossible de charger les données.", variant: 'destructive' });
        } finally {
            setLoadingData(false);
        }
    }, [userProfile?.country, t]);

    useEffect(() => {
        if (userProfile) {
            fetchData();
        }
    }, [userProfile, fetchData]);

    if (loadingProfile || loadingData) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 md:p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user || userProfile?.user_type !== 'secretary') {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
                <h1 className="text-2xl text-red-500">{t('admin_dashboard.unauthorized_title')}</h1>
                <p className="text-muted-foreground">{t('admin_dashboard.unauthorized_desc')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold">{t('secretary_dashboard.title')}</h1>
                <p className="text-muted-foreground">{t('secretary_dashboard.welcome', { name: userProfile.full_name || user.email })}</p>
                <p className="text-sm text-primary">{t('secretary_dashboard.competence_zone', { country: userProfile.country })}</p>
            </header>

            <Tabs defaultValue="moderation" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                    <TabsTrigger value="moderation"><Calendar className="w-4 h-4 mr-2" />{t('secretary_dashboard.tabs.event_moderation')}</TabsTrigger>
                    <TabsTrigger value="users"><User className="w-4 h-4 mr-2" />{t('secretary_dashboard.tabs.user_management')}</TabsTrigger>
                    <TabsTrigger value="credits"><CreditCard className="w-4 h-4 mr-2" />{t('secretary_dashboard.tabs.credit_management')}</TabsTrigger>
                    <TabsTrigger value="reversed_credits"><RotateCcw className="w-4 h-4 mr-2" />{t('secretary_dashboard.tabs.reversed_credits')}</TabsTrigger>
                    <TabsTrigger value="withdrawals"><Wallet className="w-4 h-4 mr-2" />{t('secretary_dashboard.tabs.withdrawal_management')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="moderation" className="mt-4">
                    <SecretaryEventLocationModerationTab />
                </TabsContent>
                <TabsContent value="users" className="mt-4">
                    <SecretaryUserManagementTab users={allUsers} onRefresh={fetchData} />
                </TabsContent>
                <TabsContent value="credits" className="mt-4">
                    {/* PASSER les utilisateurs ET le userProfile au CreditManagement */}
                    <CreditManagement 
                        users={allUsers} 
                        onRefresh={fetchData} 
                        userProfile={userProfile}
                    />
                </TabsContent>
                <TabsContent value="reversed_credits" className="mt-4">
                    <ReversedCreditsTab isSuperAdmin={false} country={userProfile.country} actorId={user.id} />
                </TabsContent>
                <TabsContent value="withdrawals" className="mt-4">
                    <WithdrawalManagement />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SecretaryDashboard;