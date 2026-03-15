import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useMemo } from "react";

const BASE_URL = "https://bonplaninfos.net";
const DEFAULT_IMAGE =
  "https://res.cloudinary.com/dprp6vxv6/image/upload/v1722428610/bpi/logo-BPI-v2-transparent_pmsz7v.png";

const LANGUAGES = ["fr", "en"];
const AFRICAN_COUNTRIES = [
  "ci", "sn", "cm", "ml", "bf", "bj", "tg", "ga", "cg", "cd",
  "gn", "ne", "td", "cf", "mg", "gh", "ng", "ke",
];

// Nettoyer le chemin en retirant les éventuels préfixes de langue/pays
const getBasePath = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  // Si le premier segment est une langue et le second un pays, on les retire
  if (
    segments.length >= 2 &&
    LANGUAGES.includes(segments[0]) &&
    AFRICAN_COUNTRIES.includes(segments[1])
  ) {
    return "/" + segments.slice(2).join("/");
  }
  // Si seulement la langue est présente (ex: /fr/...)
  if (segments.length >= 1 && LANGUAGES.includes(segments[0])) {
    return "/" + segments.slice(1).join("/");
  }
  return pathname;
};

/**
 * Génère les données structurées pour une page événement
 */
const generateEventStructuredData = (event, url, lang) => {
  const offers = [];

  if (event.event_type === "ticketing" && Array.isArray(event.ticket_types)) {
    event.ticket_types.forEach((ticket) => {
      if (ticket.name && ticket.price_fcfa !== undefined) {
        offers.push({
          "@type": "Offer",
          name: ticket.name,
          price: ticket.price_fcfa,
          priceCurrency: "XOF",
          availability:
            ticket.quantity > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut",
          url,
        });
      }
    });
  }

  // Si aucune offre n'a été ajoutée, on en crée une par défaut
  if (offers.length === 0) {
    offers.push({
      "@type": "Offer",
      price: event.price || "0",
      priceCurrency: "XOF",
      availability: "https://schema.org/InStock",
      url,
    });
  }

  const eventData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    image: event.cover_image || DEFAULT_IMAGE,
    startDate: event.event_start_at,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue || event.city,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.address,
        addressLocality: event.city,
        addressCountry: event.country,
      },
    },
    offers,
    organizer: {
      "@type": "Organization",
      name: event.organizer_name || "BonPlanInfos",
      url: BASE_URL,
    },
  };

  // N'ajouter endDate que si elle existe
  if (event.event_end_at) {
    eventData.endDate = event.event_end_at;
  }

  return eventData;
};

export default function MultilingualSeoHead({ pageData = {} }) {
  const { i18n } = useTranslation();
  const location = useLocation();

  const lang = i18n.language?.split("-")[0] || "fr";
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const isEventPage = pathSegments[0] === "event" && pathSegments[1];
  const event = pageData.event || null;

  // Métadonnées de base
  const title = pageData.title || (isEventPage ? event?.title : "BonPlanInfos");
  const description =
    pageData.description ||
    (lang === "fr"
      ? "Découvrez les meilleurs événements, concerts et bons plans en Afrique. Réservez vos places et gagnez des récompenses."
      : "Discover the best events, concerts and deals in Africa. Book your tickets and earn rewards.");
  const keywords =
    pageData.keywords ||
    (lang === "fr"
      ? `événements, concerts, festivals, bons plans, ${AFRICAN_COUNTRIES.map((c) => c.toUpperCase()).join(", ")}`
      : `events, concerts, festivals, deals, ${AFRICAN_COUNTRIES.map((c) => c.toUpperCase()).join(", ")}`);

  // Chemin de base sans préfixe langue/pays
  const basePath = getBasePath(location.pathname);
  const canonical = `${BASE_URL}${basePath}`;
  const ogImage = pageData.ogImage || event?.cover_image || DEFAULT_IMAGE;

  // Génération des liens hreflang (mémorisée)
  const hreflangLinks = useMemo(() => {
    const links = [];
    LANGUAGES.forEach((l) => {
      AFRICAN_COUNTRIES.forEach((country) => {
        links.push({
          rel: "alternate",
          hrefLang: `${l}-${country.toUpperCase()}`,
          href: `${BASE_URL}/${l}/${country}${basePath}`,
        });
      });
    });
    links.push({
      rel: "alternate",
      hrefLang: "x-default",
      href: canonical,
    });
    return links;
  }, [basePath, canonical]);

  // Données structurées globales
  const structuredData = useMemo(() => {
    const graph = [
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: "BonPlanInfos",
        description,
        inLanguage: lang,
        publisher: { "@id": `${BASE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${BASE_URL}/events?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "BonPlanInfos",
        url: BASE_URL,
        logo: {
          "@type": "ImageObject",
          url: DEFAULT_IMAGE,
        },
        sameAs: [
          "https://web.facebook.com/Bonolaninfos/",
          "https://www.tiktok.com/@bonplaninfos",
          "https://www.youtube.com/@bonplaninfos",
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: BASE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Événements",
            item: `${BASE_URL}/events`,
          },
        ],
      },
    ];

    if (isEventPage && event) {
      graph.push(generateEventStructuredData(event, canonical, lang));
    }

    return {
      "@context": "https://schema.org",
      "@graph": graph,
    };
  }, [description, lang, isEventPage, event, canonical]);

  return (
    <Helmet>
      {/* Balises de base */}
      <html lang={lang} />
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta
        name="robots"
        content="index, follow, max-image-preview:large, max-snippet:-1"
      />
      <link rel="canonical" href={canonical} />

      {/* Hreflang */}
      {hreflangLinks.map((link, i) => (
        <link
          key={i}
          rel={link.rel}
          hrefLang={link.hrefLang}
          href={link.href}
        />
      ))}

      {/* Open Graph */}
      <meta property="og:type" content={isEventPage ? "event" : "website"} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="BonPlanInfos" />
      <meta property="og:locale" content={lang === "fr" ? "fr_FR" : "en_US"} />

      {/* Balises spécifiques événement */}
      {isEventPage && event && (
        <>
          <meta property="event:start_time" content={event.event_start_at} />
          {event.event_end_at && (
            <meta property="event:end_time" content={event.event_end_at} />
          )}
          {event.location?.latitude && (
            <meta
              property="event:location:latitude"
              content={event.location.latitude}
            />
          )}
          {event.location?.longitude && (
            <meta
              property="event:location:longitude"
              content={event.location.longitude}
            />
          )}
        </>
      )}

      {/* Twitter Card (utilisé aussi par TikTok) */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@bonplaninfos" />
      <meta name="twitter:creator" content="@bonplaninfos" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {isEventPage && event && (
        <>
          <meta name="twitter:label1" value="Date" />
          <meta
            name="twitter:data1"
            value={new Date(event.event_start_at).toLocaleDateString(lang)}
          />
          <meta name="twitter:label2" value="Lieu" />
          <meta
            name="twitter:data2"
            value={`${event.city}, ${event.country}`}
          />
        </>
      )}

      {/* Données structurées JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>

      {/* Préconnexions */}
      <link rel="preconnect" href="https://res.cloudinary.com" />
      <link rel="dns-prefetch" href="https://res.cloudinary.com" />
    </Helmet>
  );
}