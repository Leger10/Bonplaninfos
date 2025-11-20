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

const WithdrawalRequestForm = ({ availableSalary, onClose, onSuccess }) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [bankDetails, setBankDetails] = useState({ name: '', holder: '', number: '' });
    const [mobileMoneyDetails, setMobileMoneyDetails] = useState({ operator: '', phone: '' });
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableSalary) {
            toast({ title: t('common.error_title'), description: "Montant invalide.", variant: "destructive" });
            return;
        }
        if (!method) {
            toast({ title: t('common.error_title'), description: "Veuillez sélectionner une méthode de retrait.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const withdrawalData = {
                admin_id: user.id,
                amount_fcfa: parseFloat(amount),
                amount_pi: 0, // Not relevant for admin salary
                status: 'pending',
                requested_at: new Date().toISOString(),
                payment_details: method === 'bank' ? bankDetails : mobileMoneyDetails,
            };

            const { error } = await supabase.from('admin_withdrawal_requests').insert(withdrawalData);
            if (error) throw error;
            
            toast({ title: "Succès", description: "Votre demande de retrait a été soumise." });
            onSuccess();
        } catch (error) {
            toast({ title: t('common.error_title'), description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>{t('admin_dashboard.withdrawal_form.title')}</DialogTitle>
                    <DialogDescription>{t('admin_dashboard.withdrawal_form.description')}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="font-semibold">
                        {t('admin_dashboard.withdrawal_form.available_salary')}: {availableSalary.toLocaleString('fr-FR')} FCFA
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">{t('admin_dashboard.withdrawal_form.amount_to_withdraw')}</Label>
                        <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="col-span-3" max={availableSalary} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="method" className="text-right">{t('admin_dashboard.withdrawal_form.withdrawal_method')}</Label>
                        <Select onValueChange={setMethod} value={method}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={t('admin_dashboard.withdrawal_form.select_method')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bank">Virement Bancaire</SelectItem>
                                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {method === 'bank' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="bank_name" className="text-right">{t('admin_dashboard.withdrawal_form.bank_name')}</Label>
                                <Input id="bank_name" value={bankDetails.name} onChange={e => setBankDetails(prev => ({...prev, name: e.target.value}))} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="account_holder" className="text-right">{t('admin_dashboard.withdrawal_form.account_holder')}</Label>
                                <Input id="account_holder" value={bankDetails.holder} onChange={e => setBankDetails(prev => ({...prev, holder: e.target.value}))} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="account_number" className="text-right">{t('admin_dashboard.withdrawal_form.account_number')}</Label>
                                <Input id="account_number" value={bankDetails.number} onChange={e => setBankDetails(prev => ({...prev, number: e.target.value}))} className="col-span-3" />
                            </div>
                        </>
                    )}

                    {method === 'mobile_money' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="mm_operator" className="text-right">{t('admin_dashboard.withdrawal_form.mobile_money_operator')}</Label>
                                <Input id="mm_operator" value={mobileMoneyDetails.operator} onChange={e => setMobileMoneyDetails(prev => ({...prev, operator: e.target.value}))} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="mm_phone" className="text-right">{t('admin_dashboard.withdrawal_form.phone_number')}</Label>
                                <Input id="mm_phone" value={mobileMoneyDetails.phone} onChange={e => setMobileMoneyDetails(prev => ({...prev, phone: e.target.value}))} className="col-span-3" />
                            </div>
                        </>
                    )}
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">{t('admin_dashboard.withdrawal_form.reason')}</Label>
                        <Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} className="col-span-3" />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t('admin_dashboard.withdrawal_form.submit')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default WithdrawalRequestForm;