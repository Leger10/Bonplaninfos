import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Book, Shield, DollarSign, AlertCircle, Users, HelpCircle, 
  ChevronRight, FileText, MapPin, Landmark, Globe2, Download,
  QrCode, Gift, Vote, Ticket, Store, Scale, Upload, Menu, X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { jsPDF } from 'jspdf';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const DocumentationPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const sections = [
    { id: 'overview', title: 'Vue d\'ensemble', icon: <Book className="w-4 h-4" /> },
    { id: 'fund-release', title: 'Déblocage des Fonds', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'validation', title: 'Validation Événements', icon: <Shield className="w-4 h-4" /> },
    { id: 'contracts', title: 'Contrats & Licences', icon: <FileText className="w-4 h-4" /> },
    { id: 'organizer', title: 'Contrat Organisateur', icon: <Scale className="w-4 h-4" /> },
    { id: 'fraud', title: 'Sécurité & Fraude', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'faq', title: 'FAQ', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  // Informations préremplies pour BonPlanInfos
  const BONPLANINFOS_INFO = {
    responsable: 'M. Kibora A. Yacoua',
    fonction: 'Président Directeur Général (CEO)',
    societe: 'BONPLANINFOS, plateforme digitale événementielle panafricaine',
    siege: 'Ouagadougou, Burkina Faso',
    email: 'support@bonplaninfos.net',
    telephone: '+225 07 12 27 53 74 / +226 54 32 92 99',
    signature: '/signature.jpg'
  };

  // Fonction utilitaire pour vérifier et ajouter une page si nécessaire
  const checkPageBreak = (doc, y, margin = 20, requiredSpace = 30) => {
    if (y > 270) {
      doc.addPage();
      return 20;
    }
    return y;
  };

  // Fonction de téléchargement des contrats de licence en VRAI PDF avec gestion multi-pages
  const downloadContract = (type) => {
    const doc = new jsPDF();
    let y = 20;
    
    switch(type) {
      case 'ville':
        // PAGE 1 - En-tête et parties communes
        doc.setFontSize(18);
        doc.setTextColor(41, 128, 185);
        doc.text('CONTRAT DE CONCESSION STARTER – VILLE', 20, y);
        y += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('(Licence territoriale urbaine BonPlanInfos)', 20, y);
        y += 15;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text('ENTRE LES SOUSSIGNÉS :', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.text('La société / plateforme :', 20, y);
        y += 7;
        doc.text(BONPLANINFOS_INFO.societe, 25, y);
        y += 7;
        doc.text(`Représentée par : ${BONPLANINFOS_INFO.responsable}`, 25, y);
        y += 7;
        doc.text(`Fonction : ${BONPLANINFOS_INFO.fonction}`, 25, y);
        y += 7;
        doc.text(`Siège social : ${BONPLANINFOS_INFO.siege}`, 25, y);
        y += 7;
        doc.text(`Email : ${BONPLANINFOS_INFO.email} / Tél: ${BONPLANINFOS_INFO.telephone}`, 25, y);
        y += 10;
        
        doc.text('Ci-après dénommée « Le Concédant »', 20, y);
        y += 10;
        
        doc.text('ET', 20, y);
        y += 10;
        
        doc.text('Le Concessionnaire :', 20, y);
        y += 7;
        doc.text('Nom / Raison sociale : _________________________', 25, y);
        y += 7;
        doc.text('Forme juridique : _________________________', 25, y);
        y += 7;
        doc.text('Adresse : _________________________', 25, y);
        y += 7;
        doc.text('Téléphone / Email : _________________________', 25, y);
        y += 7;
        doc.text('Représenté par : _________________________', 25, y);
        y += 7;
        doc.text('Fonction : _________________________', 25, y);
        y += 15;
        
        y = checkPageBreak(doc, y);
        
        // Articles 1-3
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('ARTICLE 1 – Objet', 20, y);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text('Le présent contrat a pour objet de conférer au Concessionnaire le droit exclusif', 20, y);
        y += 5;
        doc.text("d'exploiter la plateforme BonPlanInfos dans la ville de : _________________________", 20, y);
        y += 10;
        
        y = checkPageBreak(doc, y);
        
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('ARTICLE 2 – Territoire', 20, y);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text('Le territoire concédé est strictement limité à la ville mentionnée ci-dessus.', 20, y);
        y += 5;
        doc.text('Toute exploitation hors de ce périmètre est interdite sans autorisation écrite du Concédant.', 20, y);
        y += 10;
        
        y = checkPageBreak(doc, y);
        
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('ARTICLE 3 – Durée', 20, y);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text('Le présent contrat est conclu pour une durée de deux (2) ans, à compter du :', 20, y);
        y += 5;
        doc.text('📅 _________________________, renouvelable sous réserve de performance.', 20, y);
        y += 10;
        
        y = checkPageBreak(doc, y);
        
        // Articles 4-6
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('ARTICLE 4 – Exclusivité', 20, y);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text('Le Concessionnaire bénéficie d’une exclusivité territoriale urbaine pendant la durée du contrat.', 20, y);
        y += 10;
        
        y = checkPageBreak(doc, y);
        
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('ARTICLE 5 – Droit d’entrée', 20, y);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text('Le Concessionnaire verse un droit d’entrée unique et non remboursable de : 1 000 000 FCFA', 20, y);
        y += 5;
        doc.text('Payé le : _________________________', 20, y);
        y += 5;
        doc.text('Mode de paiement : _________________________', 20, y);
        y += 10;
        
        y = checkPageBreak(doc, y);
        
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('ARTICLE 6 – Obligations du Concessionnaire', 20, y);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text('• Disposer d’un point de représentation physique', 25, y);
        y += 5;
        doc.text('• Désigner un responsable local', 25, y);
        y += 5;
        doc.text('• Promouvoir activement la plateforme', 25, y);
        y += 5;
        doc.text('• Respecter l’image et les standards BonPlanInfos', 25, y);
        y += 5;
        doc.text('• Transmettre des rapports mensuels', 25, y);
        y += 10;
        
        y = checkPageBreak(doc, y);
        
        // Articles 7-9
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('ARTICLE 7 – Rémunération', 20, y);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text('Le Concessionnaire perçoit : 20 % des revenus issus des 5 % de commission', 20, y);
        y += 5;
        doc.text('plateforme générés dans sa ville.', 20, y);
        y += 10;
        
        y = checkPageBreak(doc, y);
        
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('ARTICLE 8 – Résiliation', 20, y);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text('• Révocation pour inaction/sous-performance : remboursement de 50% du droit d\'entrée', 20, y);
        y += 5;
        doc.text('• Démission volontaire : aucun remboursement', 20, y);
        y += 10;
        
        y = checkPageBreak(doc, y);
        
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('ARTICLE 9 – Droit applicable', 20, y);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text('Le présent contrat est régi par le droit OHADA.', 20, y);
        y += 15;
        
        y = checkPageBreak(doc, y);
        
        // Signatures
        doc.text('Fait à : _________________________', 20, y);
        y += 7;
        doc.text('Le : _________________________', 20, y);
        y += 15;
        
        y = checkPageBreak(doc, y);
        
        // Signature du Concédant (BonPlanInfos)
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('LE CONCÉDANT (BonPlanInfos)', 20, y);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Nom : ${BONPLANINFOS_INFO.responsable}`, 20, y);
        y += 6;
        doc.text(`Fonction : ${BONPLANINFOS_INFO.fonction}`, 20, y);
        y += 6;
        doc.text('Signature :', 20, y);
        
        try {
          doc.addImage(BONPLANINFOS_INFO.signature, 'JPEG', 45, y-5, 30, 10);
        } catch(e) {
          doc.text('[SIGNATURE]', 45, y);
        }
        
        y += 10;
        doc.text('Cachet : [CACHET OFFICIEL BONPLANINFOS]', 20, y);
        y += 15;
        
        y = checkPageBreak(doc, y);
        
        // Signature du Concessionnaire
        doc.setFontSize(11);
        doc.setTextColor(41, 128, 185);
        doc.text('LE CONCESSIONNAIRE', 20, y);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.text('Nom : _________________________', 20, y);
        y += 6;
        doc.text('Fonction : _________________________', 20, y);
        y += 6;
        doc.text('Signature : _________________________', 20, y);
        y += 6;
        doc.text('Cachet : _________________________', 20, y);
        y += 6;
        doc.text('Date : _________________________', 20, y);
        
        doc.save('Contrat_Licence_Ville_BonPlanInfos.pdf');
        break;
      
      case 'region':
        const docRegion = new jsPDF();
        let yRegion = 20;
        
        // PAGE 1
        docRegion.setFontSize(18);
        docRegion.setTextColor(155, 89, 182);
        docRegion.text('CONTRAT DE CONCESSION BUSINESS – RÉGION', 20, yRegion);
        yRegion += 10;
        
        docRegion.setFontSize(12);
        docRegion.setTextColor(100, 100, 100);
        docRegion.text('(Licence territoriale régionale BonPlanInfos)', 20, yRegion);
        yRegion += 15;
        
        docRegion.setTextColor(0, 0, 0);
        docRegion.setFontSize(11);
        docRegion.text('ENTRE LES SOUSSIGNÉS :', 20, yRegion);
        yRegion += 10;
        
        docRegion.setFontSize(10);
        docRegion.text('La société / plateforme :', 20, yRegion);
        yRegion += 7;
        docRegion.text(BONPLANINFOS_INFO.societe, 25, yRegion);
        yRegion += 7;
        docRegion.text(`Représentée par : ${BONPLANINFOS_INFO.responsable}`, 25, yRegion);
        yRegion += 7;
        docRegion.text(`Fonction : ${BONPLANINFOS_INFO.fonction}`, 25, yRegion);
        yRegion += 7;
        docRegion.text(`Siège social : ${BONPLANINFOS_INFO.siege}`, 25, yRegion);
        yRegion += 7;
        docRegion.text(`Email : ${BONPLANINFOS_INFO.email} / Tél: ${BONPLANINFOS_INFO.telephone}`, 25, yRegion);
        yRegion += 10;
        
        docRegion.text('Ci-après dénommée « Le Concédant »', 20, yRegion);
        yRegion += 10;
        docRegion.text('ET', 20, yRegion);
        yRegion += 10;
        
        docRegion.text('Le Concessionnaire régional :', 20, yRegion);
        yRegion += 7;
        docRegion.text('Nom / Raison sociale : _________________________', 25, yRegion);
        yRegion += 7;
        docRegion.text('Forme juridique : _________________________', 25, yRegion);
        yRegion += 7;
        docRegion.text('Adresse : _________________________', 25, yRegion);
        yRegion += 7;
        docRegion.text('Téléphone / Email : _________________________', 25, yRegion);
        yRegion += 7;
        docRegion.text('Représenté par : _________________________', 25, yRegion);
        yRegion += 7;
        docRegion.text('Fonction : _________________________', 25, yRegion);
        yRegion += 15;
        
        yRegion = checkPageBreak(docRegion, yRegion);
        
        // Articles
        docRegion.setFontSize(11);
        docRegion.setTextColor(155, 89, 182);
        docRegion.text('ARTICLE 1 – Objet', 20, yRegion);
        yRegion += 7;
        docRegion.setTextColor(0, 0, 0);
        docRegion.setFontSize(9);
        docRegion.text('Le présent contrat confère au Concessionnaire l\'exclusivité régionale', 20, yRegion);
        yRegion += 5;
        docRegion.text("d'exploitation de BonPlanInfos sur la région de : _________________________", 20, yRegion);
        yRegion += 10;
        
        yRegion = checkPageBreak(docRegion, yRegion);
        
        docRegion.setFontSize(11);
        docRegion.setTextColor(155, 89, 182);
        docRegion.text('ARTICLE 2 – Durée', 20, yRegion);
        yRegion += 7;
        docRegion.setTextColor(0, 0, 0);
        docRegion.setFontSize(9);
        docRegion.text('Durée du contrat : trois (3) ans, à compter du : _________________________', 20, yRegion);
        yRegion += 10;
        
        yRegion = checkPageBreak(docRegion, yRegion);
        
        docRegion.setFontSize(11);
        docRegion.setTextColor(155, 89, 182);
        docRegion.text('ARTICLE 3 – Droit d’entrée', 20, yRegion);
        yRegion += 7;
        docRegion.setTextColor(0, 0, 0);
        docRegion.setFontSize(9);
        docRegion.text('Le Concessionnaire verse un droit d’entrée unique de : 3 000 000 FCFA', 20, yRegion);
        yRegion += 5;
        docRegion.text('Payé le : _________________________', 20, yRegion);
        yRegion += 5;
        docRegion.text('Mode de paiement : _________________________', 20, yRegion);
        yRegion += 10;
        
        yRegion = checkPageBreak(docRegion, yRegion);
        
        docRegion.setFontSize(11);
        docRegion.setTextColor(155, 89, 182);
        docRegion.text('ARTICLE 4 – Obligations', 20, yRegion);
        yRegion += 7;
        docRegion.setTextColor(0, 0, 0);
        docRegion.setFontSize(9);
        docRegion.text('• Maintenir un bureau régional', 25, yRegion);
        yRegion += 5;
        docRegion.text('• Employer au moins deux (2) agents', 25, yRegion);
        yRegion += 5;
        docRegion.text('• Encadrer les concessions villes', 25, yRegion);
        yRegion += 5;
        docRegion.text('• Développer des partenariats régionaux', 25, yRegion);
        yRegion += 10;
        
        yRegion = checkPageBreak(docRegion, yRegion);
        
        docRegion.setFontSize(11);
        docRegion.setTextColor(155, 89, 182);
        docRegion.text('ARTICLE 5 – Rémunération', 20, yRegion);
        yRegion += 7;
        docRegion.setTextColor(0, 0, 0);
        docRegion.setFontSize(9);
        docRegion.text('Le Concessionnaire perçoit : 30 % des revenus plateforme (5 %)', 20, yRegion);
        yRegion += 5;
        docRegion.text('générés dans sa région.', 20, yRegion);
        yRegion += 10;
        
        yRegion = checkPageBreak(docRegion, yRegion);
        
        docRegion.setFontSize(11);
        docRegion.setTextColor(155, 89, 182);
        docRegion.text('ARTICLE 6 – Résiliation', 20, yRegion);
        yRegion += 7;
        docRegion.setTextColor(0, 0, 0);
        docRegion.setFontSize(9);
        docRegion.text('• Révocation pour inaction/sous-performance : remboursement de 50% du droit d\'entrée', 20, yRegion);
        yRegion += 5;
        docRegion.text('• Démission volontaire : aucun remboursement', 20, yRegion);
        yRegion += 15;
        
        yRegion = checkPageBreak(docRegion, yRegion);
        
        docRegion.text('Fait à : _________________________', 20, yRegion);
        yRegion += 7;
        docRegion.text('Le : _________________________', 20, yRegion);
        yRegion += 15;
        
        yRegion = checkPageBreak(docRegion, yRegion);
        
        // Signature du Concédant
        docRegion.setFontSize(11);
        docRegion.setTextColor(155, 89, 182);
        docRegion.text('LE CONCÉDANT (BonPlanInfos)', 20, yRegion);
        yRegion += 7;
        docRegion.setTextColor(0, 0, 0);
        docRegion.setFontSize(10);
        docRegion.text(`Nom : ${BONPLANINFOS_INFO.responsable}`, 20, yRegion);
        yRegion += 6;
        docRegion.text(`Fonction : ${BONPLANINFOS_INFO.fonction}`, 20, yRegion);
        yRegion += 6;
        docRegion.text('Signature :', 20, yRegion);
        
        try {
          docRegion.addImage(BONPLANINFOS_INFO.signature, 'JPEG', 45, yRegion-5, 30, 10);
        } catch(e) {
          docRegion.text('[SIGNATURE]', 45, yRegion);
        }
        
        yRegion += 10;
        docRegion.text('Cachet : [CACHET OFFICIEL BONPLANINFOS]', 20, yRegion);
        yRegion += 15;
        
        yRegion = checkPageBreak(docRegion, yRegion);
        
        // Signature du Concessionnaire
        docRegion.setFontSize(11);
        docRegion.setTextColor(155, 89, 182);
        docRegion.text('LE CONCESSIONNAIRE', 20, yRegion);
        yRegion += 7;
        docRegion.setTextColor(0, 0, 0);
        docRegion.text('Nom : _________________________', 20, yRegion);
        yRegion += 6;
        docRegion.text('Fonction : _________________________', 20, yRegion);
        yRegion += 6;
        docRegion.text('Signature : _________________________', 20, yRegion);
        yRegion += 6;
        docRegion.text('Cachet : _________________________', 20, yRegion);
        yRegion += 6;
        docRegion.text('Date : _________________________', 20, yRegion);
        
        docRegion.save('Contrat_Licence_Region_BonPlanInfos.pdf');
        break;
      
      case 'pays':
        const docPays = new jsPDF();
        let yPays = 20;
        
        // PAGE 1
        docPays.setFontSize(18);
        docPays.setTextColor(241, 196, 15);
        docPays.text('CONTRAT DE CONCESSION PREMIUM – PAYS', 20, yPays);
        yPays += 10;
        
        docPays.setFontSize(12);
        docPays.setTextColor(100, 100, 100);
        docPays.text('(Franchise nationale BonPlanInfos)', 20, yPays);
        yPays += 15;
        
        docPays.setTextColor(0, 0, 0);
        docPays.setFontSize(11);
        docPays.text('ENTRE LES SOUSSIGNÉS :', 20, yPays);
        yPays += 10;
        
        docPays.setFontSize(10);
        docPays.text('La société / plateforme :', 20, yPays);
        yPays += 7;
        docPays.text(BONPLANINFOS_INFO.societe, 25, yPays);
        yPays += 7;
        docPays.text(`Représentée par : ${BONPLANINFOS_INFO.responsable}`, 25, yPays);
        yPays += 7;
        docPays.text(`Fonction : ${BONPLANINFOS_INFO.fonction}`, 25, yPays);
        yPays += 7;
        docPays.text(`Siège social : ${BONPLANINFOS_INFO.siege}`, 25, yPays);
        yPays += 7;
        docPays.text(`Email : ${BONPLANINFOS_INFO.email} / Tél: ${BONPLANINFOS_INFO.telephone}`, 25, yPays);
        yPays += 10;
        
        docPays.text('Ci-après dénommée « Le Concédant »', 20, yPays);
        yPays += 10;
        docPays.text('ET', 20, yPays);
        yPays += 10;
        
        docPays.text('Le Concessionnaire national :', 20, yPays);
        yPays += 7;
        docPays.text('Nom / Raison sociale : _________________________', 25, yPays);
        yPays += 7;
        docPays.text('Forme juridique : _________________________', 25, yPays);
        yPays += 7;
        docPays.text('Adresse : _________________________', 25, yPays);
        yPays += 7;
        docPays.text('Téléphone / Email : _________________________', 25, yPays);
        yPays += 7;
        docPays.text('Représenté par : _________________________', 25, yPays);
        yPays += 7;
        docPays.text('Fonction : _________________________', 25, yPays);
        yPays += 15;
        
        yPays = checkPageBreak(docPays, yPays);
        
        // Articles
        docPays.setFontSize(11);
        docPays.setTextColor(241, 196, 15);
        docPays.text('ARTICLE 1 – Objet', 20, yPays);
        yPays += 7;
        docPays.setTextColor(0, 0, 0);
        docPays.setFontSize(9);
        docPays.text('Le Concédant accorde au Concessionnaire l\'exclusivité nationale', 20, yPays);
        yPays += 5;
        docPays.text("d'exploitation de la plateforme BonPlanInfos dans le pays suivant :", 20, yPays);
        yPays += 5;
        docPays.text('👉 _________________________', 20, yPays);
        yPays += 10;
        
        yPays = checkPageBreak(docPays, yPays);
        
        docPays.setFontSize(11);
        docPays.setTextColor(241, 196, 15);
        docPays.text('ARTICLE 2 – Durée', 20, yPays);
        yPays += 7;
        docPays.setTextColor(0, 0, 0);
        docPays.setFontSize(9);
        docPays.text('Contrat conclu pour une durée de cinq (5) ans, à compter du : _________________________', 20, yPays);
        yPays += 10;
        
        yPays = checkPageBreak(docPays, yPays);
        
        docPays.setFontSize(11);
        docPays.setTextColor(241, 196, 15);
        docPays.text('ARTICLE 3 – Droit d’entrée', 20, yPays);
        yPays += 7;
        docPays.setTextColor(0, 0, 0);
        docPays.setFontSize(9);
        docPays.text('Le Concessionnaire verse un droit d’entrée unique de : _________ FCFA', 20, yPays);
        yPays += 5;
        docPays.text('(entre 5 000 000 et 10 000 000 FCFA selon le pays)', 25, yPays);
        yPays += 5;
        docPays.text('Payé le : _________________________', 20, yPays);
        yPays += 5;
        docPays.text('Mode de paiement : _________________________', 20, yPays);
        yPays += 10;
        
        yPays = checkPageBreak(docPays, yPays);
        
        docPays.setFontSize(11);
        docPays.setTextColor(241, 196, 15);
        docPays.text('ARTICLE 4 – Obligations', 20, yPays);
        yPays += 7;
        docPays.setTextColor(0, 0, 0);
        docPays.setFontSize(9);
        docPays.text('• Installer un siège national', 25, yPays);
        yPays += 5;
        docPays.text('• Recruter 3 à 5 employés minimum', 25, yPays);
        yPays += 5;
        docPays.text('• Représenter officiellement BonPlanInfos', 25, yPays);
        yPays += 5;
        docPays.text('• Superviser régions et villes', 25, yPays);
        yPays += 5;
        docPays.text('• Assurer la conformité légale locale', 25, yPays);
        yPays += 10;
        
        yPays = checkPageBreak(docPays, yPays);
        
        docPays.setFontSize(11);
        docPays.setTextColor(241, 196, 15);
        docPays.text('ARTICLE 5 – Rémunération', 20, yPays);
        yPays += 7;
        docPays.setTextColor(0, 0, 0);
        docPays.setFontSize(9);
        docPays.text('Le Concessionnaire perçoit : 40 % des revenus plateforme (5 %)', 20, yPays);
        yPays += 5;
        docPays.text('générés sur le territoire national.', 20, yPays);
        yPays += 10;
        
        yPays = checkPageBreak(docPays, yPays);
        
        docPays.setFontSize(11);
        docPays.setTextColor(241, 196, 15);
        docPays.text('ARTICLE 6 – Propriété et contrôle', 20, yPays);
        yPays += 7;
        docPays.setTextColor(0, 0, 0);
        docPays.setFontSize(9);
        docPays.text('La marque, la technologie et les données restent la propriété exclusive de BonPlanInfos.', 20, yPays);
        yPays += 10;
        
        yPays = checkPageBreak(docPays, yPays);
        
        docPays.setFontSize(11);
        docPays.setTextColor(241, 196, 15);
        docPays.text('ARTICLE 7 – Résiliation', 20, yPays);
        yPays += 7;
        docPays.setTextColor(0, 0, 0);
        docPays.setFontSize(9);
        docPays.text('• Révocation pour inaction/sous-performance : remboursement de 50% du droit d\'entrée', 20, yPays);
        yPays += 5;
        docPays.text('• Démission volontaire : aucun remboursement', 20, yPays);
        yPays += 5;
        docPays.text('• Faute grave ou atteinte à la marque : résiliation immédiate', 20, yPays);
        yPays += 10;
        
        yPays = checkPageBreak(docPays, yPays);
        
        docPays.setFontSize(11);
        docPays.setTextColor(241, 196, 15);
        docPays.text('ARTICLE 8 – Droit applicable', 20, yPays);
        yPays += 7;
        docPays.setTextColor(0, 0, 0);
        docPays.setFontSize(9);
        docPays.text('Le présent contrat est régi par le droit OHADA.', 20, yPays);
        yPays += 15;
        
        yPays = checkPageBreak(docPays, yPays);
        
        docPays.text('Fait à : _________________________', 20, yPays);
        yPays += 7;
        docPays.text('Le : _________________________', 20, yPays);
        yPays += 15;
        
        yPays = checkPageBreak(docPays, yPays);
        
        // Signature du Concédant
        docPays.setFontSize(11);
        docPays.setTextColor(241, 196, 15);
        docPays.text('LE CONCÉDANT (BonPlanInfos)', 20, yPays);
        yPays += 7;
        docPays.setTextColor(0, 0, 0);
        docPays.setFontSize(10);
        docPays.text(`Nom : ${BONPLANINFOS_INFO.responsable}`, 20, yPays);
        yPays += 6;
        docPays.text(`Fonction : ${BONPLANINFOS_INFO.fonction}`, 20, yPays);
        yPays += 6;
        docPays.text('Signature :', 20, yPays);
        
        try {
          docPays.addImage(BONPLANINFOS_INFO.signature, 'JPEG', 45, yPays-5, 30, 10);
        } catch(e) {
          docPays.text('[SIGNATURE]', 45, yPays);
        }
        
        yPays += 10;
        docPays.text('Cachet : [CACHET OFFICIEL BONPLANINFOS]', 20, yPays);
        yPays += 15;
        
        yPays = checkPageBreak(docPays, yPays);
        
        // Signature du Concessionnaire
        docPays.setFontSize(11);
        docPays.setTextColor(241, 196, 15);
        docPays.text('LE CONCESSIONNAIRE', 20, yPays);
        yPays += 7;
        docPays.setTextColor(0, 0, 0);
        docPays.text('Nom : _________________________', 20, yPays);
        yPays += 6;
        docPays.text('Fonction : _________________________', 20, yPays);
        yPays += 6;
        docPays.text('Signature : _________________________', 20, yPays);
        yPays += 6;
        docPays.text('Cachet : _________________________', 20, yPays);
        yPays += 6;
        docPays.text('Date : _________________________', 20, yPays);
        
        docPays.save('Contrat_Franchise_Nationale_BonPlanInfos.pdf');
        break;
    }
  };

  // Fonction de téléchargement du contrat organisateur avec gestion multi-pages
  const downloadOrganizerContract = () => {
    const doc = new jsPDF();
    let y = 20;
    
    // PAGE 1
    doc.setFontSize(20);
    doc.setTextColor(52, 152, 219);
    doc.text('CONTRAT TYPE ORGANISATEUR', 20, y);
    y += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Plateforme BonPlanInfos', 20, y);
    y += 20;
    
    // ARTICLE 1
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(12);
    doc.text('ARTICLE 1 — OBJET DU CONTRAT', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('Le présent contrat a pour objet de définir les conditions dans lesquelles la plateforme', 20, y);
    y += 5;
    doc.text('BonPlanInfos met à disposition de l\'Organisateur des outils digitaux lui permettant :', 20, y);
    y += 7;
    doc.text('• d\'organiser et publier des événements', 25, y);
    y += 5;
    doc.text('• de vendre des billets en ligne', 25, y);
    y += 5;
    doc.text('• d\'organiser des votes, concours et tombolas', 25, y);
    y += 5;
    doc.text('• de proposer la location de stands', 25, y);
    y += 5;
    doc.text('• de collecter les paiements des participants', 25, y);
    y += 7;
    doc.text(`BonPlanInfos (représenté par ${BONPLANINFOS_INFO.responsable}, ${BONPLANINFOS_INFO.fonction})`, 20, y);
    y += 5;
    doc.text('agit exclusivement en tant que prestataire technique et intermédiaire de paiement.', 20, y);
    y += 12;
    
    y = checkPageBreak(doc, y);
    
    // ARTICLE 2
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(12);
    doc.text('ARTICLE 2 — STATUT DES PARTIES', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('BonPlanInfos n\'est ni organisateur, ni co-organisateur des événements publiés.', 20, y);
    y += 5;
    doc.text('L\'Organisateur est seul responsable de la conception, de l\'organisation,', 20, y);
    y += 5;
    doc.text('du contenu et du bon déroulement de son événement.', 20, y);
    y += 5;
    doc.text('Aucun lien de subordination, de partenariat juridique ou d\'association', 20, y);
    y += 5;
    doc.text('n\'est créé par le présent contrat.', 20, y);
    y += 12;
    
    y = checkPageBreak(doc, y);
    
    // ARTICLE 3
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(12);
    doc.text('ARTICLE 3 — CONDITIONS D\'INSCRIPTION', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('Pour utiliser la plateforme, l\'Organisateur s\'engage à :', 20, y);
    y += 7;
    doc.text('• fournir des informations exactes et à jour', 25, y);
    y += 5;
    doc.text('• disposer des autorisations légales nécessaires à l\'organisation de son événement', 25, y);
    y += 5;
    doc.text('• respecter les lois et règlements en vigueur dans son pays', 25, y);
    y += 7;
    doc.text('BonPlanInfos se réserve le droit de refuser ou suspendre tout compte organisateur', 20, y);
    y += 5;
    doc.text('en cas de manquement.', 20, y);
    y += 12;
    
    y = checkPageBreak(doc, y);
    
    // ARTICLE 4
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(12);
    doc.text('ARTICLE 4 — COMMISSION ET RÉMUNÉRATION', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('4.1 Commission plateforme', 20, y);
    y += 6;
    doc.text('BonPlanInfos prélève une commission de 5% sur :', 25, y);
    y += 5;
    doc.text('• chaque participation payante (billet, vote, tombola, stand)', 30, y);
    y += 5;
    doc.text('• chaque retrait effectué par l\'Organisateur', 30, y);
    y += 7;
    doc.text('👉 L\'Organisateur perçoit 95% des montants générés, nets de la commission.', 25, y);
    y += 7;
    doc.text('4.2 Modalités de paiement', 20, y);
    y += 6;
    doc.text('Les paiements sont collectés via les moyens disponibles sur la plateforme.', 25, y);
    y += 5;
    doc.text('Les fonds sont crédités sur le compte Organisateur.', 25, y);
    y += 5;
    doc.text('Les retraits sont effectués selon les modalités techniques définies par BonPlanInfos.', 25, y);
    y += 12;
    
    y = checkPageBreak(doc, y);
    
    // ARTICLE 5
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(12);
    doc.text('ARTICLE 5 — RESPONSABILITÉS DE L\'ORGANISATEUR', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('L\'Organisateur est seul responsable :', 20, y);
    y += 7;
    doc.text('• de la véracité des informations publiées', 25, y);
    y += 5;
    doc.text('• de la tenue effective de l\'événement', 25, y);
    y += 5;
    doc.text('• de la délivrance des prestations promises aux participants', 25, y);
    y += 5;
    doc.text('• des remboursements, reports ou annulations', 25, y);
    y += 5;
    doc.text('• de tout litige avec les participants', 25, y);
    y += 12;
    
    y = checkPageBreak(doc, y);
    
    // ARTICLE 6
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(12);
    doc.text('ARTICLE 6 — CONTENU ET PUBLICATION', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('L\'Organisateur garantit que le contenu publié ne viole aucun droit', 20, y);
    y += 5;
    doc.text('(image, musique, marque, auteur).', 20, y);
    y += 12;
    
    y = checkPageBreak(doc, y);
    
    // ARTICLE 7
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(12);
    doc.text('ARTICLE 7 — ANNULATION, REMBOURSEMENT ET LITIGES', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('En cas d\'annulation ou de report, l\'Organisateur est seul responsable', 20, y);
    y += 5;
    doc.text('de l\'information des participants et des modalités de remboursement.', 20, y);
    y += 12;
    
    y = checkPageBreak(doc, y);
    
    // ARTICLE 8
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(12);
    doc.text('ARTICLE 8 — SUSPENSION ET RÉSILIATION', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('BonPlanInfos se réserve le droit de suspendre temporairement ou', 20, y);
    y += 5;
    doc.text('définitivement un compte organisateur en cas de suspicion de fraude.', 20, y);
    y += 12;
    
    y = checkPageBreak(doc, y);
    
    // ARTICLE 9
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(12);
    doc.text('ARTICLE 9 — CONFIDENTIALITÉ ET DONNÉES', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('Les données collectées sont utilisées uniquement dans le cadre', 20, y);
    y += 5;
    doc.text('du fonctionnement de la plateforme.', 20, y);
    y += 12;
    
    y = checkPageBreak(doc, y);
    
    // ARTICLE 10
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(12);
    doc.text('ARTICLE 10 — LIMITATION DE RESPONSABILITÉ', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('BonPlanInfos ne pourra être tenue responsable des pertes indirectes,', 20, y);
    y += 5;
    doc.text('des dommages liés à l\'organisation de l\'événement,', 20, y);
    y += 5;
    doc.text('ou des décisions prises par l\'Organisateur.', 20, y);
    y += 12;
    
    y = checkPageBreak(doc, y);
    
    // ARTICLE 11
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(12);
    doc.text('ARTICLE 11 — DROIT APPLICABLE', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('Le présent contrat est régi par le droit en vigueur', 20, y);
    y += 5;
    doc.text('dans le pays d\'exploitation de la plateforme.', 20, y);
    y += 15;
    
    y = checkPageBreak(doc, y);
    
    // Acceptation
    doc.setTextColor(46, 204, 113);
    doc.setFontSize(11);
    doc.text('✅ ACCEPTATION OBLIGATOIRE', 20, y);
    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('En créant un compte Organisateur et en publiant un événement sur BonPlanInfos,', 20, y);
    y += 5;
    doc.text('l\'Organisateur reconnaît avoir lu, compris et accepté sans réserve le présent contrat.', 20, y);
    y += 10;
    doc.text('Fait pour valoir ce que de droit.', 20, y);
    y += 15;
    
    y = checkPageBreak(doc, y);
    
    // Signature de BonPlanInfos
    doc.setFontSize(10);
    doc.setTextColor(52, 152, 219);
    doc.text('Pour BonPlanInfos,', 20, y);
    y += 7;
    doc.setTextColor(0, 0, 0);
    doc.text(`${BONPLANINFOS_INFO.responsable}`, 20, y);
    y += 6;
    doc.text(`${BONPLANINFOS_INFO.fonction}`, 20, y);
    y += 6;
    doc.text('Signature :', 20, y);
    
    try {
      doc.addImage(BONPLANINFOS_INFO.signature, 'JPEG', 45, y-5, 30, 10);
    } catch(e) {
      doc.text('[SIGNATURE]', 45, y);
    }
    
    doc.save('Contrat_Organisateur_BonPlanInfos.pdf');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row text-gray-200">
      
      {/* Mobile Header avec menu burger */}
      <div className="md:hidden sticky top-0 z-50 bg-[#111111] border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-400">
            <Book className="w-5 h-5" />
            <span className="font-bold text-lg">Documentation</span>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-400">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-[#111111] border-r border-gray-800 w-[280px] p-0">
              <SheetHeader className="p-6 border-b border-gray-800">
                <SheetTitle className="text-white flex items-center gap-2">
                  <Book className="w-5 h-5 text-blue-400" />
                  <span>Documentation</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="p-4 space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-400 rounded-md hover:bg-gray-800 hover:text-blue-400 transition-colors text-left"
                  >
                    {section.icon}
                    {section.title}
                  </button>
                ))}
              </nav>
              <div className="p-4 mt-auto border-t border-gray-800">
                <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 p-4 rounded-lg border border-blue-800/30">
                  <p className="text-xs text-blue-300 mb-2 font-bold">Besoin d'aide ?</p>
                  <Button 
                    size="sm" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                    onClick={() => window.location.href='/help-center'}
                  >
                    Centre d'aide
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden md:block w-72 bg-[#111111] border-r border-gray-800 h-screen sticky top-0 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 text-blue-400">
            <Book className="w-6 h-6" />
            <span className="font-bold text-xl">Documentation</span>
          </div>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-400 rounded-md hover:bg-gray-800 hover:text-blue-400 transition-colors text-left"
              >
                {section.icon}
                {section.title}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6 mt-auto">
          <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 p-4 rounded-lg border border-blue-800/30">
            <p className="text-xs text-blue-300 mb-2 font-bold">Besoin d'aide ?</p>
            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => window.location.href='/help-center'}>
              Centre d'aide
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content - Responsive */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto space-y-8 md:space-y-12">
          
          {/* Header - Responsive */}
          <div className="relative rounded-xl md:rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-[#0A0A0A] to-gray-900 border border-gray-800 p-6 md:p-8 lg:p-12 mb-6 md:mb-12">
            <div className="absolute inset-0 opacity-5">
              <img src="https://images.unsplash.com/photo-1663124178716-2078c384c24a" alt="Documentation Background" className="w-full h-full object-cover" />
            </div>
            <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-blue-500 rounded-full filter blur-3xl opacity-10"></div>
            <div className="absolute bottom-0 left-0 w-48 md:w-64 h-48 md:h-64 bg-purple-500 rounded-full filter blur-3xl opacity-10"></div>
            <div className="relative z-10">
              <Badge className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/50 mb-3 md:mb-4 text-xs md:text-sm">
                Guide Officiel & Documents Légaux
              </Badge>
              <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-blue-400 via-white to-purple-400 text-transparent bg-clip-text">
                Documentation Juridique
              </h1>
              <p className="text-sm md:text-base lg:text-lg text-gray-400 max-w-2xl">
                Tout savoir sur le fonctionnement, les règles financières et les protocoles de sécurité de BonPlanInfos.
              </p>
              <div className="mt-3 md:mt-4 p-2 md:p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg inline-block">
                <p className="text-xs md:text-sm text-blue-300">
                  <span className="font-bold">Responsable légal :</span> {BONPLANINFOS_INFO.responsable} - {BONPLANINFOS_INFO.fonction}
                </p>
              </div>
            </div>
          </div>

          {/* Section Vue d'ensemble - Responsive */}
          <section id="overview" className="space-y-3 md:space-y-4 scroll-mt-16 md:scroll-mt-4">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30">
                <Book className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              Vue d'ensemble
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-gray-400 leading-relaxed">
              BonPlanInfos est une plateforme sécurisée panafricaine permettant l'organisation d'événements (billetterie, tombola, votes, location de stands). 
              Pour garantir la sécurité des fonds et la confiance des utilisateurs, nous appliquons un protocole strict de validation et de déblocage progressif des fonds.
              Notre modèle économique repose sur une commission de <span className="text-blue-400 font-semibold">5%</span> prélevée sur chaque transaction.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />

          {/* Section Déblocage des Fonds - Responsive */}
          <section id="fund-release" className="space-y-4 md:space-y-6 scroll-mt-16 md:scroll-mt-4">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-green-500/20 rounded-lg text-green-400 border border-green-500/30">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              Déblocage des Fonds
            </h2>
            <p className="text-sm md:text-base text-gray-400">
              Les revenus générés sont placés sous séquestre (Escrow) et débloqués progressivement selon des critères stricts.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <Card className="bg-[#111111] border-gray-800 hover:border-blue-500/30 transition-colors">
                <CardContent className="p-4 md:p-6">
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 mb-2 text-xs">
                    Étape 1
                  </Badge>
                  <h3 className="font-bold text-base md:text-lg text-white mb-1 md:mb-2">Démarrage (20-30%)</h3>
                  <p className="text-xs md:text-sm text-gray-400">Débloqué après vérification d'identité (KYC) et début des ventes significatives.</p>
                </CardContent>
              </Card>
              <Card className="bg-[#111111] border-gray-800 hover:border-purple-500/30 transition-colors">
                <CardContent className="p-4 md:p-6">
                  <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 mb-2 text-xs">
                    Étape 2
                  </Badge>
                  <h3 className="font-bold text-base md:text-lg text-white mb-1 md:mb-2">Mi-Parcours (40%)</h3>
                  <p className="text-xs md:text-sm text-gray-400">Débloqué le jour de l'événement ou après atteinte de 50% des objectifs de vente.</p>
                </CardContent>
              </Card>
              <Card className="bg-[#111111] border-gray-800 hover:border-green-500/30 transition-colors sm:col-span-2 lg:col-span-1">
                <CardContent className="p-4 md:p-6">
                  <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 mb-2 text-xs">
                    Étape 3
                  </Badge>
                  <h3 className="font-bold text-base md:text-lg text-white mb-1 md:mb-2">Finalisation (Solde)</h3>
                  <p className="text-xs md:text-sm text-gray-400">Débloqué après validation des critères spécifiques à chaque type d'événement.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />

          {/* Section Validation par type d'événement - Responsive */}
          <section id="validation" className="space-y-4 md:space-y-6 scroll-mt-16 md:scroll-mt-4">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-purple-500/20 rounded-lg text-purple-400 border border-purple-500/30">
                <Shield className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              Validation par type d'événement
            </h2>
            
            <Tabs defaultValue="ticketing" className="w-full">
              <TabsList className="bg-[#111111] border border-gray-800 p-1 flex flex-wrap h-auto">
                <TabsTrigger value="ticketing" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm py-1.5 px-2 md:px-3">
                  <Ticket className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden xs:inline">Billetterie</span>
                  <span className="xs:hidden">Billet</span>
                </TabsTrigger>
                <TabsTrigger value="stands" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm py-1.5 px-2 md:px-3">
                  <Store className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden xs:inline">Stands</span>
                  <span className="xs:hidden">Stand</span>
                </TabsTrigger>
                <TabsTrigger value="tombola" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm py-1.5 px-2 md:px-3">
                  <Gift className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Tombola
                </TabsTrigger>
                <TabsTrigger value="vote" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm py-1.5 px-2 md:px-3">
                  <Vote className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Votes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ticketing" className="mt-3 md:mt-4">
                <Card className="bg-[#111111] border-gray-800">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
                      <QrCode className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                      Conditions de validation - Billetterie
                    </h3>
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-start gap-2 md:gap-3">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full mt-1.5 md:mt-2"></div>
                        <p className="text-xs md:text-sm text-gray-400"><span className="text-white font-semibold">Seuil obligatoire :</span> Minimum 30% des billets vendus doivent être scannés (QR code unique)</p>
                      </div>
                      <div className="flex items-start gap-2 md:gap-3">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-yellow-500 rounded-full mt-1.5 md:mt-2"></div>
                        <p className="text-xs md:text-sm text-gray-400"><span className="text-white font-semibold">Si seuil non atteint :</span> Statut = EN_VÉRIFICATION, fonds bloqués</p>
                      </div>
                      <div className="flex items-start gap-2 md:gap-3">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full mt-1.5 md:mt-2"></div>
                        <p className="text-xs md:text-sm text-gray-400"><span className="text-white font-semibold">Si seuil atteint :</span> Statut = VALIDÉ, déblocage des fonds</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stands" className="mt-3 md:mt-4">
                <Card className="bg-[#111111] border-gray-800">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
                      <Store className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                      Conditions de validation - Location de stands
                    </h3>
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-start gap-2 md:gap-3">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-purple-500 rounded-full mt-1.5 md:mt-2"></div>
                        <p className="text-xs md:text-sm text-gray-400"><span className="text-white font-semibold">Check-in exposants :</span> Validation via réservation, code ou numéro</p>
                      </div>
                      <div className="flex items-start gap-2 md:gap-3">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-purple-500 rounded-full mt-1.5 md:mt-2"></div>
                        <p className="text-xs md:text-sm text-gray-400"><span className="text-white font-semibold">Confirmation :</span> Bouton "Présent" activé par l'exposant</p>
                      </div>
                      <div className="flex items-start gap-2 md:gap-3">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full mt-1.5 md:mt-2"></div>
                        <p className="text-xs md:text-sm text-gray-400"><span className="text-white font-semibold">Validation :</span> Seuil minimum de présences atteint</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tombola" className="mt-3 md:mt-4">
                <Card className="bg-[#111111] border-gray-800">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
                      <Gift className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                      Conditions de validation - Tombola/Tirage au sort
                    </h3>
                    <div className="space-y-3 md:space-y-4">
                      <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-500/50 text-xs md:text-sm">
                        Dépôt du lot OBLIGATOIRE avant tirage
                      </Badge>
                      <div className="bg-gray-800/50 p-3 md:p-4 rounded-lg">
                        <h4 className="font-bold text-white mb-2 md:mb-3 text-sm md:text-base">🔒 Workflow sécurisé :</h4>
                        <ol className="space-y-2 md:space-y-3">
                          <li className="flex items-start gap-2 md:gap-3 text-xs md:text-sm">
                            <span className="bg-gray-700 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                            <span className="text-gray-400">Vente des tickets activée</span>
                          </li>
                          <li className="flex items-start gap-2 md:gap-3 text-xs md:text-sm">
                            <span className="bg-gray-700 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                            <span className="text-gray-400">Dépôt du lot physique au siège BonPlanInfos <span className="text-yellow-400">OU</span> versement de la valeur financière équivalente</span>
                          </li>
                          <li className="flex items-start gap-2 md:gap-3 text-xs md:text-sm">
                            <span className="bg-gray-700 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                            <span className="text-gray-400">Admin confirme le dépôt → <span className="text-green-400">Statut = DEPOT_VALIDÉ</span></span>
                          </li>
                          <li className="flex items-start gap-2 md:gap-3 text-xs md:text-sm">
                            <span className="bg-gray-700 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">4</span>
                            <span className="text-gray-400">Bouton "Lancer le tirage" activé</span>
                          </li>
                          <li className="flex items-start gap-2 md:gap-3 text-xs md:text-sm">
                            <span className="bg-gray-700 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">5</span>
                            <span className="text-gray-400">Tirage effectué</span>
                          </li>
                          <li className="flex items-start gap-2 md:gap-3 text-xs md:text-sm">
                            <span className="bg-gray-700 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">6</span>
                            <span className="text-gray-400">Remise du lot par équipe BonPlanInfos + organisateur</span>
                          </li>
                          <li className="flex items-start gap-2 md:gap-3 text-xs md:text-sm">
                            <span className="bg-gray-700 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">7</span>
                            <span className="text-gray-400">Gagnant marqué = <span className="text-green-400">LOT_REÇU</span></span>
                          </li>
                          <li className="flex items-start gap-2 md:gap-3 text-xs md:text-sm">
                            <span className="bg-gray-700 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">8</span>
                            <span className="text-gray-400 font-semibold">Autorisation du retrait final des fonds</span>
                          </li>
                        </ol>
                      </div>
                      <p className="text-red-400 text-xs md:text-sm flex items-center gap-1 md:gap-2 mt-1 md:mt-2">
                        <AlertCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span>Sans dépôt du lot, vos gains disponibles ne peuvent pas être retirés sans la remise du lot aux gagnantx "Les retraits"seront validé après remise du lot aux gagnants.</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vote" className="mt-3 md:mt-4">
                <Card className="bg-[#111111] border-gray-800">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
                      <Vote className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                      Conditions de validation - Votes en ligne
                    </h3>
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-start gap-2 md:gap-3">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full mt-1.5 md:mt-2"></div>
                        <p className="text-xs md:text-sm text-gray-400"><span className="text-white font-semibold">Escrow :</span> Les votes payants sont placés sous séquestre</p>
                      </div>
                      <div className="flex items-start gap-2 md:gap-3">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full mt-1.5 md:mt-2"></div>
                        <p className="text-xs md:text-sm text-gray-400"><span className="text-white font-semibold">Aucun retrait avant :</span></p>
                      </div>
                      <div className="ml-4 md:ml-6 space-y-1 md:space-y-2">
                        <p className="text-xs md:text-sm text-gray-400">• Fin officielle du vote</p>
                        <p className="text-xs md:text-sm text-gray-400">• Vérification absence de fraude</p>
                        <p className="text-xs md:text-sm text-gray-400">• Validation administrateur</p>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 md:p-3 mt-2">
                        <p className="text-red-400 text-xs md:text-sm flex items-center gap-1 md:gap-2">
                          <AlertCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          Événement ou vote non tenu → Remboursement automatique intégral
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />

          {/* Section Contrats de Licence Partenaires - Responsive */}
          <section id="contracts" className="space-y-4 md:space-y-6 scroll-mt-16 md:scroll-mt-4">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-orange-500/20 rounded-lg text-orange-400 border border-orange-500/30">
                <FileText className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              Contrats de Licence - Partenaires Territoriaux
            </h2>
            <p className="text-xs md:text-sm lg:text-base text-gray-400">
              Modèle économique : <span className="text-blue-400 font-semibold">Commission plateforme de 5%</span> sur toutes les transactions. 
              Redistribution aux partenaires selon leur niveau territorial : <span className="text-green-400">20% (Ville)</span>, <span className="text-purple-400">30% (Région)</span>, <span className="text-yellow-400">40% (Pays)</span>.
            </p>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 md:p-4 mb-4">
              <p className="text-xs md:text-sm text-blue-300">
                <span className="font-bold">✅ Contrats complets multi-pages :</span> Les PDF générés contiennent l'intégralité du contrat sur plusieurs pages.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Licence Starter - Ville */}
              <Card className="bg-[#111111] border-gray-800 hover:border-blue-500/50 transition-all">
                <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/50 text-xs">STARTER</Badge>
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base md:text-xl text-white mb-0.5 md:mb-1">Licence Ville</h3>
                    <p className="text-xs md:text-sm text-gray-400">Exclusivité territoriale urbaine</p>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-400">Durée</span>
                      <span className="text-white font-medium">1 an</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-400">Droit d'entrée</span>
                      <span className="text-white font-bold">1 000 000 FCFA</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-400">Rémunération</span>
                      <span className="text-green-400 font-bold">20% des 5%</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-800/30 p-2 rounded">
                    <span className="text-blue-400">Prérempli :</span> {BONPLANINFOS_INFO.responsable}
                  </div>
                  <Button 
                    onClick={() => downloadContract('ville')}
                    className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/50 text-xs md:text-sm py-1.5 md:py-2"
                    size="sm"
                  >
                    <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    Télécharger contrat (3-4 pages)
                  </Button>
                  
                  <div className="mt-1 md:mt-2 pt-2 md:pt-2 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-1 md:mb-2">
                      <span className="text-yellow-400">⬆️ Après avoir rempli et signé</span>
                    </p>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-500/50 text-xs md:text-sm py-1.5 md:py-2"
                      onClick={() => window.location.href = '/help-center?tab=contracts'}
                    >
                      <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      Soumettre le contrat signé
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Licence Business - Région */}
              <Card className="bg-[#111111] border-gray-800 hover:border-purple-500/50 transition-all">
                <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/50 text-xs">BUSINESS</Badge>
                    <Landmark className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base md:text-xl text-white mb-0.5 md:mb-1">Licence Région</h3>
                    <p className="text-xs md:text-sm text-gray-400">Exclusivité régionale + encadrement villes</p>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-400">Durée</span>
                      <span className="text-white font-medium">2 ans</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-400">Droit d'entrée</span>
                      <span className="text-white font-bold">3 000 000 FCFA</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-400">Rémunération</span>
                      <span className="text-green-400 font-bold">30% des 5%</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-800/30 p-2 rounded">
                    <span className="text-purple-400">Prérempli :</span> {BONPLANINFOS_INFO.responsable}
                  </div>
                  <Button 
                    onClick={() => downloadContract('region')}
                    className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/50 text-xs md:text-sm py-1.5 md:py-2"
                    size="sm"
                  >
                    <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    Télécharger contrat (3-4 pages)
                  </Button>
                  
                  <div className="mt-1 md:mt-2 pt-2 md:pt-2 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-1 md:mb-2">
                      <span className="text-yellow-400">⬆️ Après avoir rempli et signé</span>
                    </p>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-500/50 text-xs md:text-sm py-1.5 md:py-2"
                      onClick={() => window.location.href = '/help-center?tab=contracts'}
                    >
                      <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      Soumettre le contrat signé
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Licence Premium - Pays */}
              <Card className="bg-[#111111] border-gray-800 hover:border-yellow-500/50 transition-all md:col-span-2 lg:col-span-1">
                <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-500/50 text-xs">PREMIUM</Badge>
                    <Globe2 className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base md:text-xl text-white mb-0.5 md:mb-1">Franchise Nationale</h3>
                    <p className="text-xs md:text-sm text-gray-400">Exclusivité pays + supervision nationale</p>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-400">Durée</span>
                      <span className="text-white font-medium">3 ans</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-400">Droit d'entrée</span>
                      <span className="text-white font-bold">5M - 10M FCFA</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-400">Rémunération</span>
                      <span className="text-green-400 font-bold">40% des 5%</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-800/30 p-2 rounded">
                    <span className="text-yellow-400">Prérempli :</span> {BONPLANINFOS_INFO.responsable}
                  </div>
                  <Button 
                    onClick={() => downloadContract('pays')}
                    className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-500/50 text-xs md:text-sm py-1.5 md:py-2"
                    size="sm"
                  >
                    <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    Télécharger contrat (4-5 pages)
                  </Button>
                  
                  <div className="mt-1 md:mt-2 pt-2 md:pt-2 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-1 md:mb-2">
                      <span className="text-yellow-400">⬆️ Après avoir rempli et signé</span>
                    </p>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-500/50 text-xs md:text-sm py-1.5 md:py-2"
                      onClick={() => window.location.href = '/help-center?tab=contracts'}
                    >
                      <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      Soumettre le contrat signé
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Détails des obligations contractuelles - Responsive */}
            <Card className="bg-[#111111] border-gray-800 mt-3 md:mt-4">
              <CardContent className="p-4 md:p-6">
                <h4 className="font-bold text-white mb-3 md:mb-4 text-sm md:text-base">📋 Obligations contractuelles par niveau</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <div>
                    <h5 className="text-blue-400 font-semibold mb-2 flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                      Licence Ville
                    </h5>
                    <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-400">
                      <li className="flex items-start gap-1 md:gap-2">• Point de représentation physique</li>
                      <li className="flex items-start gap-1 md:gap-2">• Responsable local désigné</li>
                      <li className="flex items-start gap-1 md:gap-2">• Promotion active</li>
                      <li className="flex items-start gap-1 md:gap-2">• Rapports mensuels</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-purple-400 font-semibold mb-2 flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                      <Landmark className="w-3 h-3 md:w-4 md:h-4" />
                      Licence Région
                    </h5>
                    <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-400">
                      <li className="flex items-start gap-1 md:gap-2">• Bureau régional</li>
                      <li className="flex items-start gap-1 md:gap-2">• Minimum 2 agents</li>
                      <li className="flex items-start gap-1 md:gap-2">• Encadrement concessions villes</li>
                      <li className="flex items-start gap-1 md:gap-2">• Partenariats régionaux</li>
                    </ul>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <h5 className="text-yellow-400 font-semibold mb-2 flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                      <Globe2 className="w-3 h-3 md:w-4 md:h-4" />
                      Franchise Nationale
                    </h5>
                    <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-400">
                      <li className="flex items-start gap-1 md:gap-2">• Siège national</li>
                      <li className="flex items-start gap-1 md:gap-2">• 3-5 employés minimum</li>
                      <li className="flex items-start gap-1 md:gap-2">• Représentation officielle</li>
                      <li className="flex items-start gap-1 md:gap-2">• Conformité légale locale</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clause de révocation et remboursement - Responsive */}
            <Card className="bg-[#111111] border-2 border-orange-500/30 mt-4 md:mt-6">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-orange-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base md:text-xl font-bold text-white mb-2 md:mb-3 flex flex-wrap items-center gap-1 md:gap-2">
                      Clause de révocation et conditions de remboursement
                      <Badge className="bg-orange-600/20 text-orange-300 border-orange-500/50 ml-0 md:ml-2 text-xs">LECTURE OBLIGATOIRE</Badge>
                    </h4>
                    
                    <div className="space-y-4 md:space-y-6">
                      {/* Cas 1 : Révocation pour inaction ou sous-performance */}
                      <div className="bg-red-500/10 border border-red-500/30 p-3 md:p-5 rounded-lg">
                        <h5 className="font-bold text-white mb-2 md:mb-3 flex items-center gap-1 md:gap-2 text-sm md:text-base">
                          <span className="w-5 h-5 md:w-6 md:h-6 bg-red-500/20 rounded-full flex items-center justify-center text-xs">1</span>
                          Révocation pour inaction ou sous-performance
                        </h5>
                        <p className="text-xs md:text-sm text-gray-300 mb-2 md:mb-3">
                          Tout partenaire territorial (Ville, Région ou Pays) qui, après avoir acquitté son droit d'entrée, 
                          ne développe pas activement sa zone ou n'atteint pas les objectifs contractuels pendant une période 
                          de <span className="text-white font-semibold">6 mois consécutifs</span> pourra être révoqué par la direction de BonPlanInfos.
                        </p>
                        <div className="bg-gray-800/50 p-3 md:p-4 rounded-md mt-1 md:mt-2">
                          <p className="text-orange-300 font-medium mb-1 md:mb-2 text-xs md:text-sm">➡️ Conditions de remboursement :</p>
                          <p className="text-xs md:text-sm text-gray-300">
                            Le partenaire révoqué pour inaction ou sous-performance percevra <span className="text-green-400 font-bold">50% de son droit d'entrée</span> à titre de dédommagement. 
                            Les 50% restants sont conservés par BonPlanInfos pour couvrir les frais d'administration, 
                            de recherche d'un nouveau concessionnaire et de transition opérationnelle.
                          </p>
                          <p className="text-gray-400 text-xs mt-2 md:mt-3 border-t border-gray-700 pt-2 md:pt-3">
                            ⚡ Sa zone sera immédiatement réattribuée à un nouveau partenaire sélectionné pour son dynamisme et sa capacité à développer le territoire.
                          </p>
                        </div>
                      </div>

                      {/* Cas 2 : Démission volontaire */}
                      <div className="bg-blue-500/10 border border-blue-500/30 p-3 md:p-5 rounded-lg">
                        <h5 className="font-bold text-white mb-2 md:mb-3 flex items-center gap-1 md:gap-2 text-sm md:text-base">
                          <span className="w-5 h-5 md:w-6 md:h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-xs">2</span>
                          Démission volontaire
                        </h5>
                        <p className="text-xs md:text-sm text-gray-300 mb-2 md:mb-3">
                          Un partenaire qui, après avoir acquitté son droit d'entrée, décide de ne plus représenter BonPlanInfos 
                          pour des raisons personnelles ou stratégiques.
                        </p>
                        <div className="bg-gray-800/50 p-3 md:p-4 rounded-md mt-1 md:mt-2">
                          <p className="text-orange-300 font-medium mb-1 md:mb-2 text-xs md:text-sm">➡️ Conditions de remboursement :</p>
                          <p className="text-xs md:text-sm text-gray-300">
                            <span className="text-red-400 font-bold">Aucun remboursement du droit d'entrée.</span> La démission volontaire est considérée comme 
                            une rupture unilatérale du contrat par le partenaire. BonPlanInfos ne procède à aucun remboursement, 
                            partiel ou total, quelle que soit la date de la démission.
                          </p>
                          <p className="text-gray-400 text-xs mt-2 md:mt-3 border-t border-gray-700 pt-2 md:pt-3">
                            📌 Le partenaire démissionnaire perd immédiatement son exclusivité territoriale et ses droits sur les commissions futures.
                          </p>
                        </div>
                      </div>

                      {/* Tableau récapitulatif - Responsive */}
                      <div className="bg-gray-800/30 p-3 md:p-5 rounded-lg border border-gray-700">
                        <h5 className="font-bold text-white mb-2 md:mb-3 text-sm md:text-base">📊 Récapitulatif des conditions de remboursement</h5>
                        <div className="overflow-x-auto -mx-3 md:mx-0">
                          <div className="inline-block min-w-full align-middle">
                            <table className="min-w-full text-xs md:text-sm">
                              <thead>
                                <tr className="border-b border-gray-700">
                                  <th className="text-left py-1.5 md:py-2 pr-2 md:pr-4 text-gray-300">Situation</th>
                                  <th className="text-left py-1.5 md:py-2 px-2 md:px-4 text-gray-300">Remboursement</th>
                                  <th className="text-left py-1.5 md:py-2 pl-2 md:pl-4 text-gray-300">Réattribution zone</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-gray-800">
                                  <td className="py-2 md:py-3 pr-2 md:pr-4 text-gray-400">Révocation pour inaction / sous-performance</td>
                                  <td className="py-2 md:py-3 px-2 md:px-4 text-green-400 font-medium">50% du droit d'entrée</td>
                                  <td className="py-2 md:py-3 pl-2 md:pl-4 text-white">Oui</td>
                                </tr>
                                <tr>
                                  <td className="py-2 md:py-3 pr-2 md:pr-4 text-gray-400">Démission volontaire</td>
                                  <td className="py-2 md:py-3 px-2 md:px-4 text-red-400 font-medium">0% - Aucun</td>
                                  <td className="py-2 md:py-3 pl-2 md:pl-4 text-white">Oui</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 md:mt-4 italic">
                          * Tout remboursement partiel (50%) intervient uniquement dans le cas d'une révocation décidée par BonPlanInfos 
                          pour manque de résultats. Aucune démission volontaire n'ouvre droit à remboursement.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />

          {/* Section Contrat Organisateur - Responsive */}
          <section id="organizer" className="space-y-4 md:space-y-6 scroll-mt-16 md:scroll-mt-4">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/30">
                <Scale className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              Contrat Type Organisateur
            </h2>
            
            <Card className="bg-[#111111] border-gray-800">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col gap-3 md:gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:items-center">
                    <div>
                      <Badge className="bg-indigo-600/20 text-indigo-300 border-indigo-500/50 mb-1 md:mb-2 text-xs">
                        CGU - Organisateurs
                      </Badge>
                      <h3 className="text-lg md:text-2xl font-bold text-white">Conditions Générales d'Utilisation</h3>
                      <p className="text-xs text-indigo-400 mt-0.5 md:mt-1">
                        Contrat complet sur 3-4 pages avec signature préremplie
                      </p>
                    </div>
                    <Button 
                      onClick={downloadOrganizerContract}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm w-full sm:w-auto"
                      size="sm"
                    >
                      <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      Télécharger PDF
                    </Button>
                  </div>
                  
                  {/* Bouton de soumission pour contrat organisateur */}
                  <div className="mt-1 md:mt-2 pt-2 md:pt-2 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-1 md:mb-2">
                      <span className="text-yellow-400">⬆️ Après avoir rempli et signé</span>
                    </p>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-500/50 text-xs md:text-sm py-1.5 md:py-2"
                      onClick={() => window.location.href = '/help-center?tab=contracts'}
                    >
                      <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      Soumettre le contrat signé
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4 max-h-60 md:max-h-96 overflow-y-auto pr-2 md:pr-4 custom-scrollbar mt-4 md:mt-6">
                  <div className="bg-gray-800/30 p-3 md:p-4 rounded-lg">
                    <h4 className="font-bold text-white mb-1 md:mb-2 text-sm md:text-base">ARTICLE 1 — OBJET DU CONTRAT</h4>
                    <p className="text-gray-400 text-xs md:text-sm">
                      Le présent contrat a pour objet de définir les conditions dans lesquelles la plateforme BonPlanInfos met à disposition de l'Organisateur des outils digitaux lui permettant :
                    </p>
                    <ul className="list-disc list-inside text-gray-400 text-xs md:text-sm mt-1 md:mt-2 space-y-0.5 md:space-y-1">
                      <li>d'organiser et publier des événements</li>
                      <li>de vendre des billets en ligne</li>
                      <li>d'organiser des votes, concours et tombolas</li>
                      <li>de proposer la location de stands</li>
                      <li>de collecter les paiements des participants</li>
                    </ul>
                    <p className="text-gray-400 text-xs md:text-sm mt-1 md:mt-2">
                      BonPlanInfos agit exclusivement en tant que prestataire technique et intermédiaire de paiement.
                    </p>
                  </div>

                  <div className="bg-gray-800/30 p-3 md:p-4 rounded-lg">
                    <h4 className="font-bold text-white mb-1 md:mb-2 text-sm md:text-base">ARTICLE 2 — STATUT DES PARTIES</h4>
                    <p className="text-gray-400 text-xs md:text-sm">
                      BonPlanInfos n'est ni organisateur, ni co-organisateur des événements publiés.<br />
                      L'Organisateur est seul responsable de la conception, de l'organisation, du contenu et du bon déroulement de son événement.<br />
                      Aucun lien de subordination, de partenariat juridique ou d'association n'est créé par le présent contrat.
                    </p>
                  </div>

                  <div className="bg-gray-800/30 p-3 md:p-4 rounded-lg">
                    <h4 className="font-bold text-white mb-1 md:mb-2 text-sm md:text-base">ARTICLE 4 — COMMISSION ET RÉMUNÉRATION</h4>
                    <div className="space-y-1 md:space-y-2">
                      <p className="text-white font-semibold text-xs md:text-sm">4.1 Commission plateforme</p>
                      <p className="text-gray-400 text-xs md:text-sm">
                        BonPlanInfos prélève une commission de <span className="text-green-400 font-bold">5%</span> sur :
                      </p>
                      <ul className="list-disc list-inside text-gray-400 text-xs md:text-sm ml-2 md:ml-4 space-y-0.5 md:space-y-1">
                        <li>chaque participation payante (billet, vote, tombola, stand)</li>
                        <li>chaque retrait effectué par l'Organisateur</li>
                      </ul>
                      <p className="text-gray-400 text-xs md:text-sm mt-1 md:mt-2">
                        👉 <span className="text-white">L'Organisateur perçoit 95% des montants générés</span>, nets de la commission.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-800/30 p-3 md:p-4 rounded-lg">
                    <h4 className="font-bold text-white mb-1 md:mb-2 text-sm md:text-base">ARTICLE 5 — RESPONSABILITÉS DE L'ORGANISATEUR</h4>
                    <p className="text-gray-400 text-xs md:text-sm">
                      L'Organisateur est seul responsable :
                    </p>
                    <ul className="list-disc list-inside text-gray-400 text-xs md:text-sm mt-1 md:mt-2 space-y-0.5 md:space-y-1">
                      <li>de la véracité des informations publiées</li>
                      <li>de la tenue effective de l'événement</li>
                      <li>de la délivrance des prestations promises aux participants</li>
                      <li>des remboursements, reports ou annulations</li>
                      <li>de tout litige avec les participants</li>
                    </ul>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/30 p-3 md:p-4 rounded-lg">
                    <h4 className="font-bold text-white mb-1 md:mb-2 flex items-center gap-1 md:gap-2 text-sm md:text-base">
                      <AlertCircle className="w-3 h-3 md:w-4 md:h-4 text-red-400" />
                      ARTICLE 10 — LIMITATION DE RESPONSABILITÉ
                    </h4>
                    <p className="text-gray-400 text-xs md:text-sm">
                      BonPlanInfos ne pourra être tenue responsable des pertes indirectes, des dommages liés à l'organisation de l'événement, ou des décisions prises par l'Organisateur.
                    </p>
                  </div>
                </div>

                <div className="mt-4 md:mt-6 p-3 md:p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 font-semibold mb-1 md:mb-2 text-sm md:text-base">✅ ACCEPTATION OBLIGATOIRE</p>
                  <p className="text-gray-400 text-xs md:text-sm mb-3 md:mb-4">
                    En créant un compte Organisateur et en publiant un événement sur BonPlanInfos, l'Organisateur reconnaît avoir lu, compris et accepté sans réserve le présent contrat.
                  </p>
                  <div className="flex items-center gap-2 bg-gray-800/50 p-2 md:p-3 rounded">
                    <input type="checkbox" id="accept" className="rounded bg-gray-700 border-gray-600 w-3 h-3 md:w-4 md:h-4" />
                    <label htmlFor="accept" className="text-white text-xs md:text-sm">
                      J'ai lu et j'accepte le contrat Organisateur
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />

          {/* Section Sécurité & Fraude - Responsive */}
          <section id="fraud" className="space-y-4 md:space-y-6 scroll-mt-16 md:scroll-mt-4">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-red-500/20 rounded-lg text-red-400 border border-red-500/30">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              Sécurité & Fraude
            </h2>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 md:p-4 flex items-center gap-2 md:gap-3">
              <AlertCircle className="text-red-400 w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span className="font-medium text-red-300 text-xs md:text-sm">Tolérance Zéro pour la fraude.</span>
            </div>
            <p className="text-xs md:text-sm text-gray-400">
              Notre système utilise des algorithmes automatisés pour détecter les comportements suspects (achats massifs par même IP, 
              taux de scan incohérents, plaintes multiples). Tout compte suspecté est immédiatement <span className="text-white font-semibold">gelé</span> 
              le temps de l'investigation. En cas de fraude avérée, les fonds sont bloqués définitivement et reversés aux participants lésés.
            </p>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />

          {/* Section FAQ - Responsive */}
          <section id="faq" className="space-y-4 md:space-y-6 scroll-mt-16 md:scroll-mt-4">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white">FAQ</h2>
            <div className="space-y-3 md:space-y-4">
              <details className="group bg-[#111111] p-3 md:p-4 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors">
                <summary className="flex justify-between items-center font-medium text-white list-none text-sm md:text-base">
                  Quand puis-je retirer mes fonds ?
                  <span className="transition group-open:rotate-90 text-gray-400">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </span>
                </summary>
                <p className="text-gray-400 mt-2 md:mt-3 text-xs md:text-sm border-t border-gray-800 pt-2 md:pt-3">
                  Les fonds disponibles (débloqués) peuvent être retirés à tout moment via Mobile Money ou Virement. Le solde bloqué attend la validation de l'étape suivante.
                </p>
              </details>
              
              <details className="group bg-[#111111] p-3 md:p-4 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors">
                <summary className="flex justify-between items-center font-medium text-white list-none text-sm md:text-base">
                  Que faire en cas de litige ?
                  <span className="transition group-open:rotate-90 text-gray-400">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </span>
                </summary>
                <p className="text-gray-400 mt-2 md:mt-3 text-xs md:text-sm border-t border-gray-800 pt-2 md:pt-3">
                  Contactez le support via le centre d'aide. Fournissez toutes les preuves. Les fonds liés à l'événement seront gelés jusqu'à résolution.
                </p>
              </details>

              <details className="group bg-[#111111] p-3 md:p-4 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors">
                <summary className="flex justify-between items-center font-medium text-white list-none text-sm md:text-base">
                  Comment sont calculées les commissions des partenaires territoriaux ?
                  <span className="transition group-open:rotate-90 text-gray-400">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </span>
                </summary>
                <div className="text-gray-400 mt-2 md:mt-3 text-xs md:text-sm border-t border-gray-800 pt-2 md:pt-3 space-y-1 md:space-y-2">
                  <p>La commission plateforme de 5% est redistribuée selon le niveau territorial :</p>
                  <ul className="list-disc list-inside ml-2 md:ml-4 space-y-0.5 md:space-y-1">
                    <li>Concessionnaire Ville : 20% des 5% générés dans sa ville</li>
                    <li>Concessionnaire Région : 30% des 5% générés dans sa région</li>
                    <li>Franchisé National : 40% des 5% générés dans son pays</li>
                  </ul>
                </div>
              </details>

              <details className="group bg-[#111111] p-3 md:p-4 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors">
                <summary className="flex justify-between items-center font-medium text-white list-none text-sm md:text-base">
                  Quelles sont les conditions de remboursement pour une tombola annulée ?
                  <span className="transition group-open:rotate-90 text-gray-400">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </span>
                </summary>
                <p className="text-gray-400 mt-2 md:mt-3 text-xs md:text-sm border-t border-gray-800 pt-2 md:pt-3">
                  Si le tirage n'a pas eu lieu ou si le lot n'a pas été déposé, tous les participants sont automatiquement 
                  remboursés intégralement. Les fonds sont sous séquestre et ne peuvent être débloqués qu'après confirmation 
                  du dépôt et de la remise effective du lot au gagnant.
                </p>
              </details>

              <details className="group bg-[#111111] p-3 md:p-4 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors">
                <summary className="flex justify-between items-center font-medium text-white list-none text-sm md:text-base">
                  Un partenaire révoqué peut-il être remboursé ?
                  <span className="transition group-open:rotate-90 text-gray-400">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </span>
                </summary>
                <p className="text-gray-400 mt-2 md:mt-3 text-xs md:text-sm border-t border-gray-800 pt-2 md:pt-3">
                  Oui, uniquement en cas de révocation pour inaction ou sous-performance : remboursement de 50% du droit d'entrée. 
                  En cas de démission volontaire, aucun remboursement n'est accordé.
                </p>
              </details>

              <details className="group bg-[#111111] p-3 md:p-4 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors">
                <summary className="flex justify-between items-center font-medium text-white list-none text-sm md:text-base">
                  Les contrats PDF sont-ils complets ?
                  <span className="transition group-open:rotate-90 text-gray-400">
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                  </span>
                </summary>
                <p className="text-gray-400 mt-2 md:mt-3 text-xs md:text-sm border-t border-gray-800 pt-2 md:pt-3">
                  Oui, tous les contrats générés contiennent désormais l'intégralité du contenu sur plusieurs pages (3 à 5 pages selon le contrat). 
                  Plus aucune information n'est coupée. La signature de <span className="text-white">{BONPLANINFOS_INFO.responsable}</span> est automatiquement apposée.
                </p>
              </details>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default DocumentationPage;