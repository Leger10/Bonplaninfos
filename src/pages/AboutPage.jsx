import React from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import {
  Target,
  Globe,
  Users,
  Zap,
  Shield,
  TrendingUp,
  Calendar,
  Award,
  Sparkles,
  Heart,
  Rocket,
  MessageCircle,
  Phone,
  Users as UsersGroup,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import "@/styles/AboutPage.css";

const AboutPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const visionPillars = [
    {
      icon: <Globe className="text-blue-400" />,
      title: t("about.vision.global.title"),
      description: t("about.vision.global.description"),
    },
    {
      icon: <Target className="text-green-400" />,
      title: t("about.vision.empowerment.title"),
      description: t("about.vision.empowerment.description"),
    },
    {
      icon: <Sparkles className="text-purple-400" />,
      title: t("about.vision.innovation.title"),
      description: t("about.vision.innovation.description"),
    },
  ];

  const platformHighlights = [
    {
      icon: <Calendar className="text-orange-400" />,
      metric: t("about.highlights.events.metric"),
      label: t("about.highlights.events.label"),
    },
    {
      icon: <Users className="text-blue-400" />,
      metric: t("about.highlights.community.metric"),
      label: t("about.highlights.community.label"),
    },
    {
      icon: <Award className="text-yellow-400" />,
      metric: t("about.highlights.success.metric"),
      label: t("about.highlights.success.label"),
    },
    {
      icon: <TrendingUp className="text-green-400" />,
      metric: t("about.highlights.growth.metric"),
      label: t("about.highlights.growth.label"),
    },
  ];

  const coreValues = [
    {
      icon: <Heart className="text-red-400" />,
      title: t("about.values.passion.title"),
      description: t("about.values.passion.description"),
    },
    {
      icon: <Shield className="text-blue-400" />,
      title: t("about.values.trust.title"),
      description: t("about.values.trust.description"),
    },
    {
      icon: <Zap className="text-yellow-400" />,
      title: t("about.values.agility.title"),
      description: t("about.values.agility.description"),
    },
    {
      icon: <Rocket className="text-purple-400" />,
      title: t("about.values.impact.title"),
      description: t("about.values.impact.description"),
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
      },
    },
  };

  // Fonctions pour les actions de contact
  const handleWhatsAppGroup = () => {
    window.open("https://chat.whatsapp.com/IcR0TttLYpU1lJXr3ifyvH", "_blank");
  };

  const handleWhatsAppDirect = () => {
    const phoneNumber = "2250712275374";
    const message = encodeURIComponent(
      "Bonjour BonPlanInfos, je souhaite en savoir plus sur vos services."
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  const handleCall = () => {
    window.open("tel:+2250712275374", "_self");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Helmet>
        <title>{t("about.meta_title")}</title>
        <meta name="description" content={t("about.meta_description")} />
      </Helmet>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-gray-800 [mask-image:linear-gradient(0deg,rgba(0,0,0,0.1),rgba(0,0,0,0.5))]" />
        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-6">
              {t("about.hero.title")}
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              {t("about.hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300"
                onClick={() => navigate("/auth")}
              >
                {t("about.hero.cta_primary")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-gray-900 px-8 py-3 rounded-full font-semibold transition-all duration-300"
                onClick={() => navigate("/discover")}
              >
                {t("about.hero.cta_secondary")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 bg-gray-900">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              {t("about.vision.title")}
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              {t("about.vision.description")}
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {visionPillars.map((pillar, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center p-8 rounded-2xl bg-gray-800 hover:shadow-gray-700/20 transition-all duration-300 border border-gray-700"
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-gray-700 rounded-2xl flex items-center justify-center shadow-gray-900">
                  {pillar.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  {pillar.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Platform Highlights */}
      <section className="py-20 bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              {t("about.highlights.title")}
            </h2>
            <p className="text-xl opacity-90">
              {t("about.highlights.subtitle")}
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {platformHighlights.map((highlight, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-black/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  {highlight.icon}
                </div>
                <div className="text-3xl font-bold mb-2">
                  {highlight.metric}
                </div>
                <div className="text-blue-200 font-medium">
                  {highlight.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-900">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              {t("about.values.title")}
            </h2>
            <p className="text-lg text-gray-300">
              {t("about.values.description")}
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {coreValues.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-gray-700/20 transition-all duration-300 border border-gray-700"
              >
                <div className="value-icon w-16 h-16 mx-auto mb-6 bg-blue-900/30 rounded-2xl flex items-center justify-center">
                  {value.icon}
                </div>
                <h4 className="font-bold text-xl text-white mt-4 text-center">
                  {value.title}
                </h4>
                <p className="text-gray-300 text-sm mt-4 text-center leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA avec boutons WhatsApp et téléphone */}
      <section className="py-20 bg-gray-900">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              {t("about.cta.title")}
            </h2>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              {t("about.cta.description")}
            </p>

            {/* Boutons principaux */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition-all duration-300"
                onClick={() => navigate("/auth?tab=register")}
              >
                {t("about.cta.button_primary")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-3 rounded-full font-semibold transition-all duration-300"
                onClick={handleCall}
              >
                <Phone className="w-5 h-5 mr-2" />
                {t("about.cta.call")}
              </Button>
            </div>

            {/* Boutons de contact direct */}
            <div className="border-t border-gray-700 pt-8 mt-8">
              <p className="text-sm text-gray-400 mb-6">
                {t("about.cta.contact_direct")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
                <Button
                  size="lg"
                  className="bg-green-700 hover:bg-green-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg transition-all duration-300"
                  onClick={handleWhatsAppGroup}
                >
                  <UsersGroup className="w-5 h-5 mr-2" />
                  {t("about.cta.whatsapp_group")}
                </Button>
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg transition-all duration-300"
                  onClick={handleWhatsAppDirect}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  {t("about.cta.whatsapp_direct")}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                {t("about.cta.available_hours")}
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;