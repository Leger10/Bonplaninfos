import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';

const WithdrawalManagement = () => {
    const { user } = useAuth();
    const { userProfile } = useData();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processingId, setProcessingId] = useState(null);
    
    const isSuperAdmin = userProfile?.user_type === 'super_admin';
    
    const fetchWithdrawalRequests = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase.from('organizer_withdrawal_requests')
                .select(`
                    *,
                    organizer:organizer_id (full_name, email, country)
                `)
                .eq('status', 'pending')
                .order('requested_at', { ascending: true });

            if (!isSuperAdmin) {
                query = query.filter('organizer.country', 'eq', userProfile.country);
            }

            const { data, error } = await query;

            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de charger les demandes de retrait.', variant: 'destructive' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin, userProfile]);

    useEffect(() => {
        if (userProfile) {
            fetchWithdrawalRequests();
        }
    }, [userProfile, fetchWithdrawalRequests]);

    const handleProcessRequest = async (requestId, status, reason = null) => {
        setProcessingId(requestId);
        try {
            const { error } = await supabase.rpc('process_organizer_withdrawal', {
                p_request_id: requestId,
                p_status: status,
                p_notes: reason
            });

            if (error) throw error;

            toast({ title: 'Succès', description: `La demande a été ${status === 'approved' ? 'approuvée' : 'rejetée'}.` });
            fetchWithdrawalRequests();
        } catch (error) {
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setProcessingId(null);
            if (isRejectionDialogOpen) {
                setIsRejectionDialogOpen(false);
                setRejectionReason('');
                setSelectedRequest(null);
            }
        }
    };
    
    const openRejectionDialog = (request) => {
        setSelectedRequest(request);
        setIsRejectionDialogOpen(true);
    };

    if (loading) {
        return <div className="flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Gestion des Retraits</h2>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Utilisateur</TableHead>
                            <TableHead>Montant (π)</TableHead>
                            <TableHead>Montant (FCFA)</TableHead>
                            <TableHead>Paiement</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length > 0 ? (
                            requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell>
                                        <div className="font-medium">{req.organizer?.full_name}</div>
                                        <div className="text-sm text-muted-foreground">{req.organizer?.email}</div>
                                        {isSuperAdmin && <div className="text-xs text-blue-400">{req.organizer?.country}</div>}
                                    </TableCell>
                                    <TableCell>{req.amount_pi.toLocaleString('fr-FR')}</TableCell>
                                    <TableCell>{req.amount_fcfa.toLocaleString('fr-FR')}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{req.payment_details?.method || 'Non spécifié'}</div>
                                        <div className="text-xs text-muted-foreground">{req.payment_details?.number || req.payment_details?.paypal_email || req.payment_details?.account_number}</div>
                                    </TableCell>
                                    <TableCell>{new Date(req.requested_at).toLocaleString('fr-FR')}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleProcessRequest(req.id, 'approved', 'Approuvé')} disabled={processingId === req.id}>
                                            {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4 text-green-500" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => openRejectionDialog(req)} disabled={processingId === req.id}>
                                            <X className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">Aucune demande de retrait en attente.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeter la demande de retrait</DialogTitle>
                        <DialogDescription>
                            Veuillez fournir une raison pour le rejet. Cette raison sera visible par l'utilisateur.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Ex: Informations de paiement incorrectes."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectionDialogOpen(false)}>Annuler</Button>
                        <Button variant="destructive" onClick={() => handleProcessRequest(selectedRequest.id, 'rejected', rejectionReason)} disabled={processingId === selectedRequest?.id || !rejectionReason}>
                            {processingId === selectedRequest?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirmer le rejet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WithdrawalManagement;