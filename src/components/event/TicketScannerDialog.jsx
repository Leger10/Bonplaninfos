import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  QrCode, LogIn, LogOut, History, Scan, FileSpreadsheet, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import QrScanner from '@/components/event/QrScanner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function TicketScannerDialog({ 
  isOpen, 
  onClose, 
  eventId,
  eventEndDate // nouvelle prop optionnelle (ex: "2026-02-20")
}) {

  const [activeTab, setActiveTab] = useState('entry');
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [flashColor, setFlashColor] = useState(null);
  const [manualCode, setManualCode] = useState('');

  const lockedRef = useRef(false);

  // Vérification si l'événement est terminé
  const isEventFinished = useMemo(() => {
    if (!eventEndDate) return false;
    return new Date(eventEndDate) < new Date();
  }, [eventEndDate]);

  const formattedEndDate = useMemo(() => {
    if (!eventEndDate) return '';
    return new Date(eventEndDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, [eventEndDate]);

  const sounds = useRef({
    entry: new Audio('/sounds/entry.mp3'),
    exit: new Audio('/sounds/exit.mp3'),
    error: new Audio('/sounds/error.mp3'),
  });

  const playFeedback = (type) => {
    sounds.current[type]?.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(type === 'error' ? 500 : 150);
    setFlashColor(type === 'error' ? 'red' : 'green');
    setTimeout(() => setFlashColor(null), 300);
  };

  useEffect(() => {
    if (isOpen) {
      setScanResult(null);
      setManualCode('');
      lockedRef.current = false;
    }
  }, [isOpen]);

  const saveOffline = (scan) => {
    const list = JSON.parse(localStorage.getItem('offline_scans') || '[]');
    list.push(scan);
    localStorage.setItem('offline_scans', JSON.stringify(list));
  };

  const clearHistory = () => {
    setScanHistory([]);
    localStorage.removeItem('offline_scans');
  };

  // Fonction pour obtenir le message à afficher selon le contexte
  const getDisplayMessage = (result) => {
    if (result.success) {
      return result.message; // message de succès
    }

    // Si l'événement est terminé, on priorise ce message
    if (isEventFinished) {
      return `Cet événement est terminé depuis le ${formattedEndDate}. Le ticket n'est pas pour cet événement. Merci 🥺`;
    }

    // Si le message d'erreur indique que le ticket n'appartient pas à cet événement
    // On utilise une détection simple sur le texte (adaptez selon les messages réels)
    const lowerMsg = result.message?.toLowerCase() || '';
    if (lowerMsg.includes('pas pour cet événement') || lowerMsg.includes('n\'appartient pas')) {
      return `Le ticket n'est pas pour cet événement. Merci 🥺`;
    }

    // Sinon on retourne le message d'erreur original
    return result.message;
  };

  const processVerification = useCallback(async (code, isManual = false) => {
    if (!code || lockedRef.current || scanResult) return;

    lockedRef.current = true;
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.rpc('verify_ticket_v3', {
        p_ticket_identifier: code,
        p_verification_method: isManual ? 'manual_entry' : 'qr_scanner_web',
        p_exit_mode: activeTab === 'exit',
      });

      if (error) throw error;

      const result = {
        code,
        success: data.success,
        message: data.message,
        attendee: data.attendee_name,
        ticketType: data.ticket_type,
        timestamp: Date.now(),
        mode: activeTab,
        isManual,
      };

      setScanResult(result);
      setScanHistory(prev => [result, ...prev].slice(0, 50));
      saveOffline(result);

      playFeedback(data.success ? (activeTab === 'exit' ? 'exit' : 'entry') : 'error');

    } catch {
      const errorResult = {
        code,
        success: false,
        message: 'Erreur technique',
        timestamp: Date.now(),
        mode: activeTab,
        isManual,
      };
      setScanResult(errorResult);
      setScanHistory(prev => [errorResult, ...prev].slice(0, 50));
      saveOffline(errorResult);
      playFeedback('error');
    } finally {
      setIsProcessing(false);
      setManualCode('');
    }
  }, [activeTab, scanResult, isEventFinished, formattedEndDate]);

  const handleScan = (code) => {
    if (isProcessing || scanResult) return;
    processVerification(code.trim(), false);
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    processVerification(manualCode.trim(), true);
  };

  const handleNextScan = () => {
    setScanResult(null);
    lockedRef.current = false;
  };

  /* =========================
     EXPORT EXCEL
  ========================== */
  const exportScansToExcel = () => {
    if (scanHistory.length === 0) return;

    const data = scanHistory.map((s, i) => ({
      "#": i + 1,
      "Participant": s.attendee || "—",
      "Code Billet": s.code,
      "Statut": s.success ? "VALIDÉ" : "REFUSÉ",
      "Sens": s.mode === 'entry' ? "ENTRÉE" : "SORTIE",
      "Méthode": s.isManual ? "Manuel" : "QR Code",
      "Message": s.message,
      "Heure": new Date(s.timestamp).toLocaleTimeString(),
      "Date": new Date(s.timestamp).toLocaleDateString(),
      "Type Billet": s.ticketType || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Scans');

    XLSX.writeFile(
      wb,
      `scans_event_${eventId}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  /* =========================
     EXPORT PDF
  ========================== */
  const exportScansToPDF = () => {
    if (scanHistory.length === 0) return;

    const doc = new jsPDF();

    autoTable(doc, {
      head: [["#", "Participant", "Code Billet", "Statut", "Sens", "Méthode", "Message", "Heure", "Date", "Type Billet"]],
      body: scanHistory.map((s, i) => [
        i + 1,
        s.attendee || "—",
        s.code,
        s.success ? "VALIDÉ" : "REFUSÉ",
        s.mode === "entry" ? "ENTRÉE" : "SORTIE",
        s.isManual ? "Manuel" : "QR Code",
        s.message,
        new Date(s.timestamp).toLocaleTimeString(),
        new Date(s.timestamp).toLocaleDateString(),
        s.ticketType || "-"
      ]),
      startY: 15,
      styles: { fontSize: 8 }
    });

    doc.save(`scans_event_${eventId}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-full bg-black text-white p-0 overflow-hidden max-h-screen">

        {/* FLASH */}
        {flashColor && (
          <div className={cn(
            "absolute inset-0 z-50 pointer-events-none",
            flashColor === 'green'
              ? "bg-green-500/40"
              : "bg-red-500/40"
          )} />
        )}

        <DialogHeader className="p-4 border-b border-gray-800">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <QrCode className="w-5 h-5 text-blue-400" />
            Scanner Billets
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {activeTab === 'entry' ? 'Mode Entrée' : 'Mode Sortie'}
          </DialogDescription>
        </DialogHeader>

        {/* MODE */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-2">
          <TabsList className="grid grid-cols-2 bg-gray-800">
            <TabsTrigger value="entry" className="data-[state=active]:bg-green-600 text-xs sm:text-sm">
              <LogIn className="w-4 h-4 mr-1" /> Entrée
            </TabsTrigger>
            <TabsTrigger value="exit" className="data-[state=active]:bg-orange-600 text-xs sm:text-sm">
              <LogOut className="w-4 h-4 mr-1" /> Sortie
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* SAISIE MANUELLE */}
        <div className="px-3 pb-2 flex gap-2 flex-col sm:flex-row">
          <Input
            placeholder="Saisir code billet"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            disabled={!!scanResult}
            className="flex-1"
          />
          <Button
            onClick={handleManualSubmit}
            disabled={!manualCode.trim() || !!scanResult}
            variant="outline"
            className="w-full sm:w-auto flex items-center justify-center gap-1"
          >
            <span>Valider</span>
            <Scan className="w-4 h-4" />
          </Button>
        </div>

        {/* SCANNER */}
        <div className="relative min-h-[260px] sm:min-h-[320px]">
          <QrScanner isScanning={isOpen && !scanResult} onScan={handleScan} />

          {scanResult && (
            <div className="absolute inset-x-0 bottom-0 p-4 bg-black/90">
              <div className={cn(
                "rounded-xl p-4 border-2",
                scanResult.success
                  ? "border-green-500 bg-green-900/40"
                  : "border-red-500 bg-red-900/40"
              )}>
                <h3 className="font-bold text-lg text-center">
                  {scanResult.success ? 'VALIDÉ' : 'REFUSÉ'}
                </h3>
                <p className="text-sm text-center">
                  {getDisplayMessage(scanResult)}
                </p>

                {scanResult.attendee && (
                  <p className="mt-2 font-semibold text-center">{scanResult.attendee}</p>
                )}

                <Button
                  onClick={handleNextScan}
                  className="w-full mt-3"
                  variant="outline"
                >
                  <Scan className="w-4 h-4 mr-2" />
                  Continuer
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* HISTORIQUE */}
        <div className="h-[180px] sm:h-[200px] border-t border-gray-800 p-2 flex flex-col">
          <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <History className="w-3 h-3" /> Historique
            </span>

            <div className="flex gap-1 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={exportScansToExcel}
                disabled={scanHistory.length === 0}
                className="text-xs text-green-400 border-green-600"
              >
                <FileSpreadsheet className="w-3 h-3" />
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={exportScansToPDF}
                disabled={scanHistory.length === 0}
                className="text-xs text-blue-400 border-blue-600"
              >
                PDF
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={clearHistory}
                disabled={scanHistory.length === 0}
                className="text-xs text-red-400 border-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {scanHistory.length === 0 ? (
              <p className="text-xs text-gray-500 text-center mt-6">
                Aucun scan
              </p>
            ) : scanHistory.map((s, i) => (
              <div key={i} className="flex justify-between text-xs p-1">
                <span>{s.attendee || s.code}</span>
                <Badge variant="outline" className={s.success ? 'text-green-400' : 'text-red-400'}>
                  {s.success ? 'OK' : 'REFUS'}
                </Badge>
              </div>
            ))}
          </ScrollArea>
        </div>

      </DialogContent>
    </Dialog>
  );
}