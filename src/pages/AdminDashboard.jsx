import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '@/contexts/DataContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings, BarChart2, Video, Loader2, Briefcase, Wallet, Megaphone, Calendar, Target, Image as ImageIcon, CreditCard, ShieldCheck, Clock, RefreshCw as RefreshCwIcon, UserCheck, History, BookOpen, DollarSign, MapPin, AreaChart, RotateCcw, ShoppingCart, AlertTriangle, Key, Shield } from 'lucide-react'; // Added Shield import here
import UserManagement from '@/components/admin/UserManagement';
import ConfigTab from '@/components/admin/ConfigTab';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import VideoManager from '@/components/admin/VideoManagementTab';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import PartnersManagement from '@/components/admin/PartnersManagement';
import WithdrawalManagement from '@/components/admin/WithdrawalManagement';
import AnnouncementsManagement from '@/components/admin/AnnouncementsManagement';
import EventsManagement from '@/components/admin/EventsManagement';
import PromotionsManagement from '@/components/admin/PromotionsManagement';
import WelcomePopupManagement from '@/components/admin/WelcomePopupManagement';
import CreditManagement from '@/components/admin/CreditManagement';
import AdminCreditsTab from '@/components/admin/AdminCreditsTab';
import PartnerVerificationForm from '@/components/admin/PartnerVerificationForm';
import BadgeManagementPanel from '@/components/admin/BadgeManagementPanel';
import SecretaryManagementTab from '@/components/admin/SecretaryManagementTab';
import TransactionsTable from '@/components/admin/TransactionsTable';
import ActivityLogTab from '@/components/admin/ActivityLogTab';
import AdminPaymentsTab from '@/components/admin/AdminPaymentsTab';
import LocationManagementTab from '@/components/admin/LocationManagementTab';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CreditStatsTab from '@/components/admin/CreditStatsTab';
import ReversedCreditsTab from '@/components/admin/ReversedCreditsTab';
import WithdrawalHistoryTab from '@/components/admin/WithdrawalHistoryTab';
import AdminSalaryDashboard from '@/components/admin/AdminSalaryDashboard';
import SalaryWithdrawalManagement from '@/components/admin/SalaryWithdrawalManagement';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ImpersonationBanner from '@/components/layout/ImpersonationBanner';

const AdminStats = ({ country }) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState({ spent: 0, credited: 0 });
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const { data: creditedData, error: creditedError } = await supabase
                .from('transactions')
                .select('amount_pi')
                .eq('country', country)
                .eq('transaction_type', 'manual_credit');
            
            if (creditedError) throw creditedError;

            const totalCredited = creditedData.reduce((sum, item) => sum + item.amount_pi, 0);

            setStats({ credited: totalCredited });
        } catch (error) {
            console.error("Failed to fetch admin stats:", error);
            toast({ title: t('admin_dashboard.stats.error_title'), description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [country, t]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (loading) {
        return <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="glass-effect shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('admin_dashboard.stats.revenue_title')}</CardTitle>
                    <DollarSign className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats.credited.toLocaleString('fr-FR')} π
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};


const LicenseStatus = ({ user }) => {
    const { t } = useTranslation();
    const [partner, setPartner] = useState(null);
    const [timeLeft, setTimeLeft] = useState({ days: 0, expired: false, soon: false });
    const [loading, setLoading] = useState(true);
    const [renewalLoading, setRenewalLoading] = useState(false);

    const fetchPartnerData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('partners')
            .select('*, license:license_id(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            toast({ title: t('admin_dashboard.license.partner_error_title'), variant: 'destructive', description: error.message });
        } else {
            setPartner(data);
        }
        setLoading(false);
    }, [user, t]);

    useEffect(() => {
        fetchPartnerData();
    }, [fetchPartnerData]);

    useEffect(() => {
        if (!partner?.expiration_date) return;

        const calculateTimeLeft = () => {
            const expirationDate = new Date(partner.expiration_date);
            const now = new Date();
            const diff = expirationDate.getTime() - now.getTime();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

            setTimeLeft({
                days: Math.max(0, days),
                expired: diff <= 0,
                soon: diff > 0 && days <= 15,
            });
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 60000);
        return () => clearInterval(interval);
    }, [partner?.expiration_date]);

    const handleRenewalRequest = async () => {
        if (!partner) return;
        setRenewalLoading(true);
        try {
            const { error } = await supabase
                .from('licence_renewal_requests')
                .insert({
                    admin_id: user.id,
                    licence_id: partner.license_id,
                    status: 'pending',
                    request_date: new Date().toISOString()
                });
            if (error) throw error;
            toast({ title: t('admin_dashboard.license.renewal_sent_title'), description: t('admin_dashboard.license.renewal_sent_desc') });
        } catch (error) {
            toast({ title: t('common.error_title'), description: t('admin_dashboard.license.renewal_error_desc') + error.message, variant: "destructive" });
        } finally {
            setRenewalLoading(false);
        }
    };

    if (loading) return <div className="p-4 mb-6 rounded-lg bg-background/50 flex justify-center items-center"><Loader2 className="animate-spin" /></div>;
    if (!partner) return null;

    const activationDate = new Date(partner.activation_date);
    const expirationDate = new Date(partner.expiration_date);

    const { days, expired, soon } = timeLeft;
    const statusText = expired ? t('admin_dashboard.license.status_expired') : t('admin_dashboard.license.status_active');
    const statusColor = expired ? 'bg-red-500/20 text-red-300' : (soon ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300');

    return (
        <div className={`p-4 mb-6 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm gap-4 ${statusColor}`}>
            <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 flex-shrink-0" />
                <div>
                    <p className="font-bold text-lg">{t('admin_dashboard.license.status_title')}: <span className={`px-2 py-1 rounded-md`}>{partner.license.name} - {statusText}</span></p>
                    <div className="text-xs mt-2 space-y-1">
                        <p>{t('admin_dashboard.license.activated_on')}: {activationDate.toLocaleDateString('fr-FR')}</p>
                        <p>{t('admin_dashboard.license.expires_on')}: {expirationDate.toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>
            </div >
            <div className="text-center">
                {expired ? (
                    <p className="font-bold text-lg">{t('admin_dashboard.license.expired_since', { count: Math.abs(days) })}</p>
                ) : (
                    <>
                        <p className="font-bold text-3xl">{days}</p>
                        <p className="text-xs">{t('admin_dashboard.license.days_remaining')}</p>
                    </>
                )}
            </div >
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto" disabled={renewalLoading}>
                        {renewalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCwIcon className="mr-2 h-4 w-4" />}
                        {t('admin_dashboard.license.renew_button')}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin_dashboard.license.confirm_renewal_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin_dashboard.license.confirm_renewal_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRenewalRequest} disabled={renewalLoading}>
                            {renewalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('common.confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};

const AdminStatusBanner = ({ status }) => {
    const { t } = useTranslation();
  if (status === 'active') return null;

  let message, colorClass;

  switch (status) {
    case 'pending_verification':
    case 'pending':
      message = t('admin_dashboard.banner.pending');
      colorClass = "bg-yellow-500/20 text-yellow-300";
      break;
    case 'suspended':
      message = t('admin_dashboard.banner.suspended');
      colorClass = "bg-orange-500/20 text-orange-300";
      break;
    case 'expired':
      message = t('admin_dashboard.banner.expired');
      colorClass = "bg-red-500/20 text-red-300";
      break;
    default:
      return null;
  }

  return (
    <div className={`p-4 mb-6 rounded-lg flex items-center gap-3 ${colorClass}`}>
      <AlertTriangle className="w-6 h-6 flex-shrink-0" />
      <p className="font-semibold">{message}</p>
    </div>
  );
};


const AdminDashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { userProfile, loadingProfile, getPromotions, getEvents, forceRefreshUserProfile } = useData();
    const [allUsers, setAllUsers] = useState([]);
    const [allAnnouncements, setAllAnnouncements] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [allPromotions, setAllPromotions] = useState([]);
    const [allPopups, setAllPopups] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState('analytics');
    const [partnerStatus, setPartnerStatus] = useState('inactive');
    const [impersonatingUser, setImpersonatingUser] = useState(null);

    const isSuperAdmin = userProfile?.user_type === 'super_admin';
    const isAdmin = userProfile?.user_type === 'admin';
    const isSecretaryBySuperAdmin = userProfile?.user_type === 'secretary' && userProfile?.appointed_by_super_admin;
    
    const isFunctionalityActive = isSuperAdmin || partnerStatus === 'active';

    useEffect(() => {
        const checkImpersonation = async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser && currentUser.id !== user?.id) {
                const { data: impersonatedProfile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
                setImpersonatingUser(impersonatedProfile);
            } else {
                setImpersonatingUser(null);
            }
        };
        checkImpersonation();
    }, [user]);

    const handleStopImpersonating = async () => {
        setLoadingData(true);
        const { error } = await supabase.auth.revert();
        if (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
            setLoadingData(false);
        } else {
            toast({ title: "Retour à la normale", description: "Vous êtes revenu à votre compte." });
            window.location.reload();
        }
    };

    useEffect(() => {
    if (isAdmin) {
        const fetchPartnerStatus = async () => {
        const { data, error } = await supabase
            .from('partners')
            .select('status, expiration_date')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching partner status:', error);
        } else if (data) {
            const now = new Date();
            const expiration = new Date(data.expiration_date);
            if (expiration < now) {
            setPartnerStatus('expired');
            } else {
            setPartnerStatus(data.status);
            }
        }
        };
        fetchPartnerStatus();
    }
    }, [isAdmin, user]);


    useEffect(() => {
    if (isSuperAdmin) {
        setActiveTab('analytics');
    } else if (isAdmin) {
        setActiveTab('salary');
    } else if (isSecretaryBySuperAdmin) {
        setActiveTab('credits');
    }
    }, [isSuperAdmin, isAdmin, isSecretaryBySuperAdmin]);

    const fetchData = useCallback(async () => {
    if (!userProfile || !user) return;
    setLoadingData(true);
    try {
        const countryFilter = isAdmin ? userProfile.country : null;

        const fetchUsers = () => {
        let query = supabase.from('profiles').select('*');
        if (countryFilter && !isSuperAdmin) { 
            query = query.eq('country', countryFilter);
        }
        return query;
        };

        let transactionsQuery;
        if (isSuperAdmin) {
            transactionsQuery = supabase.from('coin_spending').select(`
            id, amount, description, created_at, purpose,
            user:user_id (full_name, email)
            `).order('created_at', { ascending: false });
        }

        const [usersRes, announcementsRes, eventsData, promotionsData, popupsRes, transactionsRes] = await Promise.all([
        fetchUsers(),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        getEvents(countryFilter ? { country: countryFilter } : {}),
        getPromotions(countryFilter ? { country: countryFilter } : {}),
        supabase.from('welcome_popups').select('*').order('created_at', { ascending: false }),
        transactionsQuery || Promise.resolve({ data: [], error: null }),
        ]);

        if (usersRes.error) throw usersRes.error;
        if (announcementsRes.error) throw announcementsRes.error;
        if (popupsRes.error) throw popupsRes.error;
        if (transactionsRes.error) throw transactionsRes.error;

        setAllUsers(usersRes.data || []);
        setAllAnnouncements(announcementsRes.data || []);
        setAllEvents(eventsData || []);
        setAllPromotions(promotionsData || []);
        if(transactionsRes.data) {
            setAllTransactions(transactionsRes.data.map(t => ({
            id: t.id,
            user_full_name: t.user?.full_name,
            user_email: t.user?.email,
            description: t.description,
            amount: t.amount,
            created_at: t.created_at,
            status: 'completed',
            type: t.purpose,
        })));
        }


    } catch (error) {
        console.error("Error fetching admin data:", error);
        toast({ title: t('admin_dashboard.loading_error_title'), description: error.message, variant: "destructive" });
    } finally {
        setLoadingData(false);
    }
    }, [userProfile, isAdmin, isSuperAdmin, user, getPromotions, getEvents, t]);

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

    if (!user || (!isSuperAdmin && !isAdmin && !isSecretaryBySuperAdmin)) {
    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
        <h1 className="text-2xl text-red-500">{t('admin_dashboard.unauthorized_title')}</h1>
        <p className="text-muted-foreground">{t('admin_dashboard.unauthorized_desc')}</p>
        </div>
    );
    }

    const dashboardTitle = isSuperAdmin ? t('admin_dashboard.super_admin_title') 
    : isAdmin ? t('admin_dashboard.admin_title', { country: userProfile.country })
    : t('admin_dashboard.secretary_title');

    return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 relative">
        {impersonatingUser && <ImpersonationBanner user={impersonatingUser} onRevert={handleStopImpersonating} />}
        <header className="mb-8">
        <h1 className="text-3xl font-bold">{dashboardTitle}</h1>
        <p className="text-muted-foreground">{t('admin_dashboard.welcome', { name: userProfile.full_name || user.email })}</p>
        </header>

        {isAdmin && isFunctionalityActive && <AdminStats country={userProfile.country} />}
        {isAdmin && isFunctionalityActive && <LicenseStatus user={userProfile} />}
        {isAdmin && <AdminStatusBanner status={partnerStatus} />}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-wrap h-auto items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
            {isSuperAdmin ? (
                <>
                <TabsTrigger value="analytics"><BarChart2 className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.analytics')}</TabsTrigger>
                <TabsTrigger value="credit_stats"><AreaChart className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.credit_stats')}</TabsTrigger>
                <TabsTrigger value="activity_log"><BookOpen className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.activity_log')}</TabsTrigger>
                <TabsTrigger value="transactions"><History className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.transactions')}</TabsTrigger>
                <TabsTrigger value="payments"><DollarSign className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.payments')}</TabsTrigger>
                <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.users')}</TabsTrigger>
                <TabsTrigger value="secretaries"><UserCheck className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.secretaries')}</TabsTrigger>
                <TabsTrigger value="credits"><CreditCard className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.credits')}</TabsTrigger>
                <TabsTrigger value="reversed_credits"><RotateCcw className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.reversed_credits')}</TabsTrigger>
                <TabsTrigger value="withdrawals"><Wallet className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.withdrawals')}</TabsTrigger>
                <TabsTrigger value="salary_withdrawals"><Wallet className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.salary_withdrawals')}</TabsTrigger>
                <TabsTrigger value="withdrawal_history"><History className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.withdrawal_history')}</TabsTrigger>
                <TabsTrigger value="events"><Calendar className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.events')}</TabsTrigger>
                <TabsTrigger value="locations"><MapPin className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.locations')}</TabsTrigger>
                <TabsTrigger value="promotions"><Target className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.promotions')}</TabsTrigger>
                <TabsTrigger value="partners"><Briefcase className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.partners')}</TabsTrigger>
                <TabsTrigger value="badges"><ShieldCheck className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.badges')}</TabsTrigger>
                <TabsTrigger value="announcements"><Megaphone className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.announcements')}</TabsTrigger>
                <TabsTrigger value="popups"><ImageIcon className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.popups')}</TabsTrigger>
                <TabsTrigger value="videos"><Video className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.videos')}</TabsTrigger>
                <TabsTrigger value="config"><Settings className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.config')}</TabsTrigger>
                </>
            ) : isAdmin && isFunctionalityActive ? (
                <>
                <TabsTrigger value="salary"><DollarSign className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.salary')}</TabsTrigger>
                <TabsTrigger value="events"><Calendar className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.events')}</TabsTrigger>
                <TabsTrigger value="locations"><MapPin className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.locations')}</TabsTrigger>
                <TabsTrigger value="promotions"><Target className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.promotions')}</TabsTrigger>
                <TabsTrigger value="credits_history"><CreditCard className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.credits')}</TabsTrigger>
                <TabsTrigger value="reversed_credits"><RotateCcw className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.reversed_credits')}</TabsTrigger>
                <TabsTrigger value="withdrawals"><Wallet className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.withdrawals')}</TabsTrigger>
                <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.users')}</TabsTrigger>
                <TabsTrigger value="secretaries"><UserCheck className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.secretaries')}</TabsTrigger>
                <TabsTrigger value="activity_log"><BookOpen className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.activity_log')}</TabsTrigger>
                </>
            ) : isSecretaryBySuperAdmin ? (
                <>
                <TabsTrigger value="credits"><CreditCard className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.credit_management')}</TabsTrigger>
                <TabsTrigger value="reversed_credits"><RotateCcw className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.reversed_credits')}</TabsTrigger>
                <TabsTrigger value="withdrawals"><Wallet className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.withdrawal_management')}</TabsTrigger>
                <TabsTrigger value="withdrawal_history"><History className="w-4 h-4 mr-2" />{t('admin_dashboard.tabs.withdrawal_history')}</TabsTrigger>
                </>
            ) : null}
            </TabsList>
            
            <div className="mt-6">
            {isSuperAdmin ? (
                <>
                <TabsContent value="analytics"><AnalyticsDashboard /></TabsContent>
                <TabsContent value="credit_stats"><CreditStatsTab /></TabsContent>
                <TabsContent value="activity_log"><ActivityLogTab /></TabsContent>
                <TabsContent value="transactions"><TransactionsTable transactions={allTransactions} /></TabsContent>
                <TabsContent value="payments"><AdminPaymentsTab /></TabsContent>
                <TabsContent value="users"><UserManagement users={allUsers} onRefresh={fetchData} /></TabsContent>
                <TabsContent value="secretaries"><SecretaryManagementTab users={allUsers} onRefresh={fetchData} /></TabsContent>
                <TabsContent value="credits"><CreditManagement onRefresh={fetchData} /></TabsContent>
                <TabsContent value="reversed_credits"><ReversedCreditsTab isSuperAdmin={true} /></TabsContent>
                <TabsContent value="withdrawals"><WithdrawalManagement /></TabsContent>
                <TabsContent value="salary_withdrawals"><SalaryWithdrawalManagement /></TabsContent>
                <TabsContent value="withdrawal_history"><WithdrawalHistoryTab /></TabsContent>
                <TabsContent value="events"><EventsManagement events={allEvents} onRefresh={fetchData} /></TabsContent>
                <TabsContent value="locations"><LocationManagementTab /></TabsContent>
                <TabsContent value="promotions"><PromotionsManagement promotions={allPromotions} onRefresh={fetchData} /></TabsContent>
                <TabsContent value="partners"><PartnersManagement onRefresh={fetchData} /></TabsContent>
                <TabsContent value="badges"><BadgeManagementPanel /></TabsContent>
                <TabsContent value="announcements"><AnnouncementsManagement announcements={allAnnouncements} onRefresh={fetchData} /></TabsContent>
                <TabsContent value="popups"><WelcomePopupManagement popups={allPopups} onRefresh={fetchData} /></TabsContent>
                <TabsContent value="videos"><VideoManager /></TabsContent>
                <TabsContent value="config"><ConfigTab /></TabsContent>
                </>
            ) : isAdmin && isFunctionalityActive ? (
                <>
                <TabsContent value="salary"><AdminSalaryDashboard /></TabsContent>
                <TabsContent value="events"><EventsManagement events={allEvents} onRefresh={fetchData} /></TabsContent>
                <TabsContent value="locations"><LocationManagementTab /></TabsContent>
                <TabsContent value="promotions"><PromotionsManagement promotions={allPromotions} onRefresh={fetchData} /></TabsContent>
                <TabsContent value="credits_history"><AdminCreditsTab /></TabsContent>
                <TabsContent value="reversed_credits"><ReversedCreditsTab isSuperAdmin={false} country={userProfile.country} /></TabsContent>
                <TabsContent value="withdrawals"><WithdrawalManagement /></TabsContent>
                <TabsContent value="users"><UserManagement users={allUsers} onRefresh={fetchData} /></TabsContent>
                <TabsContent value="secretaries"><SecretaryManagementTab users={allUsers} onRefresh={fetchData} /></TabsContent>
                <TabsContent value="activity_log"><ActivityLogTab /></TabsContent>
                </>
            ) : isSecretaryBySuperAdmin ? (
                <>
                <TabsContent value="credits"><CreditManagement onRefresh={fetchData} /></TabsContent>
                <TabsContent value="reversed_credits"><ReversedCreditsTab isSuperAdmin={false} actorId={userProfile.id} /></TabsContent>
                <TabsContent value="withdrawals"><WithdrawalManagement /></TabsContent>
                <TabsContent value="withdrawal_history"><WithdrawalHistoryTab actorId={userProfile.id} /></TabsContent>
                </>
            ) : null}
            </div>
        </Tabs>
    </div>
    );
};

export default AdminDashboard;