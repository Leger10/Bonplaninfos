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
            .from('partner_badges')
            .select('*')
            .order('display_order', { ascending: true });

          if (error) throw error;

          setBadges(data || []);
          setActiveBadges(data.filter(b => b.is_active) || []);
        } catch (error) {
          console.error('Error fetching partner badges:', error);
          toast({ title: 'Erreur', description: 'Impossible de charger les badges partenaires.', variant: 'destructive' });
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => {
        fetchBadges();
      }, [fetchBadges]);

      const toggleBadgeStatus = async (badgeId, newStatus) => {
        try {
          const { error } = await supabase
            .from('partner_badges')
            .update({ is_active: newStatus, updated_at: new Date().toISOString() })
            .eq('id', badgeId);

          if (error) throw error;
          
          toast({ title: `Badge ${newStatus ? 'activé' : 'désactivé'} avec succès` });
          await fetchBadges();
          return true;
        } catch (error) {
          console.error('Error toggling badge status:', error);
          toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut du badge.', variant: 'destructive' });
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