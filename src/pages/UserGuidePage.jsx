import React from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { BookOpen, UserPlus, LogIn, Share2, UploadCloud, Coins, Gift, BarChart2 } from 'lucide-react';

const UserGuidePage = () => {
    const { t } = useTranslation();

    const steps = [
        {
            icon: <UserPlus className="w-10 h-10 text-primary" />,
            title: t('user_guide.step1.title'),
            description: t('user_guide.step1.description'),
        },
        {
            icon: <LogIn className="w-10 h-10 text-primary" />,
            title: t('user_guide.step2.title'),
            description: t('user_guide.step2.description'),
        },
        {
            icon: <UploadCloud className="w-10 h-10 text-primary" />,
            title: t('user_guide.step3.title'),
            description: t('user_guide.step3.description'),
        },
        {
            icon: <Share2 className="w-10 h-10 text-primary" />,
            title: t('user_guide.step4.title'),
            description: t('user_guide.step4.description'),
        },
        {
            icon: <Coins className="w-10 h-10 text-primary" />,
            title: t('user_guide.step5.title'),
            description: t('user_guide.step5.description'),
        },
        {
            icon: <Gift className="w-10 h-10 text-primary" />,
            title: t('user_guide.step6.title'),
            description: t('user_guide.step6.description'),
        },
        {
            icon: <BarChart2 className="w-10 h-10 text-primary" />,
            title: t('user_guide.step7.title'),
            description: t('user_guide.step7.description'),
        },
    ];

    return (
        <>
            <Helmet>
                <title>{t('user_guide.meta_title')} - BonPlanInfos</title>
                <meta name="description" content={t('user_guide.meta_description')} />
            </Helmet>
            <div className="py-16 sm:py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <BookOpen className="w-16 h-16 mx-auto text-primary mb-4" />
                        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl font-heading">
                            {t('user_guide.title')}
                        </h1>
                        <p className="mt-4 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">
                            {t('user_guide.subtitle')}
                        </p>
                    </div>

                    <div className="relative">
                        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-border/50 hidden md:block" aria-hidden="true"></div>

                        <div className="space-y-12 md:space-y-0">
                            {steps.map((step, index) => (
                                <div key={index} className="md:grid md:grid-cols-2 md:gap-8 items-center relative">
                                    <div className={`flex justify-center md:justify-end ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                                        <div className="w-24 h-24 rounded-full bg-card flex items-center justify-center shadow-lg border-2 border-primary/30">
                                            {step.icon}
                                        </div>
                                    </div>
                                    <div className={`mt-4 md:mt-0 ${index % 2 === 1 ? 'md:order-1 md:text-right' : ''}`}>
                                        <h3 className="text-2xl font-bold text-foreground">{step.title}</h3>
                                        <p className="mt-2 text-muted-foreground">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserGuidePage;