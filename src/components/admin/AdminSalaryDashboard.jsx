import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CalendarClock,
  Info,
  DollarSign,
  TrendingUp,
  PieChart,
  Globe,
  Download,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { getNextWithdrawalDate, isWithdrawalOpen } from "@/lib/dateUtils";
import AdminSalaryWithdrawalModal from "./AdminSalaryWithdrawalModal";
import { toast } from "@/components/ui/use-toast";

// Fonction pour ajouter le logo (déplacée en haut du fichier)
const addLogoToPDF = (doc, x, y, width = 24, height = 24) => {
  try {
    // Chemin vers votre logo (dans le dossier public)
    const logoPath = '/logo.png';
    
    // Ajouter l'image du logo
    doc.addImage(logoPath, 'PNG', x, y, width, height);
    
    return true;
  } catch (error) {
    console.log('Logo not found, using text fallback');
    
    // Fallback textuel si l'image n'est pas trouvée
    doc.setFillColor(255, 255, 255);
    doc.circle(x + width/2, y + height/2, width/2, 'F');
    
    doc.setTextColor(22, 163, 74); // Vert
    doc.setFontSize(width * 0.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BPI', x + width/2, y + height/2 + 2, { align: 'center' });
    
    return false;
  }
};

const AdminSalaryDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salaryStats, setSalaryStats] = useState(null);
  const [withdrawalConfig, setWithdrawalConfig] = useState({
    withdrawal_dates: [5],
  });
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);

  // Derived states
  const [nextWithdrawalDate, setNextWithdrawalDate] = useState(null);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Config
      const { data: configData } = await supabase
        .from("admin_withdrawal_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      const config = configData || { withdrawal_dates: [5] };
      setWithdrawalConfig(config);
      setNextWithdrawalDate(
        getNextWithdrawalDate(config.withdrawal_dates || [5]),
      );

      // 2. Fetch Salary Stats
      const { data: stats, error: statsError } = await supabase.rpc(
        "get_admin_salary_stats",
        { p_admin_id: user.id },
      );
      if (statsError) console.error("Stats Error:", statsError);
      setSalaryStats(stats || {});

      // 3. Fetch History
      const { data: history } = await supabase
        .from("admin_withdrawal_requests")
        .select("*")
        .eq("admin_id", user.id)
        .order("requested_at", { ascending: false });
      setWithdrawalHistory(history || []);

      // Check withdrawal window
      setCanWithdraw(isWithdrawalOpen(config.withdrawal_dates || [5]));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

 const generateReceipt = async (withdrawal) => {
    if (!withdrawal) return;
    setGeneratingPdf(withdrawal.id);

    try {
      const { jsPDF } = await import("jspdf");

      // Fonction pour nettoyer et formater les montants
      const cleanAndFormatAmount = (amount) => {
        if (amount === null || amount === undefined) return { value: 0, formatted: "0" };
        
        // Convertir en string
        let amountStr = amount.toString().trim();
        
        // Nettoyer : supprimer tous les caractères non numériques sauf les points et virgules
        amountStr = amountStr.replace(/[^0-9,.]/g, '');
        
        // Remplacer les virgules par des points pour la conversion numérique
        amountStr = amountStr.replace(',', '.');
        
        // Convertir en nombre
        let num = parseFloat(amountStr);
        if (isNaN(num)) num = 0;
        
        // Arrondir
        num = Math.round(num);
        
        // Formater avec espace comme séparateur de milliers
        const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        
        return { value: num, formatted };
      };

      // Nettoyer le montant du retrait
      const cleanAmount = cleanAndFormatAmount(withdrawal.amount_fcfa);
      console.log("Montant original:", withdrawal.amount_fcfa);
      console.log("Montant nettoyé:", cleanAmount);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // ============ EN-TÊTE AVEC LOGO ============
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 50, "F");

      // Ajouter le logo
      addLogoToPDF(doc, margin, 15, 20, 20);

      // Titres à côté du logo
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      const logoWidth = 20;
      const textStartX = margin + logoWidth + 10;
      doc.text("BONPLANINFOS", textStartX, 30);

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("REÇU DE PAIEMENT", pageWidth - margin, 30, { align: "right" });
      doc.setFontSize(10);
      doc.text("Document officiel", pageWidth - margin, 37, { align: "right" });

      // Ligne de séparation
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(1);
      doc.line(margin, 55, pageWidth - margin, 55);
      y = 65;

      // ============ INFORMATIONS ============
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Date: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, y);
      doc.text(
        `Réf: ${withdrawal.id.substring(0, 8).toUpperCase()}`,
        margin,
        y + 7,
      );
      doc.text(`Type: Retrait Salaire`, pageWidth - margin, y, {
        align: "right",
      });
   // Vert (RGB)
doc.setTextColor(0, 150, 0);

doc.text(
  `Statut: PAYÉ`,
  pageWidth - margin,
  y + 7,
  { align: "right" }
);
doc.setTextColor(0, 128, 0);

      y += 20;

      // ============ BÉNÉFICIAIRE ============
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("BÉNÉFICIAIRE", margin, y);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(margin, y + 5, pageWidth - 2 * margin, 25);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
     const displayName =
  user?.user_metadata?.full_name ||
  user?.user_metadata?.name ||
  profile?.full_name ||
  profile?.username ||
  "Administrateur";

doc.text(`Nom: ${displayName}`, margin + 5, y + 15);

    //   doc.text(`ID: ${user?.id?.substring(0, 8) || "N/A"}`, margin + 5, y + 22);
      doc.text(
        `Méthode: ${withdrawal.method || "Virement"}`,
        pageWidth - margin - 5,
        y + 15,
        { align: "right" },
      );
      doc.text(
        `Date paiement: ${format(new Date(withdrawal.requested_at), "dd/MM/yyyy")}`,
        pageWidth - margin - 5,
        y + 22,
        { align: "right" },
      );

      y += 40;

      // ============ MONTANT PRINCIPAL ============
      // Cadre de fond pour le montant
      doc.setFillColor(79, 70, 229);
      doc.rect(margin, y, pageWidth - 2 * margin, 50, "F");

      // Titre "MONTANT VERSÉ"
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("MONTANT VERSÉ", pageWidth / 2, y + 15, { align: "center" });

      // Montant en grand - UTILISER LE MONTANT NETTOYÉ
      const amountText = `${cleanAmount.formatted} FCFA`;
      let fontSize = 36;
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "bold");

      // Ajuster la taille si nécessaire
      let textWidth = doc.getTextWidth(amountText);
      const availableWidth = pageWidth - 2 * margin - 20;

      while (textWidth > availableWidth && fontSize > 20) {
        fontSize -= 2;
        doc.setFontSize(fontSize);
        textWidth = doc.getTextWidth(amountText);
      }

      doc.text(amountText, pageWidth / 2, y + 40, { align: "center" });

      // Conversion en euros
      if (cleanAmount.value > 0) {
        const amountEuro = (cleanAmount.value / 656).toLocaleString("fr-FR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        doc.setFontSize(10);
        doc.text(`≈ ${amountEuro} €`, pageWidth / 2, y + 48, {
          align: "center",
        });
      }

      y += 60;

      // ============ DÉTAILS COMPLÉMENTAIRES ============
        if (salaryStats) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");

        // Nettoyer aussi les autres montants
        const totalVolume = cleanAndFormatAmount(salaryStats.total_volume_fcfa);
        const platformRevenue = cleanAndFormatAmount(salaryStats.platform_revenue_fcfa);
        const totalSalary = cleanAndFormatAmount(salaryStats.total_salary_fcfa);

        
        y += 35;
      }

      // ============ SIGNATURE ============
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("VALIDATION ET SIGNATURE", pageWidth / 2, y, { align: "center" });
      
      y += 10;

      // Ligne de signature
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      const lineLength = 120;
      const lineX = (pageWidth - lineLength) / 2;
      doc.line(lineX, y, lineX + lineLength, y);
      
      y += 5;

      // Essayer de charger l'image de signature
      try {
        // Chemin vers la signature
        const signatureUrl = "/signature.jpg"; // Si l'image est dans le dossier public
        
        // Ajouter l'image de signature
        const imgWidth = 70;
        const imgHeight = 30;
        const imgX = (pageWidth - imgWidth) / 2;
        const imgY = y;
        
        doc.addImage(signatureUrl, "JPEG", imgX, imgY, imgWidth, imgHeight);
        
        y += imgHeight + 5;
        
      } catch (imgError) {
        console.log("Image de signature non trouvée, utilisation d'une signature texte");
        
        // Signature texte de secours
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text("BONPLANINFOS", pageWidth / 2, y + 10, { align: "center" });
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("Directeur Financier", pageWidth / 2, y + 16, { align: "center" });
        
        y += 25;
      }

      // Cachet de validation
      const stampX = pageWidth - margin - 30;
      const stampY = y - 15;
      
      doc.setFillColor(34, 197, 94, 0.1);
      doc.circle(stampX, stampY, 15, "F");
      
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(1);
      doc.circle(stampX, stampY, 15, "D");
      
      doc.setTextColor(34, 197, 94);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("PAIÉ", stampX, stampY - 2, { align: "center" });
      doc.text("VALIDÉ", stampX, stampY + 3, { align: "center" });
      doc.setFontSize(6);
      doc.text(format(new Date(), "dd/MM/yy"), stampX, stampY + 8, { align: "center" });

      y += 15;

      // ============ PIED DE PAGE ============
      y = 270;
      doc.setFillColor(30, 41, 59);
      doc.rect(0, y, pageWidth, 30, "F");

      // Ajouter le logo en plus petit dans le pied de page
      

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Bonplaninfos.net - La référence des bons plans en Afrique",
        pageWidth / 2,
        y + 10,
        { align: "center" },
      );
      doc.text(
        "contact@bonplaninfos.net | www.bonplaninfos.net",
        pageWidth / 2,
        y + 17,
        { align: "center" },
      );
      doc.text("© 2025 Tous droits réservés - Document confidentiel", pageWidth / 2, y + 24, {
        align: "center",
      });

      // Sauvegarde
      const fileName = `recu_paiement_${format(new Date(withdrawal.requested_at), "yyyyMMdd")}.pdf`;
      doc.save(fileName);

      toast({
        title: "✅ Reçu téléchargé",
        description: "Votre reçu a été généré avec succès.",
        className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white",
      });
    } catch (err) {
      console.error("Erreur génération PDF:", err);
      toast({
        title: "❌ Erreur",
        description: "Impossible de générer le PDF.",
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(null);
    }
  };
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <p className="text-gray-400">Chargement de vos informations...</p>
      </div>
    );

  // Formatage sécurisé des montants pour l'affichage
  const formatDisplayAmount = (amount) => {
    if (!amount && amount !== 0) return "0";
    const num = Number(amount);
    if (isNaN(num)) return "0";
    return num.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const commissionRate = salaryStats?.license_commission_rate || 0;
  const personalScore = salaryStats?.personal_score || 1.0;
  const zoneVolume = salaryStats?.total_volume_fcfa || 0;
  const platformFees = salaryStats?.platform_revenue_fcfa || 0;
  const estimatedSalary = salaryStats?.total_salary_fcfa || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-4 md:p-6">
      {/* Header / License Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Mon Salaire & Revenus
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
              {salaryStats?.license_name || "Licence Standard"}
            </Badge>
            <span className="text-gray-400">
              Commission: <span className="font-bold text-white">{commissionRate}%</span>
            </span>
          </div>
        </div>
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-3 rounded-xl border border-gray-700 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <CalendarClock className="text-indigo-400 w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Prochain Retrait</p>
            <p className="font-bold text-white text-lg">
              {nextWithdrawalDate
                ? format(nextWithdrawalDate, "d MMMM yyyy", { locale: fr })
                : "---"}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown Visualizer */}
      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl text-white">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <PieChart className="w-6 h-6 text-indigo-400" />
            </div>
            <span>Détail du Calcul (Mois en cours)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            {/* Step 1: Zone Volume */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group transition-all duration-300 hover:border-indigo-500/50">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Globe className="w-16 h-16" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">Volume Zone</p>
                  <p className="text-sm text-gray-300">{salaryStats?.country || "Non spécifié"}</p>
                </div>
              </div>
              <p className="text-3xl font-black text-white">
                {formatDisplayAmount(zoneVolume)} F
              </p>
              <p className="text-xs text-gray-500 mt-2">Total achats validés dans votre zone</p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex justify-center">
              <div className="relative">
                <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-indigo-500"></div>
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">5% →</span>
              </div>
            </div>

            {/* Step 2: Platform Commission */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group transition-all duration-300 hover:border-blue-500/50">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <DollarSign className="w-16 h-16" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">Commission Plateforme</p>
                  <p className="text-sm text-gray-300">5% du volume</p>
                </div>
              </div>
              <p className="text-3xl font-black text-blue-400">
                {formatDisplayAmount(platformFees)} F
              </p>
              <p className="text-xs text-blue-500/80 mt-2">Base de calcul de votre salaire</p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex justify-center">
              <div className="relative">
                <div className="w-12 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-purple-500"></div>
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">{commissionRate}% →</span>
              </div>
            </div>

            {/* Step 3: Admin Share */}
            <div className="bg-gradient-to-br from-indigo-900/80 to-purple-900/80 p-6 rounded-xl border border-indigo-700/50 shadow-2xl relative overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <TrendingUp className="w-16 h-16 text-white" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-500/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-indigo-300 uppercase font-bold">Votre Gain Estimé</p>
                  <p className="text-sm text-indigo-200">Salaire mensuel</p>
                </div>
              </div>
              <p className="text-4xl font-black text-white">
                {formatDisplayAmount(estimatedSalary)} F
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Badge className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white border-0">
                  Score: {personalScore.toFixed(2)}
                </Badge>
                <span className="text-xs text-indigo-200">
                  {personalScore >= 1.0 ? "✅ Performance optimale" : "📈 Amélioration possible"}
                </span>
              </div>
            </div>
          </div>
          
          {/* Formule détaillée */}
          <div className="mt-8 bg-gradient-to-r from-gray-800/50 to-gray-900/50 p-5 rounded-xl border border-gray-700/50">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-yellow-400 mb-2">📊 Formule de Calcul</h4>
                <p className="text-gray-300">
                  <span className="font-bold">(Volume Zone × 5%) × {commissionRate}% × Score Personnel</span>
                  <br />
                  <span className="text-sm text-gray-400">
                    Actuellement: ({formatDisplayAmount(zoneVolume)} × 0.05) × {commissionRate/100} × {personalScore.toFixed(2)} = 
                    <span className="font-bold text-white ml-2">{formatDisplayAmount(estimatedSalary)} FCFA</span>
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Score & Withdrawal Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Score Card */}
        <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              Score de Performance Détaillé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Score Global</span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-white">{personalScore.toFixed(2)}</span>
                    <span className="text-gray-500">/ 1.0</span>
                  </div>
                </div>
                <Progress 
                  value={personalScore * 100} 
                  className="h-3 bg-gray-800"
                  indicatorClassName={
                    personalScore >= 0.8 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                    personalScore >= 0.6 ? "bg-gradient-to-r from-yellow-500 to-amber-500" :
                    "bg-gradient-to-r from-red-500 to-orange-500"
                  }
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Débutant</span>
                  <span>Intermédiaire</span>
                  <span>Avancé</span>
                  <span>Expert</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-500/20 rounded">
                      <span className="text-xs font-bold text-blue-400">👥</span>
                    </div>
                    <span className="text-sm text-gray-400">Parrainages</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {salaryStats?.score_details?.breakdown?.referrals?.count || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    +{(salaryStats?.score_details?.breakdown?.referrals?.points || 0).toFixed(2)} points
                  </div>
                </div>
                
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-purple-500/20 rounded">
                      <span className="text-xs font-bold text-purple-400">🎯</span>
                    </div>
                    <span className="text-sm text-gray-400">Événements Zone</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {salaryStats?.score_details?.breakdown?.events?.count || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    +{(salaryStats?.score_details?.breakdown?.events?.points || 0).toFixed(2)} points
                  </div>
                </div>
              </div>
              
              {personalScore < 1.0 && (
                <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/20 p-4 rounded-lg border border-yellow-700/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-yellow-400 mb-1">💡 Conseil d'amélioration</h4>
                      <p className="text-sm text-yellow-300/80">
                        Augmentez votre score en parrainant de nouveaux administrateurs et en organisant plus d'événements.
                        Chaque point supplémentaire augmente directement votre salaire !
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Action Card */}
        <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Retrait Disponible</h3>
                  <p className="text-sm text-gray-400">Salaire estimé ce mois</p>
                </div>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-4xl font-black text-white mb-2">
                  {formatDisplayAmount(estimatedSalary)} F
                </div>
                <div className="text-sm text-gray-400">
                  ≈ {(estimatedSalary / 656).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <Button
                size="lg"
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                disabled={!canWithdraw || estimatedSalary < 1000}
                onClick={() => setIsWithdrawalModalOpen(true)}
              >
                {canWithdraw ? (
                  <>
                    <DollarSign className="w-5 h-5 mr-2" />
                    Demander le Retrait
                  </>
                ) : (
                  "Retraits Fermés"
                )}
              </Button>
              
              <div className="text-center">
                <p className="text-xs text-gray-400">
                  {canWithdraw ? (
                    <>
                      <CheckCircle className="w-3 h-3 inline mr-1 text-green-500" />
                      Période de retrait ouverte
                    </>
                  ) : (
                    <>
                      <CalendarClock className="w-3 h-3 inline mr-1 text-yellow-500" />
                      Prochaine ouverture: {nextWithdrawalDate ? format(nextWithdrawalDate, 'd MMMM', { locale: fr }) : '---'}
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Jours autorisés: {withdrawalConfig.withdrawal_dates?.map(d => `${d}`).join(', ')} du mois
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-xl text-white">Historique des Paiements</CardTitle>
            <Badge variant="outline" className="border-gray-700 text-gray-400">
              {withdrawalHistory.length} transaction{withdrawalHistory.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {withdrawalHistory.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 bg-gray-900/50">
                    <TableHead className="text-gray-300 font-bold">Date</TableHead>
                    <TableHead className="text-gray-300 font-bold">Montant</TableHead>
                    <TableHead className="text-gray-300 font-bold">Statut</TableHead>
                    <TableHead className="text-gray-300 font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalHistory.map((w) => {
                    const statusConfig = {
                      'approved': { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Approuvé' },
                      'paid': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Payé' },
                      'pending': { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'En attente' },
                      'rejected': { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Rejeté' }
                    };
                    
                    const status = statusConfig[w.status] || statusConfig.pending;
                    
                    return (
                      <TableRow key={w.id} className="border-gray-800 hover:bg-gray-800/30 transition-colors">
                        <TableCell className="text-gray-300">
                          <div className="flex flex-col">
                            <span>{format(new Date(w.requested_at), "dd/MM/yyyy")}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(w.requested_at), "HH:mm")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-lg">
                              {formatDisplayAmount(w.amount_fcfa)} F
                            </span>
                            <span className="text-xs text-gray-500">
                              ≈ {(w.amount_fcfa / 656).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`${status.bg} ${status.color} ${status.border} px-3 py-1 font-semibold`}
                            variant="outline"
                          >
                            {status.label}
                          </Badge>
                          {w.processed_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              Traité le {format(new Date(w.processed_at), "dd/MM")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {(w.status === "approved" || w.status === "paid") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateReceipt(w)}
                              disabled={generatingPdf === w.id}
                              className="text-gray-400 hover:text-white hover:bg-gray-800/50 border border-gray-700"
                            >
                              {generatingPdf === w.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Génération...
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-2" />
                                  Reçu
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800/50 rounded-full mb-4">
                <DollarSign className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Aucun historique de paiement</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Vous n'avez pas encore effectué de retrait. Votre salaire s'accumule chaque mois.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de retrait */}
      <AdminSalaryWithdrawalModal
        open={isWithdrawalModalOpen}
        onOpenChange={setIsWithdrawalModalOpen}
        availableAmount={estimatedSalary}
        adminId={user?.id}
        onSuccess={() => {
          fetchData();
          toast({
            title: "✅ Demande envoyée",
            description: "Votre demande de retrait a été soumise avec succès.",
            className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white",
          });
        }}
      />
    </div>
  );
};

export default AdminSalaryDashboard;