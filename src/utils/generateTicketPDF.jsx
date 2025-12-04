import jsPDF from 'jspdf';

export const generateTicketPDF = (event, tickets, user) => {
  try {
    // A6 Format (105mm x 148mm) - Standard Ticket Size
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a6'
    });

    tickets.forEach((ticket, index) => {
      if (index > 0) doc.addPage();

      // === FOND AVEC FILIGRANE "PAYE" ===
      // Fond blanc
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 105, 148, 'F');
      
      // Filigrane "PAYE" en diagonale répété
      doc.setTextColor(245, 245, 245); // Gris très clair
      doc.setFontSize(40);
      doc.setFont('helvetica', 'bold');
      
      // Angle de 45 degrés
      const angle = 45 * Math.PI / 180;
      doc.rotate(angle, 52.5, 74); // Centre du document
      
      // Répéter le filigrane sur toute la surface
      for (let x = -30; x < 120; x += 60) {
        for (let y = -30; y < 160; y += 40) {
          doc.text("PAYE", x, y);
        }
      }
      
      // Rétablir la rotation
      doc.rotate(-angle, 52.5, 74);
      
      // Bordure décorative
      doc.setDrawColor(255, 140, 0); // Orange
      doc.setLineWidth(0.5);
      doc.roundedRect(3, 3, 99, 142, 3, 3);
      
      // En-tête avec dégradé (simulé)
      doc.setFillColor(255, 140, 0);
      doc.roundedRect(5, 5, 95, 18, 2, 2, 'F');
      
      // Logo/Texte d'en-tête
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("BONPLANINFOS", 52.5, 12, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text("REÇU DE PAIEMENT", 52.5, 17, { align: 'center' });

      // === DÉTAILS DE L'ÉVÉNEMENT ===
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      
      // Titre de l'événement
      const titleLines = doc.splitTextToSize(event.title.toUpperCase(), 85);
      doc.text(titleLines, 52.5, 30, { align: 'center' });

      // Encadré informations
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.rect(10, 40, 85, 35);
      
      // Icône date
      doc.setFillColor(79, 70, 229); // Indigo
      doc.circle(15, 48, 2, 'F');
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("DATE", 20, 50);
      doc.setFont('helvetica', 'normal');
      const dateStr = new Date(event.event_date).toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const timeStr = new Date(event.event_date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
      doc.text(`${dateStr} à ${timeStr}`, 20, 56);
      
      // Icône lieu
      doc.setFillColor(236, 72, 153); // Rose
      doc.circle(15, 63, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text("LIEU", 20, 65);
      doc.setFont('helvetica', 'normal');
      const locationText = event.location || event.city || 'Adresse non spécifiée';
      const locLines = doc.splitTextToSize(locationText, 65);
      doc.text(locLines, 20, 71);

      // === INFORMATIONS DU TICKET ===
      doc.setFillColor(240, 240, 250);
      doc.roundedRect(10, 80, 85, 15, 2, 2, 'F');
      
      doc.setTextColor(50, 50, 150);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("TYPE DE TICKET", 52.5, 87, { align: 'center' });
      
      doc.setFontSize(11);
      doc.text(ticket.type_name || "Standard", 52.5, 93, { align: 'center' });
      
      if (ticket.price) {
        doc.setFontSize(9);
        doc.setTextColor(22, 163, 74); // Vert
        doc.text(`Prix: ${ticket.price} Pièces`, 52.5, 98, { align: 'center' });
      }

      // === INFORMATIONS PARTICIPANT ===
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      // Encadré participant
      doc.setDrawColor(220, 220, 220);
      doc.rect(10, 105, 85, 25);
      
      // Icône participant
      doc.setFillColor(34, 197, 94); // Vert
      doc.circle(15, 115, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text("PARTICIPANT", 20, 117);
      doc.setFont('helvetica', 'normal');
      doc.text(user.full_name || user.email, 20, 123);
      
      // Icône référence
      doc.setFillColor(249, 115, 22); // Orange
      doc.circle(15, 128, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text("RÉFÉRENCE", 20, 130);
      doc.setFont('helvetica', 'normal');
      doc.text(ticket.ticket_number, 20, 136);

      // === QR CODE PLACEHOLDER ===
      // Cadre QR code
      doc.setDrawColor(79, 70, 229); // Indigo
      doc.setLineWidth(0.5);
      doc.roundedRect(37.5, 140, 30, 30, 3, 3);
      
      // Texte sous QR code
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text("PRÉSENTEZ CE CODE À L'ENTRÉE", 52.5, 173, { align: 'center' });

      // === STATUT DE PAIEMENT ===
      // Badge "PAYE" vert
      doc.setFillColor(22, 163, 74); // Vert
      doc.roundedRect(70, 5, 25, 8, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text("PAYE", 82.5, 10, { align: 'center' });

      // === INFORMATIONS DE CONTACT ===
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text("Ce ticket est unique et non remboursable", 52.5, 180, { align: 'center' });
      doc.text("contact@bonplaninfos.com • +221 33 XXX XX XX", 52.5, 184, { align: 'center' });
      
      // Numéro de page si multiple tickets
      if (tickets.length > 1) {
        doc.text(`Ticket ${index + 1}/${tickets.length}`, 52.5, 188, { align: 'center' });
      }

      // === BANDEAU DE SÉCURITÉ ===
      // Ligne pointillée pour découpe
      doc.setDrawColor(200, 200, 200);
      doc.setLineDash([2, 2], 0);
      doc.line(5, 190, 100, 190);
      doc.setLineDash([]);
      
      // Texte de sécurité
      doc.setFontSize(5);
      doc.setTextColor(180, 180, 180);
      doc.text("Conservez ce ticket jusqu'à la fin de l'événement", 52.5, 195, { align: 'center' });
    });

    // Nom du fichier PDF
    const safeTitle = event.title.substring(0,20).replace(/[^a-z0-9]/gi, '_');
    doc.save(`recu-${safeTitle}.pdf`);
    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return false;
  }
};

// Version alternative avec filigrane plus discret (optionnel)
export const generateReceiptPDF = (transaction, user, event = null) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a6'
    });

    // === FOND AVEC FILIGRANE "PAYE" ===
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 105, 148, 'F');
    
    // Filigrane "PAYE" léger
    doc.setTextColor(248, 250, 252); // Gris bleuté très clair
    doc.setFontSize(35);
    doc.setFont('helvetica', 'bold');
    
    // Positionner "PAYE" au centre
    doc.rotate(30 * Math.PI / 180, 52.5, 74);
    doc.text("PAYE", 30, 80);
    doc.text("PAYE", 80, 50);
    doc.text("PAYE", 40, 120);
    doc.rotate(-30 * Math.PI / 180, 52.5, 74);
    
    // === EN-TÊTE PROFESSIONNEL ===
    // Bandeau supérieur
    const gradient = doc.setGradientFill(0, 0, 105, 20, [79, 70, 229], [236, 72, 153], 'linear', [0, 0], [0, 1]);
    doc.rect(0, 0, 105, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("BONPLANINFOS", 52.5, 10, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("REÇU OFFICIEL DE PAIEMENT", 52.5, 16, { align: 'center' });
    
    // Badge "PAYE" avec effet
    doc.setFillColor(22, 163, 74);
    doc.roundedRect(75, 23, 25, 10, 5, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("PAYE", 87.5, 29, { align: 'center' });
    
    // === INFORMATIONS DE TRANSACTION ===
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("RÉSUMÉ DE LA TRANSACTION", 52.5, 40, { align: 'center' });
    
    // Cadre informations
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.rect(10, 45, 85, 60);
    
    // Ligne 1: Référence
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("Référence:", 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(transaction.id || transaction.reference, 40, 55);
    
    // Ligne 2: Date
    doc.setFont('helvetica', 'bold');
    doc.text("Date:", 15, 65);
    doc.setFont('helvetica', 'normal');
    const transDate = new Date(transaction.date || transaction.created_at);
    doc.text(transDate.toLocaleDateString('fr-FR') + " " + transDate.toLocaleTimeString('fr-FR'), 40, 65);
    
    // Ligne 3: Montant
    doc.setFont('helvetica', 'bold');
    doc.text("Montant:", 15, 75);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(11);
    doc.text(`${transaction.amount || 0} FCFA`, 40, 75);
    
    // Ligne 4: Méthode
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text("Méthode:", 15, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(transaction.method || transaction.payment_method || "Non spécifiée", 40, 85);
    
    // Ligne 5: Statut
    doc.setFont('helvetica', 'bold');
    doc.text("Statut:", 15, 95);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 163, 74);
    doc.text("PAYÉ AVEC SUCCÈS", 40, 95);
    
    // === INFORMATIONS CLIENT ===
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("INFORMATIONS CLIENT", 52.5, 110, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nom: ${user.full_name || user.name || "Non spécifié"}`, 15, 118);
    doc.text(`Email: ${user.email || "Non spécifié"}`, 15, 125);
    doc.text(`Téléphone: ${user.phone || user.telephone || "Non spécifié"}`, 15, 132);
    
    // === ÉVÉNEMENT (si applicable) ===
    if (event) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("ÉVÉNEMENT", 52.5, 142, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(event.title || "Événement non spécifié", 15, 150);
      if (event.date) {
        doc.text(new Date(event.date).toLocaleDateString('fr-FR'), 15, 156);
      }
    }
    
    // === PIED DE PAGE ===
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text("Ce document constitue une preuve de paiement officielle", 52.5, 165, { align: 'center' });
    doc.text("Conservez-le pour toute réclamation ou question", 52.5, 169, { align: 'center' });
    doc.text("contact@bonplaninfos.com | Support: +221 33 XXX XX XX", 52.5, 173, { align: 'center' });
    doc.text("© " + new Date().getFullYear() + " BonPlanInfos. Tous droits réservés.", 52.5, 177, { align: 'center' });
    
    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(10, 180, 95, 180);
    
    // Référence unique en bas
    doc.setFontSize(5);
    doc.setTextColor(150, 150, 150);
    const uniqueRef = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    doc.text(`Référence interne: ${uniqueRef}`, 52.5, 185, { align: 'center' });
    
    // Nom du fichier
    const fileName = `recu-paiement-${transaction.id || Date.now()}.pdf`;
    doc.save(fileName);
    
    return doc;
  } catch (error) {
    console.error("Error generating receipt PDF:", error);
    return false;
  }
};