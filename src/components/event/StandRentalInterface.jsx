import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Store, Info, Coins } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import WalletInfoModal from '@/components/WalletInfoModal';
import { useNavigate } from 'react-router-dom';

const StandCard = ({ stand, onRent, index }) => {
  const isAvailable = stand.quantity_available > stand.quantity_rented;
  const badgeColors = ['bg-blue-500/20 text-blue-300', 'bg-purple-500/20 text-purple-300', 'bg-teal-500/20 text-teal-300', 'bg-pink-500/20 text-pink-300'];
  const badgeColor = badgeColors[index % badgeColors.length];
  const cardBorderColor = ['border-blue-500/50', 'border-purple-500/50', 'border-teal-500/50', 'border-pink-500/50'][index % badgeColors.length];

  return (
    <Card className={`transition-all ${isAvailable ? 'bg-card' : 'bg-muted/50'} ${cardBorderColor} border-l-4`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${badgeColor.split(' ')[0]}`}></div>{stand.name}</CardTitle>
        <CardDescription>{stand.size} - {stand.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Badge variant="secondary" className={`${badgeColor}`}>{stand.base_price.toLocaleString()} FCFA ({stand.calculated_price_pi}π)</Badge>
          <Badge variant={isAvailable ? 'success' : 'destructive'}>
            {stand.quantity_available - stand.quantity_rented} / {stand.quantity_available} dispo.
          </Badge>
        </div>
        <DialogTrigger asChild>
          <Button className="w-full" disabled={!isAvailable} onClick={() => onRent(stand)}>
            Réserver ce Stand
          </Button>
        </DialogTrigger>
      </CardContent>
    </Card>
  );
};

const RentalForm = ({ stand, event, onRentalSuccess }) => {
  const { user } = useAuth();
  const { forceRefreshUserProfile } = useData();
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    contact_email: user?.email || '',
    contact_phone: '',
    business_description: ''
  });
  const [loading, setLoading] = useState(false);
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState({ isOpen: false, onConfirm: null });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };
  
  const handleConfirmation = (e) => {
    e.preventDefault();
    setConfirmation({ isOpen: true, onConfirm: () => handleSubmit() });
  };

  const handleSubmit = async () => {
    setConfirmation({ isOpen: false, onConfirm: null });
    setLoading(true);

    try {
        const { data, error } = await supabase.rpc('rent_stand', {
            p_event_id: event.id,
            p_user_id: user.id,
            p_stand_type_id: stand.id,
            p_company_name: formData.company_name,
            p_contact_person: formData.contact_person,
            p_contact_email: formData.contact_email,
            p_contact_phone: formData.contact_phone,
            p_business_description: formData.business_description
        });

        if (error) throw error;

        if (data.success) {
            toast({ title: "Réservation confirmée!", description: `Votre stand ${data.stand_number} a été réservé.` });
            forceRefreshUserProfile();
            onRentalSuccess();
        } else {
            toast({ title: "Erreur de réservation", description: data.message, variant: "destructive" });
            if (data.message.includes('Solde')) {
                setShowWalletInfo(true);
            }
        }
    } catch (error) {
        toast({ title: "Erreur de réservation", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
        <form onSubmit={handleConfirmation} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1"><Label htmlFor="company_name">Nom de l'entreprise</Label><Input id="company_name" value={formData.company_name} onChange={handleChange} required /></div>
                <div className="space-y-1"><Label htmlFor="contact_person">Personne à contacter</Label><Input id="contact_person" value={formData.contact_person} onChange={handleChange} required /></div>
                <div className="space-y-1"><Label htmlFor="contact_email">Email</Label><Input id="contact_email" type="email" value={formData.contact_email} onChange={handleChange} required /></div>
                <div className="space-y-1"><Label htmlFor="contact_phone">Téléphone</Label><Input id="contact_phone" value={formData.contact_phone} onChange={handleChange} required /></div>
            </div>
            <div className="space-y-1"><Label htmlFor="business_description">Description de votre activité</Label><Textarea id="business_description" value={formData.business_description} onChange={handleChange} /></div>
            <DialogFooter>
                <Button type="submit" disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmer</Button>
            </DialogFooter>
        </form>
        <WalletInfoModal isOpen={showWalletInfo} onClose={() => setShowWalletInfo(false)} onProceed={() => {setShowWalletInfo(false); navigate('/packs');}} />
        <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, onConfirm: null })}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la réservation ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        <div className="flex flex-col items-center justify-center text-center p-4">
                            <Coins className="w-12 h-12 text-primary mb-4" />
                            <p className="text-lg">
                                Cette action vous coûtera <strong className="text-foreground">{stand.calculated_price_pi}π</strong> ({stand.base_price?.toLocaleString('fr-FR')} FCFA).
                            </p>
                            <div className="mt-4 text-xs text-muted-foreground p-2 bg-muted rounded flex items-start gap-2">
                                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>Votre action permet aux organisateurs de créer plus de contenu. Vous pouvez aussi devenir organisateur en postant des contenus pour bénéficier de la rémunération sur BonPlanInfos.</span>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmation.onConfirm} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : "Confirmer et Payer"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
};

const OwnerView = ({ eventId, standEventData }) => {
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRentals = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('stand_rentals')
                .select('*, user:profiles(full_name, email), stand_type:stand_types(name)')
                .eq('stand_event_id', standEventData.id);
            if (error) {
                toast({ title: 'Erreur', description: 'Impossible de charger les locations.', variant: 'destructive' });
            } else {
                setRentals(data);
            }
            setLoading(false);
        };
        fetchRentals();
    }, [standEventData.id]);
    
    if (loading) return <Loader2 className="animate-spin" />;

    return (
        <Card className="glass-effect">
            <CardHeader>
                <CardTitle>Gestion des Stands</CardTitle>
                <CardDescription>Suivez les réservations de votre salon.</CardDescription>
            </CardHeader>
            <CardContent>
                {rentals.length === 0 ? <p>Aucune réservation pour le moment.</p> : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {rentals.map(rental => (
                            <div key={rental.id} className="p-3 bg-muted/50 rounded-lg">
                                <p className="font-bold">{rental.company_name}</p>
                                <p className="text-sm">Stand: {rental.stand_type.name} - {rental.stand_number || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{rental.contact_person} ({rental.contact_email})</p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const StandRentalInterface = ({ event, standEventData, isUnlocked, isOwner, onRefresh }) => {
  const [selectedStand, setSelectedStand] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRentClick = (stand) => {
    setSelectedStand(stand);
    setDialogOpen(true);
  };
  
  const onRentalSuccess = () => {
      setDialogOpen(false);
      onRefresh();
  }

  if (!isUnlocked) return null;
  
  if (isOwner) {
      return <OwnerView eventId={event.id} standEventData={standEventData} />
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="mt-6 space-y-6">
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Store className="text-primary"/> Stands Disponibles</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {standEventData.stand_types.map((stand, index) => (
                        <StandCard key={stand.id} stand={stand} onRent={handleRentClick} index={index} />
                    ))}
                </CardContent>
            </Card>
        </div>

        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
            <DialogTitle>Réserver le stand "{selectedStand?.name}"</DialogTitle>
            <DialogDescription>
                Remplissez vos informations pour finaliser la réservation.
            </DialogDescription>
            </DialogHeader>
            {selectedStand && <RentalForm stand={selectedStand} event={event} onRentalSuccess={onRentalSuccess}/>}
        </DialogContent>
    </Dialog>
  );
};

export default StandRentalInterface;