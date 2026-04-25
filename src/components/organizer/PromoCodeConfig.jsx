// components/organizer/PromoCodeConfig.jsx - VERSION CORRIGÉE
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tag, Percent, Wallet, Users, Save, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

// Taux de conversion constant (1 pièce = 10 FCFA)
const COIN_TO_FCFA_RATE = 10;

export const PromoCodeConfig = ({
  eventId,
  initialConfig,
  onSave,
  readOnly = false,
}) => {
  const [enabled, setEnabled] = useState(initialConfig?.enabled || false);
  const [discountType, setDiscountType] = useState(initialConfig?.discount_type || 'fixed');
  const [discountValue, setDiscountValue] = useState(initialConfig?.discount_value || 0);
  const [commissionRate, setCommissionRate] = useState(initialConfig?.commission_rate || 30);
  const [usageLimit, setUsageLimit] = useState(initialConfig?.usage_limit?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (eventId && !initialConfig) {
      loadConfig();
    }
  }, [eventId]);

  const loadConfig = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_promo_config')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setEnabled(data.enabled);
        setDiscountType(data.discount_type);
        // discount_value est déjà en FCFA dans la base
        setDiscountValue(data.discount_value);
        setCommissionRate(data.commission_rate);
        setUsageLimit(data.usage_limit?.toString() || '');
      }
    } catch (error) {
      console.error('Error loading promo config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (discountValue <= 0 && enabled) {
      toast({
        title: "Valeur invalide",
        description: "La valeur de réduction doit être supérieure à 0",
        variant: "destructive",
      });
      return;
    }

    if (commissionRate < 0 || commissionRate > 100) {
      toast({
        title: "Commission invalide",
        description: "La commission doit être comprise entre 0 et 100%",
        variant: "destructive",
      });
      return;
    }

    if (!eventId) {
      // Mode brouillon - sauvegarde locale
      const configToSave = {
        enabled,
        discount_type: discountType,
        discount_value: discountType === 'fixed' ? discountValue : discountValue,
        commission_rate: commissionRate,
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
      };
      localStorage.setItem('event_promo_config_draft', JSON.stringify(configToSave));
      if (onSave) onSave(configToSave);
      toast({
        title: "Configuration sauvegardée",
        description: `Réduction ${discountType === 'fixed' ? discountValue + ' FCFA' : discountValue + '%'} - Commission ${commissionRate}%`,
      });
      return;
    }

    setSaving(true);
    try {
      // IMPORTANT: discount_value est toujours stocké en FCFA dans la base
      // Si l'utilisateur entre 1000, ça reste 1000 FCFA
      const configToSave = {
        event_id: eventId,
        enabled: enabled,
        discount_type: discountType,
        discount_value: discountType === 'fixed' ? discountValue : discountValue,
        commission_rate: commissionRate,
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        updated_at: new Date().toISOString(),
      };

      console.log("💾 Saving promo config:", configToSave);

      const { error } = await supabase
        .from('event_promo_config')
        .upsert(configToSave);

      if (error) throw error;

      toast({
        title: "Configuration sauvegardée",
        description: `Réduction ${discountType === 'fixed' ? discountValue.toLocaleString() + ' FCFA' : discountValue + '%'} - Commission ${commissionRate}%`,
      });
      
      if (onSave) onSave(configToSave);
      
    } catch (error) {
      console.error('Error saving promo config:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder la configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper pour afficher la valeur de réduction en pièces (pour l'info utilisateur)
  const getDiscountInCoins = () => {
    if (discountType === 'percentage') return null;
    return discountValue / COIN_TO_FCFA_RATE;
  };

  if (loading) {
    return (
      <Card className="border border-border/50">
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Codes de reduction</CardTitle>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {enabled ? 'Actif' : 'Inactif'}
              </span>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={readOnly}
              />
            </div>
          )}
        </div>
      </CardHeader>
      
      {enabled && (
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type de reduction */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type de reduction</Label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="fixed"
                    checked={discountType === 'fixed'}
                    onChange={(e) => setDiscountType(e.target.value)}
                    disabled={readOnly}
                    className="w-4 h-4"
                  />
                  <span className="flex items-center gap-1">
                    <Wallet className="w-4 h-4" />
                    Montant fixe (FCFA)
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="percentage"
                    checked={discountType === 'percentage'}
                    onChange={(e) => setDiscountType(e.target.value)}
                    disabled={readOnly}
                    className="w-4 h-4"
                  />
                  <span className="flex items-center gap-1">
                    <Percent className="w-4 h-4" />
                    Pourcentage
                  </span>
                </label>
              </div>
            </div>

            {/* Valeur de la reduction */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Valeur de la reduction
                {discountType === 'percentage' ? ' (%)' : ' (FCFA)'}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step={discountType === 'percentage' ? '1' : '100'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  disabled={readOnly}
                  className="bg-background/50 pr-24"
                />
                {discountType === 'fixed' && discountValue > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    soit {getDiscountInCoins()} pièces
                  </span>
                )}
              </div>
              {discountType === 'fixed' && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ La réduction est en FCFA. Exemple: 1000 FCFA = 100 pièces
                </p>
              )}
            </div>

            {/* Commission influenceur */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Commission influenceur (%)
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  disabled={readOnly}
                  className="bg-background/50 pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Commission versée à l'influenceur sur chaque vente avec son code
              </p>
            </div>

            {/* Limite d'utilisation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Users className="w-4 h-4" />
                Limite d'utilisation
                <span className="text-xs text-muted-foreground font-normal">
                  (optionnelle)
                </span>
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="Illimitée"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                disabled={readOnly}
                className="bg-background/50"
              />
              {usageLimit && (
                <p className="text-xs text-muted-foreground">
                  Chaque code pourra être utilisé {usageLimit} fois maximum
                </p>
              )}
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">Aperçu de la configuration</p>
            <div className="flex flex-wrap gap-2">
              {discountType === 'fixed' ? (
                <Badge variant="outline" className="bg-primary/10">
                  {discountValue.toLocaleString()} FCFA de réduction
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({getDiscountInCoins()} pièces)
                  </span>
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-primary/10">
                  {discountValue}% de réduction
                </Badge>
              )}
              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                Commission: {commissionRate}%
              </Badge>
              {usageLimit && (
                <Badge variant="outline">
                  Max {usageLimit} utilisations/code
                </Badge>
              )}
            </div>
            {discountType === 'fixed' && (
              <p className="text-xs text-muted-foreground mt-2">
                📌 Exemple: Un billet à 100 pièces (1000 FCFA) devient gratuit
              </p>
            )}
          </div>

          {!readOnly && (
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer la configuration
                </>
              )}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
};