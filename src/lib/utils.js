import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function generateEventStructuredData(event) {
    if (!event) return null;

    const price = event.starting_price_pi || event.price_pi;
    const currency = 'π';

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": event.title,
        "startDate": event.event_date ? new Date(event.event_date).toISOString() : undefined,
        "endDate": event.promotion_end ? new Date(event.promotion_end).toISOString() : undefined,
        "eventAttendanceMode": "https://schema.org/MixedEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {
            "@type": "Place",
            "name": event.location,
            "address": {
                "@type": "PostalAddress",
                "streetAddress": event.address,
                "addressLocality": event.city,
                "addressCountry": event.country,
            },
            "geo": event.latitude && event.longitude ? {
              "@type": "GeoCoordinates",
              "latitude": event.latitude,
              "longitude": event.longitude
            } : undefined
        },
        "image": [
            event.cover_image
         ],
        "description": event.description,
        "offers": price !== null && price !== undefined ? {
            "@type": "Offer",
            "url": `https://www.bonplaninfos.net/event/${event.id}`,
            "price": price,
            "priceCurrency": currency,
            "availability": "https://schema.org/InStock",
            "validFrom": event.created_at ? new Date(event.created_at).toISOString() : undefined,
        } : undefined,
        "organizer": {
            "@type": "Person",
            "name": event.organizer_name || 'Organisateur BonPlanInfos'
        },
        "performer": event.event_type === 'contest' ? {
            "@type": "PerformingGroup",
            "name": "Participants au concours"
        } : undefined
    };
    
    // Cleanup undefined fields
    Object.keys(structuredData).forEach(key => {
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
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": `https://www.bonplaninfos.net${item.href}`
        }))
    };
}