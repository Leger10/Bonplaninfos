import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail, Search, MessageSquare, Phone } from 'lucide-react';
import '@/styles/HelpCenter.css';

const HelpCenterPage = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const faqSections = useMemo(() => t('help_center.faq_sections', { returnObjects: true }) || {}, [t]);

  const filteredFaqs = useMemo(() => {
    if (!searchTerm) return faqSections;

    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = {};

    for (const sectionKey in faqSections) {
      const section = faqSections[sectionKey];
      const matchingQuestions = {};
      let sectionHasMatch = false;

      if (section.title && section.title.toLowerCase().includes(lowercasedFilter)) {
        sectionHasMatch = true;
        for (const key in section) {
          if (key.startsWith('q')) {
            matchingQuestions[key] = section[key];
            matchingQuestions[key.replace('q', 'a')] = section[key.replace('q', 'a')];
          }
        }
      } else {
        for (const key in section) {
          if (key.startsWith('q')) {
            const question = section[key];
            const answer = section[key.replace('q', 'a')];
            if (question && answer && (question.toLowerCase().includes(lowercasedFilter) || answer.toLowerCase().includes(lowercasedFilter))) {
              matchingQuestions[key] = question;
              matchingQuestions[key.replace('q', 'a')] = answer;
              sectionHasMatch = true;
            }
          }
        }
      }

      if (sectionHasMatch) {
        filtered[sectionKey] = { title: section.title, ...matchingQuestions };
      }
    }
    return filtered;
  }, [searchTerm, faqSections]);
  
  const isFaqDataValid = faqSections && typeof faqSections === 'object' && Object.keys(faqSections).length > 0;

  const contactMethods = [
    { icon: <Mail />, title: t('help_center.email'), desc: t('help_center.emailDesc'), buttonText: t('help_center.writeUs'), href: 'mailto:support@bonplaninfos.net' },
    { icon: <MessageSquare />, title: t('help_center.chat'), desc: t('help_center.chatDesc'), buttonText: t('help_center.startChat'), href: 'https://chat.whatsapp.com/IcR0TttLYpU1lJXr3ifyvH' },
    { icon: <Phone />, title: t('help_center.phone'), desc: t('help_center.phoneDesc'), buttonText: t('help_center.call'), href: 'tel:+2250712275374' },
  ];

  const renderAnswer = (answer) => {
    if (!answer) return null;
    return <div className="prose dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: answer.replace(/\n/g, '<br />') }} />;
  };

  return (
    <div className="help-center-page bg-background">
      <Helmet>
        <title>{t('help_center.meta_title')}</title>
        <meta name="description" content={t('help_center.meta_description')} />
      </Helmet>

      <main className="overflow-x-hidden">
        <section className="help-hero">
          <div className="container text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <HelpCircle className="inline-block w-12 h-12 mb-4 text-primary" />
              <h1 className="text-4xl md:text-5xl font-extrabold">{t('help_center.title')}</h1>
            </motion.div>
            <motion.p className="mt-4 text-lg text-muted-foreground" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              {t('help_center.subtitle')}
            </motion.p>
          </div>
        </section>

        <section className="search-section">
          <div className="container">
            <div className="search-container">
              <Search className="search-icon" />
              <Input type="text" placeholder={t('help_center.searchPlaceholder')} className="search-box" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </section>
        
        <section className="faq-section">
          <div className="container">
            <h2 className="section-title">{t('help_center.faq')}</h2>
            <div className="max-w-4xl mx-auto">
              {isFaqDataValid ? (
                Object.keys(filteredFaqs).length > 0 ? (
                  Object.entries(filteredFaqs).map(([key, section]) => (
                    section.title && <div key={key} className="mb-8">
                      <h3 className="text-2xl font-bold mb-4 text-center">{section.title}</h3>
                      <Accordion type="single" collapsible className="w-full space-y-2">
                        {Object.keys(section).filter(k => k.startsWith('q')).sort().map((qKey, index) => (
                          section[qKey] && <AccordionItem value={`${key}-item-${index}`} key={`${key}-${index}`} className="bg-card border rounded-lg">
                            <AccordionTrigger className="p-4 text-base text-left font-semibold text-foreground hover:no-underline">
                              {section[qKey]}
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                {renderAnswer(section[qKey.replace('q', 'a')])}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Aucun résultat trouvé pour "{searchTerm}".</p>
                  </div>
                )
              ) : (
                <p className="text-center text-muted-foreground">Le contenu du centre d'aide est en cours de chargement...</p>
              )}
            </div>
          </div>
        </section>
        
        <section className="contact-section">
          <div className="container">
            <h2 className="section-title">{t('help_center.contact')}</h2>
            <div className="contact-grid">
              {contactMethods.map((method, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                  <Card className="contact-card h-full">
                    <CardHeader>
                      <div className="contact-icon">{method.icon}</div>
                      <CardTitle>{method.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-grow">
                      <p className="contact-description flex-grow">{method.desc}</p>
                      <Button asChild className="mt-4 w-full">
                        <a href={method.href} target="_blank" rel="noopener noreferrer">{method.buttonText}</a>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HelpCenterPage;