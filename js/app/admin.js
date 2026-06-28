// =============================================
// SUPER ADMIN DASHBOARD
// =============================================
Object.assign(window.App, {
  async renderAdmin() {
    if(this.state.userRole !== 'super_admin') {
      this.showToast('عفواً، لا تملك الصلاحيات للدخول إلى هذه الصفحة.', 'error');
      return this.navigate('dashboard');
    }

    // Load global stats
    try {
      // 1. Forms count
      const { count: formsCount, error: formsError } = await supabaseClient
        .from('forms')
        .select('*', { count: 'exact', head: true });
      if(!formsError) document.getElementById('admin-total-forms').innerText = formsCount;

      // 2. Responses count
      const { count: resCount, error: resError } = await supabaseClient
        .from('responses')
        .select('*', { count: 'exact', head: true });
      if(!resError) document.getElementById('admin-total-responses').innerText = resCount;
      
    } catch(e) {
      console.error("Error loading global stats", e);
    }

    this.loadCreators();
  },

  async loadCreators() {
    const tbody = document.getElementById('admin-creators-table');
    tbody.innerHTML = `<tr><td colspan="3" style="padding:20px; text-align:center;">جاري جلب قائمة المشرفين...</td></tr>`;

    try {
      const { data, error } = await supabaseClient
        .from('allowed_creators')
        .select('*')
        .order('role', { ascending: false });

      if (error) throw error;

      document.getElementById('admin-total-creators').innerText = data.length;

      if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="padding:20px; text-align:center;">لا يوجد مشرفين</td></tr>`;
        return;
      }

      tbody.innerHTML = data.map(creator => `
        <tr>
          <td style="padding:10px; border:1px solid var(--border); direction:ltr; text-align:right;">${this.escape(creator.email)}</td>
          <td style="padding:10px; border:1px solid var(--border);">
            <span style="display:inline-block; padding:4px 8px; border-radius:4px; font-size:0.85rem; font-weight:600; background: ${creator.role === 'super_admin' ? 'var(--primary)' : 'var(--bg-secondary)'}; color: ${creator.role === 'super_admin' ? '#fff' : 'var(--text)'};">
              ${creator.role === 'super_admin' ? 'مدير عام 👑' : 'مدير عادي'}
            </span>
          </td>
          <td style="padding:10px; border:1px solid var(--border); text-align:center;">
            ${creator.email === this.state.currentUser.email 
              ? `<span style="color:var(--text-tertiary); font-size:0.8rem;">(أنت)</span>` 
              : `<button class="btn btn-danger btn-sm" onclick="App.deleteCreator('${creator.email}')">🗑️ حذف</button>`}
          </td>
        </tr>
      `).join('');

    } catch (e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="3" style="padding:20px; text-align:center; color:var(--danger);">فشل في جلب البيانات</td></tr>`;
    }
  },

  async addCreator() {
    const emailInput = document.getElementById('admin-new-email');
    const roleInput = document.getElementById('admin-new-role');
    
    const email = emailInput.value.trim().toLowerCase();
    const role = roleInput.value;

    if(!email) return this.showToast('يرجى إدخال البريد الإلكتروني', 'warning');

    const btn = event.currentTarget;
    btn.disabled = true;
    btn.innerHTML = 'جاري...';

    try {
      const { error } = await supabaseClient
        .from('allowed_creators')
        .insert([{ email, role }]);

      if (error) {
        if(error.code === '23505') throw new Error('هذا البريد مضاف بالفعل');
        throw error;
      }

      this.showToast('تمت إضافة المشرف بنجاح', 'success');
      emailInput.value = '';
      this.loadCreators();
    } catch(e) {
      console.error(e);
      this.showToast(e.message || 'حدث خطأ أثناء الإضافة. تأكد من الصلاحيات.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '➕ إضافة';
    }
  },

  async deleteCreator(email) {
    if(!confirm(`هل أنت متأكد من سحب صلاحيات الدخول من (${email})؟`)) return;

    try {
      const { error } = await supabaseClient
        .from('allowed_creators')
        .delete()
        .eq('email', email);

      if(error) throw error;

      this.showToast('تم حذف المشرف بنجاح', 'success');
      this.loadCreators();
    } catch(e) {
      console.error(e);
      this.showToast('حدث خطأ أثناء الحذف', 'error');
    }
  }
});
