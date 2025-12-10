import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    Loader2, Check, X, RefreshCw, Search, Download, Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import * as XLSX from 'xlsx';

const WithdrawalManagement = () => {
    const { user } = useAuth();
    const { userProfile } = useData();

    const [requests, setRequests] = useState([]);
    const [filtered, setFiltered] = useState([]);

    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const isSuperAdmin = userProfile?.user_type === 'super_admin';
    const isAdmin = isSuperAdmin || userProfile?.user_type === 'admin';
    // Secretaries also have access but "view only" logic applies to everyone except Super Admin based on the request
    // However, checking the prompt: "Restrict admin and secretary views... (view only, no actions)".
    // This implies ONLY Super Admin can act.
    const canPerformActions = isSuperAdmin; 

    // -------------------------------------------------------------
    // 🔥 1. Chargement des données
    // -------------------------------------------------------------
    const fetchWithdrawalRequests = useCallback(async () => {
        // Allowed roles check
        const allowedRoles = ['super_admin', 'admin', 'secretary'];
        if (!allowedRoles.includes(userProfile?.user_type)) return;

        setLoading(true);

        try {
            // Build query
            let query = supabase
                .from('organizer_withdrawal_requests')
                .select(`
                  *,
                  organizer:organizer_id (full_name, email, country, phone),
                  reviewer:reviewed_by_admin (full_name)
                `)
                .order('requested_at', { ascending: false });

            // Restrict to zone if not super admin
            if (!isSuperAdmin && userProfile?.country) {
                // Filter requests where the organizer's country matches the admin's country
                // Note: We can't filter joined tables directly with .eq('organizer.country') easily in basic supabase-js without inner join implied
                // But Supabase PostgREST syntax supports filtering on joined resource:
                query = query.eq('organizer.country', userProfile.country);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Client-side double check for zone restriction (safety net)
            const filteredData = isSuperAdmin 
                ? data 
                : data.filter(req => req.organizer?.country === userProfile?.country);

            setRequests(filteredData || []);
            setFiltered(filteredData || []);
        } catch (error) {
            console.error('Erreur chargement:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de charger les demandes.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin, userProfile]);

    useEffect(() => {
        if (userProfile) fetchWithdrawalRequests();
    }, [userProfile, fetchWithdrawalRequests]);

    // -------------------------------------------------------------
    // 🔎 2. Recherche multicritères
    // -------------------------------------------------------------
    useEffect(() => {
        let result = [...requests];

        if (search.trim().length > 0) {
            const s = search.toLowerCase();
            result = result.filter(req =>
                req.organizer?.full_name?.toLowerCase().includes(s) ||
                req.organizer?.email?.toLowerCase().includes(s) ||
                req.organizer?.phone?.toLowerCase().includes(s)
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(req => req.status === statusFilter);
        }

        setFiltered(result);
    }, [search, statusFilter, requests]);

    const resetFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setFiltered(requests);
    };

    // -------------------------------------------------------------
    // 💵 3. Traitement des demandes
    // -------------------------------------------------------------
    const handleProcessRequest = async (requestId, status, reason = null) => {
        if (!canPerformActions) {
            toast({ title: "Non autorisé", description: "Vous n'avez pas les droits pour effectuer cette action.", variant: "destructive" });
            return;
        }

        setProcessingId(requestId);

        try {
            const { data, error } = await supabase.rpc('process_organizer_withdrawal', {
                p_request_id: requestId,
                p_status: status,
                p_notes: reason
            });

            if (error) throw error;

            if (data && !data.success) throw new Error(data.message);

            toast({
                title: 'Succès',
                description: `Demande ${status === 'approved' ? 'approuvée' : 'rejetée'}.`
            });

            await fetchWithdrawalRequests();

        } catch (error) {
            toast({
                title: 'Erreur',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setProcessingId(null);
            setIsRejectionDialogOpen(false);
            setRejectionReason('');
            setSelectedRequest(null);
        }
    };

    const openRejectionDialog = (req) => {
        setSelectedRequest(req);
        setIsRejectionDialogOpen(true);
    };

    // -------------------------------------------------------------
    // 📤 4. Export Excel
    // -------------------------------------------------------------
    const exportToExcel = () => {
        const rows = filtered.map(r => ({
            Organisateur: r.organizer?.full_name,
            Email: r.organizer?.email,
            Téléphone: r.organizer?.phone,
            Pays: r.organizer?.country,
            Montant_PI: r.amount_pi,
            Montant_FCFA: r.amount_fcfa,
            Moyen: r.payment_details?.method,
            Identifiant: r.payment_details?.number,
            Statut: r.status,
            Date: new Date(r.requested_at).toLocaleString('fr-FR')
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Retraits');

        XLSX.writeFile(wb, 'withdrawals.xlsx');
        toast({ title: "Export réussi", description: "Le fichier Excel a été généré." });
    };

    // -------------------------------------------------------------
    // UI
    // -------------------------------------------------------------
    const getStatusBadge = (status) => {
        const mapping = {
            pending: 'bg-yellow-500/20 text-yellow-600 border-yellow-200',
            approved: 'bg-green-500/20 text-green-600 border-green-200',
            rejected: 'bg-red-500/20 text-red-600 border-red-200',
            paid: 'bg-blue-500/20 text-blue-600 border-blue-200',
        };
        const label = {
            pending: 'En attente',
            approved: 'Approuvé',
            rejected: 'Rejeté',
            paid: 'Payé'
        };
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${mapping[status] || ''}`}>
                {label[status] || status}
            </span>
        );
    };

    return (
        <div className="space-y-4">

            {/* 🔎 Barre de recherche & filtres */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="relative w-full md:w-72">
                    <input
                        className="w-full px-3 py-2 border rounded-md pl-9 bg-background"
                        placeholder="Rechercher un organisateur..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Search className="w-4 h-4 absolute left-2 top-3 text-muted-foreground" />
                </div>

                <select
                    className="px-3 py-2 border rounded-md bg-background w-full md:w-auto"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="approved">Approuvé</option>
                    <option value="rejected">Rejeté</option>
                    <option value="paid">Payé</option>
                </select>

                <Button variant="outline" onClick={resetFilters} className="w-full md:w-auto">Réinitialiser</Button>

                <div className="flex gap-2 ml-auto w-full md:w-auto">
                    <Button onClick={exportToExcel} className="flex items-center gap-2 flex-1 md:flex-none" variant="secondary">
                        <Download className="w-4 h-4" /> Excel
                    </Button>

                    <Button
                        onClick={fetchWithdrawalRequests}
                        variant="outline"
                        disabled={loading}
                        className="flex items-center gap-2 flex-1 md:flex-none"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {!canPerformActions && (
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md text-sm border border-blue-200 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Mode lecture seule : Seul le Super Admin peut traiter les demandes de retrait.
                </div>
            )}

            {/* 🧾 Tableau */}
            <div className="rounded-md border bg-card">
                {loading ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organisateur</TableHead>
                                    <TableHead>Montant (π)</TableHead>
                                    <TableHead>Montant (FCFA)</TableHead>
                                    <TableHead>Paiement</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Date</TableHead>
                                    {canPerformActions && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {filtered.length > 0 ? (
                                    filtered.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                <div className="font-medium">{req.organizer?.full_name}</div>
                                                <div className="text-sm text-muted-foreground">{req.organizer?.email}</div>
                                                <div className="text-xs text-blue-600 dark:text-blue-400">{req.organizer?.phone}</div>
                                                {(isSuperAdmin || userProfile.user_type === 'admin') && (
                                                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">{req.organizer?.country}</div>
                                                )}
                                            </TableCell>

                                            <TableCell className="font-mono">{req.amount_pi.toLocaleString('fr-FR')} π</TableCell>
                                            <TableCell className="font-bold">{req.amount_fcfa.toLocaleString('fr-FR')} FCFA</TableCell>

                                            <TableCell>
                                                <div className="font-medium">
                                                    {req.payment_details?.method || 'N/A'}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {req.payment_details?.number || req.payment_details?.account_number || '—'}
                                                </div>
                                            </TableCell>

                                            <TableCell>{getStatusBadge(req.status)}</TableCell>

                                            <TableCell>
                                                {new Date(req.requested_at).toLocaleDateString('fr-FR')}
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(req.requested_at).toLocaleTimeString('fr-FR')}
                                                </div>
                                            </TableCell>

                                            {canPerformActions && (
                                                <TableCell className="text-right space-x-2">
                                                    {req.status === 'pending' && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleProcessRequest(req.id, 'approved')}
                                                                disabled={processingId === req.id}
                                                                className="hover:bg-green-100 dark:hover:bg-green-900/20"
                                                                title="Approuver"
                                                            >
                                                                {processingId === req.id ?
                                                                    <Loader2 className="h-4 w-4 animate-spin" /> :
                                                                    <Check className="h-4 w-4 text-green-600" />
                                                                }
                                                            </Button>

                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openRejectionDialog(req)}
                                                                disabled={processingId === req.id}
                                                                className="hover:bg-red-100 dark:hover:bg-red-900/20"
                                                                title="Rejeter"
                                                            >
                                                                <X className="h-4 w-4 text-red-600" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={canPerformActions ? 7 : 6} className="text-center py-8">
                                            Aucun résultat trouvé.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* ❌ Dialog rejet */}
            <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeter la demande</DialogTitle>
                        <DialogDescription>
                            Une raison est obligatoire et sera visible par l’organisateur.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {selectedRequest && (
                            <div className="p-3 bg-muted rounded-lg text-sm border">
                                <p><strong>Organisateur:</strong> {selectedRequest.organizer?.full_name}</p>
                                <p><strong>Montant:</strong> {selectedRequest.amount_pi} π</p>
                                <p><strong>Paiement:</strong> {selectedRequest.payment_details?.method}</p>
                            </div>
                        )}

                        <Textarea
                            rows={4}
                            placeholder="Ex: Numéro mobile money incorrect..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsRejectionDialogOpen(false)}
                        >
                            Annuler
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={() =>
                                handleProcessRequest(selectedRequest?.id, 'rejected', rejectionReason)
                            }
                            disabled={!rejectionReason.trim() || processingId === selectedRequest?.id}
                        >
                            {processingId === selectedRequest?.id &&
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            }
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default WithdrawalManagement;