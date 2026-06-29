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
          <h3 style="margin:0;">النماذج الخاصة بك</h3>
        </div>
        <div style="text-align:center; padding:60px 20px; background:var(--bg-card); border-radius:var(--radius-lg); border:2px dashed var(--border); margin-top:20px; animation: fadeIn 0.5s;">
          <div style="font-size:4rem; margin-bottom:15px; display:inline-block; animation: float 3s ease-in-out infinite;"></div>
          <h3 style="margin-bottom:10px; color:var(--text); font-size:1.5rem;">ليس لديك أي نماذج حتى الآن!</h3>
          <p style="color:var(--text-secondary); margin-bottom:25px; max-width:400px; margin-left:auto; margin-right:auto; line-height:1.6;">قم بإنشاء أول نموذج لك الآن لبدء جمع البيانات والردود بكل سهولة واحترافية.</p>
          <button class="btn btn-primary" onclick="App.createBlankForm()" style="padding:12px 24px; font-size:1.1rem; box-shadow:0 4px 15px rgba(79,70,229,0.3); border-radius:30px;">
            <span style="margin-left:8px;"></span> إنشاء نموذج جديد
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

    html += `<div class="forms-grid">`;
    this.state.forms.forEach(form => {
      const date = new Date(form.createdAt).toLocaleDateString('ar-EG');
      const responsesCount = form.responses_count || (form.submissions ? form.submissions.length : 0);
      html += `
        <div class="form-card" onclick="App.navigate('builder', {formId: '${form.id}'})" style="position:relative;">
          ${App.hasPermission('delete') ? `<button class="del-btn-x" onclick="event.stopPropagation(); App.deleteForm('${form.id}')" title="حذف النموذج نهائياً" style="position:absolute; top:10px; left:10px; width:28px; height:28px; border-radius:50%; background:rgba(239,68,68,0.1); color:var(--danger); border:none; display:flex; align-items:center; justify-content:center; font-size:14px; cursor:pointer; z-index:10; transition:0.2s;" onmouseenter="this.style.background='rgba(239,68,68,0.2)'; this.style.transform='scale(1.1)';" onmouseleave="this.style.background='rgba(239,68,68,0.1)'; this.style.transform='scale(1)';">✕</button>` : ''}
          <div class="form-card-actions" style="margin-left: 30px;">
            <button onclick="event.stopPropagation(); App.state.currentFormId='${form.id}'; App.openShareModal()" title="مشاركة الرابط">مشاركة</button>
            <button onclick="event.stopPropagation(); App.duplicateForm('${form.id}')" title="نسخ النموذج">نسخ</button>
            <button onclick="event.stopPropagation(); App.viewResponses('${form.id}')" title="الردود والتحليلات">ردود</button>
            <button onclick="event.stopPropagation(); App.navigate('fill', {formId: '${form.id}'})" title="فتح النموذج">فتح</button>
          </div>
          <div class="form-card-banner"></div>
          <div class="form-card-body">
            <div class="form-card-title">${this.escape(form.title)}</div>
            <div class="form-card-meta">
              <span>${form.fields ? form.fields.length : 0} حقول · ${responsesCount} رد</span>
              <span>${date}</span>
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
        this.showToast('تم حذف النموذج بنجاح ️', 'success');
      } catch(err) {
        console.error(err);
        this.showToast('حدث خطأ أثناء الحذف', 'error');
      }
    }
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
    this.showToast('تم نسخ النموذج بنجاح ', 'success');
  },

  
});
