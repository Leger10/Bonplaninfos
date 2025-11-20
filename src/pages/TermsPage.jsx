import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { ArrowLeft, BookOpen, Shield, FileText, DollarSign, Users, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TermsPage = () => {
    const navigate = useNavigate();
    const [language, setLanguage] = useState('fr');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5
            }
        }
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
            contactText: "Notre équipe est disponible pour vous accompagner et répondre à toutes vos interrogations concernant nos conditions d'utilisation.",

            articles: [
                {
                    icon: Shield,
                    title: "Article 1 : Objet et Acceptation",
                    content: `
            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme BonPlanInfos (bonplaninfos.net), application de mise en relation entre créateurs de contenu, organisateurs d'événements, annonceurs et utilisateurs en Afrique.
            
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

            ### Option A - Pour les Investisseurs-Fondateurs
            Le partenaire investit **100.000f à 500.000f** pour obtenir la licence d'exploitation pour son pays.

            **Revenue Sharing :** 60% pour le partenaire local / 40% pour la maison mère
            - Les 60% couvrent : marketing local, équipe, frais opérationnels
            - Les 40% couvrent : maintenance technique, développement, support global

            ### Option B - Pour les Gestionnaires Salariés
            **Système de Paiement Centralisé :**

            **Processus de Répartition :**
            1. Tous les paiements arrivent sur le compte central BonPlanInfos
            2. Le système tracke automatiquement les revenus par pays
            3. Les rapports financiers sont générés le 01 de chaque mois
            4. Les virements aux partenaires sont effectués le 05 du mois
            5. Reçu et justificatifs fournis pour chaque transaction
          `
                },
                {
                    icon: FileText,
                    title: "Article 2 : Définitions",
                    content: `
            - **Plateforme :** Application et site web BonPlanInfos
            - **Utilisateur :** Toute personne utilisant la plateforme
            - **Créateur ou Organisateur :** Utilisateur publiant du contenu (événements, promotions)
            - **Organisateur :** Créateur organisant des événements payants ou gratuits
            - **Annonceur ou Utilisateur :** Utilisateur publiant des promotions commerciales
            - **Pièces :** Monnaie virtuelle de la plateforme (50 pièce = 500 FCFA)
            - **Contenu :** Événements, promotions, publications, commentaires, notification a temps réel.
          `
                },
                {
                    icon: Users,
                    title: "Article 3 : Inscription et Compte",
                    content: `
            ### 3.1 L'inscription nécessite :
            - Une adresse email valide
            - Un numéro de téléphone vérifié
            - Votre Pays et ville de résidence
            - L'acceptation des CGU et de la politique de confidentialité

            ### 3.2 Les utilisateurs s'engagent à :
            - Fournir des informations exactes et complètes
            - Maintenir la confidentialité de leurs identifiants
            - Informer immédiatement de toute utilisation non autorisée

            ### 3.3 Types de comptes :
            - Utilisateur standard (accès gratuit aux fonctionnalités de base)
            - Organisateur: (publication d'événements, vérification requise)
            - Annonceur Utilisateur: (publication de promotions, vérification requise)
            - Admin (gestion de plateforme)

            ### 3.4 Contenus et responsabilités
            Vous vous engagez à ne pas publier de contenus offensants, illégaux, ou portant atteinte aux droits de tiers.

            BonPlaninfos se réserve le droit de supprimer tout contenu qui ne respecte pas nos standards.
          `
                },
                {
                    icon: DollarSign,
                    title: "Article 4 : Système de Pièces et Monétisation",
                    content: `
            ### 4.1 Acquisition de pièces :
            - Achat via packs (50 à 1.000.000 pièces)
            - Parrainage (20 pièces par filleul actif)
            - Récompenses pour contenu populaire
            - Participation aux programmes de fidélité

            ### 4.2 Utilisation des pièces :
            - Publication d'événements (coût variable)
            - Publication de promotions (coût variable)
            - Boost de visibilité du contenu
            - Accès à du contenu exclusif

            ### 4.3 Conversion et retraits :
            - Taux de conversion : 50 pièces = 500 FCFA
            - Seuil minimal de retrait : 50 pièces
            - Modalités de retrait : Orange Money, Moov Money, Wave, PayPal
            - Délai de traitement : 24-72 heures

            ### 4.4 Politique de remboursement :
            - Aucun remboursement des pièces achetées
            - Annulation d'événement : remboursement des pièces utilisées
            - Content supprimé : pas de remboursement des pièces dépensées
          `
                },
                {
                    icon: BookOpen,
                    title: "Article 5 : Contenu et Publications",
                    content: `
            ### 5.1 Responsabilités des créateurs :
            - Exactitude des informations publiées
            - Respect des droits d'auteur et propriété intellectuelle
            - Conformité avec la législation locale
            - Obtenir les autorisations nécessaires pour les événements

            ### 5.2 Contenu interdit :
            - Contenu illégal ou frauduleux
            - Contenu discriminatoire ou haineux
            - Contenu pornographique ou explicite
            - Informations commerciales trompeuses
            - Spam et contenus répétitifs

            ### 5.3 Modération :
            - Droit de modération a posteriori par BonPlanInfos
            - Possibilité de suppression sans préavis des contenus non conformes
            - Système de signalement par les utilisateurs
          `
                },
                {
                    icon: Shield,
                    title: "Article 6 : Propriété Intellectuelle",
                    content: `
            ### 6.1 Contenu utilisateur :
            - Les utilisateurs conservent leurs droits sur leur contenu
            - Licence d'utilisation accordée à BonPlanInfos pour l'exploitation de la plateforme

            ### 6.2 Plateforme BonPlanInfos :
            - Marque, logo et éléments graphiques protégés
            - Code source et architecture technique protégés
            - Interdiction de reproduction sans autorisation

            Le Partenaire reconnaît que la plateforme, son code source, sa base de données et la marque BonPlanInfos sont et restent la propriété exclusive du Fondateur Principal.
          `
                },
                {
                    icon: FileText,
                    title: "Article 7 : Données Personnelles",
                    content: `
            ### 7.1 Collecte et utilisation :
            - Données collectées : identité, coordonnées, localisation, contenus, interactions
            - Finalités : fourniture du service, personnalisation, analytics, marketing

            ### 7.2 Cookies et traceurs :
            - Utilisation de cookies techniques et analytiques
            - Consentement requis pour les cookies marketing
            - Possibilité de désactivation dans les paramètres

            ### 7.3 Droits des utilisateurs :
            - Droit d'accès, rectification, opposition, suppression
            - Contact : bonplaninfos@gmail.com
            - Délai de réponse : 30 jours maximum
          `
                },
                {
                    icon: Users,
                    title: "Article 8 : Responsabilités",
                    content: `
            ### 8.1 Responsabilité de BonPlanInfos :
            - Fourniture du service avec diligence raisonnable
            - Non responsable des contenus publiés par les utilisateurs
            - Obligation de moyens, non de résultat

            ### 8.2 Responsabilité des utilisateurs :
            - Exactitude des informations publiées
            - Respect des engagements envers les autres utilisateurs
            - Utilisation conforme aux lois en vigueur

            ### 8.3 Force majeure :
            - Interruptions de service pour maintenance technique
            - Cas de force majeure (panne infrastructure, etc.)
          `
                },
                {
                    icon: DollarSign,
                    title: "Article 9 : Transactions et Paiements",
                    content: `
            ### 9.1 Événements payants :
            - traitement des paiements via partenaires certifiés
            - Retrait ; Commission de 2% est appliquée sur les transactions
            - Paiement aux organisateurs sous 5 jours ouvrés

            ### 9.2 Promotions payantes :
            - Tarification selon visibilité et durée
            - Aucun remboursement après publication

            ### 9.3 Paiements et commissions
            Les commissions et gains sont versés selon les conditions établies sur la plateforme.

            BonPlaninfos ne peut être tenu responsable des retards ou erreurs de paiement causés par des informations incorrectes fournies par l'utilisateur

            ### 9.3 Litiges :
            - Médiation prioritaire en cas de litige entre utilisateurs
            - Recours possibles auprès des autorités compétentes
          `
                },
                {
                    icon: BookOpen,
                    title: "Article 10 : Suspension et Résiliation",
                    content: `
            ### 10.1 Par l'utilisateur :
            - Résiliation à tout temps via paramètres du compte
            - Suppression des données conformément à la politique de conservation

            ### 10.2 Par BonPlanInfos :
            - Suspension immédiate en cas de violation des CGU
            - Résiliation après avertissement sans régularisation
            - Conservation des données en cas d'obligation légale
          `
                },
                {
                    icon: Shield,
                    title: "Article 11 : Évolutions et Modifications",
                    content: `
            ### 11.1 Service :
            - BonPlanInfos se réserve le droit de faire évoluer les fonctionnalités
            - Information des utilisateurs des modifications substantielles

            ### 11.2 CGU :
            - Modification possible à tout temps
            - Information par email et notification dans l'application
            - Acceptation implicite si poursuite d'utilisation
          `
                },
                {
                    icon: FileText,
                    title: "Article 12 : Loi Applicable et Litiges",
                    content: `
            ### 12.1 Loi applicable :
            - Droit applicable : selon pays d'incorporation
            - Langue d'interprétation : français

            ### 12.2 Règlement des litiges :
            - Tentative de médiation obligatoire
            - Recours aux tribunaux compétents en cas d'échec
          `
                },
                {
                    icon: Users,
                    title: "Article 13 : Dispositions Diverses",
                    content: `
            **13.1 Indépendance des parties :** Aucune relation de société ou de mandat
            **13.2 Divisibilité :** Nullité partielle n'affectant pas le reste des dispositions
            **13.3 Non-renonciation :** Absence de poursuite ne valant pas renonciation
          `
                },
                {
                    icon: Mail,
                    title: "Article 14 : Contact",
                    content: `
            Pour toute question concernant les CGU :

            - Email : légal bonplaninfos@gmail.com
            - Adresse postale : [bonplaninfos@gmail.com]
            - Délai de réponse : 15 jours ouvrés
          `
                }
            ]
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
            contactText: "Our team is available to assist you and answer all your questions regarding our terms of use.",

            articles: [
                {
                    icon: Shield,
                    title: "Article 1: Purpose and Acceptance",
                    content: `
            These General Terms of Use (GTU) govern the use of the BonPlanInfos platform (bonplaninfos.net), a connection application between content creators, event organizers, advertisers and users in Africa.
            
            **Acceptance:** Use of the platform implies unreserved acceptance of these GTU.

            ### Section 1 - Access and Responsibilities
            The Country Administrator undertakes to:
            - Maintain the confidentiality of their credentials
            - Not share their admin access with third parties
            - Respect BonPlanInfos content guidelines
            - Actively moderate ads in their territory
            - Report any suspicious behavior to the Super Admin

            **Strict prohibitions:**
            - Attempt to access data from other countries
            - Modify the technical structure of the platform
            - Install unauthorized extensions
            - Use the platform for personal purposes

            ### Section 2 - Content Standards
            Each Country Administrator must guarantee:
            - The authenticity of published ads
            - Compliance with local commercial laws
            - Moderation of inappropriate content within 24 hours
            - Verification of advertiser contact details

            ### Option A - For Investor-Founders
            The partner invests **2,550,000F** to obtain the operating license for their country.

            **Revenue Sharing:** 60% for local partner / 40% for headquarters
            - The 60% covers: local marketing, team, operational expenses
            - The 40% covers: technical maintenance, development, global support

            ### Option B - For Salaried Managers
            **Centralized Payment System:**

            **Distribution Process:**
            1. All payments go to the central BonPlanInfos account
            2. The system automatically tracks revenue by country
            3. Financial reports are generated on the 5th of each month
            4. Transfers to partners are made on the 15th of the month
            5. Receipt and supporting documents provided for each transaction
          `
                },
                {
                    icon: FileText,
                    title: "Article 2: Definitions",
                    content: `
            - **Platform:** BonPlanInfos application and website
            - **User:** Any person using the platform
            - **Creator or Organizer:** User publishing content (events, promotions)
            - **Organizer:** Creator organizing paid or free events
            - **Advertiser or User:** User publishing commercial promotions
            - **Coins:** Virtual platform currency (50 coins = 500 FCFA)
            - **Content:** Events, promotions, publications, comments, real-time notifications
          `
                },
                {
                    icon: Users,
                    title: "Article 3: Registration and Account",
                    content: `
            ### 3.1 Registration requires:
            - A valid email address
            - A verified phone number
            - Your country and city of residence
            - Acceptance of the GTU and privacy policy

            ### 3.2 Users undertake to:
            - Provide accurate and complete information
            - Maintain the confidentiality of their credentials
            - Immediately report any unauthorized use

            ### 3.3 Account types:
            - Standard user (free access to basic features)
            - Organizer: (event publication, verification required)
            - Advertiser User: (promotion publication, verification required)
            - Admin (platform management)

            ### 3.4 Content and responsibilities
            You agree not to publish offensive, illegal content, or content that infringes on third-party rights.

            BonPlaninfos reserves the right to remove any content that does not meet our standards.
          `
                },
                {
                    icon: DollarSign,
                    title: "Article 4: Coin System and Monetization",
                    content: `
            ### 4.1 Coin acquisition:
            - Purchase via packs (50 to 1300 coins)
            - Referral (20 coins per active referral)
            - Rewards for popular content
            - Participation in loyalty programs

            ### 4.2 Coin usage:
            - Event publication (variable cost)
            - Promotion publication (variable cost)
            - Content visibility boost
            - Access to exclusive content

            ### 4.3 Conversion and withdrawals:
            - Conversion rate: 50 coins = 500 FCFA
            - Minimum withdrawal threshold: 50 coins
            - Withdrawal methods: Orange Money, Moov Money, Wave, Visa, PayPal
            - Processing time: 24-72 hours

            ### 4.4 Refund policy:
            - No refund for purchased coins
            - Event cancellation: refund of coins used
            - Deleted content: no refund of spent coins
          `
                },
                {
                    icon: BookOpen,
                    title: "Article 5: Content and Publications",
                    content: `
            ### 5.1 Creator responsibilities:
            - Accuracy of published information
            - Respect for copyright and intellectual property
            - Compliance with local legislation
            - Obtain necessary authorizations for events

            ### 5.2 Prohibited content:
            - Illegal or fraudulent content
            - Discriminatory or hateful content
            - Pornographic or explicit content
            - Misleading commercial information
            - Spam and repetitive content

            ### 5.3 Moderation:
            - Right of a posteriori moderation by BonPlanInfos
            - Possibility of removal without notice for non-compliant content
            - User reporting system
          `
                },
                {
                    icon: Shield,
                    title: "Article 6: Intellectual Property",
                    content: `
            ### 6.1 User content:
            - Users retain their rights to their content
            - Usage license granted to BonPlanInfos for platform operation

            ### 6.2 BonPlanInfos Platform:
            - Protected brand, logo and graphic elements
            - Protected source code and technical architecture
            - Reproduction prohibited without authorization

            The Partner acknowledges that the platform, its source code, database and BonPlanInfos brand are and remain the exclusive property of the Principal Founder.
          `
                },
                {
                    icon: FileText,
                    title: "Article 7: Personal Data",
                    content: `
            ### 7.1 Collection and use:
            - Data collected: identity, contact details, location, content, interactions
            - Purposes: service provision, personalization, analytics, marketing

            ### 7.2 Cookies and trackers:
            - Use of technical and analytical cookies
            - Consent required for marketing cookies
            - Possibility of deactivation in settings

            ### 7.3 User rights:
            - Right of access, rectification, opposition, deletion
            - Contact: bonplaninfos@gmail.com
            - Response time: maximum 30 days
          `
                },
                {
                    icon: Users,
                    title: "Article 8: Responsibilities",
                    content: `
            ### 8.1 BonPlanInfos responsibility:
            - Provision of service with reasonable diligence
            - Not responsible for content published by users
            - Obligation of means, not of result

            ### 8.2 User responsibility:
            - Accuracy of published information
            - Respect for commitments to other users
            - Use in compliance with applicable laws

            ### 8.3 Force majeure:
            - Service interruptions for technical maintenance
            - Cases of force majeure (infrastructure failure, etc.)
          `
                },
                {
                    icon: DollarSign,
                    title: "Article 9: Transactions and Payments",
                    content: `
            ### 9.1 Paid events:
            - Payment processing via certified partners
            - Withdrawal; 2% commission applied to transactions
            - Payment to Partenariats within 5 working days

            ### 9.2 Paid promotions:
            - Pricing based on visibility and duration
            - No refund after publication

            ### 9.3 Payments and commissions
            Commissions and earnings are paid according to the conditions established on the platform.

            BonPlaninfos cannot be held responsible for payment delays or errors caused by incorrect information provided by the user.

            ### 9.3 Disputes:
            - Priority mediation in case of disputes between users
            - Possible recourse to competent authorities
          `
                },
                {
                    icon: BookOpen,
                    title: "Article 10: Suspension and Termination",
                    content: `
            ### 10.1 By the user:
            - Termination at any time via account settings
            - Data deletion according to retention policy

            ### 10.2 By BonPlanInfos:
            - Immediate suspension in case of GTU violation
            - Termination after warning without regularization
            - Data retention in case of legal obligation
          `
                },
                {
                    icon: Shield,
                    title: "Article 11: Evolution and Modifications",
                    content: `
            ### 11.1 Service:
            - BonPlanInfos reserves the right to evolve features
            - User information of substantial modifications

            ### 11.2 GTU:
            - Modification possible at any time
            - Information by email and in-app notification
            - Implicit acceptance if continued use
          `
                },
                {
                    icon: FileText,
                    title: "Article 12: Applicable Law and Disputes",
                    content: `
            ### 12.1 Applicable law:
            - Applicable law: according to country of incorporation
            - Interpretation language: French

            ### 12.2 Dispute resolution:
            - Mandatory mediation attempt
            - Recourse to competent courts in case of failure
          `
                },
                {
                    icon: Users,
                    title: "Article 13: Miscellaneous Provisions",
                    content: `
            **13.1 Independence of parties:** No partnership or agency relationship
            **13.2 Severability:** Partial nullity not affecting the rest of the provisions
            **13.3 Non-waiver:** Lack of pursuit not constituting waiver
          `
                },
                {
                    icon: Mail,
                    title: "Article 14: Contact",
                    content: `
            For any questions regarding the GTU:

            - Email: legal bonplaninfos@gmail.com
            - Postal address: [bonplaninfos@gmail.com]
            - Response time: 15 working days
          `
                }
            ]
        }
    };

    const currentContent = content[language];

    const renderContent = (text) => {
        const sections = text.split('\n\n');
        return sections.map((section, index) => {
            if (section.startsWith('### ')) {
                return (
                    <h3 key={index} className="text-lg font-semibold text-white mt-4 mb-2">
                        {section.replace('### ', '')}
                    </h3>
                );
            } else if (section.startsWith('**') && section.endsWith('**')) {
                return (
                    <div key={index} className="bg-white/5 rounded-xl p-4 border-l-4 border-[#C9A227] my-3">
                        <p className="font-semibold text-white">
                            {section.replace(/\*\*/g, '')}
                        </p>
                    </div>
                );
            } else if (section.includes(':')) {
                const lines = section.split('\n').filter(line => line.trim());
                return (
                    <div key={index} className="my-4">
                        {lines.map((line, lineIndex) => (
                            <div key={lineIndex} className="flex items-start mb-2">
                                <div className="w-2 h-2 bg-[#C9A227] rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <span className="text-gray-300">{line}</span>
                            </div>
                        ))}
                    </div>
                );
            } else if (section.includes('1.')) {
                const lines = section.split('\n').filter(line => line.trim());
                return (
                    <ol key={index} className="list-decimal list-inside ml-4 space-y-2 my-3">
                        {lines.map((line, lineIndex) => (
                            <li key={lineIndex} className="text-gray-300">
                                {line.replace(/^\d+\.\s*/, '')}
                            </li>
                        ))}
                    </ol>
                );
            } else {
                return (
                    <p key={index} className="text-gray-300 mb-3">
                        {section}
                    </p>
                );
            }
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B0B0D] to-[#1a1a2e] text-white">
            <Helmet>
                <title>{currentContent.title} - BonPlaninfos</title>
                <meta name="description" content={currentContent.title} />
            </Helmet>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12 text-center"
                >
                    <div className="flex justify-between items-center mb-6">
                        <Button
                            variant="ghost"
                            onClick={() => navigate(-1)}
                            className="text-gray-300 hover:text-[#C9A227] border border-gray-700 hover:border-[#C9A227] transition-all duration-300"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {currentContent.back}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
                            className="text-gray-300 hover:text-[#C9A227] border border-gray-700 hover:border-[#C9A227] transition-all duration-300"
                        >
                            <Globe className="w-4 h-4 mr-2" />
                            {language === 'fr' ? 'EN' : 'FR'}
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute -inset-4 bg-gradient-to-r from-[#C9A227] to-[#e5c158] rounded-2xl blur-lg opacity-20"></div>
                        <div className="relative bg-[#0f0f15] border border-gray-800 rounded-2xl p-8">
                            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#C9A227] to-[#e5c158] bg-clip-text text-transparent mb-4">
                                {currentContent.title}
                            </h1>
                            <p className="text-gray-400 text-lg mb-2">
                                {currentContent.subtitle}
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-gray-500">
                                <span>{currentContent.lastUpdate}</span>
                                <span className="hidden sm:block">•</span>
                                <span>{currentContent.effectiveDate}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <div className="glass-effect rounded-2xl p-6 sticky top-8">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                <BookOpen className="w-5 h-5 mr-2 text-[#C9A227]" />
                                {currentContent.navigation}
                            </h3>
                            <nav className="space-y-2">
                                {currentContent.articles.map((section, index) => {
                                    const Icon = section.icon;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                const element = document.getElementById(`article-${index + 1}`);
                                                element?.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center group"
                                        >
                                            <Icon className="w-4 h-4 mr-3 text-[#C9A227] group-hover:scale-110 transition-transform" />
                                            <span className="text-sm">{section.title.split(' : ')[0]}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </motion.div>

                    {/* Main Content */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="lg:col-span-3 space-y-8"
                    >
                        {currentContent.articles.map((article, index) => (
                            <motion.section
                                key={index}
                                variants={itemVariants}
                                id={`article-${index + 1}`}
                                className="glass-effect rounded-2xl p-8 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A227] rounded-full -translate-y-16 translate-x-16 opacity-10"></div>
                                <div className="relative">
                                    <div className="flex items-center mb-6">
                                        <article.icon className="w-8 h-8 text-[#C9A227] mr-3" />
                                        <h2 className="text-2xl font-bold text-white">{article.title}</h2>
                                    </div>

                                    <div className="space-y-4 text-gray-300">
                                        {renderContent(article.content)}
                                    </div>
                                </div>
                            </motion.section>
                        ))}

                        {/* Call to Action */}
                        <motion.section
                            variants={itemVariants}
                            className="text-center py-12"
                        >
                            <div className="glass-effect rounded-2xl p-8 border border-[#C9A227]/20">
                                <h3 className="text-2xl font-bold text-white mb-4">
                                    {currentContent.questions}
                                </h3>
                                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                                    {currentContent.contactText}
                                </p>
                                <Button className="bg-gradient-to-r from-[#C9A227] to-[#e5c158] text-black font-semibold hover:opacity-90 transition-opacity">
                                    <Mail className="w-4 h-4 mr-2" />
                                    {currentContent.contact}
                                </Button>
                            </div>
                        </motion.section>
                    </motion.div>
                </div>
            </main>

            <style jsx>{`
        .glass-effect {
          background: rgba(15, 15, 21, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
        </div>
    );
};

export default TermsPage;