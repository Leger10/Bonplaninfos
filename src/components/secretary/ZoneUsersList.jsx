import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Coins, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const ZoneUsersList = ({ event, onCredit, onRefresh }) => {
    const { t } = useTranslation();
    const { userProfile } = useData();
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isCrediting, setIsCrediting] = useState(false);

    useEffect(() => {
        if(event?.title) {
            setReason(t('secretary_dashboard.event_moderation.credit_reason_placeholder', { eventName: event.title }));
        }
    }, [event?.title, t]);

    useEffect(() => {
        const fetchZoneUsers = async () => {
            if (!userProfile?.country) return;
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, avatar_url, coin_balance, country, city')
                    .eq('country', userProfile.country);
                if (error) throw error;
                setUsers(data || []);
            } catch (error) {
                toast({ title: t('common.error_title'), description: t('secretary_dashboard.event_moderation.no_users_found'), variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };
        fetchZoneUsers();
    }, [userProfile?.country, t]);

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const handleCredit = async () => {
        if (!selectedUser || !amount || parseInt(amount) <= 0) {
            toast({ title: t('common.error_title'), description: 'Veuillez sélectionner un utilisateur et entrer un montant valide.', variant: 'destructive' });
            return;
        }
        setIsCrediting(true);
        try {
            const { data: rpcData, error } = await supabase.rpc('credit_user_coins', {
                p_user_id: selectedUser.id,
                p_amount: parseInt(amount),
                p_reason: reason,
                p_creditor_id: user.id
            });
            
            if (error) throw new Error(error.message);
            if (rpcData && !rpcData.success) throw new Error(rpcData.message);

            toast({ title: t('common.success_title'), description: t('secretary_dashboard.event_moderation.credit_success_message', { userName: selectedUser.full_name, amount }) });
            
            await supabase.from('admin_logs').insert({
                actor_id: user.id,
                action_type: 'event_attendance_credit',
                target_id: event.id,
                details: { userId: selectedUser.id, amount: parseInt(amount), reason },
            });

            setSelectedUser(null);
            setAmount('');
            if (onRefresh) onRefresh();
            if (onCredit) onCredit();
        } catch (error) {
            toast({ title: t('common.error_title'), description: error.message, variant: 'destructive' });
        } finally {
            setIsCrediting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] bg-background text-foreground">
            <DialogHeader>
                <DialogTitle>{t('secretary_dashboard.event_moderation.credit_user_for_event_title', { eventName: event?.title })}</DialogTitle>
                <DialogDescription>{t('secretary_dashboard.event_moderation.credit_user_for_event_desc')}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('secretary_dashboard.event_moderation.user_search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <ScrollArea className="h-72 rounded-md border">
                        {loading ? (
                            <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>
                        ) : filteredUsers.length > 0 ? (
                            <div className="p-4 space-y-2">
                                {filteredUsers.map(u => (
                                    <div
                                        key={u.id}
                                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted ${selectedUser?.id === u.id ? 'bg-primary/20' : ''}`}
                                        onClick={() => setSelectedUser(u)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={u.avatar_url} alt={u.full_name} />
                                                <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium">{u.full_name}</p>
                                                <p className="text-xs text-muted-foreground">{u.email}</p>
                                                <p className="text-xs text-muted-foreground">{u.city}, {u.country}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="flex items-center gap-1">
                                            <Coins className="w-3 h-3 text-amber-500"/>
                                            {u.coin_balance || 0}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <p className="text-center text-sm text-muted-foreground p-4">{t('secretary_dashboard.event_moderation.no_users_found')}</p>
                        )}
                    </ScrollArea>
                </div>
                <div className="space-y-4">
                    <h3 className="font-semibold">{selectedUser ? `${t('common.credit')} ${selectedUser.full_name}`: t('secretary_dashboard.event_moderation.select_user')}</h3>
                    {selectedUser && (
                        <div className="space-y-4 p-4 border rounded-lg bg-background/50">
                            <div>
                                <Label htmlFor="amount">{t('secretary_dashboard.event_moderation.credit_amount_label')}</Label>
                                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 50" />
                            </div>
                            <div>
                                <Label htmlFor="reason">{t('secretary_dashboard.event_moderation.credit_reason_label')}</Label>
                                <Input id="reason" type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => onCredit()}>{t('common.close')}</Button>
                <Button onClick={handleCredit} disabled={!selectedUser || !amount || isCrediting}>
                    {isCrediting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    {t('common.credit')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

export default ZoneUsersList;