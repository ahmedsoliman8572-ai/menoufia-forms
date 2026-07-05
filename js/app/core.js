// =============================================
// MAIN APPLICATION & CORE
// =============================================
const SUPABASE_URL = 'https://osqcqyqyzldufyxakviz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Qq_ol1DP_fsj5bZnXiHxUA_3FBUVhXW';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.App = {

  state: {
    currentUser: null,
    currentView: 'dashboard',
    forms: [],
    responses: {},
    stats: { totalSubmissions: 0, totalFormsCreated: 0 },
    settings: { theme: 'light', lang: 'ar' },
    currentFormId: null,
    selectedFieldId: null,
    history: { undoStack: [], redoStack: [] },
    rolePermissions: {
      admin: { create: true, edit: true, delete: false },
      super_admin: { create: true, edit: true, delete: true }
    }
  },

  async init() {
    // Restore saved theme from localStorage
    const savedTheme = localStorage.getItem('menoufia_forms_theme');
    if (savedTheme) this.state.settings.theme = savedTheme;

    this.applyTheme();
    this.initKeyboardShortcuts();

    // Check Auth Status
    const { data: { session } } = await supabaseClient.auth.getSession();
    this.updateAuthState(session);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      this.updateAuthState(session);
    });

    // Handle browser back button
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.view) {
        this.navigate(event.state.view, event.state.params, false);
      } else {
        this.navigate('dashboard', {}, false);
      }
    });

    // Check for share link
    const urlParams = new URLSearchParams(window.location.search);
    const fillId = urlParams.get('fill');
    const scannerId = urlParams.get('scanner');
    if (fillId) {
      // Hide Landing page navbar completely when sharing specific form
      const navbar = document.getElementById('navbar');
      if (navbar) navbar.style.display = 'none';
      this.navigate('fill', { formId: fillId });
    } else if (scannerId) {
      const navbar = document.getElementById('navbar');
      if (navbar) navbar.style.display = 'none';
      this.navigateScanner(scannerId);
    } else {
      if (!this.state.currentUser) {
        this.renderDashboard();
      }
    }
  },

  async updateAuthState(session) {
    this.state.currentUser = session?.user || null;
    this.state.userRole = null; // reset role

    const loginBtn = document.getElementById('nav-login-btn');
    const userInfo = document.getElementById('nav-user-info');
    const userEmail = document.getElementById('nav-user-email');
    const newFormBtn = document.getElementById('btn-new-form');
    const adminPanelBtn = document.getElementById('nav-admin-panel-btn');
    const btnContacts = document.getElementById('btn-contacts');

    if (this.state.currentUser) {
      let isAuthorized = false;

      // Fetch user role
      try {
        const { data, error } = await supabaseClient.from('allowed_creators').select('role').eq('email', this.state.currentUser.email).single();

        if (error || !data) {
          // User not found in allowed_creators, set them as pending
          await supabaseClient.from('allowed_creators').insert([{ email: this.state.currentUser.email, role: 'pending' }]);
          await supabaseClient.auth.signOut();
          this.state.currentUser = null;
          this.showToast('تم إرسال طلب انضمامك للإدارة. يرجى الانتظار لحين الموافقة.', 'info');
          return; // Stop execution
        } else if (data.role === 'pending') {
          // User is pending approval
          await supabaseClient.auth.signOut();
          this.state.currentUser = null;
          this.showToast('طلب الانضمام الخاص بك قيد المراجعة من قبل الإدارة.', 'info');
          return; // Stop execution
        } else {
          // User is authorized
          this.state.userRole = data.role;
          isAuthorized = true;
        }
      } catch (e) {
        console.error("Error fetching role", e);
        await supabaseClient.auth.signOut();
        this.state.currentUser = null;
        this.showToast('حدث خطأ أثناء التحقق من الصلاحيات.', 'error');
        return;
      }

      if (isAuthorized) {
        await this.loadRolePermissions();
        if (loginBtn) loginBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (userEmail) userEmail.innerText = this.state.currentUser.email;
        if (newFormBtn) newFormBtn.style.display = this.hasPermission('create') ? 'inline-flex' : 'none';
        if (adminPanelBtn) adminPanelBtn.style.display = (this.state.userRole === 'super_admin' || this.state.userRole === 'owner') ? 'inline-block' : 'none';
        if (btnContacts) btnContacts.style.display = (this.state.userRole === 'super_admin' || this.state.userRole === 'owner') ? 'inline-flex' : 'none';

        if (this.state.currentView === 'dashboard') {
          this.loadForms();
        }
      }
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (userInfo) userInfo.style.display = 'none';
      if (userEmail) userEmail.innerText = '';
      if (newFormBtn) newFormBtn.style.display = 'none';
      if (adminPanelBtn) adminPanelBtn.style.display = 'none';
      if (btnContacts) btnContacts.style.display = 'none';
      this.state.forms = [];
      if (this.state.currentView !== 'fill' && this.state.currentView !== 'scanner') {
        this.navigate('landing');
      }
    }
  },

  showLoginModal() {
    document.getElementById('auth-modal').style.display = 'flex';
  },

  async loginWithGoogle() {
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      if (this.showToast) this.showToast(err.message, 'error');
    }
  },

  async loginWithEmail() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || !password) return this.showToast('يرجى إدخال البريد وكلمة المرور', 'warning');

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          this.showToast('بيانات الدخول غير صحيحة', 'error');
        } else {
          this.showToast(error.message, 'error');
        }
      } else {
        document.getElementById('auth-modal').style.display = 'none';
        this.showToast('تم تسجيل الدخول بنجاح', 'success');
      }
    } catch (err) {
      this.showToast('حدث خطأ أثناء الاتصال', 'error');
    }
  },

  async signUpWithEmail() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || !password) return this.showToast('يرجى إدخال البريد وكلمة المرور', 'warning');
    if (password.length < 6) return this.showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning');

    try {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) {
        if (error.message.includes('User already registered')) {
          this.showToast('هذا البريد مسجل بالفعل، يرجى تسجيل الدخول', 'error');
        } else {
          this.showToast(error.message, 'error');
        }
      } else {
        document.getElementById('auth-modal').style.display = 'none';
        if (data?.session) {
          // It will automatically trigger updateAuthState and handle pending logic
        } else {
          // Supabase didn't return a session. The DB trigger will handle confirmation and pending state.
          this.showToast('تم التسجيل بنجاح! تم إرسال طلبك للإدارة، يرجى الانتظار لحين الموافقة لتتمكن من الدخول.', 'success');
        }
      }
    } catch (err) {
      this.showToast('حدث خطأ أثناء الاتصال', 'error');
    }
  },

  async logout() {
    await supabaseClient.auth.signOut();
    this.showToast('تم تسجيل الخروج', 'info');
  },

  async loadForms() {
    if (!this.state.currentUser) return;
    this.renderDashboard(true);
    try {
      const { data, error } = await supabaseClient.from('forms').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      data.forEach(f => {
        if (f.settings) Object.assign(f, f.settings);
      });
      this.state.forms = data;
      this.renderDashboard();
    } catch (err) {
      console.error(err);
      if (this.showToast) this.showToast('حدث خطأ أثناء جلب النماذج', 'error');
    }
  },

  async uploadFile(file, path) {
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${path}_${Date.now()}.${ext}`;
      const { data, error } = await supabaseClient.storage
        .from('uploads')
        .upload(fileName, file, { upsert: false });

      if (error) throw error;

      const { data: publicUrlData } = supabaseClient.storage
        .from('uploads')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (e) {
      console.error("Storage upload error:", e);
      if (this.showToast) this.showToast('حدث خطأ أثناء رفع الملف', 'error');
      return null;
    }
  },

  async save() {
    // Persist theme preference to localStorage
    try {
      localStorage.setItem('menoufia_forms_theme', this.state.settings.theme);
    } catch(e) { /* localStorage unavailable */ }
  },

  async navigate(view, params = {}, pushHistory = true) {
    if (!['dashboard', 'landing', 'builder', 'fill', 'responses', 'admin', 'contacts'].includes(view)) return;

    if (view !== 'landing' && view !== 'fill' && view !== 'scanner' && !this.state.currentUser) {
      // If trying to access protected route without auth, redirect to landing
      return this.navigate('landing');
    }

    if (pushHistory) {
      if (this.state.currentView !== view || JSON.stringify(this.state.currentParams || {}) !== JSON.stringify(params)) {
        window.history.pushState({ view, params }, '', window.location.search);
      }
    }
    this.state.currentParams = params;
    
    // Ensure all modals and drawers are closed when navigating
    if (typeof this.closeAllDrawers === 'function') this.closeAllDrawers();
    if (typeof this.closeModal === 'function') this.closeModal();
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.style.display = 'none';
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    this.state.currentView = view;
    if (params.formId) this.state.currentFormId = params.formId;

    document.getElementById(`page-${view}`).classList.add('active');

    if (view === 'dashboard') this.renderDashboard();
    if (view === 'builder') {
      if (!this.hasPermission('edit')) {
        this.showToast('عفواً، لا تملك صلاحية تعديل النماذج', 'error');
        this.state.currentView = 'dashboard';
        document.getElementById(`page-dashboard`).classList.add('active');
        return;
      }
      this.state.selectedFieldId = null;
      const form = this.getForm();
      if (form && !form.fields) {
        // Fetch full form data (fields, images) if not loaded
        const fullForm = await this.fetchFormFromCloud(form.id);
        if (fullForm) {
          Object.assign(form, fullForm);
        }
      }
      this.renderBuilder();
    }
    if (view === 'fill') this.renderFillForm();
    if (view === 'responses') this.renderResponses();
    if (view === 'admin') this.renderAdmin();
    if (view === 'contacts') this.loadContacts();
    window.scrollTo(0, 0);

    // Close mobile menu
    const mobileMenu = document.querySelector('.nav-links');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenu) mobileMenu.classList.remove('mobile-open');
    if (menuBtn) menuBtn.classList.remove('active');
  },

  async navigateScanner(formId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    this.state.currentView = 'scanner';
    this.state.currentFormId = formId;
    document.getElementById('page-scanner').classList.add('active');

    // Hide navbar for scanner mode
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.style.display = 'none';

    // Initialize Scanner (lazy load if needed)
    if (typeof Html5QrcodeScanner === 'undefined') {
      const scannerResult = document.getElementById('scanner-result');
      if(scannerResult) scannerResult.innerHTML = '<p>جاري تحميل الكاميرا...</p>';
      await this.loadScript('https://unpkg.com/html5-qrcode');
      if(scannerResult) scannerResult.innerHTML = '';
    }

    if (!this._html5QrcodeScanner) {
      this._html5QrcodeScanner = new Html5QrcodeScanner("scanner-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, /* verbose= */ false);

      this._html5QrcodeScanner.render(async (decodedText, decodedResult) => {
        // Prevent double scans
        if (this._isScanningTicket) return;
        this._isScanningTicket = true;

        // Pause scanning to show result
        this._html5QrcodeScanner.pause(true);

        const resultBox = document.getElementById('scanner-result');
        const resultTitle = document.getElementById('scanner-result-title');
        const resultText = document.getElementById('scanner-result-text');

        resultBox.style.display = 'block';
        resultBox.style.background = 'var(--bg-card)';
        resultTitle.innerText = 'جاري التحقق...';
        resultTitle.style.color = 'var(--text-primary)';
        resultText.innerText = 'الرجاء الانتظار قليلاً';

        try {
          const { data, error } = await supabaseClient.rpc('verify_and_checkin_ticket', {
            p_ticket_id: decodedText,
            p_form_id: formId
          });

          if (error) {
            if (error.message.includes('invalid_ticket')) {
              throw new Error('التذكرة غير صحيحة أو لا تنتمي لهذه الفعالية');
            } else if (error.message.includes('already_used')) {
              const checkInTime = new Date(error.message.split('|')[1]).toLocaleTimeString('ar-EG');
              resultBox.style.background = 'rgba(239, 68, 68, 0.1)';
              resultTitle.style.color = 'var(--danger)';
              resultTitle.innerText = 'عفواً، التذكرة مستخدمة مسبقاً ❌';
              resultText.innerText = `تم تسجيل حضور هذه التذكرة مسبقاً الساعة ${checkInTime}`;
              return;
            } else {
              throw new Error('حدث خطأ أثناء التحقق: ' + error.message);
            }
          }

          let guestName = 'زائر';
          for (let key in data) {
            if (key.includes('اسم') || key.toLowerCase().includes('name')) {
              guestName = data[key]; break;
            }
          }

          resultBox.style.background = 'rgba(16, 185, 129, 0.1)';
          resultTitle.style.color = '#10B981';
          resultTitle.innerText = 'تم تسجيل الحضور بنجاح ✅';
          resultText.innerText = `أهلاً بك: ${guestName}`;

        } catch (err) {
          resultBox.style.background = 'rgba(239, 68, 68, 0.1)';
          resultTitle.style.color = 'var(--danger)';
          resultTitle.innerText = 'خطأ في التذكرة ❌';
          resultText.innerText = err.message || 'لم نتمكن من التحقق من هذه التذكرة';
        }

        // Resume scanning after 3 seconds
        setTimeout(() => {
          resultBox.style.display = 'none';
          this._isScanningTicket = false;
          this._html5QrcodeScanner.resume();
        }, 3000);

      }, (error) => {
        // parse error, ignore
      });
    }
  },

  toggleTheme() {
    this.state.settings.theme = this.state.settings.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    this.save();
  },

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.state.settings.theme);
    document.getElementById('theme-toggle').innerText = this.state.settings.theme === 'dark' ? '☀️' : '🌙';
  },

  toggleMobileMenu() {
    const mobileMenu = document.querySelector('.nav-links');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenu && menuBtn) {
      mobileMenu.classList.toggle('mobile-open');
      menuBtn.classList.toggle('active');
    }
  },

  toggleMobileSidebar() {
    const sidebar = document.getElementById('builder-sidebar');
    const overlay = document.getElementById('drawer-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  },

  closeAllDrawers() {
    const sidebar = document.getElementById('builder-sidebar');
    const settings = document.getElementById('builder-settings');
    const overlay = document.getElementById('drawer-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (settings) settings.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  },

  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Close all modals on Escape
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal, .drawer').forEach(m => {
          m.style.display = 'none';
          m.classList.remove('open', 'show');
        });
        const overlay = document.getElementById('drawer-overlay');
        if (overlay) overlay.classList.remove('show');
      }

      // Only in builder view
      if (this.state.currentView !== 'builder') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentForm();
      }
      if (e.key === 'Delete' && this.state.selectedFieldId) {
        // Only if not focused on an input
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          this.removeField(this.state.selectedFieldId);
        }
      }
    });
  },
};

Object.assign(window.App, {
  showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');

    // Prevent duplicate exact messages showing at the same time
    const existingToasts = Array.from(c.querySelectorAll('.toast span'));
    if (existingToasts.some(span => span.innerText.includes(msg))) {
      return;
    }

    const safeMsg = this.escape(msg);
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `
      <span>${safeMsg}</span>
      <div class="toast-progress"><div class="toast-progress-bar"></div></div>
    `;
    c.appendChild(t);
    // Auto dismiss
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-10px) scale(0.95)';
      setTimeout(() => t.remove(), 300);
    }, 2000);
  },

  closeModal() { document.getElementById('modal-overlay').classList.remove('active'); },
  escape(s) {
    if (!s) return '';
    if (window.DOMPurify) {
      return DOMPurify.sanitize(String(s), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    }
    const d = document.createElement('div'); d.innerText = String(s); return d.innerHTML;
  },

  downloadCSV(csv, filename) {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  },




  async fetchFormFromCloud(formId) {
    try {
      const { data, error } = await supabaseClient.from('forms').select('*').eq('id', formId).single();
      if (error) throw error;
      if (data) {
        if (data.settings) Object.assign(data, data.settings);
        return data;
      }
      return null;
    } catch (e) {
      console.error('Failed to fetch form from cloud:', e);
      return null;
    }
  },



  showConfetti() {
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;';
    document.body.appendChild(container);

    for (let i = 0; i < 60; i++) {
      const confetti = document.createElement('div');
      const size = Math.random() * 10 + 5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = Math.random() * 2 + 2;
      const shape = Math.random() > 0.5 ? '50%' : '0';

      confetti.style.cssText = `
        position:absolute; top:-20px; left:${left}%;
        width:${size}px; height:${size}px;
        background:${color}; border-radius:${shape};
        animation:confetti-fall ${duration}s ease-in ${delay}s forwards;
        transform:rotate(${Math.random() * 360}deg);
      `;
      container.appendChild(confetti);
    }

    setTimeout(() => container.remove(), 5000);
  },

  confirm(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const msgEl = document.getElementById('confirm-modal-message');
      const btnOk = document.getElementById('confirm-modal-ok');
      const btnCancel = document.getElementById('confirm-modal-cancel');

      if (!modal) return resolve(window.confirm(message)); // Fallback

      msgEl.innerText = message;
      modal.style.display = 'flex';

      const cleanup = () => {
        modal.style.display = 'none';
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
      };

      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };

      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);
    });
  },

  async loadRolePermissions() {
    try {
      const { data } = await supabaseClient.from('forms').select('*').eq('id', 'role_permissions').single();
      if (data && data.settings && data.settings.rolePermissions) {
        this.state.rolePermissions = data.settings.rolePermissions;
      }
    } catch (e) { }
  },

  hasPermission(action) {
    if (this.state.userRole === 'owner') return true;
    const perms = this.state.rolePermissions[this.state.userRole];
    return perms ? perms[action] : false;
  }

});
