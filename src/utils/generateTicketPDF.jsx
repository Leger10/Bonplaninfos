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

      // --- Background & Border ---
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 105, 148, 'F');
      
      // Determine Border Color based on ticket color
      let r=200, g=200, b=200;
      if (ticket.color === 'gold') { r=255; g=215; b=0; }
      if (ticket.color === 'silver') { r=192; g=192; b=192; }
      if (ticket.color === 'bronze') { r=205; g=127; b=50; }
      if (ticket.color === 'purple') { r=128; g=0; b=128; }
      if (ticket.color === 'red') { r=220; g=20; b=60; }
      if (ticket.color === 'blue') { r=59; g=130; b=246; }
      if (ticket.color === 'green') { r=34; g=197; b=94; }
      
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(1.5);
      doc.rect(5, 5, 95, 138, 'S'); // Inner border
      
      // --- Header Bar ---
      doc.setFillColor(r, g, b); 
      doc.rect(5, 5, 95, 22, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("TICKET D'ENTRÉE", 52.5, 17, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text("BonPlanInfos", 52.5, 23, { align: 'center' });

      // --- Event Title ---
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      
      const titleLines = doc.splitTextToSize((event.title || "Événement").toUpperCase(), 85);
      doc.text(titleLines, 52.5, 35, { align: 'center' });

      // --- Event Details ---
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      
      let dateStr = "Non spécifiée";
      let timeStr = "";
      if (event.event_date) {
          const d = new Date(event.event_date);
          dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          timeStr = d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
      }
      
      doc.text(`DATE:`, 10, 50);
      doc.setFont('helvetica', 'bold');
      doc.text(dateStr, 25, 50);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`HEURE:`, 10, 56);
      doc.setFont('helvetica', 'bold');
      doc.text(timeStr, 25, 56);
      
      const locationText = event.location || event.city || 'Voir adresse';
      doc.setFont('helvetica', 'normal');
      doc.text(`LIEU:`, 10, 62);
      doc.setFont('helvetica', 'bold');
      const locLines = doc.splitTextToSize(locationText, 70);
      doc.text(locLines, 25, 62);

      // --- Separator ---
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.setLineDash([2, 2], 0);
      doc.line(10, 75, 95, 75);
      doc.setLineDash([]);

      // --- Ticket Type & Price Badge ---
      doc.setFillColor(240, 240, 250); 
      doc.roundedRect(20, 80, 65, 18, 2, 2, 'F');
      
      doc.setTextColor(50, 50, 150);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(ticket.type_name || "Standard", 52.5, 87, { align: 'center' });
      
      if (ticket.price !== undefined) {
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          doc.text(`${ticket.price} π`, 52.5, 94, { align: 'center' });
      }

      // --- Attendee Info ---
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`NOM:`, 10, 108);
      doc.setFont('helvetica', 'bold');
      doc.text((user.full_name || user.email || "Invité").toUpperCase(), 30, 108);
      
      // --- Short Code Display ---
      doc.setFont('courier', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(ticket.ticket_code_short || ticket.ticket_number || "CODE", 52.5, 115, { align: 'center' });

      // --- QR Code ---
      // Using external API for QR generation in client-side PDF for simplicity
      const qrData = ticket.ticket_number || ticket.ticket_code_short || "ERROR";
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
      try {
          doc.addImage(qrUrl, 'PNG', 37.5, 118, 30, 30);
      } catch (e) {
          doc.setDrawColor(0);
          doc.rect(37.5, 118, 30, 30);
          doc.setFontSize(8);
          doc.text("QR Error", 52.5, 133, {align:'center'});
      }

      // --- Footer ---
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Ce ticket est unique. Ni échangeable, ni remboursable.", 52.5, 153, { align: 'center' });
    });

    const fileName = `billets-${event.title ? event.title.substring(0,10).replace(/[^a-z0-9]/gi, '_') : 'evenement'}.pdf`;
    doc.save(fileName);
    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return false;
  }
};