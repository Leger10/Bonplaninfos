import React, { useState, useEffect, useRef } from "react";
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
  Loader2,
  Store,
  CheckCircle,
  Info,
  DollarSign,
  Layout,
  Users,
  MapPin,
  Lock,
  ArrowRight,
  User,
  Phone,
  Building,
  BarChart3,
  PieChart,
  TrendingUp,
  Package,
  Grid3x3,
  Calendar,
  Clock,
  Wallet,
  Coins,
  Percent,
  AlertCircle,
  Sparkles,
  Zap,
  Star,
  Award,
  Rocket,
  Flame,
  Download,
  Copy,
  Mail,
  Map,
  Navigation,
  Printer,
  BadgeCheck,
  Share2,
  Eye,
  X,
  Briefcase,
  Tag,
  Hash,
  CalendarDays,
  UserCircle,
  FileText,
  CheckSquare,
  CreditCard,
  Ticket,
  Award as AwardIcon,
  Star as StarIcon,
  FileDown,
  Filter,
  Search,
  ChevronDown,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Palette de couleurs sombre et lisible
const STAND_COLORS = [
  {
    border: "border-blue-600",
    bg: "bg-blue-950/30",
    cardBg: "bg-gray-900",
    text: "text-blue-400",
    textLight: "text-blue-300",
    badge: "bg-blue-900 text-blue-200",
    header: "border-b border-gray-800",
    iconBg: "bg-blue-900/50",
    gradient: "from-blue-900/20 to-transparent",
  },
  {
    border: "border-green-600",
    bg: "bg-green-950/30",
    cardBg: "bg-gray-900",
    text: "text-green-400",
    textLight: "text-green-300",
    badge: "bg-green-900 text-green-200",
    header: "border-b border-gray-800",
    iconBg: "bg-green-900/50",
    gradient: "from-green-900/20 to-transparent",
  },
  {
    border: "border-purple-600",
    bg: "bg-purple-950/30",
    cardBg: "bg-gray-900",
    text: "text-purple-400",
    textLight: "text-purple-300",
    badge: "bg-purple-900 text-purple-200",
    header: "border-b border-gray-800",
    iconBg: "bg-purple-900/50",
    gradient: "from-purple-900/20 to-transparent",
  },
  {
    border: "border-orange-600",
    bg: "bg-orange-950/30",
    cardBg: "bg-gray-900",
    text: "text-orange-400",
    textLight: "text-orange-300",
    badge: "bg-orange-900 text-orange-200",
    header: "border-b border-gray-800",
    iconBg: "bg-orange-900/50",
    gradient: "from-orange-900/20 to-transparent",
  },
  {
    border: "border-pink-600",
    bg: "bg-pink-950/30",
    cardBg: "bg-gray-900",
    text: "text-pink-400",
    textLight: "text-pink-300",
    badge: "bg-pink-900 text-pink-200",
    header: "border-b border-gray-800",
    iconBg: "bg-pink-900/50",
    gradient: "from-pink-900/20 to-transparent",
  },
  {
    border: "border-indigo-600",
    bg: "bg-indigo-950/30",
    cardBg: "bg-gray-900",
    text: "text-indigo-400",
    textLight: "text-indigo-300",
    badge: "bg-indigo-900 text-indigo-200",
    header: "border-b border-gray-800",
    iconBg: "bg-indigo-900/50",
    gradient: "from-indigo-900/20 to-transparent",
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
  const [standTypes, setStandTypes] = useState([]);
  const [myRental, setMyRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rentingType, setRentingType] = useState(null);
  const [isRenting, setIsRenting] = useState(false);
  const [allRentals, setAllRentals] = useState([]);
  const [filteredRentals, setFilteredRentals] = useState([]);
  const [showAllRentals, setShowAllRentals] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [statistics, setStatistics] = useState({
    totalRentals: 0,
    totalRevenue: 0,
    totalRevenueFcfa: 0,
    totalCommission: 0,
    totalNetGain: 0,
    occupancyRate: 0,
    byType: [],
  });

  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: user?.email || "",
    phone: "",
    description: "",
  });

  const COIN_RATE = 10;
  const COMMISSION_RATE = 0.05;

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
      filtered = filtered.filter(
        (rental) =>
          rental.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          rental.contact_person
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          rental.contact_email
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          rental.stand_number?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(
        (rental) => rental.stand_type_id === selectedType,
      );
    }

    setFilteredRentals(filtered);
  }, [allRentals, searchTerm, selectedType]);

  const calculateStatistics = () => {
    const totalStands = standTypes.reduce(
      (sum, type) => sum + type.quantity_available,
      0,
    );
    const totalRentals = allRentals.length;
    const totalRevenue = allRentals.reduce(
      (sum, rental) => sum + rental.rental_amount_pi,
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
      const available = type.quantity_available;
      const revenue = typeRentals.reduce(
        (sum, r) => sum + r.rental_amount_pi,
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

    setStatistics({
      totalRentals,
      totalRevenue,
      totalRevenueFcfa,
      totalCommission,
      totalNetGain,
      occupancyRate,
      byType,
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
        const { data: rentals, error: rentalError } = await supabase
          .from("stand_rentals")
          .select(
            "*, stand_types(name, size, amenities, base_price, base_currency, calculated_price_pi, description), profiles(full_name, phone)",
          )
          .eq("user_id", user.id)
          .eq("stand_event_id", standEvent.id)
          .maybeSingle();

        if (!rentalError) {
          setMyRental(rentals);
        }

        if (
          userProfile?.user_type === "organizer" &&
          user?.id === event?.organizer_id
        ) {
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
const handleRentStand = async () => {
  if (isClosed) return;
  if (!user) {
    toast({
      title: "Connexion requise",
      description: "Veuillez vous connecter pour louer un stand.",
      variant: "destructive",
    });
    return;
  }
  if (!rentingType) return;

  setIsRenting(true);

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("coin_balance")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.coin_balance < rentingType.calculated_price_pi) {
      toast({
        title: "Solde insuffisant",
        description: (
          <div className="mt-2 space-y-3">
            <div className="text-sm leading-relaxed text-muted-foreground">
              <p>
                Il vous faut{" "}
                <span className="font-semibold text-foreground">
                  {rentingType.calculated_price_pi} pièces
                </span>.
              </p>
              <p>
                Votre solde actuel est{" "}
                <span className="font-semibold text-foreground">
                  {profile.coin_balance} pièces
                </span>.
              </p>
            </div>

            <Button
              variant="default"
              className="
                w-full
                py-2
                text-sm sm:text-base
                font-medium
                rounded-lg
                bg-primary text-white
                hover:bg-primary/90
                transition-all
              "
              onClick={() => {
                setIsRenting(false);
                setIsOpen(false);
                navigate("/packs");
              }}
            >
              Acheter des pièces
            </Button>
          </div>
        ),
        variant: "destructive",
      });

      return;
    }

    const { data: standEvent, error: standEventError } = await supabase
      .from("stand_events")
      .select("id")
      .eq("event_id", event.id)
      .single();

    if (standEventError) throw standEventError;

    const { data, error } = await supabase.rpc("rent_stand", {
      p_event_id: event.id,
      p_user_id: user.id,
      p_stand_type_id: rentingType.id,
      company_name: formData.companyName,
      contact_person: formData.contactPerson,
      contact_email: formData.email,
      contact_phone: formData.phone,
      business_description: formData.description,
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.message);

    toast({
      title: "✅ Réservation confirmée !",
      description: `Votre stand ${data.stand_number} a été réservé avec succès.`,
      className: "bg-green-600 text-white",
    });

    setRentingType(null);
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
      title: "Erreur",
      description: error.message || "Impossible de réserver le stand. veuillez réessayer.",
      variant: "destructive",
    });
  } finally {
    setIsRendering(false);
  }
};

  const handleBuyCoins = () => {
    navigate("/packs");
  };

 const shareText = async (text, label) => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Bonplaninfos - Partage d'événement",
        text: text,
      });

      toast({
        title: "Partagé avec succès",
        description: `${label} a été partagé.`,
        duration: 2000,
      });
    } else {
      // Fallback si navigateur ne supporte pas navigator.share
      await navigator.clipboard.writeText(text);

      toast({
        title: "Copié !",
        description: `${label} a été copié dans le presse-papier.`,
        duration: 2000,
      });
    }
  } catch (error) {
    console.error(error);
  }
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
      doc.text(`Total des réservations: ${allRentals.length}`, 14, 48);
      doc.text(
        `Revenu total: ${statistics.totalRevenue} π (${statistics.totalRevenueFcfa.toLocaleString()} FCFA)`,
        14,
        55,
      );
      doc.text(
        `Taux d'occupation: ${statistics.occupancyRate.toFixed(1)}%`,
        14,
        62,
      );

      const tableColumn = [
        "Stand",
        "Entreprise",
        "Contact",
        "Email",
        "Téléphone",
        "Type",
        "Prix (π)",
      ];

      const tableRows = filteredRentals.map((rental) => [
        rental.stand_number,
        rental.company_name || "N/A",
        rental.contact_person || "N/A",
        rental.contact_email || "N/A",
        rental.contact_phone || rental.profiles?.phone || "N/A",
        rental.stand_types?.name || "N/A",
        rental.rental_amount_pi.toString(),
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 70,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { cellWidth: 40 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 20 },
        },
      });

      const finalY = doc.lastAutoTable.finalY + 10;

      doc.setFontSize(12);
      doc.text("Résumé par type de stand", 14, finalY);

      const summaryColumn = [
        "Type",
        "Total",
        "Réservés",
        "Disponibles",
        "Revenu (π)",
      ];
      const summaryRows = statistics.byType.map((type) => [
        type.name,
        type.quantity_available.toString(),
        type.rented.toString(),
        type.remaining.toString(),
        type.revenue.toString(),
      ]);

      autoTable(doc, {
        head: [summaryColumn],
        body: summaryRows,
        startY: finalY + 5,
        theme: "striped",
        headStyles: { fillColor: [46, 204, 113], textColor: 255 },
        styles: { fontSize: 8 },
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
        rental.rental_amount_pi,
        rental.rental_amount_pi * COIN_RATE,
        new Date(rental.created_at).toLocaleDateString("fr-FR"),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
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

  if (loading)
    return (
      <div className="p-12 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400">Chargement des stands disponibles...</p>
        </div>
      </div>
    );

  if (myRental) {
    const colors =
      STAND_COLORS[
        standTypes.findIndex((t) => t.id === myRental.stand_type_id) %
          STAND_COLORS.length
      ];

    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gray-900 border-2 border-gray-800 shadow-2xl overflow-hidden relative">
            <div
              className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${colors.gradient} rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none`}
            />

            <div
              className={`relative bg-gradient-to-r ${colors.bg} border-b ${colors.border} p-6`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <Ticket className="w-full h-full text-white" />
              </div>

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${colors.iconBg} border ${colors.border}`}
                  >
                    <BadgeCheck className={`w-8 h-8 ${colors.text}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-400 text-sm font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Réservation confirmée
                      </span>
                      <Badge className="bg-green-900 text-green-200 border-0">
                        Payé
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      Stand {myRental.stand_number}
                      <span
                        className={`text-sm font-normal px-2 py-0.5 rounded-full ${colors.badge}`}
                      >
                        {myRental.stand_types?.name}
                      </span>
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                      {event?.title} •{" "}
                      {new Date(event?.event_start_at).toLocaleDateString(
                        "fr-FR",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
                <button
                  onClick={() => setActiveTab("details")}
                  className={`px-4 py-2 font-medium text-sm rounded-lg transition-all ${
                    activeTab === "details"
                      ? `bg-gray-800 ${colors.text}`
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  }`}
                >
                  <Store className="w-4 h-4 inline-block mr-2" />
                  Détails du stand
                </button>
                <button
                  onClick={() => setActiveTab("entreprise")}
                  className={`px-4 py-2 font-medium text-sm rounded-lg transition-all ${
                    activeTab === "entreprise"
                      ? `bg-gray-800 ${colors.text}`
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  }`}
                >
                  <Building className="w-4 h-4 inline-block mr-2" />
                  Informations entreprise
                </button>
              </div>

              {activeTab === "details" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                          <Tag className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Type de stand</p>
                          <p className="text-base font-medium text-white">
                            {myRental.stand_types?.name}
                          </p>
                          <p className="text-sm text-gray-400">
                            {myRental.stand_types?.size}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                          <Hash className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Numéro de stand
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {myRental.stand_number}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                          <CreditCard className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Prix payé</p>
                          <p className="text-xl font-bold text-white">
                            {myRental.rental_amount_pi} π
                          </p>
                          <p className="text-sm text-gray-400">
                            ≈{" "}
                            {(
                              myRental.rental_amount_pi * COIN_RATE
                            ).toLocaleString()}{" "}
                            FCFA
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                          <CalendarDays className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Date de réservation
                          </p>
                          <p className="text-base font-medium text-white">
                            {new Date(myRental.created_at).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </p>
                          <p className="text-sm text-gray-400">
                            {new Date(myRental.created_at).toLocaleTimeString(
                              "fr-FR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                      <FileText className={`w-4 h-4 ${colors.text}`} />
                      Description du stand
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {myRental.stand_types?.description ||
                        "Aucune description disponible"}
                    </p>
                  </div>

                  {myRental.stand_types?.amenities &&
                    Object.keys(myRental.stand_types.amenities).length > 0 && (
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                          <Package className={`w-4 h-4 ${colors.text}`} />
                          Équipements inclus
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(myRental.stand_types.amenities)
                            .filter(([, v]) => v)
                            .map(([k]) => (
                              <Badge
                                key={k}
                                variant="outline"
                                className="border-gray-600 text-gray-300 bg-gray-700/50"
                              >
                                {k.replace(/_/g, " ")}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {activeTab === "entreprise" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                          <Building className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">
                            Entreprise
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium">
                              {myRental.company_name}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(
                                  myRental.company_name,
                                  "Nom de l'entreprise",
                                )
                              }
                              className="text-gray-400 hover:text-white"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                          <UserCircle className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">
                            Personne à contacter
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium">
                              {myRental.contact_person}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(
                                  myRental.contact_person,
                                  "Nom du contact",
                                )
                              }
                              className="text-gray-400 hover:text-white"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                          <Mail className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Email</p>
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium">
                              {myRental.contact_email}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(myRental.contact_email, "Email")
                              }
                              className="text-gray-400 hover:text-white"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                          <Phone className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">
                            Téléphone
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium">
                              {myRental.contact_phone ||
                                myRental.profiles?.phone ||
                                "Non renseigné"}
                            </p>
                            {myRental.contact_phone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(
                                    myRental.contact_phone,
                                    "Téléphone",
                                  )
                                }
                                className="text-gray-400 hover:text-white"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {myRental.business_description && (
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                            <Briefcase className={`w-4 h-4 ${colors.text}`} />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Activité / Produits exposés
                            </p>
                            <p className="text-gray-300 text-sm">
                              {myRental.business_description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-800">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${colors.text}`} />
                  Informations sur l'événement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 bg-gray-800/30 rounded-lg p-3">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-white">{event?.title}</p>
                      <p className="text-sm text-gray-400">
                        {event?.city}, {event?.country}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-gray-800/30 rounded-lg p-3">
                    <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-white">
                        {new Date(event?.event_start_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(event?.event_start_at).toLocaleTimeString(
                          "fr-FR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  Instructions importantes
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Présentez-vous à l'accueil de l'événement avec cette
                      confirmation.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Votre stand{" "}
                      <span className="text-white font-medium">
                        {myRental.stand_number}
                      </span>{" "}
                      vous sera attribué à votre arrivée.
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Un email de confirmation a été envoyé à{" "}
                      <span className="text-white">
                        {myRental.contact_email}
                      </span>
                      .
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-3 justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${event?.city}, ${event?.country}`)}`;
                    window.open(mapsUrl, "_blank");
                  }}
                  className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Voir sur la carte
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {userProfile?.user_type === "organizer" &&
          user?.id === event?.organizer_id &&
          allRentals.length > 0 && (
            <Card className="bg-gray-900 border-gray-800 mt-8">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-white text-lg font-semibold">
                      Toutes les réservations
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {allRentals.length} entreprise
                      {allRentals.length > 1 ? "s" : ""} ont réservé un stand
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToCSV}
                      className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToPDF}
                      disabled={isExporting}
                      className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4 mr-2" />
                      )}
                      PDF
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Rechercher par entreprise, contact, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">Tous les types</option>
                    {standTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredRentals.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    Aucune réservation trouvée
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800 hover:bg-gray-800/50">
                          <TableHead className="text-gray-400">Stand</TableHead>
                          <TableHead className="text-gray-400">
                            Entreprise
                          </TableHead>
                          <TableHead className="text-gray-400">
                            Contact
                          </TableHead>
                          <TableHead className="text-gray-400">Email</TableHead>
                          <TableHead className="text-gray-400">
                            Téléphone
                          </TableHead>
                          <TableHead className="text-gray-400">Type</TableHead>
                          <TableHead className="text-gray-400 text-right">
                            Prix
                          </TableHead>
                          <TableHead className="text-gray-400 text-center">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRentals.map((rental) => {
                          const typeIndex = standTypes.findIndex(
                            (t) => t.id === rental.stand_type_id,
                          );
                          const colors =
                            STAND_COLORS[typeIndex % STAND_COLORS.length];

                          return (
                            <TableRow
                              key={rental.id}
                              className="border-gray-800 hover:bg-gray-800/50"
                            >
                              <TableCell
                                className={`font-medium ${colors.text}`}
                              >
                                {rental.stand_number}
                              </TableCell>
                              <TableCell>
                                <div className="text-white">
                                  {rental.company_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-gray-300">
                                  {rental.contact_person}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-gray-300 text-sm">
                                  {rental.contact_email}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-gray-400 text-sm">
                                  {rental.contact_phone ||
                                    rental.profiles?.phone ||
                                    "N/A"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={colors.badge}>
                                  {rental.stand_types?.name}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-white font-medium">
                                  {rental.rental_amount_pi} π
                                </span>
                                <span className="text-gray-400 text-sm ml-2">
                                  (
                                  {(
                                    rental.rental_amount_pi * COIN_RATE
                                  ).toLocaleString()}{" "}
                                  F)
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const contactInfo = `Entreprise: ${rental.company_name}\nContact: ${rental.contact_person}\nEmail: ${rental.contact_email}\nTéléphone: ${rental.contact_phone || rental.profiles?.phone || "N/A"}\nStand: ${rental.stand_number}`;
                                    copyToClipboard(
                                      contactInfo,
                                      "Informations de contact",
                                    );
                                  }}
                                  className="text-gray-400 hover:text-white"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <div className="mt-4 text-sm text-gray-400">
                      Affichage de {filteredRentals.length} réservation
                      {filteredRentals.length > 1 ? "s" : ""} sur{" "}
                      {allRentals.length} au total
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" />
          Louer un stand
        </h2>
        <p className="text-gray-400 mt-1">
          Choisissez parmi les emplacements disponibles pour exposer lors de
          l'événement.
        </p>
      </div>

      {userProfile?.user_type === "organizer" &&
        user?.id === event?.organizer_id &&
        standTypes.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg font-semibold">
                Tableau de bord des locations
              </CardTitle>
              <CardDescription className="text-gray-400">
                Aperçu des réservations et revenus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400">Stands loués</p>
                  <p className="text-2xl font-bold text-white">
                    {statistics.totalRentals}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    sur{" "}
                    {standTypes.reduce(
                      (sum, t) => sum + t.quantity_available,
                      0,
                    )}{" "}
                    disponibles
                  </p>
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400">Revenus bruts</p>
                  <p className="text-2xl font-bold text-white">
                    {statistics.totalRevenue} π
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {statistics.totalRevenueFcfa.toLocaleString()} FCFA
                  </p>
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400">Frais plateforme</p>
                  <p className="text-2xl font-bold text-orange-400">
                    -{statistics.totalCommission.toFixed(0)} F
                  </p>
                  <p className="text-xs text-gray-500 mt-1">5% commission</p>
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400">Vos gains nets</p>
                  <p className="text-2xl font-bold text-green-400">
                    {statistics.totalNetGain.toFixed(0)} F
                  </p>
                  <p className="text-xs text-gray-500 mt-1">après commission</p>
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400">Taux d'occupation</p>
                  <p className="text-2xl font-bold text-white">
                    {statistics.occupancyRate.toFixed(1)}%
                  </p>
                  <Progress
                    value={statistics.occupancyRate}
                    className="h-1.5 mt-2 bg-gray-700"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-white font-medium mb-3">
                  Détail par type de stand
                </h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="text-gray-400">Type</TableHead>
                        <TableHead className="text-gray-400 text-center">
                          Dimensions
                        </TableHead>
                        <TableHead className="text-gray-400 text-center">
                          Prix
                        </TableHead>
                        <TableHead className="text-gray-400 text-center">
                          Disponibles
                        </TableHead>
                        <TableHead className="text-gray-400 text-center">
                          Réservés
                        </TableHead>
                        <TableHead className="text-gray-400 text-center">
                          Taux
                        </TableHead>
                        <TableHead className="text-gray-400 text-right">
                          Revenus
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.byType.map((type, index) => {
                        const colors =
                          STAND_COLORS[index % STAND_COLORS.length];
                        return (
                          <TableRow
                            key={type.id}
                            className="border-gray-800 hover:bg-gray-800/50"
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${colors.text.replace("text", "bg")}`}
                                />
                                <span className={colors.text}>{type.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-gray-300">
                              {type.size}
                            </TableCell>
                            <TableCell className="text-center text-white font-medium">
                              {type.calculated_price_pi} π
                            </TableCell>
                            <TableCell className="text-center text-gray-400">
                              {type.quantity_available}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-green-900 text-green-200">
                                {type.rented}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center gap-2">
                                <span className="text-white">
                                  {type.rate.toFixed(1)}%
                                </span>
                                <Progress
                                  value={type.rate}
                                  className="w-16 h-1.5 bg-gray-700"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-white font-medium">
                              {type.revenue} π
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {!isUnlocked ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <Lock className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-400">
              Veuillez débloquer l'événement pour voir les stands disponibles.
            </p>
          </CardContent>
        </Card>
      ) : standTypes.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-400">
              Aucun stand n'est disponible à la location pour le moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {standTypes.map((type, index) => {
            const available =
              type.quantity_available - (type.quantity_rented || 0);
            const isSoldOut = available <= 0;
            const colors = STAND_COLORS[index % STAND_COLORS.length];

            return (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="h-full"
              >
                <Card
                  className={`bg-gray-900 border-l-4 ${colors.border} border-gray-800 h-full flex flex-col hover:shadow-xl hover:shadow-${colors.text}/10 transition-all`}
                >
                  <CardHeader className="border-b border-gray-800 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle
                          className={`text-lg font-semibold ${colors.text}`}
                        >
                          {type.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1 text-gray-400">
                          <Layout className="w-3 h-3" />
                          {type.size}
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
                              ? "bg-red-900 text-red-200"
                              : colors.badge
                        }
                      >
                        {isClosed
                          ? "Terminé"
                          : isSoldOut
                            ? "Complet"
                            : `${available} dispo.`}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 pt-4">
                    <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                      {type.description}
                    </p>

                    {type.amenities &&
                      Object.keys(type.amenities).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {Object.entries(type.amenities)
                            .filter(([, v]) => v)
                            .map(([k]) => (
                              <Badge
                                key={k}
                                variant="outline"
                                className="border-gray-700 text-gray-300 bg-gray-800/50"
                              >
                                {k.replace(/_/g, " ")}
                              </Badge>
                            ))}
                        </div>
                      )}

                    {userProfile?.user_type === "organizer" &&
                      user?.id === event?.organizer_id && (
                        <div className="mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Réservés:</span>
                            <span className={`font-medium ${colors.text}`}>
                              {type.quantity_rented || 0}/
                              {type.quantity_available}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Revenu:</span>
                            <span className="text-white font-medium">
                              {(type.quantity_rented || 0) *
                                type.calculated_price_pi}{" "}
                              π
                            </span>
                          </div>
                        </div>
                      )}
                  </CardContent>

                  <CardFooter className="border-t border-gray-800 pt-4">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <p className="text-xs text-gray-500">Prix</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-white">
                            {type.calculated_price_pi}
                          </span>
                          <span className="text-sm text-gray-400">π</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          ≈{" "}
                          {(
                            type.calculated_price_pi * COIN_RATE
                          ).toLocaleString()}{" "}
                          F
                        </p>
                      </div>

                      {isClosed ? (
                        <Button
                          disabled
                          variant="outline"
                          size="sm"
                          className="border-gray-700 text-gray-500"
                        >
                          Terminé
                        </Button>
                      ) : isSoldOut ? (
                        <Button
                          disabled
                          variant="outline"
                          size="sm"
                          className="border-gray-700 text-gray-500"
                        >
                          Complet
                        </Button>
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              onClick={() => setRentingType(type)}
                              size="sm"
                              className={`${colors.text.replace("text", "bg")} hover:opacity-90 text-white border-0`}
                            >
                              Réserver
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900 border-gray-800 text-white">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-bold text-white">
                                Réserver un stand : {type.name}
                              </DialogTitle>
                              <DialogDescription className="text-gray-400">
                                Remplissez les informations de votre entreprise
                                pour valider la location.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-300">
                                  Prix total :
                                </span>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-white">
                                    {type.calculated_price_pi} π
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    ≈{" "}
                                    {(
                                      type.calculated_price_pi * COIN_RATE
                                    ).toLocaleString()}{" "}
                                    FCFA
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label
                                  htmlFor="company"
                                  className="text-gray-300"
                                >
                                  Nom de l'entreprise / Marque *
                                </Label>
                                <Input
                                  id="company"
                                  value={formData.companyName}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      companyName: e.target.value,
                                    })
                                  }
                                  placeholder="Ex: Ma Boutique Bio"
                                  className="bg-gray-800 border-gray-700 text-white"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label
                                    htmlFor="contact"
                                    className="text-gray-300"
                                  >
                                    Personne à contacter *
                                  </Label>
                                  <Input
                                    id="contact"
                                    value={formData.contactPerson}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        contactPerson: e.target.value,
                                      })
                                    }
                                    placeholder="Nom Prénom"
                                    className="bg-gray-800 border-gray-700 text-white"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label
                                    htmlFor="phone"
                                    className="text-gray-300"
                                  >
                                    Téléphone *
                                  </Label>
                                  <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        phone: e.target.value,
                                      })
                                    }
                                    placeholder="+225..."
                                    className="bg-gray-800 border-gray-700 text-white"
                                  />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label
                                  htmlFor="email"
                                  className="text-gray-300"
                                >
                                  Email *
                                </Label>
                                <Input
                                  id="email"
                                  type="email"
                                  value={formData.email}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      email: e.target.value,
                                    })
                                  }
                                  className="bg-gray-800 border-gray-700 text-white"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="desc" className="text-gray-300">
                                  Activité / Produits exposés
                                </Label>
                                <Textarea
                                  id="desc"
                                  value={formData.description}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Décrivez brièvement ce que vous allez vendre ou exposer..."
                                  rows={3}
                                  className="bg-gray-800 border-gray-700 text-white"
                                />
                              </div>
                            </div>

                            <DialogFooter>
                              <Button
                                onClick={handleRentStand}
                                disabled={
                                  isRenting ||
                                  !formData.companyName ||
                                  !formData.contactPerson ||
                                  !formData.phone
                                }
                                className="w-full bg-primary hover:bg-primary/90"
                              >
                                {isRenting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Traitement...
                                  </>
                                ) : (
                                  "Confirmer la réservation"
                                )}
                              </Button>
                              <p className="text-center text-sm text-gray-400 mt-2">
                                Pas assez de pièces ?{" "}
                                <Button
                                  variant="default"
                                  className="
    w-full sm:w-auto
    px-4 py-2
    text-sm sm:text-base
    font-medium
    bg-primary text-white
    hover:bg-primary/90
    rounded-lg
    whitespace-normal
    break-words
    text-center
  "
                                  onClick={handleBuyCoins}
                                >
                                  Acheter des pièces
                                </Button>
                              </p>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StandRentalInterface;