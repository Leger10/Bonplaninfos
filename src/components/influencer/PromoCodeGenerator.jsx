// components/influencer/PromoCodeGenerator.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, RefreshCw, Tag, Users, Wallet, Loader2, ArrowRight, Gift, Coins } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Link } from 'react-router-dom';

// Constante pour la conversion (1 pièce = 10 FCFA)
const COIN_TO_FCFA_RATE = 10;

// Composant pour les statistiques organisateur
export const OrganizerPromoStats = ({ eventId, isOwner }) => {
  const [stats, setStats] = useState({
    total_influencers: 0,
    total_commission_coins: 0,
    total_commission_fcfa: 0,
    total_usages: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchOrganizerStats = async () => {
    if (!eventId || !isOwner) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_promo_code_stats', {
        p_event_id: eventId
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Error fetching promo stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner && eventId) {
      fetchOrganizerStats();
      const interval = setInterval(fetchOrganizerStats, 30000);
      return () => clearInterval(interval);
    }
  }, [eventId, isOwner]);

  if (!isOwner) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 p-3 rounded-xl text-center border border-purple-500/20">
        <div className="flex items-center justify-center mb-2">
          <Users className="w-5 h-5 text-purple-400" />
        </div>
        <p className="text-2xl font-bold text-white">{stats.total_influencers}</p>
        <p className="text-xs text-purple-300">Influenceurs actifs</p>
      </div>
      
      <div className="bg-gradient-to-br from-emerald-900/30 to-green-900/30 p-3 rounded-xl text-center border border-emerald-500/20">
        <div className="flex items-center justify-center mb-2">
          <Coins className="w-5 h-5 text-emerald-400" />
        </div>
        <p className="text-xl font-bold text-emerald-400">
          {stats.total_commission_fcfa.toLocaleString()} FCFA
        </p>
        <p className="text-xs text-emerald-300">
          soit {stats.total_commission_coins} pièces
        </p>
      </div>
    </div>
  );
};

export const PromoCodeGenerator = ({
  eventId,
  eventTitle,
  onCodeGenerated,
}) => {
  const { user } = useAuth();
  const [generatedCode, setGeneratedCode] = useState(null);
  const [existingCode, setExistingCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ usage_count: 0, total_commission: 0, total_commission_coins: 0 });
  const [customCode, setCustomCode] = useState('');
  const [useCustomCode, setUseCustomCode] = useState(false);
  
  const [eventConfig, setEventConfig] = useState({
    discountType: 'fixed',
    discountValue: 0,
    commissionRate: 0,
    enabled: false
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadEventConfig();
    }
  }, [eventId]);

  const loadEventConfig = async () => {
    setLoadingConfig(true);
    try {
      const { data, error } = await supabase
        .from('event_promo_config')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.enabled) {
        setEventConfig({
          discountType: data.discount_type,
          discountValue: data.discount_value,
          commissionRate: data.commission_rate,
          enabled: data.enabled
        });
      } else {
        setEventConfig(prev => ({ ...prev, enabled: false }));
      }
    } catch (error) {
      console.error('Error loading event config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (user && eventId && eventConfig.enabled) {
      loadExistingCode();
    }
  }, [user, eventId, eventConfig.enabled]);

  const loadExistingCode = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('event_id', eventId)
        .eq('influencer_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setExistingCode(data);
        setGeneratedCode(data.code);
        
        const { data: statsData, error: statsError } = await supabase
          .from('promo_code_usages')
          .select('commission_amount')
          .eq('promo_code_id', data.id);
        
        if (statsError) {
          console.error('Error loading stats:', statsError);
        }
        
        if (statsData) {
          const totalCommissionCoins = statsData.reduce((sum, u) => sum + (u.commission_amount || 0), 0);
          setStats({
            usage_count: data.usage_count || 0,
            total_commission: totalCommissionCoins * COIN_TO_FCFA_RATE,
            total_commission_coins: totalCommissionCoins,
          });
        }
      }
    } catch (error) {
      console.error('Error loading existing code:', error);
    }
  };

  const generateCode = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour generer un code",
        variant: "destructive",
      });
      return;
    }

    if (!eventConfig.enabled) {
      toast({
        title: "Promotions desactivees",
        description: "L'organisateur n'a pas active les codes promo pour cet evenement",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let code;
      
      if (useCustomCode && customCode.trim()) {
        code = customCode.trim().toUpperCase();
        
        const { data: existing } = await supabase
          .from('promo_codes')
          .select('id')
          .eq('code', code)
          .maybeSingle();
        
        if (existing) {
          toast({
            title: "Code deja utilise",
            description: "Ce code est deja pris. Veuillez en choisir un autre.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } else {
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'USER';
        const randomSuffix = Math.floor(Math.random() * 1000);
        code = `${eventTitle?.substring(0, 3).toUpperCase() || 'EVT'}-${username.toUpperCase()}-${randomSuffix}`;
      }

      const { data, error } = await supabase
        .from('promo_codes')
        .insert({
          code,
          influencer_id: user.id,
          event_id: eventId,
          is_active: true,
          usage_count: 0,
          usage_limit: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedCode(data.code);
      setExistingCode(data);
      if (onCodeGenerated) onCodeGenerated(data.code);
      
      toast({
        title: "Code genere !",
        description: `Votre code ${data.code} est pret a etre partage`,
        className: "bg-green-600 text-white",
      });
    } catch (error) {
      console.error('Error generating code:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de generer le code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCodeStatus = async () => {
    if (!existingCode) return;
    
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ 
          is_active: !existingCode.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCode.id);

      if (error) throw error;

      setExistingCode({ ...existingCode, is_active: !existingCode.is_active });
      toast({
        title: existingCode.is_active ? "Code desactive" : "Code active",
        description: existingCode.is_active 
          ? "Votre code n'est plus actif"
          : "Votre code est maintenant actif",
      });
    } catch (error) {
      console.error('Error toggling code status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut du code",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copie !",
        description: "Code copie dans le presse-papier",
      });
    }
  };

  const shareOnWhatsApp = () => {
    if (generatedCode) {
      const discountText = eventConfig.discountType === 'fixed' 
        ? `${eventConfig.discountValue.toLocaleString()} FCFA` 
        : `${eventConfig.discountValue}%`;
      const text = `Code promo pour "${eventTitle}" : ${generatedCode}\nBeneficiez d'une reduction de ${discountText} sur votre billetterie !`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const refreshStats = async () => {
    if (!existingCode) return;
    
    try {
      const { data: statsData } = await supabase
        .from('promo_code_usages')
        .select('commission_amount')
        .eq('promo_code_id', existingCode.id);
      
      if (statsData) {
        const totalCommissionCoins = statsData.reduce((sum, u) => sum + (u.commission_amount || 0), 0);
        setStats({
          usage_count: existingCode.usage_count || 0,
          total_commission: totalCommissionCoins * COIN_TO_FCFA_RATE,
          total_commission_coins: totalCommissionCoins,
        });
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  useEffect(() => {
    if (existingCode) {
      refreshStats();
      const interval = setInterval(refreshStats, 30000);
      return () => clearInterval(interval);
    }
  }, [existingCode]);

  if (loadingConfig) {
    return (
      <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (!eventConfig.enabled) {
    return (
      <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-8 text-center">
          <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            Promotions desactivees
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            L&apos;organisateur n&apos;a pas active les codes promo pour cet evenement
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Code de reduction influenceur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {generatedCode ? (
          <>
            <div className="text-center">
              <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-4 rounded-xl">
                <Label className="text-xs text-muted-foreground">Votre code unique</Label>
                <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                  <code className="text-xl md:text-2xl font-mono font-bold tracking-wider text-primary break-all">
                    {generatedCode}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyToClipboard}
                    className="h-8 w-8"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-3 rounded-lg text-center">
              <p className="text-sm font-medium mb-1">Reduction offerte</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {eventConfig.discountType === 'fixed' ? (
                  <span className="text-xl font-bold text-primary">{eventConfig.discountValue.toLocaleString()} FCFA</span>
                ) : (
                  <span className="text-xl font-bold text-primary">{eventConfig.discountValue}%</span>
                )}
                <Badge variant="outline" className="bg-green-500/10">
                  Commission: {eventConfig.commissionRate}%
                </Badge>
              </div>
            </div>

        
            {/* Section des gains - Version finale corrigée */}
<div className="relative overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-5 shadow-2xl transform transition-all duration-500 hover:scale-[1.02] group animate-in fade-in slide-in-from-bottom-4 border border-emerald-500/30">
  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute top-2 left-4 w-1.5 h-1.5 bg-amber-300 rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '2s' }}></div>
    <div className="absolute top-4 right-8 w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{ animationDelay: '0.3s', animationDuration: '2.5s' }}></div>
    <div className="absolute bottom-3 left-6 w-1.5 h-1.5 bg-amber-300 rounded-full animate-ping" style={{ animationDelay: '0.6s', animationDuration: '1.8s' }}></div>
    <div className="absolute top-1/2 right-3 w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
    <div className="absolute bottom-8 right-12 w-1.5 h-1.5 bg-amber-300 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
  </div>
  <div className="absolute -inset-full w-1/2 h-full bg-gradient-to-r from-transparent via-amber-400/15 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
  <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-black/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
  
  <div className="relative z-10">
    <div className="flex items-center justify-center gap-3 mb-4">
      <div className="bg-amber-400/20 rounded-full p-3 animate-bounce shadow-lg">
        <Gift className="w-6 h-6 text-amber-300" />
      </div>
      <h4 className="font-black text-white text-xl tracking-wide drop-shadow-lg">
        🎖️ MES GAINS PREMIUM 🎖️
      </h4>
      <div className="bg-amber-400/20 rounded-full p-3 animate-bounce shadow-lg" style={{ animationDelay: '0.5s' }}>
        <Coins className="w-6 h-6 text-amber-300" />
      </div>
    </div>
    
    <div className="flex justify-center mb-3">
      <div className="bg-amber-500/20 backdrop-blur-sm rounded-full px-3 py-1 border border-amber-400/40">
        <span className="text-xs font-semibold text-amber-300 tracking-wider">✦ COMMISSIONS ÉLIGIBLES ✦</span>
      </div>
    </div>
    
    <div className="bg-gradient-to-r from-emerald-900/80 to-teal-900/80 rounded-xl p-3 mb-3 backdrop-blur-sm border border-amber-500/30 shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-3 h-3 bg-amber-400 rounded-full animate-ping opacity-75"></div>
          </div>
          <div>
            <span className="text-sm font-bold text-white">
              {stats.total_commission_coins > 0 
                ? `🎯 ${stats.total_commission_coins.toLocaleString()} pièces disponibles`
                : "🌟 Générez des commissions"}
            </span>
            {stats.total_commission_coins > 0 && (
              <p className="text-[10px] text-emerald-300/80">
                {stats.total_commission.toLocaleString()} FCFA
              </p>
            )}
          </div>
        </div>
        <Link to="/profile?tab=creator">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 gap-2 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg border border-amber-500/30"
          >
            <span className="text-base">💰</span> demander Retrait <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
    
    <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-emerald-500/20">
      <span className="text-sm text-amber-400/80 animate-pulse">✨</span>
      <p className="text-xs text-emerald-200/80 text-center font-medium tracking-wide">
        Statut PREMIUM • Commission automatique sous 24h
      </p>
      <span className="text-sm text-amber-400/80 animate-pulse">✨</span>
    </div>
  </div>
</div>

            {/* Statistiques d'utilisation corrigées */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-xl text-center transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-700">
                <div className="flex items-center justify-center mb-1">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-white">{stats.usage_count}</p>
                <p className="text-xs text-slate-400">Personnes touchées</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-xl text-center transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-700">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Wallet className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-xl font-bold text-amber-400">
                  {stats.total_commission.toLocaleString()} FCFA
                </p>
                <p className="text-xs text-slate-400">
                  soit {stats.total_commission_coins} pièces
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant={existingCode.is_active ? "destructive" : "default"}
                onClick={toggleCodeStatus}
                className="flex-1"
              >
                {existingCode.is_active ? "Desactiver le code" : "Activer le code"}
              </Button>
              <Button
                variant="outline"
                onClick={shareOnWhatsApp}
                className="flex-1"
              >
                Partager sur WhatsApp
              </Button>
            </div>

            <Alert className={existingCode.is_active ? "bg-green-500/10 border-green-500/20" : "bg-yellow-500/10 border-yellow-500/20"}>
              <AlertDescription className="text-xs text-center">
                {existingCode.is_active 
                  ? "✓ Votre code est actif et peut être utilisé"
                  : "⚠️ Votre code est désactivé. Réactivez-le pour qu'il fonctionne à nouveau."
                }
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <>
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Tag className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Générez un code promo unique pour cet événement
              </p>
              <p className="text-xs text-muted-foreground">
                Partagez-le avec votre communauté et gagnez des commissions sur chaque utilisation
              </p>
              <div className="mt-3 p-2 bg-primary/5 rounded-lg">
                <p className="text-xs text-primary">
                  Réduction: {eventConfig.discountType === 'fixed' 
                    ? `${eventConfig.discountValue.toLocaleString()} FCFA` 
                    : `${eventConfig.discountValue}%`}
                  {" • "}
                  Commission: {eventConfig.commissionRate}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
              <input
                type="checkbox"
                id="customCode"
                checked={useCustomCode}
                onChange={(e) => setUseCustomCode(e.target.checked)}
                className="rounded border-muted w-4 h-4"
              />
              <Label htmlFor="customCode" className="text-sm cursor-pointer">
                Utiliser un code personnalisé
              </Label>
            </div>

            {useCustomCode && (
              <div className="space-y-2">
                <Label>Code personnalisé</Label>
                <Input
                  placeholder="Ex: CODE-MONNOM"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Le code sera automatiquement converti en majuscules
                </p>
              </div>
            )}

            <Button
              onClick={generateCode}
              disabled={loading || (useCustomCode && !customCode.trim())}
              className="w-full bg-gradient-to-r from-primary to-purple-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Générer mon code
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PromoCodeGenerator;