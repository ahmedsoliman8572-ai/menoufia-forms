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

    // Remove old overlay if it exists
    let oldOverlay = document.getElementById('pdf-preview-overlay');
    if (oldOverlay) oldOverlay.remove();

    // Create a full-screen overlay for previewing
    const overlay = document.createElement('div');
    overlay.id = 'pdf-preview-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#f8fafc; z-index:999999; overflow-y:auto; direction:rtl; font-family:"Tajawal", "Segoe UI", Arial, sans-serif;';

    // Top Action Bar
    const actionBar = document.createElement('div');
    actionBar.className = 'no-print';
    actionBar.style.cssText = 'position:sticky; top:0; background:#fff; padding:15px 20px; box-shadow:0 2px 10px rgba(0,0,0,0.1); display:flex; justify-content:space-between; align-items:center; z-index:10; flex-wrap: wrap; gap: 10px;';
    
    actionBar.innerHTML = `
      <h3 style="margin:0; color:#4f46e5; font-weight:800; font-size:1.2rem;">معاينة التقرير للطباعة</h3>
      <div style="display:flex; gap:10px;">
        <button id="btn-close-preview" style="padding:8px 15px; background:#e2e8f0; color:#475569; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-family:inherit;">إغلاق المعاينة</button>
        <button id="btn-download-pdf" style="padding:8px 15px; background:#4f46e5; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-family:inherit; display:flex; align-items:center; gap:5px;">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          تنزيل التقرير PDF
        </button>
      </div>
    `;

    // Content Container (This is exactly what will be converted to PDF)
    const content = document.createElement('div');
    content.id = 'pdf-content-wrapper';
    // min-width: 900px ensures it stays wide and beautiful on mobile, users can just scroll horizontally
    content.style.cssText = 'padding:30px; background:#fff; margin:20px auto; box-shadow:0 5px 15px rgba(0,0,0,0.05); min-width:900px; max-width:1200px; border-radius:8px;'; 

    let html = `
      <style>
        .pdf-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.85rem; }
        .pdf-table th { background: #4f46e5; color: #fff; padding: 10px; font-weight: bold; border: 1px solid #ddd; text-align: center; white-space:nowrap; }
        .pdf-table td { padding: 8px; border: 1px solid #ddd; text-align: right; vertical-align: middle; }
        .pdf-table tr:nth-child(even) { background: #f9fafb; }
        .badge-yes { background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 12px; font-weight: bold; font-size: 0.8rem; display:inline-block; }
        .badge-no { background: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 12px; font-weight: bold; font-size: 0.8rem; display:inline-block; }
      </style>
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #4f46e5;">
        <h1 style="font-size: 1.8rem; font-weight: 800; color: #4f46e5; margin-bottom: 8px; font-family:'Tajawal', sans-serif;">${this.escape(form.title)}</h1>
        <div style="font-size: 0.9rem; color: #666; display:flex; justify-content:center; gap:15px; flex-wrap:wrap; margin-top:10px;">
          <span style="padding:4px 12px; background:#f0f0ff; border-radius:20px; font-weight:700; color:#4f46e5;">إجمالي الردود: ${form.submissions.length}</span>
          <span style="padding:4px 12px; background:#f0f0ff; border-radius:20px; font-weight:700; color:#4f46e5;">تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}</span>
        </div>
      </div>
    `;

    // Charts
    const canvases = document.getElementById('page-responses').querySelectorAll('canvas');
    if (canvases.length > 0) {
      html += `<div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; margin-bottom: 25px;">`;
      canvases.forEach(canvas => {
        try {
          html += `<img src="${canvas.toDataURL('image/png')}" style="max-width: 48%; max-height: 250px; object-fit: contain; border: 1px solid #eee; border-radius: 8px;">`;
        } catch (e) { }
      });
      html += `</div>`;
    }

    // Table
    html += `<table class="pdf-table"><thead><tr>`;
    html += `<th style="width: 40px;">#</th><th>تاريخ الإرسال</th>`;
    if (form.enableTicketing) html += `<th>الحضور</th>`;
    form.fields.forEach(f => {
      if (f.type !== 'section_break') html += `<th>${this.escape(f.label)}</th>`;
    });
    html += `</tr></thead><tbody>`;

    form.submissions.forEach((sub, idx) => {
      html += `<tr>`;
      html += `<td style="text-align:center; font-weight:bold; color:#4f46e5;">${idx + 1}</td>`;
      html += `<td style="white-space:nowrap; direction:ltr; text-align:right;">${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : '-'}</td>`;

      if (form.enableTicketing) {
        const attended = sub.data._checked_in === true || sub.data._checked_in === 'true';
        html += `<td style="text-align:center;"><span class="${attended ? 'badge-yes' : 'badge-no'}">${attended ? '✅ حضر' : '⏳ لم يحضر'}</span></td>`;
      }

      form.fields.forEach(f => {
        if (f.type !== 'section_break') {
          let val = sub.data[f.label];
          if (val === undefined || val === null) val = '-';
          if ((f.type === 'file_upload' || f.type === 'signature') && typeof val === 'string' && (val.startsWith('data:image') || val.startsWith('http'))) {
            html += `<td style="text-align:center;"><img src="${val}" style="max-width:60px; max-height:60px; border-radius:4px; display:block; margin:0 auto;"></td>`;
          } else {
            html += `<td>${this.escape(val)}</td>`;
          }
        }
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    html += `<div style="margin-top: 30px; text-align: center; font-size: 0.75rem; color: #999; border-top: 1px solid #eee; padding-top: 15px;">تم إنشاء هذا التقرير بواسطة Menoufia Forms | ${new Date().toLocaleString('ar-EG')}</div>`;

    content.innerHTML = html;
    overlay.appendChild(actionBar);
    
    // Add an outer scroll wrapper so mobile users can pan horizontally to see the beautiful wide table
    const scrollWrapper = document.createElement('div');
    scrollWrapper.style.cssText = 'width:100%; height:calc(100% - 70px); overflow:auto; padding:10px; box-sizing:border-box;';
    scrollWrapper.appendChild(content);
    overlay.appendChild(scrollWrapper);

    document.body.appendChild(overlay);

    // Event Listeners for Overlay
    document.getElementById('btn-close-preview').addEventListener('click', () => {
      overlay.remove();
    });

    document.getElementById('btn-download-pdf').addEventListener('click', async () => {
      const btn = document.getElementById('btn-download-pdf');
      const originalText = btn.innerHTML;
      btn.innerHTML = 'جاري التحضير...';
      btn.disabled = true;

      try {
        if (!window.html2pdf) {
          await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
        }
        
        const opt = {
          margin:       10,
          filename:     `تقرير_ردود_${form.title.replace(/\s+/g, '_')}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, letterRendering: true, windowWidth: 1200 }, // Forces desktop width capture
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak:    { mode: ['css', 'legacy'] }
        };

        // Convert exactly what the user sees in the content box
        await window.html2pdf().set(opt).from(content).save();
        this.showToast('تم التنزيل بنجاح ✅', 'success');
      } catch (e) {
        console.error('PDF Error:', e);
        this.showToast('حدث خطأ أثناء التنزيل', 'error');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });
  }
});
