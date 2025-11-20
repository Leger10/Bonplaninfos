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
    const packId = searchParams.get('packId');
    const type = searchParams.get('type');
    const from = searchParams.get('from') || '/packs';

    const moneyFusionUrl = "https://www.pay.moneyfusion.net/acheter-votre-pack-ici_1760809319837/";
    const qrCodeImageUrl = "https://horizons-cdn.hostinger.com/b046caa6-31e1-44c9-b7bb-4c0c24e49566/596514675056f152f9b271c249be25a8.jpg";

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copié !",
            description: "Le lien de paiement a été copié dans le presse-papiers.",
        });
    };

    if (!amount) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
                <h1 className="text-2xl font-bold text-destructive mb-4">Informations de paiement manquantes</h1>
                <p className="text-muted-foreground mb-6">Impossible de générer la page de paiement.</p>
                <Button onClick={() => navigate(from)}>Retour</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl glass-effect">
                <CardHeader className="text-center relative">
                    <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => navigate(from)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <CardTitle className="text-2xl font-bold pt-8">Finalisez votre paiement</CardTitle>
                    <CardDescription>Scannez le QR code ou utilisez le lien ci-dessous.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                    <div className="p-2 bg-white rounded-lg shadow-inner">
                        <img src={qrCodeImageUrl} alt="Scannez pour payer avec MoneyFusion" className="w-64 h-64" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-semibold">Montant à payer</p>
                        <p className="text-3xl font-bold text-primary">{Number(amount).toLocaleString()} FCFA</p>
                    </div>

                    <div className="instructions text-left w-full mt-2">
                        <h4 className="text-lg font-semibold mb-2 text-center">📝 Remplissez le formulaire sur MoneyFusion avec:</h4>
                        <ul className="list-none space-y-2 text-muted-foreground bg-secondary/30 p-4 rounded-md">
                            <li><strong>Montant:</strong> {Number(amount).toLocaleString()} FCFA</li>
                            <li><strong>Nom & Prénoms:</strong> Votre nom complet</li>
                            <li><strong>Numéro Mobile Money:</strong> Votre numéro de paiement</li>
                            <li><strong>Email:</strong> L'email de votre compte Bonplaninfos</li>
                        </ul>
                    </div>
                    
                    <div className="w-full flex flex-col gap-3">
                         <a
                            href={moneyFusionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full"
                        >
                        <Button className="w-full gradient-green text-primary-foreground shadow-lg">
                            🚀 Aller sur MoneyFusion pour payer <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                        </a>
                        <Button variant="outline" onClick={() => copyToClipboard(moneyFusionUrl)}>
                            Copier le lien de paiement <Copy className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <div className="important-notice text-xs text-center bg-destructive/10 text-destructive-foreground p-3 rounded-md border border-destructive/20 w-full">
                        <strong>⚠️ Important:</strong> Utilisez l'email de votre compte Bonplaninfos pour que vos pièces soient créditées automatiquement ou votre licence soit activée.
                    </div>

                     <Link to={from}>
                        <Button variant="link" className="mt-4 text-muted-foreground">
                            Retour à la boutique
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
};

export default PaymentCheckoutPage;