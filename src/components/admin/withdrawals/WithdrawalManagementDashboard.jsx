import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useData } from "@/contexts/DataContext";
import {
  calculateEventMetrics,
  getStatusBadgeColor,
} from "@/utils/withdrawalMetrics";
import SuperAdminWithdrawalActions from "./SuperAdminWithdrawalActions";
import SecretaryReadOnlyView from "./SecretaryReadOnlyView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RefreshCw,
  Download,
  Coins,
  Ticket,
  UserCheck,
  UserX,
  BarChart3,
  AlertCircle,
  ArrowUpDown, // 👈 IMPORT MANQUANT AJOUTÉ
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import * as XLSX from 'xlsx';
import { format } from "date-fns";

const WithdrawalManagementDashboard = () => {
  const { user } = useAuth();
  const { userProfile } = useData();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [eventStats, setEventStats] = useState({});

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEventType, setFilterEventType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterThreshold, setFilterThreshold] = useState("all");

  // Sorting State
  const [sortConfig, setSortConfig] = useState({
    key: "priority",
    direction: "desc",
  });

  useEffect(() => {
    setIsSuperAdmin(userProfile?.user_type === "super_admin");
  }, [userProfile]);

  const fetchEventStats = async (eventId, organizerId) => {
    try {
      const { data, error } = await supabase.rpc("get_verification_stats", {
        p_event_id: eventId,
        p_organizer_id: organizerId,
      });
      if (error) throw error;
      return data?.stats || null;
    } catch (err) {
      console.error(`Error loading stats for event ${eventId}:`, err);
      return null;
    }
  };

  const fetchAllEventsStats = async (eventsList) => {
    const statsPromises = eventsList.map((event) =>
      fetchEventStats(event.id, event.organizer_id).then((stats) => ({
        eventId: event.id,
        stats,
      }))
    );
    const results = await Promise.all(statsPromises);
    const statsMap = {};
    results.forEach(({ eventId, stats }) => {
      if (stats) statsMap[eventId] = stats;
    });
    setEventStats(statsMap);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("events")
        .select(
          `*,
          organizer:organizer_id (full_name, email, country, phone, available_earnings),
          validation_status:event_validation_status (status, admin_notes, created_at)`
        )
        .lt("event_end_at", new Date().toISOString())
        .order("event_end_at", { ascending: false });

      if (userProfile?.user_type === "secretary") {
        query = query.eq("country", userProfile.country);
      }

      const { data, error } = await query;
      if (error) throw error;

      setEvents(data || []);
      await fetchAllEventsStats(data || []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) fetchData();
  }, [userProfile]);

  const processedEvents = useMemo(() => {
    return events.map((event) => {
      const metrics = calculateEventMetrics(event);
      const organizerName = event.organizer?.full_name || "Utilisateur Supprimé";
      const stats = eventStats[event.id] || null;

      let statusPriority = 1;
      if (metrics.status === "EN_ATTENTE") statusPriority = 3;
      if (metrics.status === "AUCUNE_DEMANDE") statusPriority = 2;

      const enhancedMetrics = {
        ...metrics,
        totalTickets: stats?.total_tickets || metrics.ticketsSold || 0,
        verifiedTickets: stats?.verified_tickets || metrics.ticketsScanned || 0,
        verificationRate: stats?.verification_rate || metrics.scanPercentage || 0,
        remainingTickets: (stats?.total_tickets || metrics.ticketsSold || 0) -
          (stats?.verified_tickets || metrics.ticketsScanned || 0),
        netAmount: metrics.netAmount || 0,
      };

      return {
        ...event,
        metrics: enhancedMetrics,
        organizerName,
        statusPriority,
      };
    });
  }, [events, eventStats]);

  const filteredEvents = useMemo(() => {
    return processedEvents.filter((e) => {
      const matchesSearch = !searchTerm ||
        e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.organizerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterEventType === "all" || e.event_type === filterEventType;
      const matchesStatus = filterStatus === "all" || e.metrics.status === filterStatus;
      const matchesThreshold = filterThreshold === "all" ||
        (filterThreshold === "ok" && e.metrics.thresholdStatus === "ok") ||
        (filterThreshold === "critical" && e.metrics.thresholdStatus === "critical");

      return matchesSearch && matchesType && matchesStatus && matchesThreshold;
    });
  }, [processedEvents, searchTerm, filterEventType, filterStatus, filterThreshold]);

  const sortedEvents = useMemo(() => {
    const sorted = [...filteredEvents];
    sorted.sort((a, b) => {
      switch (sortConfig.key) {
        case "priority":
          if (a.statusPriority !== b.statusPriority) return a.statusPriority - b.statusPriority;
          return new Date(a.event_end_at) - new Date(b.event_end_at);
        case "date":
          return new Date(a.event_start_at) - new Date(b.event_start_at);
        case "amount":
          return a.metrics.netAmount - b.metrics.netAmount;
        case "scan_pct":
          return a.metrics.verificationRate - b.metrics.verificationRate;
        case "status":
          return a.metrics.status.localeCompare(b.metrics.status);
        case "participants":
          return a.metrics.totalTickets - b.metrics.totalTickets;
        default:
          return 0;
      }
    });
    if (sortConfig.direction === "desc") sorted.reverse();
    return sorted;
  }, [filteredEvents, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const handleExport = () => {
    const data = sortedEvents.map((e) => ({
      Date: format(new Date(e.event_start_at), "dd/MM/yyyy"),
      Événement: e.title,
      Organisateur: e.organizerName,
      Type: e.event_type,
      "Tickets Vendus": e.metrics.totalTickets,
      Scannés: e.metrics.verifiedTickets,
      Restants: e.metrics.remainingTickets,
      "Taux (%)": e.metrics.verificationRate,
      "Montant Net (Pièces)": e.metrics.netAmount,
      Statut: e.metrics.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Retraits");
    XLSX.writeFile(wb, "rapport_retraits.xlsx");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl border border-gray-700/50 shadow-xl">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Gestion des Retraits
            </h2>
            <p className="text-gray-400 mt-1">
              Validez les événements passés pour libérer les fonds.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="bg-gray-700/50 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
            >
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Événements</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{sortedEvents.length}</div>
              <p className="text-xs text-gray-400 mt-1">événements terminés</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Tickets Vendus</CardTitle>
              <Ticket className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {sortedEvents.reduce((sum, e) => sum + (e.metrics.totalTickets || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">total tous événements</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Tickets Scannés</CardTitle>
              <UserCheck className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">
                {sortedEvents.reduce((sum, e) => sum + (e.metrics.verifiedTickets || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {((sortedEvents.reduce((sum, e) => sum + (e.metrics.verifiedTickets || 0), 0) /
                  (sortedEvents.reduce((sum, e) => sum + (e.metrics.totalTickets || 0), 0) || 1)) * 100).toFixed(1)}% taux moyen
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Montant Total</CardTitle>
              <Coins className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-400">
                {sortedEvents.reduce((sum, e) => sum + (e.metrics.netAmount || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">pièces à valider</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end md:items-center flex-wrap">
              <div className="w-full md:w-64 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher événement, organisateur..."
                  className="pl-9 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2 flex-wrap flex-1">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px] bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="EN_ATTENTE">En Attente</SelectItem>
                    <SelectItem value="AUCUNE_DEMANDE">Non Initié</SelectItem>
                    <SelectItem value="VALIDE">Validé</SelectItem>
                    <SelectItem value="REFUSE">Refusé</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterEventType} onValueChange={setFilterEventType}>
                  <SelectTrigger className="w-[160px] bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Type d'événement" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="ticketing">Billetterie</SelectItem>
                    <SelectItem value="raffle">Tombola</SelectItem>
                    <SelectItem value="voting">Vote</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterThreshold} onValueChange={setFilterThreshold}>
                  <SelectTrigger className="w-[160px] bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Seuil Scan" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">Tous seuils</SelectItem>
                    <SelectItem value="ok" className="text-green-400">✅ Atteint (≥30%)</SelectItem>
                    <SelectItem value="critical" className="text-red-400">⚠️ Non atteint ({'<'}30%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-700/50">
                  <TableRow className="border-gray-700">
                    <TableHead className="cursor-pointer hover:bg-gray-700/50 text-gray-300" onClick={() => requestSort("date")}>
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[250px] text-gray-300">Événement / Organisateur</TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-700/50 text-gray-300" onClick={() => requestSort("participants")}>
                      <div className="flex items-center gap-1">
                        <span>Participants</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-700/50 text-gray-300" onClick={() => requestSort("scan_pct")}>
                      <div className="flex items-center gap-1">
                        <span>Scan %</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-700/50 text-gray-300" onClick={() => requestSort("amount")}>
                      <div className="flex items-center gap-1">
                        <span>Net (Coins)</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-700/50 text-gray-300" onClick={() => requestSort("status")}>
                      <div className="flex items-center gap-1">
                        <span>Statut</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-gray-400">
                        {loading ? "Chargement..." : "Aucun événement trouvé pour ces critères."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedEvents.map((event) => {
                      const isPending = event.metrics.status === "EN_ATTENTE";
                      const isLowAttendance = event.metrics.verificationRate < 30;
                      return (
                        <TableRow
                          key={event.id}
                          className={`group transition-colors border-gray-700 ${
                            isPending && isLowAttendance
                              ? "bg-red-900/20 hover:bg-red-900/30"
                              : isPending
                              ? "bg-amber-900/20 hover:bg-amber-900/30"
                              : "hover:bg-gray-700/30"
                          }`}
                        >
                          <TableCell className="whitespace-nowrap font-medium text-xs text-gray-300">
                            {format(new Date(event.event_start_at), "dd/MM/yyyy")}
                          </TableCell>

                          <TableCell>
                            <div className="font-semibold text-white text-sm line-clamp-1" title={event.title}>
                              {event.title}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <span className="uppercase text-[10px] font-bold bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                                {event.event_type}
                              </span>
                              <span className="line-clamp-1">{event.organizerName}</span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              <div className="flex items-center gap-2">
                                <Ticket className="h-3 w-3 text-blue-400" />
                                <span className="text-gray-300">{event.metrics.totalTickets}</span>
                              </div>
                              {event.event_type === "ticketing" && (
                                <>
                                  <div className="flex items-center gap-2">
                                    <UserCheck className="h-3 w-3 text-green-400" />
                                    <span className="text-gray-300">{event.metrics.verifiedTickets}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <UserX className="h-3 w-3 text-orange-400" />
                                    <span className="text-gray-300">{event.metrics.remainingTickets}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            {event.event_type === "ticketing" ? (
                              <Badge
                                className={`${
                                  event.metrics.verificationRate < 30
                                    ? "bg-red-900/50 text-red-300 border-red-700"
                                    : "bg-green-900/50 text-green-300 border-green-700"
                                } border whitespace-nowrap`}
                              >
                                {event.metrics.verificationRate}%
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-500 italic">N/A</span>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="font-mono font-medium flex items-center gap-1 text-sm">
                              <span className="text-amber-400">
                                {event.metrics.netAmount > 0 ? event.metrics.netAmount.toLocaleString() : "0"}
                              </span>
                              <Coins className="h-3 w-3 text-amber-400" />
                            </div>
                          </TableCell>

                          <TableCell>
                            <SecretaryReadOnlyView event={event} metrics={event.metrics} />
                          </TableCell>

                          <TableCell className="text-right">
                            {isSuperAdmin ? (
                              <SuperAdminWithdrawalActions
                                event={event}
                                metrics={event.metrics}
                                adminId={user?.id}
                                onActionComplete={fetchData}
                                isReadOnly={false}
                              />
                            ) : (
                              <SuperAdminWithdrawalActions
                                event={event}
                                metrics={event.metrics}
                                adminId={user?.id}
                                isReadOnly={true}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WithdrawalManagementDashboard;