import jsPDF from "jspdf";
import QRCode from "qrcode";

// Helper to load image for PDF with timeout and cache busting
const getBase64ImageFromURL = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    // Timeout pour éviter les blocages
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

    // Add cache buster to prevent cached images
    const cacheBusterUrl = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
    img.src = cacheBusterUrl;
  });
};

/* =====================================================
   SAUVEGARDE PDF MULTI-PLATEFORME AMÉLIORÉE
===================================================== */

// Sauvegarde pour Desktop (méthode standard)
const saveForDesktop = (doc, fileName, blob) => {
  // Utiliser l'API File System si disponible
  if ('showSaveFilePicker' in window) {
    saveWithFilePicker(doc, fileName, blob);
    return;
  }
  
  // Méthode standard
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.style.display = 'none';
  link.rel = 'noopener noreferrer';
  
  document.body.appendChild(link);
  link.click();
  
  // Nettoyer
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 100);
};

// Sauvegarde pour Android
const saveForAndroid = (doc, fileName, blob) => {
  // Sur Android, créer un lien et cliquer fonctionne généralement bien
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.style.display = 'none';
  link.rel = 'noopener noreferrer';
  
  document.body.appendChild(link);
  
  // Simuler le clic
  link.click();
  
  // Nettoyer
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 100);
  
  // Afficher une notification
  setTimeout(() => {
    if (window.toast) {
      window.toast({
        title: "✅ Téléchargement démarré",
        description: "Le billet est en cours de téléchargement",
      });
    }
  }, 500);
};

// Instructions pour iOS
const showIOSInstructions = (blobUrl, fileName) => {
  const newWindow = window.open('', '_blank');
  
  if (!newWindow) {
    // Popup bloquée - essayer une approche directe
    window.location.href = blobUrl;
    return;
  }
  
  newWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Billet BonPlanInfos</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }
          
          body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 16px;
          }
          
          .card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 32px;
            padding: 32px 24px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.4s ease-out;
          }
          
          @keyframes slideUp {
            from { 
              transform: translateY(40px); 
              opacity: 0; 
            }
            to { 
              transform: translateY(0); 
              opacity: 1; 
            }
          }
          
          h1 {
            color: #1a1a1a;
            margin-bottom: 8px;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
            text-align: center;
          }
          
          .subtitle {
            color: #666;
            text-align: center;
            margin-bottom: 24px;
            font-size: 16px;
          }
          
          .pdf-preview {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 24px;
            padding: 32px 24px;
            margin: 24px 0;
            border: 2px dashed #dee2e6;
            text-align: center;
          }
          
          .pdf-icon {
            font-size: 48px;
            margin-bottom: 12px;
          }
          
          .filename {
            font-weight: 600;
            color: #2d3748;
            word-break: break-word;
            font-size: 14px;
            background: white;
            padding: 8px 16px;
            border-radius: 100px;
            display: inline-block;
            max-width: 100%;
          }
          
          .button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 18px 24px;
            border-radius: 16px;
            font-size: 17px;
            font-weight: 600;
            width: 100%;
            margin: 8px 0;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-sizing: border-box;
            transition: all 0.2s;
            -webkit-tap-highlight-color: transparent;
            cursor: pointer;
          }
          
          .button:active {
            transform: scale(0.98);
            background: #2563eb;
          }
          
          .button-secondary {
            background: #e5e7eb;
            color: #1f2937;
          }
          
          .button-secondary:active {
            background: #d1d5db;
          }
          
          .tip-box {
            background: #fef3c7;
            border-radius: 20px;
            padding: 20px;
            margin: 24px 0;
            border: 1px solid #fcd34d;
          }
          
          .tip-title {
            font-weight: 700;
            color: #92400e;
            margin-bottom: 12px;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .step {
            color: #b45309;
            margin: 10px 0;
            font-size: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 0;
          }
          
          .step-number {
            background: #92400e;
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 22px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
          }
          
          .info-text {
            color: #6b7280;
            font-size: 13px;
            text-align: center;
            margin-top: 16px;
          }
          
          iframe {
            width: 1px;
            height: 1px;
            opacity: 0;
            position: absolute;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🎫 Billet BonPlanInfos</h1>
          <div class="subtitle">Votre billet est prêt</div>
          
          <div class="pdf-preview">
            <div class="pdf-icon">📄</div>
            <div class="filename">${fileName.replace('Billet_', '').replace(/_/g, ' ').replace('.pdf', '')}</div>
          </div>
          
          <a href="${blobUrl}" 
             class="button"
             target="_blank"
             rel="noopener noreferrer"
             onclick="setTimeout(function(){window.close()}, 1000)">
            <span>📥</span> Ouvrir le PDF
          </a>
          
          <div class="tip-box">
            <div class="tip-title">
              <span>💡</span> Comment enregistrer sur iPhone ?
            </div>
            <div class="step">
              <span class="step-number">1</span>
              Appuyez sur "Ouvrir le PDF"
            </div>
            <div class="step">
              <span class="step-number">2</span>
              Appuyez sur l'écran pour afficher les options
            </div>
            <div class="step">
              <span class="step-number">3</span>
              Sélectionnez "Partager" <span style="font-size: 18px;">􀈂</span>
            </div>
            <div class="step">
              <span class="step-number">4</span>
              Choisissez "Enregistrer dans Livres"
            </div>
          </div>
          
          <button onclick="window.close()" 
                  class="button button-secondary">
            <span>✕</span> Fermer
          </button>
          
          <div class="info-text">
            Le PDF s'ouvrira automatiquement dans quelques secondes...
          </div>
        </div>
        
        <iframe src="${blobUrl}" title="PDF Preview"></iframe>
        
        <script>
          // Tentative d'ouverture automatique
          setTimeout(() => {
            window.location.href = '${blobUrl}';
          }, 800);
        </script>
      </body>
    </html>
  `);
  newWindow.document.close();
};

// Sauvegarde pour iOS
const saveForIOS = (doc, fileName, blob) => {
  // Méthode 1: Utiliser l'API File System (iOS 14.5+)
  if ('showSaveFilePicker' in window) {
    saveWithFilePicker(doc, fileName, blob);
    return;
  }
  
  // Méthode 2: Convertir en DataURL pour iOS
  try {
    // Pour iOS, parfois le DataURL fonctionne mieux que le Blob URL
    const dataUrl = doc.output('dataurlstring');
    
    // Créer un élément <a> avec l'attribut download
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.style.display = 'none';
    link.rel = 'noopener noreferrer';
    
    // Pour iOS, il faut que l'élément soit dans le DOM
    document.body.appendChild(link);
    
    // Simuler un clic avec événement natif
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    link.dispatchEvent(event);
    
    // Nettoyer après un délai
    setTimeout(() => {
      document.body.removeChild(link);
    }, 1000);
  } catch (error) {
    console.error('iOS download error:', error);
    
    // Fallback: Ouvrir dans un nouvel onglet avec instructions
    const blobUrl = URL.createObjectURL(blob);
    showIOSInstructions(blobUrl, fileName);
  }
};

// Méthode moderne avec File System API
const saveWithFilePicker = async (doc, fileName, blob) => {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [{
        description: 'PDF Document',
        accept: { 'application/pdf': ['.pdf'] },
      }],
    });
    
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('File picker error:', err);
      // Fallback vers la méthode standard
      saveForDesktop(doc, fileName, blob);
    }
  }
};

// Fonction principale de sauvegarde universelle
const savePDFUniversally = (doc, fileName) => {
  // Nettoyer le nom du fichier
  const safeName = fileName.replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
  
  // Obtenir le blob avec le bon type MIME
  const blob = doc.output('blob');
  
  // Détection précise des appareils
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIOS13 = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS 13+
  const isIOSDevice = isIOS || isIOS13;
  const isAndroid = /android/i.test(ua);
  
  // Choisir la méthode appropriée selon l'appareil
  if (isIOSDevice) {
    saveForIOS(doc, safeName, blob);
  } else if (isAndroid) {
    saveForAndroid(doc, safeName, blob);
  } else {
    saveForDesktop(doc, safeName, blob);
  }
  
  // Nettoyer l'URL du blob après un délai (pour iOS notamment)
  setTimeout(() => {
    // Cette ligne est principalement pour les cas où on a créé une URL blob
    // Mais comme on la crée dans chaque fonction, on laisse le nettoyage à ces fonctions
  }, 60000);
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
  // 1. Try DB stored color key first
  if (colorKey && DB_COLOR_MAP[colorKey]) {
      return DB_COLOR_MAP[colorKey];
  }

  if (!type) return DEFAULT_COLOR;

  // 2. Fallback to Name based matching
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
  let str = String(text);
  // Keep standard ASCII + specific accents
  // Removing emoji and uncommon chars to prevent jspdf corruption
  // eslint-disable-next-line no-control-regex
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
    
    // Fallback for invalid dates
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
    
    // Check for valid date
    if (isNaN(date.getTime())) {
      return "";
    }
    
    // e.g. "15 janvier 2025 à 14:30"
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

    // Vérifier que chaque ticket a les infos nécessaires
    const validTickets = tickets.filter(t => t.ticket_number && t.ticket_code_short);
    if (validTickets.length === 0) {
      throw new Error("Aucun ticket valide à générer");
    }

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
    const bottomMargin = 15;

    // Charger le logo une seule fois
    const logoUrl = "https://res.cloudinary.com/dprp6vxv6/image/upload/v1722428610/bpi/logo-BPI-v2-transparent_pmsz7v.png";
    const logoImg = await getBase64ImageFromURL(logoUrl);

    // Préparer les données pour chaque ticket
    const ticketsData = tickets.map((ticket, index) => {
      const pricePi = Number(ticket.price) || 0;
      const priceFcfa = Number(ticket.price_fcfa) || pricePi * 10 || 0;
      const ticketNum = safeText(ticket.ticket_number || `TKT${Date.now()}${index}`);
      const ticketCode = safeText(ticket.ticket_code_short || ticket.ticket_code || ticketNum.slice(-6).toUpperCase());
      const holderName = safeText(user?.full_name || user?.email?.split("@")[0] || "Invité");
      const eventTitle = safeText(event?.title || "Événement BonPlanInfos");
      const eventDate = formatDate(event?.event_start_at);
      const location = safeText(event?.location || event?.city || "Lieu à confirmer");
      const ticketType = safeText(ticket.type_name || "Standard");
      const purchaseDateDisplay = formatPurchaseDate(ticket.purchase_date || ticket.purchased_at);
      
      // Déterminer la couleur
      const ticketColor = getTicketColor(ticketType, ticket.color);

      return {
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
      
      const priceText = `Valeur: ${pricePi} pièces / ${priceFcfa.toLocaleString('fr-FR')} FCFA`;
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
      
      // S'assurer que le type de ticket ne dépasse pas la largeur
      const maxTypeWidth = contentWidth - 20;
      let displayType = ticketType.toUpperCase();
      if (doc.getStringUnitWidth(displayType) * 10 / doc.internal.scaleFactor > maxTypeWidth) {
        displayType = doc.splitTextToSize(displayType, maxTypeWidth)[0];
      }
      
      doc.text(displayType, margin + 4, cursorY + 8);

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      // S'assurer que le nom ne dépasse pas la largeur
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
          // Fallback: dessiner un rectangle pour le QR manquant
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
    
    // Utiliser la fonction de sauvegarde universelle
    savePDFUniversally(doc, fileName);
    
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