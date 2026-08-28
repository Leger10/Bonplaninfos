import React, { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  RefreshCw,
  CheckCircle2,
  XCircle,
  Smartphone,
  Ticket,
  Coins,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const STATUS_LABELS = {
  pending: { label: "En attente", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
  completed: { label: "Validé", cls: "bg-green-500/20 text-green-400 border-green-500/40" },
  cancelled: { label: "Rejeté", cls: "bg-red-500/20 text-red-400 border-red-500/40" },
};

const USSDPaymentsTab = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          created_at,
          amount_fcfa,
          coins_amount,
          user_id,
          status,
          payment_method,
          transaction_id,
          pack_id,
          profiles!payments_user_id_fkey (full_name, email, phone)
        `)
        .eq("payment_method", "ussd")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Détails USSD (réf. SMS + capture d'écran) stockés dans transactions.metadata
      const { data: txs, error: txsErr } = await supabase
        .from("transactions")
        .select("id, created_at, user_id, metadata")
        .not("metadata", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);

      const proofMap = {};
      if (!txsErr && txs) {
        for (const tx of txs) {
          const u = tx.metadata?.ussd;
          if (u && tx.metadata?.payment_id) {
            if (!proofMap[tx.metadata.payment_id]) {
              proofMap[tx.metadata.payment_id] = {
                sms_reference: u.sms_reference || "",
                proof_url: u.proof_url || "",
              };
            }
          }
        }
      }

      setPayments(
        (data || []).map((p) => ({
          ...p,
          ussd: proofMap[p.id] || { sms_reference: "", proof_url: "" },
        }))
      );
    } catch (err) {
      console.error("❌ Erreur chargement paiements USSD:", err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paiements USSD.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const act = async (payment, action) => {
    setProcessingId(payment.id);
    try {
      const res = await fetch("/.netlify/functions/ussd-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action, paymentId: payment.id }),
      });
      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error("Réponse invalide du serveur");
      }
      if (!res.ok || !result.success) {
        throw new Error(result.message || `Erreur HTTP ${res.status}`);
      }
      toast({
        title: result.message,
        className: action === "validate" ? "bg-green-600 text-white" : "bg-red-600 text-white",
      });
      await fetchPayments();
    } catch (err) {
      console.error("❌ Erreur action admin:", err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = payments.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const profile = p.profiles || {};
      const ref = p.ussd?.sms_reference || "";
      return (
        (profile.full_name || "").toLowerCase().includes(q) ||
        (profile.phone || "").includes(q) ||
        (p.transaction_id || "").toLowerCase().includes(q) ||
        ref.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-yellow-500" />
          <CardTitle className="text-lg">Paiements USSD (mobile money)</CardTitle>
          <Badge variant="outline" className="ml-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/40">
            {pendingCount} à valider
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex gap-2">
            {["pending", "completed", "cancelled", "all"].map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className={filter === f ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}
              >
                {f === "pending" ? "En attente" : f === "completed" ? "Validés" : f === "cancelled" ? "Rejetés" : "Tous"}
              </Button>
            ))}
          </div>
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Rechercher (nom, téléphone, référence SMS, ID)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            Aucun paiement USSD {filter !== "all" ? "dans cet état" : ""}.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Réf. SMS</TableHead>
                  <TableHead>Preuve</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const st = STATUS_LABELS[p.status] || STATUS_LABELS.pending;
                  const isTickets = p.pack_id === "ticket_payment";
                  const smsRef = p.ussd?.sms_reference || "—";
                  const proofUrl = p.ussd?.proof_url || "";
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.profiles?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{p.profiles?.email || ""}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{p.profiles?.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={isTickets ? "bg-blue-500/20 text-blue-400 border-blue-500/40" : "bg-purple-500/20 text-purple-400 border-purple-500/40"}>
                          {isTickets ? <Ticket className="w-3 h-3 mr-1" /> : <Coins className="w-3 h-3 mr-1" />}
                          {isTickets ? "Billets" : "Crédits"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.amount_fcfa?.toLocaleString()} FCFA
                        {!isTickets && (
                          <div className="text-xs text-muted-foreground">+{p.coins_amount} pièces</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{smsRef}</TableCell>
                      <TableCell>
                        {proofUrl ? (
                          <a href={proofUrl} target="_blank" rel="noreferrer" title="Voir la capture d'écran (nouvel onglet)">
                            <img
                              src={proofUrl}
                              alt="Preuve de paiement"
                              className="w-14 h-14 object-cover rounded-md border border-gray-700 hover:opacity-80 cursor-pointer"
                            />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Aucune</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={st.cls}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("fr-FR")}{" "}
                        {new Date(p.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => act(p, "validate")}
                              disabled={processingId === p.id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {processingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                              Valider
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => act(p, "reject")}
                              disabled={processingId === p.id}
                              className="border-red-600 text-red-500 hover:bg-red-600/10"
                            >
                              {processingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                              Rejeter
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{p.transaction_id}</span>
                        )}
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
  );
};

export default USSDPaymentsTab;