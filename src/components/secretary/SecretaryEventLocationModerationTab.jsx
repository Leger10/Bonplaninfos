
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2, Calendar, MapPin, Trash2, PowerOff, Power, Users, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import ZoneUsersList from './ZoneUsersList';
import { Badge } from '../ui/badge';

const SecretaryEventLocationModerationTab = () => {
    const { t } = useTranslation();
    const { userProfile } = useData();
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('events');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const logAction = useCallback(async (action_type, target_id, details = {}) => {
        await supabase.from('admin_logs').insert({ actor_id: user.id, action_type, target_id, details });
    }, [user.id]);

    const fetchData = useCallback(async () => {
        if (!userProfile?.country) return;
        setLoading(true);
        try {
            const [eventsRes, locationsRes] = await Promise.all([
                supabase.from('events').select('*, organizer:organizer_id(full_name)').eq('country', userProfile.country),
                supabase.from('locations').select('*, user:user_id(full_name)').eq('country', userProfile.country)
            ]);
            if (eventsRes.error) throw eventsRes.error;
            if (locationsRes.error) throw locationsRes.error;
            setEvents(eventsRes.data || []);
            setLocations(locationsRes.data || []);
        } catch (error) {
            toast({ title: t('common.error_title'), description: "Impossible de charger les données.", variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [userProfile?.country, t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredData = useMemo(() => {
        const data = view === 'events' ? events : locations;
        let filtered = data.filter(item => 
            (item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.title?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        if (statusFilter !== 'all') {
            const isActive = statusFilter === 'active';
            filtered = filtered.filter(item => (item.is_active === isActive) || (item.status === 'active' && isActive) || (item.status !== 'active' && !isActive));
        }
        return filtered;
    }, [view, events, locations, searchTerm, statusFilter]);

    const handleDelete = async (id, type) => {
        try {
            const { error } = await supabase.rpc(type === 'event' ? 'delete_event_completely' : 'delete_location', { [type === 'event' ? 'p_event_id' : 'p_location_id']: id });
            if (error) throw error;
            toast({ title: t('common.success_title'), description: `${type === 'event' ? 'Événement' : 'Lieu'} supprimé.` });
            await logAction(`${type}_deleted`, id);
            fetchData();
        } catch(error) {
            toast({ title: t('common.error_title'), description: `Impossible de supprimer.`, variant: 'destructive' });
        }
    };

    const handleToggleStatus = async (item, type) => {
        const table = type === 'event' ? 'events' : 'locations';
        const currentStatus = item.status || item.is_active;
        const newStatus = currentStatus === 'active' || currentStatus === true ? (type === 'event' ? 'inactive' : false) : (type === 'event' ? 'active' : true);
        
        try {
            const { error } = await supabase.from(table).update({ [type === 'event' ? 'status' : 'is_active']: newStatus }).eq('id', item.id);
            if (error) throw error;
            toast({ title: t('common.success_title'), description: 'Statut mis à jour.' });
            await logAction(`${type}_status_toggled`, item.id, { new_status: newStatus });
            fetchData();
        } catch (error) {
            toast({ title: t('common.error_title'), description: 'Mise à jour impossible.', variant: 'destructive' });
        }
    };
    
    return (
        <Card className="glass-effect border-purple-500/20">
            <CardHeader>
                <CardTitle>{t('secretary_dashboard.tabs.event_moderation')}</CardTitle>
                <CardDescription>{t('secretary_dashboard.event_moderation.zone_country', { country: userProfile?.country })}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)} size="sm">
                        <ToggleGroupItem value="events"><Calendar className="w-4 h-4 mr-2" />Événements</ToggleGroupItem>
                        <ToggleGroupItem value="locations"><MapPin className="w-4 h-4 mr-2" />Lieux</ToggleGroupItem>
                    </ToggleGroup>
                     <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`Rechercher des ${view === 'events' ? 'événements' : 'lieux'}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <ToggleGroup type="single" value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)} size="sm">
                        <ToggleGroupItem value="all">{t('secretary_dashboard.event_moderation.filter_all')}</ToggleGroupItem>
                        <ToggleGroupItem value="active">{t('secretary_dashboard.event_moderation.filter_active')}</ToggleGroupItem>
                        <ToggleGroupItem value="inactive">{t('secretary_dashboard.event_moderation.filter_inactive')}</ToggleGroupItem>
                    </ToggleGroup>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                    <div className="space-y-4">
                        {filteredData.map((item) => (
                            <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background/50 rounded-lg gap-4">
                                <div className="flex items-center space-x-4 flex-grow">
                                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        {view === 'events' ? <Calendar className="w-6 h-6 text-primary" /> : <MapPin className="w-6 h-6 text-primary" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{item.title || item.name}</p>
                                        <p className="text-sm text-gray-400">
                                            {view === 'events' ? `Par ${item.organizer?.full_name || 'N/A'}` : `Ajouté par ${item.user?.full_name || 'N/A'}`}
                                        </p>
                                    </div>
                                </div>
                                 <Badge variant={item.status === 'active' || item.is_active ? 'success' : 'destructive'} className="text-xs">
                                  {item.status === 'active' || item.is_active ? 'Actif' : 'Inactif'}
                                </Badge>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button size="icon" variant="ghost" onClick={() => handleToggleStatus(item, view === 'events' ? 'event' : 'location')} className="hover:text-yellow-400">
                                        {(item.status === 'active' || item.is_active) ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="icon" variant="ghost" className="hover:text-red-400"><Trash2 className="w-4 h-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t('secretary_dashboard.event_moderation.confirm_delete_title')}</AlertDialogTitle>
                                                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(item.id, view === 'events' ? 'event' : 'location')}>{t('common.delete')}</AlertDialogAction>
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
    );
};

export default SecretaryEventLocationModerationTab;
