import React from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const africanCountries = [
  { code: 'ci', name: { fr: "Côte d'Ivoire", en: "Ivory Coast" }, city: "Abidjan" },
  { code: 'sn', name: { fr: "Sénégal", en: "Senegal" }, city: "Dakar" },
  { code: 'cm', name: { fr: "Cameroun", en: "Cameroon" }, city: "Douala" },
  { code: 'ml', name: { fr: "Mali", en: "Mali" }, city: "Bamako" },
  { code: 'bf', name: { fr: "Burkina Faso", en: "Burkina Faso" }, city: "Ouagadougou" },
  { code: 'bj', name: { fr: "Bénin", en: "Benin" }, city: "Cotonou" },
  { code: 'tg', name: { fr: "Togo", en: "Togo" }, city: "Lomé" },
  { code: 'ga', name: { fr: "Gabon", en: "Gabon" }, city: "Libreville" },
  { code: 'cg', name: { fr: "Congo", en: "Congo" }, city: "Brazzaville" },
  { code: 'cd', name: { fr: "RD Congo", en: "DR Congo" }, city: "Kinshasa" },
  { code: 'gn', name: { fr: "Guinée", en: "Guinea" }, city: "Conakry" },
  { code: 'ne', name: { fr: "Niger", en: "Niger" }, city: "Niamey" },
  { code: 'td', name: { fr: "Tchad", en: "Chad" }, city: "N'Djamena" },
  { code: 'cf', name: { fr: "République Centrafricaine", en: "Central African Republic" }, city: "Bangui" },
  { code: 'mg', name: { fr: "Madagascar", en: "Madagascar" }, city: "Antananarivo" },
  { code: 'gh', name: { fr: "Ghana", en: "Ghana" }, city: "Accra" },
  { code: 'ng', name: { fr: "Nigéria", en: "Nigeria" }, city: "Lagos" },
  { code: 'ke', name: { fr: "Kenya", en: "Kenya" }, city: "Nairobi" },
];

const languages = ['fr', 'en'];

const getSeoDataForPath = (path, t, pageData = {}) => {
  const baseTitle = 'BonPlanInfos';
  const baseDescription = {
    fr: "La plateforme qui récompense vos découvertes d'événements en Afrique. Trouvez des bons plans, gagnez de l'argent et vivez des expériences uniques.",
    en: "The platform that rewards your event discoveries in Africa. Find great deals, earn money and live unique experiences."
  };

  const keywords = {
    fr: "bons plans, événements afrique, promotions, sorties, concerts, festivals, gagner de l'argent, Abidjan, Dakar, Cotonou, Lomé, Ouagadougou, récompenses, pièces, téléchargement",
    en: "deals, africa events, promotions, outings, concerts, festivals, earn money, Abidjan, Dakar, Cotonou, Lomé, Ouagadougou, rewards, coins, downloads"
  };

  const currentLang = t('language') || 'fr';
  const defaultKeywords = keywords[currentLang] || keywords.fr;

  const routes = {
    '/': {
      title: `${t('nav.home', 'Accueil')} - ${baseTitle}`,
      description: t('home.meta.description', baseDescription[currentLang]),
      keywords: defaultKeywords,
    },
    '/events': {
      title: `${t('nav.events', 'Événements')} - ${baseTitle}`,
      description: currentLang === 'fr'
        ? "Découvrez tous les événements, concerts et activités près de chez vous en Afrique. Réservez vos places et gagnez des récompenses."
        : "Discover all events, concerts and activities near you in Africa. Book your tickets and earn rewards.",
      keywords: `événements, concerts, activités, ${defaultKeywords}`,
    },
    '/discover': {
      title: `Découvrir - ${baseTitle}`,
      description: currentLang === 'fr'
        ? "Explorez les meilleurs événements et promotions dans votre ville. Ne manquez plus jamais une occasion de vous amuser."
        : "Explore the best events and promotions in your city. Never miss a chance to have fun again.",
      keywords: `découvrir, explorer, ${defaultKeywords}`,
    },
    '/event': {
      title: `${pageData.title || t('nav.event', 'Événement')} - ${baseTitle}`,
      description: pageData.description || (currentLang === 'fr'
        ? "Découvrez tous les détails de cet événement exclusif. Réservez maintenant et ne manquez pas cette expérience unique."
        : "Discover all the details of this exclusive event. Book now and don't miss this unique experience."),
      keywords: `${pageData.title || ''}, ${pageData.category || ''}, ${pageData.city || ''}, ${defaultKeywords}`,
    },
    '/marketing': {
      title: `Partenariat - ${baseTitle}`,
      description: currentLang === 'fr'
        ? "Devenez partenaire BonPlanInfos et lancez un business digital rentable dans votre région. Rejoignez notre réseau d'ambassadeurs."
        : "Become a BonPlanInfos partner and launch a profitable digital business in your region. Join our ambassador network.",
      keywords: `partenariat, franchise, business, ${defaultKeywords}`,
    },
    '/partner-signup': {
      title: `Devenir Partenaire - ${baseTitle}`,
      description: currentLang === 'fr'
        ? "Rejoignez le réseau BonPlanInfos en tant que partenaire. Développez votre business et générez des revenus dans le digital."
        : "Join the BonPlanInfos network as a partner. Develop your business and generate digital income.",
      keywords: `devenir partenaire, inscription, ${defaultKeywords}`,
    },
    '/pricing': {
      title: `Tarifs & Packs - ${baseTitle}`,
      description: currentLang === 'fr'
        ? "Découvrez nos packs de pièces et nos offres pour les organisateurs et les partenaires. Choisissez la formule qui vous convient."
        : "Discover our coin packs and offers for organizers and partners. Choose the plan that suits you.",
      keywords: `tarifs, prix, packs, abonnements, ${defaultKeywords}`,
    },
    '/about': {
      title: `À Propos - ${baseTitle}`,
      description: currentLang === 'fr'
        ? "Découvrez la mission, l'équipe et les valeurs de BonPlanInfos, la plateforme d'événements qui vous récompense en Afrique."
        : "Discover the mission, team and values of BonPlanInfos, the event platform that rewards you in Africa.",
      keywords: `à propos, mission, équipe, valeurs, ${defaultKeywords}`,
    },
    '/wallet': {
      title: `Portefeuille - ${baseTitle}`,
      description: currentLang === 'fr'
        ? "Gérez votre portefeuille BonPlanInfos. Consultez votre solde de pièces, vos transactions et retirez vos gains."
        : "Manage your BonPlanInfos wallet. Check your coin balance, transactions and withdraw your earnings.",
      keywords: `portefeuille, pièces, transactions, retraits, ${defaultKeywords}`,
    },
    '/profile': {
      title: `Profil - ${baseTitle}`,
      description: currentLang === 'fr'
        ? "Gérez votre profil BonPlanInfos. Personnalisez vos préférences et consultez votre activité."
        : "Manage your BonPlanInfos profile. Customize your preferences and view your activity.",
      keywords: `profil, compte, paramètres, ${defaultKeywords}`,
    }
  };

  return routes[path] || {
    title: `${baseTitle} - ${baseDescription[currentLang]?.split('.')[0]}`,
    description: baseDescription[currentLang],
    keywords: defaultKeywords,
  };
};

const MultilingualSeoHead = ({ pageData = {} }) => {
  const { i18n } = useTranslation();
  const location = useLocation();

  // Extraire le chemin principal (premier segment après /)
  const pathSegments = location.pathname.split('/').filter(segment => segment);
  const mainPath = pathSegments[0] ? `/${pathSegments[0]}` : '/';

  // Vérifier si c'est une page de détail d'événement
  const isEventDetail = pathSegments[0] === 'event' && pathSegments[1];

  const seoPath = isEventDetail ? '/event' : mainPath;
  const seo = getSeoDataForPath(seoPath, i18n.t, pageData);

  const title = pageData.title || seo.title;
  const description = pageData.description || seo.description;
  const keywords = pageData.keywords || seo.keywords;

  // Gestion des images OG
  const getOgImage = () => {
    if (pageData.ogImage) {
      return `https://bonplaninfos.imgix.net/${pageData.ogImage.split('/').pop()}?auto=format&fit=max&w=1200&h=630`;
    }
    if (pageData.cover_image) {
      return `https://bonplaninfos.imgix.net/${pageData.cover_image.split('/').pop()}?auto=format&fit=max&w=1200&h=630`;
    }
    return 'https://horizons-cdn.hostinger.com/b046caa6-31e1-44c9-b7bb-4c0c24e49566/08e3ecec378eb185b9bc3412f675f660.png';
  };

  const ogImage = getOgImage();
  const canonicalUrl = `https://bonplaninfos.net${location.pathname}`;
  const currentLang = i18n.language || 'fr';

  // Données structurées Schema.org
  const getStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://bonplaninfos.net/#website",
          "url": "https://bonplaninfos.net",
          "name": "BonPlanInfos",
          "description": seo.description,
          "inLanguage": currentLang,
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://bonplaninfos.net/events?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "Organization",
          "@id": "https://bonplaninfos.net/#organization",
          "name": "BonPlanInfos",
          "url": "https://bonplaninfos.net",
          "logo": {
            "@type": "ImageObject",
            "url": "https://bonplaninfos.net/logo.png",
            "width": 200,
            "height": 200
          },
          "description": seo.description
        }
      ]
    };

    // Ajouter des données d'événement si disponible
    if (isEventDetail && pageData && pageData.event) {
      const event = pageData.event;
      const startDate = event.event_start_at || event.event_date;
      const endDate = event.event_end_at || event.event_end_date || startDate;
      const locationName = event.venue || event.location || event.city;
      
      const eventData = {
        "@type": "Event",
        "name": event.title || pageData.title,
        "description": event.description || pageData.description || seo.description,
        "image": ogImage
      };

      // Ajouter les dates seulement si elles existent
      if (startDate) {
        eventData.startDate = startDate;
      }
      if (endDate) {
        eventData.endDate = endDate;
      }

      // Ajouter le lieu seulement si des informations de lieu existent
      if (locationName || event.city) {
        eventData.location = {
          "@type": "Place",
          "name": locationName,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": event.city || '',
            "addressCountry": event.country || ''
          }
        };
      }

      // Ajouter l'organisateur si disponible
      if (event.organizer_name) {
        eventData.organizer = {
          "@type": "Organization",
          "name": event.organizer_name
        };
      }

      baseData["@graph"].push(eventData);
    }

    return baseData;
  };

  const structuredData = getStructuredData();

  return (
    <Helmet>
      <html lang={currentLang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />

      {/* Canonical et alternates */}
      <link rel="canonical" href={canonicalUrl} />
      {languages.map(lang => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`https://bonplaninfos.net/${lang}${location.pathname}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="BonPlanInfos" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type" content={isEventDetail ? "event" : "website"} />
      <meta property="og:locale" content={currentLang === 'fr' ? 'fr_FR' : 'en_US'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@bonplaninfos" />

      {/* Schema.org structured data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>

      {/* Additional meta tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#3B82F6" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    </Helmet>
  );
};

export default MultilingualSeoHead;