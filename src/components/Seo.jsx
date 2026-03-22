import React from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Seo = ({
  title,
  description,
  imageUrl,
  type = "website",
  canonicalUrl,
  noindex = false,
  article,
  event,
  product
}) => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const currentLanguage = i18n.language || 'fr';

  const siteName = "BonPlanInfos - Votre Guide Événements & Récompenses en Afrique";
  const siteUrl = "https://www.bonplaninfos.net";
  const defaultTitle = "🎯 BonPlanInfos • Événements Exclusifs + Gagnez de l'Argent + organiser vos événements 💰";
  const defaultDescription = "🚀 Découvrez les événements tendance, concerts VIP et bons plans cachés. Gagnez des récompenses sur chaque partage ! 🎁 Rejoignez la communauté #1 en Afrique.";
  const defaultImageUrl = "https://res.cloudinary.com/dprp6vxv6/image/upload/v1722428610/bpi/logo-BPI-v2-transparent_pmsz7v.png";

  const seo = {
    title: title ? `${title} • ${siteName}` : defaultTitle,
    description: description || defaultDescription,
    image: imageUrl || defaultImageUrl,
    url: canonicalUrl || `${siteUrl}${location.pathname}`,
    type
  };

  const africanCountries = ["ci","sn","cm","ml","bf","bj","tg","ga","cg","cd","gn","ne","td","cf","mg","gh","ng","ke"];
  const languages = ["fr","en"];

  // JSON-LD Structured Data
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
          "publisher": { "@type": "Organization", "@id": `${siteUrl}/#organization` },
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
            "https://www.youtube.com/bonplaninfos",
            "https://twitter.com/bonplaninfos"
          ],
          "address": { "@type": "PostalAddress", "addressCountry": "CI" }
        }
      ]
    };

    if (article) {
      baseData["@graph"].push({
        "@type": "Article",
        "headline": article.title || seo.title,
        "description": article.description || seo.description,
        "image": article.image || seo.image,
        "datePublished": article.publishedTime,
        "dateModified": article.modifiedTime,
        "author": { "@type": "Person", "name": article.author || siteName },
        "publisher": { "@type": "Organization", "@id": `${siteUrl}/#organization` }
      });
    }

    if (event) {
      baseData["@graph"].push({
        "@type": "Event",
        "name": event.name || seo.title,
        "description": event.description || seo.description,
        "image": event.image || seo.image,
        "startDate": event.startDate,
        "endDate": event.endDate,
        "eventStatus": event.eventStatus || "https://schema.org/EventScheduled",
        "eventAttendanceMode": event.eventAttendanceMode || "https://schema.org/OfflineEventAttendanceMode",
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
        "organizer": { "@type": "Organization", "@id": `${siteUrl}/#organization` },
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

    if (product) {
      baseData["@graph"].push({
        "@type": "Product",
        "name": product.name,
        "image": product.image || seo.image,
        "description": product.description || seo.description,
        "brand": { "@type": "Brand", "name": siteName },
        "offers": {
          "@type": "Offer",
          "url": seo.url,
          "priceCurrency": product.priceCurrency || "XOF",
          "price": product.price,
          "availability": product.availability || "https://schema.org/InStock",
          "seller": { "@type": "Organization", "@id": `${siteUrl}/#organization` }
        }
      });
    }

    return baseData;
  };

  const structuredData = generateStructuredData();

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={seo.url} />

      {/* Open Graph */}
      <meta property="og:type" content={seo.type} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={currentLanguage === 'fr' ? 'fr_FR' : 'en_US'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />

      {/* Hreflang pour tous les pays africains */}
      {languages.map(lang =>
        africanCountries.map(country => (
          <link
            key={`${lang}-${country}`}
            rel="alternate"
            hrefLang={`${lang}-${country.toUpperCase()}`}
            href={`${siteUrl}/${lang}/${country}${location.pathname}`}
          />
        ))
      )}
      <link rel="alternate" hrefLang="x-default" href={siteUrl} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>

      {/* Preconnect / Performance */}
      <link rel="preconnect" href="https://res.cloudinary.com" />
      <link rel="dns-prefetch" href="https://res.cloudinary.com" />
    </Helmet>
  );
};

export default Seo;