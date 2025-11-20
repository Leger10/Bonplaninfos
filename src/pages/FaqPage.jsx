import React from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation, Trans } from 'react-i18next';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FaqPage = () => {
    const { t } = useTranslation();

    const faqSections = t('faq.questions', { returnObjects: true }) || {};

    return (
        <>
            <Helmet>
                <title>{t('faq.meta_title')} - BonPlanInfos</title>
                <meta name="description" content={t('faq.meta_description')} />
            </Helmet>
            <div className="bg-background text-foreground">
                <div className="container mx-auto px-4 py-12 md:py-20">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary font-heading">
                            {t('faq.title')}
                        </h1>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            {t('faq.subtitle')}
                        </p>
                    </motion.div>

                    <div className="max-w-4xl mx-auto">
                        {Object.keys(faqSections).map((sectionKey, index) => (
                            <motion.div
                                key={sectionKey}
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.2 }}
                                className="mb-8"
                            >
                                <h2 className="text-2xl font-bold mb-4 text-secondary-foreground">{faqSections[sectionKey].title}</h2>
                                <Accordion type="single" collapsible className="w-full">
                                    {Object.keys(faqSections[sectionKey])
                                        .filter(key => key.startsWith('q'))
                                        .map((qKey) => (
                                            <AccordionItem key={`${sectionKey}-${qKey}`} value={`${sectionKey}-${qKey}`}>
                                                <AccordionTrigger className="text-left font-semibold">
                                                    {faqSections[sectionKey][qKey]}
                                                </AccordionTrigger>
                                                <AccordionContent className="text-muted-foreground">
                                                    <Trans
                                                        i18nKey={`faq.questions.${sectionKey}.${qKey.replace('q', 'a')}`}
                                                        components={{ b: <strong /> }}
                                                    />
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                </Accordion>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default FaqPage;