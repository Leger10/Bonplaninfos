import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Store,
  CheckCircle,
  Info,
  Layout,
  Lock,
  ArrowRight,
  Phone,
  Building,
  Package,
  Copy,
  Mail,
  Navigation,
  Printer,
  BadgeCheck,
  Briefcase,
  Tag,
  Hash,
  CalendarDays,
  UserCircle,
  CreditCard,
  Ticket,
  FileDown,
  Search,
  BarChart3,
  Coins,
  Percent,
  Wallet,
  FileText,
  Users,
  Grid3x3,
  ShoppingCart,
  PlusCircle,
  Trash2,
  X,
  Bookmark,
  Eye,
  MoreVertical,
  QrCode,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Palette de couleurs complètement statique
const STAND_COLORS = [
  {
    border: "border-blue-600",
    borderLight: "border-blue-500/30",
    bg: "bg-blue-950/30",
    bgSolid: "bg-blue-600",
    bgHover: "hover:bg-blue-700",
    text: "text-blue-400",
    badge: "bg-blue-900 text-blue-200",
    iconBg: "bg-blue-900/50",
    gradient: "from-blue-900/20 to-transparent",
    shadow: "hover:shadow-blue-500/10",
    progress: "[&>div]:bg-blue-500",
  },
  {
    border: "border-green-600",
    borderLight: "border-green-500/30",
    bg: "bg-green-950/30",
    bgSolid: "bg-green-600",
    bgHover: "hover:bg-green-700",
    text: "text-green-400",
    badge: "bg-green-900 text-green-200",
    iconBg: "bg-green-900/50",
    gradient: "from-green-900/20 to-transparent",
    shadow: "hover:shadow-green-500/10",
    progress: "[&>div]:bg-green-500",
  },
  {
    border: "border-purple-600",
    borderLight: "border-purple-500/30",
    bg: "bg-purple-950/30",
    bgSolid: "bg-purple-600",
    bgHover: "hover:bg-purple-700",
    text: "text-purple-400",
    badge: "bg-purple-900 text-purple-200",
    iconBg: "bg-purple-900/50",
    gradient: "from-purple-900/20 to-transparent",
    shadow: "hover:shadow-purple-500/10",
    progress: "[&>div]:bg-purple-500",
  },
  {
    border: "border-orange-600",
    borderLight: "border-orange-500/30",
    bg: "bg-orange-950/30",
    bgSolid: "bg-orange-600",
    bgHover: "hover:bg-orange-700",
    text: "text-orange-400",
    badge: "bg-orange-900 text-orange-200",
    iconBg: "bg-orange-900/50",
    gradient: "from-orange-900/20 to-transparent",
    shadow: "hover:shadow-orange-500/10",
    progress: "[&>div]:bg-orange-500",
  },
  {
    border: "border-pink-600",
    borderLight: "border-pink-500/30",
    bg: "bg-pink-950/30",
    bgSolid: "bg-pink-600",
    bgHover: "hover:bg-pink-700",
    text: "text-pink-400",
    badge: "bg-pink-900 text-pink-200",
    iconBg: "bg-pink-900/50",
    gradient: "from-pink-900/20 to-transparent",
    shadow: "hover:shadow-pink-500/10",
    progress: "[&>div]:bg-pink-500",
  },
  {
    border: "border-indigo-600",
    borderLight: "border-indigo-500/30",
    bg: "bg-indigo-950/30",
    bgSolid: "bg-indigo-600",
    bgHover: "hover:bg-indigo-700",
    text: "text-indigo-400",
    badge: "bg-indigo-900 text-indigo-200",
    iconBg: "bg-indigo-900/50",
    gradient: "from-indigo-900/20 to-transparent",
    shadow: "hover:shadow-indigo-500/10",
    progress: "[&>div]:bg-indigo-500",
  },
];

const StandRentalInterface = ({
  event,
  isUnlocked,
  onRefresh,
  isClosed,
  userProfile,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // États
  const [standTypes, setStandTypes] = useState([]);
  const [myRentals, setMyRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États pour le panier
  const [cartStands, setCartStands] = useState([]);
  const [isRenting, setIsRenting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // États pour les réservations
  const [allRentals, setAllRentals] = useState([]);
  const [filteredRentals, setFilteredRentals] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [activeTabs, setActiveTabs] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // États pour les détails d'une réservation
  const [selectedRentalForDetails, setSelectedRentalForDetails] = useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  // États pour les statistiques
  const [statistics, setStatistics] = useState({
    totalStands: 0,
    totalRentals: 0,
    totalRevenue: 0,
    totalRevenueFcfa: 0,
    totalCommission: 0,
    totalNetGain: 0,
    occupancyRate: 0,
    byType: [],
    byCompany: [],
  });

  const COIN_RATE = 10;
  const COMMISSION_RATE = 0.05;
  const isOrganizer = user?.id === event?.organizer_id;

  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: user?.email || "",
    phone: "",
    description: "",
  });

  // ==================== FONCTIONS UTILITAIRES ====================

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "✅ Copié !",
        description: `${label} a été copié dans le presse-papier.`,
        className: "bg-green-600 text-white border-none",
      });
    } catch (err) {
      console.error("Erreur de copie:", err);
      toast({
        title: "Erreur",
        description: "Impossible de copier dans le presse-papier.",
        variant: "destructive",
      });
    }
  };

  const generateBookingCode = () => {
    const prefix = "STD";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const generateQRCode = async (text) => {
    try {
      const url = await QRCode.toDataURL(text);
      setQrCodeUrl(url);
    } catch (err) {
      console.error("Erreur génération QR code:", err);
    }
  };

  const setTabForRental = (rentalId, tab) => {
    setActiveTabs((prev) => ({ ...prev, [rentalId]: tab }));
  };

  // ==================== FONCTIONS D'EXPORT ====================

  const exportToExcel = () => {
    if (!filteredRentals || filteredRentals.length === 0) return;

    const data = filteredRentals.map((rental) => ({
      "N° Stand": rental.stand_number,
      "Entreprise": rental.company_name,
      "Description": rental.business_description || "",
      "Personne à Contact": rental.contact_person,
      "Email": rental.contact_email,
      "Téléphone": rental.contact_phone,
      "Code Réservation": rental.booking_code || "",
      "Type Stand": rental.stand_types?.name || "",
      "Montant (π)": rental.rental_amount_pi,
      "Montant (F CFA)": rental.rental_amount_pi * COIN_RATE,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Réservations");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(fileData, "reservations_stands.xlsx");
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Réservations de stands - ${event?.title || "Événement"}`,
        14,
        20,
      );

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`,
        14,
        28,
      );

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Résumé des locations", 14, 40);

      doc.setFontSize(10);
      doc.text(`Total des réservations: ${filteredRentals.length}`, 14, 48);
      doc.text(
        `Revenu total: ${filteredRentals.reduce((sum, r) => sum + r.rental_amount_pi, 0)} π`,
        14,
        55,
      );

      const tableColumn = [
        "Stand",
        "Entreprise",
        "Personne à contacter",
        "Email",
        "Téléphone",
        "Type",
        "Code",
        "Prix (π)",
      ];

      const tableRows = filteredRentals.map((rental) => [
        rental.stand_number,
        rental.company_name || "N/A",
        rental.contact_person || "N/A",
        rental.contact_email || "N/A",
        rental.contact_phone || rental.profiles?.phone || "N/A",
        rental.stand_types?.name || "N/A",
        rental.booking_code || "N/A",
        rental.rental_amount_pi.toString(),
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 65,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
      });

      doc.save(
        `reservations-stands-${event?.title?.replace(/\s+/g, "-").toLowerCase() || "evenement"}.pdf`,
      );

      toast({
        title: "✅ Export réussi",
        description: "Le fichier PDF a été téléchargé.",
        className: "bg-green-600 text-white",
      });
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter le PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = () => {
    try {
      const headers = [
        "Stand",
        "Entreprise",
        "Personne à contacter",
        "Email",
        "Téléphone",
        "Type de stand",
        "Code réservation",
        "Prix (π)",
        "Prix (FCFA)",
        "Date de réservation",
      ];

      const rows = filteredRentals.map((rental) => [
        rental.stand_number,
        rental.company_name || "",
        rental.contact_person || "",
        rental.contact_email || "",
        rental.contact_phone || rental.profiles?.phone || "",
        rental.stand_types?.name || "",
        rental.booking_code || "",
        rental.rental_amount_pi,
        rental.rental_amount_pi * COIN_RATE,
        new Date(rental.created_at).toLocaleDateString("fr-FR"),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `reservations-stands-${event?.title?.replace(/\s+/g, "-").toLowerCase() || "evenement"}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Export réussi",
        description: "Le fichier CSV a été téléchargé.",
        className: "bg-green-600 text-white",
      });
    } catch (error) {
      console.error("Erreur lors de l'export CSV:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter le CSV.",
        variant: "destructive",
      });
    }
  };

  const exportCompanyListExcel = () => {
    if (!statistics.byCompany || statistics.byCompany.length === 0) return;

    const data = statistics.byCompany.map((company) => ({
      "Entreprise": company.company_name,
      "Nombre de stands": company.total_stands,
      "Montant total (π)": company.total_amount_pi,
      "Montant total (F CFA)": company.total_amount_pi * COIN_RATE,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entreprises");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(fileData, "liste_entreprises_stands.xlsx");
  };

  const exportCompanyList = () => {
    try {
      const headers = [
        "Entreprise",
        "Personne à contacter",
        "Email",
        "Téléphone",
        "Nombre de stands",
        "Code(s) réservation",
        "Montant total (π)",
        "Montant total (FCFA)",
      ];

      const rows = statistics.byCompany.map((company) => [
        company.companyName,
        company.contactPerson,
        company.contactEmail,
        company.contactPhone,
        company.rentals.length,
        company.bookingCodes.join(" | "),
        company.totalAmount,
        company.totalAmount * COIN_RATE,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `entreprises-${event?.title?.replace(/\s+/g, "-").toLowerCase() || "evenement"}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Export réussi",
        description: "La liste des entreprises a été téléchargée.",
        className: "bg-green-600 text-white",
      });
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
    }
  };

  // ==================== FONCTIONS PRINCIPALES ====================

  useEffect(() => {
    if (event?.id) {
      fetchStandData();
    }
  }, [event?.id, user?.id]);

  useEffect(() => {
    if (standTypes.length > 0 && allRentals.length >= 0) {
      calculateStatistics();
    }
  }, [standTypes, allRentals]);

  useEffect(() => {
    let filtered = [...allRentals];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (rental) =>
          rental.company_name?.toLowerCase().includes(lowerSearch) ||
          rental.contact_person?.toLowerCase().includes(lowerSearch) ||
          rental.contact_email?.toLowerCase().includes(lowerSearch) ||
          rental.stand_number?.toLowerCase().includes(lowerSearch) ||
          rental.contact_phone?.toLowerCase().includes(lowerSearch) ||
          (rental.booking_code && rental.booking_code.toLowerCase().includes(lowerSearch))
      );
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(
        (rental) => rental.stand_type_id === selectedType
      );
    }

    setFilteredRentals(filtered);
  }, [allRentals, searchTerm, selectedType]);

  const calculateStatistics = () => {
    const totalStands = standTypes.reduce(
      (sum, type) => sum + (type.quantity_available || 0),
      0,
    );
    const totalRentals = allRentals.length;
    const totalRevenue = allRentals.reduce(
      (sum, rental) => sum + (rental.rental_amount_pi || 0),
      0,
    );
    const totalRevenueFcfa = totalRevenue * COIN_RATE;
    const totalCommission = totalRevenueFcfa * COMMISSION_RATE;
    const totalNetGain = totalRevenueFcfa - totalCommission;
    const occupancyRate =
      totalStands > 0 ? (totalRentals / totalStands) * 100 : 0;

    const byType = standTypes.map((type) => {
      const typeRentals = allRentals.filter((r) => r.stand_type_id === type.id);
      const rented = typeRentals.length;
      const available = type.quantity_available || 0;
      const revenue = typeRentals.reduce(
        (sum, r) => sum + (r.rental_amount_pi || 0),
        0,
      );
      const revenueFcfa = revenue * COIN_RATE;
      const commission = revenueFcfa * COMMISSION_RATE;
      const netGain = revenueFcfa - commission;
      const rate = available > 0 ? (rented / available) * 100 : 0;

      return {
        ...type,
        rented,
        available,
        revenue,
        revenueFcfa,
        commission,
        netGain,
        rate,
        remaining: available - rented,
      };
    });

    // Statistiques par entreprise
    const companyMap = new Map();
    allRentals.forEach((rental) => {
      if (rental.company_name && !companyMap.has(rental.company_name)) {
        companyMap.set(rental.company_name, {
          companyName: rental.company_name,
          contactPerson: rental.contact_person,
          contactEmail: rental.contact_email,
          contactPhone: rental.contact_phone,
          rentals: [],
          totalAmount: 0,
          bookingCodes: new Set(),
        });
      }
      if (rental.company_name) {
        const company = companyMap.get(rental.company_name);
        company.rentals.push(rental);
        company.totalAmount += rental.rental_amount_pi;
        if (rental.booking_code) {
          company.bookingCodes.add(rental.booking_code);
        }
      }
    });

    const byCompany = Array.from(companyMap.values()).map(company => ({
      ...company,
      bookingCodes: Array.from(company.bookingCodes)
    }));

    setStatistics({
      totalStands,
      totalRentals,
      totalRevenue,
      totalRevenueFcfa,
      totalCommission,
      totalNetGain,
      occupancyRate,
      byType,
      byCompany,
    });
  };

  const fetchStandData = async () => {
    setLoading(true);
    try {
      const { data: standEvent, error: standEventError } = await supabase
        .from("stand_events")
        .select("id")
        .eq("event_id", event.id)
        .maybeSingle();

      if (standEventError) throw standEventError;
      if (!standEvent) {
        setStandTypes([]);
        setLoading(false);
        return;
      }

      const { data: types, error: typesError } = await supabase
        .from("stand_types")
        .select("*")
        .eq("stand_event_id", standEvent.id)
        .eq("is_active", true)
        .order("calculated_price_pi", { ascending: true });

      if (typesError) throw typesError;
      setStandTypes(types || []);

      if (user) {
        // Récupérer TOUTES les réservations de l'utilisateur
        const { data: rentals, error: rentalError } = await supabase
          .from("stand_rentals")
          .select(
            "*, stand_types(name, size, amenities, base_price, base_currency, calculated_price_pi, description), profiles(full_name, phone)",
          )
          .eq("user_id", user.id)
          .eq("stand_event_id", standEvent.id)
          .order("created_at", { ascending: false });

        if (!rentalError) {
          setMyRentals(rentals || []);
        }

        if (isOrganizer) {
          const { data: allRentalsData, error: allRentalsError } =
            await supabase
              .from("stand_rentals")
              .select(
                `
              *,
              stand_types(name, size, base_price, base_currency, calculated_price_pi, description),
              profiles(full_name, phone)
            `,
              )
              .eq("stand_event_id", standEvent.id)
              .order("created_at", { ascending: false });

          if (!allRentalsError) {
            setAllRentals(allRentalsData || []);
            setFilteredRentals(allRentalsData || []);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching stand data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données des stands",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== FONCTIONS DU PANIER ====================

  const handleAddToCart = (type) => {
    if (isClosed) return;
    
    const available = type.quantity_available - (type.quantity_rented || 0);
    const inCart = cartStands.filter((t) => t.id === type.id).length;
    
    if (available - inCart <= 0) {
      toast({
        title: "Stock épuisé",
        description: "Plus de stands disponibles pour ce type.",
        variant: "destructive"
      });
      return;
    }

    setCartStands([...cartStands, type]);
    toast({
      title: "✅ Ajouté au panier",
      description: `1x ${type.name} ajouté à votre sélection.`,
      className: "bg-green-600 text-white",
    });
  };

  const handleRemoveFromCart = (index) => {
    const newCart = [...cartStands];
    newCart.splice(index, 1);
    setCartStands(newCart);
  };

  const updateQuantity = (typeId, newQuantity) => {
    const type = cartStands.find(t => t.id === typeId);
    if (!type) return;

    const currentCount = cartStands.filter(t => t.id === typeId).length;
    const available = type.quantity_available - (type.quantity_rented || 0);
    
    if (newQuantity > currentCount) {
      const toAdd = newQuantity - currentCount;
      if (currentCount + toAdd > available) {
        toast({
          title: "Stock insuffisant",
          description: `Seulement ${available} stand(s) disponible(s) au total.`,
          variant: "destructive"
        });
        return;
      }
      for (let i = 0; i < toAdd; i++) {
        setCartStands(prev => [...prev, type]);
      }
    } else if (newQuantity < currentCount) {
      const toRemove = currentCount - newQuantity;
      let removed = 0;
      setCartStands(prev => prev.filter(item => {
        if (item.id === typeId && removed < toRemove) {
          removed++;
          return false;
        }
        return true;
      }));
    }
  };

  const getCartTotal = () => {
    return cartStands.reduce((sum, item) => sum + item.calculated_price_pi, 0);
  };

  const getCartCountByType = (typeId) => {
    return cartStands.filter(t => t.id === typeId).length;
  };

  const clearCart = () => {
    setCartStands([]);
  };

  // ==================== FONCTION DE RÉSERVATION MULTIPLE ====================

  const handleRentMultipleStands = async () => {
    if (isClosed) return;
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour louer des stands.",
        variant: "destructive",
      });
      return;
    }
    if (cartStands.length === 0) return;

    setIsRenting(true);
    let successCount = 0;
    const bookingCode = generateBookingCode();

    try {
      const totalPi = getCartTotal();

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.coin_balance < totalPi) {
        toast({
          title: "Solde insuffisant",
          description: (
            <div className="mt-2 space-y-3">
              <div className="text-sm">
                <p>Total: {totalPi} π</p>
                <p>Votre solde: {profile.coin_balance} π</p>
              </div>
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  setIsRenting(false);
                  setIsCartOpen(false);
                  navigate("/packs");
                }}
              >
                Acheter des pièces
              </Button>
            </div>
          ),
          variant: "destructive",
        });
        setIsRenting(false);
        return;
      }

      const { data: standEvent, error: standEventError } = await supabase
        .from("stand_events")
        .select("id")
        .eq("event_id", event.id)
        .single();

      if (standEventError) throw standEventError;

      const rentalPromises = cartStands.map((stand) => {
        return supabase.rpc("rent_stand", {
          p_event_id: event.id,
          p_user_id: user.id,
          p_stand_type_id: stand.id,
          company_name: formData.companyName,
          contact_person: formData.contactPerson,
          contact_email: formData.email,
          contact_phone: formData.phone,
          business_description: formData.description,
          p_booking_code: bookingCode,
        });
      });

      const results = await Promise.all(rentalPromises);
      
      const hasError = results.some((r) => r.error || !r.data?.success);
      if (hasError) {
        throw new Error("Une ou plusieurs réservations ont échoué");
      }

      const qrData = JSON.stringify({
        bookingCode,
        company: formData.companyName,
        contact: formData.contactPerson,
        stands: cartStands.map(s => ({ name: s.name, price: s.calculated_price_pi })),
        total: totalPi,
        event: event.title,
        date: new Date().toISOString(),
      });
      await generateQRCode(qrData);

      toast({
        title: "✅ Réservations confirmées !",
        description: `${cartStands.length} stand(s) réservé(s) avec succès. Code: ${bookingCode}`,
        className: "bg-green-600 text-white",
      });

      setCartStands([]);
      setIsCartOpen(false);
      setFormData({
        companyName: "",
        contactPerson: "",
        email: user?.email || "",
        phone: "",
        description: "",
      });
      fetchStandData();
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error("Rental error:", error);
      toast({
        title: "Attention",
        description: error.message || "Erreur lors de la réservation.",
        variant: "destructive",
      });
      
      if (successCount > 0) {
        const failedStands = cartStands.slice(successCount);
        setCartStands(failedStands);
        fetchStandData();
        if (onRefresh) onRefresh();
      }
    } finally {
      setIsRenting(false);
    }
  };

  const viewRentalDetails = (rental) => {
    setSelectedRentalForDetails(rental);
    setIsDetailsDialogOpen(true);
  };

  const handleBuyCoins = () => {
    navigate("/packs");
  };

  if (loading)
    return (
      <div className="py-16 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400">Chargement des stands disponibles...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-8 pb-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" />
          {isOrganizer ? "Tableau de bord des Locations" : "Louer un stand"}
        </h2>
        <p className="text-gray-400 mt-1">
          {isOrganizer 
            ? "Gérez les locations de stands et suivez vos revenus pour cet événement." 
            : "Choisissez parmi les emplacements disponibles pour exposer lors de l'événement."}
        </p>
      </div>

      {/* --- PANIER (pour les non-organisateurs) --- */}
      {!isOrganizer && cartStands.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-20 z-40 mb-8"
        >
          <Card className="bg-gray-900 border border-primary/50 shadow-2xl overflow-hidden backdrop-blur-xl bg-opacity-90">
            <CardHeader className="py-4 border-b border-gray-800 bg-primary/10">
              <CardTitle className="text-white flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Votre Panier
                  <Badge className="bg-primary hover:bg-primary ml-2">{cartStands.length}</Badge>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">{getCartTotal()} π</span>
                  <p className="text-xs text-gray-400 font-normal mt-0.5">
                    ≈ {(getCartTotal() * COIN_RATE).toLocaleString()} FCFA
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 max-h-[40vh] overflow-y-auto custom-scrollbar space-y-3">
              {Array.from(new Set(cartStands.map(s => s.id))).map(typeId => {
                const type = cartStands.find(s => s.id === typeId);
                const count = cartStands.filter(s => s.id === typeId).length;
                const colors = STAND_COLORS[standTypes.findIndex(t => t.id === typeId) % STAND_COLORS.length];
                
                return (
                  <div key={typeId} className="flex justify-between items-center bg-gray-800/40 p-3 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${colors.iconBg} flex items-center justify-center text-xs font-bold ${colors.text}`}>
                        {count}
                      </div>
                      <div>
                        <p className="text-white font-medium">{type.name}</p>
                        <p className="text-xs text-gray-400">{type.calculated_price_pi} π / unité</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-gray-700 rounded">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(typeId, count - 1)}
                          className="h-8 px-2 text-gray-400 hover:text-white"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-white">{count}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(typeId, count + 1)}
                          className="h-8 px-2 text-gray-400 hover:text-white"
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCartStands(prev => prev.filter(s => s.id !== typeId));
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
            <CardFooter className="bg-gray-900/50 border-t border-gray-800 pt-4">
              <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button className="w-full text-base font-bold h-12 shadow-lg hover:shadow-primary/20 transition-all">
                    Passer à la caisse <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-gray-900 border-gray-800 text-white w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="text-white flex items-center gap-2 text-xl">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      Finaliser votre commande
                    </SheetTitle>
                    <SheetDescription className="text-gray-400">
                      {cartStands.length} stand{cartStands.length > 1 ? "s" : ""} dans votre panier
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-6">
                    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                      <h4 className="font-medium text-white mb-3">Récapitulatif</h4>
                      <div className="space-y-2">
                        {Array.from(new Set(cartStands.map(s => s.id))).map(typeId => {
                          const type = cartStands.find(s => s.id === typeId);
                          const count = cartStands.filter(s => s.id === typeId).length;
                          return (
                            <div key={typeId} className="flex justify-between text-sm">
                              <span className="text-gray-400">{type.name} x{count}</span>
                              <span className="text-white">{type.calculated_price_pi * count} π</span>
                            </div>
                          );
                        })}
                        <div className="border-t border-gray-700 pt-2 mt-2">
                          <div className="flex justify-between font-bold">
                            <span className="text-white">Total</span>
                            <span className="text-primary">{getCartTotal()} π</span>
                          </div>
                          <div className="text-xs text-gray-400 text-right mt-1">
                            ≈ {(getCartTotal() * COIN_RATE).toLocaleString()} FCFA
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Entreprise / Marque <span className="text-red-400">*</span></Label>
                        <Input
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="Nom de votre structure"
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-gray-300">Personne à contacter <span className="text-red-400">*</span></Label>
                          <Input
                            value={formData.contactPerson}
                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                            placeholder="Prénom Nom"
                            className="bg-gray-800 border-gray-700 text-white mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300">Téléphone <span className="text-red-400">*</span></Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+225..."
                            className="bg-gray-800 border-gray-700 text-white mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-300">Email de confirmation</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Description activité</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={2}
                          className="bg-gray-800 border-gray-700 text-white mt-1 resize-none"
                          placeholder="Décrivez brièvement ce que vous allez exposer..."
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleRentMultipleStands}
                      disabled={
                        isRenting ||
                        !formData.companyName ||
                        !formData.contactPerson ||
                        !formData.phone ||
                        cartStands.length === 0
                      }
                      className="w-full bg-primary hover:bg-primary/90 h-12 text-base font-bold"
                    >
                      {isRenting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        `Payer ${getCartTotal()} π et confirmer`
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full text-gray-400 hover:text-white"
                      onClick={() => setIsCartOpen(false)}
                    >
                      Annuler
                    </Button>

                    <p className="text-center text-sm text-gray-400">
                      Pas assez de pièces ?{" "}
                      <Button
                        variant="link"
                        className="text-primary hover:text-primary/80 p-0 h-auto font-normal"
                        onClick={handleBuyCoins}
                      >
                        Acheter des pièces
                      </Button>
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </CardFooter>
          </Card>
        </motion.div>
      )}

      {/* --- TABLEAU DE BORD ORGANISATEUR --- */}
      {isOrganizer && standTypes.length > 0 && (
        <div className="space-y-8">
          <Card className="bg-gray-900 border-gray-800 shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="border-b border-gray-800 bg-gray-800/30 py-5">
              <CardTitle className="text-white text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Aperçu Global des Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700/50 shadow-sm hover:shadow-md hover:border-gray-600 transition-all duration-300">
                  <p className="text-sm text-gray-400 flex items-center gap-2 mb-3 font-medium">
                    <Package className="w-4 h-4 text-gray-300" /> Stands loués
                  </p>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {statistics.totalRentals}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    sur {statistics.totalStands} disponibles
                  </p>
                </div>

                <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700/50 shadow-sm hover:shadow-md hover:border-blue-900/50 transition-all duration-300">
                  <p className="text-sm text-gray-400 flex items-center gap-2 mb-3 font-medium">
                    <Coins className="w-4 h-4 text-blue-400" /> Revenus bruts
                  </p>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {statistics.totalRevenue} <span className="text-xl text-blue-400 font-medium">π</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    ≈ {statistics.totalRevenueFcfa.toLocaleString()} FCFA
                  </p>
                </div>

                {/* <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700/50 shadow-sm hover:shadow-md hover:border-orange-900/50 transition-all duration-300">
                  <p className="text-sm text-gray-400 flex items-center gap-2 mb-3 font-medium">
                    <Percent className="w-4 h-4 text-orange-400" /> Frais plateforme
                  </p>
                  <p className="text-3xl font-bold text-orange-400 tracking-tight">
                    -{statistics.totalCommission.toFixed(0)} <span className="text-xl text-orange-400/70 font-medium">F</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2 font-medium">Commission de 5%</p>
                </div> */}

                {/* <div className="bg-green-950/20 p-6 rounded-xl border border-green-900/30 shadow-md hover:shadow-lg hover:border-green-900/60 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all"></div>
                  <p className="text-sm text-gray-300 flex items-center gap-2 mb-3 font-medium relative z-10">
                    <Wallet className="w-4 h-4 text-green-400" /> Vos gains nets
                  </p>
                  <p className="text-3xl font-bold text-green-400 tracking-tight relative z-10">
                    {statistics.totalNetGain.toFixed(0)} <span className="text-xl text-green-400/70 font-medium">F</span>
                  </p>
                  <p className="text-xs text-green-500/60 mt-2 font-medium relative z-10">Après commission (95%)</p>
                </div> */}

                <div className="bg-gray-800/40 p-6 rounded-xl border border-gray-700/50 shadow-sm hover:shadow-md hover:border-purple-900/50 transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <p className="text-sm text-gray-400 flex items-center gap-2 mb-3 font-medium">
                      <Grid3x3 className="w-4 h-4 text-purple-400" /> Occupation
                    </p>
                    <p className="text-3xl font-bold text-white tracking-tight mb-3">
                      {statistics.occupancyRate.toFixed(1)}%
                    </p>
                  </div>
                  <Progress
                    value={statistics.occupancyRate}
                    className="h-2 bg-gray-700 [&>div]:bg-purple-500"
                  />
                </div>
              </div>

              <div className="mt-10">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2 text-lg">
                  <Layout className="w-5 h-5 text-gray-400" />
                  Détail par type de stand
                </h4>
                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/50 shadow-sm">
                  <Table>
                    <TableHeader className="bg-gray-800/80">
                      <TableRow className="border-gray-800 hover:bg-transparent">
                        <TableHead className="text-gray-300 font-medium py-4">Type</TableHead>
                        <TableHead className="text-gray-300 font-medium text-center">Dimensions</TableHead>
                        <TableHead className="text-gray-300 font-medium text-center">Prix unitaire</TableHead>
                        <TableHead className="text-gray-300 font-medium text-center">Disponibles</TableHead>
                        <TableHead className="text-gray-300 font-medium text-center">Réservés</TableHead>
                        <TableHead className="text-gray-300 font-medium text-center w-40">Occupation</TableHead>
                        <TableHead className="text-gray-300 font-medium text-right">Revenus bruts</TableHead>
                        <TableHead className="text-gray-300 font-medium text-right pr-6">Gains nets (F)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.byType.map((type, index) => {
                        const colors = STAND_COLORS[index % STAND_COLORS.length];
                        return (
                          <TableRow
                            key={type.id}
                            className="border-gray-800 hover:bg-gray-800/40 transition-colors"
                          >
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${colors.bgSolid} border border-transparent`} />
                                <span className={`font-semibold ${colors.text}`}>{type.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-gray-300 text-sm">
                              {type.size || "N/A"}
                            </TableCell>
                            <TableCell className="text-center text-white font-medium">
                              {type.calculated_price_pi} π
                            </TableCell>
                            <TableCell className="text-center text-gray-400">
                              {type.quantity_available}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`border ${colors.borderLight} ${colors.bg} ${colors.text} font-bold`}>
                                {type.rented}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-3">
                                <span className="text-gray-300 text-xs w-10 text-right font-medium">
                                  {type.rate.toFixed(0)}%
                                </span>
                                <Progress
                                  value={type.rate}
                                  className={`w-16 h-1.5 bg-gray-800 ${colors.progress}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {type.revenue} π
                              <span className="block text-xs text-gray-500 font-normal mt-0.5">{(type.revenue * COIN_RATE).toLocaleString()} F</span>
                            </TableCell>
                            <TableCell className="text-right text-green-400 font-bold pr-6">
                              {type.netGain.toLocaleString()} F
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {statistics.byCompany.length > 0 && (
                <div className="mt-10">
                  <h4 className="text-white font-semibold mb-4 flex items-center gap-2 text-lg">
                    <Building className="w-5 h-5 text-gray-400" />
                    Entreprises participantes
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/50 shadow-sm">
                    <Table>
                      <TableHeader className="bg-gray-800/80">
                        <TableRow className="border-gray-800 hover:bg-transparent">
                          <TableHead className="text-gray-300 font-medium py-4">Entreprise</TableHead>
                          <TableHead className="text-gray-300 font-medium">Personne à contacter</TableHead>
                          <TableHead className="text-gray-300 font-medium">Email</TableHead>
                          <TableHead className="text-gray-300 font-medium">Téléphone</TableHead>
                          <TableHead className="text-gray-300 font-medium text-center">Stands</TableHead>
                          <TableHead className="text-gray-300 font-medium">Code(s)</TableHead>
                          <TableHead className="text-gray-300 font-medium text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statistics.byCompany.slice(0, 5).map((company, index) => {
                          const colors = STAND_COLORS[index % STAND_COLORS.length];
                          return (
                            <TableRow key={company.companyName} className="border-gray-800 hover:bg-gray-800/40">
                              <TableCell className="py-4">
                                <div className="flex items-center gap-2">
                                  <Building className={`w-4 h-4 ${colors.text}`} />
                                  <span className="text-white font-medium">{company.companyName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-300">{company.contactPerson}</TableCell>
                              <TableCell className="text-gray-300">{company.contactEmail}</TableCell>
                              <TableCell className="text-gray-300">{company.contactPhone}</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-green-900 text-green-200">
                                  {company.rentals.length}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {company.bookingCodes.slice(0, 2).map((code, i) => (
                                    <code key={i} className="text-xs bg-gray-800 px-1 py-0.5 rounded">
                                      {code}
                                    </code>
                                  ))}
                                  {company.bookingCodes.length > 2 && (
                                    <span className="text-xs text-gray-500">+{company.bookingCodes.length - 2}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-white font-medium">
                                {company.totalAmount} π
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {statistics.byCompany.length > 5 && (
                      <div className="p-3 text-center border-t border-gray-800">
                        <Button variant="link" className="text-primary" onClick={exportCompanyList}>
                          Voir toutes les entreprises ({statistics.byCompany.length})
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- MES RÉSERVATIONS (pour les exposants) --- */}
      {!isOrganizer && myRentals.length > 0 && (
        <div className="space-y-6 mb-12">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-4">
            <Bookmark className="w-6 h-6 text-primary" /> Mes Réservations ({myRentals.length})
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {myRentals.map((rental, index) => {
              const typeIndex = standTypes.findIndex((t) => t.id === rental.stand_type_id);
              const colors = STAND_COLORS[typeIndex >= 0 ? typeIndex % STAND_COLORS.length : 0];
              const activeTab = activeTabs[rental.id] || "details";

              return (
                <motion.div
                  key={rental.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="h-full"
                >
                  <Card className={`bg-gray-900 border-l-4 ${colors.border} border-gray-800 h-full flex flex-col hover:border-gray-700 transition-colors`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            Stand {rental.stand_number}
                            <Badge className={colors.badge}>
                              {rental.stand_types?.name}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Tag className="w-3 h-3" />
                            Code: {rental.booking_code || "N/A"}
                          </CardDescription>
                        </div>
                        <BadgeCheck className={`w-6 h-6 ${colors.text}`} />
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex gap-1.5 mb-4 border-b border-gray-800 pb-2 overflow-x-auto">
                        <button
                          onClick={() => setTabForRental(rental.id, "details")}
                          className={`px-3 py-1.5 font-medium text-xs rounded-md transition-all whitespace-nowrap ${
                            activeTab === "details"
                              ? `bg-gray-800 ${colors.text}`
                              : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                          }`}
                        >
                          <Store className="w-3.5 h-3.5 inline-block mr-1.5" />
                          Stand
                        </button>
                        <button
                          onClick={() => setTabForRental(rental.id, "entreprise")}
                          className={`px-3 py-1.5 font-medium text-xs rounded-md transition-all whitespace-nowrap ${
                            activeTab === "entreprise"
                              ? `bg-gray-800 ${colors.text}`
                              : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                          }`}
                        >
                          <Building className="w-3.5 h-3.5 inline-block mr-1.5" />
                          Entreprise
                        </button>
                      </div>

                      {activeTab === "details" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                                <Tag className="w-3 h-3" /> Type
                              </p>
                              <p className="text-sm font-medium text-white truncate">{rental.stand_types?.name}</p>
                              <p className="text-[11px] text-gray-400">{rental.stand_types?.size}</p>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                                <CreditCard className="w-3 h-3" /> Payé
                              </p>
                              <p className="text-sm font-bold text-white">{rental.rental_amount_pi} π</p>
                              <p className="text-[11px] text-gray-400">{(rental.rental_amount_pi * COIN_RATE).toLocaleString()} F</p>
                            </div>
                          </div>
                          <div className="bg-black/30 rounded-lg p-3">
                            <p className="text-[10px] text-gray-500 mb-1">Date de réservation</p>
                            <p className="text-xs text-white">
                              {new Date(rental.created_at).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric"
                              })}
                            </p>
                          </div>
                        </div>
                      )}

                      {activeTab === "entreprise" && (
                        <div className="space-y-2">
                          <div className="bg-black/30 rounded-lg p-3 flex justify-between items-center">
                            <div>
                              <p className="text-[10px] text-gray-500">Entreprise</p>
                              <p className="text-sm text-white font-medium">{rental.company_name}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(rental.company_name, "Entreprise")} className="h-6 w-6 text-gray-500 hover:text-white">
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-[10px] text-gray-500">Personne à contacter</p>
                              <p className="text-xs text-white truncate">{rental.contact_person}</p>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-[10px] text-gray-500">Téléphone</p>
                              <p className="text-xs text-white truncate">{rental.contact_phone || "N/A"}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="border-t border-gray-800 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewRentalDetails(rental)}
                        className="w-full border-gray-700 text-gray-300 hover:text-white"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir détails complets
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- STANDS DISPONIBLES (pour les exposants sans réservation) --- */}
      {!isOrganizer && myRentals.length === 0 && (
        <>
          {!isUnlocked ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Contenu Verrouillé</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Vous devez débloquer l'accès à cet événement pour pouvoir consulter et réserver des stands.
                </p>
              </CardContent>
            </Card>
          ) : standTypes.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Store className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Aucun stand disponible</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  L'organisateur n'a pas encore configuré de stands pour cet événement.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              <h3 className="text-xl font-bold text-white mb-6">Stands disponibles à la réservation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {standTypes.map((type, index) => {
                  const available = type.quantity_available - (type.quantity_rented || 0);
                  const isSoldOut = available <= 0;
                  const colors = STAND_COLORS[index % STAND_COLORS.length];
                  const inCartCount = getCartCountByType(type.id);

                  return (
                    <motion.div
                      key={type.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="h-full"
                    >
                      <Card className={`bg-gray-900 border-t-4 ${colors.border} border-x-gray-800 border-b-gray-800 h-full flex flex-col hover:shadow-xl ${colors.shadow} transition-all duration-300 relative overflow-hidden group`}>
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${colors.gradient} rounded-full blur-2xl -mr-10 -mt-10 opacity-30 group-hover:opacity-60 transition-opacity`} />
                        
                        <CardHeader className="border-b border-gray-800/50 pb-4 relative z-10">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <CardTitle className={`text-xl font-bold ${colors.text} leading-tight`}>
                                {type.name}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-1.5 mt-2 text-gray-400 font-medium">
                                <Layout className="w-3.5 h-3.5" />
                                {type.size || "Dimensions non spécifiées"}
                              </CardDescription>
                            </div>
                            <Badge
                              variant={isClosed ? "outline" : isSoldOut ? "destructive" : "secondary"}
                              className={`shrink-0 ${isClosed ? "border-gray-600 text-gray-400" : isSoldOut ? "bg-red-950 text-red-400 border border-red-900" : `${colors.bg} ${colors.text} border ${colors.borderLight}`}`}
                            >
                              {isClosed ? "Terminé" : isSoldOut ? "Complet" : `${available - inCartCount} dispo.`}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="flex-1 pt-5 relative z-10">
                          <p className="text-sm text-gray-300 mb-5 leading-relaxed line-clamp-3" title={type.description}>
                            {type.description || "Aucune description fournie pour ce type de stand."}
                          </p>

                          {type.amenities && Object.keys(type.amenities).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {Object.entries(type.amenities)
                                .filter(([, v]) => v)
                                .map(([k]) => (
                                  <Badge key={k} variant="outline" className="border-gray-700 text-gray-400 bg-gray-800/50 text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5">
                                    {k.replace(/_/g, " ")}
                                  </Badge>
                                ))}
                            </div>
                          )}
                        </CardContent>

                        <CardFooter className="border-t border-gray-800/50 pt-5 relative z-10 bg-gray-900/50">
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Tarif</p>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-white">{type.calculated_price_pi}</span>
                                <span className={`text-sm font-medium ${colors.text}`}>π</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                ≈ {(type.calculated_price_pi * COIN_RATE).toLocaleString()} FCFA
                              </p>
                            </div>

                            {isClosed ? (
                              <Button disabled variant="outline" className="border-gray-700 bg-gray-800/50 text-gray-500 rounded-full px-6">Terminé</Button>
                            ) : isSoldOut ? (
                              <Button disabled variant="outline" className="border-red-900/50 bg-red-950/30 text-red-500 rounded-full px-6">Complet</Button>
                            ) : (
                              <Button 
                                onClick={() => handleAddToCart(type)}
                                size="sm"
                                variant={inCartCount > 0 ? "outline" : "default"}
                                className={inCartCount > 0 ? `border-${colors.text} ${colors.text}` : `${colors.bgSolid} ${colors.bgHover} text-white`}
                              >
                                {inCartCount > 0 ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {inCartCount} au panier
                                  </>
                                ) : (
                                  <>
                                    <PlusCircle className="w-3 h-3 mr-1" />
                                    Ajouter
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* --- STANDS DISPONIBLES (pour les exposants AVEC réservation) --- */}
      {!isOrganizer && myRentals.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            Vous pouvez aussi réserver d'autres stands
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {standTypes
              .filter(type => {
                const available = type.quantity_available - (type.quantity_rented || 0);
                return available > 0;
              })
              .map((type, index) => {
                const available = type.quantity_available - (type.quantity_rented || 0);
                const colors = STAND_COLORS[index % STAND_COLORS.length];
                const inCartCount = getCartCountByType(type.id);

                return (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`bg-gray-900 border-l-4 ${colors.border} border-gray-800 hover:shadow-xl transition-all`}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className={`text-lg font-bold ${colors.text}`}>{type.name}</CardTitle>
                          <Badge className={colors.badge}>{available - inCartCount} dispo.</Badge>
                        </div>
                        <CardDescription className="text-xs text-gray-400">{type.size}</CardDescription>
                      </CardHeader>
                      <CardContent className="py-2">
                        <p className="text-xs text-gray-300 line-clamp-2">{type.description}</p>
                      </CardContent>
                      <CardFooter className="border-t border-gray-800 pt-3">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg font-bold text-white">{type.calculated_price_pi} π</span>
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(type)}
                            variant={inCartCount > 0 ? "outline" : "default"}
                            className={inCartCount > 0 ? `border-${colors.text} ${colors.text}` : `${colors.bgSolid} ${colors.bgHover} text-white`}
                          >
                            {inCartCount > 0 ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {inCartCount} au panier
                              </>
                            ) : (
                              "Ajouter"
                            )}
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
          </div>
        </div>
      )}

      {/* --- ORGANIZER: TOUTES LES RÉSERVATIONS --- */}
      {isOrganizer && allRentals.length > 0 && (
        <Card className="bg-gray-900 border-gray-800 shadow-xl rounded-xl mt-12 overflow-hidden">
          <CardHeader className="border-b border-gray-800 bg-gray-800/20 py-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Toutes les Réservations
                </CardTitle>
                <CardDescription className="text-gray-400 mt-1">
                  {allRentals.length} réservation{allRentals.length > 1 ? "s" : ""} · {statistics.byCompany.length} entreprise{statistics.byCompany.length > 1 ? "s" : ""}
                </CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportCompanyListExcel}
                  className="flex-1 sm:flex-none border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <FileDown className="w-4 h-4 mr-2" /> Excel Entreprises
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportToExcel}
                  className="flex-1 sm:flex-none border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <FileDown className="w-4 h-4 mr-2" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={isExporting} className="flex-1 sm:flex-none border-gray-700 bg-gray-800 text-white hover:bg-gray-700">
                  {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />} PDF
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Rechercher (Entreprise, contact, email, N° stand, code)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-gray-950 border-gray-700 text-white focus-visible:ring-primary w-full"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-64"
              >
                <option value="all">Tous les types de stands</option>
                {standTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredRentals.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-lg font-medium text-white">Aucune réservation trouvée</p>
                <p className="text-gray-400 mt-1">Modifiez vos critères de recherche.</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-gray-800/30">
                    <TableRow className="border-gray-800 hover:bg-transparent">
                      <TableHead className="text-gray-400 font-medium py-4 px-6">N° Stand</TableHead>
                      <TableHead className="text-gray-400 font-medium py-4 px-6">Entreprise</TableHead>
                      <TableHead className="text-gray-400 font-medium py-4 px-6">Personne à contacter</TableHead>
                      <TableHead className="text-gray-400 font-medium py-4 px-6">Code</TableHead>
                      <TableHead className="text-gray-400 font-medium py-4 px-6">Type</TableHead>
                      <TableHead className="text-gray-400 font-medium py-4 px-6 text-right">Prix</TableHead>
                      <TableHead className="text-gray-400 font-medium py-4 px-6 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRentals.map((rental) => {
                      const typeIndex = standTypes.findIndex((t) => t.id === rental.stand_type_id);
                      const colors = STAND_COLORS[typeIndex >= 0 ? typeIndex % STAND_COLORS.length : 0];

                      return (
                        <TableRow key={rental.id} className="border-gray-800 hover:bg-gray-800/40 transition-colors group">
                          <TableCell className={`font-bold ${colors.text} px-6 py-4`}>
                            {rental.stand_number}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="text-white font-medium">{rental.company_name}</div>
                            {rental.business_description && (
                              <div className="text-xs text-gray-500 truncate max-w-[200px]" title={rental.business_description}>
                                {rental.business_description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="text-gray-300 flex items-center gap-2">
                              <UserCircle className="w-4 h-4 text-gray-500 shrink-0" />
                              <span className="truncate max-w-[150px]">{rental.contact_person}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                              {rental.booking_code || "N/A"}
                            </code>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge className={colors.badge}>
                              {rental.stand_types?.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right px-6 py-4">
                            <div className="text-white font-medium whitespace-nowrap">{rental.rental_amount_pi} π</div>
                            <div className="text-gray-500 text-xs whitespace-nowrap">{(rental.rental_amount_pi * COIN_RATE).toLocaleString()} F</div>
                          </TableCell>
                          <TableCell className="text-center px-6 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white">
                                <DropdownMenuItem
                                  onClick={() => viewRentalDetails(rental)}
                                  className="hover:bg-gray-700 cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Voir détails
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const text = `Stand: ${rental.stand_number}\nCode: ${rental.booking_code}\nEntreprise: ${rental.company_name}\nPersonne à contacter: ${rental.contact_person}\nEmail: ${rental.contact_email}\nTél: ${rental.contact_phone}`;
                                    copyToClipboard(text, "Infos réservation");
                                  }}
                                  className="hover:bg-gray-700 cursor-pointer"
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copier
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {filteredRentals.length > 0 && (
              <div className="p-4 border-t border-gray-800 bg-gray-900 text-sm text-gray-400 text-right">
                Affichage de {filteredRentals.length} sur {allRentals.length} réservation(s)
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* --- DIALOG DÉTAILS RÉSERVATION (avec QR code) --- */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Détails complets de la réservation
            </DialogTitle>
          </DialogHeader>

          {selectedRentalForDetails && (
            <div className="space-y-4">
              {qrCodeUrl && selectedRentalForDetails.id === selectedRentalForDetails.id && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img src={qrCodeUrl} alt="QR Code de réservation" className="w-32 h-32" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Stand</p>
                  <p className="text-xl font-bold text-white">
                    {selectedRentalForDetails.stand_number}
                  </p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Code réservation</p>
                  <p className="text-sm font-mono text-white break-all">
                    {selectedRentalForDetails.booking_code || "N/A"}
                  </p>
                </div>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" /> Entreprise
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nom:</span>
                    <span className="text-white font-medium">{selectedRentalForDetails.company_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Personne à contacter:</span>
                    <span className="text-white">{selectedRentalForDetails.contact_person}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{selectedRentalForDetails.contact_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Téléphone:</span>
                    <span className="text-white">
                      {selectedRentalForDetails.contact_phone || 
                       selectedRentalForDetails.profiles?.phone || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary" /> Location
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type de stand:</span>
                    <span className="text-white">{selectedRentalForDetails.stand_types?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dimensions:</span>
                    <span className="text-white">{selectedRentalForDetails.stand_types?.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date de réservation:</span>
                    <span className="text-white">
                      {new Date(selectedRentalForDetails.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                    <span className="text-gray-400 font-bold">Prix total:</span>
                    <span className="text-white font-bold text-lg">
                      {selectedRentalForDetails.rental_amount_pi} π
                      <span className="text-sm text-gray-400 ml-2 font-normal">
                        ({(selectedRentalForDetails.rental_amount_pi * COIN_RATE).toLocaleString()} FCFA)
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {selectedRentalForDetails.business_description && (
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" /> Activité / Produits exposés
                  </h4>
                  <p className="text-gray-300">{selectedRentalForDetails.business_description}</p>
                </div>
              )}

              {selectedRentalForDetails.stand_types?.amenities && 
               Object.keys(selectedRentalForDetails.stand_types.amenities).length > 0 && (
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" /> Équipements inclus
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedRentalForDetails.stand_types.amenities)
                      .filter(([, v]) => v)
                      .map(([k]) => (
                        <Badge key={k} variant="outline" className="border-gray-600 text-gray-300 bg-gray-800">
                          {k.replace(/_/g, " ")}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedRentalForDetails) {
                  const text = `Stand: ${selectedRentalForDetails.stand_number}\nCode: ${selectedRentalForDetails.booking_code}\nEntreprise: ${selectedRentalForDetails.company_name}`;
                  copyToClipboard(text, "Infos");
                }
              }}
              className="border-gray-700 text-gray-300 hover:text-white"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copier
            </Button>
            <Button
              onClick={() => setIsDetailsDialogOpen(false)}
              className="bg-primary hover:bg-primary/90"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StandRentalInterface;