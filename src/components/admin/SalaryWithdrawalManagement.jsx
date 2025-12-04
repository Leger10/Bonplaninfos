import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, Check, X, Eye, Copy, Wallet, History, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SalaryWithdrawalManagement = () => {
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des Retraits Salaires</h2>
          <p className="text-muted-foreground">Gérez les demandes de retrait des administrateurs et la configuration.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Demandes en cours</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="salaries">Salaires Admins</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <RequestsTable status="pending" />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <RequestsTable status="history" />
        </TabsContent>

        <TabsContent value="salaries" className="space-y-4">
          <AdminSalaryListTab />
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <ConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const RequestsTable = ({ status }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [paymentInfos, setPaymentInfos] = useState({});

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_withdrawal_requests')
        .select('*, admin:admin_id(full_name, email, phone)')
        .order('requested_at', { ascending: false });

      if (status === 'pending') {
        query = query.eq('status', 'pending');
      } else {
        query = query.neq('status', 'pending');
      }

      const { data, error } = await query;
      if (error) {
        console.error("Erreur chargement demandes:", error);
        toast({ 
          title: "Erreur chargement", 
          description: error.message, 
          variant: "destructive" 
        });
      } else {
        setRequests(data || []);
        
        // Récupérer les infos de paiement pour chaque admin
        if (data && data.length > 0) {
          const adminIds = [...new Set(data.map(r => r.admin_id))];
          
          // D'abord, essayez de récupérer depuis admin_payment_info
          let paymentMap = {};
          const { data: paymentData, error: paymentError } = await supabase
            .from('admin_payment_info')
            .select('*')
            .in('admin_id', adminIds);
          
          if (!paymentError && paymentData) {
            paymentData.forEach(p => {
              paymentMap[p.admin_id] = p;
            });
          }
          
          // Si pas d'infos dans admin_payment_info, utilisez les infos de base des admins
          if (Object.keys(paymentMap).length === 0) {
            const { data: adminsData, error: adminsError } = await supabase
              .from('profiles')
              .select('id, phone')
              .in('id', adminIds);
            
            if (!adminsError && adminsData) {
              adminsData.forEach(admin => {
                if (admin.phone) {
                  paymentMap[admin.id] = {
                    orange_money: admin.phone,
                    mtn_money: admin.phone,
                    moov_money: admin.phone,
                    phone: admin.phone
                  };
                }
              });
            }
          }
          
          setPaymentInfos(paymentMap);
          console.log("Payment infos loaded:", paymentMap);
        }
      }
    } catch (err) {
      console.error("Erreur générale:", err);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du chargement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [status]);

  const copyToClipboard = (text) => {
    if (!text || text === 'Non spécifié') return;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: "L'information a été copiée dans le presse-papier",
    });
  };

  const handleAction = async (id, action, adminId, amount) => {
    try {
      let balanceDeducted = false;
      
      if (action === "approved") {
        try {
          // 1. Récupérer le solde actuel
          const { data: balanceData, error: balanceError } = await supabase
            .from('admin_balances')
            .select('available_balance, total_withdrawn')
            .eq('admin_id', adminId)
            .single();
          
          if (balanceError && balanceError.code !== 'PGRST116') throw balanceError;
          
          let currentBalance = 0;
          let currentWithdrawn = 0;
          
          if (balanceData) {
            currentBalance = balanceData.available_balance || 0;
            currentWithdrawn = balanceData.total_withdrawn || 0;
          }
          
          // 2. Vérifier le solde
          if (currentBalance < amount) {
            throw new Error(`Solde insuffisant. Disponible: ${currentBalance} FCFA, Demande: ${amount} FCFA`);
          }
          
          // 3. Calculer les nouveaux montants
          const newBalance = currentBalance - amount;
          const newWithdrawn = currentWithdrawn + amount;
          
          // 4. Mettre à jour ou insérer le solde
          if (balanceData) {
            // Mettre à jour l'existant
            const { error: updateError } = await supabase
              .from('admin_balances')
              .update({ 
                available_balance: newBalance,
                total_withdrawn: newWithdrawn,
                updated_at: new Date().toISOString()
              })
              .eq('admin_id', adminId);
            
            if (updateError) throw updateError;
          } else {
            // Créer un nouvel enregistrement
            const { error: insertError } = await supabase
              .from('admin_balances')
              .insert({
                admin_id: adminId,
                available_balance: newBalance,
                total_commissions: 0,
                total_withdrawn: newWithdrawn,
                updated_at: new Date().toISOString()
              });
            
            if (insertError) throw insertError;
          }
          
          // 5. Enregistrer la transaction
          const { error: transactionError } = await supabase
            .from('admin_balance_transactions')
            .insert({
              admin_id: adminId,
              amount: -amount,
              balance_before: currentBalance,
              balance_after: newBalance,
              transaction_type: 'withdrawal',
              description: `Déduction pour retrait de salaire de ${amount} FCFA`,
              created_at: new Date().toISOString()
            });
          
          if (transactionError) throw transactionError;
          
          balanceDeducted = true;
          
        } catch (deductError) {
          console.error("Erreur déduction solde:", deductError);
          throw deductError;
        }
      }

      // Mettre à jour le statut de la demande
      const { error } = await supabase
        .from("admin_withdrawal_requests")
        .update({
          status: action,
          processed_at: new Date().toISOString(),
          balance_deducted: balanceDeducted
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: action === "approved"
          ? `Demande approuvée et ${amount.toLocaleString()} FCFA déduit du solde admin.`
          : "Demande rejetée."
      });

      fetchRequests();

    } catch (error) {
      console.error("Erreur lors du traitement:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors du traitement",
        variant: "destructive"
      });
    }
  };

  const showPaymentDetails = (request) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  const PaymentDetailsDialog = () => {
    if (!selectedRequest) return null;

    const paymentInfo = paymentInfos[selectedRequest.admin_id] || {};
    const method = selectedRequest.method?.toLowerCase() || '';
    const adminPhone = selectedRequest.admin?.phone || '';
    
    const getPaymentInfo = () => {
      if (method.includes('orange')) {
        return {
          type: 'Mobile Money',
          number: paymentInfo.orange_money || adminPhone || 'Non spécifié',
          provider: 'Orange Money',
        };
      } else if (method.includes('mtn')) {
        return {
          type: 'Mobile Money',
          number: paymentInfo.mtn_money || adminPhone || 'Non spécifié',
          provider: 'MTN Mobile Money',
        };
      } else if (method.includes('moov')) {
        return {
          type: 'Mobile Money',
          number: paymentInfo.moov_money || adminPhone || 'Non spécifié',
          provider: 'Moov Money',
        };
      } else if (method.includes('bank') || method.includes('iban')) {
        return {
          type: 'Virement Bancaire',
          iban: paymentInfo.bank_iban || 'Non spécifié',
          bankName: paymentInfo.bank_name || 'Non spécifié',
          accountName: paymentInfo.bank_account_name || selectedRequest.admin?.full_name || 'Non spécifié',
        };
      }
      
      return {
        type: 'Autre méthode',
        info: `Méthode: ${selectedRequest.method || 'Non spécifiée'}`,
        contact: `Contact: ${selectedRequest.admin?.email || 'Email non disponible'}`
      };
    };

    const paymentInfoData = getPaymentInfo();

    return (
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de paiement</DialogTitle>
            <DialogDescription>
              Informations pour effectuer le dépôt à {selectedRequest.admin?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Montant à verser</h4>
                <Badge className="text-lg bg-green-600">
                  {selectedRequest.amount_fcfa?.toLocaleString()} FCFA
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Admin</p>
                  <p className="font-medium">{selectedRequest.admin?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedRequest.admin?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Méthode</p>
                  <p className="font-medium capitalize">{selectedRequest.method}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Informations de paiement</h4>
              
              {paymentInfoData.type === 'Mobile Money' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Opérateur</p>
                      <p className="font-medium">{paymentInfoData.provider}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Numéro de téléphone</p>
                      <p className="font-medium text-lg">{paymentInfoData.number}</p>
                    </div>
                    {paymentInfoData.number !== 'Non spécifié' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(paymentInfoData.number)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2">
                    Effectuez le transfert à ce numéro, puis confirmez le paiement.
                  </p>
                </div>
              ) : paymentInfoData.type === 'Virement Bancaire' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">Banque</p>
                      <p className="font-medium">{paymentInfoData.bankName}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">Titulaire</p>
                      <p className="font-medium">{paymentInfoData.accountName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">IBAN / Numéro de compte</p>
                      <p className="font-medium text-lg font-mono break-all">{paymentInfoData.iban}</p>
                    </div>
                    {paymentInfoData.iban !== 'Non spécifié' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(paymentInfoData.iban)}
                        className="h-8 w-8 p-0 ml-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2">
                    Effectuez le virement bancaire, puis confirmez le paiement.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-yellow-800">
                    <strong>{paymentInfoData.info}</strong><br/>
                    {paymentInfoData.contact}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Fermer
            </Button>
            <Button 
              onClick={() => {
                handleAction(selectedRequest.id, 'approved', selectedRequest.admin_id, selectedRequest.amount_fcfa);
                setShowDetails(false);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Approuver et confirmer le paiement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const getQuickInfo = (request) => {
    const paymentInfo = paymentInfos[request.admin_id] || {};
    const method = request.method?.toLowerCase() || '';
    const adminPhone = request.admin?.phone || '';
    
    if (method.includes('orange')) {
      const number = paymentInfo.orange_money || adminPhone;
      return number ? `Orange: ${number}` : 'Numéro non fourni';
    } else if (method.includes('mtn')) {
      const number = paymentInfo.mtn_money || adminPhone;
      return number ? `MTN: ${number}` : 'Numéro non fourni';
    } else if (method.includes('moov')) {
      const number = paymentInfo.moov_money || adminPhone;
      return number ? `Moov: ${number}` : 'Numéro non fourni';
    } else if (method.includes('bank') || method.includes('iban')) {
      const iban = paymentInfo.bank_iban;
      return iban ? `IBAN: ${iban.substring(0, 12)}...` : 'IBAN non fourni';
    }
    return 'Détails manquants';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{status === 'pending' ? 'Demandes en attente' : 'Historique des traitements'}</CardTitle>
          {status === 'pending' && (
            <CardDescription>
              Cliquez sur l'icône 👁️ pour voir les détails de paiement avant d'approuver
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Admin</TableHead>
                  <TableHead className="min-w-[100px]">Montant</TableHead>
                  <TableHead className="min-w-[120px]">Méthode</TableHead>
                  <TableHead className="min-w-[180px]">Détails paiement</TableHead>
                  <TableHead className="min-w-[140px]">Date</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  {status === 'pending' && <TableHead className="min-w-[150px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={status === 'pending' ? 7 : 6} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      <p className="mt-2 text-sm text-muted-foreground">Chargement des demandes...</p>
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={status === 'pending' ? 7 : 6} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Aucune demande {status === 'pending' ? 'en attente' : 'dans l\'historique'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">{req.admin?.full_name || 'Admin'}</div>
                        <div className="text-xs text-muted-foreground">{req.admin?.email || 'Email non disponible'}</div>
                        <div className="text-xs text-muted-foreground">
                          Tél: {req.admin?.phone || 'Non renseigné'}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {req.amount_fcfa?.toLocaleString()} FCFA
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {req.method || 'Non spécifié'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate max-w-[150px]">
                            {getQuickInfo(req)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 flex-shrink-0"
                            onClick={() => showPaymentDetails(req)}
                            title="Voir les détails de paiement"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(req.requested_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            req.status === 'pending' ? 'secondary' : 
                            req.status === 'approved' ? 'success' : 
                            'destructive'
                          }
                        >
                          {req.status === 'pending' ? 'En attente' : 
                           req.status === 'approved' ? 'Approuvé' : 
                           'Rejeté'}
                        </Badge>
                      </TableCell>
                      {status === 'pending' && (
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Button 
                              size="sm" 
                              variant="default"
                              className="bg-green-600 hover:bg-green-700 w-full"
                              onClick={() => showPaymentDetails(req)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Voir & Approuver
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="w-full"
                              onClick={() => {
                                if (confirm(`Voulez-vous vraiment rejeter cette demande de ${req.amount_fcfa?.toLocaleString()} FCFA ?`)) {
                                  handleAction(req.id, 'rejected', req.admin_id, req.amount_fcfa);
                                }
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {showDetails && <PaymentDetailsDialog />}
    </>
  );
};

const AdminSalaryListTab = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grandTotalWithdrawals, setGrandTotalWithdrawals] = useState(0);
  const [selectedAdminHistory, setSelectedAdminHistory] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all admins/secretaries
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type, country')
        .in('user_type', ['admin', 'secretary']);

      if (profilesError) throw profilesError;

      // 2. Fetch salary history (earnings)
      const { data: earnings, error: earningsError } = await supabase
        .from('paiements_admin')
        .select('admin_id, montant_a_payer, statut');

      if (earningsError) throw earningsError;

      // 3. Fetch withdrawals
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('admin_withdrawal_requests')
        .select('admin_id, amount_fcfa, status, requested_at');

      if (withdrawalsError) throw withdrawalsError;

      // Process data
      let totalGlobalWithdrawals = 0;

      const processedAdmins = profiles.map(admin => {
        // Calculate Total Salary Earned (Validated)
        const adminEarnings = earnings.filter(e => e.admin_id === admin.id);
        const totalEarned = adminEarnings.reduce((sum, e) => sum + (e.montant_a_payer || 0), 0);

        // Calculate Total Withdrawals (Approved/Paid)
        const adminWithdrawals = withdrawals.filter(w => w.admin_id === admin.id);
        const totalWithdrawn = adminWithdrawals
          .filter(w => w.status === 'approved' || w.status === 'paid')
          .reduce((sum, w) => sum + (w.amount_fcfa || 0), 0);

        totalGlobalWithdrawals += totalWithdrawn;

        // Pending Balance (Earned - Withdrawn)
        const balance = Math.max(0, totalEarned - totalWithdrawn);

        return {
          ...admin,
          totalEarned,
          totalWithdrawn,
          balance,
          withdrawalHistory: adminWithdrawals
        };
      });

      setAdmins(processedAdmins);
      setGrandTotalWithdrawals(totalGlobalWithdrawals);
      
      console.log("Admin list loaded: [count]", processedAdmins.length);
      console.log("Total admin withdrawals: [amount]", totalGlobalWithdrawals);

    } catch (error) {
      console.error("Error fetching admin salary list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openHistory = (admin) => {
    setSelectedAdminHistory(admin);
    setIsHistoryOpen(true);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Retraits Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{grandTotalWithdrawals.toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground mt-1">Tous administrateurs confondus</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Liste des Salaires Administrateurs
          </CardTitle>
          <CardDescription>Vue d'ensemble des gains et retraits par administrateur.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Administrateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Total Gagné (Cumulé)</TableHead>
                <TableHead className="text-right">Total Retiré</TableHead>
                <TableHead className="text-right">Solde Théorique</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="font-medium">{admin.full_name}</div>
                    <div className="text-xs text-muted-foreground">{admin.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{admin.user_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {admin.totalEarned.toLocaleString()} FCFA
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    {admin.totalWithdrawn.toLocaleString()} FCFA
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {admin.balance.toLocaleString()} FCFA
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openHistory(admin)}>
                      <History className="h-4 w-4 mr-2" /> Historique
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Historique des Retraits - {selectedAdminHistory?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedAdminHistory?.withdrawalHistory && selectedAdminHistory.withdrawalHistory.length > 0 ? (
                  selectedAdminHistory.withdrawalHistory.map((w, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{format(new Date(w.requested_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                      <TableCell className="font-medium">{w.amount_fcfa.toLocaleString()} FCFA</TableCell>
                      <TableCell>
                        <Badge variant={w.status === 'approved' ? 'success' : w.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {w.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Aucun retrait trouvé.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ConfigPanel = () => {
  const [config, setConfig] = useState({
    withdrawal_available_date: 5,
    min_withdrawal_amount: 1000,
    max_withdrawal_amount: 500000,
    withdrawal_methods: ['Orange Money', 'MTN Mobile Money', 'Moov Money', 'Bank Transfer']
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_withdrawal_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setConfig(data);
      }
    } catch(e) {
      console.error("Error loading config", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        withdrawal_available_date: parseInt(config.withdrawal_available_date),
        min_withdrawal_amount: parseInt(config.min_withdrawal_amount),
        max_withdrawal_amount: parseInt(config.max_withdrawal_amount),
        withdrawal_methods: config.withdrawal_methods
      };

      const { error } = await supabase
        .from('admin_withdrawal_config')
        .upsert(config.id ? { ...payload, id: config.id } : payload);

      if (error) throw error;
      toast({ title: "Configuration sauvegardée", description: "Les paramètres de retrait ont été mis à jour." });
      fetchConfig(); 
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres des Retraits</CardTitle>
        <CardDescription>Définissez les règles pour les demandes de retrait des administrateurs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Jour de disponibilité (du mois)</Label>
            <Input 
              type="number" 
              min="1" 
              max="28" 
              value={config.withdrawal_available_date} 
              onChange={e => setConfig({...config, withdrawal_available_date: e.target.value})} 
            />
            <p className="text-sm text-muted-foreground">Les retraits seront disponibles à partir de ce jour chaque mois.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Montant Minimum (FCFA)</Label>
              <Input 
                type="number" 
                value={config.min_withdrawal_amount} 
                onChange={e => setConfig({...config, min_withdrawal_amount: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Montant Maximum (FCFA)</Label>
              <Input 
                type="number" 
                value={config.max_withdrawal_amount} 
                onChange={e => setConfig({...config, max_withdrawal_amount: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Méthodes de retrait autorisées (séparées par des virgules)</Label>
            <Input 
              value={Array.isArray(config.withdrawal_methods) ? config.withdrawal_methods.join(', ') : config.withdrawal_methods} 
              onChange={e => setConfig({...config, withdrawal_methods: e.target.value.split(',').map(s => s.trim())})} 
            />
            <p className="text-sm text-muted-foreground">
              Ex: Orange Money, MTN Mobile Money, Moov Money, Bank Transfer
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" /> Enregistrer la configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalaryWithdrawalManagement;