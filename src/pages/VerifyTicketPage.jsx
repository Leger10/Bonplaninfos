import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ShieldCheck, PowerOff, RefreshCcw, CameraOff } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';

// Dynamically import QrScanner to avoid SSR issues and handle loading state
const QrScanner = ({ onScan }) => {
    const scannerRef = useRef(null);
    const [hasCameraPermission, setHasCameraPermission] = useState(true);
    const [initError, setInitError] = useState(null);

    useEffect(() => {
        let html5QrCode;
        
        const startScan = async () => {
            try {
                // Dynamic import for better performance
                const { Html5Qrcode } = await import('html5-qrcode');
                
                // Cleanup previous instance if exists
                if (scannerRef.current) {
                    try {
                        await scannerRef.current.stop();
                        scannerRef.current.clear();
                    } catch (e) {
                        // Ignore stop errors
                    }
                }

                html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        onScan(decodedText);
                    },
                    (errorMessage) => {
                        // Scanning... ignore frames without QR
                    }
                );
                setHasCameraPermission(true);
            } catch (err) {
                console.error("Error starting scanner:", err);
                setInitError(err.message);
                setHasCameraPermission(false);
            }
        };

        startScan();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(err => console.warn("Scanner stop error", err));
            }
        };
    }, [onScan]);

    if (!hasCameraPermission || initError) {
        return (
            <div className="h-[300px] w-full flex flex-col items-center justify-center bg-gray-900 rounded-lg text-center p-4 border-2 border-dashed border-gray-700">
                <CameraOff className="w-12 h-12 text-destructive mb-4" />
                <p className="text-white font-semibold">Caméra inaccessible</p>
                <p className="text-sm text-gray-400 mt-2">Veuillez autoriser l'accès à la caméra ou utiliser la saisie manuelle.</p>
                {initError && <p className="text-xs text-red-400 mt-2">Erreur: {initError}</p>}
            </div>
        );
    }

    return (
        <div id="reader" className="w-full rounded-lg overflow-hidden bg-black border-2 border-gray-800"></div>
    );
};

const VerifyTicketPage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState('scan'); // 'scan' or 'manual'
    const [scannerCode, setScannerCode] = useState('');
    const [ticketNumber, setTicketNumber] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isScannerActive, setIsScannerActive] = useState(false);

    // Auto-detect scanner code from URL or User Session
    useEffect(() => {
        const sc = searchParams.get('scanner_code');
        if (sc) {
            setScannerCode(sc);
            setIsScannerActive(true);
        } else if (user) {
            // Logged in users can scan directly
            setIsScannerActive(true);
        }
    }, [searchParams, user]);
    
    const handleVerification = useCallback(async (inputData) => {
        if (!inputData || loading) return;
        
        const cleanedTicket = inputData.trim();
        
        // Stop scanning while processing
        setIsScannerActive(false);
        setLoading(true);
        setVerificationResult(null);

        try {
            const rpcParams = { 
                p_ticket_number: cleanedTicket,
                p_verification_method: mode === 'scan' ? 'qr_code' : 'manual'
            };
            
            // If using a specific scanner link
            if (scannerCode) {
                rpcParams.p_scanner_code = scannerCode;
            }
            
            const { data, error } = await supabase.rpc('verify_ticket', rpcParams);
            
            if (error) throw error;
            
            setVerificationResult(data);
            
            if (data.success) {
                toast({ 
                    title: "Billet Valide !", 
                    description: `Bienvenue ${data.attendee_name}`, 
                    className: "bg-green-600 text-white border-none" 
                });
            } else {
                toast({ 
                    title: "Attention", 
                    description: data.message, 
                    variant: "destructive" 
                });
            }

        } catch (error) {
            console.error("Verification failed:", error);
            setVerificationResult({ 
                success: false, 
                message: error.message || "Erreur technique lors de la vérification" 
            });
            toast({ 
                title: "Erreur", 
                description: "Impossible de vérifier le billet.", 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    }, [scannerCode, loading, mode]);
    
    const onScanSuccess = useCallback((decodedText) => {
        if (decodedText && !loading) {
            // Extract ticket number if it's a URL
            let ticketNum = decodedText;
            try {
                if (decodedText.includes('ticket=')) {
                    const url = new URL(decodedText);
                    ticketNum = url.searchParams.get('ticket') || decodedText;
                }
            } catch (e) {
                // Not a URL, keep original text
            }
            
            setTicketNumber(ticketNum);
            handleVerification(ticketNum);
        }
    }, [handleVerification, loading]);

    const resetScan = () => {
        setVerificationResult(null);
        setTicketNumber('');
        setIsScannerActive(true);
    };

    // Access Control Check
    if (!scannerCode && !user) {
        return (
             <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
                 <AlertTriangle className="w-16 h-16 text-yellow-500 mb-6" />
                 <h1 className="text-3xl font-bold mb-4">Accès Restreint</h1>
                 <p className="text-gray-400 mb-8 max-w-md">
                    Cette page est réservée aux organisateurs. Veuillez vous connecter ou utiliser votre lien de scanner dédié.
                 </p>
                 <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8">
                    <Link to="/auth">Se connecter</Link>
                 </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
            <Helmet><title>Scanner | BonPlanInfos</title></Helmet>

            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="w-full max-w-md"
            >
                <Card className="bg-gray-900 border-gray-800 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-gray-800/50 border-b border-gray-800 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                    <ShieldCheck className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold text-white">Contrôle d'accès</CardTitle>
                                    <CardDescription className="text-gray-400 text-xs">Vérification des billets</CardDescription>
                                </div>
                            </div>
                            {isScannerActive && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300 animate-pulse">En ligne</span>}
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-6 space-y-6">
                        {/* RESULT VIEW */}
                        {verificationResult ? (
                             <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`p-6 rounded-xl border-2 text-center shadow-inner ${
                                    verificationResult.success 
                                        ? 'bg-green-950/30 border-green-500/50' 
                                        : verificationResult.verification_status === 'duplicate'
                                            ? 'bg-yellow-950/30 border-yellow-500/50'
                                            : 'bg-red-950/30 border-red-500/50'
                                }`}
                            >
                                <div className="flex justify-center mb-4">
                                    {verificationResult.success ? (
                                        <CheckCircle className="w-20 h-20 text-green-500" />
                                    ) : verificationResult.verification_status === 'duplicate' ? (
                                        <AlertTriangle className="w-20 h-20 text-yellow-500" />
                                    ) : (
                                        <XCircle className="w-20 h-20 text-red-500" />
                                    )}
                                </div>
                                
                                <h2 className={`text-2xl font-bold mb-2 ${
                                    verificationResult.success ? 'text-green-400' : 
                                    verificationResult.verification_status === 'duplicate' ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {verificationResult.success ? "BILLET VALIDE" : 
                                     verificationResult.verification_status === 'duplicate' ? "DÉJÀ SCANNÉ" : "INVALID"}
                                </h2>
                                
                                <p className="text-gray-300 mb-6 font-medium">{verificationResult.message}</p>

                                {(verificationResult.success || verificationResult.verification_status === 'duplicate') && (
                                    <div className="bg-black/40 rounded-lg p-4 text-left space-y-3 text-sm mb-6 border border-white/5">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Nom</span>
                                            <span className="font-bold text-white">{verificationResult.attendee_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Type</span>
                                            <span className="font-semibold text-primary">{verificationResult.ticket_type}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-white/10">
                                            <span className="text-gray-400">Total Scans</span>
                                            <span className={`font-mono font-bold ${verificationResult.verification_count > 1 ? 'text-yellow-400' : 'text-white'}`}>
                                                #{verificationResult.verification_count || 1}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <Button onClick={resetScan} size="lg" className="w-full font-bold text-lg h-12 shadow-lg hover:shadow-xl transition-all">
                                    <RefreshCcw className="w-5 h-5 mr-2" /> Scanner le suivant
                                </Button>
                            </motion.div>
                        ) : (
                            /* INPUT VIEW */
                            <>
                                {mode === 'scan' ? (
                                    <div className="space-y-4">
                                       <div className="relative min-h-[300px] flex flex-col items-center justify-center bg-black rounded-xl overflow-hidden">
                                           {isScannerActive ? (
                                                <QrScanner onScan={onScanSuccess} />
                                           ) : (
                                                <div className="text-gray-500 flex flex-col items-center p-8">
                                                    <PowerOff className="w-12 h-12 mb-3 opacity-50"/>
                                                    <span>Scanner en pause</span>
                                                </div>
                                           )}
                                           
                                           {loading && (
                                               <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                                                   <Loader2 className="w-12 h-12 text-primary animate-spin mb-3" />
                                                   <span className="text-sm font-medium text-primary">Vérification...</span>
                                               </div>
                                           )}
                                       </div>
                                       
                                       <Button 
                                            onClick={() => setIsScannerActive(!isScannerActive)} 
                                            variant="outline" 
                                            className="w-full border-gray-700 hover:bg-gray-800 text-gray-300"
                                        >
                                            {isScannerActive ? "Mettre en pause" : "Activer la caméra"}
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={(e) => { e.preventDefault(); handleVerification(ticketNumber); }} className="space-y-6 py-4">
                                        <div className="space-y-3">
                                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Numéro du billet</label>
                                            <Input 
                                                placeholder="Ex: TICKET-8392..."
                                                value={ticketNumber}
                                                onChange={(e) => setTicketNumber(e.target.value)}
                                                className="h-14 text-center text-lg bg-gray-800 border-gray-700 text-white focus:ring-primary font-mono"
                                                autoFocus
                                            />
                                        </div>
                                        <Button type="submit" size="lg" className="w-full h-14 font-bold text-lg shadow-lg hover:shadow-primary/20 transition-all" disabled={loading || !ticketNumber}>
                                            {loading ? <Loader2 className="animate-spin mr-2" /> : 'Vérifier'}
                                        </Button>
                                    </form>
                                )}

                                <div className="text-center pt-2">
                                    <button 
                                        className="text-xs text-gray-500 hover:text-primary hover:underline transition-colors"
                                        onClick={() => {
                                            setMode(m => m === 'scan' ? 'manual' : 'scan');
                                            setIsScannerActive(m => m !== 'scan'); 
                                            setVerificationResult(null);
                                        }}
                                    >
                                        {mode === 'scan' ? 'Problème de caméra ? Saisir le code' : 'Retour au scanner caméra'}
                                    </button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default VerifyTicketPage;