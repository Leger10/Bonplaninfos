import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Vote, Ticket, Gift, Store, FileText } from 'lucide-react';

const eventTypes = [
  { 
    type: 'simple', 
    title: 'Événement Simple', 
    description: 'Créez une annonce pour un événement informatif.',
    icon: FileText,
    path: '/create-simple-event',
    color: 'hover:border-gray-500'
  },
  { 
    type: 'ticketing', 
    title: 'Billetterie', 
    description: 'Vendez des billets pour votre concert, spectacle, ou conférence.',
    icon: Ticket,
    path: '/create-ticketing-event',
    color: 'hover:border-blue-500'
  },
  { 
    type: 'voting', 
    title: 'Concours de Vote', 
    description: 'Organisez un concours où la communauté vote pour son favori.',
    icon: Vote,
    path: '/create-voting-event',
    color: 'hover:border-purple-500'
  },
  { 
    type: 'raffle', 
    title: 'Tombola', 
    description: 'Lancez un tirage au sort avec des lots à gagner.',
    icon: Gift,
    path: '/create-raffle-event',
    color: 'hover:border-amber-500'
  },
  { 
    type: 'stand_rental', 
    title: 'Salon / Location de Stands', 
    description: 'Gérez les réservations de stands pour un salon ou une foire.',
    icon: Store,
    path: '/create-stand-event',
    color: 'hover:border-teal-500'
  },
];

const CreateEventPage = () => {
    const navigate = useNavigate();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100,
            },
        },
    };

    return (
        <div className="min-h-screen bg-background">
            <Helmet><title>Créer un Événement - Choisir un Type</title></Helmet>
            <main className="container mx-auto max-w-4xl px-4 py-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                </Button>
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Quel type d'événement souhaitez-vous créer ?</h1>
                    <p className="text-lg text-muted-foreground">Choisissez un modèle pour commencer.</p>
                </div>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {eventTypes.map((event) => (
                        <motion.div key={event.type} variants={itemVariants}>
                            <Card 
                                className={`h-full flex flex-col cursor-pointer transition-all duration-300 border-2 border-transparent ${event.color} bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:scale-105`}
                                onClick={() => navigate(event.path)}
                            >
                                <CardHeader className="flex-row items-center gap-4">
                                    <event.icon className="w-8 h-8 text-primary" />
                                    <CardTitle className="text-xl">{event.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <CardDescription>{event.description}</CardDescription>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </main>
        </div>
    );
};

export default CreateEventPage;