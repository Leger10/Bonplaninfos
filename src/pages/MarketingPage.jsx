import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Target, Zap, TrendingUp, BarChart, Shield, LifeBuoy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RevenueSimulation from '@/components/marketing/RevenueSimulation';
import MultilingualSeoHead from '@/components/MultilingualSeoHead';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/layout/Footer';
import { useEffect, useState, useRef } from 'react';

const MarketingPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const features = [
        { icon: Target, title: t('marketing.why.feature1'), description: t('marketing.why.feature1_desc') },
        { icon: Zap, title: t('marketing.why.feature2'), description: t('marketing.why.feature2_desc') },
        { icon: TrendingUp, title: t('marketing.why.feature3'), description: t('marketing.why.feature3_desc') },
        { icon: BarChart, title: t('marketing.why.feature4'), description: t('marketing.why.feature4_desc') },
        { icon: Shield, title: t('marketing.why.feature5'), description: t('marketing.why.feature5_desc') },
        { icon: LifeBuoy, title: t('marketing.why.feature6'), description: t('marketing.why.feature6_desc') },
    ];

    const testimonials = [
        { name: t('marketing.testimonials.bintou_diallo_name'), role: t('marketing.testimonials.bintou_diallo_role'), quote: t('marketing.testimonials.dj_kerozen_quote') },
        { name: t('marketing.testimonials.kwesi_mensah_name'), role: t('marketing.testimonials.kwesi_mensah_role'), quote: t('marketing.testimonials.fatou_sylla_quote') },
        { name: t('marketing.testimonials.aisha_traore_name'), role: t('marketing.testimonials.aisha_traore_role'), quote: t('marketing.testimonials.eric_b_quote') },
        { name: t('marketing.testimonials.amadou_ba_name'), role: t('marketing.testimonials.amadou_ba_role'), quote: t('marketing.testimonials.amadou_ba_quote') },
        { name: t('marketing.testimonials.chimamanda_ngozi_name'), role: t('marketing.testimonials.chimamanda_ngozi_role'), quote: t('marketing.testimonials.chimamanda_ngozi_quote') },
        { name: t('marketing.testimonials.didier_kouame_name'), role: t('marketing.testimonials.didier_kouame_role'), quote: t('marketing.testimonials.didier_kouame_quote') },
        { name: t('marketing.testimonials.mariam_kone_name'), role: t('marketing.testimonials.mariam_kone_role'), quote: t('marketing.testimonials.mariam_kone_quote') },
        { name: t('marketing.testimonials.femi_adebayo_name'), role: t('marketing.testimonials.femi_adebayo_role'), quote: t('marketing.testimonials.femi_adebayo_quote') },
        { name: t('marketing.testimonials.abena_asante_name'), role: t('marketing.testimonials.abena_asante_role'), quote: t('marketing.testimonials.abena_asante_quote') },
        { name: t('marketing.testimonials.yannick_zongo_name'), role: t('marketing.testimonials.yannick_zongo_role'), quote: t('marketing.testimonials.yannick_zongo_quote') },
    ];

    const TestimonialsCarousel = ({ testimonials }) => {
        const carouselRef = useRef(null);
        const [width, setWidth] = useState(0);

        useEffect(() => {
            const updateWidth = () => {
                if (carouselRef.current) {
                    setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
                }
            };
            updateWidth();
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }, [testimonials]);

        return (
            <motion.div ref={carouselRef} className="cursor-grab overflow-hidden">
                <motion.div
                    drag="x"
                    dragConstraints={{ right: 0, left: -width }}
                    className="flex gap-8"
                >
                    {testimonials.map((testimonial, index) => (
                        <motion.div key={index} className="min-w-[80%] md:min-w-[40%] lg:min-w-[30%]">
                            <Card className="h-full glass-effect flex flex-col shadow-lg">
                                <CardContent className="p-6 flex-grow">
                                    <p className="text-foreground/80 italic">"{testimonial.quote}"</p>
                                </CardContent>
                                <CardHeader className="pt-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold text-xl">
                                            {testimonial.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">{testimonial.name}</p>
                                            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>
        );
    };

    return (
        <div className="bg-background text-foreground">
            <MultilingualSeoHead pageData={{
                title: t('marketing.meta_title'),
                description: t('marketing.meta_description'),
            }} />

            {/* Hero Section */}
            <section className="relative pt-20 pb-20 md:pt-32 md:pb-24 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10"></div>
                <div className="container mx-auto px-4 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <Badge variant="secondary" className="mb-4 text-sm font-semibold py-1 px-3">{t('marketing.badge')}</Badge>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-secondary">
                            {t('marketing.title')}
                        </h1>
                        <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">
                            {t('marketing.subtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Button size="lg" className="gradient-red text-primary-foreground shadow-lg" onClick={() => navigate('/create-event')}>
                                {t('marketing.createEventCta')}
                            </Button>
                            <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => navigate('/partner-signup')}>
                                {t('marketing.becomePartnerCta')}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-6">{t('marketing.trust')}</p>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 md:py-24 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold">{t('marketing.why.title')}</h2>
                        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                            {t('marketing.why.subtitle')}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Card className="h-full text-center sm:text-left glass-effect hover:border-primary/50 transition-all duration-300">
                                    <CardHeader className="flex flex-col sm:flex-row items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-full flex-shrink-0">
                                            <feature.icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Revenue Simulation Section */}
            <RevenueSimulation onCtaClick={() => navigate('/create-event')} />

            {/* Testimonials Section */}
            <section className="py-16 md:py-24 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold">{t('marketing.testimonials.title')}</h2>
                        <p className="mt-2 text-muted-foreground">Faites glisser pour explorer les témoignages</p>
                    </div>
                    <TestimonialsCarousel testimonials={testimonials} />
                </div>
            </section>

            <motion.div 
                className="my-12 container"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6 }}
            >
                <Card className="overflow-hidden shadow-xl border-amber-500/30">
                    <CardHeader>
                        <CardTitle className="text-center text-2xl">Paiements Flexibles et Sécurisés</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <img src="https://horizons-cdn.hostinger.com/b046caa6-31e1-44c9-b7bb-4c0c24e49566/b4e1bcde8a95f1bcad910ed8862c6c37.jpg" alt="Méthodes de paiement variées" className="w-full h-auto object-contain" />
                    </CardContent>
                </Card>
            </motion.div>

            {/* CTA Section */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="relative bg-gradient-to-r from-primary to-red-500 rounded-lg p-8 md:p-12 text-center text-primary-foreground overflow-hidden">
                        <div className="absolute -top-4 -left-4 w-32 h-32 bg-white/10 rounded-full opacity-50"></div>
                        <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-white/10 rounded-lg transform rotate-45 opacity-50"></div>
                        <div className="relative">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('marketing.cta.title')}</h2>
                            <p className="max-w-2xl mx-auto text-lg mb-8 text-primary-foreground/90">
                                {t('marketing.cta.subtitle')}
                            </p>
                            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-gray-100 shadow-lg transform hover:scale-105 transition-transform" onClick={() => navigate('/partner-signup')}>
                                {t('marketing.cta.cta')}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default MarketingPage;