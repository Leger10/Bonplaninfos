import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, Download, FileText, CalendarClock, AlertTriangle, TrendingUp, Lock, Info } from 'lucide-react';
import { format, setDate } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { jsPDF } from 'jspdf';
import { toast } from '@/components/ui/use-toast';
import AdminSalaryWithdrawalModal from './AdminSalaryWithdrawalModal';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const AdminSalaryDashboard = () => {
    const { user } = useAuth();
    const { userProfile } = useData();
    const [loading, setLoading] = useState(true);
    const [approvedWithdrawals, setApprovedWithdrawals] = useState([]);
    const [withdrawalHistory, setWithdrawalHistory] = useState([]);
    const [generatingPdf, setGeneratingPdf] = useState(null);
    
    // Balance States
    const [validatedBalance, setValidatedBalance] = useState(0);
    const [estimatedSalary, setEstimatedSalary] = useState(0);
    const [totalAvailable, setTotalAvailable] = useState(0);
    const [pendingAmount, setPendingAmount] = useState(0);
    
    const [personalScore, setPersonalScore] = useState(0);
    const [withdrawalConfig, setWithdrawalConfig] = useState({ withdrawal_available_date: 5 });
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [canWithdraw, setCanWithdraw] = useState(false);
    const [nextWithdrawalDate, setNextWithdrawalDate] = useState(null);
    const [adminPaymentInfo, setAdminPaymentInfo] = useState(null);

    // Function to refresh balance with robust error handling and logging
    const fetchData = useCallback(async () => {
        if (!user) return;
        console.log("Refreshing balance...");
        setLoading(true);
        try {
            // 1. Fetch Withdrawal Config
            const { data: configData } = await supabase
                .from('admin_withdrawal_config')
                .select('*')
                .limit(1)
                .maybeSingle();
            
            const config = configData || { withdrawal_available_date: 5 };
            setWithdrawalConfig(config);

            // 2. Calculate Dates & Availability
            const today = new Date();
            const currentDay = today.getDate();
            const availableDay = config.withdrawal_available_date;
            
            let nextDate;
            if (currentDay >= availableDay) {
                nextDate = today;
            } else {
                nextDate = setDate(today, availableDay);
            }
            setNextWithdrawalDate(nextDate);

            // 3. Fetch Validated Balance (Previous Months)
            const { data: balanceData } = await supabase
                .from('admin_balances')
                .select('available_balance')
                .eq('admin_id', user.id)
                .maybeSingle();
            
            const currentValidatedBalance = balanceData?.available_balance || 0;
            setValidatedBalance(currentValidatedBalance);

            // 4. Fetch Estimated Salary (Current Month)
            const { data: salaryStats, error: statsError } = await supabase
                .rpc('get_admin_salary_stats', { p_admin_id: user.id, p_month: new Date().toISOString() });
            
            let currentEstimation = 0;
            if (!statsError && salaryStats) {
                currentEstimation = salaryStats.total_salary_fcfa || 0;
                setEstimatedSalary(currentEstimation);
                setPersonalScore(salaryStats.personal_score || 0);
            }

            // 5. Fetch admin payment info
            const { data: paymentInfo } = await supabase
                .from('admin_payment_info')
                .select('*')
                .eq('admin_id', user.id)
                .maybeSingle();
            
            setAdminPaymentInfo(paymentInfo);

            // 6. Fetch Withdrawal History & Calculate Pending
            const { data: historyData, error: historyError } = await supabase
                .from('admin_withdrawal_requests')
                .select('*')
                .eq('admin_id', user.id)
                .order('requested_at', { ascending: false });
            
            if (historyError) throw historyError;
            
            const requests = historyData || [];
            setWithdrawalHistory(requests);
            setApprovedWithdrawals(requests.filter(w => w.status === 'approved'));

            // Calculate pending total
            const totalPending = requests
                .filter(w => w.status === 'pending')
                .reduce((sum, w) => sum + (w.amount_fcfa || 0), 0);
            
            setPendingAmount(totalPending);

            // 7. Calculate Real Total Available
            const calculatedTotal = Math.max(0, (currentValidatedBalance + currentEstimation) - totalPending);
            setTotalAvailable(calculatedTotal);

            // 8. Determine if withdrawal is possible
            const isDateValid = currentDay >= availableDay;
            const hasBalance = calculatedTotal > 0;
            const hasPendingRequest = requests.some(w => w.status === 'pending');
            
            setCanWithdraw(isDateValid && hasBalance && !hasPendingRequest);

        } catch (error) {
            console.error("Error fetching salary data:", error);
            toast({ 
                title: "Erreur", 
                description: "Impossible de charger les données financières.", 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Real-time subscriptions
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('admin-salary-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'admin_withdrawal_requests',
                    filter: `admin_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Real-time: Withdrawal request update detected', payload);
                    fetchData();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'admin_balances',
                    filter: `admin_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Real-time: Balance update detected', payload);
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Helper function to get payment number based on method
    const getPaymentNumber = (method) => {
        if (!method || !adminPaymentInfo) return null;
        
        const methodLower = method.toLowerCase();
        
        if (methodLower.includes('orange')) {
            return adminPaymentInfo.orange_money;
        } else if (methodLower.includes('mtn')) {
            return adminPaymentInfo.mtn_money;
        } else if (methodLower.includes('moov')) {
            return adminPaymentInfo.moov_money;
        } else if (methodLower.includes('wave')) {
            return adminPaymentInfo.wave_number;
        } else if (methodLower.includes('bank') && adminPaymentInfo.bank_iban) {
            return adminPaymentInfo.bank_iban;
        }
        
        return null;
    };

    // Helper function to format phone number
    const formatPhoneNumber = (phone) => {
        if (!phone) return '';
        // Format: +237 6XX XX XX XX
        return `+237 ${phone.substring(0, 2)} ${phone.substring(2, 4)} ${phone.substring(4, 6)} ${phone.substring(6, 8)}`;
    };

    const generateReceipt = async (withdrawal) => {
        if (!withdrawal || !userProfile) return;
        setGeneratingPdf(withdrawal.id);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            
            // Header avec logo et information
            doc.setFillColor(30, 41, 59); // Bleu foncé
            doc.rect(0, 0, pageWidth, 50, 'F');
            
            // Logo et titre
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("BONPLANINFOS", margin, 30);
            doc.setFontSize(14);
            doc.setFont("helvetica", "normal");
            doc.text("REÇU DE PAIEMENT CERTIFIÉ", pageWidth - margin, 30, { align: "right" });
            doc.setFontSize(10);
            doc.text("Document officiel de transaction", pageWidth - margin, 37, { align: "right" });

            // Ligne de séparation
            doc.setDrawColor(79, 70, 229);
            doc.setLineWidth(1);
            doc.line(margin, 55, pageWidth - margin, 55);

            // Informations générales du reçu
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text(`Date d'émission: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin, 65);
            doc.text(`N° de référence: ${withdrawal.id.substring(0, 8).toUpperCase()}`, margin, 72);
            doc.text(`Type de transaction: Retrait Salaire Administrateur`, pageWidth - margin, 65, { align: "right" });
            doc.text(`Statut: PAYÉ`, pageWidth - margin, 72, { align: "right" });

            // Section Bénéficiaire - informations complètes
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text("INFORMATIONS DU BÉNÉFICIAIRE", pageWidth / 2, 90, { align: "center" });
            
            // Cadre pour les informations
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(margin, 95, pageWidth - 2 * margin, 70);
            
            // Colonne gauche
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Nom complet:", margin + 5, 108);
            doc.setFont("helvetica", "normal");
            doc.text(userProfile?.full_name || user?.email || 'Non spécifié', margin + 40, 108);
            
            doc.setFont("helvetica", "bold");
            doc.text("Email:", margin + 5, 116);
            doc.setFont("helvetica", "normal");
            doc.text(userProfile?.email || 'Non spécifié', margin + 40, 116);
            
            doc.setFont("helvetica", "bold");
            doc.text("Téléphone:", margin + 5, 124);
            doc.setFont("helvetica", "normal");
            doc.text(formatPhoneNumber(userProfile?.phone) || userProfile?.phone || 'Non spécifié', margin + 40, 124);
            
            doc.setFont("helvetica", "bold");
            doc.text("Ville:", margin + 5, 132);
            doc.setFont("helvetica", "normal");
            doc.text(userProfile?.city || 'Non spécifiée', margin + 40, 132);
            
            doc.setFont("helvetica", "bold");
            doc.text("Pays:", margin + 5, 140);
            doc.setFont("helvetica", "normal");
            doc.text(userProfile?.country || 'Non spécifié', margin + 40, 140);
            
            // Colonne droite
            doc.setFont("helvetica", "bold");
            doc.text("Type de licence:", pageWidth / 2, 108);
            doc.setFont("helvetica", "normal");
            doc.text(userProfile?.license_type || 'Administrateur', pageWidth / 2 + 45, 108);
            
            doc.setFont("helvetica", "bold");
            doc.text("N° de licence:", pageWidth / 2, 116);
            doc.setFont("helvetica", "normal");
            doc.text(userProfile?.license_number || 'N/A', pageWidth / 2 + 45, 116);
            
            doc.setFont("helvetica", "bold");
            doc.text("IBAN:", pageWidth / 2, 124);
            doc.setFont("helvetica", "normal");
            doc.text(adminPaymentInfo?.bank_iban || 'Non spécifié', pageWidth / 2 + 45, 124);
            
            doc.setFont("helvetica", "bold");
            doc.text("Méthode retrait:", pageWidth / 2, 132);
            doc.setFont("helvetica", "normal");
            doc.text(withdrawal.method || 'Non spécifiée', pageWidth / 2 + 45, 132);
            
            doc.setFont("helvetica", "bold");
            doc.text("ID Admin:", pageWidth / 2, 140);
            doc.setFont("helvetica", "normal");
            doc.text(user?.id?.substring(0, 8) || 'N/A', pageWidth / 2 + 45, 140);

            // Section Montant - bien mise en valeur
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(79, 70, 229);
            doc.text("DÉTAILS DU PAIEMENT", pageWidth / 2, 165, { align: "center" });
            
            // Cadre pour le montant
            doc.setFillColor(34, 197, 94);
            doc.rect(margin, 170, pageWidth - 2 * margin, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("MONTANT VERSÉ", pageWidth / 2, 185, { align: "center" });
            
            // Correction du formatage du montant (remplace / par .)
            const formattedAmount = withdrawal.amount_fcfa?.toString().replace(/\//g, '.').replace(/\s/g, '.') || withdrawal.amount_fcfa?.toString();
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(28);
            doc.setFont("helvetica", "bold");
            doc.text(`${formattedAmount} FCFA`, pageWidth / 2, 205, { align: "center" });

            // Détails de la transaction
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            
            const detailsY = 220;
            doc.text("Détails transactionnels:", margin, detailsY);
            
            // Informations numériques importantes
            const paymentNumber = getPaymentNumber(withdrawal.method);
            
            const details = [
                ['Date de demande', format(new Date(withdrawal.requested_at), 'dd/MM/yyyy HH:mm')],
                ['Date de traitement', withdrawal.processed_at ? format(new Date(withdrawal.processed_at), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm')],
                ['Référence interne', `BPI-${withdrawal.id.substring(0, 6).toUpperCase()}`]
            ];
            
            if (paymentNumber) {
                details.push(['N° compte/portefeuille', paymentNumber]);
            }
            
            details.forEach(([label, value], index) => {
                const yPos = detailsY + 10 + (index * 8);
                doc.setFont("helvetica", "bold");
                doc.text(`${label}:`, margin, yPos);
                doc.setFont("helvetica", "normal");
                doc.text(value, margin + 70, yPos);
            });

            // Section notes importantes pour Mobile Money
            if (withdrawal.method?.toLowerCase().includes('mobile') || withdrawal.method?.toLowerCase().includes('money')) {
                doc.setFillColor(255, 251, 235);
                doc.rect(margin, 265, pageWidth - 2 * margin, 25, 'F');
                doc.setDrawColor(252, 211, 77);
                doc.setLineWidth(0.5);
                doc.rect(margin, 265, pageWidth - 2 * margin, 25);
                
                doc.setTextColor(194, 65, 12);
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.text("💡 POUR TRANSFERT MOBILE MONEY", margin + 5, 275);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0, 0, 0);
                doc.text(`Envoyez le paiement au: ${formatPhoneNumber(paymentNumber) || paymentNumber || userProfile?.phone || ''}`, margin + 5, 282);
            }

            // Pied de page avec informations de contact
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 300, pageWidth, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text("BonPlanInfos - Plateforme d'information et de services", pageWidth / 2, 315, { align: "center" });
            doc.text("Email: support@bonplaninfos.com | Téléphone: +237 6XX XX XX XX", pageWidth / 2, 322, { align: "center" });
            doc.text("© 2025 BonPlanInfos. Tous droits réservés. Ce document fait foi de paiement.", pageWidth / 2, 329, { align: "center" });

            // Filigrane de sécurité
            doc.setTextColor(240, 240, 240, 20);
            doc.setFontSize(60);
            doc.setFont("helvetica", "bold");
            doc.text("PAYÉ", pageWidth / 2, 200, { align: "center", angle: 45 });

            // Sauvegarde du fichier avec nom descriptif
            const fileName = `recu_paiement_${userProfile?.full_name?.replace(/\s+/g, '_') || 'admin'}_${withdrawal.amount_fcfa}_${format(new Date(withdrawal.requested_at), 'yyyyMMdd')}.pdf`;
            doc.save(fileName);
            
            toast({ 
                title: "Reçu généré avec succès", 
                description: "Votre reçu de paiement a été téléchargé.",
                variant: "default"
            });
        } catch (err) {
            console.error("Erreur génération PDF:", err);
            toast({ 
                title: "Erreur", 
                description: "Impossible de générer le PDF.", 
                variant: "destructive" 
            });
        } finally {
            setGeneratingPdf(null);
        }
    };

    if (loading && !totalAvailable) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Banner */}
            {canWithdraw && (
                <div className="bg-green-100 border border-green-200 text-green-800 px-6 py-4 rounded-lg flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-200 p-2 rounded-full"><Wallet className="w-5 h-5 text-green-700" /></div>
                        <div>
                            <h3 className="font-bold">Salaire disponible pour retrait !</h3>
                            <p className="text-sm">Vous pouvez retirer votre solde validé ainsi que votre estimation du mois courant.</p>
                        </div>
                    </div>
                    <Button onClick={() => setIsWithdrawalModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white border-none shadow-md">
                        Retirer maintenant
                    </Button>
                </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Available Balance Card */}
                <Card className="md:col-span-1 shadow-lg border-primary/10 bg-gradient-to-br from-white to-indigo-50/30 dark:from-gray-900 dark:to-gray-800/50">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Solde Total Disponible</CardTitle>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="w-4 h-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Calcul: (Validé + Estimation) - Demandes en attente</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary mb-1">
                            {totalAvailable.toLocaleString()} <span className="text-lg text-muted-foreground">FCFA</span>
                        </div>
                        
                        <div className="mt-3 mb-4 bg-white/50 dark:bg-black/20 p-2 rounded border border-indigo-100 dark:border-indigo-900 text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Solde validé:</span>
                                <span className="font-semibold">{validatedBalance.toLocaleString()} FCFA</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Estimation en cours:</span>
                                <span className="font-semibold text-indigo-600">+{estimatedSalary.toLocaleString()} FCFA</span>
                            </div>
                            {pendingAmount > 0 && (
                                <div className="flex justify-between text-amber-600">
                                    <span>En attente:</span>
                                    <span className="font-semibold">-{pendingAmount.toLocaleString()} FCFA</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-sm mb-2">
                            <Badge variant={canWithdraw ? "success" : "secondary"} className="rounded-full px-2">
                                {canWithdraw ? "Retrait ouvert" : pendingAmount > 0 ? "Retrait en cours" : "En attente"}
                            </Badge>
                            {!canWithdraw && !pendingAmount && (
                                <span className="text-muted-foreground text-xs flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> Dispo le {withdrawalConfig.withdrawal_available_date} du mois
                                </span>
                            )}
                        </div>
                        <Button 
                            className="w-full" 
                            onClick={() => setIsWithdrawalModalOpen(true)}
                            disabled={!canWithdraw}
                        >
                            {canWithdraw ? "Demander un retrait" : pendingAmount > 0 ? "Traitement en cours..." : `Disponible le ${withdrawalConfig.withdrawal_available_date}`}
                        </Button>
                    </CardContent>
                </Card>

                {/* Current Month Performance Card */}
                <Card className="md:col-span-1 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Performance (Mois en cours)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-700 dark:text-gray-200 mb-1">
                            {estimatedSalary.toLocaleString()} <span className="text-lg text-muted-foreground">FCFA</span>
                        </div>
                        <div className="space-y-3 mt-4">
                            <div className="flex justify-between text-sm">
                                <span>Score Personnel</span>
                                <span className="font-bold text-indigo-600">{personalScore.toFixed(2)}</span>
                            </div>
                            <Progress value={personalScore * 100} className="h-2" />
                            <p className="text-xs text-muted-foreground italic">
                                * Votre performance actuelle est incluse dans le solde disponible pour retrait.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Next Withdrawal Info Card */}
                <Card className="md:col-span-1 shadow-md bg-slate-50 dark:bg-slate-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Prochaine Date</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col justify-center h-[140px]">
                        <div className="flex items-center gap-4 mb-2">
                            <CalendarClock className="w-10 h-10 text-indigo-400" />
                            <div>
                                <p className="text-lg font-bold">
                                    {nextWithdrawalDate ? format(nextWithdrawalDate, 'dd MMMM yyyy', { locale: fr }) : '---'}
                                </p>
                                <p className="text-sm text-muted-foreground">Ouverture des retraits</p>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 bg-white dark:bg-slate-800 p-2 rounded border">
                            <p className="flex items-start gap-2">
                                <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500" />
                                Les demandes sont traitées sous 48h ouvrées après soumission.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Withdrawal History */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Historique des Retraits
                    </CardTitle>
                    <CardDescription>Consultez l'état de vos demandes et téléchargez vos reçus.</CardDescription>
                </CardHeader>
                <CardContent>
                    {withdrawalHistory.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date demande</TableHead>
                                    <TableHead>Montant</TableHead>
                                    <TableHead>Méthode</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Reçu</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {withdrawalHistory.map((w) => (
                                    <TableRow key={w.id}>
                                        <TableCell className="font-medium">
                                            {format(new Date(w.requested_at), 'dd/MM/yyyy HH:mm')}
                                        </TableCell>
                                        <TableCell className="font-bold text-indigo-600">
                                            {w.amount_fcfa.toLocaleString()} FCFA
                                        </TableCell>
                                        <TableCell>
                                            <span className="capitalize">{w.method || w.withdrawal_method || '---'}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                w.status === 'approved' || w.status === 'paid' ? 'success' : 
                                                w.status === 'rejected' ? 'destructive' : 'secondary'
                                            }>
                                                {w.status === 'approved' ? 'Validé' : 
                                                 w.status === 'paid' ? 'Payé' :
                                                 w.status === 'rejected' ? 'Rejeté' : 'En attente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(w.status === 'approved' || w.status === 'paid') && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => generateReceipt(w)}
                                                    disabled={generatingPdf === w.id}
                                                >
                                                    {generatingPdf === w.id ? 
                                                        <Loader2 className="h-4 w-4 animate-spin" /> : 
                                                        <Download className="h-4 w-4 text-gray-500" />
                                                    }
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-muted-foreground/20">
                            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Aucun historique de retrait pour le moment.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Withdrawal Modal */}
            <AdminSalaryWithdrawalModal 
                open={isWithdrawalModalOpen} 
                onOpenChange={setIsWithdrawalModalOpen}
                availableAmount={totalAvailable}
                validatedAmount={validatedBalance}
                estimatedAmount={estimatedSalary}
                adminId={user?.id}
                config={withdrawalConfig}
                onSuccess={() => {
                    fetchData();
                    console.log("Withdrawal request created successfully");
                }}
            />
        </div>
    );
};

export default AdminSalaryDashboard;