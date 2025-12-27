import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { XCircle, ArrowLeft } from 'lucide-react';
import MultilingualSeoHead from '@/components/MultilingualSeoHead';

const PaymentCancelPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <MultilingualSeoHead pageData={{ title: "Paiement Annulé - BonPlanInfos", description: "Votre paiement a été annulé." }} />
            
            <Card className="max-w-md w-full shadow-lg border-t-8 border-t-red-500">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                        <XCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl text-red-700">Paiement Annulé</CardTitle>
                    <CardDescription>
                        La transaction n'a pas abouti ou a été annulée.
                    </CardDescription>
                </CardHeader>

                <CardContent className="text-center space-y-4">
                    <p className="text-slate-600">
                        Aucun montant n'a été débité de votre compte. Vous pouvez réessayer à tout moment.
                    </p>
                    <div className="bg-slate-100 p-4 rounded-md text-sm text-slate-500">
                        Si vous rencontrez des difficultés avec le paiement, n'hésitez pas à contacter notre support ou à essayer un autre moyen de paiement.
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                    <Button 
                        className="w-full bg-slate-900 hover:bg-slate-800" 
                        onClick={() => navigate('/credit-packs')}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retourner aux packs
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/help-center')}>
                        Besoin d'aide ?
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default PaymentCancelPage;