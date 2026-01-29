import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrCode, LogIn, LogOut, Check, X, AlertTriangle, RefreshCw, Key, Camera, Trash2, History, Scan } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import QrScanner from '@/components/event/QrScanner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const TicketScannerDialog = ({ isOpen, onClose, eventId }) => {
  const [activeTab, setActiveTab] = useState('entry');
  const [scanMode, setScanMode] = useState('qr'); // 'qr' or 'manual'
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const scannerRef = useRef(null);
  
  // Cache pour éviter les doublons trop rapides (500ms)
  const lastProcessedCode = useRef(null);
  const lastProcessedTime = useRef(0);
  const DEBOUNCE_TIME = 800; // 800ms entre deux scans du même code

  // Initialiser le scanneur quand le dialog s'ouvre
  useEffect(() => {
    if (isOpen) {
      // Réinitialiser l'état
      setScanResult(null);
      setManualCode('');
      setErrorMessage('');
      setSuccessMessage('');
      lastProcessedCode.current = null;
      lastProcessedTime.current = 0;
    }
  }, [isOpen]);

  const processVerification = useCallback(async (code, isManual = false) => {
    const now = Date.now();
    
    // Débounce: éviter de traiter le même code trop rapidement
    if (code === lastProcessedCode.current && (now - lastProcessedTime.current) < DEBOUNCE_TIME) {
      console.log('Code ignoré: dépassement du délai de sécurité');
      return;
    }
    
    // Validation de base
    if (!code || code.trim() === '') {
      setErrorMessage('Veuillez entrer un code de billet');
      return;
    }

    // Mettre à jour le cache
    lastProcessedCode.current = code;
    lastProcessedTime.current = now;

    setIsProcessing(true);
    setScanResult(null);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.log('Vérification du code:', code);
      
      const { data, error } = await supabase.rpc('verify_ticket_v3', {
        p_ticket_identifier: code,
        p_verification_method: isManual ? 'manual_entry' : 'qr_scanner_web',
        p_exit_mode: activeTab === 'exit'
      });

      if (error) {
        console.error('Erreur de vérification:', error);
        throw new Error(error.message || 'Erreur lors de la vérification');
      }

      console.log('Résultat de vérification:', data);

      const result = {
        code: code,
        success: data.success,
        statusCode: data.status_code,
        message: data.message,
        attendee: data.attendee_name,
        ticketType: data.ticket_type,
        eventName: data.event_name,
        timestamp: now,
        mode: activeTab,
        isManual: isManual,
        timeString: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setScanResult(result);
      
      // Ajouter à l'historique (limité à 15 entrées)
      setScanHistory(prev => [result, ...prev].slice(0, 15));

      // Définir les messages de succès/erreur
      if (data.success) {
        setSuccessMessage(data.message);
        // Effacer le code manuel si succès
        if (isManual) {
          setManualCode('');
        }
        // Ne pas auto-clear pour permettre au scanner de continuer
      } else {
        setErrorMessage(data.message);
      }

    } catch (err) {
      console.error("Erreur de scan:", err);
      const errorResult = {
        code: code,
        success: false,
        message: "Erreur technique lors de la vérification",
        statusCode: "system_error",
        timestamp: now,
        mode: activeTab,
        isManual: isManual,
        timeString: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setScanResult(errorResult);
      setErrorMessage("Erreur technique lors de la vérification");
      setScanHistory(prev => [errorResult, ...prev].slice(0, 15));
      
    } finally {
      setIsProcessing(false);
    }
  }, [activeTab]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setErrorMessage('Veuillez entrer un code de billet');
      return;
    }
    processVerification(manualCode.trim(), true);
  };

  const handleScan = useCallback((code) => {
    // Ne pas traiter si déjà en cours de traitement
    if (isProcessing) {
      return;
    }
    
    // Normaliser le code (enlever les espaces)
    const normalizedCode = code.trim();
    
    // Vérifier que le code n'est pas vide
    if (!normalizedCode) {
      return;
    }
    
    processVerification(normalizedCode, false);
  }, [isProcessing, processVerification]);

  const handleClose = () => {
    setScanResult(null);
    setManualCode('');
    setErrorMessage('');
    setSuccessMessage('');
    onClose();
  };

  const clearHistory = () => {
    setScanHistory([]);
  };

  const handleNextScan = () => {
    setScanResult(null);
    setErrorMessage('');
    setSuccessMessage('');
    // Reset du cache pour permettre de scanner le même code à nouveau
    lastProcessedCode.current = null;
    lastProcessedTime.current = 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-black text-white border-gray-800">
        <DialogHeader className="p-4 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-white">
              <QrCode className="w-5 h-5 text-blue-400" /> 
              Scanner de Billets
            </DialogTitle>
            {scanHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-xs text-gray-400 hover:text-white h-8 px-2"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Effacer
              </Button>
            )}
          </div>
          <DialogDescription className="text-center text-gray-400">
            {activeTab === 'entry' ? 'Mode Entrée / Réentrée' : 'Mode Sortie'}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Sélection (QR/Manuel) */}
        <div className="bg-gray-900 p-2">
          <Tabs defaultValue="qr" value={scanMode} onValueChange={setScanMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="qr" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm">
                <Camera className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Scan QR
              </TabsTrigger>
              <TabsTrigger value="manual" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm">
                <Key className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Manuelle
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Entry/Exit Mode */}
        <div className="bg-gray-900 p-2 pb-4">
          <Tabs defaultValue="entry" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="entry" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm">
                <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Entrée
              </TabsTrigger>
              <TabsTrigger value="exit" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-xs sm:text-sm">
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Sortie
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Scanner ou Saisie manuelle - TOUJOURS ACTIF */}
        <div className="flex-1 bg-black min-h-[300px] flex flex-col">
          {scanMode === 'qr' ? (
            <div className="relative flex-1 overflow-hidden">
              {/* Le scanner est TOUJOURS actif, même pendant l'affichage du résultat */}
              <QrScanner 
                isScanning={isOpen && scanMode === 'qr'} 
                onScan={handleScan}
                onError={(err) => {
                  console.error('Erreur scanner:', err);
                  setErrorMessage('Erreur du scanner. Essayez la saisie manuelle.');
                }} 
                ref={scannerRef}
              />
              
              {/* Overlay de guidage */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-white/40 rounded-lg relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-white/40 rounded-full"></div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-white/40 rounded-full"></div>
                  <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 h-16 w-1 bg-white/40 rounded-full"></div>
                  <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 h-16 w-1 bg-white/40 rounded-full"></div>
                </div>
              </div>
              
              {/* Indicateur de traitement en cours (transparent) */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="text-center p-4">
                    <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-white font-medium text-sm">Vérification en cours...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center">
              <div className="w-full max-w-sm">
                <div className="mb-4 sm:mb-6 text-center">
                  <Key className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400 mx-auto mb-2 sm:mb-3" />
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Saisie manuelle</h3>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    Entrez le code du billet pour vérification
                  </p>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1 sm:space-y-2">
                    <Input
                      type="text"
                      placeholder="Code du billet (ex: TKT-ABC123)"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="bg-gray-900 border-gray-700 text-white text-center text-base sm:text-lg py-3 h-10 sm:h-12 focus:border-purple-500 focus:ring-purple-500/20"
                      disabled={isProcessing}
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 text-center px-2">
                      Saisissez le code présent sur le billet (QR code ou référence)
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 h-10 sm:h-12 shadow-lg border-0 text-sm sm:text-base"
                    disabled={isProcessing || !manualCode.trim()}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Vérifier
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Résultat du scan (Overlay non-bloquant) */}
        {scanResult && (
          <div className={cn(
            "absolute inset-x-0 bottom-0 top-auto flex flex-col items-center p-4 text-center z-40 bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-sm transition-all animate-in slide-in-from-bottom duration-300",
            scanResult.success ? "" : ""
          )}>
            <div className="w-full max-w-sm bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 border-2 shadow-2xl" style={{
              borderColor: scanResult.success ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
              backgroundColor: scanResult.success ? 'rgba(6, 78, 59, 0.9)' : 'rgba(127, 29, 29, 0.9)'
            }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    scanResult.success ? "bg-green-500" : "bg-red-500"
                  )}>
                    {scanResult.success ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <X className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {scanResult.success ? (
                        activeTab === 'exit' ? 'SORTIE VALIDÉE' : 'ENTRÉE VALIDÉE'
                      ) : 'SCAN REFUSÉ'}
                    </h3>
                    <p className="text-xs text-white/80">
                      {new Date(scanResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleNextScan}
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Scan className="w-4 h-4 mr-1" />
                  Suivant
                </Button>
              </div>
              
              <div className="mb-3">
                <p className="text-white font-medium">
                  {scanResult.message}
                </p>
              </div>

              {scanResult.attendee && (
                <div className="bg-white/10 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/60 uppercase font-bold mb-1">Participant</p>
                      <p className="text-base font-semibold text-white">{scanResult.attendee}</p>
                    </div>
                    {scanResult.ticketType && (
                      <Badge variant="outline" className="bg-transparent text-white border-white/40 text-xs">
                        {scanResult.ticketType}
                      </Badge>
                    )}
                  </div>
                  {scanResult.eventName && (
                    <p className="text-xs text-white/60 mt-2">Événement: {scanResult.eventName}</p>
                  )}
                </div>
              )}
              
              <div className="flex justify-center">
                <Button
                  onClick={handleNextScan}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  Scanner le billet suivant
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Messages d'erreur/succès (barre en bas) */}
        {(errorMessage || successMessage) && !scanResult && (
          <div className={cn(
            "border-t p-3",
            errorMessage ? "bg-red-900/30 border-red-800/50" : "bg-green-900/30 border-green-800/50"
          )}>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                errorMessage ? "bg-red-500" : "bg-green-500"
              )} />
              <span className={cn(
                "text-sm font-medium",
                errorMessage ? "text-red-300" : "text-green-300"
              )}>
                {errorMessage || successMessage}
              </span>
            </div>
          </div>
        )}

        {/* Historique des scans */}
        <div className="bg-gray-900 border-t border-gray-800 p-2 sm:p-3 h-[140px] sm:h-[180px] flex flex-col">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <h3 className="text-xs font-bold text-gray-400 flex items-center gap-1 sm:gap-2">
              <History className="w-3 h-3" /> Historique ({scanHistory.length})
            </h3>
            {scanHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-xs text-gray-500 hover:text-white h-6 px-2 hidden sm:flex"
              >
                Effacer
              </Button>
            )}
          </div>
          
          <ScrollArea className="flex-1">
            {scanHistory.length > 0 ? (
              <div className="space-y-1 sm:space-y-2">
                {scanHistory.map((scan, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "bg-gray-800/50 rounded p-1.5 sm:p-2 flex items-center justify-between text-xs border",
                      scan.success ? "border-green-900/50" : "border-red-900/50"
                    )}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0", 
                        scan.success ? "bg-green-500" : "bg-red-500"
                      )} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium truncate text-[11px] sm:text-xs">
                            {scan.attendee || 'Billet inconnu'}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "ml-1 sm:ml-2 shrink-0 border-0 text-[9px] sm:text-xs h-4 sm:h-5",
                              scan.success ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                            )}
                          >
                            {scan.success ? 'OK' : 'REFUS'}
                          </Badge>
                        </div>
                        <div className="flex items-center text-[9px] sm:text-[10px] text-gray-500 gap-1 sm:gap-2 mt-0.5">
                          <span className="truncate">{scan.timeString}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className={cn(
                            "px-1 py-0.5 rounded text-[8px] sm:text-[9px]",
                            scan.mode === 'entry' 
                              ? "bg-green-900/30 text-green-400" 
                              : "bg-orange-900/30 text-orange-400"
                          )}>
                            {scan.mode === 'entry' ? 'ENTRÉE' : 'SORTIE'}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate hidden sm:inline">
                            {scan.isManual ? 'Manuel' : 'QR'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 text-xs italic p-4">
                <History className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-center">Aucun scan pour le moment</p>
                <p className="text-[10px] text-gray-500 mt-1">Scannez votre premier billet</p>
              </div>
            )}
          </ScrollArea>
          
          {scanHistory.length > 0 && (
            <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-gray-800/50">
              <div className="flex justify-between text-[10px] sm:text-xs text-gray-500">
                <span>Statistiques:</span>
                <span>
                  {scanHistory.filter(s => s.success).length} ✓ / 
                  {scanHistory.filter(s => !s.success).length} ✗
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketScannerDialog;