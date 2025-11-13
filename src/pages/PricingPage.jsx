import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Check, Star, Gem, Rocket } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

const PricingPage = () => {
    const navigate = useNavigate();
    const { adminConfig } = useData();
    const { t } = useTranslation();
    
    const userPacks = adminConfig?.event_packs?.map(p => ({
        ...p,
        price: p.coins * (adminConfig?.coin_to_cfa_rate || 20)
    })) || [];
    
    const businessPacks = [
        {
            icon: <Rocket className="w-8 h-8 mb-4 text-primary" />,
            title: t('pricing.business.boost.title'),
            price: t('pricing.business.boost.price'),
            description: t('pricing.business.boost.description'),
            features: [
                t('pricing.business.boost.feature1'),
                t('pricing.business.boost.feature2'),
                t('pricing.business.boost.feature3'),
            ],
            actionText: t('pricing.business.boost.actionText'),
            action: () => navigate('/boost'),
        },
        {
            icon: <Star className="w-8 h-8 mb-4 text-yellow-400" />,
            title: t('pricing.business.promo.title'),
            price: t('pricing.business.promo.price'),
            description: t('pricing.business.promo.description'),
            features: [
                t('pricing.business.promo.feature1'),
                t('pricing.business.promo.feature2'),
                t('pricing.business.promo.feature3'),
            ],
            actionText: t('pricing.business.promo.actionText'),
            action: () => navigate('/create-promotion'),
        },
        {
            icon: <Gem className="w-8 h-8 mb-4 text-purple-400" />,
            title: t('pricing.business.partner.title'),
            price: t('pricing.business.partner.price'),
            description: t('pricing.business.partner.description'),
            features: [
                t('pricing.business.partner.feature1'),
                t('pricing.business.partner.feature2'),
                t('pricing.business.partner.feature3'),
            ],
            actionText: t('pricing.business.partner.actionText'),
            action: () => navigate('/marketing'),
        },
    ];

    return (
        <div className="bg-background text-foreground">
            <Helmet>
                <title>{t('pricing.meta.title')}</title>
                <meta name="description" content={t('pricing.meta.description')} />
            </Helmet>

            <main className="container mx-auto px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
                        {t('pricing.hero.title')}
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        {t('pricing.hero.subtitle')}
                    </p>
                </motion.div>

                <section className="mb-20">
                    <h2 className="text-3xl font-bold text-center mb-10">{t('pricing.user_packs.title')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {userPacks.map((pack, index) => (
                             <motion.div
                                key={pack.id}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Card className={`flex flex-col h-full glass-effect hover:border-primary transition-all ${pack.id === 'vip' ? 'border-primary' : 'border-border'}`}>
                                    <CardHeader className="text-center">
                                        {pack.id === 'vip' && <Badge className="absolute top-4 right-4 bg-primary">{t('pricing.popular')}</Badge>}
                                        <CardTitle className="text-2xl">{pack.name}</CardTitle>
                                        <div className="my-4">
                                            <span className="text-5xl font-bold">{pack.coins + (pack.bonus?.match(/\d+/g)?.map(Number)[0] || 0)}</span>
                                            <span className="text-muted-foreground"> {t('pricing.coins')}</span>
                                        </div>
                                        {pack.bonus && <CardDescription className="text-green-400 font-semibold">{pack.bonus}</CardDescription>}
                                    </CardHeader>
                                    <CardContent className="flex-grow"></CardContent>
                                    <CardFooter className="flex-col gap-4">
                                        <p className="text-2xl font-bold text-primary">{pack.price.toLocaleString()} FCFA</p>
                                        <Button className="w-full gradient-gold text-background" onClick={() => navigate('/wallet')}>{t('pricing.buy_pack')}</Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </section>
                
                <section>
                    <h2 className="text-3xl font-bold text-center mb-10">{t('pricing.business.title')}</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                       {businessPacks.map((pack, index) => (
                             <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Card className="flex flex-col h-full glass-effect hover:border-primary transition-all">
                                    <CardHeader className="text-center">
                                        {pack.icon}
                                        <CardTitle className="text-2xl">{pack.title}</CardTitle>
                                        <p className="text-primary font-bold text-lg">{pack.price}</p>
                                        <CardDescription>{pack.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <ul className="space-y-3 mt-4">
                                            {pack.features.map((feature, i) => (
                                                <li key={i} className="flex items-start">
                                                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-1" />
                                                    <span className="text-muted-foreground">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full" onClick={pack.action}>{pack.actionText}</Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                       ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default PricingPage;