import React from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const PaymentCheckoutPage = () => {
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user } = useAuth();

    const amount = searchParams.get('amount');
    const intentId = searchParams.get('intentId');
    const from = searchParams.get('from') || '/credit-packs';

    // Base URL for general payment - falling back to the custom link if no specific pack link
    const moneyFusionUrl = "https://my.moneyfusion.net/694dfabb98fe6dbde0fc014f"; 
    
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copié !",
            description: "Le lien de paiement a été copié.",
        });
    };

    if (!amount) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
                <h1 className="text-2xl font-bold text-destructive mb-4">Erreur</h1>
                <p className="text-muted-foreground mb-6">Informations de paiement manquantes.</p>
                <Button onClick={() => navigate(from)}>Retour</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-indigo-600">
                <CardHeader className="text-center relative pb-2">
                    <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => navigate(from)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <CardTitle className="text-2xl font-bold pt-6">Confirmation de Commande</CardTitle>
                    <CardDescription>Finalisez votre achat de crédits</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6 pt-6">
                    <div className="text-center bg-white p-6 rounded-xl border border-slate-100 shadow-sm w-full">
                        <p className="text-sm text-slate-500 mb-1">Montant à régler</p>
                        <p className="text-4xl font-black text-indigo-600">{Number(amount).toLocaleString()} FCFA</p>
                        {intentId && <p className="text-xs text-slate-400 mt-2 font-mono">Ref: {intentId.slice(0,8)}</p>}
                    </div>

                    <div className="w-full space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800">
                            <strong>Instructions :</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Cliquez sur le bouton ci-dessous</li>
                                <li>Sur la page de paiement, entrez le montant exact : <strong>{amount}</strong></li>
                                <li>Utilisez l'email de votre compte : <strong>{user?.email}</strong></li>
                            </ul>
                        </div>

                         <a
                            href={moneyFusionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full block"
                        >
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg shadow-lg shadow-indigo-200">
                                Payer Maintenant <ExternalLink className="w-5 h-5 ml-2" />
                            </Button>
                        </a>
                        
                        <div className="text-center">
                            <span className="text-xs text-slate-400 block mb-2">Ou copiez le lien</span>
                            <Button variant="outline" size="sm" onClick={() => copyToClipboard(moneyFusionUrl)} className="text-xs">
                                <Copy className="w-3 h-3 mr-2" /> {moneyFusionUrl.slice(0, 30)}...
                            </Button>
                        </div>
                    </div>

                    <div className="text-xs text-center text-slate-400 mt-4">
                        Une fois le paiement effectué, vos crédits seront ajoutés automatiquement.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PaymentCheckoutPage;