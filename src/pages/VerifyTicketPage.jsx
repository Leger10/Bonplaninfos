import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Search, QrCode, Keyboard, Camera, X } from 'lucide-react';
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
    
    // Refs for debouncing scans without re-renders
    const lastScanRef = useRef({ code: '', time: 0 });
    const isProcessingRef = useRef(false);
    const resultTimeoutRef = useRef(null);

    // Auto-detect ticket from URL
    useEffect(() => {
        const ticketParam = searchParams.get('ticket');
        if (ticketParam) {
            setTicketInput(ticketParam);
            handleVerification(ticketParam, 'manual');
        }
    }, [searchParams]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        };
    }, []);
    
    const handleVerification = async (codeToVerify, method = 'manual') => {
        const cleanCode = codeToVerify?.trim().toUpperCase();
        if (!cleanCode) return;

        const now = Date.now();

        // Prevent processing if already busy
        if (isProcessingRef.current) return;

        // Debounce: Ignore same code if scanned within 3 seconds (prevent spam)
        if (method === 'qr_code' && 
            cleanCode === lastScanRef.current.code && 
            (now - lastScanRef.current.time < 3000)) {
            return;
        }

        // Lock processing
        isProcessingRef.current = true;
        lastScanRef.current = { code: cleanCode, time: now };
        setLoading(true);

        // Clear previous notifications to prevent stacking
        dismiss();
        
        // Clear previous timeout if exists
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);

        try {
            const { data, error } = await supabase.rpc('verify_ticket', {
                p_ticket_identifier: cleanCode,
                p_verification_method: method
            });
            
            if (error) throw error;
            
            setVerificationResult(data);
            
            // Sound Effects & Toast
            if (data.success) {
                new Audio('/sounds/success.mp3').play().catch(() => {});
                toast({ 
                    title: "Billet Valide", 
                    description: `Bienvenue ${data.attendee_name || 'Participant'}`, 
                    className: "bg-green-600 text-white border-none" 
                });
            } else if (data.status_code === 'already_scanned') {
                new Audio('/sounds/warning.mp3').play().catch(() => {});
                toast({ 
                    title: "Déjà Scanné", 
                    description: `Validé le: ${new Date(data.last_verified_at || Date.now()).toLocaleTimeString()}`, 
                    variant: "destructive" 
                });
            } else {
                new Audio('/sounds/error.mp3').play().catch(() => {});
                toast({ 
                    title: "Invalide", 
                    description: data.message || "Billet non reconnu", 
                    variant: "destructive" 
                });
            }

            // Auto-dismiss result overlay after 3 seconds to allow continuous scanning
            resultTimeoutRef.current = setTimeout(() => {
                setVerificationResult(null);
                setTicketInput('');
            }, 3000);

        } catch (error) {
            console.error("Verification failed:", error);
            const errorMsg = error.message || "Erreur technique";
            
            new Audio('/sounds/error.mp3').play().catch(() => {});
            
            setVerificationResult({ 
                success: false, 
                message: errorMsg,
                status_code: 'error'
            });
            
            toast({ 
                title: "Erreur", 
                description: errorMsg, 
                variant: "destructive" 
            });

            // Auto-dismiss error after 3s too
            resultTimeoutRef.current = setTimeout(() => {
                setVerificationResult(null);
            }, 3000);

        } finally {
            setLoading(false);
            // Small delay before allowing next scan to prevent double-trigger on slow devices
            setTimeout(() => {
                isProcessingRef.current = false;
            }, 1000);
        }
    };

    const onScan = (decodedText) => {
        handleVerification(decodedText, 'qr_code');
    };

    const closeResult = () => {
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        setVerificationResult(null);
        setTicketInput('');
        isProcessingRef.current = false;
    };

    const getStatusColor = (code) => {
        switch(code) {
            case 'valid': return 'bg-green-500';
            case 'already_scanned': return 'bg-yellow-500';
            default: return 'bg-red-500';
        }
    };

    const getStatusIcon = (code) => {
        switch(code) {
            case 'valid': return <CheckCircle className="w-24 h-24 text-green-500 mb-4 animate-in zoom-in duration-300" />;
            case 'already_scanned': return <AlertTriangle className="w-24 h-24 text-yellow-500 mb-4 animate-in shake duration-300" />;
            default: return <XCircle className="w-24 h-24 text-red-500 mb-4 animate-in zoom-in duration-300" />;
        }
    };

    if (!user) {
        return (
             <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
                 <ShieldCheck className="w-16 h-16 text-primary mb-6" />
                 <h1 className="text-3xl font-bold mb-4">Contrôle d'Accès</h1>
                 <p className="text-gray-400 mb-8 max-w-md">Connectez-vous pour vérifier les billets.</p>
                 <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8"><Link to="/auth">Se connecter</Link></Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-start pt-4 p-4">
            <Helmet><title>Vérification | BonPlanInfos</title></Helmet>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-4">
                <div className="text-center mb-2">
                    <h1 className="text-xl font-bold flex items-center justify-center gap-2">
                        <QrCode className="w-5 h-5 text-primary" /> 
                        Scanner
                    </h1>
                </div>

                <Card className="bg-gray-900 border-gray-800 shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
                    <CardContent className="p-0 flex-1 flex flex-col">
                        <Tabs defaultValue="scan" value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                            <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 p-1 shrink-0">
                                <TabsTrigger value="scan" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                                    <Camera className="w-4 h-4 mr-2" /> Caméra
                                </TabsTrigger>
                                <TabsTrigger value="manual" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                                    <Keyboard className="w-4 h-4 mr-2" /> Saisie
                                </TabsTrigger>
                            </TabsList>
                            
                            <div className="relative flex-1 bg-black flex flex-col">
                                <TabsContent value="scan" className="absolute inset-0 mt-0">
                                    {/* Scanner acts as background */}
                                    <div className="absolute inset-0 z-0">
                                        <QrScanner 
                                            onScan={onScan} 
                                            isScanning={activeTab === 'scan'} // Always scanning in this tab
                                            onError={(err) => console.log(err)}
                                        />
                                    </div>

                                    {/* Result Overlay */}
                                    <AnimatePresence>
                                        {verificationResult && (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="absolute inset-0 z-20 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                                            >
                                                <button 
                                                    onClick={closeResult}
                                                    className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                                >
                                                    <X className="w-6 h-6 text-white" />
                                                </button>

                                                {getStatusIcon(verificationResult.status_code)}
                                                
                                                <h2 className={`text-3xl font-black mb-2 uppercase tracking-wide ${
                                                    verificationResult.success ? 'text-green-500' : 
                                                    verificationResult.status_code === 'already_scanned' ? 'text-yellow-500' : 'text-red-500'
                                                }`}>
                                                    {verificationResult.success ? "VALIDE" : 
                                                     verificationResult.status_code === 'already_scanned' ? "DÉJÀ SCANNÉ" : "INVALIDE"}
                                                </h2>
                                                
                                                <p className="text-gray-300 mb-6 font-medium text-lg max-w-[80%]">
                                                    {verificationResult.message}
                                                </p>

                                                {(verificationResult.success || verificationResult.status_code === 'already_scanned') && (
                                                    <div className="w-full bg-white/5 rounded-xl p-4 text-left space-y-3 border border-white/10 relative overflow-hidden mb-6">
                                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${getStatusColor(verificationResult.status_code)}`}></div>
                                                        
                                                        <div className="pl-3">
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Participant</p>
                                                            <p className="text-xl font-bold text-white truncate">{verificationResult.attendee_name}</p>
                                                        </div>
                                                        
                                                        <div className="flex justify-between items-end pl-3">
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Type</p>
                                                                <Badge variant="outline" className={`mt-1 text-sm border-white/20 text-white`}>
                                                                    {verificationResult.ticket_type || 'Standard'}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Scans</p>
                                                                <p className="text-xl font-mono text-white">{verificationResult.verification_count}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <Button onClick={closeResult} size="lg" className="w-full font-bold text-lg rounded-xl bg-white text-black hover:bg-gray-200">
                                                    {verificationResult.success ? 'Scanner le suivant (3s)' : 'Fermer (3s)'}
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Loading Overlay */}
                                    {loading && !verificationResult && (
                                        <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                            <div className="bg-gray-900 p-6 rounded-2xl flex flex-col items-center">
                                                <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
                                                <p className="text-white font-medium">Vérification...</p>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="manual" className="mt-0 flex-1 bg-gray-900 p-6 flex flex-col justify-center">
                                    <div className="space-y-6 w-full">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Keyboard className="w-8 h-8 text-primary" />
                                            </div>
                                            <h3 className="text-lg font-medium text-white">Saisie Manuelle</h3>
                                            <p className="text-sm text-gray-400">Entrez le code court (ex: A7B2X9)</p>
                                        </div>

                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                            <Input 
                                                placeholder="Code"
                                                value={ticketInput}
                                                onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                                                className="h-16 pl-12 text-center text-3xl tracking-[0.2em] bg-gray-800 border-gray-700 text-white focus:ring-2 focus:ring-primary focus:border-primary font-mono uppercase rounded-xl transition-all"
                                                autoFocus
                                                maxLength={12}
                                                onKeyDown={(e) => e.key === 'Enter' && handleVerification(ticketInput, 'manual')}
                                            />
                                        </div>
                                        
                                        <Button 
                                            onClick={() => handleVerification(ticketInput, 'manual')} 
                                            size="lg" 
                                            className="w-full h-14 font-bold text-lg rounded-xl" 
                                            disabled={loading || !ticketInput}
                                        >
                                            {loading ? <Loader2 className="animate-spin mr-2" /> : 'Vérifier ce code'}
                                        </Button>
                                    </div>
                                    
                                    {/* Manual Mode Result Overlay (Same logic) */}
                                    <AnimatePresence>
                                        {verificationResult && activeTab === 'manual' && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 50 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 50 }}
                                                className="absolute inset-0 z-20 bg-gray-900 flex flex-col items-center justify-center p-6 text-center"
                                            >
                                                {/* Reusing the same result UI structure for consistency would be better, but keeping it simple here */}
                                                {getStatusIcon(verificationResult.status_code)}
                                                <h2 className="text-2xl font-bold mb-2 text-white">
                                                    {verificationResult.success ? "VALIDE" : "ERREUR"}
                                                </h2>
                                                <p className="text-gray-400 mb-6">{verificationResult.message}</p>
                                                <Button onClick={closeResult} className="w-full" variant="outline">Fermer</Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default VerifyTicketPage;