// =============================================
// RESPONSES & CHARTS
// =============================================
Object.assign(window.App, {
  viewResponses(formId) {
    if (formId) this.state.currentFormId = formId;
    this.navigate('responses');
  },

  setupResponsesRealtime(formId) {
    if (this.responsesSubscription) {
      supabaseClient.removeChannel(this.responsesSubscription);
    }
    this.responsesSubscription = supabaseClient
      .channel('public:responses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses', filter: `form_id=eq.${formId}` }, payload => {
        const form = this.getForm();
        if (form && form.id === formId) {
          form.submissions.unshift({ submittedAt: payload.new.submitted_at, data: payload.new.data });
          this.showToast('تم استلام رد جديد الآن!', 'success');
          this.renderResponses(true);
        }
      })
      .subscribe();
  },

  async loadMoreResponses() {
    const form = this.getForm();
    if (!form) return;
    const limit = 50;
    const offset = form.submissions ? form.submissions.length : 0;
    const btn = document.getElementById('btn-load-more-responses');
    if (btn) { btn.innerText = 'جاري التحميل...'; btn.disabled = true; }

    try {
      const { data, error } = await supabaseClient.from('responses').select('*').eq('form_id', form.id).order('submitted_at', { ascending: false }).range(offset, offset + limit - 1);
      if (error) throw error;

      const newSubmissions = data.map(row => ({ submittedAt: row.submitted_at, data: row.data }));
      form.submissions = (form.submissions || []).concat(newSubmissions);
      this.renderResponses(true);
    } catch (e) {
      console.error(e);
      if (this.showToast) this.showToast('حدث خطأ أثناء تحميل المزيد', 'error');
    } finally {
      if (btn) { btn.innerText = 'تحميل المزيد'; btn.disabled = false; }
    }
  },

  async renderResponses(skipFetch = false) {
    const form = this.getForm();
    if (!form) return this.navigate('dashboard');

    if (!skipFetch) {
      this.setupResponsesRealtime(form.id);
    }

    const thead = document.getElementById('responses-table-head');
    const tbody = document.getElementById('responses-table-body');

    if (!skipFetch) {
      document.getElementById('responses-count-val').innerText = '...';
      tbody.innerHTML = `<tr><td colspan="10" style="padding:40px; text-align:center; color:var(--primary); font-size:1.2rem;">جاري جلب الردود من السحابة...</td></tr>`;
    }

    let submissions = form.submissions || [];
    const limit = 50;
    if (!skipFetch) {
      try {
        const { data, error, count } = await supabaseClient.from('responses').select('*', { count: 'exact' }).eq('form_id', form.id).order('submitted_at', { ascending: false }).range(0, limit - 1);
        if (error) throw error;

        submissions = data.map(row => {
          return { submittedAt: row.submitted_at, data: row.data };
        });
        form.submissions = submissions;
        form.responsesCount = count || submissions.length;
      } catch (e) {
        console.error('Failed to fetch responses', e);
        submissions = form.submissions || [];
        form.responsesCount = submissions.length;
      }
    }

    document.getElementById('responses-count-val').innerText = form.responsesCount || submissions.length;

    const loadMoreContainer = document.getElementById('load-more-container');
    if (loadMoreContainer) {
      if (form.submissions && form.responsesCount && form.submissions.length < form.responsesCount) {
        loadMoreContainer.style.display = 'block';
      } else {
        loadMoreContainer.style.display = 'none';
      }
    }

    if (submissions.length === 0) {
      thead.innerHTML = '';
      tbody.innerHTML = `<tr><td style="padding:0; border:none;"><div class="empty-state" style="text-align:center; padding:60px 20px; background:var(--bg-card); border-radius:var(--radius-lg); border:1px dashed var(--border); margin:20px 0;"><div style="font-size:50px; margin-bottom:15px; animation: float 3s ease-in-out infinite;">📬</div><h3 style="margin-bottom:10px; color:var(--text);">لا توجد ردود بعد</h3><p style="color:var(--text-secondary); margin:0;">شارك رابط النموذج لتبدأ في جمع الردود وسيتم عرضها هنا مباشرة.</p></div></td></tr>`;
      document.getElementById('responses-charts').innerHTML = `<div class="empty-state" style="grid-column:1/-1; text-align:center; padding:60px 20px; background:var(--bg-card); border-radius:var(--radius-lg); border:1px dashed var(--border);"><div style="font-size:50px; margin-bottom:15px; animation: float 3s ease-in-out infinite; animation-delay: 0.5s;">📊</div><h3 style="margin-bottom:10px; color:var(--text);">التحليلات غير متوفرة</h3><p style="color:var(--text-secondary); margin:0;">لا توجد بيانات كافية لإنشاء الرسوم البيانية. انتظر حتى تتلقى بعض الردود.</p></div>`;
      return;
    }

    this.renderCharts(form, submissions);

    // Build headers
    let thHtml = `<tr style="background:var(--bg-tertiary);"><th style="padding:12px; border:1px solid var(--border);">تاريخ الإرسال</th>`;
    if (form.enableTicketing) {
      thHtml += `<th style="padding:12px; border:1px solid var(--border); white-space:nowrap;">حالة الحضور</th>`;
    }
    form.fields.forEach(f => {
      if (f.type !== 'section_break') {
        thHtml += `<th style="padding:12px; border:1px solid var(--border); white-space:nowrap;">${this.escape(f.label)}</th>`;
      }
    });
    thHtml += `</tr>`;
    thead.innerHTML = thHtml;

    // Build rows
    let tbHtml = '';
    let attendedCount = 0;
    submissions.forEach(sub => {
      const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : '-';
      tbHtml += `<tr><td style="padding:10px; border:1px solid var(--border); white-space:nowrap;">${dateStr}</td>`;

      if (form.enableTicketing) {
        const attended = sub.data._checked_in === true || sub.data._checked_in === 'true';
        if (attended) attendedCount++;
        const badge = attended
          ? `<span style="background:rgba(16, 185, 129, 0.15); color:#10b981; padding:4px 8px; border-radius:12px; font-size:0.85rem; font-weight:bold;">✅ حضر</span>`
          : `<span style="background:rgba(100, 116, 139, 0.15); color:#64748b; padding:4px 8px; border-radius:12px; font-size:0.85rem; font-weight:bold;">⏳ لم يحضر</span>`;
        tbHtml += `<td style="padding:10px; border:1px solid var(--border); text-align:center;">${badge}</td>`;
      }

      form.fields.forEach(f => {
        if (f.type !== 'section_break') {
          let val = sub.data[f.label];
          // skip internal keys
          if (val === undefined) val = '-';
          if ((f.type === 'file_upload' || f.type === 'signature') && typeof val === 'string' && (val.startsWith('data:image') || val.startsWith('http'))) {
            tbHtml += `<td style="padding:10px; border:1px solid var(--border); text-align:center;"><a href="${val}" target="_blank" title="عرض الصورة بالحجم الكامل"><img src="${val}" style="max-width:80px; max-height:80px; border-radius:6px; box-shadow:var(--shadow-sm); transition:transform 0.2s;"></a></td>`;
          } else {
            tbHtml += `<td style="padding:10px; border:1px solid var(--border);">${this.escape(val)}</td>`;
          }
        }
      });
      tbHtml += `</tr>`;
    });
    tbody.innerHTML = tbHtml;

    // Attendance Summary Widget
    const attendanceSummaryContainer = document.getElementById('attendance-summary');
    if (form.enableTicketing && attendanceSummaryContainer) {
      const total = submissions.length;
      const percentage = total > 0 ? Math.round((attendedCount / total) * 100) : 0;
      attendanceSummaryContainer.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:20px; justify-content:space-between; align-items:center; background:var(--bg-card); padding:20px; border-radius:12px; border:1px solid var(--border); margin-bottom:20px;">
          <div style="min-width: 200px;">
            <h3 style="margin:0 0 5px 0; font-size:1.1rem;">إحصائيات الحضور</h3>
            <p style="margin:0; color:var(--text-tertiary); font-size:0.9rem;">بناءً على التذاكر التي تم مسحها</p>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:20px; text-align:center; justify-content:center; flex:1;">
            <div style="min-width: 80px;">
              <div style="font-size:1.8rem; font-weight:bold; color:var(--primary);">${total}</div>
              <div style="font-size:0.8rem; color:var(--text-secondary);">إجمالي المسجلين</div>
            </div>
            <div style="min-width: 80px;">
              <div style="font-size:1.8rem; font-weight:bold; color:#10B981;">${attendedCount}</div>
              <div style="font-size:0.8rem; color:var(--text-secondary);">عدد الحضور</div>
            </div>
            <div style="min-width: 80px;">
              <div style="font-size:1.8rem; font-weight:bold; color:#F59E0B;">${percentage}%</div>
              <div style="font-size:0.8rem; color:var(--text-secondary);">نسبة الحضور</div>
            </div>
          </div>
        </div>
      `;
      attendanceSummaryContainer.style.display = 'block';
    } else if (attendanceSummaryContainer) {
      attendanceSummaryContainer.style.display = 'none';
      attendanceSummaryContainer.innerHTML = '';
    }
  },

  async renderCharts(form, submissions) {
    const chartsContainer = document.getElementById('responses-charts');
    chartsContainer.innerHTML = ''; // Clear previous charts

    // Lazy load Chart.js if needed
    if (typeof Chart === 'undefined') {
      chartsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">جاري تحميل الرسوم البيانية...</div>';
      await App.loadScript('https://cdn.jsdelivr.net/npm/chart.js');
      chartsContainer.innerHTML = '';
    }

    // Destroy existing Chart instances to prevent memory leaks and hover glitches
    if (window.responseCharts) {
      window.responseCharts.forEach(c => c.destroy());
    }
    window.responseCharts = [];

    const chartableTypes = ['single_choice', 'multiple_choice', 'dropdown', 'linear_scale', 'rating'];
    const fieldsToChart = form.fields.filter(f => chartableTypes.includes(f.type) || chartableTypes.includes(f.originalType));

    // Time Statistics Chart (Timeline)
    if (submissions.length > 0) {
      const timeCard = document.createElement('div');
      timeCard.className = 'stat-card';
      timeCard.style.gridColumn = '1 / -1'; // Span full width
      timeCard.style.display = 'flex';
      timeCard.style.flexDirection = 'column';
      timeCard.style.alignItems = 'center';

      const timeTitle = document.createElement('h3');
      timeTitle.innerText = 'إحصائيات الردود بمرور الوقت';
      timeTitle.style.marginBottom = '15px';
      timeTitle.style.width = '100%';
      timeTitle.style.textAlign = 'right';
      timeCard.appendChild(timeTitle);

      const timeCanvasWrapper = document.createElement('div');
      timeCanvasWrapper.style.position = 'relative';
      timeCanvasWrapper.style.width = '100%';
      timeCanvasWrapper.style.height = '300px';

      const timeCanvas = document.createElement('canvas');
      timeCanvas.id = 'chart-timeline';
      timeCanvasWrapper.appendChild(timeCanvas);
      timeCard.appendChild(timeCanvasWrapper);

      chartsContainer.appendChild(timeCard);

      // Aggregate data by date
      const dateCounts = {};
      submissions.forEach(sub => {
        const dateStr = new Date(sub.submittedAt).toLocaleDateString('en-CA'); // YYYY-MM-DD format
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      });

      // Sort dates
      const sortedDates = Object.keys(dateCounts).sort();
      const labels = sortedDates.map(d => new Date(d).toLocaleDateString('ar-EG'));
      const dataPoints = sortedDates.map(d => dateCounts[d]);

      const ctx = timeCanvas.getContext('2d');
      const timeChart = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'عدد الردود',
            data: dataPoints,
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: 'rgba(99, 102, 241, 1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
      window.responseCharts.push(timeChart);
    }

    if (fieldsToChart.length === 0) {
      const msg = document.createElement('div');
      msg.style.gridColumn = '1/-1';
      msg.style.textAlign = 'center';
      msg.style.padding = '20px';
      msg.style.color = 'var(--text-tertiary)';
      msg.innerText = 'لا توجد أسئلة أخرى قابلة للتحليل البياني (مثل الاختيارات أو التقييم)';
      chartsContainer.appendChild(msg);
      return;
    }

    fieldsToChart.forEach((field, index) => {
      // Create card
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.alignItems = 'center';

      const title = document.createElement('h3');
      title.innerText = field.label;
      title.style.marginBottom = '15px';
      title.style.width = '100%';
      title.style.textAlign = 'right';
      card.appendChild(title);

      const canvasWrapper = document.createElement('div');
      canvasWrapper.style.position = 'relative';
      canvasWrapper.style.width = '100%';
      // For mobile responsiveness, ensure it has a min-height
      canvasWrapper.style.minHeight = '250px';

      const canvas = document.createElement('canvas');
      canvas.id = `chart-${field.id || index}`;
      canvasWrapper.appendChild(canvas);
      card.appendChild(canvasWrapper);

      chartsContainer.appendChild(card);

      // Aggregate data
      const counts = {};
      let totalAnswers = 0;

      submissions.forEach(sub => {
        let val = sub.data[field.label];
        if (val) {
          if (field.type === 'multiple_choice' && Array.isArray(val)) {
            val.forEach(v => {
              counts[v] = (counts[v] || 0) + 1;
              totalAnswers++;
            });
          } else {
            counts[val] = (counts[val] || 0) + 1;
            totalAnswers++;
          }
        }
      });

      if (totalAnswers === 0) {
        canvasWrapper.innerHTML = `<p style="text-align:center; color:var(--text-tertiary); margin-top:50px;">لا توجد إجابات بعد</p>`;
        return;
      }

      const labels = Object.keys(counts);
      const data = Object.values(counts);

      const colors = [
        '#4f46e5', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'
      ];

      let type = 'pie';
      if (field.type === 'multiple_choice' || field.type === 'linear_scale') type = 'bar';
      if (field.type === 'dropdown') type = 'doughnut';

      const ctx = canvas.getContext('2d');
      const newChart = new Chart(ctx, {
        type: type,
        data: {
          labels: labels,
          datasets: [{
            label: 'عدد الردود',
            data: data,
            backgroundColor: type === 'bar' ? '#4f46e5' : colors,
            borderRadius: type === 'bar' ? 4 : 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: type === 'bar' ? 'none' : 'bottom',
              labels: { font: { family: 'Tajawal' } }
            }
          },
          scales: type === 'bar' ? {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          } : {}
        }
      });
      window.responseCharts.push(newChart);
    });
  },

  async exportResponsesExcel() {
    const btn = document.querySelector('#page-responses .builder-toolbar .btn-ghost');
    const originalText = btn ? btn.innerHTML : 'تصدير Excel';
    if (btn) btn.innerHTML = 'جاري التصدير...';

    const form = this.getForm();
    if (!form || !form.submissions || form.submissions.length === 0) {
      this.showToast('لا توجد ردود لتصديرها', 'error');
      if (btn) btn.innerHTML = originalText;
      return;
    }

    // Lazy load XLSX if needed
    if (typeof XLSX === 'undefined') {
      try {
        await App.loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      } catch (e) {
        this.showToast('فشل تحميل مكتبة التصدير', 'error');
        if (btn) btn.innerHTML = originalText;
        return;
      }
    }

    // Prepare data
    const data = [];

    // Headers
    const headers = ['تاريخ الإرسال'];
    if (form.enableTicketing) {
      headers.push('حالة الحضور');
    }
    form.fields.forEach(f => {
      if (f.type !== 'section_break') headers.push(f.label);
    });
    data.push(headers);

    // Rows
    form.submissions.forEach(sub => {
      const row = [sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : ''];

      if (form.enableTicketing) {
        const attended = sub.data._checked_in === true || sub.data._checked_in === 'true';
        row.push(attended ? 'حضر' : 'لم يحضر');
      }

      form.fields.forEach(f => {
        if (f.type !== 'section_break') {
          let val = sub.data[f.label] || '';
          if (typeof val === 'string' && val.startsWith('data:image')) {
            val = '[صورة مرفقة - غير مدعوم في الإكسيل]';
          } else if (typeof val === 'string' && val.startsWith('http')) {
            // Leave it as a URL so it's clickable in Excel
          }
          row.push(val);
        }
      });
      data.push(row);
    });

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!dir'] = 'rtl'; // Right to left sheet

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الردود");

    // Download
    XLSX.writeFile(wb, `responses_${form.title.replace(/\s+/g, '_')}.xlsx`);
    if (btn) btn.innerHTML = originalText;
  },

  filterResponses(query) {
    const tbody = document.getElementById('responses-table-body');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    const q = query.toLowerCase().trim();

    let visibleCount = 0;
    rows.forEach(row => {
      if (row.querySelector('.empty-state')) return;

      // Use textContent instead of innerText for much better performance
      const text = row.textContent.toLowerCase();
      if (!q || text.includes(q)) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    // Update the count summary if available
    const countVal = document.getElementById('responses-count-val');
    if (countVal && q) {
      countVal.innerText = `${visibleCount} (مطابق للبحث)`;
    } else if (countVal && !q) {
      const form = this.getForm();
      countVal.innerText = form ? (form.responsesCount || form.submissions?.length || 0) : visibleCount;
    }
  },

  async exportResponsesPDF() {
    const form = this.getForm();
    if (!form || !form.submissions || form.submissions.length === 0) {
      this.showToast('لا توجد ردود لتصديرها', 'error');
      return;
    }

    // Build a complete standalone HTML page for printing
    let html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1024">
  <title>تقرير ردود - ${this.escape(form.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Tajawal', 'Segoe UI', Arial, sans-serif;
      direction: rtl;
      background: #fff;
      color: #1a1a2e;
      padding: 30px;
      min-width: 1024px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
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
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center; margin-bottom:20px; padding:15px; background:#f0f0ff; border-radius:12px;">
    <p style="margin-bottom:10px; font-weight:700; color:#4f46e5;">اضغط Ctrl+P ثم اختر "Save as PDF" أو "حفظ كـ PDF" للتصدير</p>
    <button onclick="window.print()" style="padding:10px 30px; background:#4f46e5; color:#fff; border:none; border-radius:8px; font-family:Tajawal; font-size:1rem; font-weight:700; cursor:pointer;">🖨️ طباعة / تصدير PDF</button>
  </div>

  <div class="report-header">
    <h1>${this.escape(form.title)}</h1>
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
        html += `<th>${this.escape(f.label)}</th>`;
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
            html += `<td>${this.escape(val)}</td>`;
          }
        }
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    html += `<div class="footer">تم إنشاء هذا التقرير بواسطة Menoufia Forms | ${new Date().toLocaleString('ar-EG')}</div>`;

    // Auto-print script for mobile convenience
    html += `
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 500);
      };
    </script>
    </body></html>`;

    // Open via Blob URL which is much more reliable on mobile webviews than window.open('')
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 10000);
      this.showToast('تم فتح نافذة التصدير', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('حدث خطأ أثناء فتح النافذة', 'error');
    }
  }
});
