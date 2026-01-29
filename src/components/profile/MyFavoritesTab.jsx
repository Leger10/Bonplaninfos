import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Heart, Calendar, MapPin, ArrowRight, XCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import BookmarkButton from '@/components/common/BookmarkButton';

const MyFavoritesTab = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchFavorites();
        }
    }, [user]);

    const fetchFavorites = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('event_bookmarks')
                .select(`
                    id,
                    created_at,
                    event:events (
                        id,
                        title,
                        description,
                        cover_image,
                        event_start_at,
                        city,
                        country,
                        category:event_categories(name, color_hex)
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFavorites(data || []);
        } catch (error) {
            console.error("Error fetching favorites:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = (eventId) => {
        setFavorites(prev => prev.filter(f => f.event.id !== eventId));
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Heart className="w-6 h-6 text-red-500 fill-red-500" /> Mes Favoris
                    </h2>
                    <p className="text-muted-foreground">
                        Retrouvez ici tous les événements que vous avez aimés ({favorites.length})
                    </p>
                </div>
            </div>

            {favorites.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                            <Heart className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Aucun favori pour le moment</h3>
                        <p className="text-muted-foreground max-w-sm mb-6">
                            Explorez les événements et cliquez sur le cœur pour les ajouter à votre liste de favoris.
                        </p>
                        <Button onClick={() => navigate('/events')}>
                            Découvrir des événements
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((fav) => (
                        <Card key={fav.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500">
                            <div className="relative h-40 overflow-hidden">
                                <img 
                                    src={fav.event.cover_image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30"} 
                                    alt={fav.event.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute top-2 right-2">
                                    <BookmarkButton 
                                        eventId={fav.event.id} 
                                        initialState={true} 
                                        onToggle={(newState) => !newState && handleRemove(fav.event.id)}
                                        className="bg-white/90 backdrop-blur-sm shadow-sm"
                                    />
                                </div>
                                {fav.event.category && (
                                    <div className="absolute top-2 left-2">
                                        <Badge className="bg-black/60 backdrop-blur-sm text-white hover:bg-black/70 border-0">
                                            {fav.event.category.name}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            <CardContent className="p-4">
                                <div className="mb-3">
                                    <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                                        {fav.event.title}
                                    </h3>
                                    <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
                                        <Calendar className="w-3 h-3" />
                                        <span>{format(new Date(fav.event.event_start_at), 'dd MMM yyyy', { locale: fr })}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
                                        <MapPin className="w-3 h-3" />
                                        <span>{fav.event.city}, {fav.event.country}</span>
                                    </div>
                                </div>
                                <Button 
                                    className="w-full mt-2 group-hover:bg-primary group-hover:text-white transition-colors" 
                                    variant="secondary"
                                    onClick={() => navigate(`/event/${fav.event.id}`)}
                                >
                                    Voir détails <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyFavoritesTab;