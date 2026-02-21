import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Keyboard, Camera, LogOut, ArrowRightLeft,
    DoorClosed, ShieldAlert
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

    // Refs PRO
    const lastScanRef = useRef({ code: '', time: 0 });
    const isProcessingRef = useRef(false);
    const resultTimeoutRef = useRef(null);
    const audioPoolRef = useRef({});
    const lastSuccessTimeRef = useRef(0);

    // 🔊 PRELOAD AUDIO PRO + iOS unlock
    useEffect(() => {
        const sounds = {
            success: '/sounds/success.mp3',
            exit: '/sounds/exit.mp3',
            error: '/sounds/error.mp3',
            warning: '/sounds/warning.mp3'
        };

        Object.entries(sounds).forEach(([key, path]) => {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audio.volume = 0.9;
            audioPoolRef.current[key] = audio;
        });

        // 🔥 iOS audio unlock
        const unlock = () => {
            Object.values(audioPoolRef.current).forEach(a => {
                a.play().then(() => {
                    a.pause();
                    a.currentTime = 0;
                }).catch(() => {});
            });
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
        };

        window.addEventListener('click', unlock);
        window.addEventListener('touchstart', unlock);
    }, []);

    // Initial manual code from URL
    useEffect(() => {
        const ticketParam = searchParams.get('ticket');
        if (ticketParam) {
            setTicketInput(ticketParam);
            handleVerification(ticketParam, 'manual');
        }
        // eslint-disable-next-line
    }, [searchParams]);

    // 🔄 Toggle mode
    const toggleMode = () => {
        setExitMode(prev => !prev);
        setVerificationResult(null);

        toast({
            title: !exitMode ? "Mode SORTIE activé" : "Mode ENTRÉE activé",
            description: !exitMode
                ? "Scannez pour enregistrer les sorties"
                : "Scannez pour valider les entrées",
            className: !exitMode
                ? "bg-blue-600 text-white"
                : "bg-green-600 text-white"
        });
    };

    // 🚀 PLAY SOUND PRO
    const playSound = useCallback((status) => {
        const map = {
            checkin: 'success',
            reentry: 'success',
            exit_registered: 'exit',
            already_inside: 'warning',
            not_inside: 'warning',
            wrong_date: 'warning',
            reentry_expired: 'error',
            error: 'error'
        };

        const key = map[status] || 'error';
        const audio = audioPoolRef.current[key];
        if (!audio) return;

        try {
            const now = Date.now();

            // anti spam succès
            if (key === 'success' && now - lastSuccessTimeRef.current < 800) {
                return;
            }
            if (key === 'success') {
                lastSuccessTimeRef.current = now;
            }

            audio.currentTime = 0;
            audio.play().catch(() => {});

            // 📳 vibration mobile
            if (navigator.vibrate) {
                if (key === 'success') navigator.vibrate(60);
                else if (key === 'exit') navigator.vibrate([40, 30, 40]);
                else navigator.vibrate([120]);
            }
        } catch (e) {
            console.warn('Audio error:', e);
        }
    }, []);

    // 🧠 Vérification billet
    const handleVerification = async (codeToVerify, method = 'manual') => {
        const cleanCode = codeToVerify?.trim().toUpperCase();
        if (!cleanCode) return;

        const now = Date.now();

        // 🔥 anti double scan PRO
        if (cleanCode === lastScanRef.current.code) {
            const delta = now - lastScanRef.current.time;
            if (delta < 2000) return;
        }

        if (isProcessingRef.current) return;

        isProcessingRef.current = true;
        lastScanRef.current = { code: cleanCode, time: now };
        setLoading(true);

        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        dismiss();

        try {
            const { data, error } = await supabase.rpc('verify_ticket_v3', {
                p_ticket_identifier: cleanCode,
                p_verification_method: method,
                p_exit_mode: exitMode
            });

            if (error) throw error;

            setVerificationResult(data);

            if (data) {
                setScanHistory(prev => [data, ...prev].slice(0, 10));
            }

            playSound(data.status_code);
            showFeedbackToast(data);

            // clear champ manuel si succès
            if (data?.success && method === 'manual') {
                setTicketInput('');
            }

            resultTimeoutRef.current = setTimeout(() => {
                setVerificationResult(null);
            }, 3500);

        } catch (error) {
            console.error("Scan error:", error);

            playSound('error');

            const errorData = {
                success: false,
                message: error.message || "Erreur serveur",
                status_code: 'error'
            };

            setVerificationResult(errorData);
            showFeedbackToast(errorData);

            resultTimeoutRef.current = setTimeout(() => {
                setVerificationResult(null);
            }, 3000);
        } finally {
            setLoading(false);
            setTimeout(() => { isProcessingRef.current = false; }, 500);
        }
    };

    const showFeedbackToast = (data) => {
        let variant = 'default';
        let className = '';

        if (data.success) {
            className =
                data.status_code === 'exit_registered'
                    ? 'bg-blue-600 text-white border-none'
                    : 'bg-green-600 text-white border-none';
        } else {
            variant = 'destructive';

            if (data.status_code === 'already_inside') {
                className = 'bg-yellow-500 text-black border-none';
            } else if (data.status_code === 'not_inside') {
                className = 'bg-orange-500 text-white border-none';
            }
        }

        toast({
            title: getStatusTitle(data.status_code),
            description: data.message,
            variant,
            className,
            duration: 3000
        });
    };

    const closeResult = () => {
        setVerificationResult(null);
        setTicketInput('');
    };

    const getStatusTitle = (code) => {
        switch (code) {
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

    // 🔒 Non connecté
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
                <ShieldCheck className="w-16 h-16 text-primary mb-6" />
                <h1 className="text-3xl font-bold mb-4">Scanner</h1>
                <p className="text-gray-400 mb-8">
                    Veuillez vous connecter pour accéder au scanner.
                </p>
                <Button asChild>
                    <Link to="/auth">Connexion</Link>
                </Button>
            </div>
        );
    }

    // ================= UI =================

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col pt-4 pb-20 px-2 sm:px-4">
            <Helmet>
                <title>Scanner | BonPlanInfos</title>
            </Helmet>

            <div className="max-w-md mx-auto w-full space-y-4">

                {/* MODE BAR */}
                <Card className="bg-gray-900 border-gray-800 p-2 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2 pl-2">
                        <div className={`w-3 h-3 rounded-full ${exitMode ? 'bg-blue-500' : 'bg-green-500'} animate-pulse`} />
                        <span className={`font-bold text-sm ${exitMode ? 'text-blue-400' : 'text-green-400'}`}>
                            {exitMode ? 'MODE SORTIE' : 'MODE ENTRÉE'}
                        </span>
                    </div>

                    <Button size="sm" variant="secondary" onClick={toggleMode}>
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                        Changer
                    </Button>
                </Card>

                {/* SCANNER */}
                <Card className="bg-black border-gray-800 overflow-hidden aspect-[3/4] relative rounded-xl">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">

                        <div className="absolute top-4 left-0 right-0 z-10 flex justify-center px-4">
                            <TabsList className="bg-gray-900/90 border w-full grid grid-cols-2">
                                <TabsTrigger value="scan"><Camera className="w-4 h-4 mr-2" /> Scan</TabsTrigger>
                                <TabsTrigger value="manual"><Keyboard className="w-4 h-4 mr-2" /> Code</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="scan" className="h-full mt-0 relative">
                            <QrScanner
                                onScan={(code) => handleVerification(code, 'qr_code')}
                                isScanning={activeTab === 'scan'}
                            />
                        </TabsContent>

                        <TabsContent value="manual" className="h-full mt-0 flex flex-col items-center justify-center p-8 bg-gray-900">
                            <div className="w-full space-y-6">
                                <Input
                                    value={ticketInput}
                                    onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                                    placeholder="EX: A1B2C3"
                                    className="text-center text-4xl font-mono h-20"
                                    maxLength={12}
                                />

                                <Button
                                    onClick={() => handleVerification(ticketInput, 'manual')}
                                    className="w-full h-14 text-lg font-bold"
                                    disabled={!ticketInput || loading}
                                >
                                    {loading ? <Loader2 className="animate-spin w-6 h-6" /> :
                                        (exitMode ? 'VALIDER SORTIE' : 'VALIDER ENTRÉE')}
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <AnimatePresence>
                        {verificationResult && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/90 flex items-center justify-center text-center p-6"
                                onClick={closeResult}
                            >
                                <div>
                                    <h2 className="text-2xl font-black mb-2">
                                        {getStatusTitle(verificationResult.status_code)}
                                    </h2>
                                    <p>{verificationResult.message}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </div>
        </div>
    );
};

export default VerifyTicketPage;
