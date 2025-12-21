import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, User, Mail, Phone, MapPin, BadgeCheck, AlertTriangle, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES, CITIES_BY_COUNTRY } from '@/constants/countries';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ProfileSettings = () => {
    const { user, setForceRefresh } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    
    // Form State
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
    const [phone, setPhone] = useState(user?.user_metadata?.phone || '');
    const [country, setCountry] = useState(user?.user_metadata?.country || '');
    const [city, setCity] = useState(user?.user_metadata?.city || '');
    const [bio, setBio] = useState(user?.user_metadata?.bio || '');
    const [cities, setCities] = useState([]);

    useEffect(() => {
        if (country) {
            setCities(CITIES_BY_COUNTRY[country] || []);
        }
    }, [country]);

    // Handle cooldown timer
    useEffect(() => {
        let interval;
        if (cooldown > 0) {
            interval = setInterval(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [cooldown]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const updates = {
                full_name: fullName,
                phone,
                country,
                city,
                bio,
                updated_at: new Date(),
            };

            const { error } = await supabase.auth.updateUser({
                data: updates
            });

            if (error) throw error;

            // Also update public profile table
            const { error: profileError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (profileError) throw profileError;

            toast({
                title: "Profil mis à jour",
                description: "Vos informations ont été enregistrées avec succès.",
            });
            
            setForceRefresh(prev => !prev);
        } catch (error) {
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResendConfirmation = async () => {
        if (cooldown > 0) return;
        
        setResendLoading(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: user.email,
                options: {
                    emailRedirectTo: window.location.origin + '/profile'
                }
            });

            if (error) throw error;

            toast({
                title: "Email envoyé",
                description: "Veuillez vérifier votre boîte de réception.",
                className: "bg-green-600 text-white"
            });
            
            // Start 60s cooldown
            setCooldown(60);
            
            // Log for debugging
            console.log(`Email verification resent to ${user.email} at ${new Date().toISOString()}`);

        } catch (error) {
            console.error("Resend error:", error);
            toast({
                title: "Erreur d'envoi",
                description: error.message || "Impossible d'envoyer l'email. Veuillez réessayer plus tard.",
                variant: "destructive"
            });
        } finally {
            setResendLoading(false);
        }
    };

    const isEmailVerified = user?.email_confirmed_at || user?.user_metadata?.email_verified;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Email Verification Status Card */}
            <Card className={`border-l-4 ${isEmailVerified ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Mail className="w-5 h-5" />
                                Statut de l'email
                            </CardTitle>
                            <CardDescription>
                                {user?.email}
                            </CardDescription>
                        </div>
                        {isEmailVerified ? (
                            <div className="flex items-center gap-2 text-green-600 bg-green-100 px-3 py-1 rounded-full text-sm font-bold">
                                <BadgeCheck className="w-4 h-4" />
                                Vérifié
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full text-sm font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                Non vérifié
                            </div>
                        )}
                    </div>
                </CardHeader>
                {!isEmailVerified && (
                    <CardContent>
                        <Alert className="bg-yellow-50 border-yellow-200 mb-4">
                            <AlertTitle className="text-yellow-800">Action requise</AlertTitle>
                            <AlertDescription className="text-yellow-700">
                                Veuillez confirmer votre adresse email pour sécuriser votre compte et accéder à toutes les fonctionnalités.
                            </AlertDescription>
                        </Alert>
                        
                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                            <Button 
                                variant="outline" 
                                onClick={handleResendConfirmation} 
                                disabled={resendLoading || cooldown > 0}
                                className="w-full sm:w-auto"
                            >
                                {resendLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                )}
                                {cooldown > 0 ? `Réessayer dans ${cooldown}s` : "Renvoyer l'email de confirmation"}
                            </Button>
                            {cooldown > 0 && (
                                <span className="text-xs text-muted-foreground animate-pulse">
                                    Email envoyé ! Vérifiez vos spams.
                                </span>
                            )}
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Profile Information Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Informations personnelles</CardTitle>
                    <CardDescription>
                        Mettez à jour vos informations publiques.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="flex items-center gap-2"><User className="w-4 h-4" /> Nom complet</Label>
                                <Input 
                                    id="fullName" 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    placeholder="Votre nom" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="w-4 h-4" /> Téléphone</Label>
                                <Input 
                                    id="phone" 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    placeholder="+225..." 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country" className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Pays</Label>
                                <Select value={country} onValueChange={setCountry}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionnez un pays" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COUNTRIES.map((c) => (
                                            <SelectItem key={c.code} value={c.name}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city" className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Ville</Label>
                                <Select value={city} onValueChange={setCity} disabled={!country}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={cities.length ? "Sélectionnez une ville" : "Sélectionnez d'abord un pays"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cities.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Input 
                                    id="bio" 
                                    value={bio} 
                                    onChange={(e) => setBio(e.target.value)} 
                                    placeholder="Une courte description de vous..." 
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={loading} className="w-full md:w-auto">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enregistrement...
                                    </>
                                ) : (
                                    'Enregistrer les modifications'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProfileSettings;