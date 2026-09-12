// utils/generateRankingPDF.jsx
// Export du CLASSEMENT d'un concours/événement en PDF (A4) — compatible mobile
// (Android / iOS) : ouvre le PDF dans l'onglet / le lecteur du navigateur.
//
// Modes d'export :
//  - "general"         : classement global (ou la catégorie filtrée si filter != "Tous")
//  - "top_categories"  : top 3 par catégorie
//  - "full_categories" : classement complet, section par catégorie
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const safeText = (text) => {
  if (text === null || text === undefined) return "";
  return String(text);
};

const formatVotes = (n) => Number(n || 0).toLocaleString("fr-FR");

const getBase64ImageFromURL = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    const timeout = setTimeout(() => {
      resolve(null);
    }, 4000);
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    const cacheBusterUrl =
      url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
    img.src = cacheBusterUrl;
  });
};

// Ouverture universelle du PDF (onglet neuf, sinon navigation directe) :
// fonctionne sur Android et iOS.
const openPDFInNewTab = (doc, fileName) => {
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  const newWindow = window.open(blobUrl, "_blank");
  if (!newWindow) {
    window.location.href = blobUrl;
  }
  setTimeout(() => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      /* ignore */
    }
  }, 60000);
};

const readyRows = (list, totalVotes) =>
  (list || [])
    .slice()
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .map((c, i) => ({
      rank: i + 1,
      name: safeText(c.name),
      category: safeText(c.category) || "—",
      votes: c.vote_count || 0,
      pct: totalVotes > 0 ? ((c.vote_count || 0) / totalVotes) * 100 : 0,
    }));

const drawHeader = (doc, pageWidth, title, subtitle, logoImg) => {
  // Bandeau supérieur
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, pageWidth, 24, "F");

  if (logoImg) {
    try {
      doc.addImage(logoImg, "PNG", 12, 4, 16, 16);
    } catch (e) {
      /* ignore */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("www.bonplaninfos.net", pageWidth - 12, 10, { align: "right" });
  doc.setFontSize(7);
  doc.text("CLASSEMENT OFFICIEL", pageWidth - 12, 15, { align: "right" });

  // Titre
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(safeText(title), pageWidth - 24);
  doc.text(titleLines, 12, 36);
  let y = 36 + titleLines.length * 6;

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    const subLines = doc.splitTextToSize(safeText(subtitle), pageWidth - 24);
    doc.text(subLines, 12, y + 2);
    y += 2 + subLines.length * 5;
  }
  return y + 6;
};

// En-tête compact répété en haut des pages de continuation (modes par catégorie).
// Retourne la position verticale où placer le bandeau "Catégorie".
const drawRepeatHeader = (doc, pageWidth, title, logoImg) => {
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, pageWidth, 22, "F");

  if (logoImg) {
    try {
      doc.addImage(logoImg, "PNG", 10, 3, 14, 14);
    } catch (e) {
      /* ignore */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("www.bonplaninfos.net", pageWidth - 12, 8, { align: "right" });
  doc.setFontSize(7);
  doc.text("CLASSEMENT OFFICIEL", pageWidth - 12, 13, { align: "right" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const lines = doc.splitTextToSize(
    `${safeText(title)} - suite`,
    pageWidth - 74
  );
  doc.text(lines, 28, 12);

  return 26;
};

const drawFooter = (doc, pageWidth, pageHeight, extraText) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Page ${i}/${pageCount} - Généré le ${new Date().toLocaleString("fr-FR")}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }
  if (extraText) {
    doc.setPage(pageCount);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text(extraText, pageWidth / 2, pageHeight - 16, { align: "center" });
  }
};

const styleTable = {
  headStyles: {
    fillColor: [5, 150, 105],
    textColor: [255, 255, 255],
    fontSize: 9,
    fontStyle: "bold",
    halign: "center",
    cellPadding: 3,
  },
  styles: {
    fontSize: 9,
    cellPadding: 2.5,
    overflow: "linebreak",
  },
  columnStyles: {
    0: { cellWidth: 16, halign: "center" },
    1: { cellWidth: "auto" },
    2: { cellWidth: 38, halign: "center" },
    3: { cellWidth: 24, halign: "right" },
    4: { cellWidth: 26, halign: "right" },
  },
  alternateRowStyles: { fillColor: [243, 244, 246] },
  theme: "grid",
};

const rankingColumns = ["Rang", "Candidat", "Catégorie", "Voix", "Voix (%)"];

const rankCell = (rank) => (rank <= 99 ? `#${rank}` : String(rank));

export const generateRankingPDF = async ({
  title = "Concours",
  subtitle = "",
  mode = "general",
  candidates = [],
  filter = "Tous",
  totalVotes = 0,
  topN = 3,
}) => {
  try {
    if (!candidates || candidates.length === 0) {
      throw new Error("Aucun candidat à exporter");
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const categoryLabel =
      mode === "general" && filter !== "Tous" ? ` - Catégorie : ${filter}` : "";
    const fullTitle = `${safeText(title)}${categoryLabel}`;
    const headerSubtitle =
      subtitle || `Classement officiel généré le ${new Date().toLocaleString("fr-FR")}`;

    let logoImg = null;
    try {
      logoImg = await getBase64ImageFromURL("/pwa-192x192.png");
    } catch (e) {
      /* ignore */
    }
    let y = drawHeader(doc, pageWidth, fullTitle, headerSubtitle, logoImg);

    const hasCategories = candidates.some((c) => c.category);

    // ─── Mode 1 : CLASSEMENT GÉNÉRAL ───
    if (mode === "general") {
      const list =
        filter !== "Tous"
          ? candidates.filter((c) => c.category === filter)
          : candidates;
      const rows = readyRows(list, totalVotes).map((r) => [
        rankCell(r.rank),
        r.name,
        r.category,
        formatVotes(r.votes),
        `${r.pct.toFixed(1)} %`,
      ]);

      autoTable(doc, {
        head: [rankingColumns],
        body: rows,
        startY: y,
        ...styleTable,
      });

      const finalY = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(`Nombre de candidats : ${rows.length}`, 12, finalY);
      doc.text(
        `Total des voix : ${formatVotes(totalVotes)}`,
        12,
        finalY + 5
      );
      drawFooter(doc, pageWidth, pageHeight, "Published by BonPlanInfos");
      openPDFInNewTab(doc, "Classement_General.pdf");
      return true;
    }

    // ─── Modes 2 & 3 : PAR CATÉGORIE ───
    // Catégories triées (a -> z) pour un ordre de lecture déterministe,
    // de la première à la dernière catégorie de la page.
    const cats = hasCategories
      ? [
          ...new Set(candidates.map((c) => c.category).filter(Boolean)),
        ].sort((a, b) => a.localeCompare(b, "fr"))
      : ["Sans catégorie"];

    // Chaque catégorie est délimitée par un bandeau "Catégorie" suivi du
    // tableau, du premier au dernier. La 1ère catégorie suit le titre de la
    // page 1 ; les suivantes repartent sur une nouvelle page avec un
    // en-tête compact (pas de chevauchement, textes toujours visibles).
    const modeLabel =
      mode === "top_categories" ? `Top ${topN}` : "Classement complet";

    for (let ci = 0; ci < cats.length; ci++) {
      const cat = cats[ci];
      const list = hasCategories
        ? candidates.filter((c) => c.category === cat)
        : candidates;
      const rows = readyRows(list, totalVotes);
      const tableList = mode === "top_categories" ? rows.slice(0, topN) : rows;

      const body = tableList.map((r) => [
        rankCell(r.rank),
        r.name,
        r.category,
        formatVotes(r.votes),
        `${r.pct.toFixed(1)} %`,
      ]);

      let startY;
      if (ci === 0) {
        startY = y; // directement sous l'en-tête complet de la page 1
      } else {
        // Nouvelle page : en-tête compact puis bandeau "Catégorie"
        doc.addPage();
        startY = drawRepeatHeader(doc, pageWidth, title, logoImg);
      }

      // Bandeau de section "Catégorie"
      doc.setFillColor(31, 41, 55);
      doc.rect(0, startY, pageWidth, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Catégorie : ${safeText(cat)}`, 12, startY + 7);

      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${list.length} candidat(s) - ${modeLabel}`,
        pageWidth - 12,
        startY + 7,
        { align: "right" }
      );

      autoTable(doc, {
        head: [rankingColumns],
        body,
        startY: startY + 12,
        ...styleTable,
      });

      const finalY = doc.lastAutoTable.finalY + 5;
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Sous-total ${mode === "top_categories" ? `top ${topN}` : "catégorie"} : ${formatVotes(
          list.reduce((s, c) => s + (c.vote_count || 0), 0)
        )} voix`,
        12,
        finalY
      );
    }

    drawFooter(doc, pageWidth, pageHeight, "Published by BonPlanInfos");
    openPDFInNewTab(
      doc,
      mode === "top_categories" ? "Classement_Top_Categories.pdf" : "Classement_par_Categorie.pdf"
    );
    return true;
  } catch (error) {
    console.error("❌ Erreur export classement PDF:", error);
    if (typeof window !== "undefined" && window.toast) {
      window.toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de générer le classement PDF",
        variant: "destructive",
      });
    }
    return false;
  }
};

export default generateRankingPDF;