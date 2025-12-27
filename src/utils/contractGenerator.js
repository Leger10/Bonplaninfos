import { jsPDF } from 'jspdf';

export const generateContractPDF = (tier, userProfile) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('fr-FR');
  
  // Configuration based on tier
  const config = {
    starter: {
      title: "CONTRAT DE PARTENARIAT - STARTER (VILLE)",
      zone: "Ville",
      commission: "40% des commissions",
      entry_fee: "1 000 000 FCFA",
      duration: "2 ans (730 jours)"
    },
    business: {
      title: "CONTRAT DE PARTENARIAT - BUSINESS (RÉGION)",
      zone: "Région",
      commission: "40% des commissions",
      entry_fee: "3 000 000 FCFA",
      duration: "3 ans (1095 jours)"
    },
    premium: {
      title: "CONTRAT DE PARTENARIAT - PREMIUM (PAYS)",
      zone: "Pays",
      commission: "40% des commissions",
      entry_fee: "5 000 000 FCFA",
      duration: "5 ans (1825 jours)"
    }
  }[tier] || { title: "CONTRAT", zone: "N/A", commission: "0%", entry_fee: "0", duration: "N/A" };

  // Helper to add centered text
  const addCenteredText = (text, y, size = 12, style = 'normal') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // Header
  addCenteredText(config.title, 20, 16, 'bold');
  addCenteredText(`Fait le : ${date}`, 30, 10, 'normal');

  // Parties
  let y = 50;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("ENTRE LES SOUSSIGNÉS :", 20, y);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.text("1. La plateforme BonPlanInfos.net, représentée par son administration.", 20, y);
  y += 10;
  doc.text(`2. Le Partenaire : ${userProfile?.full_name || '____________________'}`, 20, y);
  y += 7;
  doc.text(`   Email : ${userProfile?.email || '____________________'}`, 20, y);
  y += 7;
  doc.text(`   Téléphone : ${userProfile?.phone || '____________________'}`, 20, y);

  // Terms
  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.text("IL A ÉTÉ CONVENU CE QUI SUIT :", 20, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  const terms = [
    `Article 1 : Objet`,
    `Le présent contrat a pour objet de définir les conditions de partenariat pour la zone : ${config.zone}.`,
    ``,
    `Article 2 : Rémunération`,
    `Le Partenaire percevra une commission de ${config.commission} calculée sur les frais de plateforme`,
    `générés par les activités (votes, tombolas, billetterie, stands) dans sa zone de couverture.`,
    ``,
    `Article 3 : Droit d'entrée`,
    `Le Partenaire s'engage à verser un droit d'entrée de ${config.entry_fee} pour valider ce contrat.`,
    ``,
    `Article 4 : Durée`,
    `Ce contrat est conclu pour une durée de ${config.duration}, renouvelable selon les conditions générales.`,
    ``,
    `Article 5 : Engagements`,
    `Le Partenaire s'engage à promouvoir la plateforme dans sa zone et à respecter la charte éthique.`,
    `BonPlanInfos.net s'engage à verser les commissions mensuellement sur demande.`
  ];

  terms.forEach(line => {
    // Basic word wrap logic could be added here if needed, but these lines are short
    doc.text(line, 20, y);
    y += 7;
  });

  // Signatures
  y += 20;
  // Check page overflow
  if (y > 250) {
      doc.addPage();
      y = 20;
  }

  doc.text("Pour BonPlanInfos.net", 20, y);
  doc.text("Le Partenaire (Mention 'Lu et approuvé')", 120, y);
  
  doc.rect(20, y + 5, 70, 30); // Box for Admin signature
  doc.rect(120, y + 5, 70, 30); // Box for Partner signature

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(100);
  addCenteredText("Site web : https://bonplaninfos.net | Contact : admin@bonplaninfos.net", pageHeight - 10, 8);

  doc.save(`Contrat_BonPlanInfos_${tier.toUpperCase()}.pdf`);
};