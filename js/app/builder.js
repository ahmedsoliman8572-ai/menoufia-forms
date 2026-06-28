// =============================================
// FORM BUILDER & HISTORY
// =============================================
Object.assign(window.App, {
  getForm() { return this.state.forms.find(f => f.id === this.state.currentFormId); },

  updateFormTitle(value) {
    const form = this.getForm();
    if(form) { form.title = value; this.save(); }
  },

  renderBuilder() {
    const form = this.getForm();
    if(!form) return this.navigate('dashboard');
    
    document.getElementById('builder-form-title').value = form.title;
    this.renderSidebar();
    this.renderCanvas();
    this.renderSettings();
  },

  renderSidebar() {
    const sidebar = document.getElementById('builder-sidebar');
    const categories = {
      smart: { title: '⚡ حقول ذكية (مصر)', types: ['arabic_name', 'english_name', 'national_id', 'gender', 'governorate', 'markaz', 'faculty', 'academic_year', 'address_detailed', 'tax_id', 'whatsapp', 'union_member'] },
      basic: { title: '📄 حقول أساسية', types: ['short_text', 'long_text', 'number', 'email', 'phone', 'url', 'date', 'time', 'rating', 'linear_scale', 'file_upload', 'section_break'] },
      choice: { title: '🔘 اختيارات', types: ['single_choice', 'multiple_choice', 'dropdown'] }
    };

    let html = '';
    Object.entries(categories).forEach(([catKey, cat]) => {
      html += `<div class="sidebar-category"><h3>${cat.title}</h3></div><div class="sidebar-fields-container" style="display:flex; flex-direction:column; padding:0 var(--space-md); gap:4px; margin-bottom:12px;">`;
      cat.types.forEach(type => {
        const def = FIELD_TYPES[type];
        const isSmart = catKey === 'smart' ? 'smart-field' : '';
        html += `
          <button class="field-btn ${isSmart}" data-type="${type}" onclick="App.addField('${type}')">
            <span class="icon">${def.icon}</span>
            <span>${def.label}</span>
          </button>
        `;
      });
      html += `</div>`;
    });
    sidebar.innerHTML = html;

    // SortableJS disabled
  },

  addField(type, insertIndex = null) {
    const form = this.getForm();
    if(!form) return;
    this.saveHistoryState();
    const def = FIELD_TYPES[type];
    
    let fieldType = type;
    if(def.isChoice) fieldType = 'single_choice';
    if(def.isDropdown) fieldType = 'dropdown';

    const newField = {
      id: 'fld_' + Date.now(),
      type: fieldType,
      originalType: type,
      label: def.label,
      placeholder: def.placeholder || '',
      required: true,
      options: def.options ? [...def.options] : (def.hasOptions ? ['خيار 1', 'خيار 2'] : [])
    };

    if (insertIndex !== null && insertIndex >= 0 && insertIndex <= form.fields.length) {
      form.fields.splice(insertIndex, 0, newField);
    } else {
      form.fields.push(newField);
    }

    this.state.selectedFieldId = newField.id;
    this.save();
    this.renderCanvas();
    this.renderSettings();
    this.closeAllDrawers();
    
    setTimeout(() => {
      const el = document.querySelector(`[data-field-id="${newField.id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  },

  renderCanvas() {
    const form = this.getForm();
    const canvas = document.getElementById('builder-canvas-content');
    
    let html = `
      <div class="form-header-card">
        <input type="text" value="${this.escape(form.title)}" placeholder="عنوان النموذج" oninput="App.updateFormProp('title', this.value); document.getElementById('builder-form-title').value = this.value">
        <textarea placeholder="وصف النموذج (اختياري)..." oninput="App.updateFormProp('description', this.value)">${this.escape(form.description)}</textarea>
      </div>
    `;

    if(form.fields.length === 0) {
      html += `<div style="text-align:center; padding: 48px 24px; color:var(--text-tertiary); font-size:1.1rem; border:2px dashed var(--border); border-radius:var(--radius-lg); background: var(--bg-glass);">
        <div style="font-size:3rem; margin-bottom:12px; opacity:0.5;">📝</div>
        اضغط على أي حقل من القائمة الجانبية لإضافته هنا
      </div>`;
    }

    form.fields.forEach((field, index) => {
      const isSelected = field.id === this.state.selectedFieldId ? 'selected' : '';
      const origDef = FIELD_TYPES[field.originalType] || FIELD_TYPES[field.type];
      
      html += `
        <div class="builder-field-card ${isSelected}" data-field-id="${field.id}" onclick="App.selectField('${field.id}')">
          <div class="field-actions">
            <button onclick="event.stopPropagation(); App.selectField('${field.id}')" title="إعدادات">⚙️</button>
            <button onclick="event.stopPropagation(); App.duplicateField('${field.id}')" title="نسخ">📋</button>
            <button class="del" onclick="event.stopPropagation(); App.removeField('${field.id}')" title="حذف">🗑️</button>
          </div>
          
          <div class="field-card-header">
            <input type="text" class="field-label-edit" value="${this.escape(field.label)}" placeholder="عنوان السؤال" oninput="App.updateFieldProp('${field.id}', 'label', this.value)">
            <span class="field-type-badge">${origDef.icon} ${origDef.label}</span>
          </div>
          
          <div class="field-preview">
            ${this.renderPreview(field)}
          </div>
        </div>
      `;
    });

    canvas.innerHTML = html;
    
    // SortableJS disabled
  },

  renderPreview(field) {
    const type = field.originalType || field.type;
    if(['short_text', 'number', 'arabic_name', 'english_name', 'national_id', 'email', 'phone', 'url', 'tax_id', 'whatsapp', 'address_detailed'].includes(type)) {
      return `<div class="fake-input">${this.escape(field.placeholder || 'إجابة قصيرة...')}</div>`;
    }
    if(type === 'long_text') {
      return `<div class="fake-input" style="height:70px">${this.escape(field.placeholder || 'إجابة طويلة...')}</div>`;
    }
    if(type === 'date' || type === 'time') {
      return `<div class="fake-input" style="display:flex; justify-content:space-between;"><span>${type === 'date' ? 'يوم / شهر / سنة' : '-- : --'}</span><span>${type === 'date' ? '📅' : '⏰'}</span></div>`;
    }
    if(type === 'file_upload') {
      return `<div class="fake-input" style="border: 2px dashed var(--border); text-align:center; padding: 15px;">📎 اضغط لرفع ملف</div>`;
    }
    if(type === 'rating') {
      return `<div style="font-size: 2rem; color: #ccc;">⭐ ⭐ ⭐ ⭐ ⭐</div>`;
    }
    if(type === 'linear_scale') {
      return `<div style="display:flex; justify-content:space-between; max-width: 300px;">
        ${[1,2,3,4,5].map(n => `<div style="text-align:center; font-size:0.8rem;"><div class="circle"></div>${n}</div>`).join('')}
      </div>`;
    }
    if(field.type === 'single_choice' || field.type === 'multiple_choice') {
      const shape = field.type === 'single_choice' ? 'circle' : 'square';
      return `<div class="fake-options">${(field.options||[]).map(o => `<div class="fake-option"><div class="${shape}"></div><span>${this.escape(o)}</span></div>`).join('')}</div>`;
    }
    if(field.type === 'dropdown' || ['governorate', 'markaz', 'faculty', 'academic_year'].includes(type)) {
      return `<div class="fake-input" style="display:flex; justify-content:space-between;"><span>اختر...</span><span>▾</span></div>`;
    }
    if(field.type === 'section_break') {
      return `<div style="text-align:center; padding:10px; border-top:2px dashed var(--border); color:var(--text-tertiary);">--- فاصل صفحة جديدة ---</div>`;
    }
    return '';
  },

    renderSettings() {
    const panel = document.getElementById('builder-settings');
    const form = this.getForm();
    if(!form || !this.state.selectedFieldId) {
      panel.classList.remove('open');
      return;
    }

    const field = form.fields.find(f => f.id === this.state.selectedFieldId);
    if(!field) return;

    panel.classList.add('open');
    const overlay = document.getElementById('drawer-overlay');
    if(overlay) overlay.classList.add('show');
    const origDef = FIELD_TYPES[field.originalType] || FIELD_TYPES[field.type];
    const isSmart = origDef.category === 'smart';

    let html = `
      <div class="settings-header">
        <h3>⚙️ إعدادات الحقل</h3>
        <button class="icon-btn" style="width:30px;height:30px" onclick="App.closeSettings()">✕</button>
      </div>
      <div class="settings-body">
        ${isSmart ? `<div style="padding:12px 16px; background:rgba(99,102,241,0.08); color:var(--primary); border-radius:var(--radius-md); font-size:0.85rem; font-weight:700; display:flex; align-items:center; gap:8px;">✨ حقل ذكي مبرمج مسبقاً</div>` : ''}
        
        <div class="form-group">
          <label>عنوان السؤال</label>
          <input type="text" class="form-control" value="${this.escape(field.label)}" oninput="App.updateFieldProp('${field.id}', 'label', this.value)">
        </div>
        
        ${origDef.hasPlaceholder ? `
          <div class="form-group">
            <label>نص توضيحي (Placeholder)</label>
            <input type="text" class="form-control" value="${this.escape(field.placeholder||'')}" oninput="App.updateFieldProp('${field.id}', 'placeholder', this.value)">
          </div>
        ` : ''}

        <div class="toggle-row">
          <label style="font-weight:600">مطلوب (إجباري)</label>
          <label class="toggle-switch">
            <input type="checkbox" ${field.required ? 'checked' : ''} onchange="App.updateFieldProp('${field.id}', 'required', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        ${(field.type === 'single_choice' || field.type === 'multiple_choice' || field.type === 'dropdown') ? `
          <div class="form-group">
            <label>الخيارات</label>
            <div class="option-edit-list">
              ${(field.options||[]).map((opt, i) => `
                <div class="option-edit-item">
                  <input type="text" class="form-control" value="${this.escape(opt)}" oninput="App.updateOption('${field.id}', ${i}, this.value)" onkeydown="if(event.key === 'Enter') { event.preventDefault(); App.addOption('${field.id}'); }" ${isSmart ? 'readonly title="لا يمكن تعديل خيارات الحقل الذكي"' : ''}>
                  ${!isSmart ? `<button class="icon-btn" style="color:var(--error)" onclick="App.removeOption('${field.id}', ${i})">✕</button>` : ''}
                </div>
              `).join('')}
            </div>
            ${!isSmart ? `<button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="App.addOption('${field.id}')">+ إضافة خيار</button>` : ''}
          </div>
        ` : ''}

        <div class="form-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
          <label style="font-weight:600">منطق شرطي (إظهار الحقل إذا كان):</label>
          <select class="form-control" onchange="App.updateFieldProp('${field.id}', 'conditionField', this.value)">
            <option value="">-- بدون شرط --</option>
            ${form.fields.filter(f => f.id !== field.id && (f.type === 'single_choice' || f.type === 'dropdown' || f.originalType === 'governorate' || f.originalType === 'gender' || f.originalType === 'union_member')).map(f => `
              <option value="${f.id}" ${field.conditionField === f.id ? 'selected' : ''}>${this.escape(f.label)}</option>
            `).join('')}
          </select>
          ${field.conditionField ? `
            <input type="text" class="form-control" placeholder="يساوي القيمة..." value="${this.escape(field.conditionValue || '')}" oninput="App.updateFieldProp('${field.id}', 'conditionValue', this.value)" style="margin-top:8px;">
          ` : ''}
        </div>

        ${form.isQuizMode && (field.type === 'single_choice' || field.type === 'dropdown' || field.type === 'multiple_choice') ? `
          <div class="form-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
            <label style="font-weight:600; color:#10B981;">🎓 إعدادات الاختبار</label>
            <div style="margin-top:8px;">
              <label style="font-size:0.9rem;">الإجابة الصحيحة:</label>
              <select class="form-control" onchange="App.updateFieldProp('${field.id}', 'correctAnswer', this.value)">
                <option value="">-- اختر الإجابة الصحيحة --</option>
                ${(field.options||[]).map(o => `
                  <option value="${this.escape(o)}" ${field.correctAnswer === o ? 'selected' : ''}>${this.escape(o)}</option>
                `).join('')}
              </select>
            </div>
            <div style="margin-top:8px;">
              <label style="font-size:0.9rem;">النقاط (الدرجة):</label>
              <input type="number" class="form-control" value="${field.points || 1}" oninput="App.updateFieldProp('${field.id}', 'points', parseInt(this.value) || 0)" min="0">
            </div>
          </div>
        ` : ''}
      </div>
    `;
    panel.innerHTML = html;
  },

  updateFormProp(prop, value) { const f = this.getForm(); if(f) { this.saveHistoryState(); f[prop] = value; this.save(); } },
  updateFieldProp(fid, prop, value) { 
    const f = this.getForm(); 
    const field = f.fields.find(x => x.id === fid); 
    if(field) { 
      this.saveHistoryState();
      field[prop] = value; 
      this.save(); 
      this.renderCanvas(); 
    } 
  },
  updateOption(fid, index, value) {
    const f = this.getForm(); const field = f.fields.find(x => x.id === fid);
    if(field && field.options) { this.saveHistoryState(); field.options[index] = value; this.save(); this.renderCanvas(); }
  },
  addOption(fid) {
    const f = this.getForm(); const field = f.fields.find(x => x.id === fid);
    if(field && field.options) { this.saveHistoryState(); field.options.push(`خيار ${field.options.length + 1}`); this.save(); this.renderCanvas(); this.renderSettings(); }
  },
  removeOption(fid, index) {
    const f = this.getForm(); const field = f.fields.find(x => x.id === fid);
    if(field && field.options && field.options.length > 1) { this.saveHistoryState(); field.options.splice(index, 1); this.save(); this.renderCanvas(); this.renderSettings(); }
  },
  
  selectField(id) { this.state.selectedFieldId = id; this.renderCanvas(); this.renderSettings(); },
  closeSettings() { this.state.selectedFieldId = null; this.renderCanvas(); this.closeAllDrawers(); },
  removeField(id) { const f = this.getForm(); this.saveHistoryState(); f.fields = f.fields.filter(x => x.id !== id); this.closeSettings(); this.save(); this.renderCanvas(); },
  
  reorderFields(oldIndex, newIndex) {
    const form = this.getForm();
    if (!form || oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    this.saveHistoryState();
    const movedItem = form.fields.splice(oldIndex, 1)[0];
    form.fields.splice(newIndex, 0, movedItem);
    this.save();
    this.renderCanvas();
  },
  
  duplicateField(id) {
    const form = this.getForm();
    const index = form.fields.findIndex(x => x.id === id);
    if (index === -1) return;
    this.saveHistoryState();
    const original = form.fields[index];
    const clone = JSON.parse(JSON.stringify(original));
    clone.id = 'fld_' + Date.now() + Math.floor(Math.random() * 1000);
    form.fields.splice(index + 1, 0, clone);
    this.save();
    this.renderCanvas();
    this.showToast('تم نسخ الحقل بنجاح 📋', 'success');
  },

  exportCurrentForm() {
    const form = this.getForm();
    if (!form) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(form, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "form_" + form.id + ".json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    this.showToast('تم تصدير النموذج بنجاح 📤', 'success');
  },

  importForm(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedForm = JSON.parse(e.target.result);
        importedForm.id = 'frm_' + Date.now(); 
        this.state.forms.unshift(importedForm);
        this.state.stats.totalFormsCreated = (this.state.stats.totalFormsCreated || 0) + 1;
        this.save();
        this.renderDashboard();
        this.showToast('تم استيراد النموذج بنجاح 📥', 'success');
      } catch (err) {
        this.showToast('خطأ في قراءة ملف النموذج ❌', 'error');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  },

  async saveCurrentForm() {
    const form = this.getForm();
    if(!form) return;
    
    try {
      const { error } = await supabaseClient.from('forms').update({
        title: form.title,
        description: form.description,
        fields: form.fields,
        settings: form.settings,
        updated_at: new Date().toISOString()
      }).eq('id', form.id);
      
      if(error) throw error;
      this.showToast('تم حفظ النموذج بنجاح ✅', 'success'); 
    } catch(err) {
      console.error(err);
      this.showToast('حدث خطأ أثناء الحفظ', 'error');
    }
  },

    saveHistoryState() {
    const form = this.getForm();
    if(!form) return;
    const clonedForm = JSON.parse(JSON.stringify(form));
    this.state.history.undoStack.push(clonedForm);
    this.state.history.redoStack = []; // Clear redo stack on new action
    // Keep stack size reasonable
    if(this.state.history.undoStack.length > 30) this.state.history.undoStack.shift();
  },

  undo() {
    if(this.state.history.undoStack.length === 0) return this.showToast('لا يوجد شيء للتراجع عنه', 'info');
    
    const form = this.getForm();
    if(!form) return;

    // Push current to redo
    this.state.history.redoStack.push(JSON.parse(JSON.stringify(form)));
    
    // Pop from undo
    const prevForm = this.state.history.undoStack.pop();
    
    // Restore
    const idx = this.state.forms.findIndex(f => f.id === form.id);
    if(idx !== -1) {
      this.state.forms[idx] = prevForm;
      this.save();
      this.renderBuilder();
      this.showToast('تم التراجع ↶', 'info');
    }
  },

  redo() {
    if(this.state.history.redoStack.length === 0) return this.showToast('لا يوجد شيء لإعادته', 'info');
    
    const form = this.getForm();
    if(!form) return;

    // Push current to undo
    this.state.history.undoStack.push(JSON.parse(JSON.stringify(form)));
    
    // Pop from redo
    const nextForm = this.state.history.redoStack.pop();
    
    // Restore
    const idx = this.state.forms.findIndex(f => f.id === form.id);
    if(idx !== -1) {
      this.state.forms[idx] = nextForm;
      this.save();
      this.renderBuilder();
      this.showToast('تم الإعادة ↷', 'info');
    }
  }

});

Object.assign(window.App, {
openFormSettings() {
    const form = this.getForm();
    if(!form) return;
    
    document.getElementById('setting-theme-color').value = form.themeColor || '#4f46e5';
    document.getElementById('setting-bg-style').value = form.backgroundStyle || 'solid';
    document.getElementById('setting-dark-mode').checked = form.darkModeEnabled || false;
    document.getElementById('setting-limit-response').checked = form.limitOneResponse || false;
    document.getElementById('setting-thank-you').value = form.thankYouMessage || 'شكراً لك، تم تسجيل ردك في قاعدة البيانات بنجاح.';
    document.getElementById('setting-redirect-url').value = form.redirectUrl || '';
    document.getElementById('setting-allow-resubmit').checked = form.allowResubmit !== false;
    document.getElementById('setting-max-responses').value = form.maxResponses || '';
    document.getElementById('setting-deadline').value = form.deadline || '';
    document.getElementById('setting-notify-email').value = form.notifyEmail || '';
    
    const logoPreview = document.getElementById('setting-logo-preview');
    if(form.logoBase64) {
      logoPreview.innerHTML = `<img src="${form.logoBase64}" style="max-height:80px; border-radius:4px;">`;
      logoPreview.style.display = 'block';
    } else {
      logoPreview.style.display = 'none';
      logoPreview.innerHTML = '';
    }

    const coverPreview = document.getElementById('setting-cover-preview');
    if(form.coverImageBase64) {
      coverPreview.style.backgroundImage = `url(${form.coverImageBase64})`;
      coverPreview.style.display = 'block';
    } else {
      coverPreview.style.display = 'none';
      coverPreview.style.backgroundImage = 'none';
    }
    
    document.getElementById('form-settings-modal').style.display = 'flex';
  },

  handleLogoUpload(event) {
    const file = event.target.files[0];
    if(!file) return;
    if(file.size > 2 * 1024 * 1024) {
      this.showToast('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.updateFormProp('logoBase64', e.target.result);
      const logoPreview = document.getElementById('setting-logo-preview');
      logoPreview.innerHTML = `<img src="${e.target.result}" style="max-height:80px; border-radius:4px;">`;
      logoPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  },

  handleCoverUpload(event) {
    const file = event.target.files[0];
    if(!file) return;
    if(file.size > 5 * 1024 * 1024) {
      this.showToast('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.updateFormProp('coverImageBase64', e.target.result);
      const coverPreview = document.getElementById('setting-cover-preview');
      coverPreview.style.backgroundImage = `url(${e.target.result})`;
      coverPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  },

  
});
