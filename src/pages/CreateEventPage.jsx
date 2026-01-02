import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CalendarDays, 
  Ticket, 
  Vote, 
  Store, 
  Megaphone, 
  ArrowRight,
  Gift,
  ShieldCheck
} from 'lucide-react';

const CreateEventPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useData();

  // Roles allowed to see Simple Event (Broadcast)
  // Simple events are for platform-wide announcements or basic info
  const ALLOWED_ROLES_SIMPLE_EVENT = ['super_admin', 'admin', 'secretary'];
  
  const isAllowedToCreateSimpleEvent = userProfile && (
    ALLOWED_ROLES_SIMPLE_EVENT.includes(userProfile.user_type) || 
    userProfile.admin_type === 'secretary' ||
    userProfile.appointed_by_super_admin
  );

  const eventTypes = [
    {
      id: 'simple',
      title: 'Annonce / Info',
      description: 'Publiez une information, une actualité ou un événement simple sans billetterie. Idéal pour informer la communauté.',
      icon: Megaphone,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-blue-600 to-indigo-700',
      borderColor: 'hover:border-blue-500/50',
      route: '/create-simple-event',
      restricted: true
    },
    {
      id: 'ticketing',
      title: 'Billetterie',
      description: 'Créez un événement avec vente de billets (QR Code). Gérez les entrées, les types de billets et les revenus.',
      icon: Ticket,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-purple-600 to-pink-700',
      borderColor: 'hover:border-purple-500/50',
      route: '/create-ticketing-event',
      restricted: false
    },
    {
      id: 'raffle',
      title: 'Tombola',
      description: 'Organisez une tombola numérique sécurisée. Vendez des tickets et effectuez des tirages au sort automatiques.',
      icon: Gift,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-emerald-600 to-teal-700',
      borderColor: 'hover:border-emerald-500/50',
      route: '/create-raffle-event',
      restricted: false
    },
    {
      id: 'vote',
      title: 'Concours / Vote',
      description: 'Lancez un concours ou une élection. Les participants peuvent voter pour leurs candidats favoris.',
      icon: Vote,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-orange-600 to-red-700',
      borderColor: 'hover:border-orange-500/50',
      route: '/create-voting-event',
      restricted: false
    },
    {
      id: 'stand',
      title: 'Location de Stands',
      description: 'Vous organisez une foire ou un salon ? Gérez la location de vos espaces et stands exposants.',
      icon: Store,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-cyan-600 to-blue-700',
      borderColor: 'hover:border-pink-500/50',
      route: '/create-stand-event',
      restricted: false
    },
    {
      id: 'promotion',
      title: 'Campagne Publicitaire',
      description: 'Boostez votre visibilité en créant une campagne promotionnelle ciblée sur l\'application.',
      icon: CalendarDays, 
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-amber-600 to-orange-700',
      borderColor: 'hover:border-amber-500/50',
      route: '/create-promotion',
      restricted: false
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
      <Helmet>
        <title>Créer un événement - BonPlanInfos</title>
      </Helmet>

      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Que souhaitez-vous créer ?</h1>
          <p className="text-muted-foreground text-lg">
            Choisissez le type d'événement ou d'activité qui correspond à vos besoins.
          </p>
        </div>

        {/* Updated grid layout to display 2 cards per row on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {eventTypes.map((type) => {
            // Filter out restricted types if user doesn't have permission
            if (type.restricted && !isAllowedToCreateSimpleEvent) {
              return null;
            }

            return (
              <motion.div
                key={type.id}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card 
                  className={`h-full cursor-pointer transition-all border-2 border-transparent ${type.borderColor} hover:shadow-lg ${type.bgColor} text-white`}
                  onClick={() => navigate(type.route)}
                >
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-white/20`}>
                      <type.icon className={`w-7 h-7 ${type.color}`} />
                    </div>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {type.title}
                      {type.restricted && (
                        <ShieldCheck className="w-4 h-4 text-blue-200" title="Réservé Admin" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm mb-4 min-h-[60px] text-gray-200">
                      {type.description}
                    </CardDescription>
                    <Button variant="outline" className="w-full justify-between group hover:bg-white/20 text-white border-white/50">
                      Commencer
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CreateEventPage;