import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
    Loader2, CheckCircle, XCircle, ShieldCheck, 
    Keyboard, Camera, X,
    DoorOpen, DoorClosed, ShieldAlert, LogOut, ArrowRightLeft
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QrScanner from '@/components/event/QrScanner';

const VerifyTicketPage = () => {
    const { user } = useAuth();
    const { toast, dismiss } = useToast();
    const [searchParams] = useSearchParams();
    
    // State
    const [ticketInput, setTicketInput] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('scan');
    const [exitMode, setExitMode] = useState(false);
    const [scanHistory, setScanHistory] = useState([]);
    
    // Refs
    const lastScanRef = useRef({ code: '', time: 0 });
    const isProcessingRef = useRef(false);
    const resultTimeoutRef = useRef(null);

    // Initial manual code from URL
    useEffect(() => {
        const ticketParam = searchParams.get('ticket');
        if (ticketParam) {
            setTicketInput(ticketParam);
            handleVerification(ticketParam, 'manual');
        }
    }, [searchParams]);

    // Handle Mode Switch
    const toggleMode = () => {
        setExitMode(prev => !prev);
        // Clear result on mode switch to avoid confusion
        setVerificationResult(null);
        toast({
            title: !exitMode ? "Mode SORTIE activé" : "Mode ENTRÉE activé",
            description: !exitMode ? "Scannez pour enregistrer les sorties" : "Scannez pour valider les entrées",
            className: !exitMode ? "bg-blue-600 text-white" : "bg-green-600 text-white"
        });
    };

    const handleVerification = async (codeToVerify, method = 'manual') => {
        const cleanCode = codeToVerify?.trim().toUpperCase();
        if (!cleanCode) return;

        const now = Date.now();
        
        // Prevent rapid duplicate processing of the exact same code (debounce 2.5s)
        if (cleanCode === lastScanRef.current.code && (now - lastScanRef.current.time < 2500)) {
            return;
        }

        // If currently processing, skip unless it's a different code
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;
        lastScanRef.current = { code: cleanCode, time: now };
        setLoading(true);
        
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        // We don't dismiss immediately so user can see previous toast if scanning fast, 
        // but typically we want fresh feedback.
        dismiss(); 

        try {
            const { data, error } = await supabase.rpc('verify_ticket_v3', {
                p_ticket_identifier: cleanCode,
                p_verification_method: method,
                p_exit_mode: exitMode
            });

            if (error) throw error;

            console.log("Verification Result:", data);
            setVerificationResult(data);
            
            // Add to history
            if (data) {
                setScanHistory(prev => [data, ...prev].slice(0, 10));
            }
            
            playSound(data.status_code);
            showFeedbackToast(data);

            // Auto-close overlay for ALL results to allow continuous flow
            // Short delay for success/neutral, slightly longer for errors if needed
            // But for "Already Inside" (duplicate), we want it fast too.
            resultTimeoutRef.current = setTimeout(() => {
                setVerificationResult(null);
            }, 3500);

        } catch (error) {
            console.error("Scan error:", error);
            playSound('error');
            const errorData = { 
                success: false, 
                message: error.message || "Erreur de communication serveur", 
                status_code: 'error' 
            };
            setVerificationResult(errorData);
            showFeedbackToast(errorData);
            
            // Clear error faster to resume scanning
            resultTimeoutRef.current = setTimeout(() => {
                setVerificationResult(null);
            }, 3000);
        } finally {
            setLoading(false);
            // Small buffer before allowing next scan processing logic
            setTimeout(() => { isProcessingRef.current = false; }, 500);
        }
    };

    const playSound = (status) => {
        const sounds = {
            checkin: '/sounds/success.mp3',
            reentry: '/sounds/success.mp3',
            exit_registered: '/sounds/exit.mp3',
            error: '/sounds/error.mp3',
            already_inside: '/sounds/warning.mp3',
            reentry_expired: '/sounds/error.mp3',
            not_inside: '/sounds/warning.mp3',
            wrong_date: '/sounds/warning.mp3'
        };
        try {
            const audio = new Audio(sounds[status] || sounds.error);
            audio.play().catch(() => {});
        } catch (e) {}
    };

    const showFeedbackToast = (data) => {
        let variant = 'default';
        let className = '';

        if (data.success) {
            if (data.status_code === 'exit_registered') {
                className = 'bg-blue-600 text-white border-none';
            } else {
                className = 'bg-green-600 text-white border-none';
            }
        } else {
            variant = 'destructive';
            if (data.status_code === 'already_inside') {
                className = 'bg-yellow-500 text-black border-none'; // Distinct look for duplicate
            } else if (data.status_code === 'not_inside') {
                className = 'bg-orange-500 text-white border-none';
            }
        }
            
        toast({
            title: getStatusTitle(data.status_code),
            description: data.message,
            variant: variant,
            className: className,
            duration: 3000 // Shorter duration for continuous scanning
        });
    };

    const closeResult = () => {
        setVerificationResult(null);
        setTicketInput('');
    };

    const getStatusTitle = (code) => {
        switch(code) {
            case 'checkin': return 'ENTRÉE VALIDÉE';
            case 'reentry': return 'RÉ-ENTRÉE AUTORISÉE';
            case 'exit_registered': return 'SORTIE ENREGISTRÉE';
            case 'already_inside': return 'DÉJÀ À L\'INTÉRIEUR';
            case 'reentry_expired': return 'DÉLAI EXPIRÉ';
            case 'not_inside': return 'PAS À L\'INTÉRIEUR';
            case 'wrong_date': return 'MAUVAIS JOUR';
            case 'not_found': return 'BILLET INCONNU';
            default: return 'ERREUR';
        }
    };

    const getStatusColor = (code) => {
        switch(code) {
            case 'checkin':
            case 'reentry': return 'text-green-500';
            case 'exit_registered': return 'text-blue-500';
            case 'already_inside': return 'text-yellow-500';
            case 'not_inside': return 'text-orange-500';
            default: return 'text-red-500';
        }
    };

    const getStatusIcon = (code) => {
        switch(code) {
            case 'checkin':
            case 'reentry': return <CheckCircle className="w-20 h-20 text-green-500 mb-2 animate-in zoom-in duration-300" />;
            case 'exit_registered': return <LogOut className="w-20 h-20 text-blue-500 mb-2 animate-in zoom-in duration-300" />;
            case 'already_inside': return <DoorClosed className="w-20 h-20 text-yellow-500 mb-2 animate-in shake" />;
            case 'not_inside': return <ShieldAlert className="w-20 h-20 text-orange-500 mb-2" />;
            default: return <XCircle className="w-20 h-20 text-red-500 mb-2" />;
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
                <ShieldCheck className="w-16 h-16 text-primary mb-6" />
                <h1 className="text-3xl font-bold mb-4">Scanner</h1>
                <p className="text-gray-400 mb-8">Veuillez vous connecter pour accéder au scanner.</p>
                <Button asChild><Link to="/auth">Connexion</Link></Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col pt-4 pb-20 px-2 sm:px-4">
            <Helmet><title>Scanner | BonPlanInfos</title></Helmet>

            <div className="max-w-md mx-auto w-full space-y-4">
                {/* Top Controls */}
                <Card className="bg-gray-900 border-gray-800 p-2 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2 pl-2">
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_8px] ${exitMode ? 'bg-blue-500 shadow-blue-500/50 animate-pulse' : 'bg-green-500 shadow-green-500/50 animate-pulse'}`} />
                        <span className={`font-bold text-sm tracking-wide ${exitMode ? 'text-blue-400' : 'text-green-400'}`}>
                            {exitMode ? 'MODE SORTIE' : 'MODE ENTRÉE'}
                        </span>
                    </div>
                    
                    <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={toggleMode}
                        className={`h-9 px-4 font-semibold border transition-all duration-300 ${
                            exitMode 
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 hover:bg-blue-600/30' 
                            : 'bg-green-600/20 text-green-400 border-green-500/50 hover:bg-green-600/30'
                        }`}
                    >
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                        Changer
                    </Button>
                </Card>

                {/* Main Scanner Area */}
                <Card className="bg-black border-gray-800 shadow-2xl overflow-hidden aspect-[3/4] relative rounded-xl ring-1 ring-white/10">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <div className="absolute top-4 left-0 right-0 z-10 flex justify-center px-4">
                            <TabsList className="bg-gray-900/90 backdrop-blur-md border border-white/10 w-full grid grid-cols-2 shadow-lg">
                                <TabsTrigger value="scan" className="data-[state=active]:bg-primary font-bold"><Camera className="w-4 h-4 mr-2"/> Scan</TabsTrigger>
                                <TabsTrigger value="manual" className="data-[state=active]:bg-primary font-bold"><Keyboard className="w-4 h-4 mr-2"/> Code</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="scan" className="h-full mt-0 relative">
                            {/* Pass isScanning to manage camera lifecycle properly */}
                            <QrScanner onScan={(code) => handleVerification(code, 'qr_code')} isScanning={activeTab === 'scan'} />
                            
                            {/* Mode Indicator Overlay */}
                            <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center pointer-events-none">
                                <Badge className={`text-xs px-3 py-1 backdrop-blur-md shadow-lg border-0 ${
                                    exitMode 
                                    ? 'bg-blue-600/80 text-white' 
                                    : 'bg-green-600/80 text-white'
                                }`}>
                                    {exitMode ? 'SCANNEZ POUR SORTIR' : 'SCANNEZ POUR ENTRER'}
                                </Badge>
                            </div>
                        </TabsContent>

                        <TabsContent value="manual" className="h-full mt-0 flex flex-col items-center justify-center p-8 bg-gray-900">
                            <div className="w-full space-y-6">
                                <div className="space-y-2 text-center">
                                    <h3 className="text-gray-400 font-medium uppercase tracking-wider text-sm">Saisie Manuelle</h3>
                                    <p className="text-xs text-gray-500">Entrez le code billet ou le numéro court</p>
                                </div>
                                <Input 
                                    value={ticketInput}
                                    onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                                    placeholder="EX: A1B2C3"
                                    className="text-center text-4xl font-mono uppercase tracking-widest h-20 bg-black/50 border-gray-700 text-white placeholder:text-gray-700 focus:border-primary focus:ring-primary/50"
                                    maxLength={12}
                                />
                                <Button 
                                    onClick={() => handleVerification(ticketInput, 'manual')}
                                    className={`w-full h-14 text-lg font-bold shadow-lg transition-all ${
                                        exitMode 
                                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20' 
                                        : 'bg-green-600 hover:bg-green-700 shadow-green-900/20'
                                    }`}
                                    disabled={!ticketInput || loading}
                                >
                                    {loading ? <Loader2 className="animate-spin w-6 h-6" /> : (exitMode ? 'VALIDER SORTIE' : 'VALIDER ENTRÉE')}
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Result Overlay - Non-blocking / Auto-dismissing */}
                    <AnimatePresence mode="wait">
                        {verificationResult && (
                            <motion.div 
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 z-20 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                                onClick={closeResult} // Allow click anywhere to dismiss instantly
                            >
                                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs cursor-pointer">
                                    {getStatusIcon(verificationResult.status_code)}

                                    <h2 className={`text-2xl font-black uppercase mb-2 ${getStatusColor(verificationResult.status_code)}`}>
                                        {getStatusTitle(verificationResult.status_code)}
                                    </h2 >

                                    <p className="text-white/90 font-medium text-lg mb-6 leading-relaxed bg-white/5 p-3 rounded-lg w-full border border-white/10">
                                        {verificationResult.message}
                                    </p>

                                    {(verificationResult.attendee_name || verificationResult.ticket_type) && (
                                        <div className="w-full bg-gray-800/80 border border-white/10 rounded-xl p-4 text-left space-y-3 relative overflow-hidden shadow-xl">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${verificationResult.success ? 'bg-green-500' : 'bg-red-500'}`} />
                                            
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Participant</p>
                                                <p className="text-lg font-bold text-white truncate">{verificationResult.attendee_name || 'Inconnu'}</p>
                                            </div>
                                            
                                            <div className="flex justify-between items-end border-t border-white/5 pt-2">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Billet</p>
                                                    <Badge 
                                                        variant="outline" 
                                                        className="border-white/20 text-white bg-white/5"
                                                    >
                                                        {verificationResult.ticket_type || 'Standard'}
                                                    </Badge>
                                                </div>
                                                {verificationResult.verification_count && (
                                                    <div className="text-right">
                                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Total Scans</p>
                                                        <p className="text-lg font-mono text-white">{verificationResult.verification_count}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <p className="text-xs text-gray-500 mt-6 animate-pulse">
                                    Touchez pour scanner le suivant...
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>

                {/* Scan History (Mini Log) */}
                {scanHistory.length > 0 && (
                    <div className="space-y-2 animate-in slide-in-from-bottom-4 fade-in duration-500">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Historique Récent</h4>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-gray-500 hover:text-white" onClick={() => setScanHistory([])}>
                                Effacer
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {scanHistory.map((scan, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                                    scan.success 
                                    ? 'bg-gray-900 border-gray-800' 
                                    : 'bg-red-950/20 border-red-900/30'
                                }`}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            scan.status_code === 'checkin' ? 'bg-green-500' :
                                            scan.status_code === 'exit_registered' ? 'bg-blue-500' :
                                            scan.status_code === 'already_inside' ? 'bg-yellow-500' :
                                            'bg-red-500'
                                        }`} />
                                        <div className="truncate">
                                            <p className="font-medium text-white truncate">{scan.attendee_name || 'Billet Inconnu'}</p>
                                            <p className="text-xs text-gray-500 truncate">{scan.message}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-600 font-mono whitespace-nowrap ml-2">
                                        {new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyTicketPage;