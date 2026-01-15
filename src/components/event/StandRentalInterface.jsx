import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Loader2, Store, CheckCircle, Info, DollarSign, Layout, Users, MapPin, Lock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';

const StandRentalInterface = ({ event, isUnlocked, onRefresh, isClosed }) => {
  const { user } = useAuth();
  const [standTypes, setStandTypes] = useState([]);
  const [myRental, setMyRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rentingType, setRentingType] = useState(null);
  const [isRenting, setIsRenting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: user?.email || '',
    phone: '',
    description: ''
  });

  useEffect(() => {
    if (event?.id) {
      fetchStandData();
    }
  }, [event?.id, user?.id]);

  const fetchStandData = async () => {
    setLoading(true);
    try {
      // Fetch available stand types
      const { data: types, error: typesError } = await supabase
        .from('stand_types')
        .select('*')
        .eq('event_id', event.id)
        .eq('is_active', true)
        .order('calculated_price_pi', { ascending: true });

      if (typesError) throw typesError;
      setStandTypes(types || []);

      // Fetch user's rental if logged in
      if (user) {
        const { data: rentals, error: rentalError } = await supabase
          .from('stand_rentals')
          .select('*, stand_types(name, size, amenities)')
          .eq('user_id', user.id)
          .in('stand_event_id', (await supabase.from('stand_events').select('id').eq('event_id', event.id)).data.map(e => e.id))
          .maybeSingle();

        if (!rentalError) {
          setMyRental(rentals);
        }
      }
    } catch (error) {
      console.error("Error fetching stand data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRentStand = async () => {
    if (isClosed) return;
    if (!user) {
      toast({ title: "Connexion requise", description: "Veuillez vous connecter pour louer un stand.", variant: "destructive" });
      return;
    }
    if (!rentingType) return;

    setIsRenting(true);
    try {
      // Check Balance First (Optional but good UX)
      const { data: profile } = await supabase.from('profiles').select('coin_balance').eq('id', user.id).single();
      if (profile.coin_balance < rentingType.calculated_price_pi) {
        throw new Error(`Solde insuffisant. Il vous faut ${rentingType.calculated_price_pi} pièces.`);
      }

      // Call RPC
      const { data, error } = await supabase.rpc('rent_stand', {
        p_event_id: event.id,
        p_user_id: user.id,
        p_stand_type_id: rentingType.id,
        company_name: formData.companyName,
        contact_person: formData.contactPerson,
        contact_email: formData.email,
        contact_phone: formData.phone,
        business_description: formData.description
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message);

      toast({ 
        title: "Réservation réussie !", 
        description: `Votre stand ${data.stand_number} a été réservé.`, 
        className: "bg-green-600 text-white" 
      });
      
      setRentingType(null); // Close modal
      fetchStandData(); // Refresh UI
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error("Rental error:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsRenting(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  // --- VIEW: ALREADY RENTED ---
  if (myRental) {
    return (
      <Card className="border-green-500/50 bg-green-50/10">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="w-6 h-6" />
            <span className="font-bold uppercase tracking-wider">Réservation Confirmée</span>
          </div>
          <CardTitle className="text-2xl">Votre Stand: {myRental.stand_number}</CardTitle>
          <CardDescription>Détails de votre location pour cet événement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Type de Stand</Label>
                <div className="font-semibold text-lg flex items-center gap-2">
                  <Store className="w-4 h-4" /> {myRental.stand_types?.name}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Dimensions</Label>
                <div className="font-medium flex items-center gap-2">
                  <Layout className="w-4 h-4" /> {myRental.stand_types?.size}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Coût total payé</Label>
                <div className="font-bold text-primary text-xl">
                  {myRental.rental_amount_pi} pièces
                </div>
              </div>
            </div>
            
            <div className="space-y-4 border-l pl-0 md:pl-6 border-border">
              <div>
                <Label className="text-muted-foreground">Entreprise enregistrée</Label>
                <div className="font-medium">{myRental.company_name}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Contact</Label>
                <div className="font-medium">{myRental.contact_person}</div>
                <div className="text-sm text-muted-foreground">{myRental.contact_email}</div>
                <div className="text-sm text-muted-foreground">{myRental.contact_phone}</div>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
             <h4 className="font-semibold mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> Instructions</h4>
             <p className="text-sm text-muted-foreground">
               Veuillez présenter ce récapitulatif à l'organisateur lors de votre arrivée pour prendre possession de votre stand. 
               Un email de confirmation a été envoyé à {myRental.contact_email}.
             </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- VIEW: AVAILABLE STANDS ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" /> 
          Louer un Stand
        </h2>
        <p className="text-muted-foreground">Choisissez parmi les emplacements disponibles pour exposer lors de l'événement.</p>
      </div>

      {!isUnlocked ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Info className="w-8 h-8 mx-auto mb-2" />
            <p>Veuillez débloquer l'événement pour voir les stands disponibles.</p>
          </CardContent>
        </Card>
      ) : standTypes.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="p-8 text-center">
            <p>Aucun stand n'est disponible à la location pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {standTypes.map((type) => {
            const available = type.quantity_available - (type.quantity_rented || 0);
            const isSoldOut = available <= 0;

            return (
              <Card key={type.id} className={`flex flex-col ${isSoldOut || isClosed ? 'opacity-70 grayscale' : 'hover:border-primary/50 transition-colors'}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{type.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Layout className="w-3 h-3" /> {type.size}
                      </CardDescription>
                    </div>
                    <Badge variant={isClosed ? "outline" : isSoldOut ? "destructive" : "secondary"}>
                      {isClosed ? 'TERMINÉ' : isSoldOut ? 'COMPLET' : `${available} dispo.`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{type.description}</p>
                  
                  {type.amenities && Object.keys(type.amenities).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(type.amenities).filter(([,v]) => v).map(([k]) => (
                        <Badge key={k} variant="outline" className="text-xs bg-background">
                          {k.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t pt-4 bg-muted/10 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Prix de location</span>
                    <span className="text-xl font-bold text-primary">{type.calculated_price_pi} pièces</span>
                  </div>
                  
                  {isClosed ? (
                    <Button disabled variant="outline">
                      <Lock className="w-4 h-4 mr-2" /> Événement Terminé
                    </Button>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button disabled={isSoldOut} onClick={() => setRentingType(type)}>
                          {isSoldOut ? 'Indisponible' : 'Réserver'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Réserver le stand : {type.name}</DialogTitle>
                          <DialogDescription>
                            Remplissez les informations de votre entreprise pour valider la location.
                            <br/>
                            <strong>Coût : {type.calculated_price_pi} pièces</strong>
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="company">Nom de l'entreprise / Marque *</Label>
                            <Input 
                              id="company" 
                              value={formData.companyName}
                              onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                              placeholder="Ex: Ma Boutique Bio"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="contact">Personne à contacter *</Label>
                              <Input 
                                id="contact" 
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="phone">Téléphone *</Label>
                              <Input 
                                id="phone" 
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                placeholder="+225..."
                              />
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input 
                              id="email" 
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="desc">Activité / Produits exposés</Label>
                            <Textarea 
                              id="desc" 
                              value={formData.description}
                              onChange={(e) => setFormData({...formData, description: e.target.value})}
                              placeholder="Décrivez brièvement ce que vous allez vendre ou exposer..."
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button 
                            onClick={handleRentStand} 
                            disabled={isRenting || !formData.companyName || !formData.contactPerson || !formData.phone}
                            className="w-full"
                          >
                            {isRenting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Confirmer la réservation ({type.calculated_price_pi} pièces)
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StandRentalInterface;