// =============================================
// DASHBOARD & LANDING
// =============================================
Object.assign(window.App, {
  renderLandingStats() {
    const container = document.getElementById('landing-counters');
    if(!container) return;

    // Calculate real stats from actual data
    const totalForms = this.state.stats.totalFormsCreated || this.state.forms.length;
    const totalFields = this.state.forms.reduce((sum, f) => sum + (f.fields?.length || 0), 0);
    const totalSubmissions = this.state.stats.totalSubmissions || 0;
    const activeForms = this.state.forms.filter(f => (f.fields?.length || 0) > 0).length;
    const fieldTypesCount = Object.keys(FIELD_TYPES).length;
    const governoratesCount = EGYPT_GOVERNORATES.length;

    const statsData = [
      { value: totalForms, suffix: '', icon: '', label: 'نموذج تم إنشاؤه' },
      { value: totalFields, suffix: '', icon: '', label: 'حقل تم إضافته' },
      { value: totalSubmissions, suffix: '', icon: '', label: 'رد تم إرساله' },
      { value: governoratesCount, suffix: '', icon: '️', label: 'محافظة مدعومة' },
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

    if (!this.state.forms || this.state.forms.length === 0) {
      grid.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
        <div class="empty-state" style="text-align:center; padding:60px 20px; max-width:400px; margin:40px auto; background:var(--bg-card); border-radius:var(--radius-lg); border:1px dashed var(--border);">
          <div style="font-size:60px; margin-bottom:20px; animation: float 3s ease-in-out infinite;">📄</div>
          <h3 style="margin-bottom:10px; color:var(--text);">لا توجد نماذج بعد</h3>
          <p style="color:var(--text-secondary); margin-bottom:25px; line-height:1.6;">قم بإنشاء أول نموذج لك للبدء في جمع البيانات والردود بسهولة واحترافية.</p>
          <button class="btn btn-primary" onclick="App.createBlankForm()" style="box-shadow:0 4px 15px rgba(99, 102, 241, 0.3);">
            <span>➕</span> إنشاء نموذج جديد
          </button>
        </div>
      `;
      return;
    }

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
        <h3 style="margin:0;">النماذج الخاصة بك</h3>
      </div>
    `;

    // Extract unique folders
    const folders = [...new Set(this.state.forms.map(f => f.settings?.folder_name).filter(Boolean))];

    html += `
      <div style="display:flex; gap:10px; margin-bottom: 20px; overflow-x:auto; padding-bottom:10px;">
        <button class="btn ${!this.state.currentFolder ? 'btn-primary' : 'btn-secondary'}" onclick="App.state.currentFolder = null; App.renderDashboard();" style="border-radius:20px;">الكل</button>
        ${folders.map(folder => `
          <button class="btn ${this.state.currentFolder === folder ? 'btn-primary' : 'btn-secondary'}" onclick="App.state.currentFolder = '${this.escape(folder)}'; App.renderDashboard();" style="border-radius:20px;">📁 ${this.escape(folder)}</button>
        `).join('')}
      </div>
    `;

    // Colors for gradients based on index
    const gradients = [
      'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'
    ];

    html += `<div class="forms-grid">`;
    const filteredForms = this.state.currentFolder 
      ? this.state.forms.filter(f => f.settings?.folder_name === this.state.currentFolder)
      : this.state.forms;

    if (filteredForms.length === 0 && this.state.currentFolder) {
      html += `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-secondary);">المجلد فارغ</div>`;
    }

    filteredForms.forEach((form, idx) => {
      const date = new Date(form.created_at || form.createdAt || Date.now()).toLocaleDateString('ar-EG');
      const responsesCount = form.responses_count || (form.submissions ? form.submissions.length : 0);
      const bgGradient = gradients[idx % gradients.length];
      const isActive = (form.fields && form.fields.length > 0);
      const statusBadge = isActive ? 
        `<span style="position:absolute; top:15px; right:15px; background:rgba(255,255,255,0.2); backdrop-filter:blur(4px); color:white; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:6px; height:6px; background:#10b981; border-radius:50%;"></span> نشط</span>` : 
        `<span style="position:absolute; top:15px; right:15px; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); color:white; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:6px; height:6px; background:#94a3b8; border-radius:50%;"></span> مسودة</span>`;

      html += `
        <div class="form-card" onclick="if(App.hasPermission('edit')) { App.navigate('builder', {formId: '${form.id}'}) } else { App.showToast('لا تملك صلاحية تعديل النماذج', 'error') }" style="position:relative; overflow:hidden; padding:0; display:flex; flex-direction:column; cursor:${App.hasPermission('edit') ? 'pointer' : 'default'};">
          <div style="height:100px; background:${bgGradient}; position:relative; width:100%;">
            ${statusBadge}
            ${App.hasPermission('delete') ? `<button class="del-btn-x" onclick="event.stopPropagation(); App.deleteForm('${form.id}')" title="حذف النموذج نهائياً" style="position:absolute; top:12px; left:12px; width:32px; height:32px; border-radius:50%; background:rgba(0,0,0,0.2); backdrop-filter:blur(4px); color:white; border:none; display:flex; align-items:center; justify-content:center; font-size:16px; cursor:pointer; z-index:10; transition:0.3s;" onmouseenter="this.style.background='rgba(239,68,68,0.9)';" onmouseleave="this.style.background='rgba(0,0,0,0.2)';">✕</button>` : ''}
          </div>
          <div class="form-card-body" style="padding:20px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
            <div class="form-card-actions" style="position:static; display:flex; flex-wrap:wrap; gap:8px; margin-bottom:15px; width:100%;">
              <button onclick="event.stopPropagation(); App.moveToFolder('${form.id}')" title="نقل لمجلد">📁</button>
              <button onclick="event.stopPropagation(); App.state.currentFormId='${form.id}'; App.openShareModal()" title="مشاركة الرابط">🔗</button>
              ${App.hasPermission('create') ? `<button onclick="event.stopPropagation(); App.duplicateForm('${form.id}')" title="نسخ النموذج">📋</button>` : ''}
              <button onclick="event.stopPropagation(); App.viewResponses('${form.id}')" title="الردود والتحليلات">📊</button>
              <button onclick="event.stopPropagation(); App.navigate('fill', {formId: '${form.id}'})" title="فتح النموذج">👁️</button>
              ${form.enableTicketing ? `<button onclick="event.stopPropagation(); App.copyScannerLink('${form.id}')" title="نسخ رابط المنظمين (الماسح)" style="background:var(--primary-light); color:white;">📷</button>` : ''}
            </div>
            
            ${(() => {
              const ownerBadge = (App.state.userRole === 'owner') && form.user_id !== App.state.currentUser.id 
                ? `<span style="background:var(--warning); color:white; font-size:0.75rem; padding:3px 8px; border-radius:12px; margin-right:8px; font-weight:normal; vertical-align:middle; user-select:none;">مشرف آخر</span>` 
                : '';
              return `<div class="form-card-title" style="font-size:1.1rem; margin-bottom:15px; font-weight:700; display:flex; align-items:center;"><span>${this.escape(form.title)}</span>${ownerBadge}</div>`;
            })()}
            
            <div class="form-card-meta" style="border-top:1px solid var(--border); padding-top:12px; margin-top:auto;">
              <span style="display:flex; align-items:center; gap:5px;"><span>📋</span> ${form.fields ? form.fields.length : 0} حقول</span>
              <span style="display:flex; align-items:center; gap:5px;"><span>📬</span> ${responsesCount} رد</span>
              <span style="display:flex; align-items:center; gap:5px;"><span>📅</span> ${date}</span>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    grid.innerHTML = html;
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
    const isConfirmed = await App.confirm('هل أنت متأكد من حذف هذا النموذج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.');
    if(isConfirmed) {
      try {
        const { error } = await supabaseClient.from('forms').delete().eq('id', id);
        if(error) throw error;
        
        this.state.forms = this.state.forms.filter(f => f.id !== id);
        this.renderDashboard();
        this.renderLandingStats();
        this.showToast('تم الحذف بنجاح', 'success');
      } catch(err) {
        console.error(err);
        this.showToast('حدث خطأ أثناء الحذف', 'error');
      }
    }
  },

  copyScannerLink(formId) {
    const link = window.location.origin + window.location.pathname + '?scanner=' + formId;
    navigator.clipboard.writeText(link).then(() => {
      this.showToast('تم نسخ رابط المنظمين (الماسح) بنجاح!', 'success');
    }).catch(err => {
      console.error('Failed to copy: ', err);
      this.showToast('فشل النسخ، انسخ الرابط يدوياً: ' + link, 'error');
    });
  },

  async deleteCurrentForm() {
    const formId = this.state.currentFormId;
    if(formId) {
      const isConfirmed = await App.confirm('هل أنت متأكد من حذف هذا النموذج نهائياً؟');
      if(isConfirmed) {
        try {
          const { error } = await supabaseClient.from('forms').delete().eq('id', formId);
          if(error) throw error;
          
          this.state.forms = this.state.forms.filter(f => f.id !== formId);
          this.navigate('dashboard');
          this.showToast('تم حذف النموذج بنجاح ️', 'success');
        } catch(err) {
          console.error(err);
          this.showToast('حدث خطأ أثناء الحذف', 'error');
        }
      }
    }
  },



  async duplicateForm(id) {
    const form = this.state.forms.find(f => f.id === id);
    if(!form) return;
    
    const cloneFields = form.fields ? JSON.parse(JSON.stringify(form.fields)).map(f => ({
      ...f, id: 'fld_' + Date.now() + Math.floor(Math.random() * 10000)
    })) : [];

    const newForm = {
      user_id: this.state.currentUser?.id || form.user_id,
      title: form.title + ' (نسخة)',
      description: form.description || '',
      fields: cloneFields,
      settings: form.settings ? JSON.parse(JSON.stringify(form.settings)) : {}
    };

    try {
      const { data, error } = await supabaseClient.from('forms').insert([newForm]).select();
      if(error) throw error;
      
      const createdForm = data[0];
      if (createdForm.settings) Object.assign(createdForm, createdForm.settings);
      this.state.forms.unshift(createdForm);
      this.state.stats.totalFormsCreated = (this.state.stats.totalFormsCreated || 0) + 1;
      this.renderDashboard();
      this.showToast('تم نسخ النموذج بنجاح', 'success');
    } catch(err) {
      console.error(err);
      this.showToast('حدث خطأ أثناء نسخ النموذج', 'error');
    }
  },

  moveToFolder(formId) {
    this.state.formToMove = formId;
    const form = this.state.forms.find(f => f.id === formId);
    document.getElementById('folder-name-input').value = form?.settings?.folder_name || '';
    document.getElementById('folder-modal').style.display = 'flex';
  },

  async confirmCreateFolder() {
    const folderName = document.getElementById('folder-name-input').value.trim();
    if(!this.state.formToMove) return;

    const form = this.state.forms.find(f => f.id === this.state.formToMove);
    if(form) {
      if(!form.settings) form.settings = {};
      form.settings.folder_name = folderName || null;
      
      try {
        const { error } = await supabaseClient
          .from('forms')
          .update({ settings: form.settings })
          .eq('id', form.id);
          
        if (error) throw error;
        this.showToast('تم تحديث المجلد بنجاح', 'success');
        this.renderDashboard();
      } catch (err) {
        console.error(err);
        this.showToast('فشل في حفظ المجلد', 'error');
      }
    }
    document.getElementById('folder-modal').style.display = 'none';
    this.state.formToMove = null;
  }
});
