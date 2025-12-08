import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Utility function for retrying failed fetch operations
 * @param {Function} fn - The async function to retry
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} delay - Base delay in milliseconds (default: 1000)
 * @returns {Promise<any>} - Result of the function
 */
export const fetchWithRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 1.5);
  }
};

/**
 * Formate un montant en devise
 * @param {number|string} amount - Montant à formater
 * @param {string} currency - Code devise (par défaut: FCFA)
 * @param {string} locale - Locale (par défaut: fr-FR)
 * @returns {string} Montant formaté
 */
export function formatCurrency(amount, currency = "FCFA", locale = "fr-FR") {
  try {
    if (amount === null || amount === undefined) return "0 " + currency;

    const numAmount =
      typeof amount === "string"
        ? parseFloat(amount.replace(/\s/g, "").replace(",", "."))
        : amount;

    if (isNaN(numAmount)) {
      return "0 " + currency;
    }

    // Pour le FCFA, on ne veut pas de décimales
    if (currency === "FCFA" || currency === "XOF") {
      return (
        new Intl.NumberFormat(locale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numAmount) +
        " " +
        currency
      );
    }

    // Pour les autres devises
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numAmount);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return String(amount) + " " + currency;
  }
}

export function generateEventStructuredData(event) {
  if (!event) return null;

  const price = event.starting_price_pi || event.price_pi;
  const currency = "π";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.event_date
      ? new Date(event.event_date).toISOString()
      : undefined,
    endDate: event.promotion_end
      ? new Date(event.promotion_end).toISOString()
      : undefined,
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.location,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.address,
        addressLocality: event.city,
        addressCountry: event.country,
      },
      geo:
        event.latitude && event.longitude
          ? {
              "@type": "GeoCoordinates",
              latitude: event.latitude,
              longitude: event.longitude,
            }
          : undefined,
    },
    image: [event.cover_image],
    description: event.description,
    offers:
      price !== null && price !== undefined
        ? {
            "@type": "Offer",
            url: `https://www.bonplaninfos.net/event/${event.id}`,
            price: price,
            priceCurrency: currency,
            availability: "https://schema.org/InStock",
            validFrom: event.created_at
              ? new Date(event.created_at).toISOString()
              : undefined,
          }
        : undefined,
    organizer: {
      "@type": "Person",
      name: event.organizer_name || "Organisateur BonPlanInfos",
    },
    performer:
      event.event_type === "contest"
        ? {
            "@type": "PerformingGroup",
            name: "Participants au concours",
          }
        : undefined,
  };

  // Cleanup undefined fields
  Object.keys(structuredData).forEach((key) => {
    if (structuredData[key] === undefined) {
      delete structuredData[key];
    }
  });

  return structuredData;
}

export function generateBreadcrumbStructuredData(items) {
  if (!items || items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://www.bonplaninfos.net${item.href}`,
    })),
  };
}

/**
 * Formate un nombre avec séparateurs de milliers
 * @param {number|string} num - Nombre à formater
 * @param {string} locale - Locale (par défaut: fr-FR)
 * @returns {string} Nombre formaté
 */
export function formatNumber(num, locale = "fr-FR") {
  if (num === null || num === undefined) return "0";
  const number = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(number)) return "0";
  return new Intl.NumberFormat(locale).format(number);
}

/**
 * Formate une date
 * @param {Date|string} date - Date à formater
 * @param {string} format - Format de date (par défaut: 'dd/MM/yyyy')
 * @returns {string} Date formatée
 */
export function formatDate(date, format = "dd/MM/yyyy") {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();

  return format.replace("dd", day).replace("MM", month).replace("yyyy", year);
}

/**
 * Tronque un texte avec une longueur maximale
 * @param {string} text - Texte à tronquer
 * @param {number} maxLength - Longueur maximale (par défaut: 100)
 * @returns {string} Texte tronqué
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Version simplifiée de formatCurrency (alternative)
 * @param {number|string} amount - Montant à formater
 * @param {string} currency - Code devise (par défaut: FCFA)
 * @returns {string} Montant formaté
 */
export function formatCurrencySimple(amount, currency = "FCFA") {
  if (amount === null || amount === undefined) return "0 " + currency;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 " + currency;
  return num.toLocaleString("fr-FR") + " " + currency;
}