import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/utils';
import { jsPDF } from 'jspdf';

const PartnerSalaryHistory = ({ userId, currentSalary }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('paiements_admin') // Using admin payments table which serves as partner salary log
          .select('*')
          .eq('admin_id', userId)
          .order('mois', { ascending: false });

        if (error) throw error;
        setHistory(data || []);
      } catch (err) {
        console.error("Error fetching salary history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  const downloadReceipt = (payment) => {
    const doc = new jsPDF();
    doc.text("REÇU DE PAIEMENT - PARTENAIRE BONPLANINFOS", 20, 20);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Période: ${new Date(payment.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`, 20, 40);
    doc.text(`Montant: ${formatCurrencySimple(payment.montant_a_payer)}`, 20, 50);
    doc.text(`Statut: ${payment.statut}`, 20, 60);
    doc.save(`Recu_Salaire_${payment.mois}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-emerald-800">Salaire en cours (Estimé)</p>
              <h2 className="text-3xl font-bold text-emerald-900">{formatCurrencySimple(currentSalary)}</h2>
              <p className="text-xs text-emerald-700 mt-1">Basé sur l'activité du mois courant</p>
            </div>
            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100">
              Voir détails
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des Paiements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mois</TableHead>
                <TableHead>CA Zone</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Montant Net</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Reçu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun historique disponible.</TableCell>
                </TableRow>
              ) : (
                history.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium capitalize">
                      {new Date(payment.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </TableCell>
                    <TableCell>{formatCurrencySimple(payment.ca_zone)}</TableCell>
                    <TableCell>{payment.taux_commission}%</TableCell>
                    <TableCell className="font-bold text-green-700">
                      {formatCurrencySimple(payment.montant_a_payer)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.statut === 'paye' ? 'success' : 'outline'}>
                        {payment.statut === 'paye' ? 'Payé' : 'En attente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.statut === 'paye' && (
                        <Button size="sm" variant="ghost" onClick={() => downloadReceipt(payment)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerSalaryHistory;