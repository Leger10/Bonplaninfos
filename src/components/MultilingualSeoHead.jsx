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
      const fr_keywords = "bons plans, événements afrique, promotions, sorties, concerts, festivals, gagner de l'argent, Abidjan, Dakar, Cotonou, Lomé, Ouagadougou";
      const en_keywords = "deals, africa events, promotions, outings, concerts, festivals, earn money, Abidjan, Dakar, Cotonou, Lomé, Ouagadougou";

      switch (path) {
        case '/':
          return {
            title: `${t('nav.home')} - ${baseTitle}`,
            description: t('home.meta.description'),
            keywords: t('language') === 'fr' ? fr_keywords : en_keywords,
          };
        case '/events':
        case '/discover':
          return {
            title: `Événements & Bons Plans en Afrique - ${baseTitle}`,
            description: `Trouvez les meilleurs événements, concerts, et promotions près de chez vous en Afrique.`,
            keywords: `événements afrique, bons plans, sorties, ${fr_keywords}`,
          };
        case 'event': // Generic for event detail pages
          return {
            title: `${pageData.title || 'Détail Événement'} - ${baseTitle}`,
            description: pageData.description || `Découvrez tous les détails sur cet événement sur BonPlanInfos.`,
            keywords: `${pageData.title}, ${pageData.category}, ${pageData.city}, ${fr_keywords}`,
          };
        case '/marketing':
        case '/partner-signup':
          return {
            title: `Partenariat - ${baseTitle}`,
            description: `Devenez partenaire BonPlanInfos et lancez un business digital rentable dans votre région.`,
            keywords: `partenariat, business digital, franchise, gagner de l'argent, ${fr_keywords}`,
          };
        case '/pricing':
            return {
              title: `Tarifs & Packs - ${baseTitle}`,
              description: `Découvrez nos packs de pièces et nos offres pour les organisateurs et les partenaires.`,
              keywords: `prix, tarifs, packs pièces, abonnement, ${fr_keywords}`,
            };
        case '/about':
            return {
              title: `À Propos - ${baseTitle}`,
              description: `Découvrez la mission, l'équipe et les valeurs de BonPlanInfos, la plateforme d'événements qui vous récompense.`,
              keywords: `à propos, mission, équipe, valeurs, ${fr_keywords}`,
            };
        default:
          return {
            title: `${baseTitle} - Bons plans et événements en Afrique`,
            description: `La première plateforme africaine qui vous récompense pour chaque partage et téléchargement d'événements.`,
            keywords: fr_keywords,
          };
      }
    };

    const MultilingualSeoHead = ({ pageData = {} }) => {
      const { i18n } = useTranslation();
      const { t } = i18n;
      const location = useLocation();
      const path = location.pathname;
      
      const seo = getSeoDataForPath(path.split('/')[1] || '/', t, pageData);

      const title = pageData.title || seo.title;
      const description = pageData.description || seo.description;
      const keywords = pageData.keywords || seo.keywords;
      const ogImage = pageData.ogImage ? `https://bonplaninfos.imgix.net/${pageData.ogImage.split('/').pop()}?auto=format&fit=max&w=600&h=400` : 'https://horizons-cdn.hostinger.com/b046caa6-31e1-44c9-b7bb-4c0c24e49566/08e3ecec378eb185b9bc3412f675f660.png';
      const canonicalUrl = `https://bonplaninfos.net${path}`;

      const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "BonPlanInfos",
        "url": "https://bonplaninfos.net",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://bonplaninfos.net/events?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      };

      return (
        <Helmet>
          <html lang={i18n.language} />
          <title>{title}</title>
          <meta name="description" content={description} />
          <meta name="keywords" content={keywords} />
          
          <link rel="canonical" href={canonicalUrl} />
          {languages.map(lang => (
            <link 
              key={lang}
              rel="alternate" 
              hrefLang={lang}
              href={`https://bonplaninfos.net/${lang}${path}`}
            />
          ))}
          
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:site_name" content="BonPlanInfos" />
          <meta property="og:image" content={ogImage} />
          <meta property="og:type" content="website" />
          <meta property="og:locale" content={i18n.language} />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={description} />
          <meta name="twitter:image" content={ogImage} />

          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        </Helmet>
      );
    };

    export default MultilingualSeoHead;