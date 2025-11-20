import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2, Calendar, Trash2, PowerOff, Power, Users } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import ZoneUsersList from './ZoneUsersList';

const SecretaryEventModerationTab = () => {
    const { t } = useTranslation();
    const { userProfile } = useData();
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    const [selectedEventForCredit, setSelectedEventForCredit] = useState(null);

    const logAction = useCallback(async (action_type, target_id, details = {}) => {
        await supabase.from('admin_logs').insert({
            actor_id: user.id,
            action_type,
            target_id,
            details,
        });
    }, [user.id]);

    const fetchEvents = useCallback(async () => {
        if (!userProfile?.country) return;
        setLoading(true);
        try {
            let query = supabase.from('events').select('*, organizer:organizer_id(full_name)').eq('country', userProfile.country);
            if (filter !== 'all') {
                query = query.eq('status', filter);
            }
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            setEvents(data || []);
        } catch (error) {
            toast({ title: t('common.error_title'), description: "Impossible de charger les événements.", variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [userProfile?.country, filter, t]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleDelete = async (eventId) => {
        try {
            const { error } = await supabase.rpc('delete_event_completely', { p_event_id: eventId });
            if (error) throw error;
            toast({ title: t('common.success_title'), description: t('secretary_dashboard.event_moderation.event_deleted_success') });
            await logAction('event_deleted', eventId);
            fetchEvents();
        } catch(error) {
            toast({ title: t('common.error_title'), description: t('secretary_dashboard.event_moderation.event_deleted_error'), variant: 'destructive' });
        }
    };

    const handleToggleStatus = async (event) => {
        const newStatus = event.status === 'active' ? 'inactive' : 'active';
        try {
            const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', event.id);
            if (error) throw error;
            toast({ title: t('common.success_title'), description: t('secretary_dashboard.event_moderation.status_updated_success') });
            await logAction('event_status_toggled', event.id, { new_status: newStatus });
            fetchEvents();
        } catch (error) {
            toast({ title: t('common.error_title'), description: t('secretary_dashboard.event_moderation.status_updated_error'), variant: 'destructive' });
        }
    };

    const openCreditModal = (event) => {
        setSelectedEventForCredit(event);
        setIsCreditModalOpen(true);
    };

    return (
        <>
            <Card className="glass-effect border-purple-500/20">
                <CardHeader>
                    <CardTitle>{t('secretary_dashboard.event_moderation.title')}</CardTitle>
                    <CardDescription>{t('secretary_dashboard.event_moderation.zone_country', { country: userProfile?.country })}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <ToggleGroup type="single" value={filter} onValueChange={(value) => value && setFilter(value)} size="sm">
                            <ToggleGroupItem value="all">{t('secretary_dashboard.event_moderation.filter_all')}</ToggleGroupItem>
                            <ToggleGroupItem value="active">{t('secretary_dashboard.event_moderation.filter_active')}</ToggleGroupItem>
                            <ToggleGroupItem value="inactive">{t('secretary_dashboard.event_moderation.filter_inactive')}</ToggleGroupItem>
                        </ToggleGroup>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                    ) : (
                        <div className="space-y-4">
                            {events.map((event) => (
                                <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background/50 rounded-lg gap-4">
                                    <div className="flex items-center space-x-4 flex-grow">
                                        <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Calendar className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{event.title}</p>
                                            <p className="text-sm text-gray-400">Par {event.organizer?.full_name || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button variant="outline" size="sm" onClick={() => openCreditModal(event)}>
                                            <Users className="w-4 h-4 mr-2"/>
                                            {t('secretary_dashboard.event_moderation.credit_participants_button')}
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleToggleStatus(event)} className="hover:text-yellow-400">
                                            {event.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="icon" variant="ghost" className="hover:text-red-400">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{t('secretary_dashboard.event_moderation.confirm_delete_title')}</AlertDialogTitle>
                                                    <AlertDialogDescription>{t('secretary_dashboard.event_moderation.confirm_delete_desc')}</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(event.id)}>{t('common.delete')}</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isCreditModalOpen} onOpenChange={setIsCreditModalOpen}>
                {selectedEventForCredit && (
                    <ZoneUsersList 
                        event={selectedEventForCredit} 
                        onCredit={() => setIsCreditModalOpen(false)} 
                        onRefresh={fetchEvents}
                    />
                )}
            </Dialog>
        </>
    );
};

export default SecretaryEventModerationTab;