import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Users, Zap, CheckCircle, ShieldCheck, Ticket, Trophy, Star, Rocket, HeartHandshake as Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import '@/styles/AboutPage.css';

const AboutPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    { icon: <Ticket className="text-primary" />, text: t('about.features.tickets') },
    { icon: <Trophy className="text-primary" />, text: t('about.features.contest') },
    { icon: <Star className="text-primary" />, text: t('about.features.vote') },
    { icon: <Rocket className="text-primary" />, text: t('about.features.boost') },
    { icon: <Handshake className="text-primary" />, text: t('about.features.license') },
  ];

  const teamMembers = [
    { name: "S.Rayane Kibora", role: t('about.founder'), desc: t('about.founder_desc'), avatar: '👨‍💼' },
    { name: "Marie Martin", role: t('about.cto'), desc: t('about.cto_desc'), avatar: '👩‍💻' },
    { name: "Pierre Lambert", role: t('about.designer'), desc: t('about.designer_desc'), avatar: '👨‍🎨' },
    { name: "Sophie Dirane", role: t('about.marketing'), desc: t('about.marketing_desc'), avatar: '👩‍💼' },
  ];

  const values = [
    { icon: <ShieldCheck />, title: t('about.values.transparency.title'), desc: t('about.values.transparency.desc') },
    { icon: <Zap />, title: t('about.values.innovation.title'), desc: t('about.values.innovation.desc') },
    { icon: <Users />, title: t('about.values.community.title'), desc: t('about.values.community.desc') },
    { icon: <CheckCircle />, title: t('about.values.efficiency.title'), desc: t('about.values.efficiency.desc') },
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

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <div className="bg-background text-foreground">
      <Helmet>
        <title>{t('about.meta_title')}</title>
        <meta name="description" content={t('about.meta_description')} />
      </Helmet>

      <main className="overflow-x-hidden">
        <section className="container py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground font-heading mb-4">{t('about.main_title')}</h1>
              <p className="text-lg text-muted-foreground mb-8">{t('about.main_subtitle')}</p>
              
              <motion.ul 
                className="space-y-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {features.map((feature, index) => (
                  <motion.li key={index} className="flex items-center gap-4" variants={itemVariants}>
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      {feature.icon}
                    </div>
                    <span className="font-semibold text-lg">{feature.text}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mission-image-container mt-12 lg:mt-0"
            >
              <img src="https://horizons-cdn.hostinger.com/b046caa6-31e1-44c9-b7bb-4c0c24e49566/15a2f0bbeb4f7fb3fad904a6c6cf2962.jpg" alt={t('about.image_alt')} className="main-about-image" />
            </motion.div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-card">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-12">{t('about.team.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="team-member-card"
                >
                  <div className="avatar-placeholder">{member.avatar}</div>
                  <h4 className="font-bold text-lg mt-4">{member.name}</h4>
                  <p className="text-primary font-semibold text-sm">{member.role}</p>
                  <p className="text-muted-foreground text-sm mt-2">{member.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 container">
          <h2 className="text-3xl font-bold text-center mb-12">{t('about.values.title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="value-card"
              >
                <div className="value-icon">{value.icon}</div>
                <h4 className="font-bold text-lg mt-4">{value.title}</h4>
                <p className="text-muted-foreground text-sm mt-2">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-gradient-to-r from-primary to-purple-600 text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-4">{t('about.cta.title')}</h2>
            <p className="max-w-2xl mx-auto mb-8">{t('about.cta.desc')}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" variant="secondary" onClick={() => navigate('/auth')}>
                {t('about.cta.button_primary')}
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate('/events')}>
                {t('about.cta.button_secondary')}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AboutPage;