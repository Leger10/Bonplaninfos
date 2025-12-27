import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const BookmarkButton = ({ eventId, initialState = false, onToggle, variant = "default", size = "icon", className, showCount = false, initialCount = 0 }) => {
    const { user } = useAuth();
    const [isBookmarked, setIsBookmarked] = useState(initialState);
    const [count, setCount] = useState(initialCount);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user && eventId) {
            checkBookmarkStatus();
        }
    }, [user, eventId]);

    const checkBookmarkStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('event_bookmarks')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (!error) {
                setIsBookmarked(!!data);
            }
        } catch (error) {
            console.error("Error checking bookmark status:", error);
        }
    };

    const handleToggle = async (e) => {
        e.preventDefault(); // Prevent parent link clicks
        e.stopPropagation();

        if (!user) {
            toast({
                title: "Connexion requise",
                description: "Veuillez vous connecter pour ajouter cet événement aux favoris.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        // Optimistic update
        const previousState = isBookmarked;
        const previousCount = count;
        setIsBookmarked(!isBookmarked);
        setCount(prev => isBookmarked ? prev - 1 : prev + 1);

        try {
            const { data, error } = await supabase.rpc('toggle_event_bookmark', {
                p_event_id: eventId,
                p_user_id: user.id
            });

            if (error) throw error;

            if (data.success) {
                setIsBookmarked(data.is_bookmarked);
                setCount(data.count); // Sync with server count
                
                toast({
                    title: data.is_bookmarked ? "Ajouté aux favoris" : "Retiré des favoris",
                    description: data.is_bookmarked 
                        ? "L'événement a été ajouté à votre liste de favoris." 
                        : "L'événement a été retiré de votre liste de favoris.",
                    variant: "success" // Using success variant defined in your toast system
                });

                if (onToggle) onToggle(data.is_bookmarked);
            }
        } catch (error) {
            console.error("Error toggling bookmark:", error);
            // Revert optimistic update
            setIsBookmarked(previousState);
            setCount(previousCount);
            toast({
                title: "Erreur",
                description: "Impossible de modifier les favoris. Veuillez réessayer.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant={variant === "ghost" ? "ghost" : "outline"}
            size={size}
            className={cn(
                "transition-all duration-300 gap-2",
                isBookmarked 
                    ? "text-red-500 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-600" 
                    : "text-muted-foreground hover:text-red-500 hover:bg-red-50/50",
                className
            )}
            onClick={handleToggle}
            disabled={isLoading}
            title={isBookmarked ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
            <Heart className={cn("w-5 h-5 transition-transform", isBookmarked && "fill-current scale-110")} />
            {showCount && <span className="text-xs font-semibold">{count}</span>}
        </Button>
    );
};

export default BookmarkButton;