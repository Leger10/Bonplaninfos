import React, { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building,
  User2 as UserTie,
  Server,
  Database,
  Cookie,
  Copyright,
  AlertTriangle,
  Link2,
  Gavel,
  Shield,
  Mail,
  Phone,
  MapPin,
  Globe,
  CheckCircle,
  ArrowRight,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const LegalMentionsPage = () => {
  const { t } = useTranslation();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const sectionsData = t("legal_mentions.sections", { returnObjects: true });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const sectionDetails = [
    { key: "editor", icon: <Building />, color: "from-blue-500 to-cyan-500" },
    { key: "director", icon: <UserTie />, color: "from-indigo-500 to-purple-500" },
    { key: "hosting", icon: <Server />, color: "from-green-500 to-emerald-500" },
    { key: "data", icon: <Database />, color: "from-yellow-500 to-orange-500" },
    { key: "cookies", icon: <Cookie />, color: "from-pink-500 to-rose-500" },
    { key: "ip", icon: <Copyright />, color: "from-purple-500 to-pink-500" },
    { key: "liability", icon: <AlertTriangle />, color: "from-red-500 to-orange-500" },
    { key: "links", icon: <Link2 />, color: "from-teal-500 to-cyan-500" },
    { key: "applicableLaw", icon: <Gavel />, color: "from-slate-500 to-gray-500" },
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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const renderSectionContent = (sectionKey, section) => {
    if (!section) return null;

    switch (sectionKey) {
      case "editor":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Building className="w-4 h-4" />
                  <span className="text-sm font-medium">Entreprise</span>
                </div>
                <p className="font-semibold text-white">{section.company}</p>
                <p className="text-sm text-gray-400">{section.capital}</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">Adresse</span>
                </div>
                <p className="text-sm text-gray-300">{section.address}</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">Téléphone</span>
                </div>
                <a href={`tel:${section.phone}`} className="text-sm text-gray-300 hover:text-primary transition-colors">
                  {section.phone}
                </a>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm font-medium">Email</span>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`mailto:${section.email}`} className="text-sm text-gray-300 hover:text-primary transition-colors">
                    {section.email}
                  </a>
                  <button
                    onClick={() => copyToClipboard(section.email)}
                    className="p-1 rounded hover:bg-gray-700 transition-colors"
                    title="Copier l'email"
                  >
                    {copiedEmail ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case "hosting":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                <p className="font-semibold text-white">{section.company}</p>
                <p className="text-sm text-gray-400 mt-1">{section.address}</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-medium">Site web</span>
                </div>
                <a
                  href={section.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {section.website}
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        );
      case "cookies":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">{section.content1}</p>
            <ul className="space-y-2 bg-gray-800/20 rounded-lg p-4 border border-gray-700">
              {[section.item1, section.item2, section.item3].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-300">{section.content2}</p>
          </div>
        );
      case "data":
        return (
          <div className="space-y-4">
            <p className="text-gray-300">
              {section.content1?.split('privacy@bonplaninfos.net')[0]}
              <a
                href="mailto:privacy@bonplaninfos.net"
                className="text-primary hover:underline font-medium"
              >
                privacy@bonplaninfos.net
              </a>
              {section.content1?.split('privacy@bonplaninfos.net')[1]}
            </p>
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <p className="text-sm text-gray-300">
                <Trans i18nKey="legal_mentions.sections.data.content2">
                  Pour plus d'informations, veuillez consulter notre{" "}
                  <Link
                    to="/privacy-policy"
                    className="text-primary hover:underline font-medium"
                  >
                    Politique de Confidentialité
                  </Link>
                  .
                </Trans>
              </p>
            </div>
          </div>
        );
      default:
        return (
          <p
            className="text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: section.content || section.content1,
            }}
          ></p>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B0D] via-[#0f0f15] to-[#1a1a2e] text-white overflow-x-hidden">
      <Helmet>
        <title>{t("legal_mentions.meta_title")} - BonPlanInfos</title>
        <meta name="description" content={t("legal_mentions.meta_description")} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes" />
      </Helmet>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 md:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-2xl mb-6 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-primary to-secondary bg-clip-text text-transparent mb-4">
              {t("legal_mentions.title")}
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg">
              {t("legal_mentions.subtitle")}
            </p>
            <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-gray-400">{t("legal_mentions.lastUpdate")}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-8 md:py-16">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto space-y-6 md:space-y-8"
          >
            {sectionDetails.map(({ key, icon, color }) => {
              const section = sectionsData[key];
              if (!section) return null;
              return (
                <motion.div
                  key={key}
                  variants={itemVariants}
                  className="group"
                >
                  <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 overflow-hidden hover:border-primary/30 transition-all duration-300">
                    <div className={`bg-gradient-to-r ${color} p-0.5`}>
                      <div className="bg-gray-900 rounded-t-2xl p-5 md:p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center text-primary">
                            {icon}
                          </div>
                          <h2 className="text-xl md:text-2xl font-bold text-white">
                            {section.title}
                          </h2>
                        </div>
                        <div className="text-gray-300 leading-relaxed">
                          {renderSectionContent(key, section)}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-4xl mx-auto mt-12 md:mt-16"
          >
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-6 md:p-8 text-center border border-primary/20">
              <h3 className="text-lg md:text-xl font-semibold text-white mb-3">
                Une question sur nos mentions légales ?
              </h3>
              <p className="text-gray-400 text-sm md:text-base mb-6">
                Notre équipe juridique est à votre disposition pour toute information complémentaire.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => window.location.href = "/contact"}
                  className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition-opacity"
                >
                  Nous contacter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/"}
                  className="border-gray-700 text-gray-300 hover:border-primary/50 hover:text-primary transition-all"
                >
                  Retour à l'accueil
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LegalMentionsPage;