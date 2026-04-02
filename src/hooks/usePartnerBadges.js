import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

export const usePartnerBadges = () => {
  const [badges, setBadges] = useState([]);
  const [activeBadges, setActiveBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = useCallback(async () => {
    setLoading(true);

    try {
     const { data, error } = await supabase
  .from('partners')
  .select(`
    id,
    status,
    coverage_zone,
    user:profiles!partners_user_id_fkey(full_name, email),
    license:partner_licenses(name)
  `);
      if (error) throw error;

      // 🔥 Transformation en badges
      const formattedBadges = (data || []).map((partner) => {
        const licenseName = partner.license?.name?.toLowerCase();

        let licenseType = 'starter';
        if (licenseName?.includes('premium')) licenseType = 'premium';
        else if (licenseName?.includes('business')) licenseType = 'business';

        return {
          id: partner.id,
          partner_name: partner.user?.full_name || 'Nom inconnu',
          badge_id: `BP-${partner.id}`,
          license_type: licenseType,
          zone: partner.coverage_zone?.country || 'Non défini',
          is_active: partner.status === 'active',
        };
      });

      setBadges(formattedBadges);
      setActiveBadges(formattedBadges.filter(b => b.is_active));

    } catch (error) {
      console.error('Erreur récupération badges:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les badges partenaires.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  // 🔥 Active/Désactive = update status partner
  const toggleBadgeStatus = async (partnerId, newStatus) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update({
          status: newStatus ? 'active' : 'suspended',
          updated_at: new Date().toISOString(),
        })
        .eq('id', partnerId);

      if (error) throw error;

      toast({
        title: newStatus ? 'Badge activé' : 'Badge désactivé',
      });

      await fetchBadges();
      return true;

    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le statut.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    badges,
    activeBadges,
    loading,
    toggleBadgeStatus,
    refreshBadges: fetchBadges,
  };
};