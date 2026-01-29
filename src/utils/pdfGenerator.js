import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Helper pour formater les montants avec séparateur de milliers (espace)
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0';
  
  // Convertir en nombre
  let num = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
  if (isNaN(num)) num = 0;
  
  // Arrondir
  num = Math.round(num);
  
  // Formater avec espaces comme séparateurs
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// Fonction pour ajouter le logo
const addLogo = (doc, x, y, width = 24, height = 24) => {
  try {
    // Chemin vers votre logo (dans le dossier public)
    const logoPath = '/logo.png';
    
    // Ajouter l'image du logo
    doc.addImage(logoPath, 'PNG', x, y, width, height);
    
    return true;
  } catch (error) {
    console.log('Logo not found, using text fallback');
    
    // Fallback textuel si l'image n'est pas trouvée
    doc.setFillColor(255, 255, 255);
    doc.circle(x + width/2, y + height/2, width/2, 'F');
    
    doc.setTextColor(22, 163, 74); // Vert
    doc.setFontSize(width * 0.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BPI', x + width/2, y + height/2 + 2, { align: 'center' });
    
    return false;
  }
};

// Ajouter une signature au PDF
const addSignature = (doc, x, y, width = 80, height = 30) => {
  try {
    // Chemin vers votre signature (dans le dossier public)
    const signaturePath = '/signature.jpg';
    
    // Ajouter l'image de signature
    doc.addImage(signaturePath, 'JPEG', x, y, width, height);
    
    return true;
  } catch (error) {
    console.log('Signature image not found, using text signature');
    
    // Signature textuelle de secours
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229); // Violet
    doc.text('BONPLANINFOS', x + width/2, y + 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Service Financier', x + width/2, y + 22, { align: 'center' });
    
    return false;
  }
};

// Ajouter un cachet de validation
const addValidationStamp = (doc, x, y) => {
  // Cercle du cachet
  doc.setFillColor(34, 197, 94, 0.1); // Vert très transparent
  doc.circle(x, y, 15, 'F');
  
  doc.setDrawColor(34, 197, 94); // Vert
  doc.setLineWidth(1);
  doc.circle(x, y, 15, 'D');
  
  // Texte du cachet
  doc.setTextColor(34, 197, 94);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PAIÉ', x, y - 3, { align: 'center' });
  doc.text('✓', x, y + 2, { align: 'center' });
  doc.setFontSize(6);
  doc.text('VALIDÉ', x, y + 8, { align: 'center' });
};

export const generateSalarySlip = (data) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;
  
  const {
    adminName,
    zone,
    period,
    volumeZone = 0,
    commissionBase = 0,
    licenseRate = 0,
    personalScore = 1.0,
    netSalary = 0,
    date = new Date()
  } = data;
  
  // Couleurs
  const primaryColor = [22, 163, 74]; // Vert
  const secondaryColor = [71, 85, 105]; // Gris
  const accentColor = [79, 70, 229]; // Violet
  
  // ============ EN-TÊTE ============
  // Fond en-tête
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Logo - MODIFIÉ ICI
  // Au lieu du cercle blanc avec BPI, on utilise votre logo
  addLogo(doc, 18, 10, 24, 24); // Position x=18, y=10, taille 24x24mm
  
  // Titres
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  
  // Ajuster la position du texte si le logo est plus large
  const logoWidth = 24;
  const logoMargin = 5;
  const textStartX = 18 + logoWidth + logoMargin;
  
  doc.text('BONPLANINFOS', textStartX, 25);
  
  doc.setFontSize(16);
  doc.text('BULLETIN DE SALAIRE', pageWidth / 2, 35, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Document officiel certifié', pageWidth / 2, 40, { align: 'center' });
  
  // Ligne de séparation
  doc.setDrawColor(255, 255, 255, 0.5);
  doc.setLineWidth(0.5);
  doc.line(margin, 50, pageWidth - margin, 50);
  y = 60;
  
  // ============ INFORMATIONS ADMINISTRATEUR ============
  // Titre section
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS ADMINISTRATEUR', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // Cadre informations
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pageWidth - 2 * margin, 25);
  
  // Contenu sur 2 colonnes
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Colonne gauche
  doc.setTextColor(...secondaryColor);
  doc.text('Nom:', margin + 5, y + 8);
  doc.text('Zone:', margin + 5, y + 16);
  doc.text('Période:', margin + 5, y + 24);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(adminName || 'Administrateur', margin + 25, y + 8);
  doc.text(zone || 'Non spécifiée', margin + 25, y + 16);
  doc.text(period || format(new Date(), 'MMMM yyyy', { locale: fr }), margin + 25, y + 24);
  
  // Colonne droite
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Date d\'émission:', pageWidth / 2 + 10, y + 8);
  doc.text('N° Licence:', pageWidth / 2 + 10, y + 16);
  doc.text('Score:', pageWidth / 2 + 10, y + 24);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(format(new Date(date), 'dd/MM/yyyy', { locale: fr }), pageWidth - margin - 5, y + 8, { align: 'right' });
  doc.text('ADMIN', pageWidth - margin - 5, y + 16, { align: 'right' });
  doc.text(personalScore.toFixed(2).toString(), pageWidth - margin - 5, y + 24, { align: 'right' });
  
  y += 35;
  
  // ============ DÉTAIL DU CALCUL ============
  // Titre section
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAIL DU CALCUL DU SALAIRE', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // En-tête du tableau
  doc.setFillColor(...accentColor);
  doc.rect(margin, y, pageWidth - 2 * margin, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉSIGNATION', margin + 5, y + 7);
  doc.text('TAUX / BASE', margin + 100, y + 7);
  doc.text('MONTANT (FCFA)', pageWidth - margin - 5, y + 7, { align: 'right' });
  
  y += 12;
  
  // Ligne 1: Volume Zone
  addTableRow(doc, y, 'Volume total des ventes Zone', '100%', formatCurrency(volumeZone));
  y += 8;
  
  // Ligne 2: Commission Plateforme
  addTableRow(doc, y, 'Commission Plateforme (Base de calcul)', '5%', formatCurrency(commissionBase));
  y += 8;
  
  // Ligne 3: Part Administrateur
  const adminPart = commissionBase * (licenseRate / 100);
  addTableRow(doc, y, `Part Administrateur (Licence ${licenseRate}%)`, `${licenseRate}%`, formatCurrency(adminPart));
  y += 8;
  
  // Ligne 4: Score de Performance
  addTableRow(doc, y, 'Score de Performance (Multiplicateur)', `${(personalScore * 100).toFixed(0)}%`, `× ${personalScore.toFixed(2)}`);
  y += 12;
  
  // Ligne séparatrice
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  
  // ============ SALAIRE NET ============
  // Cadre salaire net
  doc.setFillColor(...primaryColor);
  doc.rect(margin, y, pageWidth - 2 * margin, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SALAIRE NET À PAYER', pageWidth / 2, y + 10, { align: 'center' });
  
  // Montant principal
  doc.setFontSize(28);
  doc.text(`${formatCurrency(netSalary)} FCFA`, pageWidth / 2, y + 20, { align: 'center' });
  
  // Conversion en euros
  if (netSalary > 0) {
    const amountEuro = (netSalary / 656).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`(≈ ${amountEuro} €)`, pageWidth / 2, y + 26, { align: 'center' });
  }
  
  y += 35;
  
  // ============ SIGNATURE ET VALIDATION ============
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('VALIDATION ET SIGNATURE', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // Ligne de signature
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  const lineLength = 100;
  const lineX = (pageWidth - lineLength) / 2;
  doc.line(lineX, y, lineX + lineLength, y);
  y += 5;
  
  // Ajouter la signature
  const signatureWidth = 80;
  const signatureHeight = 30;
  const signatureX = (pageWidth - signatureWidth) / 2;
  const signatureY = y;
  
  addSignature(doc, signatureX, signatureY, signatureWidth, signatureHeight);
  
  y += signatureHeight + 10;
  
  // Ajouter le cachet de validation
  addValidationStamp(doc, pageWidth - margin - 25, signatureY + 10);
  
  // ============ MENTIONS LÉGALES ============
  y += 10;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const mentions = [
    'Ce document certifie le calcul du salaire mensuel de l\'administrateur.',
    'Il peut être présenté à des fins comptables ou fiscales.',
    'Le paiement est effectué selon les modalités contractuelles.',
    'Document généré automatiquement par la plateforme BonPlanInfos.'
  ];
  
  mentions.forEach((mention, index) => {
    doc.text(mention, pageWidth / 2, y + (index * 4), { align: 'center' });
  });
  
  y += 20;
  
  // ============ PIED DE PAGE ============
  doc.setFillColor(...secondaryColor);
  doc.rect(0, 270, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('BONPLANINFOS - Plateforme d\'information et de services', pageWidth / 2, 278, { align: 'center' });
  doc.text('contact@bonplaninfos.net | www.bonplaninfos.net', pageWidth / 2, 285, { align: 'center' });
  doc.text('© 2025 Tous droits réservés - Document confidentiel', pageWidth / 2, 292, { align: 'center' });
  
  // ============ SAUVEGARDE ============
  const fileName = `bulletin_salaire_${adminName?.replace(/\s+/g, '_') || 'admin'}_${format(new Date(), 'yyyy_MM')}.pdf`;
  doc.save(fileName);
};

// Helper pour ajouter une ligne de tableau
const addTableRow = (doc, y, label, rate, amount) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Fond alterné
  const rowIndex = Math.floor((y - 82) / 8);
  if (rowIndex % 2 === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y - 5, pageWidth - 2 * margin, 8, 'F');
  }
  
  // Label
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(label, margin + 5, y);
  
  // Taux
  doc.setFont('helvetica', 'bold');
  doc.text(rate, margin + 100, y);
  
  // Montant
  doc.setTextColor(22, 163, 74); // Vert
  if (amount.includes('×')) {
    doc.setTextColor(79, 70, 229); // Violet pour le multiplicateur
  }
  doc.text(amount, pageWidth - margin - 5, y, { align: 'right' });
};

export const generateEarningsSlip = (data) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;
  
  const {
    organizerName,
    period,
    totalRevenue = 0,
    fees = 0,
    netEarnings = 0,
    date = new Date(),
    eventCount = 1
  } = data;
  
  // Couleurs
  const primaryColor = [79, 70, 229]; // Violet
  const secondaryColor = [71, 85, 105]; // Gris
  const accentColor = [245, 158, 11]; // Orange
  
  // ============ EN-TÊTE ============
  // Fond en-tête
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Logo - MODIFIÉ ICI
  addLogo(doc, 18, 10, 24, 24);
  
  // Titres
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  
  // Ajuster la position du texte
  const logoWidth = 24;
  const logoMargin = 5;
  const textStartX = 18 + logoWidth + logoMargin;
  
  doc.text('BONPLANINFOS', textStartX, 25);
  
  doc.setFontSize(16);
  doc.text('RELEVÉ DE GAINS ORGANISATEUR', pageWidth / 2, 35, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Document officiel de revenus', pageWidth / 2, 40, { align: 'center' });
  
  // Ligne de séparation
  doc.setDrawColor(255, 255, 255, 0.5);
  doc.setLineWidth(0.5);
  doc.line(margin, 50, pageWidth - margin, 50);
  y = 60;
  
  // ============ INFORMATIONS ORGANISATEUR ============
  // Titre section
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS ORGANISATEUR', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // Cadre informations
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pageWidth - 2 * margin, 20);
  
  // Contenu
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.setTextColor(...secondaryColor);
  doc.text('Nom:', margin + 5, y + 8);
  doc.text('Période:', margin + 5, y + 16);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(organizerName || 'Organisateur', margin + 25, y + 8);
  doc.text(period || format(new Date(), 'MMMM yyyy', { locale: fr }), margin + 25, y + 16);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Date d\'émission:', pageWidth - margin - 100, y + 8);
  doc.text('Événements:', pageWidth - margin - 100, y + 16);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(format(new Date(date), 'dd/MM/yyyy', { locale: fr }), pageWidth - margin - 5, y + 8, { align: 'right' });
  doc.text(eventCount.toString(), pageWidth - margin - 5, y + 16, { align: 'right' });
  
  y += 30;
  
  // ============ RÉSUMÉ DES REVENUS ============
  // Titre section
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉSUMÉ DES REVENUS', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // Cadre résumé
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageWidth - 2 * margin, 60, 'FD');
  
  // 1. Revenus totaux
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Revenus bruts générés:', margin + 10, y + 15);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${formatCurrency(totalRevenue)} FCFA`, pageWidth - margin - 10, y + 15, { align: 'right' });
  
  // Barre de progression
  doc.setFillColor(220, 220, 220);
  doc.rect(margin + 10, y + 20, pageWidth - 2 * margin - 20, 6, 'F');
  
  doc.setFillColor(...accentColor);
  const progressWidth = Math.min(100, (totalRevenue / (totalRevenue || 1)) * 100);
  doc.rect(margin + 10, y + 20, (progressWidth / 100) * (pageWidth - 2 * margin - 20), 6, 'F');
  
  y += 30;
  
  // 2. Frais de service
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Frais de service (5%):', margin + 10, y + 5);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38); // Rouge
  doc.text(`- ${formatCurrency(fees)} FCFA`, pageWidth - margin - 10, y + 5, { align: 'right' });
  
  y += 20;
  
  // Ligne séparatrice
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(1);
  doc.line(margin + 10, y, pageWidth - margin - 10, y);
  y += 10;
  
  // ============ GAINS NETS ============
  // Titre gains nets
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('GAINS NETS DISPONIBLES', margin + 10, y);
  
  // Montant gains nets
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.text(`${formatCurrency(netEarnings)} FCFA`, pageWidth - margin - 10, y, { align: 'right' });
  
  // // Conversion en euros
  // if (netEarnings > 0) {
  //   const amountEuro = (netEarnings / 656).toLocaleString('fr-FR', {
  //     minimumFractionDigits: 2,
  //     maximumFractionDigits: 2
  //   });
  //   doc.setFontSize(11);
  //   doc.setFont('helvetica', 'italic');
  //   doc.setTextColor(100, 100, 100);
  //   doc.text(`(≈ ${amountEuro} €)`, pageWidth - margin - 10, y + 8, { align: 'right' });
  // }
  
  y += 30;
  
  // ============ SIGNATURE ET VALIDATION ============
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('VALIDATION ET SIGNATURE', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // Ligne de signature
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  const lineLength = 100;
  const lineX = (pageWidth - lineLength) / 2;
  doc.line(lineX, y, lineX + lineLength, y);
  y += 5;
  
  // Ajouter la signature
  const signatureWidth = 70;
  const signatureHeight = 25;
  const signatureX = (pageWidth - signatureWidth) / 2;
  const signatureY = y;
  
  addSignature(doc, signatureX, signatureY, signatureWidth, signatureHeight);
  
  y += signatureHeight + 10;
  
  // Ajouter le cachet de validation
  addValidationStamp(doc, pageWidth - margin - 25, signatureY + 8);
  
  // ============ MENTIONS LÉGALES ============
  y += 10;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const earningsMentions = [
    'Ce document présente un récapitulatif des gains générés sur la période.',
    'Les frais de service de 5% sont prélevés sur les revenus bruts.',
    'Les gains nets sont disponibles pour retrait selon les modalités contractuelles.',
    'Document généré automatiquement par la plateforme BonPlanInfos.'
  ];
  
  earningsMentions.forEach((mention, index) => {
    doc.text(mention, pageWidth / 2, y + (index * 4), { align: 'center' });
  });
  
  y += 20;
  
  // ============ PIED DE PAGE ============
  doc.setFillColor(...secondaryColor);
  doc.rect(0, 270, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('BONPLANINFOS - Plateforme d\'événements et billetterie', pageWidth / 2, 278, { align: 'center' });
  doc.text('contact@bonplaninfos.net | www.bonplaninfos.net', pageWidth / 2, 285, { align: 'center' });
  doc.text('© 2025 Tous droits réservés - Document confidentiel', pageWidth / 2, 292, { align: 'center' });
  
  // ============ SAUVEGARDE ============
  const fileName = `releve_gains_${organizerName?.replace(/\s+/g, '_') || 'organisateur'}_${format(new Date(), 'yyyy_MM')}.pdf`;
  doc.save(fileName);
};

// Fonction pour générer un reçu de paiement simplifié
export const generatePaymentReceipt = (data) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;
  
  const {
    recipientName,
    amount,
    paymentType,
    reference,
    date = new Date(),
    description
  } = data;
  
  // Couleurs
  const primaryColor = [34, 197, 94]; // Vert
  const secondaryColor = [71, 85, 105]; // Gris
  
  // ============ EN-TÊTE ============
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Logo - MODIFIÉ ICI
  addLogo(doc, 18, 8, 20, 20);
  
  // Titres
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  
  const logoWidth = 20;
  const logoMargin = 5;
  const textStartX = 18 + logoWidth + logoMargin;
  
  doc.text('BONPLANINFOS', textStartX, 23);
  
  doc.setFontSize(16);
  doc.text('REÇU DE PAIEMENT', pageWidth / 2, 33, { align: 'center' });
  
  // Ligne de séparation
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.line(margin, 45, pageWidth - margin, 45);
  y = 55;
  
  // ============ INFORMATIONS ============
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Informations de base
  doc.text(`Date: ${format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr })}`, margin, y);
  doc.text(`Référence: ${reference || 'N/A'}`, pageWidth - margin, y, { align: 'right' });
  y += 8;
  
  doc.text(`Type: ${paymentType || 'Paiement'}`, margin, y);
  doc.text(`Statut: PAYÉ`, pageWidth - margin, y, { align: 'right' });
  y += 15;
  
  // Bénéficiaire
  doc.setFont('helvetica', 'bold');
  doc.text('BÉNÉFICIAIRE:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(recipientName || 'Non spécifié', margin + 40, y);
  y += 8;
  
  // Description
  if (description) {
    doc.text('Description:', margin, y);
    doc.text(description, margin + 40, y);
    y += 15;
  }
  
  // ============ MONTANT ============
  doc.setFillColor(240, 253, 244); // Vert très clair
  doc.rect(margin, y, pageWidth - 2 * margin, 40, 'F');
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(2);
  doc.rect(margin, y, pageWidth - 2 * margin, 40, 'D');
  
  y += 15;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('MONTANT VERSÉ', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  const formattedAmount = formatCurrency(amount);
  doc.setFontSize(32);
  doc.setTextColor(...primaryColor);
  doc.text(`${formattedAmount} FCFA`, pageWidth / 2, y, { align: 'center' });
  
  if (amount > 0) {
    const amountEuro = (amount / 656).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`(≈ ${amountEuro} €)`, pageWidth / 2, y + 8, { align: 'center' });
  }
  
  y += 40;
  
  // ============ SIGNATURE ============
  addSignature(doc, pageWidth / 2 - 40, y, 80, 25);
  y += 30;
  
  // ============ MENTIONS ============
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Ce document certifie que le paiement a été effectué avec succès.', 
          pageWidth / 2, y, { align: 'center' });
  doc.text('Il peut être présenté à des fins comptables ou fiscales.', 
          pageWidth / 2, y + 5, { align: 'center' });
  
  // ============ PIED DE PAGE ============
  doc.setFillColor(...secondaryColor);
  doc.rect(0, 270, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('BONPLANINFOS - Service financier', pageWidth / 2, 278, { align: 'center' });
  doc.text('contact@bonplaninfos.net | www.bonplaninfos.net', pageWidth / 2, 285, { align: 'center' });
  doc.text('© 2025 - Document généré automatiquement', pageWidth / 2, 292, { align: 'center' });
  
  // Sauvegarde
  const fileName = `recu_paiement_${reference || format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(fileName);
};