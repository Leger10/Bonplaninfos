import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/use-toast';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const SalaryWithdrawalManagement = () => {
    const { t } = useTranslation();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processingId, setProcessingId] = useState(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('admin_withdrawal_requests')
                .select('*, admin:admin_id(full_name, email)')
                .order('requested_at', { ascending: true });
            if (error) throw error;
            setRequests(data);
        } catch (error) {
            toast({ title: t('common.error_title'), description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleProcessRequest = async (requestId, newStatus, notes = null) => {
        setProcessingId(requestId);
        try {
            const { error } = await supabase
                .from('admin_withdrawal_requests')
                .update({ status: newStatus, processor_notes: notes, processed_at: new Date().toISOString() })
                .eq('id', requestId);
            
            if (error) throw error;

            toast({ title: "Succès", description: `Demande mise à jour avec le statut : ${newStatus}` });
            fetchRequests();
        } catch (error) {
             toast({ title: t('common.error_title'), description: error.message, variant: "destructive" });
        } finally {
            setProcessingId(null);
            if (isRejectionDialogOpen) {
                setIsRejectionDialogOpen(false);
                setRejectionReason('');
            }
        }
    };

    const openRejectionDialog = (request) => {
        setSelectedRequest(request);
        setIsRejectionDialogOpen(true);
    };
    
    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return <Badge variant="outline">En attente</Badge>;
            case 'approved': return <Badge variant="secondary">Approuvée</Badge>;
            case 'processed': return <Badge variant="success">Traitée</Badge>;
            case 'rejected': return <Badge variant="destructive">Rejetée</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestion des Retraits de Salaires</CardTitle>
                <CardDescription>Approuver, rejeter et traiter les demandes de retrait des administrateurs.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Admin</TableHead>
                            <TableHead>Montant</TableHead>
                            <TableHead>Date Demande</TableHead>
                            <TableHead>Détails Paiement</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan="6" className="text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                        ) : requests.length === 0 ? (
                            <TableRow><TableCell colSpan="6" className="text-center">Aucune demande en attente.</TableCell></TableRow>
                        ) : (
                            requests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>
                                        <div className="font-medium">{req.admin.full_name}</div>
                                        <div className="text-sm text-muted-foreground">{req.admin.email}</div>
                                    </TableCell>
                                    <TableCell>{req.amount.toLocaleString('fr-FR')} FCFA</TableCell>
                                    <TableCell>{new Date(req.requested_at).toLocaleDateString('fr-FR')}</TableCell>
                                    <TableCell>
                                        {req.bank_details?.name ? (
                                            <div>
                                                <p>{req.bank_details.name}</p>
                                                <p className="text-xs">{req.bank_details.number}</p>
                                                <p className="text-xs">{req.bank_details.holder}</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p>{req.bank_details?.operator}</p>
                                                <p className="text-xs">{req.bank_details?.phone}</p>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                                    <TableCell>
                                        {req.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleProcessRequest(req.id, 'approved')} disabled={processingId === req.id}>
                                                    {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => openRejectionDialog(req)} disabled={processingId === req.id}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                        {req.status === 'approved' && (
                                             <Button size="sm" onClick={() => handleProcessRequest(req.id, 'processed', 'Paiement effectué manuellement')} disabled={processingId === req.id}>
                                                {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : "Traiter"}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

             <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeter la demande</DialogTitle>
                        <DialogDescription>
                            Veuillez fournir une raison pour le rejet.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Raison du rejet..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectionDialogOpen(false)}>Annuler</Button>
                        <Button variant="destructive" onClick={() => handleProcessRequest(selectedRequest.id, 'rejected', rejectionReason)} disabled={processingId === selectedRequest?.id || !rejectionReason}>
                            {processingId === selectedRequest?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default SalaryWithdrawalManagement;