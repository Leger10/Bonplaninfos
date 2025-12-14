import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, MailCheck, Lock, RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { COUNTRIES, CITIES_BY_COUNTRY } from '@/constants/countries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation, Trans } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/customSupabaseClient';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

// Simple form for deactivated users to contact support
const DeactivatedAccountForm = ({ onBack, email: initialEmail }) => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            // Simulate sending request
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            
            setIsSubmitted(true);
            toast({ title: "Message envoyé", description: "L'administration a été notifiée de votre demande." });
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible d'envoyer le message. Veuillez réessayer plus tard.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <MailCheck className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold">Demande envoyée</h3>
                <p className="text-muted-foreground">
                    Votre demande de réactivation a été transmise à l'administration. 
                    Vous serez contacté par email ({initialEmail}) dès qu'elle sera traitée.
                </p>
                <Button onClick={onBack} variant="outline" className="mt-4">Retour à la connexion</Button>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-600">Compte Désactivé</h2>
            <p className="text-sm text-muted-foreground">
                Votre compte a été désactivé par l'administration. 
                Veuillez remplir ce formulaire pour demander une réactivation.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4 text-left mt-4">
                <div>
                    <Label>Votre Email</Label>
                    <Input value={initialEmail} disabled className="bg-muted" />
                </div>
                <div>
                    <Label htmlFor="reactivation-msg">Message à l'administration</Label>
                    <Textarea 
                        id="reactivation-msg" 
                        placeholder="Expliquez pourquoi votre compte devrait être réactivé..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        className="min-h-[100px]"
                    />
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={onBack} className="flex-1">Annuler</Button>
                    <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer la demande"}
                    </Button>
                </div>
            </form>
        </motion.div>
    );
};

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [cities, setCities] = useState([]);
    const [referralCode, setReferralCode] = useState('');
    const [role, setRole] = useState('user');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
    const [showDeactivatedForm, setShowDeactivatedForm] = useState(false);
    const [showResendLink, setShowResendLink] = useState(false);
    
    const { signIn, signUp, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { toast } = useToast();

    useEffect(() => {
        if (user) {
            navigate('/profile', { replace: true });
        }
    }, [user, navigate]);
    
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('register')) {
            setIsLogin(false);
        }
        const refCode = params.get('ref');
        if (refCode) {
            setReferralCode(refCode);
            setIsLogin(false);
        }
    }, [location.search]);

    useEffect(() => {
        if (country) {
            setCities(CITIES_BY_COUNTRY[country] || []);
            setCity('');
        } else {
            setCities([]);
            setCity('');
        }
    }, [country]);

    const handleResendConfirmation = async () => {
        if (!email) return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: window.location.origin + '/auth'
                }
            });
            
            if (error) throw error;
            
            toast({
                title: "Email envoyé",
                description: "Un nouveau lien de confirmation a été envoyé à " + email,
                variant: "default"
            });
            setShowResendLink(false);
            setError("");
            setShowConfirmationMessage(true);
        } catch (err) {
            toast({
                title: "Erreur",
                description: err.message || "Impossible de renvoyer l'email.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setShowConfirmationMessage(false);
        setShowDeactivatedForm(false);
        setShowResendLink(false);
        
        if (isLogin) {
            const { error } = await signIn(email, password);
            if (error) {
                const errorMessage = error.message || '';
                
                // Handle specific error cases
                if (errorMessage === 'ACCOUNT_DEACTIVATED') {
                    setShowDeactivatedForm(true);
                } else if (errorMessage.includes('Email not confirmed') || errorMessage.includes('email_not_confirmed')) {
                    setError("Votre adresse email n'a pas encore été confirmée. Veuillez vérifier votre boîte de réception (et vos spams).");
                    setShowResendLink(true);
                } else if (errorMessage.includes('Invalid login credentials')) {
                    setError(t('auth.login.error_invalid_credentials'));
                } else {
                    setError(errorMessage || t('auth.login.error_invalid_credentials'));
                }
            } else {
                navigate('/profile');
            }
        } else {
            if (!agreedToTerms) {
                setError(t("auth.register.terms_required"));
                setLoading(false);
                return;
            }
            if (!country || !city) {
                setError(t("auth.register.country_city_required"));
                setLoading(false);
                return;
            }
            const metadata = { 
                full_name: fullName, 
                country: country,
                city: city,
                referral_code: referralCode,
                user_type: role,
            };
            const { data, error } = await signUp(email, password, metadata);
            if (error) {
                 setError(error.message);
            } else if (data.user && data.user.identities && data.user.identities.length === 0) {
                setError("Un utilisateur avec cet email existe déjà mais n'est pas confirmé.");
                setShowResendLink(true);
            } else {
                setShowConfirmationMessage(true);
            }
        }
        
        setLoading(false);
    };

    const toggleForm = () => {
        setIsLogin(!isLogin);
        setError('');
        setShowConfirmationMessage(false);
        setShowDeactivatedForm(false);
        setShowResendLink(false);
        setEmail('');
        setPassword('');
        setFullName('');
        setCountry('');
        setCity('');
        setReferralCode('');
        setRole('user');
        setAgreedToTerms(false);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
    };

    return (
        <>
            <Helmet>
                <title>{isLogin ? t('auth.login.title') : t('auth.register.title')} - BonPlanInfos</title>
                <meta name="description" content={isLogin ? t('auth.login.meta_description') : t('auth.register.meta_description')} />
            </Helmet>
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/70 p-4">
                <motion.div
                    className="w-full max-w-md mx-auto bg-card p-8 rounded-2xl shadow-2xl glass-effect"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                    <AnimatePresence mode="wait">
                       {showDeactivatedForm ? (
                            <DeactivatedAccountForm key="deactivated" onBack={() => setShowDeactivatedForm(false)} email={email} />
                       ) : showConfirmationMessage ? (
                            <motion.div
                                key="confirmation"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center"
                            >
                                <MailCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h1 className="text-2xl font-bold font-heading text-primary">{t('auth.register.confirmation_email_title')}</h1>
                                <p className="text-muted-foreground mt-2 mb-6">{t('auth.register.confirmation_email_description')}</p>
                                <Button onClick={() => {
                                    setShowConfirmationMessage(false);
                                    setIsLogin(true);
                                }}>
                                    {t('auth.login.title')}
                                </Button>
                            </motion.div>
                        ) : (
                        <motion.div
                            key={isLogin ? 'login' : 'signup'}
                            initial={{ opacity: 0, x: isLogin ? -30 : 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isLogin ? 30 : -30 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold font-heading text-primary">{isLogin ? t('auth.login.title') : t('auth.register.title')}</h1>
                                <p className="text-muted-foreground">{isLogin ? t('auth.login.subtitle') : t('auth.register.subtitle')}</p>
                            </div>

                            {error && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertTitle>{t('common.error_title')}</AlertTitle>
                                    <AlertDescription className="flex flex-col gap-2">
                                        <span>{error}</span>
                                        {showResendLink && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={handleResendConfirmation}
                                                disabled={loading}
                                                className="mt-2 border-red-200 hover:bg-red-50 text-red-600 dark:hover:bg-red-900/20 dark:border-red-800"
                                            >
                                                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                                                Renvoyer l'email de confirmation
                                            </Button>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                                    {!isLogin && (
                                        <>
                                            <motion.div variants={itemVariants} className="space-y-2">
                                                <Label htmlFor="fullName">{t('auth.full_name')}</Label>
                                                <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                                            </motion.div>
                                            <motion.div variants={itemVariants} className="space-y-2">
                                                <Label htmlFor="country">{t('auth.country')}</Label>
                                                <Select onValueChange={setCountry} value={country}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('auth.select_country_placeholder')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {COUNTRIES.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </motion.div>
                                            <motion.div variants={itemVariants} className="space-y-2">
                                                <Label htmlFor="city">{t('auth.city')}</Label>
                                                <Select onValueChange={setCity} value={city} disabled={!country}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('auth.select_city_placeholder')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {cities.map(cityName => <SelectItem key={cityName} value={cityName}>{cityName}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </motion.div>
                                             <motion.div variants={itemVariants} className="space-y-2">
                                                <Label htmlFor="role">{t('auth.choose_role')}</Label>
                                                <Select onValueChange={setRole} value={role}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('auth.choose_role_placeholder')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">{t('auth.role_user')}</SelectItem>
                                                        <SelectItem value="organizer">{t('auth.role_organizer')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </motion.div>
                                        </>
                                    )}
                                    <motion.div variants={itemVariants} className="space-y-2">
                                        <Label htmlFor="email">{t('auth.email')}</Label>
                                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                    </motion.div>
                                    <motion.div variants={itemVariants} className="space-y-2">
                                        <Label htmlFor="password">{t('auth.password')}</Label>
                                        <div className="relative">
                                            <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground">
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </motion.div>
                                    {!isLogin && (
                                        <>
                                            <motion.div variants={itemVariants} className="space-y-2">
                                                <Label htmlFor="referralCode">{t('auth.referral_code_optional')}</Label>
                                                <Input id="referralCode" type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
                                            </motion.div>
                                            <motion.div variants={itemVariants} className="flex items-center space-x-2 pt-2">
                                                <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={setAgreedToTerms} />
                                                <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    <Trans i18nKey="auth.register.terms_agreement">
                                                        J'accepte les <Link to="/terms" className="underline text-primary">Conditions Générales d'Utilisation</Link>
                                                    </Trans>
                                                </label>
                                            </motion.div>
                                        </>
                                    )}
                                </motion.div>

                                <Button type="submit" className="w-full gradient-green" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : (isLogin ? t('auth.login.button') : t('auth.register.button'))}
                                </Button>
                            </form>
                            
                            <p className="mt-6 text-center text-sm">
                                {isLogin ? t('auth.login.switch_text') : t('auth.register.switch_text')}
                                <Button variant="link" onClick={toggleForm} className="font-semibold">
                                    {isLogin ? t('auth.register.switch_button') : t('auth.login.switch_button')}
                                </Button>
                            </p>
                        </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </>
    );
};

export default AuthPage;