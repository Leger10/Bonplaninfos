import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, RefreshCw, Filter, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const UserReactivationsTab = ({ onCountChange }) => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'all' | 'approved' | 'rejected'

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    console.log("Fetching reactivation requests with status:", statusFilter);
    try {
      // 1. Récupérer les demandes
      let query = supabase
        .from('reactivation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: requestsData, error: requestsError } = await query;

      if (requestsError) {
        console.error("Supabase Error fetching requests:", requestsError);
        throw requestsError;
      }

      console.log("Raw Requests Data:", requestsData);

      // 2. Récupérer les profils utilisateurs manuellement pour éviter les erreurs de jointure FK
      if (requestsData && requestsData.length > 0) {
        const userIds = [...new Set(requestsData.map(r => r.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, is_active, avatar_url, country, city')
            .in('id', userIds);

          if (profilesError) {
            console.error("Error fetching profiles:", profilesError);
          } else {
            const profilesMap = profilesData.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {});

            // Fusionner les données
            const enrichedRequests = requestsData.map(req => ({
              ...req,
              user: profilesMap[req.user_id] || null
            }));
            
            setRequests(enrichedRequests);
            console.log("Enriched Data:", enrichedRequests);
            
            // Notify parent about count
            if (onCountChange) {
              onCountChange(enrichedRequests.length);
            }
            return;
          }
        }
      }
      
      setRequests(requestsData || []);
      // Notify parent about count (if no enriched data)
      if (onCountChange) {
        onCountChange(requestsData?.length || 0);
      }

    } catch (error) {
      console.error('Error in fetchRequests:', error);
      toast({ 
        title: 'Erreur', 
        description: 'Impossible de charger les demandes de réactivation. ' + error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  }, [toast, statusFilter, onCountChange]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    
    setActionLoading(true);
    console.log(`Processing action ${actionType} for request ${selectedRequest.id}`);

    try {
      if (actionType === 'approve') {
        // 1. Réactiver l'utilisateur
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_active: true })
          .eq('id', selectedRequest.user_id);
        
        if (profileError) throw profileError;

        // 2. Mettre à jour la demande
        const { error: reqError } = await supabase
          .from('reactivation_requests')
          .update({ 
            status: 'approved', 
            reviewed_by: currentUser?.id,
            reviewed_at: new Date().toISOString() 
          })
          .eq('id', selectedRequest.id);
          
        if (reqError) throw reqError;

        // 3. Notification
        await supabase.from('notifications').insert({
          user_id: selectedRequest.user_id,
          title: 'Compte réactivé ✅',
          message: 'Votre demande de réactivation a été approuvée. Bon retour parmi nous !',
          type: 'system',
          is_global: false
        });

        toast({ title: 'Succès', description: 'Utilisateur réactivé et notifié.' });

      } else {
        // Rejeter
        const { error: reqError } = await supabase
          .from('reactivation_requests')
          .update({ 
            status: 'rejected', 
            reviewed_by: currentUser?.id,
            reviewed_at: new Date().toISOString() 
          })
          .eq('id', selectedRequest.id);
          
        if (reqError) throw reqError;

        await supabase.from('notifications').insert({
          user_id: selectedRequest.user_id,
          title: 'Demande refusée ❌',
          message: 'Votre demande de réactivation a été refusée après examen.',
          type: 'system',
          is_global: false
        });

        toast({ title: 'Refusé', description: 'La demande a été rejetée.' });
      }

      fetchRequests();
      setSelectedRequest(null);
      setActionType(null);
    } catch (error) {
      console.error("Action error:", error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>;
      case 'approved': return <Badge variant="success" className="bg-green-100 text-green-800 border-green-200">Approuvée</Badge>;
      case 'rejected': return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Rejetée</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">Demandes de Réactivation</h3>
            <Badge variant="secondary" className="ml-2">{requests.length}</Badge>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvées</SelectItem>
                    <SelectItem value="rejected">Rejetées</SelectItem>
                    <SelectItem value="all">Tout l'historique</SelectItem>
                </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={fetchRequests} disabled={loading} title="Actualiser">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Raison / Message</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    Chargement des demandes...
                  </div>
              </TableCell></TableRow>
            ) : requests.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <CheckCircle className="h-8 w-8 mb-2 text-muted-foreground/50" />
                    Aucune demande {statusFilter !== 'all' ? statusFilter === 'pending' ? 'en attente' : statusFilter : ''} trouvée.
                  </div>
              </TableCell></TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {req.created_at ? format(new Date(req.created_at), 'dd MMM yyyy HH:mm', { locale: fr }) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={req.user?.avatar_url} />
                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium text-sm">{req.user?.full_name || 'Utilisateur inconnu'}</div>
                            <div className="text-xs text-muted-foreground">{req.user?.email || 'Email masqué'}</div>
                            <div className="flex gap-1 mt-1">
                                <Badge variant={req.user?.is_active ? 'success' : 'destructive'} className="text-[10px] h-4 px-1 py-0 font-normal">
                                    {req.user?.is_active ? 'Compte Actif' : 'Compte Inactif'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px]">
                        <div className="text-sm italic text-foreground/90 break-words bg-muted/30 p-2 rounded border border-border/50">
                            "{req.request_message || "Aucun message fourni"}"
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{req.user?.country || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">{req.user?.city || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell className="text-right">
                    {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-green-200 hover:bg-green-50 hover:text-green-700 text-green-600 h-8"
                                onClick={() => { setSelectedRequest(req); setActionType('approve'); }}
                            >
                                <CheckCircle className="h-4 w-4 mr-1" /> Approuver
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-red-200 hover:bg-red-50 hover:text-red-700 text-red-600 h-8"
                                onClick={() => { setSelectedRequest(req); setActionType('reject'); }}
                            >
                                <XCircle className="h-4 w-4 mr-1" /> Refuser
                            </Button>
                        </div>
                    )}
                    {req.status !== 'pending' && (
                        <span className="text-xs text-muted-foreground">
                            Traité le {req.reviewed_at ? format(new Date(req.reviewed_at), 'dd/MM/yyyy') : '-'}
                        </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                {actionType === 'approve' ? <CheckCircle className="text-green-600" /> : <AlertCircle className="text-red-600" />}
                {actionType === 'approve' ? 'Confirmer la réactivation' : 'Refuser la demande'}
            </AlertDialogTitle>
            <AlertDialogDescription>
                {actionType === 'approve' 
                    ? `Êtes-vous sûr de vouloir réactiver le compte de ${selectedRequest?.user?.full_name} ? L'utilisateur recevra une notification et pourra se reconnecter immédiatement.`
                    : `Êtes-vous sûr de vouloir rejeter cette demande ? L'utilisateur ${selectedRequest?.user?.full_name} restera bloqué.`
                }
            </AlertDialogDescription>
            {selectedRequest && (
                <div className="mt-4 p-3 bg-muted rounded-md border text-sm">
                    <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Rappel du motif :</p>
                    <p className="italic">"{selectedRequest.request_message}"</p>
                </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleAction} 
                className={actionType === 'approve' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                disabled={actionLoading}
            >
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {actionType === 'approve' ? 'Réactiver le compte' : 'Rejeter la demande'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserReactivationsTab;