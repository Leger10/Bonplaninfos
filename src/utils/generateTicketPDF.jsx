// utils/generateTicketPDF.jsx

import jsPDF from "jspdf";
import QRCode from "qrcode";

// Helper to load image for PDF with timeout and cache busting
const getBase64ImageFromURL = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    const timeout = setTimeout(() => {
      console.warn("Image load timeout for URL:", url);
      resolve(null);
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch (e) {
        console.error("Canvas error:", e);
        resolve(null);
      }
    };
    
    img.onerror = (error) => {
      clearTimeout(timeout);
      console.error("Image load error for URL:", url, error);
      resolve(null);
    };

    const cacheBusterUrl = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
    img.src = cacheBusterUrl;
  });
};

/* =====================================================
   SAUVEGARDE PDF MULTI-PLATEFORME SIMPLIFIÉE
   - Desktop : ouvre dans nouvel onglet
   - Android : ouvre dans navigateur
   - iPhone : ouvre proprement
   - Pas de popup UI stylée, pas d'écran intermédiaire
===================================================== */

// Sauvegarde universelle : ouvre le PDF dans un nouvel onglet/navigateur
const openPDFInNewTab = (doc, fileName) => {
  // Nettoyer le nom du fichier
  const safeName = fileName.replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
  
  // Obtenir le blob avec le bon type MIME
  const blob = doc.output('blob');
  
  // Créer une URL pour le blob
  const blobUrl = URL.createObjectURL(blob);
  
  // Détection précise des appareils (pour logging uniquement)
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIOS13 = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIOSDevice = isIOS || isIOS13;
  const isAndroid = /android/i.test(ua);
  
  console.log(`Ouverture du PDF pour ${isIOSDevice ? 'iOS' : isAndroid ? 'Android' : 'Desktop'}`);
  
  // Ouvrir dans un nouvel onglet (fonctionne sur toutes les plateformes)
  const newWindow = window.open(blobUrl, '_blank');
  
  // Si le popup est bloqué, essayer une ouverture directe
  if (!newWindow) {
    window.location.href = blobUrl;
  }
  
  // Nettoyer l'URL après un délai (pour libérer la mémoire)
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60000); // 1 minute
};

// Colors Map for Ticket Types
const DB_COLOR_MAP = {
    blue: [59, 130, 246],     // #3b82f6
    bronze: [205, 127, 50],   // #cd7f32
    silver: [160, 160, 160],  // #a0a0a0
    gold: [234, 179, 8],      // #eab308
    purple: [147, 51, 234],   // #9333ea
    red: [239, 68, 68],       // #ef4444
    green: [34, 197, 94],     // #22c55e
    black: [30, 30, 30]       // #1e1e1e
};

const DEFAULT_COLOR = [255, 140, 0]; // BonPlanInfos Orange

// Helper to get color safely
const getTicketColor = (type, colorKey) => {
  if (colorKey && DB_COLOR_MAP[colorKey]) {
      return DB_COLOR_MAP[colorKey];
  }

  if (!type) return DEFAULT_COLOR;

  const normalizedType = type.trim().toLowerCase();
  
  if (normalizedType.includes("vip")) return DB_COLOR_MAP["purple"];
  if (normalizedType.includes("or") || normalizedType.includes("gold")) return DB_COLOR_MAP["gold"];
  if (normalizedType.includes("argent") || normalizedType.includes("silver")) return DB_COLOR_MAP["silver"];
  if (normalizedType.includes("bronze")) return DB_COLOR_MAP["bronze"];
  if (normalizedType.includes("invit")) return DB_COLOR_MAP["blue"];

  return DEFAULT_COLOR;
};

// Generate QR Code data URL with high resolution
const generateQRCodeDataURL = async (data, size = 300) => {
  try {
    const qrData = data.code || data.ticketCode || "XXXXXX";

    return await QRCode.toDataURL(qrData, {
      width: size,
      margin: 1,
      color: {
        dark: "#000000FF",
        light: "#FFFFFFFF",
      },
      errorCorrectionLevel: "H",
    });
  } catch (error) {
    console.error("QR Code generation error:", error);
    return null;
  }
};

// Safe text cleaner to prevent PDF encoding issues
const safeText = (text) => {
  if (text === null || text === undefined) return "";
  let str = String(text);
  return str.replace(/[^\x00-\x7F\u00C0-\u00FF\u0152\u0153\u20AC]/g, ""); 
};

// Format date for PDF (Event Date)
const formatDate = (dateString) => {
  if (!dateString) return "Date non définie";
  try {
    const date = new Date(dateString);
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    return date.toLocaleDateString("fr-FR", options);
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
};

// Format purchase timestamp
const formatPurchaseDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return "";
    }
    
    return date.toLocaleString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    console.error("Purchase date formatting error:", e);
    return "";
  }
};
export const generateTicketPDF = async (event, tickets, user) => {
  try {
    // Validation améliorée
    if (!event || !tickets || tickets.length === 0) {
      throw new Error("Données manquantes pour générer le PDF");
    }

    // CORRECTION : Validation plus souple
    const validTickets = tickets.filter(t => {
      // Accepter si au moins un des champs d'identification est présent
      const hasValidId = t.ticket_number || t.ticket_code_short || t.ticket_code;
      console.log("Ticket validation:", { ticket: t, hasValidId });
      return hasValidId;
    });
    
    if (validTickets.length === 0) {
      console.error("Tickets invalides reçus:", tickets);
      throw new Error("Aucun ticket valide à générer");
    }

    console.log(`${validTickets.length} ticket(s) valide(s) trouvé(s)`);

    // A6 Size: 105mm x 148mm
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a6",
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 5;
    const contentWidth = pageWidth - margin * 2;
    const bottomMargin = 15;

    // Charger le logo
    const logoUrl = "https://res.cloudinary.com/dprp6vxv6/image/upload/v1722428610/bpi/logo-BPI-v2-transparent_pmsz7v.png";
    const logoImg = await getBase64ImageFromURL(logoUrl);

    // Préparer les données pour chaque ticket
    const ticketsData = tickets.map((ticket, index) => {
      // CORRECTION : Utiliser des valeurs par défaut si les champs sont manquants
      const pricePi = Number(ticket.price) || 0;
      const priceFcfa = Number(ticket.price_fcfa) || pricePi * 10 || 0;
      
      // Générer un numéro de ticket si manquant
      const ticketNum = ticket.ticket_number || 
                        ticket.ticket_code || 
                        `TKT${Date.now()}${index}`;
      
      // Générer un code court si manquant
      const ticketCode = ticket.ticket_code_short || 
                         ticket.ticket_code || 
                         (ticketNum ? String(ticketNum).slice(-6).toUpperCase() : "XXXXXX");
      
      const holderName = safeText(user?.full_name || user?.email?.split("@")[0] || "Invité");
      const eventTitle = safeText(event?.title || "Événement BonPlanInfos");
      const eventDate = formatDate(event?.event_start_at);
      const location = safeText(event?.location || event?.city || "Lieu à confirmer");
      const ticketType = safeText(ticket.type_name || "Standard");
      const purchaseDateDisplay = formatPurchaseDate(ticket.purchase_date || ticket.purchased_at);
      
      const ticketColor = getTicketColor(ticketType, ticket.color);

      return {
        pricePi,
        priceFcfa,
        ticketNum: String(ticketNum),
        ticketCode: String(ticketCode),
        holderName,
        eventTitle,
        eventDate,
        location,
        ticketType,
        purchaseDateDisplay,
        ticketColor,
      };
    });

  
    // Générer chaque page de ticket
    for (let i = 0; i < ticketsData.length; i++) {
      if (i > 0) doc.addPage();
      
      const {
        pricePi,
        priceFcfa,
        ticketNum,
        ticketCode,
        holderName,
        eventTitle,
        eventDate,
        location,
        ticketType,
        purchaseDateDisplay,
        ticketColor,
      } = ticketsData[i];

      let cursorY = 0;

      // --- 1. EN-TÊTE (Barre colorée avec Logo) ---
      doc.setFillColor(...ticketColor);
      doc.rect(0, 0, pageWidth, 18, "F");

      // Ajouter le logo si disponible
      if (logoImg) {
        try {
          doc.addImage(logoImg, "PNG", margin, 2, 14, 14);
        } catch (error) {
          console.warn("Could not add logo to PDF:", error);
        }
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      
      const headerText = "BON PLAN INFOS";
      const headerX = logoImg ? margin + 16 : margin;
      doc.text(headerText, headerX, 11);

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("BILLET OFFICIEL", pageWidth - margin, 11, { align: "right" });

      cursorY = 24;

      // --- 2. SECTION PRIX ---
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...ticketColor);
      
      const priceText = `Valeur: ${pricePi} pièces / ${priceFcfa}F CFA`;
      doc.text(priceText, pageWidth / 2, cursorY, { align: "center" });
      
      cursorY += 8;

      // --- 3. TITRE DE L'ÉVÉNEMENT ---
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");

      const titleLines = doc.splitTextToSize(eventTitle, contentWidth);
      const titleHeight = titleLines.length * 5;
      doc.text(titleLines, pageWidth / 2, cursorY, { align: "center" });
      cursorY += titleHeight + 4;

      // --- 4. DÉTAILS ---
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);

      // Date
      doc.setFont("helvetica", "bold");
      doc.text("DATE:", margin, cursorY);
      doc.setFont("helvetica", "normal");
      const dateLines = doc.splitTextToSize(eventDate, contentWidth - 15);
      doc.text(dateLines, margin + 12, cursorY);
      cursorY += dateLines.length * 4 + 3;

      // Lieu
      doc.setFont("helvetica", "bold");
      doc.text("LIEU:", margin, cursorY);
      doc.setFont("helvetica", "normal");
      const locationLines = doc.splitTextToSize(location, contentWidth - 15);
      doc.text(locationLines, margin + 12, cursorY);
      cursorY += locationLines.length * 4 + 6;

      // --- 5. BADGE TYPE DE BILLET ---
      doc.setDrawColor(...ticketColor);
      doc.setLineWidth(0.5);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(margin, cursorY, contentWidth, 12, 2, 2, "FD");

      doc.setFontSize(10);
      doc.setTextColor(...ticketColor);
      doc.setFont("helvetica", "bold");
      
      const maxTypeWidth = contentWidth - 20;
      let displayType = ticketType.toUpperCase();
      if (doc.getStringUnitWidth(displayType) * 10 / doc.internal.scaleFactor > maxTypeWidth) {
        displayType = doc.splitTextToSize(displayType, maxTypeWidth)[0];
      }
      
      doc.text(displayType, margin + 4, cursorY + 8);

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      const maxNameWidth = contentWidth - 50;
      let displayName = holderName;
      if (doc.getStringUnitWidth(displayName) * 9 / doc.internal.scaleFactor > maxNameWidth) {
        displayName = doc.splitTextToSize(displayName, maxNameWidth)[0];
      }
      
      doc.text(displayName, pageWidth - margin - 4, cursorY + 8, { align: "right" });

      cursorY += 15;

      // --- 6. ZONE QR CODE ---
      const qrSize = 45;
      const qrX = (pageWidth - qrSize) / 2;

      // Ajouter les bordures d'angle pour le QR
      doc.setDrawColor(...ticketColor);
      doc.setLineWidth(1);
      const cornerLen = 5;
      
      // Haut gauche
      doc.line(qrX - 2, cursorY - 2, qrX - 2 + cornerLen, cursorY - 2);
      doc.line(qrX - 2, cursorY - 2, qrX - 2, cursorY - 2 + cornerLen);
      // Haut droite
      doc.line(qrX + qrSize + 2, cursorY - 2, qrX + qrSize + 2 - cornerLen, cursorY - 2);
      doc.line(qrX + qrSize + 2, cursorY - 2, qrX + qrSize + 2, cursorY - 2 + cornerLen);
      // Bas gauche
      doc.line(qrX - 2, cursorY + qrSize + 2, qrX - 2 + cornerLen, cursorY + qrSize + 2);
      doc.line(qrX - 2, cursorY + qrSize + 2, qrX - 2, cursorY + qrSize + 2 - cornerLen);
      // Bas droite
      doc.line(qrX + qrSize + 2, cursorY + qrSize + 2, qrX + qrSize + 2 - cornerLen, cursorY + qrSize + 2);
      doc.line(qrX + qrSize + 2, cursorY + qrSize + 2, qrX + qrSize + 2, cursorY + qrSize + 2 - cornerLen);

      // Générer et ajouter le QR Code
      const qrCodeImg = await generateQRCodeDataURL({ code: ticketCode }, 500);
      if (qrCodeImg) {
        try {
          doc.addImage(qrCodeImg, "PNG", qrX, cursorY, qrSize, qrSize);
        } catch (error) {
          console.error("Error adding QR code to PDF:", error);
          doc.setFillColor(240, 240, 240);
          doc.rect(qrX, cursorY, qrSize, qrSize, "F");
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(8);
          doc.text("QR Code", qrX + qrSize/2, cursorY + qrSize/2, { align: "center" });
        }
      }

      cursorY += qrSize + 8;

      // --- 7. CODE DU BILLET ET ID ---
      doc.setFont("courier", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(ticketCode.split("").join(" "), pageWidth / 2, cursorY, { align: "center" });
      
      // --- 8. DATE D'ACHAT (si disponible) ---
      if (purchaseDateDisplay) {
        cursorY += 7;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(`Acheté le ${purchaseDateDisplay}`, pageWidth / 2, cursorY, { align: "center" });
      }

      // --- 9. LIEN DU SITE ---
      cursorY += 9;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...ticketColor);
      doc.text("www.bonplaninfos.net", pageWidth / 2, cursorY, { align: "center" });

      // --- 10. FOOTER ---
      const footerY = pageHeight - bottomMargin + 5;
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text("Valable une seule fois • scannez à l'entrée et à la sortie", pageWidth / 2, footerY, { align: "center" });
    }

    // Générer un nom de fichier propre
    const cleanTitle = (event?.title || "billet")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_+|_+$)/g, "")
      .substring(0, 30);
    
    const fileName = `Billet_${cleanTitle}_${Date.now()}.pdf`;
    
    // Utiliser la fonction de sauvegarde simplifiée
    openPDFInNewTab(doc, fileName);
    
    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    
    // Afficher une notification à l'utilisateur
    if (window.toast) {
      window.toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de générer le billet",
        variant: "destructive",
      });
    }
    
    return false;
  }
};