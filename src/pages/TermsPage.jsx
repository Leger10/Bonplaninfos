import React, { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  BookOpen,
  Shield,
  FileText,
  DollarSign,
  Users,
  Mail,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TermsPage = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("fr");

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

  const content = {
    fr: {
      title: "Conditions Générales d'Utilisation",
      subtitle: "BonPlanInfos - Votre plateforme de mise en relation",
      lastUpdate: "Date de dernière mise à jour : 01/10/2025",
      effectiveDate: "Entrée en vigueur : 05/10/2025",
      back: "Retour",
      navigation: "Navigation",
      contact: "Nous Contacter",
      questions: "Vous avez des questions ?",
      contactText:
        "Notre équipe est disponible pour vous accompagner et répondre à toutes vos interrogations concernant nos conditions d'utilisation.",
    },
    en: {
      title: "Terms and Conditions",
      subtitle: "BonPlanInfos - Your connection platform",
      lastUpdate: "Last update date: 10/01/2025",
      effectiveDate: "Effective date: 10/05/2025",
      back: "Back",
      navigation: "Navigation",
      contact: "Contact Us",
      questions: "Do you have questions?",
      contactText:
        "Our team is available to assist you and answer all your questions regarding our terms of use.",
    },
  };

  const articlesFr = [
    {
      icon: Shield,
      title: "Article 1 : Objet et Acceptation",
      content: `
        Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme BonPlanInfos, application de mise en relation entre créateurs de contenu, organisateurs d'événements, annonceurs et utilisateurs en Afrique.
        
        **Acceptation :** L'utilisation de la plateforme implique l'acceptation sans réserve des présentes CGU.

        ### Section 1 - Accès et Responsabilités
        L'Administrateur Pays s'engage à :
        - Maintenir la confidentialité de ses identifiants
        - Ne pas partager son accès admin avec des tiers
        - Respecter les guidelines de contenu BonPlanInfos
        - Modérer activement les annonces de son territoire
        - Signaler tout comportement suspect au Super Admin

        **Interdictions formelles :**
        - Tenter d'accéder aux données d'autres pays
        - Modifier la structure technique de la plateforme
        - Installer des extensions non autorisées
        - Utiliser la plateforme à des fins personnelles

        ### Section 2 - Standards de Contenu
        Chaque Administrateur Pays doit garantir :
        - L'authenticité des annonces publiées
        - Le respect des lois locales sur le commerce
        - La modération des contenus inappropriés sous 24h
        - La vérification des coordonnées des annonceurs
      `,
    },
    {
      icon: FileText,
      title: "Article 2 : Définitions",
      content: `
        - **Plateforme :** Application et site web BonPlanInfos
        - **Utilisateur :** Toute personne utilisant la plateforme
        - **Créateur ou Organisateur :** Utilisateur publiant du contenu
        - **Organisateur :** Créateur organisant des événements payants ou gratuits
        - **Annonceur :** Utilisateur publiant des promotions commerciales
        - **Influenceur ou Créateur Populaire :** Utilisateur récompensé pour sa popularité et sa capacité de communication sur les evènements et promotions des organisateurs et annonceurs
        - **Pièces :** Monnaie virtuelle de la plateforme
        - **Contenu :** Événements, promotions, publications, commentaires
        - **Secrétaire Général par Pays :** Utilisateur avec droits de modération sur un territoire
        - **Administrateur Pays :** Utilisateur avec droits de modération sur un territoire
        - **Super Admin :** Utilisateur avec droits de modération globaux

      `,
    },
    {
      icon: Users,
      title: "Article 3 : Inscription et Compte",
      content: `
        ### 3.1 L'inscription nécessite :
        - Une adresse email valide
        - Un numéro de téléphone vérifié
        - Votre pays et ville de résidence
        - L'acceptation des CGU

        ### 3.2 Les utilisateurs s'engagent à :
        - Fournir des informations exactes
        - Maintenir la confidentialité de leurs identifiants
        - Informer immédiatement de toute utilisation non autorisée

        ### 3.3 Types de comptes :
        - Utilisateur standard
        - Organisateur
        - Secrétaire Général par Pays
        - Administrateur Pays
        - Super Admin
      `,
    },
    {
      icon: DollarSign,
      title: "Article 4 : Système de Pièces",
      content: `
        ### 4.1 Acquisition de pièces :
        - Achat via packs
        - Parrainage
        - Récompenses influenceurs et créateurs populaires

        ### 4.2 Utilisation des pièces :
        - Paiement d'événements
        - Publication de promotions
        - Boost de visibilité

        ### 4.3 Conversion et retraits :
        - Taux : 10 pièces = 100 FCFA
        - Seuil minimal pour retrait : 50 pièces
        - Délai : 24-72 heures
      `,
    },
    {
      icon: BookOpen,
      title: "Article 5 : Contenu et Publications",
      content: `
        ### 5.1 Contenu interdit :
        - Contenu illégal ou frauduleux
        - Contenu discriminatoire
        - Spam et contenus répétitifs

        ### 5.2 Modération :
        - Droit de modération par BonPlanInfos
        - Suppression des contenus non conformes
        - Système de signalement utilisateur
      `,
    },
    {
      icon: Shield,
      title: "Article 6 : Propriété Intellectuelle",
      content: `
        ### 6.1 Contenu utilisateur :
        - Les utilisateurs conservent leurs droits
        - Licence d'utilisation accordée à BonPlanInfos

        ### 6.2 Plateforme :
        - Marque et logo protégés
        - Code source protégé
        - Reproduction interdite
      `,
    },
    {
      icon: FileText,
      title: "Article 7 : Données Personnelles",
      content: `
        ### 7.1 Collecte et utilisation :
        - Données collectées : identité, coordonnées, localisation
        - Finalités : fourniture du service, analytics

        ### 7.2 Droits des utilisateurs :
        - Droit d'accès, rectification, opposition
        - Contact : bonplaninfos@gmail.com
      `,
    },
    {
      icon: Users,
      title: "Article 8 : Responsabilités",
      content: `
        ### 8.1 Responsabilité de BonPlanInfos :
        - Obligation de moyens, non de résultat
        - Non responsable des contenus utilisateurs

        ### 8.2 Responsabilité des utilisateurs :
        - Exactitude des informations
        - Respect des engagements
      `,
    },
    {
      icon: DollarSign,
      title: "Article 9 : Transactions",
      content: `
        ### 9.1 Événements payants :
        - Paiements sécurisés
        - Commission de 10% sur transactions

        ### 9.2 Litiges :
        - Médiation prioritaire
        - Recours aux autorités compétentes
      `,
    },
    {
      icon: BookOpen,
      title: "Article 10 : Suspension",
      content: `
        ### 10.1 Par l'utilisateur :
        - Résiliation à tout moment

        ### 10.2 Par BonPlanInfos :
        - Suspension en cas de violation
        - Résiliation après avertissement
      `,
    },
    {
      icon: Shield,
      title: "Article 11 : Modifications",
      content: `
        ### 11.1 CGU :
        - Modification possible à tout moment
        - Information par email
        - Acceptation implicite si utilisation continue
      `,
    },
    {
      icon: FileText,
      title: "Article 12 : Loi Applicable",
      content: `
        ### 12.1 Loi applicable :
        - Droit du pays d'incorporation
        - Langue d'interprétation : français
      `,
    },
    {
      icon: Mail,
      title: "Article 13 : Contact",
      content: `
        Pour toute question :
        - Email : bonplaninfos@gmail.com
        - Délai de réponse : 15 jours ouvrés
      `,
    },
  ];

  const articlesEn = [
    {
      icon: Shield,
      title: "Article 1: Purpose and Acceptance",
      content: `
        These General Terms of Use govern the use of the BonPlanInfos platform, a connection application between content creators, event organizers, advertisers and users in Africa.
        
        **Acceptance:** Use of the platform implies unreserved acceptance of these Terms.
      `,
    },
    {
      icon: FileText,
      title: "Article 2: Definitions",
      content: `
        - **Platform:** BonPlanInfos application and website
        - **User:** Any person using the platform
        - **Creator or Organizer:** User publishing content
        - **Advertiser:** User publishing commercial promotions
        - **Coins:** Virtual platform currency
      `,
    },
    {
      icon: Users,
      title: "Article 3: Registration and Account",
      content: `
        ### 3.1 Registration requires:
        - Valid email address
        - Verified phone number
        - Country and city of residence
        - Acceptance of Terms

        ### 3.2 Account types:
        - Standard user
        - Organizer
        - Advertiser
        - Administrator
      `,
    },
    {
      icon: DollarSign,
      title: "Article 4: Coin System",
      content: `
        ### 4.1 Coin acquisition:
        - Purchase via packs
        - Referral program
        - Popular content rewards

        ### 4.2 Conversion and withdrawals:
        - Rate: 10 coins = 100 FCFA
        - Minimum threshold: 50 coins
        - Processing: 24-72 hours
      `,
    },
    {
      icon: BookOpen,
      title: "Article 5: Content",
      content: `
        ### 5.1 Prohibited content:
        - Illegal or fraudulent content
        - Discriminatory content
        - Spam and repetitive content

        ### 5.2 Moderation:
        - Right of moderation by BonPlanInfos
        - User reporting system
      `,
    },
    {
      icon: Shield,
      title: "Article 6: Intellectual Property",
      content: `
        ### 6.1 User content:
        - Users retain their rights
        - Usage license granted to BonPlanInfos

        ### 6.2 Platform:
        - Protected brand and logo
        - Protected source code
      `,
    },
    {
      icon: FileText,
      title: "Article 7: Personal Data",
      content: `
        ### 7.1 Collection and use:
        - Data collected: identity, contact details, location
        - Purposes: service provision, analytics

        ### 7.2 User rights:
        - Right of access, rectification, opposition
        - Contact: bonplaninfos@gmail.com
      `,
    },
    {
      icon: Mail,
      title: "Article 8: Contact",
      content: `
        For any questions:
        - Email: bonplaninfos@gmail.com
        - Response time: 15 working days
      `,
    },
  ];

  const currentArticles = language === "fr" ? articlesFr : articlesEn;
  const currentContent = content[language];

  const renderContent = (text) => {
    const sections = text.split("\n\n");
    return sections.map((section, index) => {
      if (section.startsWith("### ")) {
        return (
          <h3 key={index} className="text-base md:text-lg font-semibold text-white mt-4 mb-2">
            {section.replace("### ", "")}
          </h3>
        );
      } else if (section.startsWith("**") && section.endsWith("**")) {
        return (
          <div
            key={index}
            className="bg-white/5 rounded-xl p-3 md:p-4 border-l-4 border-[#C9A227] my-3"
          >
            <p className="font-semibold text-white text-sm md:text-base">
              {section.replace(/\*\*/g, "")}
            </p>
          </div>
        );
      } else if (section.includes("-") && !section.includes("•")) {
        const lines = section.split("\n").filter((line) => line.trim().startsWith("-"));
        return (
          <div key={index} className="my-3 space-y-2">
            {lines.map((line, lineIndex) => (
              <div key={lineIndex} className="flex items-start">
                <div className="w-1.5 h-1.5 bg-[#C9A227] rounded-full mt-2 mr-2 flex-shrink-0"></div>
                <span className="text-gray-300 text-sm md:text-base">
                  {line.replace(/^-\s*/, "")}
                </span>
              </div>
            ))}
          </div>
        );
      } else if (section.match(/^\d+\./)) {
        const lines = section.split("\n").filter((line) => line.trim());
        return (
          <ol key={index} className="list-decimal list-inside ml-2 space-y-2 my-3">
            {lines.map((line, lineIndex) => (
              <li key={lineIndex} className="text-gray-300 text-sm md:text-base">
                {line.replace(/^\d+\.\s*/, "")}
              </li>
            ))}
          </ol>
        );
      } else {
        return (
          <p key={index} className="text-gray-300 mb-3 text-sm md:text-base leading-relaxed">
            {section}
          </p>
        );
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B0D] to-[#1a1a2e] text-white overflow-x-hidden">
      <Helmet>
        <title>{currentContent.title} - BonPlaninfos</title>
        <meta name="description" content={currentContent.title} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes" />
      </Helmet>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 sm:mb-12"
        >
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-gray-300 hover:text-[#C9A227] border border-gray-700 hover:border-[#C9A227] transition-all duration-300 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              {currentContent.back}
            </Button>

            <Button
              variant="outline"
              onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
              className="text-gray-300 hover:text-[#C9A227] border border-gray-700 hover:border-[#C9A227] transition-all duration-300 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
            >
              <Globe className="w-4 h-4 mr-1 sm:mr-2" />
              {language === "fr" ? "EN" : "FR"}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-[#C9A227] to-[#e5c158] rounded-2xl blur-lg opacity-20"></div>
            <div className="relative bg-[#0f0f15] border border-gray-800 rounded-2xl p-4 sm:p-6 md:p-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[#C9A227] to-[#e5c158] bg-clip-text text-transparent mb-3 sm:mb-4">
                {currentContent.title}
              </h1>
              <p className="text-gray-400 text-base sm:text-lg mb-2">
                {currentContent.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                <span>{currentContent.lastUpdate}</span>
                <span className="hidden sm:inline">•</span>
                <span>{currentContent.effectiveDate}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar Navigation - Pour mobile, en haut avec défilement horizontal */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-1/4"
          >
            <div className="glass-effect rounded-2xl p-4 sm:p-6 sticky top-8">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[#C9A227]" />
                {currentContent.navigation}
              </h3>
              <div className="overflow-x-auto pb-2 lg:overflow-visible">
                <nav className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 min-w-max lg:min-w-0">
                  {currentArticles.map((article, index) => {
                    const Icon = article.icon;
                    const shortTitle = article.title.split(" : ")[0];
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          const element = document.getElementById(`article-${index + 1}`);
                          element?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center whitespace-nowrap lg:whitespace-normal"
                      >
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 text-[#C9A227] flex-shrink-0" />
                        <span className="text-xs sm:text-sm">
                          {shortTitle.length > 30 ? shortTitle.substring(0, 27) + "..." : shortTitle}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:w-3/4 space-y-6 sm:space-y-8"
          >
            {currentArticles.map((article, index) => (
              <motion.section
                key={index}
                variants={itemVariants}
                id={`article-${index + 1}`}
                className="glass-effect rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-[#C9A227] rounded-full -translate-y-12 translate-x-12 opacity-10"></div>
                <div className="relative">
                  <div className="flex items-center mb-4 sm:mb-6">
                    <article.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-[#C9A227] mr-2 sm:mr-3" />
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                      {article.title}
                    </h2>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {renderContent(article.content)}
                  </div>
                </div>
              </motion.section>
            ))}

            {/* Call to Action */}
            <motion.section
              variants={itemVariants}
              className="text-center py-6 sm:py-8 md:py-12"
            >
              <div className="glass-effect rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-[#C9A227]/20">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                  {currentContent.questions}
                </h3>
                <p className="text-gray-300 mb-4 sm:mb-6 max-w-2xl mx-auto text-sm sm:text-base px-2">
                  {currentContent.contactText}
                </p>
                <Button 
                  onClick={() => navigate("/contact")}
                  className="bg-gradient-to-r from-[#C9A227] to-[#e5c158] text-black font-semibold hover:opacity-90 transition-opacity text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-2.5"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {currentContent.contact}
                </Button>
              </div>
            </motion.section>
          </motion.div>
        </div>
      </main>

      <style>{`
        .glass-effect {
          background: rgba(15, 15, 21, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        @media (max-width: 640px) {
          .glass-effect {
            backdrop-filter: blur(10px);
          }
        }
        
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default TermsPage;