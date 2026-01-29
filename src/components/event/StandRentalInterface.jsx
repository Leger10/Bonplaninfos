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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Store, CheckCircle, Info, DollarSign, Layout, Users, MapPin, Lock, ArrowRight, User, Phone, Building } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

// Couleurs différentes pour chaque type de stand avec des contrastes lisibles
const STAND_COLORS = [
  { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-800' },
  { border: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-800' },
  { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-800' },
  { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-800' },
  { border: 'border-l-pink-500', bg: 'bg-pink-50', text: 'text-pink-800' },
  { border: 'border-l-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-800' },
  { border: 'border-l-teal-500', bg: 'bg-teal-50', text: 'text-teal-800' },
  { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-800' },
  { border: 'border-l-rose-500', bg: 'bg-rose-50', text: 'text-rose-800' },
  { border: 'border-l-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-800' }
];

const StandRentalInterface = ({ event, isUnlocked, onRefresh, isClosed, userProfile }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [standTypes, setStandTypes] = useState([]);
  const [myRental, setMyRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rentingType, setRentingType] = useState(null);
  const [isRenting, setIsRenting] = useState(false);
  const [allRentals, setAllRentals] = useState([]);
  const [showAllRentals, setShowAllRentals] = useState(false);
  
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
      const { data: types, error: typesError } = await supabase
        .from('stand_types')
        .select('*')
        .eq('event_id', event.id)
        .eq('is_active', true)
        .order('calculated_price_pi', { ascending: true });

      if (typesError) throw typesError;
      setStandTypes(types || []);

      if (user) {
        const { data: rentals, error: rentalError } = await supabase
          .from('stand_rentals')
          .select('*, stand_types(name, size, amenities), profiles(full_name, phone_number)')
          .eq('user_id', user.id)
          .in('stand_event_id', (await supabase.from('stand_events').select('id').eq('event_id', event.id)).data.map(e => e.id))
          .maybeSingle();

        if (!rentalError) {
          setMyRental(rentals);
        }
      }

      if (userProfile?.user_type === 'organizer' && user?.id === event?.organizer_id) {
        const { data: allRentalsData, error: allRentalsError } = await supabase
          .from('stand_rentals')
          .select(`
            *,
            stand_types(name, size, calculated_price_pi),
            profiles(full_name, phone_number)
          `)
          .in('stand_event_id', (await supabase.from('stand_events').select('id').eq('event_id', event.id)).data.map(e => e.id))
          .order('created_at', { ascending: false });

        if (!allRentalsError) {
          setAllRentals(allRentalsData || []);
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
      toast({ 
        title: "Connexion requise", 
        description: "Veuillez vous connecter pour louer un stand.", 
        variant: "destructive" 
      });
      return;
    }
    if (!rentingType) return;

    setIsRenting(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.coin_balance < rentingType.calculated_price_pi) {
        toast({
          title: "Solde insuffisant",
          description: `Il vous faut ${rentingType.calculated_price_pi} pièces. Vous avez ${profile.coin_balance} pièces.`,
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              className="ml-2 text-white border-white hover:bg-white hover:text-red-600"
              onClick={() => navigate('/packs')}
            >
              Acheter des pièces
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ),
        });
        return;
      }

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
      
      setRentingType(null);
      fetchStandData();
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error("Rental error:", error);
      toast({ 
        title: "Erreur", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsRenting(false);
    }
  };

  const handleBuyCoins = () => {
    navigate('/packs');
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  if (myRental) {
    return (
      <div className="space-y-6">
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

        {userProfile?.user_type === 'organizer' && user?.id === event?.organizer_id && allRentals.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" />
                    Toutes les Réservations de Stands
                  </CardTitle>
                  <CardDescription>
                    Liste complète des entreprises ayant réservé un stand
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  {allRentals.length} réservation{allRentals.length > 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">Stand</TableHead>
                      <TableHead className="font-bold">Entreprise</TableHead>
                      <TableHead className="font-bold">Contact</TableHead>
                      <TableHead className="font-bold">Téléphone</TableHead>
                      <TableHead className="font-bold">Type</TableHead>
                      <TableHead className="font-bold text-right">Prix</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRentals.map((rental) => (
                      <TableRow key={rental.id}>
                        <TableCell className="font-medium">{rental.stand_number}</TableCell>
                        <TableCell>
                          <div className="font-medium">{rental.company_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {rental.profiles?.full_name || rental.contact_person}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            <span className="font-medium">{rental.contact_person}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">{rental.contact_email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span className="font-medium">{rental.contact_phone || rental.profiles?.phone_number || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {rental.stand_types?.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold text-primary">{rental.rental_amount_pi} pièces</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" /> 
          Louer un Stand
        </h2>
        <p className="text-muted-foreground">Choisissez parmi les emplacements disponibles pour exposer lors de l'événement.</p>
      </div>

      {userProfile?.user_type === 'organizer' && user?.id === event?.organizer_id && allRentals.length > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Building className="w-5 h-5" />
                  Réservations ({allRentals.length})
                </CardTitle>
                <CardDescription>
                  Liste des entreprises ayant réservé un stand
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAllRentals(!showAllRentals)}
              >
                {showAllRentals ? 'Masquer' : 'Afficher'}
              </Button>
            </div>
          </CardHeader>
          {showAllRentals && (
            <CardContent>
              <div className="space-y-4">
                {allRentals.map((rental) => (
                  <div key={rental.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-lg">Stand {rental.stand_number}</div>
                          <Badge variant="outline" className="font-medium">{rental.stand_types?.name}</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Entreprise</div>
                            <div className="font-medium text-base">{rental.company_name}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Contact</div>
                            <div className="font-medium text-base">{rental.contact_person}</div>
                            <div className="text-sm text-muted-foreground">{rental.contact_email}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Téléphone</div>
                            <div className="font-medium text-base">{rental.contact_phone || rental.profiles?.phone_number || 'N/A'}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Nom complet</div>
                            <div className="font-medium text-base">{rental.profiles?.full_name || rental.contact_person}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right sm:text-left">
                        <div className="text-sm text-muted-foreground">Prix payé</div>
                        <div className="text-xl font-bold text-primary">{rental.rental_amount_pi} pièces</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {!isUnlocked ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Info className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Veuillez débloquer l'événement pour voir les stands disponibles.</p>
          </CardContent>
        </Card>
      ) : standTypes.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Aucun stand n'est disponible à la location pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {standTypes.map((type, index) => {
            const available = type.quantity_available - (type.quantity_rented || 0);
            const isSoldOut = available <= 0;
            const colors = STAND_COLORS[index % STAND_COLORS.length];

            return (
              <Card key={type.id} className={`${colors.border} ${colors.bg} flex flex-col h-full ${isSoldOut || isClosed ? 'opacity-70' : 'hover:shadow-lg transition-all duration-300 hover:scale-[1.02]'}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className={`text-lg font-bold ${colors.text}`}>{type.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1 text-gray-600">
                        <Layout className="w-3 h-3" /> {type.size}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={isClosed ? "outline" : isSoldOut ? "destructive" : "default"}
                      className="font-medium"
                    >
                      {isClosed ? 'TERMINÉ' : isSoldOut ? 'COMPLET' : `${available} dispo.`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{type.description}</p>
                  
                  {type.amenities && Object.keys(type.amenities).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(type.amenities).filter(([,v]) => v).map(([k]) => (
                        <Badge key={k} variant="outline" className="text-xs bg-white/80 dark:bg-gray-800">
                          {k.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t pt-4 bg-white/70 dark:bg-gray-900/30">
                  <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Prix de location</span>
                      <span className="text-xl font-bold text-primary">{type.calculated_price_pi} pièces</span>
                    </div>
                    
                    {isClosed ? (
                      <Button disabled variant="outline" size="sm" className="w-full sm:w-auto">
                        <Lock className="w-4 h-4 mr-2" /> Événement Terminé
                      </Button>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            disabled={isSoldOut} 
                            onClick={() => setRentingType(type)}
                            className="w-full sm:w-auto font-medium"
                          >
                            {isSoldOut ? 'Indisponible' : 'Réserver'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Réserver le stand : {type.name}</DialogTitle>
                            <DialogDescription className="text-base">
                              Remplissez les informations de votre entreprise pour valider la location.
                              <div className="mt-2 font-bold text-primary text-lg">
                                Coût : {type.calculated_price_pi} pièces
                              </div>
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="company" className="font-medium">Nom de l'entreprise / Marque *</Label>
                              <Input 
                                id="company" 
                                value={formData.companyName}
                                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                                placeholder="Ex: Ma Boutique Bio"
                                className="h-11"
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="contact" className="font-medium">Personne à contacter *</Label>
                                <Input 
                                  id="contact" 
                                  value={formData.contactPerson}
                                  onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                                  placeholder="Nom Prénom"
                                  className="h-11"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="phone" className="font-medium">Téléphone *</Label>
                                <Input 
                                  id="phone" 
                                  value={formData.phone}
                                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                  placeholder="+225..."
                                  className="h-11"
                                />
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="email" className="font-medium">Email *</Label>
                              <Input 
                                id="email" 
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="h-11"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="desc" className="font-medium">Activité / Produits exposés</Label>
                              <Textarea 
                                id="desc" 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Décrivez brièvement ce que vous allez vendre ou exposer..."
                                rows={3}
                              />
                            </div>
                          </div>

                          <DialogFooter className="flex flex-col gap-3">
                            <Button 
                              onClick={handleRentStand} 
                              disabled={isRenting || !formData.companyName || !formData.contactPerson || !formData.phone}
                              className="w-full h-12 text-base font-medium"
                            >
                              {isRenting ? (
                                <>
                                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                  Traitement en cours...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-5 w-5" />
                                  Confirmer la réservation ({type.calculated_price_pi} pièces)
                                </>
                              )}
                            </Button>
                            
                            <div className="text-center text-sm text-muted-foreground">
                              Pas assez de pièces ?{' '}
                              <Button 
                                variant="link" 
                                className="p-0 h-auto font-medium text-primary" 
                                onClick={handleBuyCoins}
                              >
                                Acheter des pièces
                              </Button>
                            </div>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
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