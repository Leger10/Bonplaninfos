import React from 'react';
    import { motion } from 'framer-motion';
    import { Helmet } from 'react-helmet';
    import { useNavigate } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
    import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
    import { Check, ChevronRight } from 'lucide-react';
    import WelcomePopup from '@/components/WelcomePopup';
    import AnimatedBadgesBanner from '@/components/AnimatedBadgesBanner';

    const StatCard = ({ icon, value, label }) => (
        <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
        >
            <div className="text-4xl font-bold text-primary">{value}</div>
            <div className="text-muted-foreground">{label}</div>
        </motion.div>
    );

    const FeatureCard = ({ icon, title, description }) => (
        <Card className="text-center">
            <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">{icon}</span>
                </div>
                <CardTitle className="font-heading">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );

    const StepCard = ({ number, title, description }) => (
        <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-xl">
                {number}
            </div>
            <div>
                <h3 className="font-bold text-lg font-heading">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
            </div>
        </div>
    );

    const LandingPage = () => {
        const navigate = useNavigate();

        return (
            <div className="bg-background">
                <Helmet>
                    <title>BonPlanInfos - Monétisez Votre Passion Événementielle</title>
                    <meta name="description" content="La première plateforme africaine qui vous récompense pour chaque partage et téléchargement d'événements." />
                </Helmet>
                
                <WelcomePopup />
                <AnimatedBadgesBanner />

                <main>
                    <section className="py-20 md:py-32 text-center bg-gradient-to-b from-primary/5 to-transparent">
                        <div className="container">
                            <motion.h1 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-4xl md:text-6xl font-black font-heading mb-6"
                            >
                                Monétisez Votre Passion Événementielle
                            </motion.h1>
                            <motion.p 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8"
                            >
                                La première plateforme africaine qui vous récompense pour chaque partage et téléchargement.
                            </motion.p>
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="flex flex-col sm:flex-row gap-4 justify-center"
                            >
                                <Button size="lg" onClick={() => navigate('/auth', { state: { isRegistering: true } })}>
                                    Commencer à gagner <ChevronRight className="ml-2 w-5 h-5" />
                                </Button>
                                <Button size="lg" variant="outline" onClick={() => navigate('/marketing')}>
                                    Voir notre Partenariat
                                </Button>
                            </motion.div>
                        </div>
                    </section>

                    <section className="py-16">
                        <div className="container">
                            <p className="text-center text-muted-foreground mb-8">Reconnu par plus de 50 000 utilisateurs à travers l'Afrique</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                <StatCard value="50K+" label="Utilisateurs actifs" />
                                <StatCard value="10K+" label="Événements créés" />
                                <StatCard value="500M+" label="Revenus générés (FCFA)" />
                                <StatCard value="15+" label="Pays couverts" />
                            </div>
                        </div>
                    </section>

                    <section className="py-16 bg-card/50">
                        <div className="container">
                            <h2 className="text-3xl font-bold font-heading text-center mb-12">Pourquoi Choisir BonPlanInfos ?</h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                                <FeatureCard icon="💰" title="Revenus Directs" description="Gagnez de l'argent réel pour chaque interaction avec vos contenus événementiels." />
                                <FeatureCard icon="🚀" title="Promotion Gratuite" description="Boostez votre visibilité sans investir un seul franc." />
                                <FeatureCard icon="⚡" title="Paiements Instantanés" description="Recevez vos gains via Orange Money, Moov Money et Wave en temps réel." />
                                <FeatureCard icon="👥" title="Communauté Engagée" description="Rejoignez des milliers de passionnés d'événements en Afrique." />
                            </div>
                        </div>
                    </section>
                    
                    <section className="py-16">
                        <div className="container">
                            <h2 className="text-3xl font-bold font-heading text-center mb-12">Comment Gagner de l'Argent ?</h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                                <StepCard number="01" title="Créez votre compte" description="Inscription gratuite en 30 secondes." />
                                <StepCard number="02" title="Partagez des événements" description="Publiez ou partagez du contenu événementiel." />
                                <StepCard number="03" title="Gagnez des coins" description="Recevez des pièces pour chaque interaction." />
                                <StepCard number="04" title="Encaissez vos gains" description="Retirez votre argent instantanément." />
                            </div>
                        </div>
                    </section>
                    
                    <section className="py-16 bg-card/50">
                        <div className="container">
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div>
                                    <h2 className="text-3xl font-bold font-heading mb-4">C'est 100% gratuit !</h2>
                                    <p className="text-muted-foreground text-lg">Vous gagnez de l'argent, pas nous. Nos revenus proviennent des organisateurs premium.</p>
                                </div>
                                <Card className="border-primary">
                                    <CardHeader>
                                        <CardTitle className="text-2xl font-heading">100% Gratuit</CardTitle>
                                        <p className="text-4xl font-bold">0 FCFA</p>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3">
                                            <li className="flex items-center"><Check className="text-green-500 w-5 h-5 mr-2" /> Création de compte gratuite</li>
                                            <li className="flex items-center"><Check className="text-green-500 w-5 h-5 mr-2" /> Partage illimité d'événements</li>
                                            <li className="flex items-center"><Check className="text-green-500 w-5 h-5 mr-2" /> Gains sur chaque interaction</li>
                                            <li className="flex items-center"><Check className="text-green-500 w-5 h-5 mr-2" /> Paiements instantanés</li>
                                            <li className="flex items-center"><Check className="text-green-500 w-5 h-5 mr-2" /> Support 7j/7</li>
                                        </ul>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full" size="lg" onClick={() => navigate('/auth', { state: { isRegistering: true } })}>S'inscrire gratuitement</Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        </div>
                    </section>

                    <section className="py-16">
                        <div className="container max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold font-heading text-center mb-12">Questions Fréquentes</h2>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>Combien puis-je gagner ?</AccordionTrigger>
                                    <AccordionContent>Nos top utilisateurs gagnent jusqu'à 300 000 à 800 000 FCFA par mois ! Vos gains dépendent de votre activité et de la popularité des contenus que vous partagez.</AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger>Comment sont calculés mes gains ?</AccordionTrigger>
                                    <AccordionContent>Vous gagnez des 'coins' (pièces virtuelles) pour chaque partage, téléchargement et participation à des événements. Ces coins sont ensuite convertibles en argent réel.</AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-3">
                                    <AccordionTrigger>Quand puis-je retirer mon argent ?</AccordionTrigger>
                                    <AccordionContent>Dès que vous atteignez le seuil de 1000 coins, vous pouvez demander un retrait instantané via nos partenaires de paiement mobile.</AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    </section>

                    <section className="py-16 bg-card">
                        <div className="container text-center">
                            <h2 className="text-3xl font-bold font-heading mb-4 text-foreground">Prêt à transformer votre passion en revenus ?</h2>
                            <p className="text-lg mb-8 text-muted-foreground">Rejoignez la révolution événementielle en Afrique.</p>
                            <Button size="lg" variant="secondary" onClick={() => navigate('/auth', { state: { isRegistering: true } })}>Commencer gratuitement</Button>
                        </div>
                    </section>
                </main>

                <footer className="bg-card border-t">
                    <div className="container py-12">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="col-span-2 md:col-span-1">
                                <h3 className="font-bold font-heading text-lg mb-2">BonPlanInfos</h3>
                                <p className="text-sm text-muted-foreground">La plateforme événementielle qui vous récompense.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold font-heading mb-3">Plateforme</h4>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="#" onClick={(e) => {e.preventDefault(); navigate('/')}} className="text-muted-foreground hover:text-primary">Accueil</a></li>
                                    <li><a href="#" onClick={(e) => {e.preventDefault(); navigate('/how-it-works')}} className="text-muted-foreground hover:text-primary">Comment ça marche</a></li>
                                    <li><a href="#" onClick={(e) => {e.preventDefault(); navigate('/help-center')}} className="text-muted-foreground hover:text-primary">Centre d'aide</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold font-heading mb-3">Entreprise</h4>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="#" onClick={(e) => {e.preventDefault(); navigate('/about')}} className="text-muted-foreground hover:text-primary">À propos</a></li>
                                    <li><a href="#" onClick={(e) => {e.preventDefault(); navigate('/marketing')}} className="text-muted-foreground hover:text-primary">Partenariat</a></li>
                                    <li><a href="mailto:contact@bonplaninfos.net" className="text-muted-foreground hover:text-primary">Contact</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold font-heading mb-3">Légal</h4>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="#" onClick={(e) => {e.preventDefault(); navigate('/privacy-policy')}} className="text-muted-foreground hover:text-primary">Confidentialité</a></li>
                                    <li><a href="#" onClick={(e) => {e.preventDefault(); navigate('/terms')}} className="text-muted-foreground hover:text-primary">Conditions</a></li>
                                    <li><a href="#" onClick={(e) => {e.preventDefault(); navigate('/legal-mentions')}} className="text-muted-foreground hover:text-primary">Mentions Légales</a></li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-12 border-t pt-8 text-center">
                            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} BonPlanInfos. Tous droits réservés.</p>
                        </div>
                    </div>
                </footer>
            </div>
        );
    };

    export default LandingPage;