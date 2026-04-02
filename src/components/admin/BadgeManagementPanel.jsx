import React from "react";
import { usePartnerBadges } from "@/hooks/usePartnerBadges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const BadgeManagementPanel = () => {
  const { badges, loading, toggleBadgeStatus, refreshBadges } = usePartnerBadges();

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
      <CardHeader className="bg-primary text-white flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><UserCheck /> Gestion des Ambassadeurs</CardTitle>
        <Button size="sm" variant="secondary" onClick={refreshBadges}><RefreshCw size={14} className="mr-2"/> Actualiser</Button>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div key={badge.id} className="flex items-center justify-between p-4 border rounded-2xl bg-muted/30">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${badge.is_active ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-red-500'}`} />
                <div>
                  <p className="font-bold text-sm">{badge.partner_name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{badge.zone}</p>
                </div>
              </div>
              <Switch 
                checked={badge.is_active} 
                onCheckedChange={(checked) => toggleBadgeStatus(badge.id, checked)} 
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BadgeManagementPanel;