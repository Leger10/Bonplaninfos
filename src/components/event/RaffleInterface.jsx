import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ticket, Calendar, AlertCircle, Loader2, Minus, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const RaffleInterface = ({ raffleData, eventId, isUnlocked, onPurchaseSuccess }) => {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!raffleData) return null;

  const {
    id: raffleId,
    calculated_price_pi: price,
    total_tickets: totalTickets,
    tickets_sold: ticketsSold,
    draw_date: drawDate,
    status,
    min_tickets_sold: minTickets,
    max_tickets_per_user: maxPerUser
  } = raffleData;

  const remainingTickets = totalTickets - ticketsSold;
  const progress = (ticketsSold / totalTickets) * 100;
  const isSoldOut = remainingTickets <= 0;
  const isExpired = new Date(drawDate) < new Date();
  const isActive = status === 'active' && !isExpired && !isSoldOut;

  const handleIncrement = () => {
    if (quantity < remainingTickets && (!maxPerUser || quantity < maxPerUser)) {
      setQuantity(q => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Veuillez vous connecter pour participer.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Call the RPC function
      const { data, error } = await supabase.rpc('purchase_raffle_tickets', {
        p_raffle_id: raffleId,
        p_user_id: user.id,
        p_quantity: quantity
      });

      if (error) throw error;

      if (data.success) {
        toast({ 
          title: "Félicitations ! 🎉", 
          description: `Vous avez acheté ${quantity} ticket(s) avec succès. Vos numéros: ${data.ticket_numbers.join(', ')}` 
        });
        if (onPurchaseSuccess) onPurchaseSuccess();
        setShowConfirm(false);
        setQuantity(1);
      } else {
        throw new Error(data.message || "Erreur lors de l'achat");
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible d'effectuer l'achat. Vérifiez votre solde.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            <span>Tombola</span>
          </div>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "En cours" : isSoldOut ? "Complet" : "Terminé"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Prix du ticket</span>
            <div className="text-2xl font-bold text-primary">{price} π</div>
          </div>
          <div className="space-y-1 text-right">
            <span className="text-sm text-muted-foreground">Tirage le</span>
            <div className="font-medium flex items-center justify-end gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(drawDate), 'dd MMM yyyy', { locale: fr })}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Tickets vendus: {ticketsSold} / {totalTickets}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {ticketsSold < minTickets && (
            <p className="text-xs text-orange-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Minimum requis: {minTickets} tickets
            </p>
          )}
        </div>

        {/* Purchase Controls */}
        {isActive && isUnlocked ? (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="font-medium">Quantité</span>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={handleDecrement} disabled={quantity <= 1}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-bold">{quantity}</span>
                <Button variant="outline" size="icon" onClick={handleIncrement} disabled={quantity >= remainingTickets || (maxPerUser && quantity >= maxPerUser)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
              <span>Total à payer</span>
              <span className="text-xl font-bold">{price * quantity} π</span>
            </div>

            <Button className="w-full" size="lg" onClick={() => setShowConfirm(true)}>
              Acheter des tickets
            </Button>
          </div>
        ) : (
          !isUnlocked ? (
            <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
              Débloquez l'événement pour participer à la tombola
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
              La vente de tickets est fermée
            </div>
          )
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer l'achat</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point d'acheter {quantity} ticket(s) pour un total de {price * quantity} π.
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handlePurchase} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default RaffleInterface;