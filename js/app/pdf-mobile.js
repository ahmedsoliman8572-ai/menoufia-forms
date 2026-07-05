// =============================================
// MOBILE PDF EXPORT
// Uses the SAME method as desktop (HTML page +
// browser print) but delivers the page via
// window.open + document.write instead of Blob URL,
// which mobile browsers block.
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
   * Mobile PDF export — same HTML report as desktop,
   * delivered via window.open + document.write instead of Blob URL.
   */
  async function exportResponsesPDFMobile() {
    const app = window.App;
    const form = app.getForm();
    if (!form || !form.submissions || form.submissions.length === 0) {
      app.showToast('لا توجد ردود لتصديرها', 'error');
      return;
    }

    // Build the exact same HTML page as the desktop method
    // Use <link> instead of @import for reliable font loading on mobile
    let html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=1024">
  <title>تقرير ردود - ${app.escape(form.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Tajawal', 'Segoe UI', 'Arial', sans-serif;
      direction: rtl;
      background: #fff;
      color: #1a1a2e;
      padding: 30px;
      min-width: 1024px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* Hide content until font is ready */
    body.fonts-loading {
      visibility: hidden;
    }
    .report-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4f46e5;
    }
    .report-header h1 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #4f46e5;
      margin-bottom: 8px;
    }
    .report-header .meta {
      font-size: 0.9rem;
      color: #666;
    }
    .report-header .meta span {
      display: inline-block;
      margin: 0 10px;
      padding: 4px 12px;
      background: #f0f0ff;
      border-radius: 20px;
      font-weight: 700;
      color: #4f46e5;
    }
    .charts-section {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      justify-content: center;
      margin-bottom: 25px;
    }
    .charts-section img {
      max-width: 48%;
      max-height: 250px;
      object-fit: contain;
      border: 1px solid #eee;
      border-radius: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      margin-top: 10px;
    }
    thead th {
      background: #4f46e5 !important;
      color: #fff !important;
      padding: 10px 8px;
      font-weight: 700;
      font-size: 0.9rem;
      white-space: nowrap;
      border: 1px solid #3730a3;
      text-align: center;
    }
    tbody td {
      padding: 8px;
      border: 1px solid #e2e8f0;
      text-align: right;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc !important;
    }
    tbody tr:hover {
      background: #eef2ff !important;
    }
    .col-num {
      text-align: center;
      font-weight: 700;
      color: #4f46e5;
      width: 40px;
    }
    .col-date {
      white-space: nowrap;
      direction: ltr;
      text-align: right;
      font-size: 0.8rem;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 0.75rem;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 15px;
    }
    .badge-attended {
      background: rgba(16,185,129,0.15);
      color: #059669;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .badge-absent {
      background: rgba(100,116,139,0.15);
      color: #64748b;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .img-thumb {
      max-width: 60px;
      max-height: 60px;
      border-radius: 4px;
      display: block;
      margin: 0 auto;
    }
    @media print {
      @page { size: landscape; }
      body { padding: 15px; min-width: 1024px !important; }
      body.fonts-loading { visibility: visible; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body class="fonts-loading">
  <div class="no-print" style="text-align:center; margin-bottom:20px; padding:15px; background:#f0f0ff; border-radius:12px;">
    <p style="margin-bottom:10px; font-weight:700; color:#4f46e5;">اضغط على الزر أدناه أو استخدم "مشاركة" ثم "طباعة" لحفظ كـ PDF</p>
    <button onclick="window.print()" style="padding:10px 30px; background:#4f46e5; color:#fff; border:none; border-radius:8px; font-family:Tajawal,sans-serif; font-size:1rem; font-weight:700; cursor:pointer;">🖨️ طباعة / تصدير PDF</button>
  </div>

  <div class="report-header">
    <h1>${app.escape(form.title)}</h1>
    <div class="meta">
      <span>إجمالي الردود: ${form.submissions.length}</span>
      <span>تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</span>
    </div>
  </div>`;

    // Charts as images
    const canvases = document.getElementById('page-responses').querySelectorAll('canvas');
    if (canvases.length > 0) {
      html += `<div class="charts-section">`;
      canvases.forEach(canvas => {
        try {
          html += `<img src="${canvas.toDataURL('image/png')}">`;
        } catch (e) { }
      });
      html += `</div>`;
    }

    // Table
    html += `<table><thead><tr>`;
    html += `<th>#</th><th>تاريخ الإرسال</th>`;
    if (form.enableTicketing) html += `<th>الحضور</th>`;
    form.fields.forEach(f => {
      if (f.type !== 'section_break') {
        html += `<th>${app.escape(f.label)}</th>`;
      }
    });
    html += `</tr></thead><tbody>`;

    form.submissions.forEach((sub, idx) => {
      html += `<tr>`;
      html += `<td class="col-num">${idx + 1}</td>`;
      html += `<td class="col-date">${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : '-'}</td>`;

      if (form.enableTicketing) {
        const attended = sub.data._checked_in === true || sub.data._checked_in === 'true';
        html += `<td style="text-align:center;"><span class="${attended ? 'badge-attended' : 'badge-absent'}">${attended ? '✅ حضر' : '⏳ لم يحضر'}</span></td>`;
      }

      form.fields.forEach(f => {
        if (f.type !== 'section_break') {
          let val = sub.data[f.label];
          if (val === undefined || val === null) val = '-';
          if ((f.type === 'file_upload' || f.type === 'signature') && typeof val === 'string' && (val.startsWith('data:image') || val.startsWith('http'))) {
            html += `<td style="text-align:center;"><img class="img-thumb" src="${val}"></td>`;
          } else {
            html += `<td>${app.escape(val)}</td>`;
          }
        }
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    html += `<div class="footer">تم إنشاء هذا التقرير بواسطة Menoufia Forms | ${new Date().toLocaleString('ar-EG')}</div>`;

    // Font-loading script: waits for Tajawal to load, then reveals content
    html += `
<script>
(function() {
  // Wait for fonts to be ready, then show the page
  function showPage() {
    document.body.classList.remove('fonts-loading');
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(showPage);
  } else {
    // Fallback for browsers without FontFaceSet API
    setTimeout(showPage, 1500);
  }
  // Safety timeout — show page after 3s no matter what
  setTimeout(showPage, 3000);
})();
</script>
</body></html>`;

    // ── Deliver via Blob URL for proper charset, fall back to document.write ──
    try {
      // Try Blob URL first — it handles charset correctly
      const blob = new Blob([html], { type: 'text/html; charset=UTF-8' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (win) {
        // Clean up the blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        app.showToast('تم فتح نافذة التصدير', 'success');
      } else {
        // Blob URL blocked — fall back to document.write
        URL.revokeObjectURL(blobUrl);
        const win2 = window.open('', '_blank');
        if (win2) {
          win2.document.open('text/html', 'replace');
          win2.document.write(html);
          win2.document.close();
          app.showToast('تم فتح نافذة التصدير', 'success');
        } else {
          // Last resort: replace current page
          document.open('text/html', 'replace');
          document.write(html);
          document.close();
        }
      }
    } catch (err) {
      console.error(err);
      app.showToast('حدث خطأ أثناء فتح النافذة', 'error');
    }
  }

  // ── Override exportResponsesPDF with mobile routing ──
  // On desktop: calls the original method from responses.js (unchanged)
  // On mobile: calls the same method but with compatible delivery
  window.App.exportResponsesPDF = function () {
    if (isMobileDevice()) {
      return exportResponsesPDFMobile();
    }
    return _originalExportPDF.call(this);
  };
})();
