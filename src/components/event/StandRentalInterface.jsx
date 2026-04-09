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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Layout,
  Lock,
  ArrowRight,
  Building,
  Package,
  Copy,
  Printer,
  BadgeCheck,
  Briefcase,
  Tag,
  UserCircle,
  CreditCard,
  Ticket,
  FileDown,
  Search,
  BarChart3,
  Coins,
  Grid3x3,
  ShoppingCart,
  PlusCircle,
  Trash2,
   Users,
  Bookmark,
  Eye,
  MoreVertical,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

const StandRentalInterface = ({ event, isUnlocked, onRefresh, isClosed }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [standTypes, setStandTypes] = useState([]);
  const [myRentals, setMyRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartStands, setCartStands] = useState([]);
  const [isRenting, setIsRenting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [allRentals, setAllRentals] = useState([]);
  const [filteredRentals, setFilteredRentals] = useState([]);
  const [activeTabs, setActiveTabs] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedRentalForDetails, setSelectedRentalForDetails] =
    useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
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
const COMMISSION_RATE = 0; // plus de commission
  const isOrganizer = user?.id === event?.organizer_id;

  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: user?.email || "",
    phone: "",
    description: "",
  });

  // ==================== UTILITAIRES ====================
  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "✅ Copié !",
        description: `${label} copié.`,
        className: "bg-green-600 text-white",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier.",
        variant: "destructive",
      });
    }
  };
  const generateUniqueBookingCode = async (retries = 3) => {
    const generate = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    for (let attempt = 0; attempt < retries; attempt++) {
      const code = generate();
      const { data, error } = await supabase
        .from("stand_rentals")
        .select("booking_code")
        .eq("booking_code", code)
        .maybeSingle();
      if (error || !data) return code;
    }
    // Fallback : code basé sur timestamp (plus long mais unique)
    return "R" + Date.now().toString(36).slice(-3).toUpperCase();
  };

  const generateQRCode = async (text) => {
    try {
      return await QRCode.toDataURL(text);
    } catch (err) {
      console.error("QR Code error:", err);
      return null;
    }
  };

  // ==================== EXPORTS ====================
  const exportToExcel = () => {
    if (!filteredRentals.length) return;
    const data = filteredRentals.map((r) => ({
      "N° Stand": r.stand_number,
      Entreprise: r.company_name,
      Description: r.business_description || "",
      "Personne à Contact": r.contact_person,
      Email: r.contact_email,
      Téléphone: r.contact_phone,
      "Code Réservation": r.booking_code || "",
      "Type Stand": r.stand_types?.name || "",
      "Montant (π)": r.rental_amount_pi,
      "Montant (F CFA)": r.rental_amount_pi * COIN_RATE,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Réservations");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      "reservations_stands.xlsx",
    );
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(
        `Réservations de stands - ${event?.title || "Événement"}`,
        14,
        20,
      );
      doc.setFontSize(10);
      doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 28);
      doc.setFontSize(12);
      doc.text("Résumé des locations", 14, 40);
      doc.text(`Total réservations: ${filteredRentals.length}`, 14, 48);
      doc.text(
        `Revenu total: ${filteredRentals.reduce((s, r) => s + r.rental_amount_pi, 0)} π`,
        14,
        55,
      );
      const tableColumn = [
        "Stand",
        "Entreprise",
        "Contact",
        "Email",
        "Téléphone",
        "Type",
        "Code",
        "Prix (π)",
      ];
      const tableRows = filteredRentals.map((r) => [
        r.stand_number,
        r.company_name || "N/A",
        r.contact_person || "N/A",
        r.contact_email || "N/A",
        r.contact_phone || r.profiles?.phone || "N/A",
        r.stand_types?.name || "N/A",
        r.booking_code || "N/A",
        r.rental_amount_pi.toString(),
      ]);
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 65,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 },
      });
      doc.save(
        `reservations-stands-${event?.title?.replace(/\s+/g, "-").toLowerCase() || "evenement"}.pdf`,
      );
      toast({
        title: "✅ Export réussi",
        description: "PDF téléchargé.",
        className: "bg-green-600 text-white",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Export PDF impossible.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportCompanyListExcel = () => {
    if (!statistics.byCompany.length) return;
    const data = statistics.byCompany.map((c) => ({
      Entreprise: c.companyName,
      "Personne à contacter": c.contactPerson,
      Email: c.contactEmail,
      Téléphone: c.contactPhone,
      "Nombre de stands": c.rentals.length,
      "Montant total (π)": c.totalAmount,
      "Montant total (F CFA)": c.totalAmount * COIN_RATE,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Entreprises");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      "liste_entreprises_stands.xlsx",
    );
  };

  // ==================== DONNÉES & STATISTIQUES ====================
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
        const { data: rentals, error: rentalError } = await supabase
          .from("stand_rentals")
          .select(
            "*, stand_types(name, size, amenities, base_price, base_currency, calculated_price_pi, description), profiles(full_name, phone)",
          )
          .eq("user_id", user.id)
          .eq("stand_event_id", standEvent.id)
          .order("created_at", { ascending: false });
        if (!rentalError) setMyRentals(rentals || []);

        if (isOrganizer) {
          const { data: allRentalsData, error: allRentalsError } =
            await supabase
              .from("stand_rentals")
              .select(
                "*, stand_types(name, size, base_price, base_currency, calculated_price_pi, description), profiles(full_name, phone)",
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
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les stands.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

const calculateStatistics = () => {
  const totalStands = standTypes.reduce(
    (sum, t) => sum + (t.quantity_available || 0),
    0,
  );
  const totalRentals = allRentals.length;
  const totalRevenue = allRentals.reduce(
    (sum, r) => sum + (r.rental_amount_pi || 0),
    0,
  );
  const totalRevenueFcfa = totalRevenue * COIN_RATE;
  const totalCommission = 0; // plus de commission
  const totalNetGain = totalRevenueFcfa; // 100% pour l'organisateur
  const occupancyRate =
    totalStands > 0 ? (totalRentals / totalStands) * 100 : 0;

  const byType = standTypes.map((type) => {
    const typeRentals = allRentals.filter((r) => r.stand_type_id === type.id);
    const rented = typeRentals.length;
    const available = type.quantity_available || 0;
    const revenue = typeRentals.reduce(
      (s, r) => s + (r.rental_amount_pi || 0),
      0,
    );
    const revenueFcfa = revenue * COIN_RATE;
    const commission = 0; // suppression commission
    const netGain = revenueFcfa; // net = brut
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

  const companyMap = new Map();
  allRentals.forEach((rental) => {
    if (!rental.company_name) return;
    if (!companyMap.has(rental.company_name)) {
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
    const company = companyMap.get(rental.company_name);
    company.rentals.push(rental);
    company.totalAmount += rental.rental_amount_pi;
    if (rental.booking_code) company.bookingCodes.add(rental.booking_code);
  });
  const byCompany = Array.from(companyMap.values()).map((c) => ({
    ...c,
    bookingCodes: Array.from(c.bookingCodes),
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

  useEffect(() => {
    if (event?.id) fetchStandData();
  }, [event?.id, user?.id]);

  useEffect(() => {
    if (standTypes.length > 0 || allRentals.length >= 0) calculateStatistics();
  }, [standTypes, allRentals]);

  useEffect(() => {
    let filtered = [...allRentals];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((r) =>
        [
          r.company_name,
          r.contact_person,
          r.contact_email,
          r.stand_number,
          r.booking_code,
        ].some((f) => f?.toLowerCase().includes(lower)),
      );
    }
    if (selectedType !== "all")
      filtered = filtered.filter((r) => r.stand_type_id === selectedType);
    setFilteredRentals(filtered);
  }, [allRentals, searchTerm, selectedType]);

  // ==================== PANIER ====================
  const handleAddToCart = (type) => {
    if (isClosed) return;
    const available = type.quantity_available - (type.quantity_rented || 0);
    const inCart = cartStands.filter((t) => t.id === type.id).length;
    if (available - inCart <= 0) {
      toast({
        title: "Stock épuisé",
        description: "Plus de stands disponibles.",
        variant: "destructive",
      });
      return;
    }
    setCartStands([...cartStands, type]);
    toast({
      title: "✅ Ajouté",
      description: `1x ${type.name} ajouté.`,
      className: "bg-green-600 text-white",
    });
  };

  const updateQuantity = (typeId, newQuantity) => {
    const type = cartStands.find((t) => t.id === typeId);
    if (!type) return;
    const currentCount = cartStands.filter((t) => t.id === typeId).length;
    const available = type.quantity_available - (type.quantity_rented || 0);
    if (newQuantity > currentCount) {
      const toAdd = newQuantity - currentCount;
      if (currentCount + toAdd > available) {
        toast({
          title: "Stock insuffisant",
          description: `Seulement ${available} disponible(s).`,
          variant: "destructive",
        });
        return;
      }
      for (let i = 0; i < toAdd; i++) setCartStands((prev) => [...prev, type]);
    } else if (newQuantity < currentCount) {
      let toRemove = currentCount - newQuantity;
      setCartStands((prev) =>
        prev.filter((item) => !(item.id === typeId && toRemove-- > 0)),
      );
    }
  };

  const getCartTotal = () =>
    cartStands.reduce((sum, item) => sum + item.calculated_price_pi, 0);
  const getCartCountByType = (typeId) =>
    cartStands.filter((t) => t.id === typeId).length;
  const clearCart = () => setCartStands([]);

const handleRentMultipleStands = async () => {
  if (isClosed || !user) {
    if (!user) toast({ title: "Connexion requise", description: "Veuillez vous connecter.", variant: "destructive" });
    return;
  }
  if (cartStands.length === 0) return;

  setIsRenting(true);
  const successList = [];
  const failureList = [];
  const generatedBookingCodes = [];

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
          <div className="space-y-2">
            <p>Total: {totalPi} π - Votre solde: {profile.coin_balance} π</p>
            <Button onClick={() => navigate("/packs")} className="w-full">Acheter des pièces</Button>
          </div>
        ),
        variant: "destructive",
      });
      setIsRenting(false);
      return;
    }

    // Exécution séquentielle avec code unique par stand
    for (const stand of cartStands) {
      const bookingCode = await generateUniqueBookingCode();
      const { data, error } = await supabase.rpc("rent_stand", {
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

      if (error || !data?.success) {
        failureList.push({ name: stand.name, error: data?.message || error?.message || "Erreur inconnue" });
      } else {
        successList.push(stand);
        generatedBookingCodes.push(bookingCode);
      }
    }

    const baseUrl = window.location.origin;
    const orderId = Date.now().toString(36).toUpperCase();

    if (failureList.length > 0) {
      const errorSummary = failureList.map((f) => `${f.name} : ${f.error}`).join("\n");
      toast({
        title: successList.length === 0 ? "❌ Réservations échouées" : "⚠️ Réservations partiellement réussies",
        description: (
          <div className="text-sm">
            {successList.length > 0 && <p className="font-semibold text-green-400">✅ Réussies : {successList.map((s) => s.name).join(", ")}</p>}
            <p className="font-semibold text-red-400 mt-2">❌ Échecs :</p>
            <pre className="text-xs bg-black/30 p-2 rounded whitespace-pre-wrap">{errorSummary}</pre>
          </div>
        ),
        variant: "destructive",
        duration: 8000,
      });

      // Mettre à jour le panier : ne garder que les échecs
      const failedStandNames = failureList.map((f) => f.name);
      const remainingStands = cartStands.filter((s) => failedStandNames.includes(s.name));
      setCartStands(remainingStands);
      await fetchStandData();
      if (onRefresh) onRefresh();

      if (successList.length > 0) {
        const qrUrl = `${baseUrl}/stand-booking?orderId=${orderId}&codes=${generatedBookingCodes.join(",")}`;
        const qr = await generateQRCode(qrUrl);
        if (qr) setQrCodeUrl(qr);
      }
      setIsRenting(false);
      return;
    }

    // Tout a réussi
    const qrUrl = `${baseUrl}/stand-booking?orderId=${orderId}&codes=${generatedBookingCodes.join(",")}`;
    const qr = await generateQRCode(qrUrl);
    if (qr) setQrCodeUrl(qr);

    toast({
      title: "✅ Réservations confirmées !",
      description: `${cartStands.length} stand(s) réservé(s). Codes: ${generatedBookingCodes.join(", ")}`,
      className: "bg-green-600 text-white",
    });

    setCartStands([]);
    setIsCartOpen(false);
    setFormData({ companyName: "", contactPerson: "", email: user?.email || "", phone: "", description: "" });
    await fetchStandData();
    if (onRefresh) onRefresh();
  } catch (error) {
    console.error(error);
    toast({ title: "Erreur système", description: error.message || "Impossible de traiter la demande.", variant: "destructive" });
  } finally {
    setIsRenting(false);
  }
};
const viewRentalDetails = async (rental) => {
  setSelectedRentalForDetails(rental);
  const baseUrl = window.location.origin;
  const qrUrl = `${baseUrl}/stand-booking?code=${rental.booking_code}`;
  const qr = await generateQRCode(qrUrl);
  setQrCodeUrl(qr);
  setIsDetailsDialogOpen(true);
};
    
  const handleBuyCoins = () => navigate("/packs");

  if (loading)
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" />
          {isOrganizer ? "Tableau de bord des Locations" : "Louer un stand"}
        </h2>
        <p className="text-gray-400 mt-1">
          {isOrganizer
            ? "Gérez les locations et suivez vos revenus."
            : "Choisissez un emplacement pour exposer."}
        </p>
      </div>

      {/* PANIER (exposant) */}
      {!isOrganizer && cartStands.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-20 z-40 mb-8"
        >
          <Card className="bg-gray-900 border border-primary/50 shadow-2xl backdrop-blur-xl bg-opacity-90">
            <CardHeader className="py-4 border-b border-gray-800 bg-primary/10">
              <CardTitle className="text-white flex justify-between items-center text-lg">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Votre Panier{" "}
                  <Badge className="bg-primary ml-2">{cartStands.length}</Badge>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">
                    {getCartTotal()} π
                  </span>
                  <p className="text-xs text-gray-400">
                    ≈ {(getCartTotal() * COIN_RATE).toLocaleString()} FCFA
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 max-h-[40vh] overflow-y-auto space-y-3">
              {Array.from(new Set(cartStands.map((s) => s.id))).map(
                (typeId) => {
                  const type = cartStands.find((s) => s.id === typeId);
                  const count = cartStands.filter(
                    (s) => s.id === typeId,
                  ).length;
                  const colors =
                    STAND_COLORS[
                      standTypes.findIndex((t) => t.id === typeId) %
                        STAND_COLORS.length
                    ];
                  return (
                    <div
                      key={typeId}
                      className="flex justify-between items-center bg-gray-800/40 p-3 rounded-lg border border-gray-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full ${colors.iconBg} flex items-center justify-center text-xs font-bold ${colors.text}`}
                        >
                          {count}
                        </div>
                        <div>
                          <p className="text-white font-medium">{type.name}</p>
                          <p className="text-xs text-gray-400">
                            {type.calculated_price_pi} π / unité
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-gray-700 rounded">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(typeId, count - 1)}
                            className="h-8 px-2"
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-white">
                            {count}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(typeId, count + 1)}
                            className="h-8 px-2"
                          >
                            +
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCartStands((prev) =>
                              prev.filter((s) => s.id !== typeId),
                            )
                          }
                          className="text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                },
              )}
            </CardContent>
            <CardFooter className="bg-gray-900/50 border-t border-gray-800 pt-4">
              <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button className="w-full text-base font-bold h-12">
                    Passer à la caisse <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-gray-900 border-gray-800 text-white w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="text-white flex items-center gap-2 text-xl">
                      Finaliser votre commande
                    </SheetTitle>
                    <SheetDescription className="text-gray-400">
                      {cartStands.length} stand(s) dans le panier
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <h4 className="font-medium text-white mb-3">
                        Récapitulatif
                      </h4>
                      {Array.from(new Set(cartStands.map((s) => s.id))).map(
                        (typeId) => {
                          const type = cartStands.find((s) => s.id === typeId);
                          const count = cartStands.filter(
                            (s) => s.id === typeId,
                          ).length;
                          return (
                            <div
                              key={typeId}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-400">
                                {type.name} x{count}
                              </span>
                              <span className="text-white">
                                {type.calculated_price_pi * count} π
                              </span>
                            </div>
                          );
                        },
                      )}
                      <div className="border-t border-gray-700 pt-2 mt-2">
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span className="text-primary">
                            {getCartTotal()} π
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 text-right">
                          ≈ {(getCartTotal() * COIN_RATE).toLocaleString()} FCFA
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300">
                          Entreprise / Marque{" "}
                          <span className="text-red-400">*</span>
                        </Label>
                        <Input
                          value={formData.companyName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              companyName: e.target.value,
                            })
                          }
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-gray-300">
                            Personne à contacter{" "}
                            <span className="text-red-400">*</span>
                          </Label>
                          <Input
                            value={formData.contactPerson}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                contactPerson: e.target.value,
                              })
                            }
                            className="bg-gray-800 border-gray-700 text-white mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300">
                            Téléphone <span className="text-red-400">*</span>
                          </Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phone: e.target.value,
                              })
                            }
                            className="bg-gray-800 border-gray-700 text-white mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-300">
                          Email de confirmation
                        </Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="bg-gray-800 border-gray-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">
                          Description activité
                        </Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          rows={2}
                          className="bg-gray-800 border-gray-700 text-white mt-1"
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
                      className="w-full bg-primary h-12"
                    >
                      {isRenting ? (
                        <Loader2 className="animate-spin mr-2" />
                      ) : (
                        `Payer ${getCartTotal()} π et confirmer`
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-gray-400"
                      onClick={() => setIsCartOpen(false)}
                    >
                      Annuler
                    </Button>
                    <p className="text-center text-sm text-gray-400">
                      Pas assez de pièces ?{" "}
                      <Button
                        variant="link"
                        className="text-primary p-0 h-auto"
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

      {/* TABLEAU DE BORD ORGANISATEUR */}
      {isOrganizer && standTypes.length > 0 && (
        <Card className="bg-gray-900 border-gray-800 shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="border-b border-gray-800 bg-gray-800/30 py-5">
            <CardTitle className="text-white text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Aperçu Global
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <div className="bg-gray-800/40 p-6 rounded-xl">
                <p className="text-sm text-gray-400 flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4" /> Stands loués
                </p>
                <p className="text-3xl font-bold text-white">
                  {statistics.totalRentals}
                </p>
                <p className="text-xs text-gray-500">
                  sur {statistics.totalStands} disponibles
                </p>
              </div>
              <div className="bg-gray-800/40 p-6 rounded-xl">
                <p className="text-sm text-gray-400 flex items-center gap-2 mb-3">
                  <Coins className="w-4 h-4 text-blue-400" /> Revenus bruts
                </p>
                <p className="text-3xl font-bold text-white">
                  {statistics.totalRevenue}{" "}
                  <span className="text-xl text-blue-400">π</span>
                </p>
                <p className="text-xs text-gray-500">
                  ≈ {statistics.totalRevenueFcfa.toLocaleString()} FCFA
                </p>
              </div>
              <div className="bg-gray-800/40 p-6 rounded-xl">
                <p className="text-sm text-gray-400 flex items-center gap-2 mb-3">
                  <Grid3x3 className="w-4 h-4 text-purple-400" /> Occupation
                </p>
                <p className="text-3xl font-bold text-white mb-3">
                  {statistics.occupancyRate.toFixed(1)}%
                </p>
                <Progress
                  value={statistics.occupancyRate}
                  className="h-2 bg-gray-700 [&>div]:bg-purple-500"
                />
              </div>
            </div>

            <div className="mt-10">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                Détail par type de stand
              </h4>
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <Table>
                  <TableHeader className="bg-gray-800/80">
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Dimensions</TableHead>
                      <TableHead className="text-center">
                        Prix unitaire
                      </TableHead>
                      <TableHead className="text-center">Disponibles</TableHead>
                      <TableHead className="text-center">Réservés</TableHead>
                      <TableHead className="text-center w-40">
                        Occupation
                      </TableHead>
                      <TableHead className="text-right">
                        Revenus bruts
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statistics.byType.map((type, idx) => {
                      const colors = STAND_COLORS[idx % STAND_COLORS.length];
                      return (
                        <TableRow
                          key={type.id}
                          className="border-gray-800 hover:bg-gray-800/40"
                        >
                          <TableCell className="py-4">
                            <span className={`font-semibold ${colors.text}`}>
                              {type.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-gray-300">
                            {type.size || "N/A"}
                          </TableCell>
                          <TableCell className="text-center text-white">
                            {type.calculated_price_pi} π
                          </TableCell>
                          <TableCell className="text-center text-gray-400">
                            {type.quantity_available}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`border ${colors.borderLight} ${colors.bg} ${colors.text}`}
                            >
                              {type.rented}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-3">
                              <span className="text-gray-300 text-xs">
                                {type.rate.toFixed(0)}%
                              </span>
                              <Progress
                                value={type.rate}
                                className={`w-16 h-1.5 bg-gray-800 ${colors.progress}`}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-white">
                            {type.revenue} π
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
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  Entreprises participantes
                </h4>
                <div className="overflow-x-auto rounded-xl border border-gray-800">
                  <Table>
                    <TableHeader className="bg-gray-800/80">
                      <TableRow>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead className="text-center">Stands</TableHead>
                        <TableHead>Code(s)</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.byCompany.slice(0, 5).map((company, idx) => {
                        const colors = STAND_COLORS[idx % STAND_COLORS.length];
                        return (
                          <TableRow
                            key={company.companyName}
                            className="border-gray-800 hover:bg-gray-800/40"
                          >
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <Building
                                  className={`w-4 h-4 ${colors.text}`}
                                />
                                <span className="text-white">
                                  {company.companyName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {company.contactPerson}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {company.contactEmail}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {company.contactPhone}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-green-900 text-green-200">
                                {company.rentals.length}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {company.bookingCodes
                                  .slice(0, 2)
                                  .map((code, i) => (
                                    <code
                                      key={i}
                                      className="text-xs bg-gray-800 px-1 py-0.5 rounded"
                                    >
                                      {code}
                                    </code>
                                  ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-white">
                              {company.totalAmount} π
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {statistics.byCompany.length > 5 && (
                  <div className="p-3 text-center border-t border-gray-800">
                    <Button
                      variant="link"
                      className="text-primary"
                      onClick={exportCompanyListExcel}
                    >
                      Voir toutes les entreprises ({statistics.byCompany.length}
                      )
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MES RÉSERVATIONS (exposant) */}
      {!isOrganizer && myRentals.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold text-white border-b border-gray-800 pb-4 mb-6 flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-primary" /> Mes Réservations (
            {myRentals.length})
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {myRentals.map((rental, idx) => {
              const typeIndex = standTypes.findIndex(
                (t) => t.id === rental.stand_type_id,
              );
              const colors =
                STAND_COLORS[
                  typeIndex >= 0 ? typeIndex % STAND_COLORS.length : 0
                ];
              const activeTab = activeTabs[rental.id] || "details";
              return (
                <motion.div
                  key={rental.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="h-full"
                >
                  <Card
                    className={`bg-gray-900 border-l-4 ${colors.border} border-gray-800 h-full`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            Stand {rental.stand_number}{" "}
                            <Badge className={colors.badge}>
                              {rental.stand_types?.name}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Tag className="w-3 h-3" /> Code:{" "}
                            {rental.booking_code || "N/A"}
                          </CardDescription>
                        </div>
                        <BadgeCheck className={`w-6 h-6 ${colors.text}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-1.5 mb-4 border-b border-gray-800 pb-2">
                        <button
                          onClick={() =>
                            setActiveTabs((prev) => ({
                              ...prev,
                              [rental.id]: "details",
                            }))
                          }
                          className={`px-3 py-1.5 text-xs rounded-md ${activeTab === "details" ? `bg-gray-800 ${colors.text}` : "text-gray-400 hover:text-white"}`}
                        >
                          Stand
                        </button>
                        <button
                          onClick={() =>
                            setActiveTabs((prev) => ({
                              ...prev,
                              [rental.id]: "entreprise",
                            }))
                          }
                          className={`px-3 py-1.5 text-xs rounded-md ${activeTab === "entreprise" ? `bg-gray-800 ${colors.text}` : "text-gray-400 hover:text-white"}`}
                        >
                          Entreprise
                        </button>
                      </div>
                      {activeTab === "details" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-[10px] text-gray-500">Type</p>
                              <p className="text-sm font-medium text-white">
                                {rental.stand_types?.name}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {rental.stand_types?.size}
                              </p>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-[10px] text-gray-500">Payé</p>
                              <p className="text-sm font-bold text-white">
                                {rental.rental_amount_pi} π
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {(
                                  rental.rental_amount_pi * COIN_RATE
                                ).toLocaleString()}{" "}
                                F
                              </p>
                            </div>
                          </div>
                          <div className="bg-black/30 rounded-lg p-3">
                            <p className="text-[10px] text-gray-500">Date</p>
                            <p className="text-xs text-white">
                              {new Date(rental.created_at).toLocaleDateString(
                                "fr-FR",
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                      {activeTab === "entreprise" && (
                        <div className="space-y-2">
                          <div className="bg-black/30 rounded-lg p-3 flex justify-between">
                            <div>
                              <p className="text-[10px] text-gray-500">
                                Entreprise
                              </p>
                              <p className="text-sm text-white">
                                {rental.company_name}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                copyToClipboard(
                                  rental.company_name,
                                  "Entreprise",
                                )
                              }
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-[10px] text-gray-500">
                                Contact
                              </p>
                              <p className="text-xs text-white">
                                {rental.contact_person}
                              </p>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-[10px] text-gray-500">
                                Téléphone
                              </p>
                              <p className="text-xs text-white">
                                {rental.contact_phone || "N/A"}
                              </p>
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
                        className="w-full border-gray-700 text-gray-300"
                      >
                        <Eye className="w-4 h-4 mr-2" /> Détails
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* STANDS DISPONIBLES (exposant) */}
      {!isOrganizer && (
        <>
          {!isUnlocked ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-10 text-center">
                <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">
                  Contenu Verrouillé
                </h3>
                <p className="text-gray-400">
                  Débloquez l'accès pour réserver des stands.
                </p>
              </CardContent>
            </Card>
          ) : standTypes.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-10 text-center">
                <Store className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">
                  Aucun stand disponible
                </h3>
                <p className="text-gray-400">
                  L'organisateur n'a pas encore configuré de stands.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              <h3 className="text-xl font-bold text-white mb-6">
                Stands disponibles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {standTypes.map((type, idx) => {
                  const available =
                    type.quantity_available - (type.quantity_rented || 0);
                  const isSoldOut = available <= 0;
                  const colors = STAND_COLORS[idx % STAND_COLORS.length];
                  const inCartCount = getCartCountByType(type.id);
                  return (
                    <motion.div
                      key={type.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="h-full"
                    >
                      <Card
                        className={`bg-gray-900 border-t-4 ${colors.border} border-x-gray-800 border-b-gray-800 h-full hover:shadow-xl transition-all`}
                      >
                        <CardHeader className="border-b border-gray-800/50 pb-4">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <CardTitle
                                className={`text-xl font-bold ${colors.text}`}
                              >
                                {type.name}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-1.5 mt-2 text-gray-400">
                                <Layout className="w-3.5 h-3.5" />{" "}
                                {type.size || "Dimensions non spécifiées"}
                              </CardDescription>
                            </div>
                            <Badge
                              variant={
                                isClosed
                                  ? "outline"
                                  : isSoldOut
                                    ? "destructive"
                                    : "secondary"
                              }
                              className={
                                isClosed
                                  ? "border-gray-600 text-gray-400"
                                  : isSoldOut
                                    ? "bg-red-950 text-red-400"
                                    : `${colors.bg} ${colors.text} border ${colors.borderLight}`
                              }
                            >
                              {isClosed
                                ? "Terminé"
                                : isSoldOut
                                  ? "Complet"
                                  : `${available - inCartCount} dispo.`}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 pt-5">
                          <p className="text-sm text-gray-300 mb-5 line-clamp-3">
                            {type.description || "Aucune description."}
                          </p>
                        </CardContent>
                        <CardFooter className="border-t border-gray-800/50 pt-5 bg-gray-900/50">
                          <div className="flex justify-between w-full">
                            <div>
                              <p className="text-xs text-gray-500">Tarif</p>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-white">
                                  {type.calculated_price_pi}
                                </span>
                                <span
                                  className={`text-sm font-medium ${colors.text}`}
                                >
                                  π
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                ≈{" "}
                                {(
                                  type.calculated_price_pi * COIN_RATE
                                ).toLocaleString()}{" "}
                                FCFA
                              </p>
                            </div>
                            {isClosed ? (
                              <Button disabled>Terminé</Button>
                            ) : isSoldOut ? (
                              <Button disabled>Complet</Button>
                            ) : (
                              <Button
                                onClick={() => handleAddToCart(type)}
                                variant={
                                  inCartCount > 0 ? "outline" : "default"
                                }
                                className={
                                  inCartCount > 0
                                    ? `border-${colors.text} ${colors.text}`
                                    : `${colors.bgSolid} hover:bg-blue-700 text-white`
                                }
                              >
                                {inCartCount > 0
                                  ? `${inCartCount} au panier`
                                  : "Ajouter"}
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

      {/* TOUTES LES RÉSERVATIONS (organisateur) */}
      {isOrganizer && allRentals.length > 0 && (
        <Card className="bg-gray-900 border-gray-800 shadow-xl rounded-xl mt-12 overflow-hidden">
          <CardHeader className="border-b border-gray-800 bg-gray-800/20 py-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Toutes les
                  Réservations
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {allRentals.length} réservation(s) ·{" "}
                  {statistics.byCompany.length} entreprise(s)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCompanyListExcel}
                >
                  <FileDown className="w-4 h-4 mr-2" /> Excel Entreprises
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel}>
                  <FileDown className="w-4 h-4 mr-2" /> Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToPDF}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4 mr-2" />
                  )}{" "}
                  PDF
                </Button>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-gray-950 border-gray-700 text-white"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-md text-white sm:w-64"
              >
                <option value="all">Tous les types</option>
                {standTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRentals.length === 0 ? (
              <div className="text-center py-12">
                Aucune réservation trouvée.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-800/30">
                    <TableRow>
                      <TableHead>N° Stand</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Prix</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRentals.map((rental) => {
                      const typeIndex = standTypes.findIndex(
                        (t) => t.id === rental.stand_type_id,
                      );
                      const colors =
                        STAND_COLORS[
                          typeIndex >= 0 ? typeIndex % STAND_COLORS.length : 0
                        ];
                      return (
                        <TableRow
                          key={rental.id}
                          className="border-gray-800 hover:bg-gray-800/40"
                        >
                          <TableCell className={`font-bold ${colors.text}`}>
                            {rental.stand_number}
                          </TableCell>
                          <TableCell>
                            <div className="text-white">
                              {rental.company_name}
                            </div>
                            {rental.business_description && (
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                {rental.business_description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCircle className="w-4 h-4 text-gray-500" />
                              {rental.contact_person}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-800 px-2 py-1 rounded">
                              {rental.booking_code || "N/A"}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge className={colors.badge}>
                              {rental.stand_types?.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-white">
                              {rental.rental_amount_pi} π
                            </div>
                            <div className="text-gray-500 text-xs">
                              {(
                                rental.rental_amount_pi * COIN_RATE
                              ).toLocaleString()}{" "}
                              F
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-gray-800 border-gray-700">
                                <DropdownMenuItem
                                  onClick={() => viewRentalDetails(rental)}
                                >
                                  <Eye className="w-4 h-4 mr-2" /> Détails
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    copyToClipboard(
                                      `Stand: ${rental.stand_number}\nCode: ${rental.booking_code}\nEntreprise: ${rental.company_name}\nContact: ${rental.contact_person}\nEmail: ${rental.contact_email}\nTél: ${rental.contact_phone}`,
                                      "Infos",
                                    )
                                  }
                                >
                                  <Copy className="w-4 h-4 mr-2" /> Copier
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
          </CardContent>
        </Card>
      )}

      {/* DIALOG DÉTAILS RÉSERVATION */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Détails complets
            </DialogTitle>
          </DialogHeader>
          {selectedRentalForDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-xs text-gray-400">Stand</p>
                  <p className="text-xl font-bold">
                    {selectedRentalForDetails.stand_number}
                  </p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-xs text-gray-400">Code</p>
                  <p className="text-sm font-mono break-all">
                    {selectedRentalForDetails.booking_code || "N/A"}
                  </p>
                </div>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" /> Entreprise
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nom:</span>
                    <span className="text-white">
                      {selectedRentalForDetails.company_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contact:</span>
                    <span className="text-white">
                      {selectedRentalForDetails.contact_person}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">
                      {selectedRentalForDetails.contact_email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Téléphone:</span>
                    <span className="text-white">
                      {selectedRentalForDetails.contact_phone ||
                        selectedRentalForDetails.profiles?.phone ||
                        "N/A"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary" /> Location
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white">
                      {selectedRentalForDetails.stand_types?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dimensions:</span>
                    <span className="text-white">
                      {selectedRentalForDetails.stand_types?.size}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date:</span>
                    <span className="text-white">
                      {new Date(
                        selectedRentalForDetails.created_at,
                      ).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                    <span className="font-bold">Prix total:</span>
                    <span className="font-bold text-lg">
                      {selectedRentalForDetails.rental_amount_pi} π{" "}
                      <span className="text-sm text-gray-400">
                        (
                        {(
                          selectedRentalForDetails.rental_amount_pi * COIN_RATE
                        ).toLocaleString()}{" "}
                        FCFA)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              {selectedRentalForDetails.business_description && (
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" /> Activité
                  </h4>
                  <p className="text-gray-300">
                    {selectedRentalForDetails.business_description}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                copyToClipboard(
                  `Stand: ${selectedRentalForDetails?.stand_number}\nCode: ${selectedRentalForDetails?.booking_code}\nEntreprise: ${selectedRentalForDetails?.company_name}`,
                  "Infos",
                )
              }
            >
              Copier
            </Button>
            <Button onClick={() => setIsDetailsDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StandRentalInterface;
