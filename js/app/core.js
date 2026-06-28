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
    folders: [],
    responses: {},
    stats: { totalSubmissions: 0, totalFormsCreated: 0 },
    settings: { theme: 'light', lang: 'ar' },
    currentFormId: null,
    selectedFieldId: null,
    history: { undoStack: [], redoStack: [] }
  },

  async init() {
    this.applyTheme();
    this.initKeyboardShortcuts();
    
    // Check Auth Status
    const { data: { session } } = await supabaseClient.auth.getSession();
    this.updateAuthState(session);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      this.updateAuthState(session);
    });

    // Check for share link
    const urlParams = new URLSearchParams(window.location.search);
    const fillId = urlParams.get('fill');
    if(fillId) {
      // Hide Landing page navbar completely when sharing specific form
      const navbar = document.getElementById('navbar');
      if(navbar) navbar.style.display = 'none';
      this.navigate('fill', {formId: fillId});
    } else {
      if(!this.state.currentUser) {
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
      } catch(e) { 
        console.error("Error fetching role", e);
        await supabaseClient.auth.signOut();
        this.state.currentUser = null;
        this.showToast('حدث خطأ أثناء التحقق من الصلاحيات.', 'error');
        return;
      }

      if (isAuthorized) {
        if(loginBtn) loginBtn.style.display = 'none';
        if(userInfo) userInfo.style.display = 'flex';
        if(userEmail) userEmail.innerText = this.state.currentUser.email;
        if(newFormBtn) newFormBtn.style.display = 'inline-flex';
        if(adminPanelBtn) adminPanelBtn.style.display = this.state.userRole === 'super_admin' ? 'inline-block' : 'none';
        
        if(this.state.currentView === 'dashboard') {
          this.loadForms();
        }
      }
    } else {
      if(loginBtn) loginBtn.style.display = 'inline-block';
      if(userInfo) userInfo.style.display = 'none';
      if(userEmail) userEmail.innerText = '';
      if(newFormBtn) newFormBtn.style.display = 'none';
      if(adminPanelBtn) adminPanelBtn.style.display = 'none';
      this.state.forms = [];
      if(this.state.currentView !== 'fill') {
        this.navigate('dashboard');
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
    } catch(err) {
      if(this.showToast) this.showToast(err.message, 'error');
    }
  },

  async loginWithEmail() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if(!email || !password) return this.showToast('يرجى إدخال البريد وكلمة المرور', 'warning');
    
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        if(error.message.includes('Invalid login credentials')) {
          this.showToast('بيانات الدخول غير صحيحة', 'error');
        } else {
          this.showToast(error.message, 'error');
        }
      } else {
        document.getElementById('auth-modal').style.display = 'none';
        this.showToast('تم تسجيل الدخول بنجاح', 'success');
      }
    } catch(err) {
      this.showToast('حدث خطأ أثناء الاتصال', 'error');
    }
  },

  async signUpWithEmail() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if(!email || !password) return this.showToast('يرجى إدخال البريد وكلمة المرور', 'warning');
    if(password.length < 6) return this.showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning');
    
    try {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) {
        if(error.message.includes('User already registered')) {
          this.showToast('هذا البريد مسجل بالفعل، يرجى تسجيل الدخول', 'error');
        } else {
          this.showToast(error.message, 'error');
        }
      } else {
        document.getElementById('auth-modal').style.display = 'none';
        if (data?.session) {
          // It will automatically trigger updateAuthState and handle pending logic
        } else {
          // If email confirmation is required by Supabase settings
          this.showToast('تم التسجيل بنجاح! يرجى مراجعة بريدك الإلكتروني لتأكيد الحساب.', 'success');
        }
      }
    } catch(err) {
      this.showToast('حدث خطأ أثناء الاتصال', 'error');
    }
  },

  async logout() {
    await supabaseClient.auth.signOut();
    this.showToast('تم تسجيل الخروج', 'info');
  },

  async loadForms() {
    if(!this.state.currentUser) return;
    try {
      const { data, error } = await supabaseClient.from('forms').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      this.state.forms = data;
      this.renderDashboard();
    } catch(err) {
      console.error(err);
      if(this.showToast) this.showToast('حدث خطأ أثناء جلب النماذج', 'error');
    }
  },

  async save() {
    // Backward compatibility for methods that call App.save() to save theme
  },

    navigate(view, params = {}) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    this.state.currentView = view;
    if(params.formId) this.state.currentFormId = params.formId;
    
    document.getElementById(`page-${view}`).classList.add('active');
    
    if(view === 'dashboard') this.renderDashboard();
    if(view === 'builder') { this.state.selectedFieldId = null; this.renderBuilder(); }
    if(view === 'fill') this.renderFillForm();
    if(view === 'responses') this.renderResponses();
    if(view === 'admin') this.renderAdmin();
    window.scrollTo(0,0);

    // Close mobile menu
    const mobileMenu = document.querySelector('.nav-links');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if(mobileMenu) mobileMenu.classList.remove('mobile-open');
    if(menuBtn) menuBtn.classList.remove('active');
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
    if(mobileMenu && menuBtn) {
      mobileMenu.classList.toggle('mobile-open');
      menuBtn.classList.toggle('active');
    }
  },

  toggleMobileSidebar() {
    const sidebar = document.getElementById('builder-sidebar');
    const overlay = document.getElementById('drawer-overlay');
    if(sidebar) sidebar.classList.toggle('open');
    if(overlay) overlay.classList.toggle('show');
  },

  closeAllDrawers() {
    const sidebar = document.getElementById('builder-sidebar');
    const settings = document.getElementById('builder-settings');
    const overlay = document.getElementById('drawer-overlay');
    if(sidebar) sidebar.classList.remove('open');
    if(settings) settings.classList.remove('open');
    if(overlay) overlay.classList.remove('show');
  },

    initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only in builder view
      if(this.state.currentView !== 'builder') return;
      
      if((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      if((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.redo();
      }
      if((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentForm();
      }
      if(e.key === 'Delete' && this.state.selectedFieldId) {
        // Only if not focused on an input
        if(!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          this.removeField(this.state.selectedFieldId);
        }
      }
    });
  },
};

Object.assign(window.App, {
showToast(msg, type='info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `
      <span>${type==='success'?'✅':type==='error'?'❌':'ℹ️'} ${msg}</span>
      <div class="toast-progress"><div class="toast-progress-bar"></div></div>
    `;
    c.appendChild(t);
    // Auto dismiss
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-10px) scale(0.95)';
      setTimeout(() => t.remove(), 300);
    }, 3500);
  },
  
  closeModal() { document.getElementById('modal-overlay').classList.remove('active'); },
  escape(s) { 
    if(!s) return ''; 
    if (window.DOMPurify) {
      return DOMPurify.sanitize(String(s), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    }
    const d = document.createElement('div'); d.innerText = String(s); return d.innerHTML; 
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
      if (data) return data;
      return null;
    } catch(e) {
      console.error('Failed to fetch form from cloud:', e);
      return null;
    }
  },



  showConfetti() {
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;';
    document.body.appendChild(container);
    
    for(let i = 0; i < 60; i++) {
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
        transform:rotate(${Math.random()*360}deg);
      `;
      container.appendChild(confetti);
    }
    
    setTimeout(() => container.remove(), 5000);
  },

  
});
