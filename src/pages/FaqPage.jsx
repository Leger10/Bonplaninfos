import React from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FaqPage = () => {
    const { t } = useTranslation();
    const faqData = t('faq.questions', { returnObjects: true });

    const isFaqDataValid = faqData && typeof faqData === 'object' && Object.keys(faqData).length > 0;

    return (
        <>
            <Helmet>
                <title>{t('faq.meta_title')}</title>
                <meta name="description" content={t('faq.meta_description')} />
            </Helmet>
            <div className="py-16 sm:py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12 md:mb-16">
                        <HelpCircle className="w-16 h-16 mx-auto text-primary mb-4" />
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground font-heading">
                            {t('faq.title')}
                        </h1>
                        <p className="mt-4 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">
                            {t('faq.subtitle')}
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-12">
                        {isFaqDataValid ? (
                            Object.keys(faqData).map(sectionKey => (
                                <div key={sectionKey}>
                                    <h2 className="text-2xl font-bold text-center mb-6 text-primary">{faqData[sectionKey].title}</h2>
                                    <Accordion type="single" collapsible className="w-full space-y-4">
                                        {Object.keys(faqData[sectionKey]).filter(key => key.startsWith('q')).map((qKey, index) => (
                                            <AccordionItem value={`item-${sectionKey}-${index}`} key={index} className="bg-card border-border/50 rounded-lg shadow-sm">
                                                <AccordionTrigger className="p-6 text-base md:text-lg font-semibold text-left hover:no-underline text-foreground">
                                                    {faqData[sectionKey][qKey]}
                                                </AccordionTrigger>
                                                <AccordionContent className="p-6 pt-0">
                                                    <div className="prose dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: faqData[sectionKey][qKey.replace('q', 'a')] }}></div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground">Le contenu de la FAQ est en cours de chargement...</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default FaqPage;