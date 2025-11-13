import * as XLSX from 'xlsx-js-style';

export const exportToExcel = ({ data, headers, sheetName = 'Export', fileName = 'export.xlsx' }) => {
  // 1. Convert data to worksheet format
  const ws_data = [
    headers.map(h => h.label),
    ...data.map(row => headers.map(h => row[h.key] ?? ''))
  ];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // 2. Define styles
  const headerStyle = {
    font: { name: 'Poppins', bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'EFEAFF' } },
    border: {
      bottom: { style: 'medium', color: { rgb: 'B3A4F2' } },
      top: { style: 'thin', color: { rgb: 'DDDDDD' } },
      left: { style: 'thin', color: { rgb: 'DDDDDD' } },
      right: { style: 'thin', color: { rgb: 'DDDDDD' } },
    }
  };

  const cellStyle = {
    font: { name: 'Poppins' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
      top: { style: 'thin', color: { rgb: 'DDDDDD' } },
      left: { style: 'thin', color: { rgb: 'DDDDDD' } },
      right: { style: 'thin', color: { rgb: 'DDDDDD' } },
    }
  };
  
  const evenRowStyle = { 
    ...cellStyle, 
    fill: { fgColor: { rgb: 'FAFAFA' } } 
  };
  
  // 3. Apply styles
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerCellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    ws[headerCellAddress].s = headerStyle;

    for (let R = 1; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if(!ws[cellAddress]) continue;
        ws[cellAddress].s = (R % 2 === 0) ? evenRowStyle : cellStyle;
    }
  }

  // 4. Auto-adjust column widths
  const colWidths = headers.map((h, i) => {
    const colValues = [h.label, ...data.map(row => row[h.key] ?? '')];
    return { wch: Math.max(...colValues.map(val => String(val).length)) + 2 };
  });
  ws['!cols'] = colWidths;

  // 5. Freeze header row & add auto-filter
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  ws['!freeze'] = { ySplit: 1, state: 'frozen' };

  // 6. Create workbook and trigger download
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
};