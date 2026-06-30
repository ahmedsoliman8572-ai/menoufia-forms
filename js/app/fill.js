// =============================================
// FILL FORM & SUBMISSION
// =============================================
Object.assign(window.App, {
  previewForm() { 
    this.state.isPreviewMode = true;
    this.navigate('fill', {formId: this.state.currentFormId}); 
  },

  async renderFillForm() {
    let form = this.getForm();
    const body = document.getElementById('fill-form');
    const header = document.getElementById('fill-header');

    if(!form && this.state.currentFormId) {
      if (header) header.innerHTML = '';
      if (body) body.innerHTML = '<div style="text-align:center; padding: 50px;"><div style="font-size:3rem; margin-bottom:15px; animation: pulse 1.5s infinite;"></div><h3 style="color:var(--primary);">جاري تحميل النموذج...</h3><p style="color:var(--text-secondary);">يرجى الانتظار بضع ثوانٍ</p></div>';
      
      form = await this.fetchFormFromCloud(this.state.currentFormId);
      
      if (form) {
        // Form fetched successfully! We don't save it to local forms so we don't clutter the user's dashboard,
        // but we just render it. 
        this.state.currentFillForm = form;
      } else {
        if (header) header.innerHTML = '';
        if (body) {
          body.innerHTML = `
            <div style="text-align:center; padding: 50px;">
              <div style="font-size:4rem; margin-bottom:15px;"></div>
              <h2 style="color:var(--danger); margin-bottom:15px;">النموذج غير موجود</h2>
              <p style="color:var(--text-secondary); margin-bottom:20px;">هذا النموذج غير موجود أو تم حذفه من قبل المنشئ.</p>
            </div>
          `;
        }
        return;
      }
    } else if (!form) {
      if (header) header.innerHTML = '';
      if (body) {
        body.innerHTML = `
          <div style="text-align:center; padding: 50px;">
            <div style="font-size:4rem; margin-bottom:15px;"></div>
            <h2 style="color:var(--danger); margin-bottom:15px;">النموذج غير موجود</h2>
            <p style="color:var(--text-secondary); margin-bottom:20px;">هذا النموذج غير موجود أو تم حذفه من قبل المنشئ.</p>
          </div>
        `;
      }
      return;
    }

    // Track view for completion rate
    if (!this.state.isPreviewMode) {
      form.views = (form.views || 0) + 1;
      this.save();
    }

    // Check limits
    const now = new Date();
    let submissionsCount = 0;
    if (form.maxResponses && !this.state.isPreviewMode) {
      try {
        const { data, error } = await supabaseClient.rpc('get_form_responses_count', {
          p_form_id: form.id
        });
        if (!error && data !== null) {
          submissionsCount = data;
        }
      } catch (e) {
        console.error("Error fetching count", e);
      }
    }
    
    let isClosed = false;
    let closedReason = '';

    if(form.limitOneResponse && !this.state.isPreviewMode && localStorage.getItem('submitted_' + form.id)) {
      isClosed = true;
      closedReason = 'لقد قمت بالرد على هذا النموذج مسبقاً. لا يُسمح بتكرار الردود.';
    } else if(form.deadline && new Date(form.deadline) < now) {
      isClosed = true;
      closedReason = 'لقد انتهى الوقت المخصص لاستقبال الردود على هذا النموذج.';
    } else if(form.maxResponses && submissionsCount >= form.maxResponses) {
      isClosed = true;
      closedReason = 'عفواً، لقد استكفى هذا النموذج بالعدد المطلوب من الردود ولا يمكن استقبال المزيد.';
    }


    if(isClosed) {
      header.innerHTML = `
        <div style="text-align:center; padding: 40px 20px;">
          <h2 style="color:var(--text-primary); margin-bottom:15px;">النموذج مغلق </h2>
          <p style="color:var(--text-secondary); font-size:1.1rem; line-height:1.6;">${closedReason}</p>
        </div>
      `;
      body.innerHTML = '';
      return;
    }

    this.state.currentStep = 0;

    const pages = [[]];
    form.fields.forEach(f => {
      if (f.type === 'section_break') pages.push([]);
      else pages[pages.length - 1].push(f);
    });
    this.state.totalPages = pages.length;

    // Apply Theme Color locally to page-fill
    const pageFill = document.getElementById('page-fill');
    pageFill.style.setProperty('--primary', form.themeColor || '#4f46e5');

    // Apply Dark Mode
    if(form.darkModeEnabled) {
      pageFill.classList.add('dark-mode');
    } else {
      pageFill.classList.remove('dark-mode');
    }

    // Apply Background Style
    if(form.backgroundStyle === 'gradient') {
      pageFill.style.background = 'linear-gradient(135deg, var(--bg-primary) 0%, var(--primary-light) 100%)';
    } else if(form.backgroundStyle === 'pattern') {
      pageFill.style.background = 'var(--bg-primary) url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")';
    } else {
      pageFill.style.background = 'var(--bg-primary)';
    }

    let logoHtml = '';
    if(form.logoBase64) {
      logoHtml = `<div style="text-align:center; margin-bottom:15px; position:relative; z-index:2;"><img src="${form.logoBase64}" style="max-height:80px; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>`;
    }

    let coverHtml = '';
    if (form.coverImageBase64) {
      coverHtml = `<div style="position:absolute; top:0; left:0; width:100%; height:100%; background:url(${form.coverImageBase64}) center/cover no-repeat; opacity:0.3; z-index:1;"></div>`;
      // Ensure the fill-header has relative positioning to contain the absolute cover
      document.getElementById('fill-header').style.position = 'relative';
      document.getElementById('fill-header').style.overflow = 'hidden';
    } else {
      document.getElementById('fill-header').style.position = '';
      document.getElementById('fill-header').style.overflow = '';
    }

    let themeToggleHtml = form.darkModeEnabled ? `
      <div style="position:absolute; top:20px; left:20px; z-index:10;">
        <button class="icon-btn" onclick="const p=document.getElementById('page-fill'); p.classList.toggle('dark-mode'); this.innerText=p.classList.contains('dark-mode') ? '☀️' : '🌙'" title="تبديل الوضع الليلي">🌙</button>
      </div>
    ` : '';

    let previewHtml = this.state.isPreviewMode ? `
      <div style="position:absolute; top:20px; right:20px; z-index:10;">
        <button class="btn btn-primary" onclick="App.state.isPreviewMode = false; App.navigate('builder', {formId: App.state.currentFormId})" title="العودة للتعديل" style="display:flex; align-items:center; gap:5px; box-shadow:var(--shadow-md);">
          <span>↩️</span>
          <span>العودة للتعديل</span>
        </button>
      </div>
    ` : '';

    document.getElementById('fill-header').innerHTML = `
      ${previewHtml}
      ${coverHtml}
      ${themeToggleHtml}
      ${logoHtml}
      <h1 style="position:relative; z-index:2;">${this.escape(form.title)}</h1>
      ${form.description ? `<p style="position:relative; z-index:2;">${this.escape(form.description)}</p>` : ''}
      <div id="step-indicator" class="step-indicator" style="position:relative; z-index:2; margin-top:10px; font-weight:bold; color:var(--primary);"></div>
    `;

    let html = '';

    pages.forEach((pageFields, step) => {
      html += `<div class="form-page ${step === 0 ? 'fade-in-up' : ''}" id="form-page-${step}" style="display: ${step === 0 ? 'block' : 'none'}">`;
      pageFields.forEach(field => {
        const reqStar = field.required ? '<span class="field-req">*</span>' : '';
        const origType = field.originalType || field.type;
        
        html += `
          <div class="form-field-group" id="group-${field.id}">
            <div class="field-label">${this.escape(field.label)} ${reqStar}</div>
            ${this.renderFillInput(field, origType)}
            <div class="error-text" id="error-${field.id}" style="display:none"></div>
            <div class="success-text" id="success-${field.id}" style="display:none"></div>
          </div>
        `;
      });
      
      html += `<div class="submit-area" style="display:flex; justify-content:center; gap:15px; flex-wrap:wrap; width:100%;">`;
      if (step > 0) {
        html += `<button type="button" class="btn btn-secondary" style="flex:1; min-width:120px; max-width:320px; padding:14px;" onclick="App.prevPage()">السابق</button>`;
      }
      
      if (step < pages.length - 1) {
        html += `<button type="button" class="btn btn-primary" style="flex:1; min-width:120px; max-width:320px; padding:14px;" onclick="App.nextPage()">التالي</button>`;
      } else {
        html += `<button type="submit" class="btn btn-primary submit-btn" id="submit-btn" style="flex:2; min-width:200px; max-width:320px;">إرسال النموذج </button>`;
      }
      html += `</div></div>`;
    });

    body.innerHTML = html;
    this.updatePageIndicator();
    this.updateProgress();
    this.evaluateConditions();

    // Auto-save Draft Implementation
    const draftStr = localStorage.getItem('draft_' + form.id);
    if(draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        Object.keys(draft).forEach(key => {
          const els = document.getElementsByName(key);
          if(els.length > 0) {
            const el = els[0];
            if(el.type === 'checkbox' || el.type === 'radio') {
              // We need a robust way for multiple choices. 
              // Simple way: if name is same and value matches
              els.forEach(r => {
                if(Array.isArray(draft[key]) ? draft[key].includes(r.value) : r.value === draft[key]) {
                  r.checked = true;
                }
              });
            } else {
              el.value = draft[key];
            }
          }
        });
        this.showToast('تم استعادة المسودة السابقة', 'info');
      } catch(e) {}
    }

    body.addEventListener('input', (e) => {
      const fd = new FormData(body.closest('form'));
      const draft = {};
      for (let [key, val] of fd.entries()) {
        if(draft[key]) {
          if(!Array.isArray(draft[key])) draft[key] = [draft[key]];
          draft[key].push(val);
        } else {
          draft[key] = val;
        }
      }
      localStorage.setItem('draft_' + form.id, JSON.stringify(draft));
      this.evaluateConditions();
    });

    this.initTimers(form);
    this.initSignatures(form);
  },

  // NOTE: evaluateConditions is defined in the PROGRESS & VALUE HELPERS section below.
  // A broken duplicate was here and has been removed.

  updatePageIndicator() {
    const indicator = document.getElementById('step-indicator');
    if(indicator) {
      if(this.state.totalPages > 1) {
        indicator.textContent = `صفحة ${this.state.currentStep + 1} من ${this.state.totalPages}`;
      } else {
        indicator.textContent = '';
      }
    }
  },

  nextPage() {
    if(this.validateCurrentPage()) {
      document.getElementById(`form-page-${this.state.currentStep}`).style.display = 'none';
      this.state.currentStep++;
      const next = document.getElementById(`form-page-${this.state.currentStep}`);
      next.style.display = 'block';
      next.classList.remove('fade-in-up');
      void next.offsetWidth;
      next.classList.add('fade-in-up');
      this.updatePageIndicator();
      window.scrollTo(0,0);
    }
  },

  prevPage() {
    document.getElementById(`form-page-${this.state.currentStep}`).style.display = 'none';
    this.state.currentStep--;
    const prev = document.getElementById(`form-page-${this.state.currentStep}`);
    prev.style.display = 'block';
    prev.classList.remove('fade-in-up');
    void prev.offsetWidth;
    prev.classList.add('fade-in-up');
    this.updatePageIndicator();
    window.scrollTo(0,0);
  },

  validateCurrentPage() {
    let isValid = true;
    const form = this.getForm();
    const pages = [[]];
    form.fields.forEach(f => {
      if (f.type === 'section_break') pages.push([]);
      else pages[pages.length - 1].push(f);
    });
    const currentFields = pages[this.state.currentStep];
    
    currentFields.forEach(f => {
      if (f.required) {
        const val = this.getVal(f);
        const grp = document.getElementById(`group-${f.id}`);
        // Only validate if field is visible (conditional logic check)
        if (grp && grp.style.display !== 'none') {
          if (!val || val.length === 0) {
            this.showErr(f.id, 'هذا الحقل مطلوب');
            isValid = false;
          } else {
            const err = document.getElementById(`error-${f.id}`);
            if(err) err.style.display = 'none';
            grp.classList.remove('has-error');
          }
        }
      }
    });
    return isValid;
  },

  renderFillInput(field, type) {
    const ph = this.escape(field.placeholder || '');
    const id = `input-${field.id}`;
    
    switch(type) {
      case 'arabic_name':
        return `
          <input type="text" class="input-base" id="${id}" name="${field.id}" placeholder="${ph}"
            oninput="App.validateArabicNameLive(this, '${field.id}')" autocomplete="off">
          <div class="input-meta-row">
            <div class="field-help">يجب إدخال 4 كلمات على الأقل بحروف عربية فقط (بدون أرقام أو حروف إنجليزية)</div>
            <div class="char-counter" id="counter-${field.id}">0 / 4 كلمات</div>
          </div>`;
      case 'english_name':
        return `
          <input type="text" class="input-base" id="${id}" name="${field.id}" placeholder="${ph}"
            oninput="App.validateEnglishNameLive(this, '${field.id}')" dir="ltr" style="text-align:left;" autocomplete="off">
          <div class="input-meta-row">
            <div class="field-help">Enter at least 4 words using English letters only (no numbers or Arabic)</div>
            <div class="char-counter" id="counter-${field.id}">0 / 4 words</div>
          </div>`;
      case 'national_id':
        return `
          <input type="tel" class="input-base" id="${id}" name="${field.id}" placeholder="${ph}" maxlength="14"
            oninput="App.validateNationalIdLive(this, '${field.id}')" dir="ltr" style="text-align:left; letter-spacing: 3px; font-weight:700; font-size:1.15rem;" autocomplete="off">
          <div class="input-meta-row">
            <div class="field-help">يجب إدخال 14 رقماً بالضبط (أرقام فقط)</div>
            <div class="char-counter" id="counter-${field.id}">0 / 14</div>
          </div>
          <div id="nid-data-${field.id}" style="display:none; margin-top:10px; padding:10px; background:var(--bg-glass); border-radius:var(--radius-md); border-right:3px solid var(--primary); font-size:0.9rem;">
            <!-- Extracted data will be shown here -->
          </div>`;

      case 'email':
        return `<input type="email" class="input-base" id="${id}" name="${field.id}" placeholder="${ph || 'example@domain.com'}" oninput="App.validateEmailLive(this, '${field.id}')" dir="ltr" style="text-align:left;">`;
      case 'phone':
      case 'whatsapp':
        return `<input type="tel" class="input-base" id="${id}" name="${field.id}" placeholder="${ph || '01xxxxxxxxx'}" maxlength="11" oninput="App.validatePhoneLive(this, '${field.id}')" dir="ltr" style="text-align:left;">
          <div class="input-meta-row">
            <div class="field-help">رقم موبايل مصري يبدأ بـ 01 (11 رقم)</div>
            <div class="char-counter" id="counter-${field.id}">0 / 11</div>
          </div>`;
      case 'url':
        return `<input type="url" class="input-base" id="${id}" name="${field.id}" placeholder="${ph || 'https://...'}" oninput="App.validateUrlLive(this, '${field.id}')" dir="ltr" style="text-align:left;">`;
      case 'date':
        return `<input type="date" class="input-base" id="${id}" name="${field.id}" onchange="App.updateProgress()">`;
      case 'time':
        return `<input type="time" class="input-base" id="${id}" name="${field.id}" onchange="App.updateProgress()">`;
      case 'file_upload':
        return `
          <input type="file" accept="image/*" class="input-base" id="${id}" onchange="App.handleImageUpload(event, '${field.id}')" style="padding:10px;">
          <input type="hidden" id="hidden-${field.id}" name="${field.id}">
          <div id="preview-${field.id}" style="margin-top:10px; display:none; max-width:200px; border-radius:8px; overflow:hidden; border:2px solid var(--border-color);">
             <img src="" style="width:100%; height:auto; display:block;">
          </div>
          <div class="field-help" id="upload-status-${field.id}">اختر صورة للرفع</div>
        `;
      case 'signature':
        return `
          <div style="border:2px dashed var(--border-color); border-radius:var(--radius-md); background:var(--bg-card); padding:10px; text-align:center;">
            <canvas id="sig-canvas-${field.id}" width="300" height="150" style="background:#fff; border:1px solid #ccc; border-radius:4px; touch-action:none;"></canvas>
            <br>
            <button type="button" class="btn btn-ghost" onclick="App.clearSignature('${field.id}')" style="margin-top:10px; font-size:0.9rem;">مسح التوقيع </button>
            <input type="hidden" id="hidden-sig-${field.id}" name="${field.id}">
          </div>
        `;
      case 'timer':
        return `
          <div class="timer-display" id="timer-${field.id}" data-minutes="${field.placeholder || 15}" style="font-size:2rem; font-weight:bold; color:var(--primary); text-align:center; padding:20px; background:var(--bg-glass); border-radius:var(--radius-md);">
            --:--
          </div>
          <input type="hidden" name="${field.id}" value="Timer completed">
        `;
      case 'address_detailed':
        return `<textarea class="input-base" id="${id}" name="${field.id}" placeholder="${ph || 'المحافظة - المركز/المدينة - اسم الشارع أو القرية - رقم العمارة/المنزل'}" rows="3" oninput="App.updateProgress()"></textarea>`;
      case 'short_text':
        return `<input type="text" class="input-base" id="${id}" name="${field.id}" placeholder="${ph}" oninput="App.updateProgress()">`;
      case 'number':
        return `<input type="number" class="input-base" id="${id}" name="${field.id}" placeholder="${ph}" oninput="App.updateProgress()">`;
      case 'long_text':
        return `<textarea class="input-base" id="${id}" name="${field.id}" placeholder="${ph}" oninput="App.updateProgress()"></textarea>`;
      case 'gender':
      case 'union_member':
      case 'single_choice':
        return `<div class="choice-wrap" id="${id}">
          ${(field.options||[]).map((o,i) => `
            <label class="choice-label">
              <input type="radio" name="${field.id}" value="${this.escape(o)}" onchange="App.updateProgress()">
              ${this.escape(o)}
            </label>
          `).join('')}
        </div>`;
      case 'multiple_choice':
        return `<div class="choice-wrap" id="${id}">
          ${(field.options||[]).map((o,i) => `
            <label class="choice-label">
              <input type="checkbox" name="${field.id}" value="${this.escape(o)}" onchange="App.updateProgress()">
              ${this.escape(o)}
            </label>
          `).join('')}
        </div>`;
      case 'governorate':
        return `<div class="select-wrap">
          <select class="input-base" id="${id}" name="${field.id}" onchange="App.handleGovernorateChange(this); App.updateProgress()">
            <option value="" disabled selected>اختر من القائمة...</option>
            ${(field.options||[]).map(o => `<option value="${this.escape(o)}">${this.escape(o)}</option>`).join('')}
          </select>
        </div>`;
      case 'markaz':
      case 'faculty':
      case 'academic_year':
      case 'dropdown':
        return `<div class="select-wrap">
          <select class="input-base" id="${id}" name="${field.id}" onchange="App.updateProgress()">
            <option value="" disabled selected>اختر من القائمة...</option>
            ${(field.options||[]).map(o => `<option value="${this.escape(o)}">${this.escape(o)}</option>`).join('')}
          </select>
        </div>`;
      case 'rating':
        return `<div class="rating-wrap" id="${id}" style="display:flex; gap:8px; font-size:2rem; cursor:pointer;">
          ${[1,2,3,4,5].map(n => `<span class="star" data-val="${n}" onclick="App.setRating('${field.id}', ${n})" style="color:#ccc;"></span>`).join('')}
          <input type="hidden" id="rating-val-${field.id}" name="${field.id}" value="">
        </div>`;
      case 'linear_scale':
        return `<div class="linear-scale-wrap" id="${id}" style="display:flex; justify-content:space-between; gap:4px; max-width:400px; overflow-x:auto; padding-bottom:10px;">
          ${[1,2,3,4,5,6,7,8,9,10].map(n => `
            <label style="display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer;">
              <span style="font-size:0.9rem; font-weight:600;">${n}</span>
              <input type="radio" name="${field.id}" value="${n}" onchange="App.updateProgress()" style="width:18px; height:18px; cursor:pointer;">
            </label>
          `).join('')}
        </div>`;
      case 'payment':
        return `<div class="payment-mock-wrap" style="border:1px solid var(--border); padding:15px; border-radius:8px; background:var(--bg-card); box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="font-weight:bold; color:var(--text-primary);">بطاقة ائتمان</span>
            <span></span>
          </div>
          <input type="text" class="input-base" id="input-${field.id}-card" placeholder="رقم البطاقة (0000 0000 0000 0000)" style="margin-bottom:10px; font-family:monospace;">
          <div style="display:flex; gap:10px;">
            <input type="text" class="input-base" id="input-${field.id}-exp" placeholder="MM/YY" style="width:50%; text-align:center;">
            <input type="text" class="input-base" id="input-${field.id}-cvv" placeholder="CVV" style="width:50%; text-align:center;">
          </div>
          <input type="hidden" id="input-${field.id}" name="${field.id}" value="Mock_Payment_Captured">
        </div>`;
      default: return '';
    }
  },

    validateArabicNameLive(input, fieldId) {
    const cursorPos = input.selectionStart;
    const original = input.value;
    const filtered = Validators.stripNonArabic(original);
    
    if(filtered !== original) {
      input.value = filtered;
      const diff = original.length - filtered.length;
      input.setSelectionRange(cursorPos - diff, cursorPos - diff);
    }
    
    const words = Validators.wordCount(input.value);
    const counter = document.getElementById(`counter-${fieldId}`);
    const group = document.getElementById(`group-${fieldId}`);
    const errEl = document.getElementById(`error-${fieldId}`);
    const successEl = document.getElementById(`success-${fieldId}`);
    
    if(counter) {
      counter.textContent = `${words} / 4 كلمات`;
      counter.className = 'char-counter ' + (words >= 4 ? 'ok' : (words > 0 ? 'warn' : ''));
    }
    
    input.classList.remove('input-error', 'input-valid');
    group.classList.remove('has-error', 'is-valid');
    errEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if(input.value.trim().length > 0) {
      if(words >= 4) {
        input.classList.add('input-valid');
        group.classList.add('is-valid');
        successEl.innerHTML = 'الاسم صحيح';
        successEl.style.display = 'flex';
      } else {
        input.classList.add('input-error');
        errEl.innerHTML = `أدخل ${4 - words} كلمات أخرى على الأقل`;
        errEl.style.display = 'flex';
      }
    }
    
    this.updateProgress();
  },

  validateEnglishNameLive(input, fieldId) {
    const cursorPos = input.selectionStart;
    const original = input.value;
    const filtered = Validators.stripNonEnglish(original);
    
    if(filtered !== original) {
      input.value = filtered;
      const diff = original.length - filtered.length;
      input.setSelectionRange(cursorPos - diff, cursorPos - diff);
    }
    
    const words = Validators.wordCount(input.value);
    const counter = document.getElementById(`counter-${fieldId}`);
    const group = document.getElementById(`group-${fieldId}`);
    const errEl = document.getElementById(`error-${fieldId}`);
    const successEl = document.getElementById(`success-${fieldId}`);
    
    if(counter) {
      counter.textContent = `${words} / 4 words`;
      counter.className = 'char-counter ' + (words >= 4 ? 'ok' : (words > 0 ? 'warn' : ''));
    }
    
    input.classList.remove('input-error', 'input-valid');
    group.classList.remove('has-error', 'is-valid');
    errEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if(input.value.trim().length > 0) {
      if(words >= 4) {
        input.classList.add('input-valid');
        group.classList.add('is-valid');
        successEl.innerHTML = 'Name is valid';
        successEl.style.display = 'flex';
      } else {
        input.classList.add('input-error');
        errEl.innerHTML = `Enter at least ${4 - words} more word(s)`;
        errEl.style.display = 'flex';
      }
    }
    
    this.updateProgress();
  },

  validateNationalIdLive(input, fieldId) {
    const cursorPos = input.selectionStart;
    const original = input.value;
    const filtered = Validators.stripNonDigits(original).slice(0, 14);
    
    if(filtered !== original) {
      input.value = filtered;
      const diff = original.length - filtered.length;
      input.setSelectionRange(Math.max(0, cursorPos - diff), Math.max(0, cursorPos - diff));
    }
    
    const len = input.value.length;
    const counter = document.getElementById(`counter-${fieldId}`);
    const group = document.getElementById(`group-${fieldId}`);
    const errEl = document.getElementById(`error-${fieldId}`);
    const successEl = document.getElementById(`success-${fieldId}`);
    
    if(counter) {
      counter.textContent = `${len} / 14`;
      counter.className = 'char-counter ' + (len === 14 ? 'ok' : (len > 0 ? 'warn' : ''));
    }
    
    input.classList.remove('input-error', 'input-valid');
    group.classList.remove('has-error', 'is-valid');
    errEl.style.display = 'none';
    successEl.style.display = 'none';
    
    const dataDiv = document.getElementById(`nid-data-${fieldId}`);
    if(len > 0) {
      if(Validators.isValidNationalId(input.value)) {
        input.classList.add('input-valid');
        group.classList.add('is-valid');
        successEl.innerHTML = 'الرقم القومي صحيح';
        successEl.style.display = 'flex';
        
        const data = Validators.parseNationalId(input.value);
        if(data && dataDiv) {
          dataDiv.innerHTML = `<strong>البيانات المستخرجة:</strong><br>تاريخ الميلاد: ${data.birthDate} <br>المحافظة: ${data.governorate} <br>النوع: ${data.gender}`;
          dataDiv.style.display = 'block';
        }
      } else {
        input.classList.add('input-error');
        errEl.innerHTML = `تبقى ${14 - len} رقم`;
        errEl.style.display = 'flex';
        if(dataDiv) dataDiv.style.display = 'none';
      }
    } else {
      if(dataDiv) dataDiv.style.display = 'none';
    }
    
    this.updateProgress();
  },

  validateEmailLive(input, fieldId) {
    const val = input.value.trim();
    const group = document.getElementById(`group-${fieldId}`);
    const errEl = document.getElementById(`error-${fieldId}`);
    const successEl = document.getElementById(`success-${fieldId}`);
    
    input.classList.remove('input-error', 'input-valid');
    group.classList.remove('has-error', 'is-valid');
    errEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if(val.length > 0) {
      if(Validators.isEmail(val)) {
        input.classList.add('input-valid');
        group.classList.add('is-valid');
        successEl.innerHTML = 'بريد إلكتروني صحيح';
        successEl.style.display = 'flex';
      } else {
        input.classList.add('input-error');
        errEl.innerHTML = 'صيغة البريد الإلكتروني غير صحيحة';
        errEl.style.display = 'flex';
      }
    }
    this.updateProgress();
  },

  validatePhoneLive(input, fieldId) {
    let val = Validators.stripNonDigits(input.value).slice(0, 11);
    if(val !== input.value) input.value = val;

    const len = val.length;
    const counter = document.getElementById(`counter-${fieldId}`);
    if(counter) counter.textContent = `${len} / 11`;

    const group = document.getElementById(`group-${fieldId}`);
    const errEl = document.getElementById(`error-${fieldId}`);
    const successEl = document.getElementById(`success-${fieldId}`);
    
    input.classList.remove('input-error', 'input-valid');
    group.classList.remove('has-error', 'is-valid');
    errEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if(len > 0) {
      if(Validators.isEgyptianPhone(val)) {
        input.classList.add('input-valid');
        group.classList.add('is-valid');
        successEl.innerHTML = 'رقم موبايل صحيح';
        successEl.style.display = 'flex';
      } else {
        input.classList.add('input-error');
        errEl.innerHTML = 'يجب أن يكون 11 رقماً ويبدأ بـ 01';
        errEl.style.display = 'flex';
      }
    }
    this.updateProgress();
  },



  validateUrlLive(input, fieldId) {
    const val = input.value.trim();
    const group = document.getElementById(`group-${fieldId}`);
    const errEl = document.getElementById(`error-${fieldId}`);
    const successEl = document.getElementById(`success-${fieldId}`);
    
    input.classList.remove('input-error', 'input-valid');
    group.classList.remove('has-error', 'is-valid');
    errEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if(val.length > 0) {
      if(Validators.isUrl(val)) {
        input.classList.add('input-valid');
        group.classList.add('is-valid');
        successEl.innerHTML = 'رابط صحيح';
        successEl.style.display = 'flex';
      } else {
        input.classList.add('input-error');
        errEl.innerHTML = 'صيغة الرابط غير صحيحة (مثال: https://google.com)';
        errEl.style.display = 'flex';
      }
    }
    this.updateProgress();
  },

  setRating(fieldId, value) {
    const hiddenInput = document.getElementById(`rating-val-${fieldId}`);
    if(!hiddenInput) return;
    hiddenInput.value = value;
    const wrap = hiddenInput.parentElement;
    const stars = wrap.querySelectorAll('.star');
    stars.forEach(s => {
      if(parseInt(s.dataset.val) <= value) {
        s.style.color = '#ffb400';
        s.style.transform = 'scale(1.2)';
        s.style.transition = 'all 0.2s ease';
      } else {
        s.style.color = '#ccc';
        s.style.transform = 'scale(1)';
      }
    });
    this.updateProgress();
  },

  handleGovernorateChange(selectElement) {
    const govValue = selectElement.value;
    const centers = typeof EGYPT_CENTERS !== 'undefined' ? (EGYPT_CENTERS[govValue] || []) : [];
    
    const form = this.getForm();
    if (!form) return;
    
    const markazField = form.fields.find(f => f.originalType === 'markaz');
    if (markazField) {
      const markazSelect = document.getElementById(`input-${markazField.id}`);
      if (markazSelect) {
        let html = '<option value="" disabled selected>اختر من القائمة...</option>';
        centers.forEach(c => {
          html += `<option value="${this.escape(c)}">${this.escape(c)}</option>`;
        });
        markazSelect.innerHTML = html;
        markazSelect.value = '';
      }
    }
  },

    updateProgress() {
    const form = this.getForm();
    if(!form) return;
    let filled = 0;
    form.fields.forEach(f => {
      const val = this.getVal(f);
      if(val && val.length > 0) filled++;
    });
    const pct = form.fields.length ? (filled / form.fields.length) * 100 : 0;
    const bar = document.getElementById('fill-progress');
    if(bar) bar.style.width = pct + '%';
    
    this.evaluateConditions();
  },

  evaluateConditions() {
    const form = this.getForm();
    if(!form) return;
    form.fields.forEach(field => {
      if (field.conditionField) {
        const targetField = form.fields.find(f => f.id === field.conditionField);
        if (targetField) {
          const targetVal = this.getVal(targetField);
          const grp = document.getElementById(`group-${field.id}`);
          if (grp) {
            // Very simple equality condition
            if (targetVal === field.conditionValue) {
              grp.style.display = 'block';
            } else {
              grp.style.display = 'none';
              // Optionally clear value when hidden?
            }
          }
        }
      }
    });
  },

  getVal(field) {
    if(field.type === 'single_choice' || field.originalType === 'gender' || field.originalType === 'union_member' || field.type === 'linear_scale') {
      const el = document.querySelector(`input[name="${field.id}"]:checked`);
      return el ? el.value : '';
    }
    if(field.type === 'multiple_choice') {
      const els = document.querySelectorAll(`input[name="${field.id}"]:checked`);
      return Array.from(els).map(x => x.value).join('، ');
    }
    if(field.type === 'file_upload') {
      const el = document.getElementById(`hidden-${field.id}`);
      return el ? el.value.trim() : '';
    }
    if(field.type === 'signature') {
      const el = document.getElementById(`hidden-sig-${field.id}`);
      return el ? el.value.trim() : '';
    }
    if(field.type === 'timer') {
      return 'Timer completed';
    }
    // Rating field uses a different ID pattern
    if(field.originalType === 'rating' || field.type === 'rating') {
      const el = document.getElementById(`rating-val-${field.id}`);
      return el ? el.value.trim() : '';
    }
    const el = document.getElementById(`input-${field.id}`);
    return el ? el.value.trim() : '';
  },

  showErr(fid, msg) {
    const grp = document.getElementById(`group-${fid}`);
    const err = document.getElementById(`error-${fid}`);
    const success = document.getElementById(`success-${fid}`);
    if(grp) grp.classList.add('has-error');
    if(grp) grp.classList.remove('is-valid');
    if(err) { err.innerHTML = `${msg}`; err.style.display = 'flex'; }
    if(success) success.style.display = 'none';
  },

  clearErrs() {
    document.querySelectorAll('.form-field-group').forEach(el => { el.classList.remove('has-error'); el.classList.remove('is-valid'); });
    document.querySelectorAll('.error-text').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.success-text').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.input-base').forEach(el => { el.classList.remove('input-error'); el.classList.remove('input-valid'); });
  },

    async handleSubmit(e) {
    e.preventDefault();
    const form = this.getForm();
    this.clearErrs();
    let isValid = true;
    const payloadData = {};

    form.fields.forEach(field => {
      if (field.type === 'section_break') return;

      const grp = document.getElementById(`group-${field.id}`);
      if (grp && grp.style.display === 'none') return;

      const val = this.getVal(field);
      const origType = field.originalType || field.type;
      payloadData[field.label] = val;

      // Required check
      if(field.required && !val) {
        isValid = false; this.showErr(field.id, 'هذا الحقل مطلوب'); return;
      }

      if(val) {
        // Smart Validation: Arabic Name
        if(origType === 'arabic_name') {
          if(!Validators.isArabicOnly(val)) {
            isValid = false; this.showErr(field.id, 'يرجى إدخال حروف عربية فقط (بدون أرقام أو حروف إنجليزية)');
          } else if (Validators.wordCount(val) < 4) {
            isValid = false; this.showErr(field.id, 'يرجى إدخال الاسم رباعياً (4 كلمات على الأقل)');
          }
        }
        // Smart Validation: English Name
        else if(origType === 'english_name') {
          if(!Validators.isEnglishOnly(val)) {
            isValid = false; this.showErr(field.id, 'يرجى إدخال حروف إنجليزية فقط (بدون أرقام أو حروف عربية)');
          } else if (Validators.wordCount(val) < 4) {
            isValid = false; this.showErr(field.id, 'Please enter at least 4 words');
          }
        }
        // Smart Validation: National ID
        else if(origType === 'national_id') {
          if(!Validators.isValidNationalId(val)) {
            isValid = false; this.showErr(field.id, 'الرقم القومي يجب أن يتكون من 14 رقماً بالضبط');
          }
        }
        // Smart Validation: Email
        else if(origType === 'email') {
          if(!Validators.isEmail(val)) {
            isValid = false; this.showErr(field.id, 'صيغة البريد الإلكتروني غير صحيحة');
          }
        }
        // Smart Validation: Phone
        else if(origType === 'phone' || origType === 'whatsapp') {
          if(!Validators.isEgyptianPhone(val)) {
            isValid = false; this.showErr(field.id, 'رقم الموبايل يجب أن يتكون من 11 رقم ويبدأ بـ 01');
          }
        }
        // Smart Validation: Tax ID
        else if(origType === 'tax_id') {
          if(!Validators.isTaxId(val)) {
            isValid = false; this.showErr(field.id, 'البطاقة الضريبية يجب أن تتكون من 9 أرقام');
          }
        }
        // Smart Validation: URL
        else if(origType === 'url') {
          if(!Validators.isUrl(val)) {
            isValid = false; this.showErr(field.id, 'الرابط غير صحيح (يجب أن يبدأ بـ http:// أو https://)');
          }
        }
      }
    });

    if(!isValid) {
      const firstErr = document.querySelector('.has-error');
      if(firstErr) {
        const pageEl = firstErr.closest('.form-page');
        if (pageEl) {
          const pageIdMatch = pageEl.id.match(/form-page-(\d+)/);
          if (pageIdMatch) {
            const pageIndex = parseInt(pageIdMatch[1]);
            if (this.state.currentStep !== pageIndex) {
              document.getElementById(`form-page-${this.state.currentStep}`).style.display = 'none';
              this.state.currentStep = pageIndex;
              document.getElementById(`form-page-${this.state.currentStep}`).style.display = 'block';
              this.updatePageIndicator();
            }
          }
        }
        setTimeout(() => firstErr.scrollIntoView({behavior: 'smooth', block: 'center'}), 50);
      }
      this.showToast('يرجى تصحيح الأخطاء في النموذج', 'error');
      return;
    }

    const btn = document.getElementById('submit-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-loading"></span> جاري الإرسال...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
      let quizHtml = '';
      if(form.isQuizMode) {
        let totalPoints = 0;
        let earnedPoints = 0;
        form.fields.forEach(f => {
          if(f.points > 0 && f.correctAnswer) {
            totalPoints += (f.points || 0);
            if(payloadData[f.label] === f.correctAnswer) {
              earnedPoints += (f.points || 0);
            }
          }
        });
        payloadData['_quizScore'] = `${earnedPoints} / ${totalPoints}`;
        quizHtml = `
          <div style="background:var(--bg-card); border:2px solid #10B981; border-radius:12px; padding:20px; margin:20px auto; max-width:400px;">
            <h3 style="color:#10B981; margin:0 0 10px 0;">🎯 نتيجة الاختبار</h3>
            <div style="font-size:2rem; font-weight:900;">${earnedPoints} <span style="font-size:1.2rem; color:var(--text-secondary);">/ ${totalPoints}</span></div>
          </div>
        `;
      }

      const payload = {
        form_id: form.id,
        data: payloadData,
        submitted_at: new Date().toISOString()
      };

      // --- PRE-SUBMIT DUPLICATE CHECK (Backend) ---
      if (form.limitOneResponse && !this.state.isPreviewMode) {
        btn.innerHTML = 'جاري التحقق...';
        let duplicateFound = false;
        
        for (let key in payloadData) {
          const val = payloadData[key];
          if (!val || typeof val !== 'string' || val.trim() === '') continue;
          
          // Identify if this field is a Phone, Email, or National ID
          const isPhone = key.includes('موبايل') || key.includes('هاتف') || key.includes('جوال') || key.includes('تليفون') || key.toLowerCase().includes('phone') || key.includes('واتساب');
          const isEmail = key.includes('البريد') || key.toLowerCase().includes('email');
          const isNationalID = key.includes('قومي') || key.includes('بطاقة');
          
          if (isPhone || isEmail || isNationalID) {
            try {
              const filterObj = {};
              filterObj[key] = val;
              const { data: existingData } = await supabaseClient
                .from('responses')
                .select('id')
                .eq('form_id', form.id)
                .contains('data', filterObj)
                .limit(1);
                
              if (existingData && existingData.length > 0) {
                duplicateFound = true;
                break;
              }
            } catch(err) {
              console.error('Error checking duplicate:', err);
            }
          }
        }
        
        if (duplicateFound) {
          const header = document.getElementById('fill-header');
          const body = document.getElementById('fill-form');
          if (header) header.innerHTML = '';
          if (body) {
            body.innerHTML = `
              <div style="text-align:center; padding: 50px; animation: slideUp 0.5s ease-out;">
                <div style="font-size:4rem; margin-bottom:15px;"></div>
                <h2 style="color:var(--danger); margin-bottom:15px;">عفواً، تم تسجيل ردك مسبقاً</h2>
                <p style="color:var(--text-secondary); line-height:1.6;">لقد وجدنا أن بياناتك (مثل رقم الهاتف أو الإيميل أو الرقم القومي) مسجلة لدينا بالفعل في هذا النموذج. لا يُسمح بالتكرار.</p>
              </div>
            `;
          }
          return;
        }
      }
      // --------------------------------------------

      let responseId = null;
      try {
        const { data: insertedData, error } = await supabaseClient.from('responses').insert([payload]).select();
        if(error) throw error;
        responseId = insertedData && insertedData.length > 0 ? insertedData[0].id : null;

        // --- CRM Data Extraction ---
        let contactName = '';
        let contactEmail = '';
        let contactPhone = '';
        
        for (let key in payloadData) {
          const val = payloadData[key];
          if(!val || typeof val !== 'string') continue;
          if (key.includes('الاسم') || key.includes('اسم') || key.toLowerCase().includes('name')) {
            if(!contactName) contactName = val;
          }
          if (key.includes('البريد') || key.toLowerCase().includes('email')) {
            if(!contactEmail && val.includes('@')) contactEmail = val;
          }
          if (key.includes('موبايل') || key.includes('هاتف') || key.includes('جوال') || key.includes('تليفون') || key.toLowerCase().includes('phone') || key.includes('واتساب') || (key.includes('رقم') && !key.includes('قومي') && !key.includes('جلوس') && !key.includes('بطاقة') && !key.includes('سري'))) {
            if(!contactPhone && val.match(/^[0-9+ ]{8,15}$/)) contactPhone = val;
          }
        }

        if (contactName || contactEmail || contactPhone) {
          try {
            // If email exists, we upsert based on email
            const contactPayload = { 
              name: contactName || 'مجهول', 
              email: contactEmail || null, 
              phone: contactPhone || null,
              updated_at: new Date().toISOString()
            };
            if(contactEmail) {
              await supabaseClient.from('contacts').upsert(contactPayload, { onConflict: 'email' });
            } else {
              // no email, just insert to avoid unique constraint issues if email is null 
              // (wait, nulls are usually distinct in postgres so it's fine, but upsert without conflict key on phone isn't set up)
              await supabaseClient.from('contacts').insert([contactPayload]);
            }
          } catch(err) {
            console.error('CRM Insert Error:', err);
          }
        }
        // -----------------------------

      } catch(e) {
        console.error('Failed to submit response:', e);
        this.showToast('حدث خطأ أثناء الإرسال', 'error');
        btn.innerHTML = origText;
        btn.disabled = false;
        btn.style.opacity = '1';
        return;
      }

      // Success UI
      let redirectHtml = '';
      if(form.redirectUrl && Validators.isUrl(form.redirectUrl)) {
        redirectHtml = `<p style="font-size:0.9rem; color:var(--text-tertiary); margin-top:20px;">سيتم إعادة توجيهك تلقائياً خلال ثوانٍ...</p>`;
        setTimeout(() => {
          window.location.href = form.redirectUrl;
        }, 3000);
      }

      // Show confetti effect
      // this.showConfetti();

      let qrHtml = '';
      if(form.enableTicketing && responseId) {
        const ticketColor = form.ticketColor || form.themeColor || '#4f46e5';
        const logoHtml = (form.showTicketLogo && form.logoBase64) ? `<img src="${form.logoBase64}" style="max-height: 60px; margin-bottom: 15px; border-radius: 8px;">` : '';

        qrHtml = `
          <div style="margin: 30px auto; max-width: 320px; background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; overflow: hidden; border: 1px solid #f3f4f6; position: relative; direction: rtl;">
            <div style="background: ${ticketColor}; padding: 25px 20px; color: white;">
              ${logoHtml}
              <h4 style="margin: 0; font-size: 1.3rem; font-weight: 800;">تذكرة دخول</h4>
              <p style="margin: 5px 0 0 0; font-size: 0.9rem; opacity: 0.9;">${this.escape(form.title)}</p>
            </div>
            <div style="padding: 25px 20px;">
              <div id="ticket-qr-code" style="display: inline-flex; justify-content: center; align-items: center; background: white; padding: 15px; border-radius: 12px; border: 2px dashed #e5e7eb; min-width: 200px; min-height: 200px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);"></div>
              <p style="margin: 20px 0 15px 0; font-size: 0.9rem; color: #6b7280; line-height: 1.5;">احتفظ بصورة التذكرة لعرضها للمنظمين عند بوابات الدخول.</p>
              <button type="button" onclick="App.downloadTicketQR()" style="background: ${ticketColor}; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <span style="font-size:1.1rem;">📥</span> تحميل التذكرة
              </button>
            </div>
          </div>
        `;
      }

      document.querySelector('.fill-body').innerHTML = `
        <div style="text-align:center; padding: 60px 20px;">
          <div class="success-checkmark">✓</div>
          <h2 style="font-size:1.8rem; font-weight:900; background:var(--primary-gradient-vivid); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:12px;">تم الإرسال بنجاح!</h2>
          <p style="color:var(--text-secondary); font-size:1.05rem; margin-bottom:36px; line-height:1.8;">${this.escape(form.thankYouMessage || 'شكراً لك، تم تسجيل ردك في قاعدة البيانات بنجاح.')}</p>
          ${quizHtml}
          ${qrHtml}
          <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
            ${(!form.limitOneResponse && form.allowResubmit !== false) ? `<button class="btn btn-primary" onclick="App.renderFillForm()">إرسال رد آخر</button>` : ''}
          </div>
          ${redirectHtml}
        </div>
      `;

      if(form.enableTicketing && responseId) {
        setTimeout(() => {
          new QRCode(document.getElementById("ticket-qr-code"), {
            text: responseId,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
          });
        }, 100);
      }
      const progressBar = document.getElementById('fill-progress');
      if(progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.background = 'linear-gradient(90deg, #10B981, #34D399)';
      }
      // Track submission in real stats
      this.state.stats.totalSubmissions = (this.state.stats.totalSubmissions || 0) + 1;
      this.save();

      // Record device submission if limited
      if(form.limitOneResponse && !this.state.isPreviewMode) {
        localStorage.setItem('submitted_' + form.id, 'true');
      }

      window.scrollTo(0,0);
      this.showToast('تم إرسال البيانات بنجاح', 'success');
      localStorage.removeItem('draft_' + form.id);

    } catch (error) {
      console.error("Submission Error:", error);
      this.showToast('حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة مرة أخرى', 'error');
      btn.innerHTML = origText;
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  },

  async handleImageUpload(event, fieldId) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById(`preview-${fieldId}`);
    const previewImg = previewContainer.querySelector('img');
    const hiddenInput = document.getElementById(`hidden-${fieldId}`);
    const statusText = document.getElementById(`upload-status-${fieldId}`);

    if (!file) {
      previewContainer.style.display = 'none';
      hiddenInput.value = '';
      statusText.innerHTML = 'اختر صورة للرفع';
      return;
    }

    try {
      statusText.innerHTML = '<span style="color:var(--primary);">جاري الرفع للسحابة... </span>';
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `forms/${this.state.currentFormId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabaseClient.storage
        .from('uploads')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabaseClient.storage
        .from('uploads')
        .getPublicUrl(filePath);

      previewImg.src = publicUrl;
      previewContainer.style.display = 'block';
      hiddenInput.value = publicUrl;
      statusText.innerHTML = '<span style="color:var(--success);">تم الرفع بنجاح </span>';
      this.updateProgress();

    } catch(err) {
      statusText.innerHTML = `<span style="color:var(--danger);">خطأ: ${err.message}</span>`;
      previewContainer.style.display = 'none';
      hiddenInput.value = '';
    }
  },

  initTimers(form) {
    const timerFields = form.fields.filter(f => f.type === 'timer');
    if(timerFields.length === 0) return;

    // Use the first timer found (multiple timers per form usually doesn't make sense)
    const timerField = timerFields[0];
    const displayEl = document.getElementById(`timer-${timerField.id}`);
    if(!displayEl) return;

    // Time in minutes
    const totalMinutes = parseFloat(timerField.placeholder || 15);
    let secondsLeft = Math.floor(totalMinutes * 60);

    // Clear existing interval if any
    if(window.currentFormTimer) clearInterval(window.currentFormTimer);

    const updateDisplay = () => {
      const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
      const s = (secondsLeft % 60).toString().padStart(2, '0');
      displayEl.textContent = `${m}:${s}`;
      
      if(secondsLeft <= 60) {
        displayEl.style.color = 'var(--danger)';
        displayEl.style.animation = 'pulse 1s infinite';
      }
    };

    updateDisplay();

    window.currentFormTimer = setInterval(() => {
      secondsLeft--;
      updateDisplay();

      if(secondsLeft <= 0) {
        clearInterval(window.currentFormTimer);
        this.showToast('انتهى الوقت المحدد! سيتم إرسال إجاباتك تلقائياً.', 'error');
        // Auto submit
        const submitBtn = document.querySelector('.fill-body .btn-primary');
        if(submitBtn) submitBtn.click();
      }
    }, 1000);
  },

  initSignatures(form) {
    const sigFields = form.fields.filter(f => f.type === 'signature');
    sigFields.forEach(field => {
      const canvas = document.getElementById(`sig-canvas-${field.id}`);
      if(!canvas) return;
      const ctx = canvas.getContext('2d');
      let isDrawing = false;
      let lastX = 0; let lastY = 0;

      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
      };

      const startDrawing = (e) => {
        isDrawing = true;
        const pos = getPos(e);
        lastX = pos.x; lastY = pos.y;
        e.preventDefault();
      };

      const draw = (e) => {
        if(!isDrawing) return;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        lastX = pos.x; lastY = pos.y;
        
        // Save to hidden input on every draw
        const hidden = document.getElementById(`hidden-sig-${field.id}`);
        hidden.value = canvas.toDataURL('image/png');
        this.updateProgress();
        e.preventDefault();
      };

      const stopDrawing = (e) => { isDrawing = false; e.preventDefault(); };

      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseout', stopDrawing);

      canvas.addEventListener('touchstart', startDrawing, {passive: false});
      canvas.addEventListener('touchmove', draw, {passive: false});
      canvas.addEventListener('touchend', stopDrawing, {passive: false});
    });
  },

  clearSignature(fieldId) {
    const canvas = document.getElementById(`sig-canvas-${fieldId}`);
    if(canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const hidden = document.getElementById(`hidden-sig-${fieldId}`);
      if(hidden) {
        hidden.value = '';
        this.updateProgress();
      }
    }
  },

  downloadTicketQR() {
    const qrContainer = document.getElementById("ticket-qr-code");
    if(qrContainer) {
      const canvas = qrContainer.querySelector('canvas');
      const img = qrContainer.querySelector('img'); 
      let dataUrl = '';
      if(canvas) {
        dataUrl = canvas.toDataURL("image/png");
      } else if (img && img.src) {
        dataUrl = img.src;
      }
      
      if(dataUrl) {
        const link = document.createElement('a');
        link.download = 'ticket-qr.png';
        link.href = dataUrl;
        link.click();
      } else {
        App.showToast('تعذر تحميل التذكرة', 'error');
      }
    }
  }
});
