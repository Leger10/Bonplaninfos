import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Loader2, CalendarClock } from 'lucide-react';
import { format, addYears, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

const LicenseRenewalModal = ({ partner, open, onOpenChange, onRenewalComplete }) => {
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState('1_year');

  const handleRenew = async () => {
    if (!partner) return;
    setLoading(true);

    try {
      // Calculate new expiration date
      // If expired, start from today. If active, add to current expiration.
      const currentExpiry = new Date(partner.expiration_date);
      const isExpired = currentExpiry < new Date();
      const baseDate = isExpired ? new Date() : currentExpiry;
      
      let newDate;
      let durationLabel = '';

      switch (duration) {
        case '1_year':
          newDate = addYears(baseDate, 1);
          durationLabel = '1 an';
          break;
        case '2_years':
          newDate = addYears(baseDate, 2);
          durationLabel = '2 ans';
          break;
        case '3_years':
          newDate = addYears(baseDate, 3);
          durationLabel = '3 ans';
          break;
        case '6_months':
          newDate = addMonths(baseDate, 6);
          durationLabel = '6 mois';
          break;
        default:
          newDate = addYears(baseDate, 1);
          durationLabel = '1 an';
      }

      // Update partner record
      const { error } = await supabase
        .from('partners')
        .update({
          expiration_date: newDate.toISOString(),
          status: 'active', // Ensure it's active
          updated_at: new Date()
        })
        .eq('id', partner.id);

      if (error) throw error;

      // Log the renewal
      await supabase.from('admin_logs').insert({
        action_type: 'license_renewed',
        target_id: partner.user_id,
        actor_id: (await supabase.auth.getUser()).data.user.id,
        details: {
          partner_id: partner.id,
          previous_expiry: partner.expiration_date,
          new_expiry: newDate.toISOString(),
          duration: durationLabel
        }
      });

      toast({
        title: "Renouvellement réussi",
        description: `La licence de ${partner.user?.full_name} a été prolongée de ${durationLabel}.`,
        variant: "success"
      });

      if (onRenewalComplete) onRenewalComplete();
      onOpenChange(false);

    } catch (error) {
      console.error("Renewal error:", error);
      toast({
        title: "Erreur",
        description: "Échec du renouvellement: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!partner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Renouveler la Licence
          </DialogTitle>
          <DialogDescription>
            Prolonger le contrat de partenariat pour <strong>{partner.user?.full_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-md">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Licence actuelle:</span>
              <span className="font-medium capitalize">{partner.coverage_zone?.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expiration:</span>
              <span className={`font-medium ${new Date(partner.expiration_date) < new Date() ? 'text-red-600' : 'text-foreground'}`}>
                {format(new Date(partner.expiration_date), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Durée de prolongation</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une durée" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6_months">6 Mois</SelectItem>
                <SelectItem value="1_year">1 An</SelectItem>
                <SelectItem value="2_years">2 Ans</SelectItem>
                <SelectItem value="3_years">3 Ans</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleRenew} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer le renouvellement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LicenseRenewalModal;