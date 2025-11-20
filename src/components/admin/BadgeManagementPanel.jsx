import React from 'react';
import { usePartnerBadges } from '@/hooks/usePartnerBadges';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, RefreshCw, Badge, Building, MapPin } from 'lucide-react';

const BadgeCard = ({ badge, onToggle }) => {
  const getBadgeConfig = (licenseType) => {
    const configs = {
      starter: { gradient: 'from-gray-500 to-gray-700', icon: '🏙️', title: 'Ambassadeur de Ville' },
      business: { gradient: 'from-green-500 to-green-700', icon: '🌍', title: 'Ambassadeur Régional' },
      premium: { gradient: 'from-yellow-500 to-yellow-700', icon: '🏆', title: 'Ambassadeur National' },
    };
    return configs[badge.license_type] || configs.starter;
  };

  const config = getBadgeConfig(badge.license_type);

  return (
    <Card className={`overflow-hidden transition-all duration-300 ${badge.is_active ? 'border-primary/50 shadow-lg' : 'border-border opacity-70'} rounded-xl`}>
      <CardHeader className={`bg-gradient-to-r ${config.gradient} text-white p-4`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <CardTitle className="text-lg text-white">{badge.partner_name}</CardTitle>
              <CardDescription className="text-white/80 text-sm">{config.title}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4" /> Zone</span>
          <span className="font-semibold">{badge.zone}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground flex items-center gap-2"><Badge className="w-4 h-4" /> ID Badge</span>
          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{badge.badge_id}</code>
        </div>
        <div className="flex items-center justify-between pt-3 border-t mt-3">
          <label htmlFor={`toggle-${badge.id}`} className="text-sm font-medium">
            {badge.is_active ? 'Activé' : 'Désactivé'}
          </label>
          <Switch
            id={`toggle-${badge.id}`}
            checked={badge.is_active}
            onCheckedChange={(checked) => onToggle(badge.id, checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const BadgeManagementPanel = () => {
  const { badges, loading, toggleBadgeStatus, refreshBadges } = usePartnerBadges();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-white">Gestion des Badges Partenaires</CardTitle>
          <CardDescription>
            {badges.filter(b => b.is_active).length} badge(s) actif(s) sur {badges.length} au total.
          </CardDescription>
        </div>
        <Button onClick={refreshBadges} size="sm" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} onToggle={toggleBadgeStatus} />
          ))}
        </div>
        {badges.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Badge className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg">Aucun badge partenaire trouvé.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BadgeManagementPanel;