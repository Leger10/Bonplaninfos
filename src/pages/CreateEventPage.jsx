import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Vote, Ticket, Gift, Store, FileText, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CreateEventPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const eventTypes = [
        {
            type: 'simple',
            title: t('create_event_page.types.simple.title'),
            description: t('create_event_page.types.simple.desc'),
            icon: FileText,
            path: '/create-simple-event',
            bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
            textColor: 'text-white',
            iconColor: 'text-white',
        },
        {
            type: 'ticketing',
            title: t('create_event_page.types.ticketing.title'),
            description: t('create_event_page.types.ticketing.desc'),
            icon: Ticket,
            path: '/create-ticketing-event',
            bgColor: 'bg-gradient-to-br from-red-500 to-red-600',
            textColor: 'text-white',
            iconColor: 'text-white',
        },
        {
            type: 'voting',
            title: t('create_event_page.types.voting.title'),
            description: t('create_event_page.types.voting.desc'),
            icon: Vote,
            path: '/create-voting-event',
            bgColor: 'bg-gradient-to-br from-green-500 to-green-600',
            textColor: 'text-white',
            iconColor: 'text-white',
        },
        {
            type: 'raffle',
            title: t('create_event_page.types.raffle.title'),
            description: t('create_event_page.types.raffle.desc'),
            icon: Gift,
            path: '/create-raffle-event',
            bgColor: 'bg-gradient-to-br from-purple-500 to-purple-600',
            textColor: 'text-white',
            iconColor: 'text-white',
        },
        {
            type: 'stand_rental',
            title: t('create_event_page.types.stand.title'),
            description: t('create_event_page.types.stand.desc'),
            icon: Store,
            path: '/create-stand-event',
            bgColor: 'bg-gradient-to-br from-teal-500 to-teal-600',
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
        <div className="min-h-screen bg-background">
            <Helmet>
                <title>{t('create_event_page.meta.title')}</title>
                 <meta name="description" content={t('create_event_page.meta.description')} />
            </Helmet>

            <main className="container mx-auto max-w-4xl px-4 py-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center mb-8"
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="mr-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {t('create_event_page.title')}
                    </h1>
                </motion.div>

                <p className="text-base sm:text-lg text-muted-foreground mb-8">
                    {t('create_event_page.subtitle')}
                </p>

                <motion.div
                    className="grid grid-cols-2 gap-4 sm:gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {eventTypes.map((event) => (
                        <motion.div key={event.type} variants={cardVariants}>
                            <Card
                                className={`cursor-pointer h-full transition-all duration-300 hover:shadow-2xl hover:scale-105 border-0 shadow-lg ${event.bgColor}`}
                                onClick={() => navigate(event.path)}
                            >
                                <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center gap-3">
                                    <div className="p-3 rounded-full bg-white/20">
                                        <event.icon className={`w-7 h-7 sm:w-8 sm:h-8 ${event.iconColor}`} />
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className={`font-semibold text-base sm:text-lg ${event.textColor}`}>
                                            {event.title}
                                        </h3>
                                        <p className={`text-white/90 text-xs sm:text-sm mt-1`}>
                                            {event.description}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-12 p-6 bg-muted/50 rounded-lg border"
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">{t('create_event_page.help.title')}</h3>
                    </div>
                    <p className="text-muted-foreground mb-4 max-w-xl mx-auto">
                        {t('create_event_page.help.description')}
                    </p>
                    <Button variant="outline" onClick={() => navigate('/guide-utilisation')} className="h-11">
                        <FileText className="w-4 h-4 mr-2" />
                        {t('create_event_page.help.button')}
                    </Button>
                </motion.div>
            </main>
        </div>
    );
};

export default CreateEventPage;