// =============================================
// MOBILE PDF EXPORT (html2pdf.js-based)
// Renders the report HTML through the browser's
// engine (which handles Arabic perfectly) then
// converts to a real downloadable .pdf file.
// The desktop method (window.print) is NOT modified.
//
// This file wraps App.exportResponsesPDF so that
// on mobile it routes to the html2pdf method instead.
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
   * Mobile-specific PDF export using html2pdf.js.
   * Builds an HTML report, renders it through the browser
   * (perfect Arabic support), then converts to a real PDF download.
   */
  async function exportResponsesPDFMobile() {
    const app = window.App;
    const form = app.getForm();
    if (!form || !form.submissions || form.submissions.length === 0) {
      app.showToast('لا توجد ردود لتصديرها', 'error');
      return;
    }

    app.showToast('جاري إنشاء ملف PDF...', 'info');

    // Lazy-load html2pdf.js (bundles html2canvas + jsPDF internally)
    try {
      if (typeof window.html2pdf === 'undefined') {
        await app.loadScript('https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js');
      }
    } catch (e) {
      console.error('Failed to load html2pdf library:', e);
      app.showToast('فشل تحميل مكتبة PDF. تحقق من اتصال الإنترنت.', 'error');
      return;
    }

    try {
      // ── Build the report HTML ──
      const esc = (text) => app.escape ? app.escape(text) : String(text || '');

      let reportHTML = `
        <div style="direction:rtl; font-family:'Tajawal','Segoe UI',Arial,sans-serif; color:#1a1a2e; padding:20px; background:#fff;">
          <!-- Header -->
          <div style="text-align:center; margin-bottom:25px; padding-bottom:15px; border-bottom:3px solid #4f46e5;">
            <h1 style="font-size:1.6rem; font-weight:800; color:#4f46e5; margin:0 0 8px 0;">${esc(form.title)}</h1>
            <div style="font-size:0.85rem; color:#666;">
              <span style="display:inline-block; margin:0 8px; padding:4px 12px; background:#f0f0ff; border-radius:20px; font-weight:700; color:#4f46e5;">إجمالي الردود: ${form.submissions.length}</span>
              <span style="display:inline-block; margin:0 8px; padding:4px 12px; background:#f0f0ff; border-radius:20px; font-weight:700; color:#4f46e5;">تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</span>
            </div>
          </div>`;

      // ── Charts as images ──
      const canvases = document.getElementById('page-responses').querySelectorAll('canvas');
      if (canvases.length > 0) {
        reportHTML += `<div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-bottom:20px;">`;
        canvases.forEach(canvas => {
          try {
            const imgData = canvas.toDataURL('image/png');
            reportHTML += `<img src="${imgData}" style="max-width:48%; max-height:200px; object-fit:contain; border:1px solid #eee; border-radius:8px;">`;
          } catch (e) { }
        });
        reportHTML += `</div>`;
      }

      // ── Table ──
      reportHTML += `
        <table style="width:100%; border-collapse:collapse; font-size:0.75rem; margin-top:10px;">
          <thead>
            <tr>
              <th style="background:#4f46e5; color:#fff; padding:8px 6px; font-weight:700; font-size:0.8rem; white-space:nowrap; border:1px solid #3730a3; text-align:center;">#</th>
              <th style="background:#4f46e5; color:#fff; padding:8px 6px; font-weight:700; font-size:0.8rem; white-space:nowrap; border:1px solid #3730a3; text-align:center;">تاريخ الإرسال</th>`;

      if (form.enableTicketing) {
        reportHTML += `<th style="background:#4f46e5; color:#fff; padding:8px 6px; font-weight:700; font-size:0.8rem; white-space:nowrap; border:1px solid #3730a3; text-align:center;">الحضور</th>`;
      }

      form.fields.forEach(f => {
        if (f.type !== 'section_break') {
          reportHTML += `<th style="background:#4f46e5; color:#fff; padding:8px 6px; font-weight:700; font-size:0.8rem; white-space:nowrap; border:1px solid #3730a3; text-align:center;">${esc(f.label)}</th>`;
        }
      });

      reportHTML += `</tr></thead><tbody>`;

      form.submissions.forEach((sub, idx) => {
        const bgColor = idx % 2 === 0 ? '#fff' : '#f8fafc';
        reportHTML += `<tr style="background:${bgColor};">`;
        reportHTML += `<td style="padding:6px; border:1px solid #e2e8f0; text-align:center; font-weight:700; color:#4f46e5;">${idx + 1}</td>`;
        reportHTML += `<td style="padding:6px; border:1px solid #e2e8f0; text-align:right; white-space:nowrap; font-size:0.7rem;">${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : '-'}</td>`;

        if (form.enableTicketing) {
          const attended = sub.data._checked_in === true || sub.data._checked_in === 'true';
          const badge = attended
            ? `<span style="background:rgba(16,185,129,0.15); color:#059669; padding:2px 6px; border-radius:10px; font-size:0.7rem; font-weight:700;">✅ حضر</span>`
            : `<span style="background:rgba(100,116,139,0.15); color:#64748b; padding:2px 6px; border-radius:10px; font-size:0.7rem; font-weight:700;">⏳ لم يحضر</span>`;
          reportHTML += `<td style="padding:6px; border:1px solid #e2e8f0; text-align:center;">${badge}</td>`;
        }

        form.fields.forEach(f => {
          if (f.type !== 'section_break') {
            let val = sub.data[f.label];
            if (val === undefined || val === null) {
              val = '-';
            } else if ((f.type === 'file_upload' || f.type === 'signature') && typeof val === 'string' && (val.startsWith('data:image') || val.startsWith('http'))) {
              reportHTML += `<td style="padding:6px; border:1px solid #e2e8f0; text-align:center;"><img src="${val}" style="max-width:50px; max-height:50px; border-radius:4px;"></td>`;
              return;
            } else if (Array.isArray(val)) {
              val = val.join('، ');
            }
            reportHTML += `<td style="padding:6px; border:1px solid #e2e8f0; text-align:right;">${esc(val)}</td>`;
          }
        });
        reportHTML += `</tr>`;
      });

      reportHTML += `</tbody></table>`;
      reportHTML += `<div style="margin-top:20px; text-align:center; font-size:0.65rem; color:#999; border-top:1px solid #eee; padding-top:10px;">تم إنشاء هذا التقرير بواسطة Menoufia Forms | ${new Date().toLocaleString('ar-EG')}</div>`;
      reportHTML += `</div>`;

      // ── Create a hidden container for rendering ──
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1100px'; // Wide enough for landscape-like rendering
      container.style.background = '#fff';
      container.style.zIndex = '-1';
      container.innerHTML = reportHTML;
      document.body.appendChild(container);

      // ── Generate PDF with html2pdf ──
      const fileName = `responses_${form.title.replace(/\s+/g, '_')}.pdf`;

      await html2pdf()
        .set({
          margin: [8, 8, 12, 8],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            scrollY: 0,
            windowWidth: 1100,
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'landscape',
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(container)
        .save();

      // Cleanup
      document.body.removeChild(container);

      app.showToast('تم تصدير PDF بنجاح ✅', 'success');
    } catch (err) {
      console.error('Mobile PDF export error:', err);
      app.showToast('حدث خطأ أثناء إنشاء PDF', 'error');
    }
  }

  // ── Override exportResponsesPDF with mobile routing ──
  // On desktop: calls the original method from responses.js (unchanged)
  // On mobile: calls the html2pdf-based method above
  window.App.exportResponsesPDF = function () {
    if (isMobileDevice()) {
      return exportResponsesPDFMobile();
    }
    return _originalExportPDF.call(this);
  };
})();
