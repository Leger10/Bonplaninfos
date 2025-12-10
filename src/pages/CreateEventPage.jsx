import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Vote, Ticket, Gift, Store, FileText, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CreateEventPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const eventTypes = [
    {
      type: 'simple',
      title: t('create_event_page.types.simple.title') || "Événement Simple",
      description: t('create_event_page.types.simple.desc') || "Créez un événement basique sans options avancées pour informer votre communauté.",
      icon: FileText,
      path: '/create-simple-event',
      bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
      shadowColor: 'shadow-blue-500/20',
      textColor: 'text-white',
      iconColor: 'text-white',
    },
    {
      type: 'ticketing',
      title: t('create_event_page.types.ticketing.title') || "Billetterie",
      description: t('create_event_page.types.ticketing.desc') || "Vendez des billets (QR code), gérez les entrées et suivez vos ventes en temps réel.",
      icon: Ticket,
      path: '/create-ticketing-event',
      bgColor: 'bg-gradient-to-br from-red-500 to-red-600',
      shadowColor: 'shadow-red-500/20',
      textColor: 'text-white',
      iconColor: 'text-white',
    },
    {
      type: 'voting',
      title: t('create_event_page.types.voting.title') || "Vote & Compétition",
      description: t('create_event_page.types.voting.desc') || "Organisez des concours, élections ou sondages payants ou gratuits.",
      icon: Vote,
      path: '/create-voting-event',
      bgColor: 'bg-gradient-to-br from-green-500 to-green-600',
      shadowColor: 'shadow-green-500/20',
      textColor: 'text-white',
      iconColor: 'text-white',
    },
    {
      type: 'raffle',
      title: t('create_event_page.types.raffle.title') || "Tombola",
      description: t('create_event_page.types.raffle.desc') || "Lancez une tombola avec tirage au sort automatique et équitable.",
      icon: Gift,
      path: '/create-raffle-event',
      bgColor: 'bg-gradient-to-br from-purple-500 to-purple-600',
      shadowColor: 'shadow-purple-500/20',
      textColor: 'text-white',
      iconColor: 'text-white',
    },
    {
      type: 'stand_rental',
      title: t('create_event_page.types.stand.title') || "Location de Stands",
      description: t('create_event_page.types.stand.desc') || "Gérez la location d'espaces pour vos exposants lors de foires ou salons.",
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
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-background/50">
      <Helmet>
        <title>{t('create_event_page.meta.title') || "Créer un événement | BonPlanInfos"}</title>
        <meta name="description" content={t('create_event_page.meta.description') || "Choisissez le type d'événement que vous souhaitez organiser."} />
      </Helmet>

      <main className="container mx-auto max-w-6xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center mb-12"
        >
          <div className="flex items-center justify-center w-full relative mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="absolute left-0 lg:left-auto lg:-ml-16"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('create_event_page.title') || "Créer un événement"}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {t('create_event_page.subtitle') || "Sélectionnez le format qui correspond le mieux à vos besoins parmi nos 5 options disponibles."}
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {eventTypes.map((event) => (
            <motion.div key={event.type} variants={cardVariants} className="h-full">
              <Card
                className={`group cursor-pointer h-full overflow-hidden border-0 relative transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${event.bgColor} ${event.shadowColor}`}
                onClick={() => navigate(event.path)}
              >
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-white/10 blur-2xl transition-transform duration-500 group-hover:scale-150" />
                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-20 h-20 rounded-full bg-black/10 blur-2xl transition-transform duration-500 group-hover:scale-150" />

                <CardContent className="p-6 sm:p-8 flex flex-col items-start text-left h-full relative z-10">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <event.icon className={`w-8 h-8 ${event.iconColor}`} />
                  </div>
                  
                  <h3 className={`font-bold text-xl sm:text-2xl mb-3 ${event.textColor}`}>
                    {event.title}
                  </h3>
                  
                  <p className={`text-white/90 text-sm sm:text-base leading-relaxed`}>
                    {event.description}
                  </p>

                  <div className="mt-auto pt-6 w-full flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-xs font-medium uppercase tracking-wider text-white/80">Commencer</span>
                    <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16"
        >
          <Card className="bg-card border-muted">
            <CardContent className="p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="flex-grow">
                <h3 className="text-xl font-semibold mb-2">{t('create_event_page.help.title') || "Besoin d'aide pour choisir ?"}</h3>
                <p className="text-muted-foreground">
                  {t('create_event_page.help.description') || "Consultez notre guide détaillé pour comprendre les fonctionnalités de chaque type d'événement et maximiser votre impact."}
                </p>
              </div>
              <Button size="lg" onClick={() => navigate('/guide-utilisation')} className="whitespace-nowrap">
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