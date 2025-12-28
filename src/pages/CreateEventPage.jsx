import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Vote, Ticket, Gift, Store, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CreateEventPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const eventTypes = [
    {
      type: 'simple',
      title: "Standard & Protégé",
      description: "Événement d'information ou contenu exclusif.",
      icon: FileText,
      path: '/create-simple-event',
      bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
      shadowColor: 'shadow-blue-500/20',
      textColor: 'text-white',
      iconColor: 'text-white',
    },
    {
      type: 'ticketing',
      title: "Billetterie",
      description: "Vente de billets QR code et gestion des entrées.",
      icon: Ticket,
      path: '/create-ticketing-event',
      bgColor: 'bg-gradient-to-br from-red-500 to-red-600',
      shadowColor: 'shadow-red-500/20',
      textColor: 'text-white',
      iconColor: 'text-white',
    },
    {
      type: 'voting',
      title: "Vote & Concours",
      description: "Concours, élections ou sondages interactifs.",
      icon: Vote,
      path: '/create-voting-event',
      bgColor: 'bg-gradient-to-br from-green-500 to-green-600',
      shadowColor: 'shadow-green-500/20',
      textColor: 'text-white',
      iconColor: 'text-white',
    },
    {
      type: 'raffle',
      title: "Tombola",
      description: "Tirage au sort automatique et équitable.",
      icon: Gift,
      path: '/create-raffle-event',
      bgColor: 'bg-gradient-to-br from-purple-500 to-purple-600',
      shadowColor: 'shadow-purple-500/20',
      textColor: 'text-white',
      iconColor: 'text-white',
    },
    {
      type: 'stand_rental',
      title: "Location de Stands",
      description: "Gestion d'espaces exposants pour salons.",
      icon: Store,
      path: '/create-stand-event',
      bgColor: 'bg-gradient-to-br from-teal-500 to-teal-600',
      shadowColor: 'shadow-teal-500/20',
      textColor: 'text-white',
      iconColor: 'text-white',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const cardVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 120, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-background/50">
      <Helmet>
        <title>{t('create_event_page.meta.title') || "Créer un événement | BonPlanInfos"}</title>
        <meta name="description" content={t('create_event_page.meta.description') || "Choisissez le type d'événement que vous souhaitez organiser."} />
      </Helmet>

      <main className="container mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center mb-6 sm:mb-12"
        >
          <div className="flex items-center justify-center w-full relative mb-3 sm:mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="absolute left-0 lg:left-auto lg:-ml-16 h-8 w-8 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent px-8">
              {t('create_event_page.title') || "Créer un événement"}
            </h1>
          </div>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-xl sm:max-w-2xl px-2">
            {t('create_event_page.subtitle') || "Sélectionnez le format qui correspond le mieux à vos besoins."}
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {eventTypes.map((event) => (
            <motion.div key={event.type} variants={cardVariants} className="h-full">
              <Card
                className={`group cursor-pointer h-full overflow-hidden border-0 relative transition-all duration-300 active:scale-[0.98] sm:hover:-translate-y-1 sm:hover:shadow-xl ${event.bgColor} ${event.shadowColor}`}
                onClick={() => navigate(event.path)}
              >
                {/* Decorative circles - reduced opacity on mobile for better text contrast */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/5 sm:bg-white/10 blur-2xl transition-transform duration-500 group-hover:scale-150" />
                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/5 sm:bg-black/10 blur-2xl transition-transform duration-500 group-hover:scale-150" />

                <CardContent className="p-4 sm:p-6 md:p-8 flex flex-row sm:flex-col items-center sm:items-start text-left h-full relative z-10 gap-4 sm:gap-0">
                  <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm sm:mb-6 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <event.icon className={`w-5 h-5 sm:w-8 sm:h-8 ${event.iconColor}`} />
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <h3 className={`font-bold text-base sm:text-xl md:text-2xl mb-1 sm:mb-3 leading-tight ${event.textColor}`}>
                      {event.title}
                    </h3>
                    
                    <p className={`text-white/80 text-xs sm:text-sm md:text-base leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none`}>
                      {event.description}
                    </p>
                  </div>

                  <div className="sm:mt-auto sm:pt-6 w-auto sm:w-full flex items-center justify-end sm:justify-between sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                    <span className="hidden sm:inline-block text-xs font-medium uppercase tracking-wider text-white/80">Commencer</span>
                    <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4 text-white sm:rotate-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 sm:mt-16"
        >
          <Card className="bg-card border-muted shadow-sm">
            <CardContent className="p-4 sm:p-8 flex flex-col md:flex-row items-center gap-4 sm:gap-6 text-center md:text-left">
              <div className="p-3 sm:p-4 rounded-full bg-primary/10 text-primary shrink-0">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div className="flex-grow">
                <h3 className="text-base sm:text-xl font-semibold mb-1 sm:mb-2">{t('create_event_page.help.title') || "Besoin d'aide pour choisir ?"}</h3>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                  {t('create_event_page.help.description') || "Consultez notre guide détaillé pour comprendre les fonctionnalités de chaque type d'événement."}
                </p>
              </div>
              <Button size="sm" onClick={() => navigate('/guide-utilisation')} className="whitespace-nowrap w-full sm:w-auto h-10 sm:h-11">
                <FileText className="w-4 h-4 mr-2" />
                {t('create_event_page.help.button') || "Voir le guide"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default CreateEventPage;