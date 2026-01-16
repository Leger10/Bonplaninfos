
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Search, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '../ui/button';
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

const ReversedCreditsTab = ({ isSuperAdmin, country }) => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [logToReverse, setLogToReverse] = useState(null);
    const [reversing, setReversing] = useState(false);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('admin_logs')
                .select(`
                    id,
                    created_at,
                    details,
                    actor:actor_id (id, full_name, email),
                    target:target_id (full_name, email, country)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (!isSuperAdmin) {
                // For country admin, show all credits in their country
                if (country) {
                    query = query.eq('target.country', country);
                }
            }
            
            const { data, error } = await query;
            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error("Error fetching credit logs:", error);
            toast({ title: "Erreur", description: "Impossible de charger les crédits.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin, country]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchLogs();
        }, 500);
        return () => clearTimeout(handler);
    }, [fetchLogs, searchTerm]);

    const handleReverseCredit = async () => {
        if (!logToReverse || !user) return;
        setReversing(true);
        try {
            const { data, error } = await supabase.rpc('reverse_credit', {
                p_log_id: logToReverse.id,
                p_reverser_id: user.id
            });
            if (error) throw error;
            if (data && !data.success) throw new Error(data.message);
            toast({ title: "Succès", description: "Le crédit a été annulé." });
            fetchLogs();
        } catch (err) {
            toast({ title: "Erreur", description: err.message, variant: "destructive" });
        } finally {
            setReversing(false);
            setLogToReverse(null);
        }
    };
    
    const filteredLogs = logs.filter(log => {
      const isReversed = log.details?.reversed === true;
      if (!isReversed) return false;
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        return (
          log.actor?.full_name?.toLowerCase().includes(lowerSearch) ||
          log.actor?.email?.toLowerCase().includes(lowerSearch) ||
          log.target?.full_name?.toLowerCase().includes(lowerSearch) ||
          log.target?.email?.toLowerCase().includes(lowerSearch)
        );
      }
      return true;
    });

    return (
        <>
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle>Historique des pièces Annulés</CardTitle>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par utilisateur ou admin..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
                    ) : (
                        <div className="space-y-4">
                            {filteredLogs.length > 0 ? filteredLogs.map(log => (
                                <div key={log.id} className="p-4 bg-background/50 rounded-lg shadow-sm border border-destructive/20">
                                    <div className="flex justify-between items-start flex-wrap gap-2">
                                        <div>
                                            <p className="font-semibold text-destructive">Crédit Annulé de {log.details?.amount || 'N/A'} pièces</p>
                                            <p className="text-sm"><span className="font-medium">Utilisateur:</span> {log.target?.full_name || log.target?.email || 'N/A'}</p>
                                            <p className="text-sm"><span className="font-medium">Crédité par:</span> {log.actor?.full_name || log.actor?.email || 'Système'}</p>
                                            <p className="text-sm text-muted-foreground"><span className="font-medium">Annulé par:</span> {log.details?.reversed_by_name || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                           <p className="text-xs text-muted-foreground">Crédit du {format(new Date(log.created_at), 'd MMM yyyy', { locale: fr })}</p>
                                           {log.details?.reversed_at && (
                                               <p className="text-xs text-muted-foreground">Annulé le {format(new Date(log.details.reversed_at), 'd MMM yyyy, HH:mm', { locale: fr })}</p>
                                           )}
                                        </div>
                                    </div>
                                    {log.details?.reason && (
                                        <div className="mt-2 text-xs bg-muted p-2 rounded">
                                            <p><span className="font-semibold">Raison du crédit:</span> {log.details.reason}</p>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <p className="text-center text-muted-foreground py-8">Aucun crédit annulé trouvé.</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!logToReverse} onOpenChange={() => setLogToReverse(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer l'annulation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Voulez-vous vraiment annuler le crédit de {logToReverse?.details.amount} pièces pour {logToReverse?.target.full_name} ? Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Non</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReverseCredit} disabled={reversing}>
                            {reversing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Oui, annuler
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default ReversedCreditsTab;
