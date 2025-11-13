import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gift, Ticket, Users, Clock, Loader2, Coins, Plus, Minus, Info, Award, Star, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import WalletInfoModal from '@/components/WalletInfoModal';
import { useNavigate } from 'react-router-dom';

const Countdown = ({ toDate }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isOver, setIsOver] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const end = new Date(toDate);
            const diff = end - now;

            if (diff <= 0) {
                setIsOver(true);
                clearInterval(interval);
                return;
            }

            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((diff / 1000 / 60) % 60),
                seconds: Math.floor((diff / 1000) % 60),
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [toDate]);
    
    if (isOver) return <p className="text-xl font-bold text-destructive">Tirage terminé !</p>;

    return (
        <div className="flex justify-center space-x-2 sm:space-x-4">
            {Object.entries(timeLeft).map(([unit, value]) => (
                <div key={unit} className="text-center p-2 rounded-lg bg-muted/50 w-16 sm:w-20">
                    <p className="text-2xl sm:text-3xl font-bold">{String(value).padStart(2, '0')}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{unit}</p>
                </div>
            ))}
        </div>
    );
};

const ParticipantView = ({ raffleData, onPurchaseSuccess, eventId }) => {
    const { user } = useAuth();
    const { forceRefreshUserProfile, adminConfig } = useData();
    const [ticketQuantity, setTicketQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const [myTickets, setMyTickets] = useState([]);
    const [showWalletInfo, setShowWalletInfo] = useState(false);
    const navigate = useNavigate();
    const [confirmation, setConfirmation] = useState({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null });

    useEffect(() => {
        const fetchMyTickets = async () => {
            if (!user) return;
            const { data, error } = await supabase
                .from('raffle_tickets')
                .select('id, ticket_number')
                .eq('raffle_id', raffleData.id)
                .eq('user_id', user.id);
            if (error) console.error("Error fetching tickets:", error);
            else setMyTickets(data);
        };
        fetchMyTickets();
    }, [user, raffleData.id, onPurchaseSuccess]);

    const handlePurchaseConfirmation = () => {
        const totalCostPi = raffleData.calculated_price_pi * ticketQuantity;
        const totalCostFcfa = raffleData.base_price * ticketQuantity;
        setConfirmation({
            isOpen: true,
            cost: totalCostPi,
            costFcfa: totalCostFcfa,
            onConfirm: handlePurchase,
        });
    };

    const handlePurchase = async () => {
        setConfirmation({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null });
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('participate_in_raffle', {
                p_event_id: eventId,
                p_user_id: user.id,
                p_ticket_quantity: ticketQuantity,
            });

            if (error) throw error;
            
            if (data.success) {
                toast({ 
                    title: "Achat réussi !", 
                    description: `Vous avez acheté ${ticketQuantity} ticket(s).`
                });
                onPurchaseSuccess();
                forceRefreshUserProfile();
                setTicketQuantity(1);
            } else {
                toast({ title: "Erreur d'achat", description: data.message, variant: "destructive" });
                if (data.message.includes('Solde')) {
                    setShowWalletInfo(true);
                }
            }
        } catch(error) {
            toast({ title: "Erreur d'achat", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    const ticketsSold = raffleData.tickets_sold || 0;
    const progress = (ticketsSold / raffleData.total_tickets) * 100;
    const canBuy = new Date() < new Date(raffleData.draw_date) && !raffleData.is_drawn;

    return (
        <>
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle>Participer au Tirage</CardTitle>
                    <CardDescription>Prix du ticket: {raffleData.calculated_price_pi}π ({raffleData.base_price.toLocaleString()} FCFA)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Temps restant avant le tirage</p>
                        <Countdown toDate={raffleData.draw_date} />
                    </div>
                    <div>
                        <Progress value={progress} className="w-full" />
                        <p className="text-center text-sm mt-2">{ticketsSold} / {raffleData.total_tickets} tickets vendus</p>
                    </div>
                    {canBuy ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => setTicketQuantity(q => Math.max(1, q - 1))}><Minus className="w-4 h-4" /></Button>
                                <Input type="number" value={ticketQuantity} readOnly className="w-20 text-center font-bold text-lg" />
                                <Button variant="outline" size="icon" onClick={() => setTicketQuantity(q => q + 1)}><Plus className="w-4 h-4" /></Button>
                            </div>
                            <Button onClick={handlePurchaseConfirmation} disabled={loading} size="lg" className="w-full">
                                {loading ? <Loader2 className="animate-spin" /> : 
                                <><Ticket className="w-5 h-5 mr-2" /> Acheter</>}
                            </Button>
                        </div>
                    ) : <p className="text-center font-bold text-destructive">La vente de tickets est terminée.</p>}
                    
                    {myTickets.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2">Mes Tickets:</h4>
                            <div className="flex flex-wrap gap-2">
                                {myTickets.map(t => <Badge key={t.id} variant="secondary">N°{t.ticket_number}</Badge>)}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <WalletInfoModal isOpen={showWalletInfo} onClose={() => setShowWalletInfo(false)} onProceed={() => {setShowWalletInfo(false); navigate('/packs');}} />
            <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null })}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer votre achat ?</AlertDialogTitle>
                   <AlertDialogDescription>
                    <div className="flex flex-col items-center justify-center text-center p-4">
                        <Coins className="w-12 h-12 text-primary mb-4" />
                        <p className="text-lg">
                            Vous êtes sur le point de dépenser <strong className="text-foreground">{confirmation.cost}π</strong> ({confirmation.costFcfa?.toLocaleString('fr-FR')} FCFA).
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
                    {loading ? <Loader2 className="animate-spin" /> : 'Confirmer et Payer'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const OwnerView = ({ raffleData, onRefresh }) => {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const fetchParticipants = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('raffle_tickets')
                .select('id, ticket_number, user:profiles(id, full_name, email)')
                .eq('raffle_id', raffleData.id)
                .order('purchased_at');
            if (error) console.error("Error fetching tickets:", error);
            else setParticipants(data);
            setLoading(false);
        };
        fetchParticipants();
    }, [raffleData.id]);
    
    const handleDrawWinner = async () => {
        setIsDrawing(true);
        try {
            const { data, error } = await supabase.rpc('draw_raffle_winner', { raffle_id_param: raffleData.id });
            if (error) throw error;
            if(data.success) {
                toast({ title: "Tirage effectué !", description: `Le gagnant est le ticket n°${data.winning_ticket}.`});
                onRefresh();
            } else {
                toast({ title: "Erreur de tirage", description: data.message, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: "Erreur", description: error.message, variant: 'destructive' });
        } finally {
            setIsDrawing(false);
        }
    };

    const ticketsSold = raffleData.tickets_sold || 0;
    const totalRevenue = ticketsSold * raffleData.calculated_price_pi;

    return (
        <Card className="glass-effect border-primary/50">
            <CardHeader>
                <CardTitle>Tableau de bord de la Tombola</CardTitle>
                <CardDescription>Gérez votre tirage au sort.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-2xl font-bold">{ticketsSold}</p>
                        <p className="text-sm text-muted-foreground">Tickets Vendus</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-2xl font-bold flex items-center justify-center gap-1">{totalRevenue} <Coins className="w-5 h-5"/></p>
                        <p className="text-sm text-muted-foreground">Revenu Brut</p>
                    </div>
                </div>
                
                {raffleData.is_drawn ? (
                    <div className="text-center p-4 bg-green-500/20 rounded-lg">
                        <h4 className="font-bold text-green-300">Gagnant Tiré !</h4>
                        <p>Ticket N°: <span className="font-mono">{raffleData.winning_ticket_number}</span></p>
                    </div>
                ) : (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button disabled={isDrawing || new Date() < new Date(raffleData.draw_date)} className="w-full">
                                {isDrawing ? <Loader2 className="animate-spin" /> : 'Lancer le tirage'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer le tirage ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Cette action est irréversible. Un gagnant sera sélectionné au hasard parmi tous les tickets vendus.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDrawWinner}>Confirmer et Tirer</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                <div>
                    <h4 className="font-semibold mb-2">Participants ({participants.length})</h4>
                    {loading ? <Loader2 className="animate-spin"/> : (
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {participants.map(p => (
                                <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded">
                                    <span>{p.user?.full_name || 'Anonyme'}</span>
                                    <Badge variant="secondary">N°{p.ticket_number}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const RaffleInterface = ({ raffleData, isUnlocked, isOwner, onRefresh, eventId }) => {
    const prizeColors = ['bg-yellow-400/20 text-yellow-300', 'bg-gray-400/20 text-gray-300', 'bg-orange-400/20 text-orange-300'];
    const prizeIcons = [<Trophy className="text-yellow-400" />, <Award className="text-gray-300" />, <Gift className="text-orange-400" />];

    if (!isUnlocked) return null;
    
    return (
        <div className="mt-6 space-y-6">
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gift className="text-primary"/> Lots à gagner</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {raffleData.prizes.map((prize, index) => (
                            <li key={prize.rank} className={`flex items-start gap-4 p-3 rounded-lg ${prizeColors[index % prizeColors.length]}`}>
                                <div className="p-2 bg-background/30 rounded-full">{prizeIcons[index % prizeIcons.length]}</div>
                                <div>
                                    <p className="font-semibold">Rang {prize.rank}: {prize.description}</p>
                                    {prize.value_fcfa > 0 && <p className="text-sm opacity-80">Valeur: {prize.value_fcfa.toLocaleString()} FCFA</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
            
            {isOwner ? (
                <OwnerView raffleData={raffleData} onRefresh={onRefresh} />
            ) : (
                <ParticipantView raffleData={raffleData} onPurchaseSuccess={onRefresh} eventId={eventId} />
            )}
        </div>
    );
};

export default RaffleInterface;