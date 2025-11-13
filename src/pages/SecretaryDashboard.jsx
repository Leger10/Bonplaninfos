import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { addDays, format, startOfDay } from 'date-fns';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Coins, Search, UserPlus, Calendar as CalendarIcon, RotateCcw, Wallet, History } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SecretaryUserManagementTab from '@/components/secretary/SecretaryUserManagementTab';
import SecretaryEventManagementTab from '@/components/secretary/SecretaryEventManagementTab';
import SecretaryLocationManagementTab from '@/components/secretary/SecretaryLocationManagementTab';
import ReversedCreditsTab from '@/components/admin/ReversedCreditsTab';
import WithdrawalManagement from '@/components/admin/WithdrawalManagement';
import WithdrawalHistoryTab from '@/components/admin/WithdrawalHistoryTab';
import CreditManagement from '@/components/admin/CreditManagement';

const SecretaryDashboard = () => {
    const { user } = useAuth();
    const { userProfile, loadingProfile, getEvents } = useData();
    const [users, setUsers] = useState([]);
    const [events, setEvents] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const [activeTab, setActiveTab] = useState('users');

    const fetchData = useCallback(async () => {
        if (!userProfile) return;
        setLoadingData(true);
        try {
            const [usersRes, eventsRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('country', userProfile.country),
                getEvents({ country: userProfile.country })
            ]);

            if (usersRes.error) throw usersRes.error;
            
            setUsers(usersRes.data || []);
            setEvents(eventsRes || []);

        } catch (error) {
            toast({ title: "Erreur de chargement", description: "Impossible de charger les données.", variant: "destructive" });
        } finally {
            setLoadingData(false);
        }
    }, [userProfile, getEvents]);

    useEffect(() => {
        if (userProfile?.appointed_by_super_admin) {
            setActiveTab('credits');
        } else {
            setActiveTab('users');
        }
        if (userProfile) {
          fetchData();
        }
    }, [fetchData, userProfile]);

    if (loadingProfile || loadingData) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (!user || userProfile?.user_type !== 'secretary') {
        return <div className="text-center p-8">Accès non autorisé.</div>;
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold">Tableau de bord Secrétaire</h1>
                <p className="text-muted-foreground">Bienvenue, {userProfile.full_name || user.email}</p>
                <p className="text-sm text-primary">Zone de compétence : {userProfile.city}, {userProfile.country}</p>
            </header>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                    {userProfile.appointed_by_super_admin && (
                         <>
                            <TabsTrigger value="credits">Gestion Crédits</TabsTrigger>
                            <TabsTrigger value="reversed_credits">Crédits Annulés</TabsTrigger>
                            <TabsTrigger value="withdrawals">Gestion Retraits</TabsTrigger>
                            <TabsTrigger value="withdrawal_history">Hist. Retraits</TabsTrigger>
                         </>
                    )}
                    <TabsTrigger value="users">Gestion Utilisateurs</TabsTrigger>
                    <TabsTrigger value="events">Gestion Événements</TabsTrigger>
                    <TabsTrigger value="locations">Gestion Lieux</TabsTrigger>
                </TabsList>
                {userProfile.appointed_by_super_admin && (
                    <>
                        <TabsContent value="credits" className="mt-4">
                            <CreditManagement onRefresh={fetchData} />
                        </TabsContent>
                        <TabsContent value="reversed_credits" className="mt-4">
                            <ReversedCreditsTab isSuperAdmin={false} actorId={user.id} />
                        </TabsContent>
                        <TabsContent value="withdrawals" className="mt-4">
                            <WithdrawalManagement />
                        </TabsContent>
                        <TabsContent value="withdrawal_history" className="mt-4">
                            <WithdrawalHistoryTab actorId={user.id} />
                        </TabsContent>
                    </>
                )}
                <TabsContent value="users" className="mt-4">
                    <SecretaryUserManagementTab users={users} onRefresh={fetchData} />
                </TabsContent>
                <TabsContent value="events" className="mt-4">
                    <SecretaryEventManagementTab events={events} onRefresh={fetchData} />
                </TabsContent>
                <TabsContent value="locations" className="mt-4">
                    <SecretaryLocationManagementTab onRefresh={fetchData} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SecretaryDashboard;