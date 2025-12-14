import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ShieldCheck, RefreshCcw, Search, QrCode } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

// Scanner component removed for simplicity/performance in this view as requested focus is on verification logic
// In production, uncomment the QrScanner import

const VerifyTicketPage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [ticketInput, setTicketInput] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // Auto-detect ticket from URL
    useEffect(() => {
        const ticketParam = searchParams.get('ticket');
        if (ticketParam) {
            setTicketInput(ticketParam);
            handleVerification(ticketParam);
        }
    }, [searchParams]);
    
    const handleVerification = async (codeToVerify) => {
        const input = codeToVerify || ticketInput;
        if (!input) return;
        
        setLoading(true);
        setVerificationResult(null);

        try {
            const { data, error } = await supabase.rpc('verify_ticket', {
                p_ticket_identifier: input.trim(),
                p_verification_method: 'manual'
            });
            
            if (error) throw error;
            
            setVerificationResult(data);
            
            if (data.success) {
                toast({ 
                    title: "Billet Valide !", 
                    description: `Bienvenue ${data.attendee_name}`, 
                    className: "bg-green-600 text-white border-none" 
                });
            } else if (data.status_code === 'already_scanned') {
                toast({ 
                    title: "Déjà Scanné", 
                    description: "Ce billet a déjà été utilisé.", 
                    variant: "destructive" 
                });
            } else {
                toast({ 
                    title: "Invalide", 
                    description: data.message, 
                    variant: "destructive" 
                });
            }

        } catch (error) {
            console.error("Verification failed:", error);
            setVerificationResult({ 
                success: false, 
                message: error.message || "Erreur technique",
                status_code: 'error'
            });
        } finally {
            setLoading(false);
        }
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
            case 'valid': return <CheckCircle className="w-24 h-24 text-green-500 mb-4" />;
            case 'already_scanned': return <AlertTriangle className="w-24 h-24 text-yellow-500 mb-4" />;
            default: return <XCircle className="w-24 h-24 text-red-500 mb-4" />;
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
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
            <Helmet><title>Vérification | BonPlanInfos</title></Helmet>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
                <Card className="bg-gray-900 border-gray-800 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-gray-800/50 border-b border-gray-800 pb-4 text-center">
                        <CardTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
                            <QrCode className="w-5 h-5 text-primary" /> Vérificateur
                        </CardTitle>
                        <CardDescription className="text-gray-400">Entrez le code court (6 caractères) ou le numéro</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-6 space-y-6">
                        {!verificationResult ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                    <Input 
                                        placeholder="Code du billet (ex: A7X92B)"
                                        value={ticketInput}
                                        onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                                        className="h-14 pl-10 text-center text-2xl tracking-widest bg-gray-800 border-gray-700 text-white focus:ring-primary font-mono uppercase"
                                        autoFocus
                                        maxLength={20}
                                    />
                                </div>
                                <Button onClick={() => handleVerification()} size="lg" className="w-full h-12 font-bold text-lg" disabled={loading || !ticketInput}>
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : 'Vérifier'}
                                </Button>
                            </div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                                <div className="flex justify-center">{getStatusIcon(verificationResult.status_code)}</div>
                                
                                <h2 className="text-3xl font-black mb-2 uppercase tracking-wide">
                                    {verificationResult.success ? "VALIDE" : 
                                     verificationResult.status_code === 'already_scanned' ? "DÉJÀ SCANNÉ" : "INVALIDE"}
                                </h2>
                                
                                <p className="text-gray-400 mb-6">{verificationResult.message}</p>

                                {(verificationResult.success || verificationResult.status_code === 'already_scanned') && (
                                    <div className="bg-black/40 rounded-xl p-6 text-left space-y-4 border border-white/5 relative overflow-hidden">
                                        <div className={`absolute top-0 left-0 w-1 h-full ${getStatusColor(verificationResult.status_code)}`}></div>
                                        
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold">Participant</p>
                                            <p className="text-xl font-bold text-white truncate">{verificationResult.attendee_name}</p>
                                        </div>
                                        
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold">Type de Billet</p>
                                                <Badge variant="outline" className={`mt-1 text-sm ${verificationResult.ticket_color ? `border-${verificationResult.ticket_color}-500 text-${verificationResult.ticket_color}-400` : 'border-white text-white'}`}>
                                                    {verificationResult.ticket_type}
                                                </Badge>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 uppercase font-bold">Scans</p>
                                                <p className="text-2xl font-mono text-white">{verificationResult.verification_count}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Button onClick={() => { setVerificationResult(null); setTicketInput(''); }} size="lg" className="w-full mt-6 h-12 font-bold" variant="secondary">
                                    <RefreshCcw className="w-4 h-4 mr-2" /> Scanner un autre
                                </Button>
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default VerifyTicketPage;