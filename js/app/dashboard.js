// =============================================
// DASHBOARD & LANDING
// =============================================
Object.assign(window.App, {
  renderLandingStats() {
    const container = document.getElementById('landing-counters');
    if(!container) return;

    // Calculate real stats from actual data
    const totalForms = this.state.stats.totalFormsCreated || this.state.forms.length;
    const totalFields = this.state.forms.reduce((sum, f) => sum + f.fields.length, 0);
    const totalSubmissions = this.state.stats.totalSubmissions || 0;
    const activeForms = this.state.forms.filter(f => f.fields.length > 0).length;
    const fieldTypesCount = Object.keys(FIELD_TYPES).length;
    const governoratesCount = EGYPT_GOVERNORATES.length;

    const statsData = [
      { value: totalForms, suffix: '', icon: '📋', label: 'نموذج تم إنشاؤه' },
      { value: totalFields, suffix: '', icon: '📝', label: 'حقل تم إضافته' },
      { value: totalSubmissions, suffix: '', icon: '📤', label: 'رد تم إرساله' },
      { value: governoratesCount, suffix: '', icon: '🗺️', label: 'محافظة مدعومة' },
    ];

    container.innerHTML = statsData.map(stat => `
      <div class="counter-item reveal">
        <div class="counter-value" data-counter="${stat.value}" data-suffix="${stat.suffix}">${stat.icon}</div>
        <div class="counter-label">${stat.label}</div>
      </div>
    `).join('');
  },

    renderDashboard() {
    const grid = document.getElementById('forms-grid');


    // Folders UI
    const currentFolder = this.state.currentFolder || null;
    let foldersHtml = `
      <div style="display:flex; gap:10px; margin-bottom:20px; overflow-x:auto; padding-bottom:10px; border-bottom:1px solid var(--border);">
        <button class="btn ${currentFolder === null ? 'btn-primary' : 'btn-ghost'}" onclick="App.state.currentFolder=null; App.renderDashboard()">الكل</button>
        ${this.state.folders.map(f => `
          <button class="btn ${currentFolder === f.id ? 'btn-primary' : 'btn-ghost'}" onclick="App.state.currentFolder='${f.id}'; App.renderDashboard()">${this.escape(f.name)}</button>
        `).join('')}
        <button class="btn btn-ghost" onclick="App.createFolder()">+ مجلد جديد</button>
      </div>
    `;

    // Filter forms by folder
    const filteredForms = currentFolder 
      ? this.state.forms.filter(f => f.folderId === currentFolder)
      : this.state.forms;

    let html = foldersHtml + `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
        <h3 style="margin:0;">النماذج الخاصة بك</h3>
        <div style="display:flex; gap: 8px;">
          ${this.state.forms.length > 0 ? `<button class="btn btn-danger btn-sm" onclick="App.deleteAllForms()">🗑️ مسح الكل</button>` : ''}
        </div>
      </div>
    `;



    html += `<div class="forms-grid">`;
    filteredForms.forEach(form => {
      const date = new Date(form.createdAt).toLocaleDateString('ar-EG');
      const responsesCount = form.submissions ? form.submissions.length : 0;
      html += `
        <div class="form-card" onclick="App.navigate('builder', {formId: '${form.id}'})">
          <div class="form-card-actions">
            <button onclick="event.stopPropagation(); App.state.currentFormId='${form.id}'; App.openShareModal()" title="مشاركة الرابط">🔗</button>
            <button onclick="event.stopPropagation(); App.duplicateForm('${form.id}')" title="نسخ النموذج">📋</button>
            <button onclick="event.stopPropagation(); App.viewResponses('${form.id}')" title="الردود والتحليلات">📊</button>
            <button onclick="event.stopPropagation(); App.navigate('fill', {formId: '${form.id}'})" title="فتح النموذج">👁️</button>
            <button class="del-btn" onclick="event.stopPropagation(); App.deleteForm('${form.id}')" title="حذف">🗑️</button>
          </div>
          <div class="form-card-banner">📝</div>
          <div class="form-card-body">
            <div class="form-card-title">${this.escape(form.title)}</div>
            <div class="form-card-meta">
              <span>${form.fields.length} حقول · ${responsesCount} رد</span>
              <span>${date}</span>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    grid.innerHTML = html;


  },

  createFolder() {
    const modal = document.getElementById('folder-modal');
    const input = document.getElementById('folder-name-input');
    if(modal && input) {
      input.value = '';
      modal.style.display = 'flex';
      setTimeout(() => input.focus(), 100);
    }
  },

  confirmCreateFolder() {
    const input = document.getElementById('folder-name-input');
    if(!input) return;
    const name = input.value;
    if(name && name.trim()) {
      this.state.folders.push({ id: 'folder_' + Date.now(), name: name.trim() });
      this.save();
      this.renderDashboard();
      this.showToast('تم إنشاء المجلد بنجاح 📁', 'success');
      document.getElementById('folder-modal').style.display = 'none';
    }
  },



  filterForms(query) {
    const cards = document.querySelectorAll('.form-card');
    const q = query.trim().toLowerCase();
    cards.forEach(card => {
      const title = card.querySelector('.form-card-title');
      if(title) {
        card.style.display = (!q || title.textContent.toLowerCase().includes(q)) ? '' : 'none';
      }
    });
  },

  async createBlankForm() {
    if(!this.state.currentUser) return this.showToast('يجب تسجيل الدخول أولاً', 'error');

    const newForm = {
      user_id: this.state.currentUser.id,
      title: 'نموذج جديد',
      description: '',
      fields: [],
      settings: {
        themeColor: '#4f46e5',
        backgroundStyle: 'solid',
        logoBase64: '',
        thankYouMessage: 'شكراً لك، تم تسجيل ردك في قاعدة البيانات بنجاح.',
        redirectUrl: '',
        allowResubmit: true,
        darkModeEnabled: false
      }
    };

    try {
      const { data, error } = await supabaseClient.from('forms').insert([newForm]).select();
      if(error) throw error;
      
      const createdForm = data[0];
      this.state.forms.unshift(createdForm);
      this.state.stats.totalFormsCreated = (this.state.stats.totalFormsCreated || 0) + 1;
      this.navigate('builder', {formId: createdForm.id});
    } catch(err) {
      console.error(err);
      this.showToast('حدث خطأ أثناء إنشاء النموذج', 'error');
    }
  },



  async deleteForm(id) {
    if(confirm('هل أنت متأكد من حذف هذا النموذج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        const { error } = await supabaseClient.from('forms').delete().eq('id', id);
        if(error) throw error;
        
        this.state.forms = this.state.forms.filter(f => f.id !== id);
        this.renderDashboard();
        this.showToast('تم حذف النموذج بنجاح 🗑️', 'success');
      } catch(err) {
        console.error(err);
        this.showToast('حدث خطأ أثناء الحذف', 'error');
      }
    }
  },

  async deleteCurrentForm() {
    const formId = this.state.currentFormId;
    if(formId) {
      if(confirm('هل أنت متأكد من حذف هذا النموذج نهائياً؟')) {
        try {
          const { error } = await supabaseClient.from('forms').delete().eq('id', formId);
          if(error) throw error;
          
          this.state.forms = this.state.forms.filter(f => f.id !== formId);
          this.navigate('dashboard');
          this.showToast('تم حذف النموذج بنجاح 🗑️', 'success');
        } catch(err) {
          console.error(err);
          this.showToast('حدث خطأ أثناء الحذف', 'error');
        }
      }
    }
  },

  async deleteAllForms() {
    if(!this.state.currentUser) return;
    if(confirm('هل أنت متأكد من مسح جميع النماذج نهائياً؟ لا يمكن التراجع!')) {
      try {
        const { error } = await supabaseClient.from('forms').delete().eq('user_id', this.state.currentUser.id);
        if(error) throw error;
        
        this.state.forms = [];
        this.renderDashboard();
        this.showToast('تم حذف جميع النماذج 🗑️', 'success');
      } catch(err) {
        console.error(err);
        this.showToast('حدث خطأ أثناء مسح النماذج', 'error');
      }
    }
  },

  duplicateForm(id) {
    const form = this.state.forms.find(f => f.id === id);
    if(!form) return;
    const clone = JSON.parse(JSON.stringify(form));
    clone.id = 'frm_' + Date.now();
    clone.title = form.title + ' (نسخة)';
    clone.createdAt = new Date().toISOString();
    clone.submissions = []; // Don't copy submissions
    clone.views = 0;
    // Give all fields new IDs
    clone.fields = clone.fields.map(f => ({ ...f, id: 'fld_' + Date.now() + Math.floor(Math.random() * 10000) }));
    this.state.forms.unshift(clone);
    this.state.stats.totalFormsCreated = (this.state.stats.totalFormsCreated || 0) + 1;
    this.save();
    this.renderDashboard();
    this.showToast('تم نسخ النموذج بنجاح 📋', 'success');
  },

  
});
