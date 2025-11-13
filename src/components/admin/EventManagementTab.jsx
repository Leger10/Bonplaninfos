import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

const EventManagementTab = ({ events }) => {
  const navigate = useNavigate();

  const handleEventAction = (eventId, action) => {
    toast({
      title: "🚧 Cette fonctionnalité n'est pas encore implémentée—mais ne vous inquiétez pas ! Vous pouvez la demander dans votre prochaine requête ! 🚀",
    });
  };

  return (
    <Card className="glass-effect border-primary/20 shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-white">Gestion des événements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.slice(0, 10).map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-4 bg-background/50 rounded-xl shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium text-white">{event.title}</h4>
                  {event.isSponsored && (
                    <Badge className="bg-[#C9A227] text-[#0B0B0D] text-xs">
                      Sponsorisé
                    </Badge>
                  )}
                  <Badge className={`${event.status === 'published' ? 'bg-green-500' : 'bg-gray-500'} text-white text-xs`}>
                    {event.status === 'published' ? 'Publié' : 'Brouillon'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-400 mb-1">{event.description}</p>
                <p className="text-xs text-gray-500">
                  {event.city} • {new Date(event.startAt).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="text-gray-300 hover:text-blue-400"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEventAction(event.id, 'edit')}
                  className="text-gray-300 hover:text-[#C9A227]"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEventAction(event.id, 'delete')}
                  className="text-gray-300 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventManagementTab;