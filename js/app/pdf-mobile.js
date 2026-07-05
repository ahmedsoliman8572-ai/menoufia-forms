// =============================================
// MOBILE PDF EXPORT
// Uses a full-screen iframe with srcdoc instead of
// window.open + document.write — this guarantees
// proper UTF-8 encoding for Arabic text on mobile.
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
   * Build the complete HTML report page.
   * Shared between all delivery methods.
   */
  function buildReportHTML(form, app) {
    // Capture chart images first (while on the original page)
    let chartImagesHTML = '';
    const canvases = document.getElementById('page-responses').querySelectorAll('canvas');
    if (canvases.length > 0) {
      chartImagesHTML += `<div class="charts-section">`;
      canvases.forEach(canvas => {
        try {
          chartImagesHTML += `<img src="${canvas.toDataURL('image/png')}">`;
        } catch (e) { }
      });
      chartImagesHTML += `</div>`;
    }

    // Build table rows
    let tableRows = '';
    form.submissions.forEach((sub, idx) => {
      tableRows += `<tr>`;
      tableRows += `<td class="col-num">${idx + 1}</td>`;
      tableRows += `<td class="col-date">${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : '-'}</td>`;

      if (form.enableTicketing) {
        const attended = sub.data._checked_in === true || sub.data._checked_in === 'true';
        tableRows += `<td style="text-align:center;"><span class="${attended ? 'badge-attended' : 'badge-absent'}">${attended ? '✅ حضر' : '⏳ لم يحضر'}</span></td>`;
      }

      form.fields.forEach(f => {
        if (f.type !== 'section_break') {
          let val = sub.data[f.label];
          if (val === undefined || val === null) val = '-';
          if ((f.type === 'file_upload' || f.type === 'signature') && typeof val === 'string' && (val.startsWith('data:image') || val.startsWith('http'))) {
            tableRows += `<td style="text-align:center;"><img class="img-thumb" src="${val}"></td>`;
          } else {
            tableRows += `<td>${app.escape(val)}</td>`;
          }
        }
      });
      tableRows += `</tr>`;
    });

    // Build table headers
    let tableHeaders = `<th>#</th><th>تاريخ الإرسال</th>`;
    if (form.enableTicketing) tableHeaders += `<th>الحضور</th>`;
    form.fields.forEach(f => {
      if (f.type !== 'section_break') {
        tableHeaders += `<th>${app.escape(f.label)}</th>`;
      }
    });

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=0.5, maximum-scale=3">
  <title>تقرير ردود - ${app.escape(form.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cairo', 'Geeza Pro', 'Segoe UI', 'Arial', Tahoma, sans-serif;
      direction: rtl;
      background: #fff;
      color: #1a1a2e;
      padding: 20px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .report-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 3px solid #4f46e5;
    }
    .report-header h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #4f46e5;
      margin-bottom: 8px;
    }
    .report-header .meta {
      font-size: 0.85rem;
      color: #666;
    }
    .report-header .meta span {
      display: inline-block;
      margin: 0 8px;
      padding: 4px 10px;
      background: #f0f0ff;
      border-radius: 20px;
      font-weight: 700;
      color: #4f46e5;
    }
    .charts-section {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-bottom: 20px;
    }
    .charts-section img {
      max-width: 48%;
      max-height: 220px;
      object-fit: contain;
      border: 1px solid #eee;
      border-radius: 8px;
    }
    .table-wrapper {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      margin-top: 10px;
    }
    thead th {
      background: #4f46e5 !important;
      color: #fff !important;
      padding: 8px 6px;
      font-weight: 700;
      font-size: 0.8rem;
      border: 1px solid #3730a3;
      text-align: center;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    tbody td {
      padding: 6px;
      border: 1px solid #e2e8f0;
      text-align: right;
      vertical-align: middle;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc !important;
    }
    .col-num {
      text-align: center;
      font-weight: 700;
      color: #4f46e5;
      width: 35px;
    }
    .col-date {
      white-space: nowrap;
      direction: ltr;
      text-align: right;
      font-size: 0.75rem;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 0.7rem;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 10px;
    }
    .badge-attended {
      background: rgba(16,185,129,0.15);
      color: #059669;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge-absent {
      background: rgba(100,116,139,0.15);
      color: #64748b;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .img-thumb {
      max-width: 50px;
      max-height: 50px;
      border-radius: 4px;
      display: block;
      margin: 0 auto;
    }
    .toolbar {
      text-align: center;
      margin-bottom: 15px;
      padding: 12px;
      background: #f0f0ff;
      border-radius: 12px;
    }
    .toolbar p {
      margin-bottom: 8px;
      font-weight: 700;
      color: #4f46e5;
      font-size: 0.9rem;
    }
    .toolbar button {
      padding: 10px 25px;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-family: 'Cairo', 'Geeza Pro', Arial, sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      margin: 4px;
    }
    .toolbar button:active {
      background: #3730a3;
    }
    .toolbar .btn-close {
      background: #ef4444;
    }
    @media print {
      @page { size: landscape; margin: 10mm; }
      body { padding: 10px; }
      .toolbar { display: none !important; }
      table { font-size: 0.7rem; }
      thead th { font-size: 0.7rem; padding: 5px 4px; }
      tbody td { padding: 4px; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <p>اضغط الزر لحفظ كـ PDF أو استخدم "مشاركة" ← "طباعة"</p>
    <button onclick="window.print()">🖨️ طباعة / تصدير PDF</button>
    <button class="btn-close" onclick="closePdfView()">✕ رجوع</button>
  </div>

  <div class="report-header">
    <h1>${app.escape(form.title)}</h1>
    <div class="meta">
      <span>إجمالي الردود: ${form.submissions.length}</span>
      <span>تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</span>
    </div>
  </div>

  ${chartImagesHTML}

  <div class="table-wrapper">
    <table>
      <thead><tr>${tableHeaders}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <div class="footer">تم إنشاء هذا التقرير بواسطة Menoufia Forms | ${new Date().toLocaleString('ar-EG')}</div>

  <script>
    function closePdfView() {
      if (window.parent !== window) {
        // Inside iframe — tell parent to remove it
        window.parent.postMessage('close-pdf-iframe', '*');
      } else if (window.opener) {
        window.close();
      } else {
        history.back();
      }
    }
  </script>
</body>
</html>`;
  }

  /**
   * Mobile PDF export — uses an iframe with srcdoc to guarantee
   * proper UTF-8 encoding for Arabic text.
   */
  async function exportResponsesPDFMobile() {
    const app = window.App;
    const form = app.getForm();
    if (!form || !form.submissions || form.submissions.length === 0) {
      app.showToast('لا توجد ردود لتصديرها', 'error');
      return;
    }

    const html = buildReportHTML(form, app);

    // ── Strategy 1: Full-screen iframe with srcdoc ──
    // srcdoc accepts a DOMString, so encoding is handled correctly
    // This avoids all the charset issues with window.open + document.write
    try {
      // Remove any existing PDF iframe
      const existingIframe = document.getElementById('pdf-export-iframe');
      if (existingIframe) existingIframe.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'pdf-export-iframe';
      iframe.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:999999; border:none; background:#fff;';
      iframe.srcdoc = html;
      document.body.appendChild(iframe);

      // Listen for close message from the iframe
      function onMessage(e) {
        if (e.data === 'close-pdf-iframe') {
          iframe.remove();
          window.removeEventListener('message', onMessage);
        }
      }
      window.addEventListener('message', onMessage);

      app.showToast('تم فتح تقرير التصدير', 'success');
      return;
    } catch (err1) {
      console.warn('srcdoc approach failed:', err1);
    }

    // ── Strategy 2: Blob URL via anchor click ──
    try {
      const encoder = new TextEncoder();
      const utf8Bytes = encoder.encode(html);
      const blob = new Blob([utf8Bytes], { type: 'text/html;charset=UTF-8' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 60000);
      app.showToast('تم فتح نافذة التصدير', 'success');
      return;
    } catch (err2) {
      console.warn('Blob URL approach failed:', err2);
    }

    // ── Strategy 3: data: URI (last resort) ──
    try {
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      window.open(dataUrl, '_blank');
      app.showToast('تم فتح نافذة التصدير', 'success');
    } catch (err3) {
      console.error('All export strategies failed:', err3);
      app.showToast('حدث خطأ أثناء التصدير', 'error');
    }
  }

  // ── Override exportResponsesPDF with mobile routing ──
  // On desktop: calls the original method from responses.js (unchanged)
  // On mobile: calls the mobile-specific method
  window.App.exportResponsesPDF = function () {
    if (isMobileDevice()) {
      return exportResponsesPDFMobile();
    }
    return _originalExportPDF.call(this);
  };
})();
