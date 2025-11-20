import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ActivityLogTab = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('admin_logs')
                .select(`
                    id,
                    created_at,
                    action_type,
                    details,
                    actor:actor_id (full_name, email),
                    target:target_id (full_name, email)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (searchTerm) {
                const searchPattern = `%${searchTerm}%`;
                 query = query.or(
                    `action_type.ilike.${searchPattern},actor.full_name.ilike.${searchPattern},actor.email.ilike.${searchPattern},target.full_name.ilike.${searchPattern},target.email.ilike.${searchPattern}`
                );
            }

            const { data, error } = await query;
            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de charger les journaux d'activité.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchLogs();
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [fetchLogs]);

    const formatDetails = (details) => {
        if (!details) return '';
        return Object.entries(details).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ');
    };

    return (
        <Card className="glass-effect">
            <CardHeader>
                <CardTitle>Journal d'Activité des Administrateurs</CardTitle>
                <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par action, acteur ou cible..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {logs.length > 0 ? logs.map(log => (
                            <div key={log.id} className="p-4 bg-background/50 rounded-lg shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-primary">{log.action_type}</p>
                                        <p className="text-sm">
                                            <span className="font-medium">Acteur:</span> {log.actor?.full_name || log.actor?.email || 'Système'}
                                        </p>
                                        {log.target && (
                                            <p className="text-sm">
                                                <span className="font-medium">Cible:</span> {log.target?.full_name || log.target?.email}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'd MMMM yyyy, HH:mm', { locale: fr })}</p>
                                </div>
                                {log.details && (
                                    <div className="mt-2 text-xs bg-muted p-2 rounded">
                                        <code>{formatDetails(log.details)}</code>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <p className="text-center text-muted-foreground py-8">Aucun journal trouvé.</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ActivityLogTab;