// =============================================
// RESPONSES & CHARTS
// =============================================
Object.assign(window.App, {
viewResponses(formId) {
    if(formId) this.state.currentFormId = formId;
    this.navigate('responses');
  },

  setupResponsesRealtime(formId) {
    if(this.responsesSubscription) {
      supabaseClient.removeChannel(this.responsesSubscription);
    }
    this.responsesSubscription = supabaseClient
      .channel('public:responses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses', filter: `form_id=eq.${formId}` }, payload => {
        const form = this.getForm();
        if(form && form.id === formId) {
          form.submissions.unshift({ submittedAt: payload.new.submitted_at, data: payload.new.data });
          this.showToast('تم استلام رد جديد الآن!', 'success');
          this.renderResponses(true);
        }
      })
      .subscribe();
  },

  async loadMoreResponses() {
    const form = this.getForm();
    if(!form) return;
    const limit = 50;
    const offset = form.submissions ? form.submissions.length : 0;
    const btn = document.getElementById('btn-load-more-responses');
    if(btn) { btn.innerText = '⏳ جاري التحميل...'; btn.disabled = true; }
    
    try {
      const { data, error } = await supabaseClient.from('responses').select('*').eq('form_id', form.id).order('submitted_at', { ascending: false }).range(offset, offset + limit - 1);
      if (error) throw error;
      
      const newSubmissions = data.map(row => ({ submittedAt: row.submitted_at, data: row.data }));
      form.submissions = (form.submissions || []).concat(newSubmissions);
      this.renderResponses(true);
    } catch(e) {
      console.error(e);
      if(this.showToast) this.showToast('حدث خطأ أثناء تحميل المزيد', 'error');
    } finally {
      if(btn) { btn.innerText = 'تحميل المزيد'; btn.disabled = false; }
    }
  },

  async renderResponses(skipFetch = false) {
    const form = this.getForm();
    if(!form) return this.navigate('dashboard');

    if(!skipFetch) {
      this.setupResponsesRealtime(form.id);
    }

    const thead = document.getElementById('responses-table-head');
    const tbody = document.getElementById('responses-table-body');
    
    if(!skipFetch) {
      document.getElementById('responses-count-val').innerText = '...';
      tbody.innerHTML = `<tr><td colspan="10" style="padding:40px; text-align:center; color:var(--primary); font-size:1.2rem;">⏳ جاري جلب الردود من السحابة...</td></tr>`;
    }

    let submissions = form.submissions || [];
    const limit = 50;
    if(!skipFetch) {
      try {
        const { data, error, count } = await supabaseClient.from('responses').select('*', { count: 'exact' }).eq('form_id', form.id).order('submitted_at', { ascending: false }).range(0, limit - 1);
        if (error) throw error;
        
        submissions = data.map(row => {
          return { submittedAt: row.submitted_at, data: row.data };
        });
        form.submissions = submissions;
        form.responsesCount = count || submissions.length;
      } catch(e) {
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

    if(submissions.length === 0) {
      thead.innerHTML = '';
      tbody.innerHTML = `<tr><td style="padding:40px; text-align:center; color:var(--text-tertiary);">لا توجد ردود حتى الآن</td></tr>`;
      document.getElementById('responses-charts').innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-tertiary);">لا توجد بيانات كافية للتحليل</div>`;
      return;
    }

    this.renderCharts(form, submissions);

    // Build headers
    let thHtml = `<tr style="background:var(--bg-tertiary);"><th style="padding:12px; border:1px solid var(--border);">تاريخ الإرسال</th>`;
    form.fields.forEach(f => {
      if(f.type !== 'section_break') {
        thHtml += `<th style="padding:12px; border:1px solid var(--border); white-space:nowrap;">${this.escape(f.label)}</th>`;
      }
    });
    thHtml += `</tr>`;
    thead.innerHTML = thHtml;

    // Build rows
    let tbHtml = '';
    submissions.forEach(sub => {
      const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : '-';
      tbHtml += `<tr><td style="padding:10px; border:1px solid var(--border); white-space:nowrap;">${dateStr}</td>`;
      form.fields.forEach(f => {
        if(f.type !== 'section_break') {
          let val = sub.data[f.label] || '-';
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
  },

  renderCharts(form, submissions) {
    const chartsContainer = document.getElementById('responses-charts');
    chartsContainer.innerHTML = ''; // Clear previous charts
    
    // Destroy existing Chart instances to prevent memory leaks and hover glitches
    if(window.responseCharts) {
      window.responseCharts.forEach(c => c.destroy());
    }
    window.responseCharts = [];

    const chartableTypes = ['multiple_choice', 'checkboxes', 'dropdown', 'linear_scale'];
    const fieldsToChart = form.fields.filter(f => chartableTypes.includes(f.type));

    if(fieldsToChart.length === 0) {
      chartsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-tertiary);">لا توجد أسئلة قابلة للتحليل البياني (مثل الاختيارات أو التقييم)</div>`;
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
        if(val) {
          if(field.type === 'checkboxes' && Array.isArray(val)) {
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

      if(totalAnswers === 0) {
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
      if(field.type === 'checkboxes' || field.type === 'linear_scale') type = 'bar';
      if(field.type === 'dropdown') type = 'doughnut';

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

  exportResponsesExcel() {
    const btn = document.querySelector('#page-responses .builder-toolbar .btn-ghost');
    const originalText = btn ? btn.innerHTML : '📊 تصدير Excel';
    if(btn) btn.innerHTML = '⏳ جاري التصدير...';

    const form = this.getForm();
    if(!form || !form.submissions || form.submissions.length === 0) {
      this.showToast('لا توجد ردود لتصديرها', 'error');
      if(btn) btn.innerHTML = originalText;
      return;
    }

    if(typeof XLSX === 'undefined') {
      this.showToast('مكتبة التصدير غير محملة', 'error');
      return;
    }

    // Prepare data
    const data = [];
    
    // Headers
    const headers = ['تاريخ الإرسال'];
    form.fields.forEach(f => { 
      if(f.type !== 'section_break') headers.push(f.label); 
    });
    data.push(headers);

    // Rows
    form.submissions.forEach(sub => {
      const row = [sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : ''];
      form.fields.forEach(f => {
        if(f.type !== 'section_break') {
          let val = sub.data[f.label] || '';
          if(typeof val === 'string' && val.startsWith('data:image')) {
            val = '[صورة مرفقة - غير مدعوم في الإكسيل]';
          } else if(typeof val === 'string' && val.startsWith('http')) {
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
    if(btn) btn.innerHTML = originalText;
  }
});
