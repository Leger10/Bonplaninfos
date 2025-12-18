import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Loader2, CheckCircle, XCircle, AlertTriangle, ShieldCheck, 
    Search, QrCode, Keyboard, Camera, X, Calendar, Clock,
    DoorOpen, DoorClosed, User, History, ShieldAlert
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QrScanner from '@/components/event/QrScanner';
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';

const VerifyTicketPage = () => {
    const { user } = useAuth();
    const { toast, dismiss } = useToast();
    const [searchParams] = useSearchParams();
    
    // State
    const [ticketInput, setTicketInput] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('scan');
    const [eventDateValid, setEventDateValid] = useState(null);
    const [exitMode, setExitMode] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [ticketHistory, setTicketHistory] = useState([]);
    
    // Refs
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
    
    const checkEventDate = async (eventId) => {
        try {
            const { data: eventData, error } = await supabase
                .from('events')
                .select('event_date, title, allows_reentry, max_reentry_interval')
                .eq('id', eventId)
                .single();
            
            if (error) throw error;
            
            if (!eventData || !eventData.event_date) {
                return { isValid: false, reason: 'Événement non trouvé' };
            }
            
            const eventDate = new Date(eventData.event_date);
            const today = new Date();
            
            const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const eventMidnight = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
            
            if (eventMidnight.getTime() !== todayMidnight.getTime()) {
                const daysDiff = Math.floor((eventMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
                return { 
                    isValid: false, 
                    reason: `Cet événement est prévu pour le ${eventDate.toLocaleDateString('fr-FR')}`,
                    daysUntil: daysDiff,
                    eventDate: eventDate,
                    eventTitle: eventData.title
                };
            }
            
            return { 
                isValid: true, 
                eventDate: eventDate,
                eventTitle: eventData.title,
                allowsReentry: eventData.allows_reentry,
                maxReentryInterval: eventData.max_reentry_interval
            };
            
        } catch (error) {
            console.error("Error checking event date:", error);
            return { isValid: true, reason: null };
        }
    };

    const fetchTicketHistory = async (ticketId) => {
        try {
            const { data, error } = await supabase
                .from('ticket_verifications')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('verified_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            setTicketHistory(data || []);
        } catch (error) {
            console.error("Error fetching ticket history:", error);
        }
    };

    const handleVerification = async (codeToVerify, method = 'manual') => {
        const cleanCode = codeToVerify?.trim().toUpperCase();
        if (!cleanCode) return;

        const now = Date.now();

        if (isProcessingRef.current) return;

        if (method === 'qr_code' && 
            cleanCode === lastScanRef.current.code && 
            (now - lastScanRef.current.time < 3000)) {
            return;
        }

        isProcessingRef.current = true;
        lastScanRef.current = { code: cleanCode, time: now };
        setLoading(true);
        setEventDateValid(null);
        setTicketHistory([]);

        dismiss();
        
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);

        try {
            // Récupérer d'abord l'ID du ticket pour l'historique
            const { data: ticketData, error: ticketError } = await supabase
                .from('event_tickets')
                .select('id, event_id')
                .or(`ticket_code_short.eq.${cleanCode},ticket_number.eq.${cleanCode}`)
                .single();
            
            if (ticketError) throw new Error("Ticket non trouvé");
            
            // Charger l'historique
            await fetchTicketHistory(ticketData.id);
            
            // Vérifier la date de l'événement
            const dateCheck = await checkEventDate(ticketData.event_id);
            setEventDateValid(dateCheck);
            
            if (!dateCheck.isValid) {
                new Audio('/sounds/warning.mp3').play().catch(() => {});
                
                setVerificationResult({
                    success: false,
                    message: dateCheck.reason,
                    status_code: 'wrong_date',
                    event_title: dateCheck.eventTitle,
                    event_date: dateCheck.eventDate
                });
                
                toast({ 
                    title: "Mauvais jour", 
                    description: dateCheck.reason, 
                    variant: "destructive" 
                });
                
                resultTimeoutRef.current = setTimeout(() => {
                    setVerificationResult(null);
                    setTicketInput('');
                }, 5000);
                
                return;
            }
            
            // Appeler la fonction RPC avec ou sans mode sortie
            const { data, error } = await supabase.rpc('verify_ticket_v2', {
                p_ticket_identifier: cleanCode,
                p_verification_method: method,
                p_exit_mode: exitMode
            });
            
            if (error) throw error;
            
            setVerificationResult(data);
            
            // Mettre à jour l'historique après la vérification
            await fetchTicketHistory(ticketData.id);
            
            // Sound Effects & Toast
            if (data.success) {
                if (data.status_code === 'exit_registered') {
                    new Audio('/sounds/exit.mp3').play().catch(() => {});
                    toast({ 
                        title: "✅ Sortie enregistrée", 
                        description: data.message,
                        className: "bg-blue-600 text-white border-none" 
                    });
                } else {
                    new Audio('/sounds/success.mp3').play().catch(() => {});
                    toast({ 
                        title: "✅ Billet Valide", 
                        description: data.message, 
                        className: "bg-green-600 text-white border-none" 
                    });
                }
            } else {
                switch(data.status_code) {
                    case 'already_inside':
                    case 'already_inside_reentry':
                        new Audio('/sounds/warning.mp3').play().catch(() => {});
                        toast({ 
                            title: "⚠️ Déjà à l'intérieur", 
                            description: data.message, 
                            variant: "warning" 
                        });
                        break;
                    case 'reentry_expired':
                        new Audio('/sounds/error.mp3').play().catch(() => {});
                        toast({ 
                            title: "⏰ Réentrée expirée", 
                            description: data.message, 
                            variant: "destructive" 
                        });
                        break;
                    case 'not_inside':
                        new Audio('/sounds/warning.mp3').play().catch(() => {});
                        toast({ 
                            title: "🚪 Pas à l'intérieur", 
                            description: data.message, 
                            variant: "warning" 
                        });
                        break;
                    default:
                        new Audio('/sounds/error.mp3').play().catch(() => {});
                        toast({ 
                            title: "❌ Erreur", 
                            description: data.message, 
                            variant: "destructive" 
                        });
                }
            }

            // Auto-dismiss après 5 secondes
            resultTimeoutRef.current = setTimeout(() => {
                setVerificationResult(null);
                if (!exitMode) setTicketInput('');
            }, 5000);

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

            resultTimeoutRef.current = setTimeout(() => {
                setVerificationResult(null);
            }, 5000);

        } finally {
            setLoading(false);
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
        setEventDateValid(null);
        setTicketHistory([]);
        isProcessingRef.current = false;
    };

    const toggleExitMode = () => {
        setExitMode(!exitMode);
        setVerificationResult(null);
        setTicketInput('');
        setTicketHistory([]);
    };

    const getStatusIcon = (code) => {
        switch(code) {
            case 'checkin':
            case 'reentry':
                return <CheckCircle className="w-24 h-24 text-green-500 mb-4 animate-in zoom-in duration-300" />;
            case 'exit_registered':
                return <DoorOpen className="w-24 h-24 text-blue-500 mb-4 animate-in zoom-in duration-300" />;
            case 'already_inside':
            case 'already_inside_reentry':
                return <DoorClosed className="w-24 h-24 text-yellow-500 mb-4 animate-in shake duration-300" />;
            case 'reentry_expired':
                return <Clock className="w-24 h-24 text-orange-500 mb-4 animate-in zoom-in duration-300" />;
            case 'wrong_date':
                return <Calendar className="w-24 h-24 text-orange-500 mb-4 animate-in zoom-in duration-300" />;
            case 'not_inside':
                return <ShieldAlert className="w-24 h-24 text-red-500 mb-4 animate-in zoom-in duration-300" />;
            default:
                return <XCircle className="w-24 h-24 text-red-500 mb-4 animate-in zoom-in duration-300" />;
        }
    };

    const getStatusTitle = (result) => {
        if (!result) return "";
        
        switch(result.status_code) {
            case 'checkin': return "ENTRÉE VALIDÉE";
            case 'reentry': return "RÉENTRÉE AUTORISÉE";
            case 'exit_registered': return "SORTIE ENREGISTRÉE";
            case 'already_inside': return "DÉJÀ À L'INTÉRIEUR";
            case 'already_inside_reentry': return "DÉJÀ RÉENTRÉ";
            case 'reentry_expired': return "RÉENTRÉE EXPIRÉE";
            case 'wrong_date': return "MAUVAIS JOUR";
            case 'not_inside': return "NON À L'INTÉRIEUR";
            default: return "INVALIDE";
        }
    };

    const getStatusColor = (code) => {
        switch(code) {
            case 'checkin':
            case 'reentry':
                return 'text-green-500';
            case 'exit_registered':
                return 'text-blue-500';
            case 'already_inside':
            case 'already_inside_reentry':
                return 'text-yellow-500';
            case 'reentry_expired':
            case 'wrong_date':
                return 'text-orange-500';
            default:
                return 'text-red-500';
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
                <ShieldCheck className="w-16 h-16 text-primary mb-6" />
                <h1 className="text-3xl font-bold mb-4">Contrôle d'Accès</h1>
                <p className="text-gray-400 mb-8 max-w-md">Connectez-vous pour vérifier les billets.</p>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8">
                    <Link to="/auth">Se connecter</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-start pt-4 p-4">
            <Helmet><title>Vérification | BonPlanInfos</title></Helmet>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-4">
                {/* Header avec toggle sortie/entrée */}
                <div className="text-center mb-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-10"></div>
                        <h1 className="text-xl font-bold flex items-center justify-center gap-2">
                            {exitMode ? (
                                <DoorOpen className="w-5 h-5 text-blue-500" />
                            ) : (
                                <QrCode className="w-5 h-5 text-primary" />
                            )}
                            {exitMode ? "Scanner Sorties" : "Scanner Entrées"}
                        </h1>
                        <Button 
                            onClick={toggleExitMode}
                            variant="outline"
                            size="sm"
                            className={exitMode ? "bg-blue-500/20 border-blue-500 text-blue-300" : "bg-gray-800"}
                        >
                            {exitMode ? "Mode Sortie" : "Mode Entrée"}
                        </Button>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                        {exitMode 
                            ? "Enregistrez les sorties temporaires" 
                            : `Vérification pour le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
                        }
                    </p>
                    {exitMode && (
                        <p className="text-xs text-blue-400 mt-1">
                            ⓘ Les participants ont 60 minutes pour revenir
                        </p>
                    )}
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
                                    {/* Scanner */}
                                    <div className="absolute inset-0 z-0">
                                        <QrScanner 
                                            onScan={onScan} 
                                            isScanning={activeTab === 'scan'}
                                            onError={(err) => console.log(err)}
                                        />
                                    </div>

                                    {/* Mode indicator */}
                                    <div className={`absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-xs font-bold ${
                                        exitMode 
                                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                                            : 'bg-green-500/20 text-green-300 border border-green-500/30'
                                    }`}>
                                        {exitMode ? 'SORTIE' : 'ENTRÉE'}
                                    </div>

                                    {/* Result Overlay */}
                                    <AnimatePresence>
                                        {verificationResult && (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="absolute inset-0 z-20 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center overflow-y-auto"
                                            >
                                                <button 
                                                    onClick={closeResult}
                                                    className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-30"
                                                >
                                                    <X className="w-6 h-6 text-white" />
                                                </button>

                                                {getStatusIcon(verificationResult.status_code)}
                                                
                                                <h2 className={`text-3xl font-black mb-2 uppercase tracking-wide ${getStatusColor(verificationResult.status_code)}`}>
                                                    {getStatusTitle(verificationResult)}
                                                </h2>
                                                
                                                <p className="text-gray-300 mb-4 font-medium text-lg max-w-[90%]">
                                                    {verificationResult.message}
                                                </p>

                                                {/* Informations détaillées */}
                                                {(verificationResult.attendee_name || verificationResult.ticket_type) && (
                                                    <div className="w-full bg-white/5 rounded-xl p-4 text-left space-y-3 border border-white/10 relative overflow-hidden mb-4">
                                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${
                                                            verificationResult.success ? 'bg-green-500' : 
                                                            verificationResult.status_code === 'already_inside' ? 'bg-yellow-500' : 
                                                            verificationResult.status_code === 'reentry_expired' ? 'bg-orange-500' : 'bg-red-500'
                                                        }`}></div>
                                                        
                                                        <div className="pl-3">
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Participant</p>
                                                            <p className="text-xl font-bold text-white truncate">
                                                                {verificationResult.attendee_name || 'Non spécifié'}
                                                            </p>
                                                        </div>
                                                        
                                                        <div className="flex justify-between items-end pl-3">
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Type</p>
                                                                <Badge variant="outline" className="mt-1 text-sm border-white/20 text-white">
                                                                    {verificationResult.ticket_type || 'Standard'}
                                                                </Badge>
                                                            </div>
                                                            {verificationResult.verification_count && (
                                                                <div className="text-right">
                                                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Scans</p>
                                                                    <p className="text-xl font-mono text-white">
                                                                        {verificationResult.verification_count}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Historique des scans */}
                                                {ticketHistory.length > 0 && (
                                                    <div className="w-full bg-black/50 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <History className="w-4 h-4 text-gray-400" />
                                                            <h3 className="text-sm font-bold text-gray-300">Historique récent</h3>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {ticketHistory.map((scan, index) => (
                                                                <div key={scan.id} className="flex items-center justify-between text-xs p-2 bg-white/5 rounded">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ${
                                                                            scan.status === 'checkin' ? 'bg-green-500' :
                                                                            scan.status === 'exit' ? 'bg-blue-500' :
                                                                            scan.status === 'reentry' ? 'bg-green-400' : 'bg-gray-500'
                                                                        }`}></div>
                                                                        <span className="font-medium">
                                                                            {scan.status === 'checkin' ? 'Entrée' :
                                                                             scan.status === 'exit' ? 'Sortie' :
                                                                             scan.status === 'reentry' ? 'Réentrée' : scan.status}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-gray-400">
                                                                        {new Date(scan.verified_at).toLocaleTimeString('fr-FR', {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Bouton suivant */}
                                                <Button 
                                                    onClick={closeResult} 
                                                    size="lg" 
                                                    className="w-full font-bold text-lg rounded-xl bg-white text-black hover:bg-gray-200"
                                                >
                                                    {verificationResult.success ? 'Scanner le suivant (5s)' : 'Fermer (5s)'}
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Loading Overlay */}
                                    {loading && !verificationResult && (
                                        <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                            <div className="bg-gray-900 p-6 rounded-2xl flex flex-col items-center">
                                                <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
                                                <p className="text-white font-medium">
                                                    {exitMode ? "Enregistrement de la sortie..." : "Vérification en cours..."}
                                                </p>
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
                                            <p className="text-sm text-gray-400">
                                                {exitMode 
                                                    ? "Entrez le code pour enregistrer une sortie" 
                                                    : "Entrez le code court (ex: A7B2X9)"
                                                }
                                            </p>
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
                                            className={`w-full h-14 font-bold text-lg rounded-xl ${
                                                exitMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-primary hover:bg-primary/90'
                                            }`} 
                                            disabled={loading || !ticketInput}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="animate-spin mr-2" />
                                                    {exitMode ? "Enregistrement..." : "Vérification..."}
                                                </>
                                            ) : (
                                                exitMode ? "Enregistrer la sortie" : "Vérifier ce code"
                                            )}
                                        </Button>

                                        {/* Bouton de changement de mode */}
                                        <Button 
                                            onClick={toggleExitMode}
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                        >
                                            {exitMode ? (
                                                <>
                                                    <DoorClosed className="w-4 h-4 mr-2" />
                                                    Passer en mode Entrée
                                                </>
                                            ) : (
                                                <>
                                                    <DoorOpen className="w-4 h-4 mr-2" />
                                                    Passer en mode Sortie
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    
                                    {/* Manual Mode Result Overlay */}
                                    <AnimatePresence>
                                        {verificationResult && activeTab === 'manual' && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 50 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 50 }}
                                                className="absolute inset-0 z-20 bg-gray-900 flex flex-col items-center justify-center p-6 text-center"
                                            >
                                                {getStatusIcon(verificationResult.status_code)}
                                                <h2 className="text-2xl font-bold mb-2 text-white">
                                                    {getStatusTitle(verificationResult)}
                                                </h2>
                                                <p className="text-gray-400 mb-6">{verificationResult.message}</p>
                                                <Button onClick={closeResult} className="w-full" variant="outline">
                                                    Fermer
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Dialog de confirmation pour la sortie */}
            <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmer la sortie</DialogTitle>
                        <DialogDescription>
                            Voulez-vous vraiment enregistrer une sortie pour ce ticket ?
                            Le participant aura 60 minutes pour revenir.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <DialogClose asChild>
                            <Button variant="outline">Annuler</Button>
                        </DialogClose>
                        <Button 
                            onClick={() => {
                                setShowExitConfirm(false);
                                setExitMode(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Confirmer la sortie
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VerifyTicketPage;