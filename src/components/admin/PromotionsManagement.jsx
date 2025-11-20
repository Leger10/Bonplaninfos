import React, { useState, useEffect, useMemo } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { toast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import { Search, Coins, Eye, Trash2, ShieldCheck, ShieldOff, Clock } from 'lucide-react';

    const PromotionsManagement = ({ promotions, onRefresh }) => {
      const navigate = useNavigate();
      const [filteredPromotions, setFilteredPromotions] = useState(promotions);
      const [statusFilter, setStatusFilter] = useState('all');
      const [searchTerm, setSearchTerm] = useState('');
      const [, setTick] = useState(0);

      useEffect(() => {
          const interval = setInterval(() => setTick(tick => tick + 1), 60000); // update every minute
          return () => clearInterval(interval);
      }, []);

      useEffect(() => {
        let filtered = promotions;

        if (searchTerm) {
          filtered = filtered.filter(promo =>
            promo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            promo.organizer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            promo.description?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        if (statusFilter !== 'all') {
          const today = new Date().toISOString();
          if (statusFilter === 'active') {
            filtered = filtered.filter(promo => promo.pack_expires_at > today && promo.status === 'active');
          } else if (statusFilter === 'expired') {
            filtered = filtered.filter(promo => promo.pack_expires_at <= today);
          } else if (statusFilter === 'inactive') {
            filtered = filtered.filter(promo => promo.status !== 'active');
          }
        }

        setFilteredPromotions(filtered);
      }, [promotions, searchTerm, statusFilter]);

      const togglePromotionStatus = async (promoId, currentStatus) => {
        try {
          const newStatus = currentStatus === 'active' ? 'cancelled' : 'active';
          const { error } = await supabase
            .from('event_promotions')
            .update({ status: newStatus, cancelled_at: newStatus === 'cancelled' ? new Date().toISOString() : null })
            .eq('id', promoId);

          if (error) throw error;

          toast({ title: 'Statut de la promotion mis à jour' });
          onRefresh();
        } catch (error) {
          console.error('Error updating promotion status:', error);
          toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
        }
      };

      const deletePromotion = async (promoId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette promotion ? Cette action est irréversible.')) {
          return;
        }

        try {
          const { error } = await supabase
            .from('event_promotions')
            .delete()
            .eq('id', promoId);

          if (error) throw error;

          toast({ title: 'Promotion supprimée avec succès' });
          onRefresh();
        } catch (error) {
          console.error('Error deleting promotion:', error);
          toast({ title: 'Erreur lors de la suppression', variant: 'destructive' });
        }
      };
      
      const TimeLeft = ({ endDate }) => {
          const [timeLeft, setTimeLeft] = useState('');
          useEffect(() => {
              const calculate = () => {
                  const diff = new Date(endDate) - new Date();
                  if (diff <= 0) {
                      setTimeLeft('Expiré');
                      return;
                  }
                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                  setTimeLeft(`${days}j ${hours}h restants`);
              };
              calculate();
              const interval = setInterval(calculate, 60000);
              return () => clearInterval(interval);
          }, [endDate]);
          return <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {timeLeft}</span>;
      };

      return (
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-white">🎯 Gestion des Promotions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher une promotion..."
                  className="pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Toutes les promotions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les promotions</SelectItem>
                  <SelectItem value="active">Actives</SelectItem>
                  <SelectItem value="expired">Expirées</SelectItem>
                  <SelectItem value="inactive">Inactives/Annulées</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400 uppercase bg-background/50">
                  <tr>
                    <th className="px-6 py-3 text-left">Promotion (Événement)</th>
                    <th className="px-6 py-3 text-left">Organisateur</th>
                    <th className="px-6 py-3 text-left">Coût</th>
                    <th className="px-6 py-3 text-left">Statut</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPromotions.map((promotion) => {
                    const isExpired = new Date(promotion.pack_expires_at) < new Date();
                    const isActive = promotion.status === 'active' && !isExpired;

                    return (
                      <tr key={promotion.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-white">{promotion.title}</p>
                          <p className="text-xs text-gray-400">Pack: {promotion.pack_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white">{promotion.organizer?.full_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-primary" />
                            <span className="font-bold text-primary">{promotion.cost_pi}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className={`px-2 py-1 rounded text-xs font-semibold w-fit ${
                                isActive ? 'bg-green-500/20 text-green-400' 
                                : isExpired ? 'bg-gray-500/20 text-gray-400'
                                : 'bg-red-500/20 text-red-400'
                              }`}>
                                {isActive ? 'Active' : isExpired ? 'Expirée' : 'Inactive/Annulée'}
                              </span>
                              <TimeLeft endDate={promotion.pack_expires_at} />
                           </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => navigate(`/event/${promotion.event_id}`)}><Eye className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className={isActive ? "text-yellow-500" : "text-green-500"} onClick={() => togglePromotionStatus(promotion.id, promotion.status)}>
                              {isActive ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="text-red-500" onClick={() => deletePromotion(promotion.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      );
    };

    export default PromotionsManagement;