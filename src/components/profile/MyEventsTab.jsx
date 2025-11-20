import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Loader2, Plus } from 'lucide-react';
import EventCard from '@/components/EventCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const MyEventsTab = ({ userProfile, userEvents, loadingEvents }) => {
  const navigate = useNavigate();
  const canCreateEvent = userProfile && (userProfile.user_type === 'organizer' || userProfile.user_type === 'admin' || userProfile.user_type === 'super_admin');

  if (loadingEvents) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {canCreateEvent && (
        <div className="mb-6 text-right">
          <Button
            onClick={() => navigate('/create-event')}
            className="gradient-gold text-background hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" /> Créer un nouvel événement
          </Button>
        </div>
      )}

      {userEvents && userEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onClick={() => navigate(`/event/${event.id}`)}
              isUnlocked={true}
            />
          ))}
        </div>
      ) : (
        <Card className="glass-effect border-primary/20">
          <CardContent className="p-8 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              Aucun événement créé
            </h3>
            <p className="text-muted-foreground mb-6">
              {canCreateEvent ? 'Créez votre premier événement pour le voir apparaître ici.' : 'Vous n\'avez pas encore créé d\'événement.'}
            </p>
            {canCreateEvent && (
              <Button
                onClick={() => navigate('/create-event')}
                className="gradient-gold text-background hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" /> Créer un événement
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyEventsTab;