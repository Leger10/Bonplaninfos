// Dans pdfGenerator.js - version corrigée avec espacement
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const generateSalarySlip = (data) => {
  const doc = new jsPDF();
  const {
    adminName,
    zone,
    period,
    volumeZone,
    commissionBase, // 5% of volume
    licenseRate,
    personalScore,
    netSalary,
    date,
    logoUrl
  } = data;

  // Colors
  const primaryColor = [22, 163, 74]; // Green-600
  const secondaryColor = [71, 85, 105]; // Slate-600

  // Header
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text("BONPLANINFOS", 20, 20);
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("BULLETIN DE SALAIRE ADMIN", 105, 35, null, null, "center"); // Changé de y=20 à y=35

  // Info Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.rect(20, 50, 170, 40, 'FD'); // Changé de y=35 à y=50

  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text("ADMINISTRATEUR:", 25, 60); // Ajuster les positions y
  doc.text("ZONE:", 25, 70);
  doc.text("PÉRIODE:", 25, 80);
  doc.text("DATE D'ÉMISSION:", 110, 60); // Ajuster la position y

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(adminName || "N/A", 60, 60);
  doc.text(zone || "N/A", 60, 70);
  doc.text(period || format(new Date(), 'MMMM yyyy', { locale: fr }), 60, 80);
  doc.text(format(new Date(date), 'dd MMMM yyyy', { locale: fr }), 150, 60);

  // Table Header
  let y = 105; // Changé de 90 à 105
  doc.setFillColor(...primaryColor);
  doc.rect(20, y, 170, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text("DESIGNATION", 25, y + 7);
  doc.text("BASE / TAUX", 100, y + 7);
  doc.text("MONTANT (FCFA)", 160, y + 7);

  // Rows
  y += 18;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // 1. Volume Zone
  doc.text("Volume d'affaires Zone", 25, y);
  doc.text("-", 100, y);
  doc.text(volumeZone.toLocaleString('fr-FR'), 160, y);
  y += 10;

  // 2. Commission Plateforme
  doc.text("Commission Plateforme (Base Calcul)", 25, y);
  doc.text("5%", 100, y);
  doc.text(commissionBase.toLocaleString('fr-FR'), 160, y);
  y += 10;

  // 3. Part Admin (Licence)
  doc.text("Part Administrateur (Licence)", 25, y);
  doc.text(`${licenseRate}%`, 100, y);
  doc.text(((commissionBase * (licenseRate / 100))).toLocaleString('fr-FR'), 160, y);
  y += 10;

  // 4. Score Performance
  doc.text("Score de Performance", 25, y);
  doc.text(`${(personalScore * 100).toFixed(0)}%`, 100, y);
  doc.text("-", 160, y);
  y += 15;

  // Line
  doc.setDrawColor(0, 0, 0);
  doc.line(20, y, 190, y);
  y += 10;

  // Total
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SALAIRE NET À PAYER", 25, y);
  doc.setTextColor(...primaryColor);
  doc.text(`${netSalary.toLocaleString('fr-FR')} FCFA`, 160, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Ce document est généré automatiquement par la plateforme BonPlanInfos.", 105, 280, null, null, "center");
  doc.text("© 2025 BonPlanInfos. Tous droits réservés.", 105, 285, null, null, "center");

  doc.save(`bulletin_salaire_${format(new Date(), 'yyyy_MM')}_${adminName.replace(/\s+/g, '_')}.pdf`);
};

export const generateEarningsSlip = (data) => {
  const doc = new jsPDF();
  const {
    organizerName,
    period,
    totalRevenue,
    fees,
    netEarnings,
    transactionsCount,
    date
  } = data;

  // Colors
  const primaryColor = [79, 70, 229]; // Indigo-600
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text("BONPLANINFOS", 20, 20);
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("RELEVÉ DE GAINS", 105, 35, null, null, "center"); // Changé de y=20 à y=35

  // Info
  doc.setFontSize(10);
  doc.text("ORGANISATEUR:", 20, 50); // Changé de 40 à 50
  doc.setFont("helvetica", "bold");
  doc.text(organizerName || "Client", 60, 50); // Changé de 40 à 50
  
  doc.setFont("helvetica", "normal");
  doc.text("PÉRIODE:", 20, 60); // Changé de 50 à 60
  doc.setFont("helvetica", "bold");
  doc.text(period || format(new Date(), 'MMMM yyyy', { locale: fr }), 60, 60); // Changé de 50 à 60

  // Stats Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 247, 255);
  doc.roundedRect(20, 75, 170, 50, 3, 3, 'FD'); // Changé de y=60 à y=75

  doc.setFontSize(12);
  doc.setTextColor(0,0,0);
  doc.text("Détail des revenus", 30, 90); // Ajusté

  doc.setFontSize(10);
  doc.text("Revenus Bruts Générés:", 30, 105); // Ajusté
  doc.text(`${totalRevenue.toLocaleString('fr-FR')} FCFA`, 150, 105); // Ajusté

  doc.text("Frais de Service (5%):", 30, 115); // Ajusté
  doc.setTextColor(220, 38, 38); // Red
  doc.text(`- ${fees.toLocaleString('fr-FR')} FCFA`, 150, 115); // Ajusté

  // Net
  doc.setTextColor(0,0,0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("GAINS NETS DISPONIBLES", 30, 145); // Ajusté
  doc.setTextColor(...primaryColor);
  doc.text(`${netEarnings.toLocaleString('fr-FR')} FCFA`, 150, 145); // Ajusté

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Document généré le ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 280);
  
  doc.save(`releve_gains_${format(new Date(), 'yyyy_MM')}.pdf`);
};