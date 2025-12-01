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
import { Loader2, Check, X, RefreshCw } from 'lucide-react';
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
    const isAdmin = userProfile?.user_type === 'admin' || isSuperAdmin;
    
    const fetchWithdrawalRequests = useCallback(async () => {
        if (!isAdmin) return;
        
        setLoading(true);
        try {
            let query = supabase
                .from('organizer_withdrawal_requests')
                .select(`
                    *,
                    organizer:organizer_id (full_name, email, country, phone),
                    reviewer:reviewed_by_admin (full_name)
                `)
                .order('requested_at', { ascending: false });

            // Si pas super admin, filtrer par pays
            if (!isSuperAdmin && userProfile?.country) {
                query = query.eq('organizer.country', userProfile.country);
            }

            const { data, error } = await query;

            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            console.error('Erreur chargement demandes:', error);
            toast({ 
                title: 'Erreur', 
                description: 'Impossible de charger les demandes de retrait.', 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    }, [isAdmin, isSuperAdmin, userProfile]);

    useEffect(() => {
        if (userProfile && isAdmin) {
            fetchWithdrawalRequests();
        }
    }, [userProfile, isAdmin, fetchWithdrawalRequests]);

    const handleProcessRequest = async (requestId, status, reason = null) => {
        setProcessingId(requestId);
        try {
            console.log(`Traitement demande ${requestId} avec statut: ${status}`);
            
            const { data, error } = await supabase.rpc('process_organizer_withdrawal', {
                p_request_id: requestId,
                p_status: status,
                p_notes: reason
            });

            if (error) {
                console.error('Erreur RPC:', error);
                throw new Error(error.message);
            }

            // Vérifier la réponse de la fonction
            if (data && !data.success) {
                throw new Error(data.message);
            }

            toast({ 
                title: '✅ Succès', 
                description: `La demande a été ${status === 'approved' ? 'approuvée' : 'rejetée'}.` 
            });
            
            // Recharger les demandes
            await fetchWithdrawalRequests();
            
        } catch (error) {
            console.error('Erreur traitement:', error);
            toast({ 
                title: '❌ Erreur', 
                description: error.message, 
                variant: 'destructive' 
            });
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

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { color: 'bg-yellow-500/20 text-yellow-300', label: 'En attente' },
            approved: { color: 'bg-green-500/20 text-green-300', label: 'Approuvé' },
            rejected: { color: 'bg-red-500/20 text-red-300', label: 'Rejeté' },
            paid: { color: 'bg-blue-500/20 text-blue-300', label: 'Payé' }
        };
        
        const config = statusConfig[status] || statusConfig.pending;
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
                {config.label}
            </span>
        );
    };

    if (!isAdmin) {
        return (
            <div className="text-center p-8">
                <p className="text-destructive font-semibold">
                    Accès non autorisé. Réservé aux administrateurs.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gestion des Retraits</h2>
                <Button 
                    onClick={fetchWithdrawalRequests} 
                    variant="outline" 
                    disabled={loading}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualiser
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organisateur</TableHead>
                                <TableHead>Montant (π)</TableHead>
                                <TableHead>Montant (FCFA)</TableHead>
                                <TableHead>Moyen de paiement</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Date demande</TableHead>
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
                                            <div className="text-xs text-blue-400">{req.organizer?.phone}</div>
                                            {isSuperAdmin && <div className="text-xs text-green-400">{req.organizer?.country}</div>}
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            {req.amount_pi.toLocaleString('fr-FR')} π
                                        </TableCell>
                                        <TableCell>
                                            {req.amount_fcfa.toLocaleString('fr-FR')} FCFA
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{req.payment_details?.method || 'Non spécifié'}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {req.payment_details?.number || req.payment_details?.account_number || 'N/A'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(req.status)}
                                            {req.reviewed_by_admin && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Traité par: {req.reviewer?.full_name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(req.requested_at).toLocaleDateString('fr-FR')}
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(req.requested_at).toLocaleTimeString('fr-FR')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {req.status === 'pending' && (
                                                <>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleProcessRequest(req.id, 'approved')} 
                                                        disabled={processingId === req.id}
                                                        className="hover:bg-green-500/20"
                                                    >
                                                        {processingId === req.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                                        ) : (
                                                            <Check className="h-4 w-4 text-green-500" />
                                                        )}
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => openRejectionDialog(req)} 
                                                        disabled={processingId === req.id}
                                                        className="hover:bg-red-500/20"
                                                    >
                                                        <X className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </>
                                            )}
                                            {req.status !== 'pending' && req.admin_notes && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Note: {req.admin_notes}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        Aucune demande de retrait trouvée.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
            
            <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeter la demande de retrait</DialogTitle>
                        <DialogDescription>
                            Veuillez fournir une raison pour le rejet. Cette raison sera visible par l'organisateur.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {selectedRequest && (
                            <div className="p-3 bg-muted rounded-lg">
                                <p><strong>Organisateur:</strong> {selectedRequest.organizer?.full_name}</p>
                                <p><strong>Montant:</strong> {selectedRequest.amount_pi} π ({selectedRequest.amount_fcfa} FCFA)</p>
                                <p><strong>Moyen de paiement:</strong> {selectedRequest.payment_details?.method} - {selectedRequest.payment_details?.number}</p>
                            </div>
                        )}
                        <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Ex: Informations de paiement incorrectes, document manquant, etc."
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setIsRejectionDialogOpen(false);
                                setRejectionReason('');
                                setSelectedRequest(null);
                            }}
                        >
                            Annuler
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => handleProcessRequest(selectedRequest?.id, 'rejected', rejectionReason)} 
                            disabled={processingId === selectedRequest?.id || !rejectionReason.trim()}
                        >
                            {processingId === selectedRequest?.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Confirmer le rejet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WithdrawalManagement;