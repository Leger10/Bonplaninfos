import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrCode, LogIn, LogOut, Check, X, AlertTriangle, RefreshCw, Key, Camera } from 'lucide-react';
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
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  // Initialiser le scanneur quand le dialog s'ouvre
  useEffect(() => {
    if (isOpen) {
      // Réinitialiser l'état
      setScanResult(null);
      setManualCode('');
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen]);

  const processVerification = async (code, isManual = false) => {
    if (isProcessing) return;
    
    // Validation de base
    if (!code || code.trim() === '') {
      setErrorMessage('Veuillez entrer un code de billet');
      return;
    }

    // Debounce: éviter de scanner le même code immédiatement
    if (scanResult && scanResult.code === code && (Date.now() - scanResult.timestamp < 2000)) {
      setErrorMessage('Code déjà scanné récemment');
      return;
    }

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
        timestamp: Date.now(),
        mode: activeTab,
        isManual: isManual
      };

      setScanResult(result);
      
      // Ajouter à l'historique
      setScanHistory(prev => [result, ...prev].slice(0, 20));

      // Définir les messages de succès/erreur
      if (data.success) {
        setSuccessMessage(data.message);
        // Effacer le code manuel si succès
        if (isManual) {
          setManualCode('');
        }
        // Auto-clear après 3 secondes
        setTimeout(() => {
          setScanResult(null);
          setSuccessMessage('');
        }, 3000);
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
        timestamp: Date.now(),
        mode: activeTab,
        isManual: isManual
      };
      setScanResult(errorResult);
      setErrorMessage("Erreur technique lors de la vérification");
      setScanHistory(prev => [errorResult, ...prev].slice(0, 20));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setErrorMessage('Veuillez entrer un code de billet');
      return;
    }
    processVerification(manualCode.trim(), true);
  };

  const handleScan = (code) => {
    processVerification(code, false);
  };

  const handleClose = () => {
    setScanResult(null);
    setManualCode('');
    setErrorMessage('');
    setSuccessMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-black text-white border-gray-800">
        <DialogHeader className="p-4 bg-gray-900 border-b border-gray-800">
          <DialogTitle className="flex items-center justify-center gap-2 text-white">
            <QrCode className="w-5 h-5 text-blue-400" /> 
            Scanner de Billets
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            {activeTab === 'entry' ? 'Mode Entrée / Réentrée' : 'Mode Sortie'}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Sélection (QR/Manuel) */}
        <div className="bg-gray-900 p-2">
          <Tabs defaultValue="qr" value={scanMode} onValueChange={setScanMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="qr" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Camera className="w-4 h-4 mr-2" /> Scan QR
              </TabsTrigger>
              <TabsTrigger value="manual" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Key className="w-4 h-4 mr-2" /> Saisie manuelle
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Entry/Exit Mode */}
        <div className="bg-gray-900 p-2 pb-4">
          <Tabs defaultValue="entry" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="entry" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                <LogIn className="w-4 h-4 mr-2" /> Entrée
              </TabsTrigger>
              <TabsTrigger value="exit" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                <LogOut className="w-4 h-4 mr-2" /> Sortie
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Scanner ou Saisie manuelle */}
        <div className="flex-1 bg-black min-h-[300px] flex flex-col">
          {scanMode === 'qr' ? (
            <div className="relative flex-1 overflow-hidden">
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
            </div>
          ) : (
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
              <div className="w-full max-w-sm">
                <div className="mb-6 text-center">
                  <Key className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-white mb-2">Saisie manuelle</h3>
                  <p className="text-gray-400 text-sm">
                    Entrez le code du billet pour vérification
                  </p>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Code du billet (ex: TKT-ABC123)"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="bg-gray-900 border-gray-700 text-white text-center text-lg py-3 h-12 focus:border-purple-500 focus:ring-purple-500/20"
                      disabled={isProcessing}
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 text-center">
                      Saisissez le code présent sur le billet (QR code ou référence)
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 h-12 shadow-lg border-0"
                    disabled={isProcessing || !manualCode.trim()}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Vérification en cours...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Vérifier le billet
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Messages d'erreur/succès */}
        {errorMessage && (
          <div className="bg-red-900/30 border-t border-red-800/50 p-4">
            <Alert variant="destructive" className="bg-red-900/20 border-red-800/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-red-300">Erreur</AlertTitle>
              <AlertDescription className="text-red-400">{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        {successMessage && !scanResult && (
          <div className="bg-green-900/30 border-t border-green-800/50 p-4">
            <Alert className="bg-green-900/20 border-green-800/50">
              <Check className="h-4 w-4 text-green-400" />
              <AlertTitle className="text-green-300">Succès</AlertTitle>
              <AlertDescription className="text-green-400">{successMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Résultat du scan */}
        {scanResult && (
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-50 backdrop-blur-sm bg-opacity-90 transition-all animate-in fade-in zoom-in duration-200",
            scanResult.success ? "bg-green-900/90" : "bg-red-900/90"
          )}>
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mb-4 border-4 shadow-xl",
              scanResult.success ? "bg-green-100 border-green-500" : "bg-red-100 border-red-500"
            )}>
              {scanResult.success ? (
                <Check className="w-10 h-10 text-green-600" />
              ) : (
                <X className="w-10 h-10 text-red-600" />
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              {scanResult.success ? (
                activeTab === 'exit' ? 'Sortie Validée' : 'Entrée Validée'
              ) : 'Scan Refusé'}
            </h2>
            
            <p className="text-white/90 text-lg font-medium mb-4">
              {scanResult.message}
            </p>

            {scanResult.attendee && (
              <div className="bg-white/10 rounded-lg p-3 w-full max-w-xs border border-white/20">
                <p className="text-xs text-white/60 uppercase font-bold">Participant</p>
                <p className="text-lg font-semibold text-white">{scanResult.attendee}</p>
                {scanResult.ticketType && (
                  <Badge variant="outline" className="mt-2 bg-transparent text-white border-white/40">
                    {scanResult.ticketType}
                  </Badge>
                )}
                {scanResult.eventName && (
                  <p className="text-xs text-white/60 mt-2">Événement: {scanResult.eventName}</p>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setScanResult(null);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                {scanMode === 'manual' ? 'Nouvelle vérification' : 'Scanner suivant'}
              </Button>
            </div>
          </div>
        )}

        {/* Historique des scans */}
        <div className="bg-gray-900 border-t border-gray-800 p-3 h-[180px] flex flex-col">
          <h3 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
            <RefreshCw className="w-3 h-3" /> Historique de session
          </h3>
          <ScrollArea className="flex-1">
            {scanHistory.length > 0 ? (
              <div className="space-y-2">
                {scanHistory.map((scan, i) => (
                  <div key={i} className="bg-gray-800/50 rounded p-2 flex items-center justify-between text-xs border border-gray-700/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0", 
                        scan.success ? "bg-green-500" : "bg-red-500"
                      )} />
                      <div className="flex flex-col truncate">
                        <span className="text-white font-medium truncate">
                          {scan.attendee || 'Billet inconnu'}
                        </span>
                        <span className="text-gray-500 text-[10px] truncate">
                          {new Date(scan.timestamp).toLocaleTimeString()} • 
                          {scan.mode === 'entry' ? ' Entrée' : ' Sortie'} • 
                          {scan.isManual ? ' Manuel' : ' QR'}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(
                      "ml-2 shrink-0 border-0", 
                      scan.success ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                    )}>
                      {scan.success ? 'OK' : 'REFUS'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-600 text-xs italic">
                En attente de vérification...
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketScannerDialog;