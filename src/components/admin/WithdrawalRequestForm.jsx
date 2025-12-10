import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const WithdrawalRequestForm = ({ open, onOpenChange, availableSalary, onSuccess }) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [bankDetails, setBankDetails] = useState({
        name: '',
        holder: '',
        number: ''
    });
    const [mobileMoneyDetails, setMobileMoneyDetails] = useState({
        operator: '',
        phone: ''
    });
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!amount || parseFloat(amount) <= 0) {
            toast({
                title: t('common.error_title'),
                description: "Le montant doit être supérieur à 0.",
                variant: "destructive"
            });
            return;
        }

        if (parseFloat(amount) > availableSalary) {
            toast({
                title: t('common.error_title'),
                description: `Le montant ne peut pas dépasser ${availableSalary.toLocaleString('fr-FR')} FCFA.`,
                variant: "destructive"
            });
            return;
        }

        if (!method) {
            toast({
                title: t('common.error_title'),
                description: "Veuillez sélectionner une méthode de retrait.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            // Préparer les détails de paiement selon la méthode
            let paymentDetails = {};
            if (method === 'bank') {
                if (!bankDetails.name || !bankDetails.holder || !bankDetails.number) {
                    throw new Error("Veuillez remplir tous les champs bancaires.");
                }
                paymentDetails = {
                    method: 'bank',
                    bank_name: bankDetails.name,
                    account_holder: bankDetails.holder,
                    account_number: bankDetails.number
                };
            } else if (method === 'mobile_money') {
                if (!mobileMoneyDetails.operator || !mobileMoneyDetails.phone) {
                    throw new Error("Veuillez remplir tous les champs Mobile Money.");
                }
                paymentDetails = {
                    method: 'mobile_money',
                    operator: mobileMoneyDetails.operator,
                    phone: mobileMoneyDetails.phone
                };
            }

            const withdrawalData = {
                admin_id: user.id,
                amount_fcfa: parseFloat(amount),
                amount_pi: 0,
                status: 'pending',
                requested_at: new Date().toISOString(),
                reason: reason || 'Demande de retrait de salaire',
                payment_details: paymentDetails,
            };

            console.log('Sending withdrawal data:', withdrawalData);

            const { data, error } = await supabase
                .from('admin_withdrawal_requests')
                .insert([withdrawalData])
                .select()
                .single();

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            console.log('Withdrawal request created:', data);

            toast({
                title: "Succès",
                description: "Votre demande de retrait a été soumise avec succès.",
                variant: "success"
            });

            // Réinitialiser le formulaire
            resetForm();

            // Fermer le modal et appeler le callback de succès
            if (onSuccess) {
                onSuccess();
            }

            onOpenChange(false);

        } catch (error) {
            console.error('Error creating withdrawal request:', error);
            toast({
                title: t('common.error_title'),
                description: error.message || "Une erreur est survenue lors de la soumission de votre demande.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setAmount('');
        setMethod('');
        setBankDetails({ name: '', holder: '', number: '' });
        setMobileMoneyDetails({ operator: '', phone: '' });
        setReason('');
    };

    const handleClose = () => {
        resetForm();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        {t('admin_dashboard.withdrawal_form.title') || 'Demande de Retrait'}
                    </DialogTitle>
                    <DialogDescription>
                        {t('admin_dashboard.withdrawal_form.description') || 'Soumettre une demande de retrait de votre salaire.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-blue-800">
                                {t('admin_dashboard.withdrawal_form.available_salary') || 'Salaire disponible'}:
                            </span>
                            <span className="text-2xl font-bold text-blue-800">
                                {availableSalary.toLocaleString('fr-FR')} FCFA
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount" className="font-medium">
                            {t('admin_dashboard.withdrawal_form.amount_to_withdraw') || 'Montant à retirer (FCFA)'}
                        </Label>
                        <div className="relative">
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pr-12 text-lg"
                                placeholder="0"
                                min="1"
                                max={availableSalary}
                                step="100"
                                required
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                FCFA
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Montant maximum: {availableSalary.toLocaleString('fr-FR')} FCFA
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="method" className="font-medium">
                            {t('admin_dashboard.withdrawal_form.withdrawal_method') || 'Méthode de retrait'}
                        </Label>
                        <Select
                            onValueChange={setMethod}
                            value={method}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('admin_dashboard.withdrawal_form.select_method') || "Sélectionner une méthode"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bank">Virement Bancaire</SelectItem>
                                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {method === 'bank' && (
                        <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                            <h3 className="font-medium text-gray-700">Informations bancaires</h3>

                            <div className="space-y-2">
                                <Label htmlFor="bank_name">Nom de la banque</Label>
                                <Input
                                    id="bank_name"
                                    value={bankDetails.name}
                                    onChange={(e) => setBankDetails(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Ecobank, BICEC, etc."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account_holder">Nom du titulaire du compte</Label>
                                <Input
                                    id="account_holder"
                                    value={bankDetails.holder}
                                    onChange={(e) => setBankDetails(prev => ({ ...prev, holder: e.target.value }))}
                                    placeholder="Ex: John Doe"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account_number">Numéro de compte</Label>
                                <Input
                                    id="account_number"
                                    value={bankDetails.number}
                                    onChange={(e) => setBankDetails(prev => ({ ...prev, number: e.target.value }))}
                                    placeholder="Ex: 1234567890"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {method === 'mobile_money' && (
                        <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                            <h3 className="font-medium text-gray-700">Informations Mobile Money</h3>

                            <div className="space-y-2">
                                <Label htmlFor="mm_operator">Opérateur</Label>
                                <Select
                                    onValueChange={(value) => setMobileMoneyDetails(prev => ({ ...prev, operator: value }))}
                                    value={mobileMoneyDetails.operator}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un opérateur" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="orange">Orange Money</SelectItem>
                                        <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                                        <SelectItem value="moov">Moov Money</SelectItem>
                                        <SelectItem value="express">Express Union</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="mm_phone">Numéro de téléphone</Label>
                                <Input
                                    id="mm_phone"
                                    value={mobileMoneyDetails.phone}
                                    onChange={(e) => setMobileMoneyDetails(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="Ex: 6XX XXX XXX"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="reason" className="font-medium">
                            {t('admin_dashboard.withdrawal_form.reason') || 'Raison (optionnelle)'}
                        </Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Précisez la raison de ce retrait si nécessaire"
                            rows={3}
                        />
                    </div>

                    <DialogFooter className="pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            {t('common.cancel') || 'Annuler'}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !amount || !method}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('admin_dashboard.withdrawal_form.submit') || 'Soumettre la demande'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default WithdrawalRequestForm;