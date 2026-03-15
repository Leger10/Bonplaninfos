import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

console.log("✅ i18n.js chargé");

const detectLanguageByIP = async () => {
  try {
    const res = await fetch("https://api.country.is/");
    const data = await res.json();
    const country = data.country;

    const francophoneCountries = [
      "BJ", "BF", "BI", "CM", "CF", "KM", "CG", "CD", "CI", "DJ",
      "GA", "GN", "GW", "GQ", "MG", "ML", "MA", "MU", "MR", "NE",
      "RW", "ST", "SN", "SC", "TD", "TG", "TN"
    ];

    const anglophoneCountries = [
      "GH", "NG", "LR", "GM", "SL", "UG", "KE", "TZ", "ZM", "ZW",
      "MW", "BW", "NA", "LS", "SZ", "ZA", "SD", "SS", "ER", "ET", "SO"
    ];

    if (francophoneCountries.includes(country)) return "fr";
    if (anglophoneCountries.includes(country)) return "en";
    return "fr";
  } catch {
    return "fr";
  }
};
export const initI18n = async () => {
  console.log("⏳ initI18n appelée");

  const savedLang = localStorage.getItem("i18nextLng");

  // Français par défaut
  let lang = "fr";

  // Si l'utilisateur a déjà choisi une langue
  if (savedLang) {
    lang = savedLang;
  } else {
    try {
      const detectedLang = await detectLanguageByIP();

      if (["fr", "en"].includes(detectedLang)) {
        lang = detectedLang;
      }
    } catch (e) {
      console.warn("Détection langue IP échouée, utilisation FR");
    }
  }

  await i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
      lng: lang,
      fallbackLng: "fr",
      supportedLngs: ["fr", "en"],
      backend: {
        loadPath: "/locales/{{lng}}/translation.json"
      },
      interpolation: {
        escapeValue: false
      },
      react: {
        useSuspense: false
      }
    });

  console.log("✅ i18n initialisé avec la langue :", lang);
};
export default i18n;