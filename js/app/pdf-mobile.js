// =============================================
// MOBILE PDF EXPORT (jsPDF-based)
// Generates a real .pdf file that downloads
// directly — works reliably on all mobile browsers.
// The desktop method (window.print) is NOT modified.
//
// This file wraps App.exportResponsesPDF so that
// on mobile it routes to the jsPDF method instead.
// responses.js remains 100% untouched.
// =============================================
(function () {
  // Save a reference to the original desktop PDF export
  const _originalExportPDF = window.App.exportResponsesPDF;

  /**
   * Detect if the current device is mobile/tablet.
   */
  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh/.test(navigator.userAgent));
  }

  /**
   * Mobile-specific PDF export using jsPDF + AutoTable.
   * Produces a real downloadable .pdf file with RTL Arabic support.
   */
  async function exportResponsesPDFMobile() {
    const app = window.App;
    const form = app.getForm();
    if (!form || !form.submissions || form.submissions.length === 0) {
      app.showToast('لا توجد ردود لتصديرها', 'error');
      return;
    }

    app.showToast('جاري إنشاء ملف PDF...', 'info');

    // Lazy-load jsPDF + AutoTable
    try {
      if (typeof window.jspdf === 'undefined') {
        await app.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js');
      }
      if (typeof window.jspdf.jsPDF.API.autoTable === 'undefined') {
        await app.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js');
      }
    } catch (e) {
      console.error('Failed to load jsPDF libraries:', e);
      app.showToast('فشل تحميل مكتبة PDF. تحقق من اتصال الإنترنت.', 'error');
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const safeText = (text) => {
        if (!text) return '';
        return String(text);
      };

      // ── Page dimensions ──
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // ── Header ──
      doc.setFillColor(79, 70, 229); // #4f46e5
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(safeText(form.title), pageWidth / 2, 12, { align: 'center' });
      doc.setFontSize(10);
      const totalText = `${form.submissions.length} :إجمالي الردود`;
      const dateText = `${new Date().toLocaleDateString('ar-EG')} :تاريخ التصدير`;
      doc.text(totalText, pageWidth / 2 + 40, 22, { align: 'center' });
      doc.text(dateText, pageWidth / 2 - 40, 22, { align: 'center' });

      let startY = 35;

      // ── Charts as images ──
      const canvases = document.getElementById('page-responses').querySelectorAll('canvas');
      if (canvases.length > 0) {
        let chartX = margin;
        const chartMaxWidth = (pageWidth - margin * 2 - 10) / 2; // 2 charts per row
        const chartMaxHeight = 55;
        let chartsInRow = 0;

        canvases.forEach(canvas => {
          try {
            const imgData = canvas.toDataURL('image/png');
            const ratio = Math.min(chartMaxWidth / canvas.width, chartMaxHeight / canvas.height);
            const w = canvas.width * ratio;
            const h = canvas.height * ratio;

            if (chartsInRow >= 2) {
              chartX = margin;
              startY += chartMaxHeight + 8;
              chartsInRow = 0;
            }

            if (startY + h > pageHeight - 20) {
              doc.addPage();
              startY = margin;
            }

            doc.addImage(imgData, 'PNG', chartX, startY, w, h);
            chartX += chartMaxWidth + 10;
            chartsInRow++;
          } catch (e) {
            console.warn('Could not export chart to PDF:', e);
          }
        });

        startY += chartMaxHeight + 12;
      }

      // ── Table ──
      const headers = ['#', 'تاريخ الإرسال'];
      if (form.enableTicketing) {
        headers.push('الحضور');
      }
      form.fields.forEach(f => {
        if (f.type !== 'section_break') {
          headers.push(f.label);
        }
      });

      const rows = [];
      form.submissions.forEach((sub, idx) => {
        const row = [];
        row.push(String(idx + 1));
        row.push(sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : '-');

        if (form.enableTicketing) {
          const attended = sub.data._checked_in === true || sub.data._checked_in === 'true';
          row.push(attended ? 'حضر ✅' : 'لم يحضر ⏳');
        }

        form.fields.forEach(f => {
          if (f.type !== 'section_break') {
            let val = sub.data[f.label];
            if (val === undefined || val === null) {
              val = '-';
            } else if ((f.type === 'file_upload' || f.type === 'signature') && typeof val === 'string' && (val.startsWith('data:image') || val.startsWith('http'))) {
              val = '[صورة مرفقة]';
            } else if (Array.isArray(val)) {
              val = val.join('، ');
            }
            row.push(String(val));
          }
        });
        rows.push(row);
      });

      if (startY > pageHeight - 40) {
        doc.addPage();
        startY = margin;
      }

      doc.autoTable({
        head: [headers],
        body: rows,
        startY: startY,
        margin: { left: margin, right: margin },
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'right',
          valign: 'middle',
          lineColor: [226, 232, 240],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12, fontStyle: 'bold', textColor: [79, 70, 229] },
          1: { cellWidth: 35, halign: 'right', fontSize: 7 },
        },
        didDrawPage: function (data) {
          doc.setFontSize(7);
          doc.setTextColor(153, 153, 153);
          const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
          const totalPages = doc.internal.getNumberOfPages();
          doc.text(
            `Menoufia Forms | ${pageNum} / ${totalPages}`,
            pageWidth / 2, pageHeight - 8,
            { align: 'center' }
          );
        },
      });

      // ── Save / Download ──
      const fileName = `responses_${form.title.replace(/\s+/g, '_')}.pdf`;
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 15000);

      app.showToast('تم تصدير PDF بنجاح ✅', 'success');
    } catch (err) {
      console.error('Mobile PDF export error:', err);
      app.showToast('حدث خطأ أثناء إنشاء PDF', 'error');
    }
  }

  // ── Override exportResponsesPDF with mobile routing ──
  // On desktop: calls the original method from responses.js (unchanged)
  // On mobile: calls the jsPDF-based method above
  window.App.exportResponsesPDF = function () {
    if (isMobileDevice()) {
      return exportResponsesPDFMobile();
    }
    return _originalExportPDF.call(this);
  };
})();
