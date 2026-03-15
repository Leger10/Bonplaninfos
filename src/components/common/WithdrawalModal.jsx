import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calculator, CalendarClock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { isWithdrawalOpen } from '@/lib/dateUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';

const WithdrawalModal = ({ 
    open, 
    onOpenChange, 
    availableBalance = 0, 
    userType = 'organizer', 
    userId,
    onSuccess 
}) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [withdrawalConfig, setWithdrawalConfig] = useState({ withdrawal_dates: [5, 20] });
    const [isPoolOpen, setIsPoolOpen] = useState(false);
    const [configLoading, setConfigLoading] = useState(true);
    
    // Constants
    const FEE_PERCENT = 0.05;
    const MIN_WITHDRAWAL_PI = 50; 
    const RATE = 10; 

    // Derived values for UI
    const availableBalancePI = Math.floor(availableBalance / RATE); 
    const requestedAmountPI = parseInt(amount) || 0;
    const requestedAmountFCFA = requestedAmountPI * RATE;
    
    const feeAmountFCFA = Math.ceil(requestedAmountFCFA * FEE_PERCENT);
    const netAmountFCFA = requestedAmountFCFA - feeAmountFCFA;

    // Payment methods list (using codes for i18n)
    const paymentMethods = [
        { code: 'orange', labelKey: 'withdrawalModal.methods.orange' },
        { code: 'mtn', labelKey: 'withdrawalModal.methods.mtn' },
        { code: 'moov', labelKey: 'withdrawalModal.methods.moov' },
        { code: 'wave', labelKey: 'withdrawalModal.methods.wave' },
        { code: 'bank', labelKey: 'withdrawalModal.methods.bank' }
    ];

    useEffect(() => {
        if (open) {
            fetchConfig();
        }
    }, [open]);

    const fetchConfig = async () => {
        setConfigLoading(true);
        try {
            const { data } = await supabase.from('admin_withdrawal_config').select('*').limit(1).maybeSingle();
            const config = data || { withdrawal_dates: [5, 20] };
            if (!config.withdrawal_dates) config.withdrawal_dates = [5, 20];
            
            setWithdrawalConfig(config);
            setIsPoolOpen(isWithdrawalOpen(config.withdrawal_dates));
        } catch (error) {
            console.error("Config fetch error", error);
        } finally {
            setConfigLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (requestedAmountPI > availableBalancePI) {
            toast({ 
                title: t('withdrawalModal.errors.insufficientBalance'), 
                description: t('withdrawalModal.errors.insufficientBalanceDesc'), 
                variant: "destructive" 
            });
            return;
        }

        if (requestedAmountPI < MIN_WITHDRAWAL_PI) {
            toast({ 
                title: t('withdrawalModal.errors.amountTooLow'), 
                description: t('withdrawalModal.errors.amountTooLowDesc', { 
                    minPi: MIN_WITHDRAWAL_PI, 
                    minFcfa: (MIN_WITHDRAWAL_PI * RATE).toLocaleString() 
                }), 
                variant: "destructive" 
            });
            return;
        }

        if (!method || !details) {
            toast({ 
                title: t('withdrawalModal.errors.missingFields'), 
                description: t('withdrawalModal.errors.missingFieldsDesc'), 
                variant: "destructive" 
            });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('request_organizer_withdrawal', {
                p_amount_pi: requestedAmountPI,
                p_payment_details: { 
                    method, 
                    number: details, 
                    account_name: details,
                    fee_percent: FEE_PERCENT * 100,
                    fee_amount_fcfa: feeAmountFCFA,
                    net_amount_fcfa: netAmountFCFA
                }
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.message);

            const newBalancePi = data.new_balance;
            const newBalanceFcfa = newBalancePi * RATE;

            toast({ 
                title: t('withdrawalModal.toast.success'), 
                description: t('withdrawalModal.toast.successDesc', { newBalanceFcfa: newBalanceFcfa.toLocaleString() }), 
                variant: "success" 
            });
            
            if (onSuccess) onSuccess();
            onOpenChange(false);
            setAmount('');
        } catch (error) {
            console.error("Withdrawal error:", error);
            toast({ 
                title: t('withdrawalModal.toast.error'), 
                description: error.message || t('withdrawalModal.toast.errorDesc'), 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('withdrawalModal.title')}</DialogTitle>
                    <DialogDescription>
                        {t('withdrawalModal.balanceLabel')}{' '}
                        <span className="font-bold text-emerald-600">
                            {t('withdrawalModal.balanceValue', { 
                                balanceFcfa: availableBalance.toLocaleString(), 
                                balancePi: availableBalancePI 
                            })}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                {configLoading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-4 py-2">

                        {/* INFos des retraits des gains pour les vues (optionnel) */}
                        {/* {userType === 'organizer' && !isPoolOpen && (
                            <Alert variant="warning" className="bg-amber-50 border-amber-200 text-amber-800 text-xs">
                                <CalendarClock className="h-4 w-4" />
                                <AlertTitle>Info Retraits</AlertTitle>
                                <AlertDescription>
                                    Les gains liés aux interactions (Vues, etc.) ne sont retirables que le {withdrawalConfig.withdrawal_dates.join(', ')} du mois.
                                </AlertDescription>
                            </Alert>
                        )} */}

                        <div className="grid gap-2">
                            <Label htmlFor="amount">{t('withdrawalModal.amountLabel')}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder={t('withdrawalModal.amountPlaceholder')}
                                    className="flex-1"
                                />
                                <div className="bg-muted px-3 py-2 rounded-md border flex items-center min-w-[80px] justify-center font-medium text-xs sm:text-sm">
                                    {requestedAmountFCFA.toLocaleString()} F
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('withdrawalModal.rateInfo', { rate: RATE })}
                            </p>
                        </div>

                        {requestedAmountPI > 0 && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>{t('withdrawalModal.calculation.gross')}:</span>
                                    <span>{requestedAmountFCFA.toLocaleString()} FCFA</span>
                                </div>
                                <div className="flex justify-between text-red-500">
                                    <span className="flex items-center gap-1">
                                        <Calculator className="w-3 h-3" /> 
                                        {t('withdrawalModal.calculation.fee', { percent: Math.round(FEE_PERCENT * 100) })}:
                                    </span>
                                    <span>- {feeAmountFCFA.toLocaleString()} FCFA</span>
                                </div>
                                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-emerald-700 text-base">
                                    <span>{t('withdrawalModal.calculation.net')}:</span>
                                    <span>{netAmountFCFA.toLocaleString()} FCFA</span>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="method">{t('withdrawalModal.methodLabel')}</Label>
                            <Select onValueChange={setMethod} value={method}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('withdrawalModal.methodPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map((pm) => (
                                        <SelectItem key={pm.code} value={pm.code}>
                                            {t(pm.labelKey)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="details">{t('withdrawalModal.detailsLabel')}</Label>
                            <Input 
                                id="details" 
                                value={details} 
                                onChange={(e) => setDetails(e.target.value)} 
                                placeholder={t('withdrawalModal.detailsPlaceholder')} 
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('withdrawalModal.buttons.cancel')}
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={loading || !amount || !method || requestedAmountPI <= 0} 
                        className="bg-emerald-600 text-white w-full sm:w-auto"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('withdrawalModal.buttons.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WithdrawalModal;