import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Search, Download, Check, Info, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { exportToExcel } from '@/lib/exportToExcel';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const AdminPaymentsTab = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('paiements_admin')
                .select(`
                    id,
                    mois,
                    ca_zone,
                    taux_commission,
                    score,
                    montant_a_payer,
                    statut,
                    paye_le,
                    admin_id,
                    licence:admin_id (admin:admin_id(full_name, email))
                `)
                .order('mois', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('statut', statusFilter);
            }
             
            const { data, error } = await query;
            
            if (error) throw error;
            
            let filteredData = data || [];
            if (searchTerm) {
                filteredData = filteredData.filter(p => 
                    p.licence?.admin?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.licence?.admin?.email?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            setPayments(filteredData);
        } catch (error) {
            console.error('Error fetching admin payments:', error);
            toast({ title: 'Erreur', description: 'Impossible de charger les paiements des admins.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleMarkAsPaid = async (paymentId) => {
        try {
            const { error } = await supabase
                .from('paiements_admin')
                .update({ statut: 'paye', paye_le: new Date().toISOString() })
                .eq('id', paymentId);
            if (error) throw error;
            toast({ title: 'Succès', description: 'Paiement marqué comme payé.' });
            fetchPayments();
        } catch (error) {
            toast({ title: 'Erreur', description: 'La mise à jour a échoué.', variant: 'destructive' });
        }
    };
    
    const handleGeneratePayments = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.rpc('generer_paiements_mensuels');
            if (error) {
              console.error(error);
              throw error;
            }
            toast({ title: 'Succès', description: 'Les paiements pour le mois précédent ont été calculés.' });
            fetchPayments();
        } catch (error) {
            toast({ title: 'Erreur', description: `Le calcul des paiements a échoué: ${error.message}`, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!payments || payments.length === 0) {
            toast({ title: 'Aucune donnée à exporter.', variant: 'destructive'});
            return;
        }

        const dataToExport = payments.map(p => ({
            'Admin': p.licence?.admin?.full_name,
            'Mois': format(new Date(p.mois), 'MMMM yyyy', { locale: fr }),
            'CA Zone (FCFA)': p.ca_zone,
            'Taux Commission (%)': p.taux_commission,
            'Score': p.score,
            'Montant à Payer (FCFA)': p.montant_a_payer,
            'Statut': p.statut,
            'Date de Paiement': p.paye_le ? format(new Date(p.paye_le), 'dd/MM/yyyy') : 'N/A'
        }));

        exportToExcel({
            data: dataToExport,
            headers: Object.keys(dataToExport[0]).map(key => ({ label: key, key })),
            sheetName: 'Paiements_Admins',
            fileName: `paiements_admins_${new Date().toISOString().split('T')[0]}.xlsx`
        });
    };

    return (
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <CardTitle className="text-white">Salaires des Administrateurs</CardTitle>
                    <CardDescription>Suivez et gérez les commissions mensuelles des admins.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleGeneratePayments} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Calculer Salaires (Mois Préc.)
                    </Button>
                     <Button onClick={handleExport} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Exporter
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex space-x-4 mb-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par nom d'admin..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrer par statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous</SelectItem>
                            <SelectItem value="en_attente">En attente</SelectItem>
                            <SelectItem value="paye">Payé</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Admin</TableHead>
                                    <TableHead>Mois</TableHead>
                                    <TableHead>Détails Calcul</TableHead>
                                    <TableHead>Montant à Payer</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>
                                            <p className="font-semibold">{payment.licence?.admin?.full_name || 'Admin Inconnu'}</p>
                                            <p className="text-xs text-muted-foreground">{payment.licence?.admin?.email}</p>
                                        </TableCell>
                                        <TableCell>{format(new Date(payment.mois), 'MMMM yyyy', { locale: fr })}</TableCell>
                                        <TableCell>
                                            <Popover>
                                              <PopoverTrigger asChild><Button variant="ghost" size="sm"><Info className="w-4 h-4" /></Button></PopoverTrigger>
                                              <PopoverContent className="w-80">
                                                <div className="grid gap-4">
                                                  <h4 className="font-medium leading-none">Détails du Calcul</h4>
                                                  <div className="text-sm">
                                                    <p>CA Zone: <strong>{payment.ca_zone?.toLocaleString('fr-FR')} FCFA</strong></p>
                                                    <p>Taux Commission: <strong>{payment.taux_commission}%</strong></p>
                                                    <p>Score: <strong>{payment.score}</strong></p>
                                                    <hr className="my-2"/>
                                                    <p className="text-xs italic">Formule: CA × Taux × Score</p>
                                                  </div>
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                        </TableCell>
                                        <TableCell className="font-bold">{payment.montant_a_payer.toLocaleString('fr-FR')} FCFA</TableCell>
                                        <TableCell>
                                            <Badge variant={payment.statut === 'paye' ? 'success' : 'warning'}>
                                                {payment.statut === 'paye' ? 'Payé' : 'En attente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {payment.statut === 'en_attente' && (
                                                <Button size="sm" onClick={() => handleMarkAsPaid(payment.id)}>
                                                    <Check className="w-4 h-4 mr-2" /> Marquer Payé
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         {payments.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto mb-2" />
                                <p>Aucun paiement trouvé pour les filtres actuels.</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AdminPaymentsTab;