import React from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Seo = ({ 
  title, 
  description, 
  imageUrl, 
  type = 'website', 
  structuredData,
  article,
  event,
  product,
  noindex = false,
  canonicalUrl,
  locale = 'fr_FR'
}) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  
  const currentLanguage = i18n.language || 'fr';
  const siteName = t('seo.siteName', 'BonPlanInfos - Votre Guide Événements & Récompenses');
  const defaultTitle = t('seo.default.title', '🎯 BonPlanInfos • Événements Exclusifs + Gagnez de l\'Argent 💰');
  const defaultDescription = t('seo.default.description', '🚀 Découvrez les événements tendance, concerts VIP et bons plans cachés. Gagnez des récompenses sur chaque partage ! 🎁 Rejoignez la communauté #1 en Afrique.');
  const defaultImageUrl = 'https://res.cloudinary.com/dprp6vxv6/image/upload/v1722428610/bpi/logo-BPI-v2-transparent_pmsz7v.png';
  const siteUrl = 'https://www.bonplaninfos.net';
  
  // Mots-clés dynamiques et percutants
  const powerKeywords = {
    fr: "événements exclusifs, concerts VIP, sorties tendance, gagner argent, récompenses, cashback, bons plans, Afrique, communauté, expériences uniques, soirées, festivals, promotions, économies, sorties entre amis, date night, activités",
    en: "exclusive events, VIP concerts, trending outings, earn money, rewards, cashback, best deals, Africa, community, unique experiences, parties, festivals, promotions, savings, friends outings, date night, activities"
  };

  const seo = {
    title: title 
      ? `🔥 ${title} • ${siteName}` 
      : defaultTitle,
    description: description || defaultDescription,
    image: imageUrl || defaultImageUrl,
    url: canonicalUrl || `${siteUrl}${location.pathname}`,
    type: type,
    locale: currentLanguage === 'fr' ? 'fr_FR' : 'en_US',
    keywords: powerKeywords[currentLanguage] || powerKeywords.fr
  };

  // Données structurées enrichies
  const generateStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${siteUrl}/#website`,
          "url": siteUrl,
          "name": siteName,
          "description": seo.description,
          "inLanguage": currentLanguage,
          "publisher": {
            "@type": "Organization",
            "@id": `${siteUrl}/#organization`
          },
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${siteUrl}/events?search={search_term_string}`,
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`,
          "name": siteName,
          "url": siteUrl,
          "logo": {
            "@type": "ImageObject",
            "url": defaultImageUrl,
            "width": 600,
            "height": 600
          },
          "description": seo.description,
          "sameAs": [
            "https://www.facebook.com/bonplaninfos",
            "https://www.instagram.com/bonplaninfos",
            "https://twitter.com/bonplaninfos"
          ],
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "CI"
          }
        }
      ]
    };

    // Ajouter les données d'article si fournies
    if (article) {
      baseData["@graph"].push({
        "@type": "Article",
        "headline": article.title || seo.title,
        "description": article.description || seo.description,
        "image": article.image || seo.image,
        "datePublished": article.publishedTime,
        "dateModified": article.modifiedTime,
        "author": {
          "@type": "Person",
          "name": article.author || siteName
        },
        "publisher": {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`
        }
      });
    }

    // Ajouter les données d'événement si fournies
    if (event) {
      baseData["@graph"].push({
        "@type": "Event",
        "name": event.name || seo.title,
        "description": event.description || seo.description,
        "image": event.image || seo.image,
        "startDate": event.startDate,
        "endDate": event.endDate,
        "eventStatus": event.eventStatus || "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": {
          "@type": "Place",
          "name": event.locationName,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": event.streetAddress,
            "addressLocality": event.addressLocality,
            "postalCode": event.postalCode,
            "addressCountry": event.addressCountry
          }
        },
        "organizer": {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`
        },
        "offers": {
          "@type": "Offer",
          "url": event.url || seo.url,
          "price": event.price,
          "priceCurrency": event.priceCurrency || "XOF",
          "availability": event.availability || "https://schema.org/InStock",
          "validFrom": event.validFrom
        }
      });
    }

    // Ajouter les données de produit si fournies
    if (product) {
      baseData["@graph"].push({
        "@type": "Product",
        "name": product.name,
        "image": product.image || seo.image,
        "description": product.description || seo.description,
        "brand": {
          "@type": "Brand",
          "name": siteName
        },
        "offers": {
          "@type": "Offer",
          "url": seo.url,
          "priceCurrency": product.priceCurrency || "XOF",
          "price": product.price,
          "availability": product.availability || "https://schema.org/InStock",
          "seller": {
            "@type": "Organization",
            "@id": `${siteUrl}/#organization`
          }
        }
      });
    }

    return structuredData ? { ...baseData, ...structuredData } : baseData;
  };

  const finalStructuredData = generateStructuredData();

  return (
    <Helmet>
      {/* Standard SEO - Optimisé */}
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords} />
      <meta name="author" content={siteName} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={seo.url} />

      {/* Open Graph / Facebook - Optimisé */}
      <meta property="og:type" content={seo.type} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={seo.locale} />
      <meta property="og:see_also" content={siteUrl} />

      {/* Twitter Card - Optimisé */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@bonplaninfos" />
      <meta name="twitter:creator" content="@bonplaninfos" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />
      <meta name="twitter:image:alt" content={seo.title} />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#FF6B35" />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      <meta name="application-name" content={siteName} />
      
      {/* Alternates pour le multilinguisme */}
      <link rel="alternate" hrefLang="fr" href={`${siteUrl}/fr${location.pathname}`} />
      <link rel="alternate" hrefLang="en" href={`${siteUrl}/en${location.pathname}`} />
      <link rel="alternate" hrefLang="x-default" href={siteUrl} />

      {/* Structured Data (JSON-LD) enrichi */}
      <script type="application/ld+json">
        {JSON.stringify(finalStructuredData)}
      </script>

      {/* Preconnects pour performance */}
      <link rel="preconnect" href="https://res.cloudinary.com" />
      <link rel="dns-prefetch" href="https://res.cloudinary.com" />
    </Helmet>
  );
};

// Hook personnalisé pour un usage facile
export const useSeo = (props) => {
  return <Seo {...props} />;
};

export default Seo;