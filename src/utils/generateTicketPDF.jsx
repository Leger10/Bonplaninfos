import jsPDF from "jspdf";
import QRCode from "qrcode";

// Helper to load image for PDF
const getBase64ImageFromURL = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
    img.onerror = (error) => {
      console.error("Image load error for URL:", url, error);
      resolve(null);
    };

    // Add cache buster to prevent cached images
    const cacheBusterUrl =
      url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
    img.src = cacheBusterUrl;
  });
};

// Colors
const COLORS = {
  primary: [255, 140, 0], // Orange
  secondary: [30, 30, 30], // Dark Gray
  accent: [240, 240, 240], // Light Gray
  white: [255, 255, 255],
  black: [0, 0, 0],
  green: [34, 197, 94], // Green for success
  blue: [59, 130, 246], // Blue for info
};

// Ticket type colors for visual differentiation
const TICKET_COLORS = {
  Standard: [255, 140, 0], // Orange
  VIP: [128, 0, 128], // Purple
  Premium: [255, 215, 0], // Gold
  "Early Bird": [0, 128, 0], // Green
  Invité: [0, 100, 255], // Blue
  Gold: [255, 215, 0], // Gold
  Silver: [192, 192, 192], // Silver
  Bronze: [205, 127, 50], // Bronze
};

// Helper to get color safely
const getTicketColor = (type) => {
  if (!type) return COLORS.primary;

  // Check exact match
  const normalizedType = type.trim();
  if (TICKET_COLORS[normalizedType]) return TICKET_COLORS[normalizedType];

  // Check partial match (case insensitive)
  const lowerType = normalizedType.toLowerCase();
  if (lowerType.includes("vip")) return TICKET_COLORS["VIP"];
  if (
    lowerType.includes("premium") ||
    lowerType.includes("or") ||
    lowerType.includes("gold")
  )
    return TICKET_COLORS["Gold"];
  if (lowerType.includes("silver") || lowerType.includes("argent"))
    return TICKET_COLORS["Silver"];
  if (lowerType.includes("bronze")) return TICKET_COLORS["Bronze"];
  if (lowerType.includes("early") || lowerType.includes("pre"))
    return TICKET_COLORS["Early Bird"];
  if (lowerType.includes("invit")) return TICKET_COLORS["Invité"];

  return COLORS.primary;
};

// Generate QR Code data URL with high resolution
const generateQRCodeDataURL = async (data, size = 300) => {
  try {
    const qrData = JSON.stringify({
      evt: data.eventId || "unknown",
      tkt: data.ticketNumber || "000000",
      code: data.ticketCode || "XXXXXX",
      uid: data.userId || "anonymous",
      name: data.userName || "",
      type: data.ticketType || "Standard",
      date: new Date().toISOString(),
      ts: Date.now(),
    });

    // Generate QR code with higher resolution and minimal margin
    return await QRCode.toDataURL(qrData, {
      width: size,
      margin: 1, // Minimal margin
      color: {
        dark: "#000000FF", // Solid black
        light: "#FFFFFFFF", // Solid white
      },
      errorCorrectionLevel: "H", // High error correction
    });
  } catch (error) {
    console.error("QR Code generation error:", error);
    return null;
  }
};

// Safe text cleaner to prevent PDF encoding issues
const safeText = (text) => {
  if (text === null || text === undefined) return "";
  
  // Convert to string
  let str = String(text);
  
  // Keep French accents but remove other problematic characters
  // Allow common French characters and symbols
  str = str.replace(/[^\x00-\xFF\u00C0-\u017F\s\-\.,;:!?@#€$%&*()\[\]{}'"\d\w]/g, "");
  
  // Replace problematic characters with safe alternatives
  str = str.replace(/[&]/g, "&");
  str = str.replace(/[þ]/g, "th");
  str = str.replace(/[Ø]/g, "O");
  str = str.replace(/[Ü]/g, "U");
  str = str.replace(/[ñ]/g, "n");
  str = str.replace(/[Ý]/g, "Y");
  str = str.replace(/[]/g, ""); // Remove control character
  
  // Limit length to prevent overflow
  return str.substring(0, 100);
};

// Format date for PDF
const formatDate = (dateString) => {
  if (!dateString) return "Date non définie";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dateString;
  }
};

// Check if text fits in width
const textFitsWidth = (doc, text, fontSize, maxWidth) => {
  const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
  return textWidth <= maxWidth;
};

// Split text into lines that fit within width
const splitTextToFit = (doc, text, fontSize, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (textFitsWidth(doc, testLine, fontSize, maxWidth)) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
};

export const generateTicketPDF = async (event, tickets, user) => {
  console.log("Generating PDF for:", {
    eventTitle: event?.title,
    ticketsCount: tickets?.length,
    userName: user?.full_name,
  });

  try {
    // A6 Size: 105mm x 148mm (perfect for tickets)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a6",
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 105mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 148mm
    const margin = 5;
    const contentWidth = pageWidth - margin * 2; // 95mm

    // Load logo once
    const logoUrl =
      "https://api.dicebear.com/7.x/initials/svg?seed=BPI&backgroundColor=ff8c00&textColor=ffffff&size=64";
    const logoImg = await getBase64ImageFromURL(logoUrl);

    for (let i = 0; i < tickets.length; i++) {
      if (i > 0) doc.addPage();
      const ticket = tickets[i];

      // --- DATA PREPARATION ---
      const pricePi = Number(ticket.price) || 0;
      const priceFcfa = Number(ticket.price_fcfa) || pricePi * 10 || 0;
      const ticketNum = safeText(
        ticket.ticket_number || `TKT${Date.now()}${i}`
      );
      const ticketCode = safeText(
        ticket.ticket_code_short || ticketNum.slice(-6).toUpperCase()
      );
      const holderName = safeText(
        user?.full_name || user?.email?.split("@")[0] || "Invité"
      );
      const eventTitle = safeText(event?.title || "Événement BonPlanInfos");
      const eventDate = formatDate(event?.event_date);
      const location = safeText(
        event?.location || event?.city || "Lieu à confirmer"
      );
      const ticketType = safeText(ticket.type_name || "Standard");
      const ticketColor = getTicketColor(ticketType);

      let cursorY = 0;

      // --- 1. HEADER (Orange Bar with Logo) ---
      doc.setFillColor(...ticketColor);
      doc.roundedRect(0, 0, pageWidth, 15, 0, 0, "F");

      // Add logo if available
      if (logoImg) {
        doc.addImage(logoImg, "PNG", margin, 2, 10, 10);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      
      // Check if text fits
      const headerText = "BON PLAN INFOS";
      const headerX = logoImg ? margin + 12 : margin;
      if (textFitsWidth(doc, headerText, 9, contentWidth - 20)) {
        doc.text(headerText, headerX, 8);
      } else {
        doc.setFontSize(8);
        doc.text(headerText, headerX, 8);
      }

      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text("BILLET ÉLECTRONIQUE", pageWidth - margin, 8, {
        align: "right",
      });

      cursorY = 20;

      // --- 2. EVENT TITLE (Compact) ---
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");

      const titleLines = doc.splitTextToSize(eventTitle, contentWidth - 10);
      doc.text(titleLines, pageWidth / 2, cursorY, { align: "center" });
      cursorY += titleLines.length * 4 + 4;

      // --- 3. EVENT DETAILS (Compact) ---
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);

      // Date - split into two lines if needed
      doc.setFont("helvetica", "bold");
      doc.text("DATE:", margin, cursorY);
      doc.setFont("helvetica", "normal");
      
      const dateLines = splitTextToFit(doc, eventDate, 8, contentWidth - 20);
      dateLines.forEach((line, idx) => {
        doc.text(line, margin + 15, cursorY + idx * 3);
      });
      cursorY += dateLines.length * 3 + 2;

      // Location
      doc.setFont("helvetica", "bold");
      doc.text("LIEU:", margin, cursorY);
      doc.setFont("helvetica", "normal");
      const locationLines = doc.splitTextToSize(location, contentWidth - 20);
      locationLines.forEach((line, idx) => {
        doc.text(line, margin + 15, cursorY + idx * 3);
      });
      cursorY += locationLines.length * 3 + 6;

      // --- 4. TICKET TYPE & HOLDER ---
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(margin, cursorY, contentWidth, 12, 2, 2, "FD");

      cursorY += 4;

      // Ticket Type
      doc.setFontSize(9);
      doc.setTextColor(...ticketColor);
      doc.setFont("helvetica", "bold");
      
      // Ensure ticket type fits
      let ticketTypeText = ticketType.toUpperCase();
      if (!textFitsWidth(doc, ticketTypeText, 9, contentWidth / 2 - 10)) {
        doc.setFontSize(8);
      }
      doc.text(ticketTypeText, margin + 5, cursorY);

      // Holder Name
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      
      // Truncate name if too long
      let holderDisplayName = holderName;
      if (!textFitsWidth(doc, holderName, 8, contentWidth / 2 - 10)) {
        // Truncate with ellipsis
        holderDisplayName = holderName.substring(0, 15) + "...";
      }
      doc.text(holderDisplayName, pageWidth - margin - 5, cursorY, {
        align: "right",
      });

      cursorY += 8;

      // --- 5. PRICE ---
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");

      const priceText = `${pricePi.toFixed(
        2
      )} π (${priceFcfa.toLocaleString()} FCFA)`;
      
      // Adjust font size if price doesn't fit
      if (!textFitsWidth(doc, priceText, 10, contentWidth)) {
        doc.setFontSize(9);
      }
      doc.text(priceText, pageWidth / 2, cursorY, { align: "center" });

      cursorY += 8;

      // --- 6. LARGE QR CODE (Optimized size) ---
      // Réduire la hauteur allouée au footer pour remonter le texte
      const footerHeight = 12; // Réduit de 15 à 12
      const verificationCodeHeight = 10; // Réduit de 12 à 10
      const availableHeightForQR = pageHeight - cursorY - footerHeight - verificationCodeHeight - 8; // Réduit de 10 à 8
      
      const qrSize = Math.min(contentWidth * 0.70, availableHeightForQR, 70);
      const qrX = (pageWidth - qrSize) / 2;

      // Generate high-resolution QR code
      const qrData = {
        eventId: event?.id || "evt",
        ticketNumber: ticketNum,
        ticketCode: ticketCode,
        userId: user?.id || "usr",
        userName: holderName,
        ticketType: ticketType,
        timestamp: Date.now(),
      };

      const qrCodeImg = await generateQRCodeDataURL(qrData, 500);

      if (qrCodeImg) {
        // Add QR code
        doc.addImage(qrCodeImg, "PNG", qrX, cursorY, qrSize, qrSize);

        // Add white border around QR for better contrast
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(2);
        doc.rect(qrX - 1, cursorY - 1, qrSize + 2, qrSize + 2);

        // Add scan instructions
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(
          "Scanner ce code à l'entrée",
          pageWidth / 2,
          cursorY + qrSize + 3,
          { align: "center" }
        );
      } else {
        // Fallback: Draw placeholder
        doc.setFillColor(230, 230, 230);
        doc.roundedRect(qrX, cursorY, qrSize, qrSize, 2, 2, "F");
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text("QR Code", qrX + qrSize / 2, cursorY + qrSize / 2, {
          align: "center",
        });
      }

      cursorY += qrSize + 8; // Réduit de 10 à 8

      // --- 7. VERIFICATION CODE (Optimized) ---
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("courier", "bold");

      // Add spacing between characters for readability
      const code = (ticketCode || "------").split("").join(" ");
      const codeWidth = doc.getStringUnitWidth(code) * 14 / doc.internal.scaleFactor;
      
      // Ensure code fits within page width
      if (codeWidth > contentWidth) {
        doc.setFontSize(12);
      }
      
      doc.text(code, pageWidth / 2, cursorY, { align: "center" });

      // Small ID below code
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      
      // Ensure ticket number fits
      let ticketNumText = `N° ${ticketNum}`;
      if (!textFitsWidth(doc, ticketNumText, 8, contentWidth)) {
        ticketNumText = `N° ${ticketNum.substring(0, 15)}...`;
      }
      doc.text(ticketNumText, pageWidth / 2, cursorY + 5, {
        align: "center",
      });

      cursorY += 10; // Réduit de 12 à 10

      // --- 8. SECURITY INFO (Fixed - no corrupted characters) ---
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);

      // Use ASCII-safe symbols instead of corrupted characters
      const securityInfo = [
        "• Billet personnel - Non transférable",
        "• Présenter sur mobile ou imprimé",
        "• Usage unique - Reproduction interdite",
      ];

      // Calculate needed space
      const securityLineHeight = 3.0; // Réduit de 3.5 à 3.0
      const totalSecurityHeight = securityInfo.length * securityLineHeight;
      
      // Check if there's enough space before footer
      // Réduire l'espace entre les infos de sécurité et le footer
      if (cursorY + totalSecurityHeight > pageHeight - footerHeight) {
        // Reduce line spacing
        securityInfo.forEach((line, index) => {
          doc.text(line, margin, cursorY + index * 2.5); // Plus serré
        });
        cursorY += securityInfo.length * 2.5;
      } else {
        securityInfo.forEach((line, index) => {
          doc.text(line, margin, cursorY + index * securityLineHeight);
        });
        cursorY += totalSecurityHeight;
      }

      // --- 9. FOOTER (Remonté) ---
      // Placer le footer plus haut (3mm du bas au lieu de 8mm)
      const footerY = pageHeight - 3; // Changé de 8 à 3
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);

      // Use shorter date format
      const now = new Date();
      const dateStr = now.toLocaleDateString("fr-FR", { 
        day: "2-digit", 
        month: "2-digit", 
        year: "numeric" 
      });
      const timeStr = now.toLocaleTimeString("fr-FR", { 
        hour: "2-digit", 
        minute: "2-digit" 
      });
      
      const footerText = `Généré le ${dateStr} à ${timeStr} • www.bonplaninfos.net`;
      
      // Check if footer fits
      const footerTextWidth = doc.getStringUnitWidth(footerText) * 6 / doc.internal.scaleFactor;
      
      if (footerTextWidth > contentWidth) {
        // Split footer into two lines
        doc.text(`Généré le ${dateStr} à ${timeStr}`, pageWidth / 2, footerY - 3, { 
          align: "center" 
        });
        doc.text("www.bonplaninfos.net", pageWidth / 2, footerY, { 
          align: "center" 
        });
      } else {
        doc.text(footerText, pageWidth / 2, footerY, { align: "center" });
      }

      // Add page number if multiple tickets (remonté aussi)
      if (tickets.length > 1) {
        doc.setFontSize(6);
        doc.text(`Billet ${i + 1}/${tickets.length}`, margin, footerY - 3);
      }
    }

    // Generate filename
    const cleanTitle = (event?.title || "billet")
      .replace(/[^a-z0-9]/gi, "_")
      .substring(0, 20);
    const filename = `Billet_${cleanTitle}_${Date.now()}.pdf`;

    // Save PDF
    doc.save(filename);

    console.log("PDF generated successfully:", filename);
    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);

    // Fallback: Show error to user
    alert(
      "Erreur lors de la génération du PDF. Veuillez réessayer ou contacter le support."
    );
    return false;
  }
};

// Alternative function with even larger QR code (fills most of the page)
export const generateTicketPDFWithHugeQR = async (event, tickets, user) => {
  try {
    // A6 landscape for larger QR
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a6",
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 148mm in landscape
    const pageHeight = doc.internal.pageSize.getHeight(); // 105mm
    const margin = 5;

    for (let i = 0; i < tickets.length; i++) {
      if (i > 0) doc.addPage();
      const ticket = tickets[i];

      const ticketNum = safeText(
        ticket.ticket_number || `TKT${Date.now()}${i}`
      );
      const ticketCode = safeText(
        ticket.ticket_code_short || ticketNum.slice(-6).toUpperCase()
      );
      const holderName = safeText(
        user?.full_name || user?.email?.split("@")[0] || "Invité"
      );
      const eventTitle = safeText(event?.title || "Événement");
      const ticketColor = getTicketColor(ticket.type_name || "Standard");

      // Header
      doc.setFillColor(...ticketColor);
      doc.rect(0, 0, pageWidth, 10, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      
      // Ensure event title fits
      let displayTitle = eventTitle;
      if (!textFitsWidth(doc, eventTitle, 8, pageWidth - 10)) {
        displayTitle = eventTitle.substring(0, 40);
      }
      doc.text(displayTitle, margin, 7);

      doc.setTextColor(0, 0, 0);
      let cursorY = 15;

      // Event info compact
      doc.setFontSize(7);
      if (event?.event_date) {
        const date = new Date(event.event_date);
        const dateStr = date.toLocaleDateString("fr-FR");
        if (textFitsWidth(doc, dateStr, 7, pageWidth - 10)) {
          doc.text(dateStr, margin, cursorY);
        }
      }
      cursorY += 4;

      if (event?.location) {
        const locationText = event.location.substring(0, 40);
        if (textFitsWidth(doc, locationText, 7, pageWidth - 10)) {
          doc.text(locationText, margin, cursorY);
        }
      }
      cursorY += 4;

      const ticketText = `Billet: ${ticketCode}`;
      if (textFitsWidth(doc, ticketText, 7, pageWidth - 10)) {
        doc.text(ticketText, margin, cursorY);
      }
      cursorY += 4;
      
      const holderText = `Porteur: ${holderName.substring(0, 25)}`;
      if (textFitsWidth(doc, holderText, 7, pageWidth - 10)) {
        doc.text(holderText, margin, cursorY);
      }
      cursorY += 8;

      // HUGE QR CODE (takes most of the page)
      const qrSize = Math.min(80, pageHeight - cursorY - 15);
      const qrX = (pageWidth - qrSize) / 2;

      const qrData = {
        evt: event?.id || "evt",
        tkt: ticketNum,
        code: ticketCode,
        name: holderName,
      };

      const qrCodeImg = await generateQRCodeDataURL(qrData, 600);

      if (qrCodeImg) {
        doc.addImage(qrCodeImg, "PNG", qrX, cursorY, qrSize, qrSize);

        // White border
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(3);
        doc.rect(qrX - 1.5, cursorY - 1.5, qrSize + 3, qrSize + 3);
      }

      // Footer with code and website (remonté)
      const footerY = pageHeight - 5; // Remonté
      doc.setFontSize(12);
      doc.setFont("courier", "bold");
      
      // Split code and website on two lines if needed
      const code = ticketCode.split("").join(" ");
      const codeWidth = doc.getStringUnitWidth(code) * 12 / doc.internal.scaleFactor;
      
      if (codeWidth > pageWidth - 10) {
        doc.setFontSize(10);
      }
      
      doc.text(code, pageWidth / 2, footerY - 4, { align: "center" });
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text("www.bonplaninfos.net", pageWidth / 2, footerY, { align: "center" });
    }

    doc.save(`Billet_QR_${Date.now()}.pdf`);
    return true;
  } catch (error) {
    console.error("Error in huge QR PDF:", error);
    return false;
  }
};