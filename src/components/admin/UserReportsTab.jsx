import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Archive, AlertTriangle, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const UserReportsTab = ({ onCountChange }) => {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Récupérer les rapports
      const { data: reportsData, error: reportsError } = await supabase
        .from('content_reports')
        .select(`
          *,
          reporter:reporter_id(full_name, email)
        `)
        .eq('target_type', 'user')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // 2. Récupérer manuellement les profils ciblés (car pas de FK stricte sur target_id pour le polymorphisme)
      const targetIds = reportsData.map(r => r.target_id).filter(Boolean);
      
      let reportsWithTargets = reportsData;

      if (targetIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, is_active, avatar_url')
          .in('id', targetIds);
          
        if (profilesError) throw profilesError;

        // Créer une map pour un accès rapide
        const profilesMap = profilesData.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});

        // Fusionner les données
        reportsWithTargets = reportsData.map(report => ({
          ...report,
          target: profilesMap[report.target_id] || null
        }));
      }

      setReports(reportsWithTargets || []);
      
      // Notify parent about count
      if (onCountChange) {
        onCountChange(reportsWithTargets?.length || 0);
      }

    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les signalements.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, onCountChange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAction = async (reportId, newStatus) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({ status: newStatus, reviewed_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) throw error;

      toast({ 
        title: 'Statut mis à jour', 
        description: `Le signalement a été marqué comme ${newStatus === 'resolved' ? 'approuvé' : newStatus === 'rejected' ? 'rejeté' : 'archivé'}.` 
      });
      
      fetchReports();
      setSelectedReport(null);
    } catch (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>;
      case 'resolved': return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">Approuvé</Badge>;
      case 'rejected': return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">Rejeté</Badge>;
      case 'archived': return <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">Archivé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReasonLabel = (reason) => {
    const reasons = {
      spam: 'Spam / Faux profil',
      harassment: 'Harcèlement',
      inappropriate: 'Contenu inapproprié',
      fraud: 'Fraude / Arnaque',
      other: 'Autre'
    };
    return reasons[reason] || reason;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          Utilisateurs Signalés
          <Badge variant="secondary">{reports.length}</Badge>
        </h3>
        <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualiser
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Utilisateur Signalé</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Signalé par</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div></TableCell></TableRow>
            ) : reports.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun signalement trouvé.</TableCell></TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{report.target?.full_name || 'Utilisateur inconnu'}</div>
                    <div className="text-xs text-muted-foreground">{report.target?.email}</div>
                    {!report.target?.is_active && report.target && <Badge variant="destructive" className="mt-1 text-[10px] px-1 py-0 h-4">Désactivé</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{getReasonLabel(report.reason)}</div>
                    {report.content && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={report.content}>
                        {report.content}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{report.reporter?.full_name || 'N/A'}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedReport(report)}>
                      <Eye className="h-4 w-4 mr-2" /> Détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails du signalement</DialogTitle>
            <DialogDescription>
              Examiner le signalement avant de prendre une décision.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Utilisateur visé</span>
                  <div className="font-medium">{selectedReport.target?.full_name || 'Inconnu'}</div>
                  <div className="text-sm text-muted-foreground">{selectedReport.target?.email}</div>
                  <div className="pt-1">
                    {selectedReport.target && (
                        <Badge variant={selectedReport.target.is_active ? 'outline' : 'destructive'} className={selectedReport.target.is_active ? "bg-green-100 text-green-800" : ""}>
                        {selectedReport.target.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Signalé par</span>
                  <div className="font-medium">{selectedReport.reporter?.full_name || 'Inconnu'}</div>
                  <div className="text-sm text-muted-foreground">{selectedReport.reporter?.email}</div>
                </div>
              </div>

              <div className="space-y-2 bg-muted/50 p-3 rounded-md border">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="font-semibold">{getReasonLabel(selectedReport.reason)}</span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedReport.content || "Aucun détail supplémentaire fourni."}
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                Signalé le {format(new Date(selectedReport.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            {selectedReport?.status === 'pending' ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => handleAction(selectedReport.id, 'archived')}
                  disabled={actionLoading}
                >
                  <Archive className="h-4 w-4 mr-2" /> Archiver
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleAction(selectedReport.id, 'rejected')}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Rejeter
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleAction(selectedReport.id, 'resolved')}
                  disabled={actionLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Approuver
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setSelectedReport(null)}>Fermer</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserReportsTab;