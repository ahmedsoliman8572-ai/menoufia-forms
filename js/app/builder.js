// =============================================
// FORM BUILDER & HISTORY
// =============================================
Object.assign(window.App, {
  getForm() { 
    return this.state.forms.find(f => f.id === this.state.currentFormId) || (this.state.currentFillForm?.id === this.state.currentFormId ? this.state.currentFillForm : undefined); 
  },

  updateFormTitle(value) {
    const form = this.getForm();
    if(form) { form.title = value; this.save(); }
  },

  renderBuilder() {
    const form = this.getForm();
    if(!form) return this.navigate('dashboard');
    
    document.getElementById('builder-form-title').value = form.title;
    
    // Toggle scanner button visibility based on enableTicketing
    const btnScanner = document.getElementById('btn-scanner');
    if (btnScanner) {
      btnScanner.style.display = form.enableTicketing ? 'inline-flex' : 'none';
    }

    this.renderSidebar();
    this.renderCanvas();
    this.renderSettings();
  },

  copyCurrentScannerLink() {
    const form = this.getForm();
    if(!form) return;
    if(!form.enableTicketing) {
      return this.showToast('عفواً، يجب تفعيل "نظام التذاكر" من إعدادات النموذج أولاً.', 'warning');
    }
    const link = window.location.origin + window.location.pathname + '?scanner=' + form.id;
    navigator.clipboard.writeText(link).then(() => {
      this.showToast('تم نسخ رابط المنظمين (الماسح) بنجاح!', 'success');
    }).catch(err => {
      console.error('Failed to copy: ', err);
      this.showToast('فشل النسخ، انسخ الرابط يدوياً: ' + link, 'error');
    });
  },

  renderSidebar() {
    const sidebar = document.getElementById('builder-sidebar');
    const categories = {
      smart: { title: '⚡ حقول ذكية (مصر)', types: ['arabic_name', 'english_name', 'national_id', 'gender', 'governorate', 'markaz', 'faculty', 'academic_year', 'address_detailed', 'whatsapp', 'union_member'] },
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
        <input type="text" value="${this.escape(form.title)}" placeholder="عنوان النموذج" onchange="App.updateFormProp('title', this.value); document.getElementById('builder-form-title').value = this.value">
        <textarea placeholder="وصف النموذج (اختياري)..." onchange="App.updateFormProp('description', this.value)">${this.escape(form.description)}</textarea>
      </div>
    `;

    if(form.fields.length === 0) {
      html += `<div style="text-align:center; padding: 48px 24px; color:var(--text-tertiary); font-size:1.1rem; border:2px dashed var(--border); border-radius:var(--radius-lg); background: var(--bg-glass);">
        <div style="font-size:3rem; margin-bottom:12px; opacity:0.5;"></div>
        اضغط على أي حقل من القائمة الجانبية لإضافته هنا
      </div>`;
    }

    form.fields.forEach((field, index) => {
      const isSelected = field.id === this.state.selectedFieldId ? 'selected' : '';
      const origDef = FIELD_TYPES[field.originalType] || FIELD_TYPES[field.type];
      
      html += `
        <div class="builder-field-card ${isSelected}" data-field-id="${field.id}" onclick="App.selectField('${field.id}')">
          <div class="field-actions">
            ${index > 0 ? `<button onclick="event.stopPropagation(); App.reorderFields(${index}, ${index - 1})" title="تحريك للأعلى">⬆️</button>` : ''}
            ${index < form.fields.length - 1 ? `<button onclick="event.stopPropagation(); App.reorderFields(${index}, ${index + 1})" title="تحريك للأسفل">⬇️</button>` : ''}
            <button onclick="event.stopPropagation(); App.openSettingsModal('${field.id}')" title="إعدادات">⚙️</button>
            <button onclick="event.stopPropagation(); App.duplicateField('${field.id}')" title="نسخ">📋</button>
            <button class="del" onclick="event.stopPropagation(); App.removeField('${field.id}')" title="حذف">🗑️</button>
          </div>
          
          <div class="field-card-header">
            <input type="text" class="field-label-edit" value="${this.escape(field.label)}" placeholder="عنوان السؤال" onchange="App.updateFieldProp('${field.id}', 'label', this.value)">
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
      return `<div class="fake-input" style="display:flex; justify-content:space-between;"><span>${type === 'date' ? 'يوم / شهر / سنة' : '-- : --'}</span><span>${type === 'date' ? '' : ''}</span></div>`;
    }
    if(type === 'file_upload') {
      return `<div class="fake-input" style="border: 2px dashed var(--border); text-align:center; padding: 15px;">اضغط لرفع ملف</div>`;
    }
    if(type === 'rating') {
      return `<div style="font-size: 2rem; color: #ccc;"></div>`;
    }
    if(type === 'linear_scale') {
      return `<div style="display:flex; justify-content:space-between; max-width: 300px;">
        ${[1,2,3,4,5].map(n => `<div style="text-align:center; font-size:0.8rem;"><div class="circle"></div>${n}</div>`).join('')}
      </div>`;
    }
    if(field.type === 'single_choice' || field.type === 'multiple_choice' || field.type === 'dropdown') {
      if (['governorate', 'markaz', 'faculty', 'academic_year'].includes(type)) {
        return `<div class="fake-input" style="display:flex; justify-content:space-between;"><span>قائمة منسدلة ذكية (محددة مسبقاً)</span><span>▾</span></div>`;
      }
      const isSmart = FIELD_TYPES[type]?.category === 'smart';
      const shape = field.type === 'single_choice' ? 'circle' : (field.type === 'multiple_choice' ? 'square' : 'dropdown-icon');
      
      let html = `<div class="fake-options" style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">`;
      (field.options||[]).forEach((o, i) => {
        const shapeHtml = shape === 'dropdown-icon' ? `<span style="font-size:0.9rem; opacity:0.5; display:inline-block; width:16px; text-align:center;">${i+1}.</span>` : `<div class="${shape}"></div>`;
        html += `
          <div class="fake-option" style="display:flex; align-items:center; gap:8px; width:100%;">
            ${shapeHtml}
            <input type="text" class="field-label-edit" style="font-size:0.95rem; padding:4px 8px; font-weight:normal; flex:1;" 
              value="${this.escape(o)}" 
              onchange="App.updateOption('${field.id}', ${i}, this.value)"
              ${isSmart ? 'readonly title="لا يمكن تعديل خيارات الحقل الذكي"' : ''}>
            ${(!isSmart && field.options.length > 1) ? `<button class="icon-btn" style="width:28px;height:28px;font-size:0.8rem;opacity:0.6;" onclick="event.stopPropagation(); App.removeOption('${field.id}', ${i})" title="حذف الخيار">✕</button>` : ''}
          </div>
        `;
      });
      if (!isSmart) {
        html += `
          <div class="fake-option" style="display:flex; align-items:center; gap:8px; margin-top:4px; opacity:0.7; cursor:pointer;" onclick="event.stopPropagation(); App.addOption('${field.id}')">
            ${shape === 'dropdown-icon' ? `<span style="font-size:0.9rem; display:inline-block; width:16px; text-align:center;">+</span>` : `<div class="${shape}"></div>`}
            <span style="font-size:0.95rem; border-bottom:1px dashed var(--text-tertiary);">إضافة خيار جديد</span>
          </div>
        `;
      }
      html += `</div>`;
      return html;
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
        <h3>إعدادات الحقل</h3>
        <button class="icon-btn" style="width:30px;height:30px" onclick="App.closeSettings()">✕</button>
      </div>
      <div class="settings-body">
        ${isSmart ? `<div style="padding:12px 16px; background:rgba(99,102,241,0.08); color:var(--primary); border-radius:var(--radius-md); font-size:0.85rem; font-weight:700; display:flex; align-items:center; gap:8px;">✨ حقل ذكي مبرمج مسبقاً</div>` : ''}
        
        <div class="form-group">
          <label>عنوان السؤال</label>
          <input type="text" class="form-control" value="${this.escape(field.label)}" onchange="App.updateFieldProp('${field.id}', 'label', this.value); App.renderSettings();">
        </div>
        
        ${origDef.hasPlaceholder ? `
          <div class="form-group">
            <label>نص توضيحي (Placeholder)</label>
            <input type="text" class="form-control" value="${this.escape(field.placeholder||'')}" onchange="App.updateFieldProp('${field.id}', 'placeholder', this.value)">
          </div>
        ` : ''}

        <div class="toggle-row">
          <label style="font-weight:600">مطلوب (إجباري)</label>
          <label class="toggle-switch">
            <input type="checkbox" ${field.required ? 'checked' : ''} onchange="App.updateFieldProp('${field.id}', 'required', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        ${(field.type === 'single_choice' || field.type === 'multiple_choice' || field.type === 'dropdown' || origDef.isChoice || origDef.isDropdown || origDef.hasOptions) ? `
          <div class="form-group">
            <label>الخيارات</label>
            ${(field.type === 'single_choice' || field.type === 'dropdown' || origDef.isChoice || origDef.isDropdown) ? `
            <div class="toggle-row" style="margin-bottom:10px; background:rgba(0,0,0,0.02); padding:8px; border-radius:4px;">
              <label style="font-size:0.9rem;">الانتقال إلى قسم استناداً إلى الإجابة</label>
              <label class="toggle-switch">
                <input type="checkbox" ${field.logicBranching ? 'checked' : ''} onchange="App.updateFieldProp('${field.id}', 'logicBranching', this.checked); App.renderSettings();">
                <span class="toggle-slider"></span>
              </label>
            </div>
            ` : ''}
            <div class="option-edit-list">
              ${(field.options||[]).map((opt, i) => `
                <div class="option-edit-item" style="${field.logicBranching ? 'flex-wrap:wrap;' : ''}">
                  <input type="text" class="form-control" style="flex:1;" value="${this.escape(opt)}" oninput="App.updateOption('${field.id}', ${i}, this.value)" onkeydown="if(event.key === 'Enter') { event.preventDefault(); App.addOption('${field.id}'); }" ${isSmart ? 'readonly title="لا يمكن تعديل خيارات الحقل الذكي"' : ''}>
                  ${!isSmart ? `<button class="icon-btn" style="color:var(--error)" onclick="App.removeOption('${field.id}', ${i})">✕</button>` : ''}
                  ${field.logicBranching ? `
                    <div style="width:100%; margin-top:5px; padding-right:10px;">
                      <select class="form-control" style="font-size:0.85rem; padding:4px; height:auto;" onchange="App.updateOptionTarget('${field.id}', ${i}, this.value)">
                        <option value="next" ${(!(field.optionTargets && field.optionTargets[i]) || field.optionTargets[i] === 'next') ? 'selected' : ''}>متابعة إلى القسم التالي</option>
                        <option value="submit" ${((field.optionTargets && field.optionTargets[i]) === 'submit') ? 'selected' : ''}>إرسال النموذج</option>
                        ${form.fields.filter(f => f.type === 'section_break').map((f, idx) => `
                          <option value="${f.id}" ${((field.optionTargets && field.optionTargets[i]) === f.id) ? 'selected' : ''}>الانتقال إلى قسم ${idx + 2}</option>
                        `).join('')}
                      </select>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
            ${!isSmart ? `<button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="App.addOption('${field.id}')">+ إضافة خيار</button>` : ''}
          </div>
        ` : ''}
        
        ${field.type === 'section_break' ? `
          <div class="form-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
            <label style="font-weight:600">بعد هذا القسم (عند المتابعة):</label>
            <select class="form-control" onchange="App.updateFieldProp('${field.id}', 'nextAction', this.value)">
              <option value="next" ${(!field.nextAction || field.nextAction === 'next') ? 'selected' : ''}>متابعة إلى القسم التالي</option>
              <option value="submit" ${field.nextAction === 'submit' ? 'selected' : ''}>إرسال النموذج</option>
              ${form.fields.filter(f => f.type === 'section_break').map((f, idx) => `
                <option value="${f.id}" ${field.nextAction === f.id ? 'selected' : ''}>الانتقال إلى قسم ${idx + 2}</option>
              `).join('')}
            </select>
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
          ${field.conditionField ? (() => {
            const cField = form.fields.find(f => f.id === field.conditionField);
            if (cField) {
              let opts = cField.options || [];
              const def = FIELD_TYPES[cField.originalType || cField.type];
              if (!opts.length && def && def.options) opts = def.options;
              if (cField.originalType === 'gender') opts = ['ذكر', 'أنثى'];
              if (cField.originalType === 'union_member') opts = ['نعم', 'لا'];
              
              if (opts.length > 0) {
                return `
                  <select class="form-control" onchange="App.updateFieldProp('${field.id}', 'conditionValue', this.value)" style="margin-top:8px;">
                    <option value="">-- اختر القيمة --</option>
                    ${opts.map(o => `<option value="${this.escape(o)}" ${field.conditionValue === o ? 'selected' : ''}>${this.escape(o)}</option>`).join('')}
                  </select>
                `;
              }
            }
            return `<input type="text" class="form-control" placeholder="يساوي القيمة..." value="${this.escape(field.conditionValue || '')}" oninput="App.updateFieldProp('${field.id}', 'conditionValue', this.value)" style="margin-top:8px;">`;
          })() : ''}
        </div>

        ${form.isQuizMode && (field.type === 'single_choice' || field.type === 'dropdown' || field.type === 'multiple_choice') ? `
          <div class="form-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
            <label style="font-weight:600; color:#10B981;">إعدادات الاختبار</label>
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

  updateFormProp(prop, value) { 
    const f = this.getForm(); 
    if(f) { 
      this.saveHistoryState(); 
      f[prop] = value; 
      
      // Update scanner button and ticket designer if ticketing is toggled
      if (prop === 'enableTicketing') {
        const btnScanner = document.getElementById('btn-scanner');
        if (btnScanner) btnScanner.style.display = value ? 'inline-flex' : 'none';
        
        const ticketDesigner = document.getElementById('ticket-designer-settings');
        if (ticketDesigner) ticketDesigner.style.display = value ? 'block' : 'none';
      }

      this.save(); 
    } 
  },
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
  updateOptionTarget(fid, index, value) {
    const f = this.getForm(); const field = f.fields.find(x => x.id === fid);
    if(field) {
      this.saveHistoryState();
      if(!field.optionTargets) field.optionTargets = [];
      field.optionTargets[index] = value;
      this.save();
      this.renderSettings();
    }
  },
  addOption(fid) {
    const f = this.getForm(); const field = f.fields.find(x => x.id === fid);
    if(field && field.options) { this.saveHistoryState(); field.options.push(`خيار ${field.options.length + 1}`); this.save(); this.renderCanvas(); this.renderSettings(); }
  },
  removeOption(fid, index) {
    const f = this.getForm(); const field = f.fields.find(x => x.id === fid);
    if(field && field.options && field.options.length > 1) { 
      this.saveHistoryState(); 
      field.options.splice(index, 1); 
      if(field.optionTargets) field.optionTargets.splice(index, 1);
      this.save(); this.renderCanvas(); this.renderSettings(); 
    }
  },
  
  selectField(id) { 
    if (this.state.selectedFieldId === id) return;
    this.state.selectedFieldId = id; 
    document.querySelectorAll('.builder-field-card').forEach(el => {
      if (el.dataset.fieldId === id) el.classList.add('selected');
      else el.classList.remove('selected');
    });
    const panel = document.getElementById('builder-settings');
    if (panel && panel.classList.contains('open')) {
      this.renderSettings();
    }
  },
  openSettingsModal(id) { this.selectField(id); this.renderSettings(); },
  closeSettings() { 
    this.state.selectedFieldId = null; 
    document.querySelectorAll('.builder-field-card').forEach(el => el.classList.remove('selected'));
    this.closeAllDrawers(); 
  },
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
    this.showToast('تم نسخ الحقل بنجاح ', 'success');
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
        this.showToast('خطأ في قراءة ملف النموذج ', 'error');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  },

  autoSaveTimer: null,
  
  triggerAutoSave() {
    if(this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    
    const saveBtn = document.getElementById('btn-save');
    // Store original innerHTML only if not currently auto-saving to prevent overwriting with the 'saving' state
    if(saveBtn && !saveBtn.dataset.originalHtml) {
      saveBtn.dataset.originalHtml = saveBtn.innerHTML;
    }
    
    if(saveBtn) {
       saveBtn.innerHTML = '<span class="desktop-text">جاري الحفظ...</span><span class="mobile-icon">⏳</span>';
       saveBtn.style.opacity = '0.7';
       saveBtn.style.pointerEvents = 'none';
    }

    this.autoSaveTimer = setTimeout(() => {
      this.saveCurrentForm(true).finally(() => {
        if(saveBtn) {
          saveBtn.innerHTML = saveBtn.dataset.originalHtml || '<span class="desktop-text">حفظ</span><span class="mobile-icon">💾</span>';
          saveBtn.style.opacity = '1';
          saveBtn.style.pointerEvents = 'auto';
          delete saveBtn.dataset.originalHtml;
        }
      });
    }, 1500);
  },

  async saveCurrentForm(isAutoSave = false) {
    const form = this.getForm();
    if(!form) return;
    
    if (!form.settings) form.settings = {};
    const settingProps = ['logoBase64', 'coverImageBase64', 'themeColor', 'backgroundStyle', 'darkModeEnabled', 'thankYouMessage', 'redirectUrl', 'allowResubmit', 'limitOneResponse', 'isQuizMode', 'allowQuizReview', 'maxResponses', 'deadline', 'enableTicketing'];
    settingProps.forEach(p => {
      if (form[p] !== undefined) form.settings[p] = form[p];
    });

    try {
      const { error } = await supabaseClient.from('forms').update({
        title: form.title,
        description: form.description,
        fields: form.fields,
        settings: form.settings,
        updated_at: new Date().toISOString()
      }).eq('id', form.id);
      
      if(error) throw error;
      if(!isAutoSave) {
        this.showToast('تم حفظ النموذج بنجاح ', 'success'); 
      }
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
    
    this.triggerAutoSave();
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
      this.triggerAutoSave();
      this.state.selectedFieldId = null;
      this.renderBuilder();
      this.showToast('تم التراجع', 'info');
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
      this.triggerAutoSave();
      this.state.selectedFieldId = null;
      this.renderBuilder();
      this.showToast('تم الإعادة', 'info');
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
    
    // Quiz mode settings
    document.getElementById('setting-quiz-mode').checked = form.isQuizMode || false;
    document.getElementById('setting-quiz-time').value = form.quizTimeLimit || '';
    const quizReviewEl = document.getElementById('setting-quiz-review');
    if (quizReviewEl) quizReviewEl.checked = form.allowQuizReview || false;
    const quizTimeSettings = document.getElementById('quiz-time-settings');
    if (quizTimeSettings) quizTimeSettings.style.display = form.isQuizMode ? 'block' : 'none';
    document.getElementById('setting-max-responses').value = form.maxResponses || '';
    document.getElementById('setting-deadline').value = form.deadline || '';
    document.getElementById('setting-enable-ticketing').checked = form.enableTicketing || false;
    document.getElementById('setting-ticket-color').value = form.ticketColor || form.themeColor || '#4f46e5';
    document.getElementById('setting-show-ticket-logo').checked = form.showTicketLogo || false;
    
    // Show/hide ticket designer based on ticketing state
    const ticketDesigner = document.getElementById('ticket-designer-settings');
    if (ticketDesigner) ticketDesigner.style.display = form.enableTicketing ? 'block' : 'none';
    
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

  async handleLogoUpload(event) {
    const file = event.target.files[0];
    if(!file) return;
    if(file.size > 2 * 1024 * 1024) {
      this.showToast('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت', 'error');
      return;
    }
    
    // Show loading state
    const logoPreview = document.getElementById('setting-logo-preview');
    logoPreview.innerHTML = `<span style="color:var(--text-tertiary);">جاري الرفع...</span>`;
    logoPreview.style.display = 'block';

    const publicUrl = await App.uploadFile(file, `logo_${this.getForm().id}`);
    if(publicUrl) {
      this.updateFormProp('logoBase64', publicUrl); // Keep prop name same for backward compatibility
      logoPreview.innerHTML = `<img src="${publicUrl}" style="max-height:80px; border-radius:4px;">`;
    } else {
      logoPreview.innerHTML = '';
      logoPreview.style.display = 'none';
    }
  },

  async handleCoverUpload(event) {
    const file = event.target.files[0];
    if(!file) return;
    if(file.size > 5 * 1024 * 1024) {
      this.showToast('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت', 'error');
      return;
    }
    
    // Show loading state
    const coverPreview = document.getElementById('setting-cover-preview');
    coverPreview.style.backgroundImage = 'none';
    coverPreview.innerHTML = `<span style="color:var(--text-tertiary); display:flex; align-items:center; justify-content:center; height:100%;">جاري الرفع...</span>`;
    coverPreview.style.display = 'block';

    const publicUrl = await App.uploadFile(file, `cover_${this.getForm().id}`);
    if(publicUrl) {
      this.updateFormProp('coverImageBase64', publicUrl);
      coverPreview.innerHTML = '';
      coverPreview.style.backgroundImage = `url(${publicUrl})`;
    } else {
      coverPreview.innerHTML = '';
      coverPreview.style.display = 'none';
    }
  },

  
});
