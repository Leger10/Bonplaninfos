import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Ticket, User, AlertTriangle, ShieldCheck, CameraOff, Power, PowerOff } from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

const QrScanner = ({ onScan }) => {
    const scannerRef = useRef(null);
    const [hasCameraPermission, setHasCameraPermission] = useState(true);

    useEffect(() => {
        let scanner;
        const startScan = async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                scanner = new Html5Qrcode('qr-reader');
                scannerRef.current = scanner;
                
                await Html5Qrcode.getCameras();
                setHasCameraPermission(true);

                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                    (decodedText) => { onScan(decodedText); },
                    (errorMessage) => { /* ignore */ }
                );
            } catch (err) {
                setHasCameraPermission(false);
                console.error("Camera permission error:", err);
            }
        };

        startScan();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Failed to stop scanner", err));
            }
        };
    }, [onScan]);

    if (!hasCameraPermission) {
        return (
            <div className="h-[300px] w-full flex flex-col items-center justify-center bg-gray-900 rounded-lg text-center">
                <CameraOff className="w-12 h-12 text-destructive mb-4" />
                <p className="text-muted-foreground font-semibold">Caméra non détectée</p>
                <p className="text-xs text-muted-foreground mt-2">Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur.</p>
            </div>
        );
    }

    return <div id="qr-reader" className="w-full rounded-lg overflow-hidden border-2 border-dashed border-gray-600"></div>;
};


const VerifyTicketPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState('scan');
    const [scannerCode, setScannerCode] = useState('');
    const [ticketNumber, setTicketNumber] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isScannerActive, setIsScannerActive] = useState(false);

    useEffect(() => {
        const sc = searchParams.get('scanner_code');
        if (sc) {
            setScannerCode(sc);
            toast({ title: 'Scanner Activé', description: `Mode vérification actif pour le scanner ${sc.substring(0,8)}...`});
            setIsScannerActive(true);
        } else if (!user) {
             toast({ title: 'Accès non autorisé', description: 'Code scanner manquant ou session invalide.', variant: 'destructive' });
             navigate('/auth');
        }
    }, [searchParams, user, navigate]);
    
    const handleVerification = useCallback(async (ticketData) => {
        if (!ticketData || !scannerCode || loading) return;
        
        // QR Code could be a full URL, extract ticket number if so.
        let finalTicketNumber = ticketData;
        try {
            const url = new URL(ticketData);
            finalTicketNumber = url.searchParams.get('ticket') || ticketData;
        } catch (e) {
            // Not a URL, use as is
        }
        
        setIsScannerActive(false); // Pause scanner
        setLoading(true);
        setVerificationResult(null);
        try {
            const { data, error } = await supabase.rpc('verify_ticket', {
                p_ticket_number: finalTicketNumber,
                p_scanner_code: scannerCode,
            });
            
            if (error) throw error;
            setVerificationResult(data);

        } catch (error) {
            setVerificationResult({ success: false, message: error.message });
        } finally {
            setLoading(false);
            setTimeout(() => {
                setVerificationResult(null);
                setTicketNumber('');
                setIsScannerActive(true); // Resume scanner
            }, 5000); // Clear result after 5s and resume
        }
    }, [scannerCode, loading]);
    
    const handleScan = useCallback((data) => {
        setTicketNumber(data);
        handleVerification(data);
    }, [handleVerification]);

    const toggleScanner = () => {
        setIsScannerActive(prev => !prev);
    }

    if (!scannerCode && !user) {
        return (
             <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 text-center">
                 <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
                 <h1 className="text-2xl font-bold">Accès Refusé</h1>
                 <p className="text-muted-foreground">Vous devez être connecté ou avoir un code de scanner pour accéder à cette page.</p>
                 <Button asChild className="mt-4"><Link to="/auth">Se connecter</Link></Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
            <Helmet><title>Vérification de Billet</title></Helmet>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="text-center">
                        <ShieldCheck className="mx-auto w-12 h-12 text-primary" />
                        <CardTitle className="mt-2 text-2xl">Scanner de Billets</CardTitle>
                        <CardDescription>Vérifiez la validité des billets pour votre événement.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {mode === 'scan' ? (
                            <div className="w-full max-w-xs mx-auto space-y-4">
                               {isScannerActive ? <QrScanner onScan={handleScan} /> : (
                                 <div className="h-[300px] flex items-center justify-center bg-gray-900 rounded-lg border-2 border-dashed border-gray-600">
                                    <p className="text-muted-foreground">Scanner en pause...</p>
                                 </div>
                               )}
                               <Button onClick={toggleScanner} variant="outline" className="w-full">
                                    {isScannerActive ? <><PowerOff className="w-4 h-4 mr-2 text-destructive"/> Désactiver</> : <><Power className="w-4 h-4 mr-2 text-green-500"/> Activer</>} le Scanner
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); handleVerification(ticketNumber); }} className="space-y-4">
                                <Input 
                                    placeholder="Entrer le numéro du billet"
                                    value={ticketNumber}
                                    onChange={(e) => setTicketNumber(e.target.value)}
                                    className="h-12 text-center text-lg bg-gray-900 border-gray-600"
                                />
                                <Button type="submit" className="w-full h-12" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : 'Vérifier le Billet'}
                                </Button>
                            </form>
                        )}
                        <Button variant="link" className="w-full" onClick={() => setMode(m => m === 'scan' ? 'manual' : 'scan')}>
                            {mode === 'scan' ? 'Ou entrer le code manuellement' : 'Utiliser le scanner QR'}
                        </Button>
                        
                        {loading && <div className="flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary"/></div>}

                        {verificationResult && (
                             <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-4 rounded-lg border-2 ${verificationResult.success ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}
                            >
                                <div className="flex items-center gap-3">
                                    {verificationResult.success ? <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" /> : <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />}
                                    <div>
                                        <h4 className="font-bold text-xl">{verificationResult.success ? "Valide" : "Invalide"}</h4>
                                        <p className="text-sm text-gray-300">{verificationResult.message}</p>
                                    </div>
                                </div>
                                {verificationResult.success && (
                                    <div className="mt-4 pt-4 border-t border-green-500/30 space-y-2 text-sm">
                                        <p className="flex items-center gap-2 font-semibold"><Ticket className="w-4 h-4 text-primary"/>{verificationResult.event_title}</p>
                                        <p className="flex items-center gap-2"><User className="w-4 h-4 text-primary"/> {verificationResult.attendee_name}</p>
                                    </div>
                                )}
                                {verificationResult.verification_status === 'duplicate' && (
                                     <div className="mt-4 pt-4 border-t border-red-500/30 space-y-2 text-sm text-yellow-300">
                                        <p className="flex items-center gap-2 font-bold"><AlertTriangle className="w-4 h-4"/> Billet déjà scanné !</p>
                                        <p>Nombre de scans: {verificationResult.current_verifications}</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default VerifyTicketPage;