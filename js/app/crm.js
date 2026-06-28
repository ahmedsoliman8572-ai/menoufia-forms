// =============================================
// CRM (CONTACTS) & GLOBAL INSIGHTS
// =============================================
Object.assign(window.App, {
  
  async loadContacts() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">⏳ جاري تحميل جهات الاتصال...</td></tr>';
    
    try {
      const { data, error } = await supabaseClient
        .from('contacts')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) throw error;

      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-tertiary);">لا توجد جهات اتصال حتى الآن.</td></tr>';
        return;
      }

      let html = '';
      data.forEach(contact => {
        const dateStr = contact.updated_at ? new Date(contact.updated_at).toLocaleDateString('ar-EG') : '-';
        html += `
          <tr>
            <td style="padding:12px; border:1px solid var(--border);">${this.escape(contact.name || '-')}</td>
            <td style="padding:12px; border:1px solid var(--border);">${this.escape(contact.email || '-')}</td>
            <td style="padding:12px; border:1px solid var(--border);">${this.escape(contact.phone || '-')}</td>
            <td style="padding:12px; border:1px solid var(--border);">${dateStr}</td>
          </tr>
        `;
      });
      
      tbody.innerHTML = html;

    } catch (e) {
      console.error('Error loading contacts:', e);
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--danger);">حدث خطأ أثناء جلب البيانات. يرجى التأكد من إنشاء الجدول في قاعدة البيانات.</td></tr>';
    }
  },

  exportContactsExcel() {
    const btn = document.querySelector('#page-contacts .builder-toolbar .btn-primary');
    const originalText = btn ? btn.innerHTML : '📊 تصدير Excel';
    if(btn) btn.innerHTML = '⏳ جاري التصدير...';
    
    this.showToast('سيتم تحميل الملف قريباً...', 'info');
    setTimeout(() => {
      const table = document.querySelector('#page-contacts table');
      if(!table) {
        if(btn) btn.innerHTML = originalText;
        return;
      }
      let csv = [];
      const rows = table.querySelectorAll('tr');
      for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length; j++) 
          row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
        csv.push(row.join(','));
      }
      this.downloadCSV(csv.join('\n'), `Contacts_${new Date().toISOString().split('T')[0]}.csv`);
      if(btn) btn.innerHTML = originalText;
    }, 800);
  },

  async loadInsights() {
    const resCountEl = document.getElementById('global-responses-count');
    const contCountEl = document.getElementById('global-contacts-count');
    const chartsContainer = document.getElementById('insights-charts');
    
    if(resCountEl) resCountEl.innerText = '⏳...';
    if(contCountEl) contCountEl.innerText = '⏳...';
    if(chartsContainer) chartsContainer.innerHTML = '';
    
    try {
      // 1. Get Responses Count (approximate via all forms stats if exact count is heavy)
      let totalResponses = 0;
      if (this.state.forms && this.state.forms.length > 0) {
        totalResponses = this.state.forms.reduce((sum, f) => sum + (f.responses_count || 0), 0);
      }
      if(resCountEl) resCountEl.innerText = totalResponses;
      
      // 2. Get Contacts Count
      const { count, error } = await supabaseClient
        .from('contacts')
        .select('*', { count: 'exact', head: true });
        
      if (!error && contCountEl) {
        contCountEl.innerText = count || 0;
      } else if (error) {
        console.error('Error getting contacts count:', error);
        if(contCountEl) contCountEl.innerText = 'خطأ بالجدول';
      }

      // 3. Render some basic charts
      if (this.state.forms && this.state.forms.length > 0 && chartsContainer) {
        const topForms = [...this.state.forms].sort((a,b) => (b.responses_count||0) - (a.responses_count||0)).slice(0, 5);
        
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `<h3 style="text-align:center; margin-bottom:15px;">أكثر النماذج تفاعلاً (Top 5)</h3>
                          <div style="position:relative; width:100%; height:300px;"><canvas id="chart-top-forms"></canvas></div>`;
        chartsContainer.appendChild(card);
        
        const ctx = document.getElementById('chart-top-forms').getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: topForms.map(f => f.title || 'بدون عنوان'),
            datasets: [{
              label: 'عدد الردود',
              data: topForms.map(f => f.responses_count || 0),
              backgroundColor: '#4f46e5',
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
          }
        });
      }

    } catch(e) {
      console.error('Error loading insights:', e);
    }
  }

});
