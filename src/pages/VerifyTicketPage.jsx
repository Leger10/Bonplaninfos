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
    DoorOpen, DoorClosed, ShieldAlert, LogOut
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

    const handleVerification = async (codeToVerify, method = 'manual') => {
        const cleanCode = codeToVerify?.trim().toUpperCase();
        if (!cleanCode) return;

        const now = Date.now();
        if (isProcessingRef.current) return;

        // Debounce same QR scan within 3s unless it's a confirmed exit
        if (method === 'qr_code' && cleanCode === lastScanRef.current.code && (now - lastScanRef.current.time < 3000)) {
            return;
        }

        isProcessingRef.current = true;
        lastScanRef.current = { code: cleanCode, time: now };
        setLoading(true);
        
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        dismiss();

        try {
            // Call V3 verification function
            const { data, error } = await supabase.rpc('verify_ticket_v3', {
                p_ticket_identifier: cleanCode,
                p_verification_method: method,
                p_exit_mode: exitMode
            });

            if (error) throw error;

            console.log("Verification Result:", data);
            setVerificationResult(data);
            
            playSound(data.status_code);
            showFeedbackToast(data);

            // Auto-close success results after 4s
            if (data.success) {
                resultTimeoutRef.current = setTimeout(() => {
                    closeResult();
                }, 4000);
            }

        } catch (error) {
            console.error("Scan error:", error);
            playSound('error');
            setVerificationResult({ 
                success: false, 
                message: error.message || "Erreur de communication serveur", 
                status_code: 'error' 
            });
        } finally {
            setLoading(false);
            setTimeout(() => { isProcessingRef.current = false; }, 1000);
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
        // Silently catch error if sound file missing or audio blocked
        try {
            const audio = new Audio(sounds[status] || sounds.error);
            audio.play().catch(() => {});
        } catch (e) {}
    };

    const showFeedbackToast = (data) => {
        const variant = data.success ? 'default' : 'destructive';
        const className = data.success ? 
            (data.status_code === 'exit_registered' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white') 
            : '';
            
        toast({
            title: getStatusTitle(data.status_code),
            description: data.message,
            variant: variant,
            className: className
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
            case 'reentry': return <CheckCircle className="w-24 h-24 text-green-500 mb-4 animate-in zoom-in" />;
            case 'exit_registered': return <LogOut className="w-24 h-24 text-blue-500 mb-4 animate-in zoom-in" />;
            case 'already_inside': return <DoorClosed className="w-24 h-24 text-yellow-500 mb-4 animate-in shake" />;
            case 'not_inside': return <ShieldAlert className="w-24 h-24 text-orange-500 mb-4" />;
            default: return <XCircle className="w-24 h-24 text-red-500 mb-4" />;
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
        <div className="min-h-screen bg-gray-950 text-white flex flex-col pt-4 pb-20 px-4">
            <Helmet><title>Scanner | BonPlanInfos</title></Helmet>

            <div className="max-w-md mx-auto w-full space-y-6">
                {/* Top Controls */}
                <div className="flex items-center justify-between bg-gray-900 p-2 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 px-2">
                        <div className={`w-3 h-3 rounded-full ${exitMode ? 'bg-blue-500 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
                        <span className="font-bold text-sm tracking-wide">
                            MODE {exitMode ? 'SORTIE' : 'ENTRÉE'}
                        </span>
                    </div>
                    <Button 
                        size="sm" 
                        variant={exitMode ? "secondary" : "outline"}
                        onClick={() => setExitMode(!exitMode)}
                        className={`text-xs h-8 border-gray-700 ${exitMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
                    >
                        {exitMode ? <DoorOpen className="w-4 h-4 mr-2" /> : <DoorClosed className="w-4 h-4 mr-2" />}
                        {exitMode ? 'Passer en Entrée' : 'Passer en Sortie'}
                    </Button>
                </div>

                {/* Main Card */}
                <Card className="bg-black border-gray-800 shadow-2xl overflow-hidden aspect-[3/4] relative">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <div className="absolute top-4 left-0 right-0 z-10 flex justify-center">
                            <TabsList className="bg-gray-900/80 backdrop-blur border border-white/10">
                                <TabsTrigger value="scan" className="data-[state=active]:bg-primary"><Camera className="w-4 h-4 mr-2"/> Scan</TabsTrigger>
                                <TabsTrigger value="manual" className="data-[state=active]:bg-primary"><Keyboard className="w-4 h-4 mr-2"/> Code</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="scan" className="h-full mt-0 relative">
                            <QrScanner onScan={(code) => handleVerification(code, 'qr_code')} isScanning={activeTab === 'scan'} />
                            
                            {/* Overlay Guidelines */}
                            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/60">
                                <div className={`absolute inset-0 border-2 opacity-50 ${exitMode ? 'border-blue-500' : 'border-green-500'}`}></div>
                            </div>
                        </TabsContent>

                        <TabsContent value="manual" className="h-full mt-0 flex flex-col items-center justify-center p-8 bg-gray-900">
                            <div className="w-full space-y-4">
                                <Input 
                                    value={ticketInput}
                                    onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                                    placeholder="CODE (ex: NPEQ8K)"
                                    className="text-center text-3xl font-mono uppercase tracking-widest h-16 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600"
                                    maxLength={12}
                                />
                                <Button 
                                    onClick={() => handleVerification(ticketInput, 'manual')}
                                    className={`w-full h-14 text-lg font-bold ${exitMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                                    disabled={!ticketInput || loading}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : (exitMode ? 'VALIDER SORTIE' : 'VALIDER ENTRÉE')}
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Result Overlay */}
                    <AnimatePresence>
                        {verificationResult && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
                            >
                                <button onClick={closeResult} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white">
                                    <X className="w-6 h-6" />
                                </button>

                                {getStatusIcon(verificationResult.status_code)}

                                <h2 className={`text-2xl font-black uppercase mb-2 ${getStatusColor(verificationResult.status_code)}`}>
                                    {getStatusTitle(verificationResult.status_code)}
                                </h2 >

                                <p className="text-gray-300 font-medium text-lg mb-6 leading-relaxed">
                                    {verificationResult.message}
                                </p>

                                {(verificationResult.attendee_name || verificationResult.ticket_type) && (
                                    <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-3 relative overflow-hidden">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${verificationResult.success ? 'bg-green-500' : 'bg-red-500'}`} />
                                        
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Participant</p>
                                            <p className="text-xl font-bold text-white truncate">{verificationResult.attendee_name || 'Inconnu'}</p>
                                        </div>
                                        
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Billet</p>
                                                <Badge 
                                                    variant="outline" 
                                                    className="mt-1 border-white/20 text-white"
                                                    style={{ 
                                                        borderColor: verificationResult.ticket_color === 'blue' ? '#3b82f6' : verificationResult.ticket_color, 
                                                        color: verificationResult.ticket_color === 'blue' ? '#60a5fa' : verificationResult.ticket_color 
                                                    }}
                                                >
                                                    {verificationResult.ticket_type || 'Standard'}
                                                </Badge>
                                            </div>
                                            {verificationResult.verification_count && (
                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Scans</p>
                                                    <p className="text-lg font-mono text-white">{verificationResult.verification_count}</p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Show Reentry Deadline if Exit */}
                                        {verificationResult.status_code === 'exit_registered' && verificationResult.reentry_deadline && (
                                            <div className="pt-2 mt-2 border-t border-white/10">
                                                <p className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">Retour Avant</p>
                                                <p className="text-lg font-mono text-blue-300">
                                                    {new Date(verificationResult.reentry_deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <Button onClick={closeResult} className="mt-8 w-full bg-white text-black hover:bg-gray-200 font-bold h-12 rounded-xl">
                                    SCAN SUIVANT
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </div>
        </div>
    );
};

export default VerifyTicketPage;