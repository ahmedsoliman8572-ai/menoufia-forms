// =============================================
// CRM (CONTACTS) & GLOBAL INSIGHTS
// =============================================
Object.assign(window.App, {
  
  async loadContacts() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">جاري تحميل جهات الاتصال...</td></tr>';
    
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
            <td style="padding:12px; border:1px solid var(--border); text-align:center;">
              <button class="btn btn-danger btn-sm" onclick="App.deleteContact('${contact.id}')" title="مسح">🗑️</button>
            </td>
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
    const originalText = btn ? btn.innerHTML : 'تصدير Excel';
    if(btn) btn.innerHTML = 'جاري التصدير...';
    
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



  async deleteContact(id) {
    const isConfirmed = await App.confirm('هل أنت متأكد من مسح جهة الاتصال هذه؟');
    if(isConfirmed) {
      try {
        const { error } = await supabaseClient.from('contacts').delete().eq('id', id);
        if(error) throw error;
        
        this.showToast('تم مسح جهة الاتصال بنجاح', 'success');
        this.loadContacts();
      } catch(err) {
        console.error(err);
        this.showToast('حدث خطأ أثناء المسح', 'error');
      }
    }
  },

  async deleteAllContacts() {
    const isConfirmed = await App.confirm('هل أنت متأكد من مسح جميع جهات الاتصال؟ لا يمكن التراجع عن هذا الإجراء.');
    if(isConfirmed) {
      try {
        const { error } = await supabaseClient.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
        if(error) throw error;
        
        this.showToast('تم مسح جميع جهات الاتصال بنجاح', 'success');
        this.loadContacts();
      } catch(err) {
        console.error(err);
        this.showToast('حدث خطأ أثناء مسح جهات الاتصال', 'error');
      }
    }
  }

});
