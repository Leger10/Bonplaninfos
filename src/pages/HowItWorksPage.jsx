import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Upload, Share2, Coins, Landmark, Zap } from 'lucide-react';

const HowItWorksPage = () => {
    const navigate = useNavigate();

    const steps = [
        { icon: <Users className="w-8 h-8" />, title: "1. Créez votre compte", description: "L'inscription est rapide, gratuite et ne prend que 30 secondes. Remplissez quelques informations de base et vous êtes prêt à commencer." },
        { icon: <Upload className="w-8 h-8" />, title: "2. Publiez un Événement", description: "Vous êtes organisateur ? Publiez les détails de votre événement (concert, soirée, conférence...) pour le rendre visible à des milliers d'utilisateurs." },
        { icon: <Share2 className="w-8 h-8" />, title: "3. Partagez des Contenus", description: "Trouvez un événement ou une promotion qui vous plaît et partagez-le avec vos amis et votre communauté sur les réseaux sociaux." },
        { icon: <Coins className="w-8 h-8" />, title: "4. Gagnez des Pièces", description: "Pour chaque interaction (partage, téléchargement, vue) sur le contenu que vous avez publié ou partagé, vous accumulez des pièces dans votre portefeuille." },
        { icon: <Zap className="w-8 h-8" />, title: "5. Boostez votre visibilité", description: "Utilisez vos pièces pour 'booster' vos publications et atteindre une audience encore plus large sur la plateforme." },
        { icon: <Landmark className="w-8 h-8" />, title: "6. Encaissez vos Gains", description: "Convertissez vos pièces en argent réel et retirez vos gains directement sur votre compte mobile money (Orange, Moov, Wave)." },
    ];

    return (
        <div className="bg-background text-foreground">
            <Helmet>
                <title>Comment ça marche - BonPlanInfos</title>
                <meta name="description" content="Découvrez comment gagner de l'argent en partageant des événements sur BonPlanInfos. Le guide complet de notre plateforme." />
            </Helmet>

            <main className="container mx-auto px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
                        Comment ça Marche ?
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Transformez votre passion pour les événements en une source de revenus, étape par étape.
                    </p>
                </motion.div>

                <motion.div
                    className="my-12"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Card className="overflow-hidden shadow-lg border-primary/20">
                        <CardContent className="p-0">
                            <img src="https://horizons-cdn.hostinger.com/b046caa6-31e1-44c9-b7bb-4c0c24e49566/150a140f02368866d8206eba11ea3767.jpg" alt="Faites vivre vos événements" className="w-full h-auto object-contain" />
                        </CardContent>
                    </Card>
                </motion.div>

                <div className="max-w-4xl mx-auto">
                    <div className="relative">
                        <div className="absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-1 bg-border/40 rounded-full hidden md:block"></div>
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, amount: 0.5 }}
                                transition={{ duration: 0.6 }}
                                className={`flex items-center w-full mb-12 flex-col md:flex-row ${index % 2 === 0 ? '' : 'md:flex-row-reverse'}`}
                            >
                                <div className={`md:w-5/12 ${index % 2 === 0 ? '' : 'md:text-right'}`}>
                                    <Card className="glass-effect border-primary/30">
                                        <CardHeader>
                                            <CardTitle>{step.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground">{step.description}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                                <div className="hidden md:flex w-2/12 items-center justify-center">
                                    <div className="z-10 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                                        {step.icon}
                                    </div>
                                </div>
                                <div className="md:hidden mt-4 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                                    {step.icon}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mt-16"
                >
                    <h2 className="text-3xl font-bold mb-4">Prêt à vous lancer ?</h2>
                    <p className="text-muted-foreground mb-8">Rejoignez des milliers d'autres personnes qui monétisent déjà leur passion.</p>
                    <Button size="lg" className="gradient-gold text-background" onClick={() => navigate('/auth', { state: { isRegistering: true } })}>
                        Créer mon compte gratuitement
                    </Button>
                </motion.div>
            </main>
        </div>
    );
};

export default HowItWorksPage;