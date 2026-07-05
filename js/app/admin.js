// =============================================
// SUPER ADMIN DASHBOARD
// =============================================
Object.assign(window.App, {
  async renderAdmin() {
    if(this.state.userRole !== 'super_admin' && this.state.userRole !== 'owner') {
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

    // Load System Settings
    try {
      const { data, error } = await supabaseClient.from('system_settings').select('value').eq('key', 'isolation_mode').single();
      const isolationToggle = document.getElementById('admin-isolation-mode');
      if (isolationToggle) {
        isolationToggle.disabled = false;
        if (!error && data) {
          isolationToggle.checked = data.value === 'true';
        }
      }
    } catch(e) {
      console.error("Error loading system settings, table might not exist", e);
      // Fallback
      const isolationToggle = document.getElementById('admin-isolation-mode');
      if (isolationToggle) isolationToggle.disabled = false;
    }

    // Render Permissions Manager UI if Owner
    const permissionsContainer = document.getElementById('admin-permissions-container');
    if (permissionsContainer) {
      if (this.state.userRole === 'owner') {
        permissionsContainer.innerHTML = `
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px; margin-top:20px;">
            <h3 style="margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:10px;">إدارة الصلاحيات (للمالك فقط)</h3>
            
            <div style="display:flex; gap:20px; flex-wrap:wrap;">
              <!-- Admin Permissions -->
              <div style="flex:1; min-width:250px; background:var(--bg-secondary); padding:15px; border-radius:8px;">
                <h4>صلاحيات الأدمن (Admin)</h4>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; width: 100%;">
                  <span>إنشاء النماذج</span>
                  <label class="toggle-switch">
                    <input type="checkbox" ${App.state.rolePermissions.admin.create ? 'checked' : ''} onchange="App.updateRolePermission('admin', 'create', this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; width: 100%;">
                  <span>تعديل النماذج</span>
                  <label class="toggle-switch">
                    <input type="checkbox" ${App.state.rolePermissions.admin.edit ? 'checked' : ''} onchange="App.updateRolePermission('admin', 'edit', this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; width: 100%;">
                  <span>حذف النماذج</span>
                  <label class="toggle-switch">
                    <input type="checkbox" ${App.state.rolePermissions.admin.delete ? 'checked' : ''} onchange="App.updateRolePermission('admin', 'delete', this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <!-- Super Admin Permissions -->
              <div style="flex:1; min-width:250px; background:var(--bg-secondary); padding:15px; border-radius:8px;">
                <h4>صلاحيات السوبر أدمن (Super Admin)</h4>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; width: 100%;">
                  <span>إنشاء النماذج</span>
                  <label class="toggle-switch">
                    <input type="checkbox" ${App.state.rolePermissions.super_admin.create ? 'checked' : ''} onchange="App.updateRolePermission('super_admin', 'create', this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; width: 100%;">
                  <span>تعديل النماذج</span>
                  <label class="toggle-switch">
                    <input type="checkbox" ${App.state.rolePermissions.super_admin.edit ? 'checked' : ''} onchange="App.updateRolePermission('super_admin', 'edit', this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; width: 100%;">
                  <span>حذف النماذج</span>
                  <label class="toggle-switch">
                    <input type="checkbox" ${App.state.rolePermissions.super_admin.delete ? 'checked' : ''} onchange="App.updateRolePermission('super_admin', 'delete', this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        permissionsContainer.innerHTML = '';
      }
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
            <span style="display:inline-block; padding:4px 8px; border-radius:4px; font-size:0.85rem; font-weight:600; background: ${creator.role === 'owner' ? '#8b5cf6' : creator.role === 'super_admin' ? 'var(--primary)' : creator.role === 'pending' ? 'var(--warning)' : 'var(--bg-secondary)'}; color: ${creator.role === 'owner' || creator.role === 'super_admin' || creator.role === 'pending' ? '#fff' : 'var(--text-primary)'};">
              ${creator.role === 'owner' ? 'المالك' : creator.role === 'super_admin' ? 'مدير عام' : creator.role === 'pending' ? 'في الانتظار' : 'مدير عادي'}
            </span>
          </td>
          <td style="padding:10px; border:1px solid var(--border); text-align:center;">
            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:nowrap;">
            ${creator.email === App.state.currentUser.email 
              ? (creator.role === 'super_admin' && !data.some(c => c.role === 'owner')
                  ? `<button class="btn btn-primary btn-sm" style="background:#8b5cf6; padding: 4px 10px;" onclick="App.promoteCreator('${creator.email}', 'owner')">ترقية لنفسي لمالك</button>`
                  : `<span style="color:var(--text-tertiary); font-size:0.8rem;">(أنت)</span>`) 
              : creator.role === 'pending'
                ? `<button class="btn btn-primary btn-sm" style="background:var(--success); padding: 4px 10px;" onclick="App.approveCreator('${creator.email}')">قبول</button>
                   <button class="btn btn-danger btn-sm" style="padding: 4px 10px;" onclick="App.deleteCreator('${creator.email}', true)">رفض</button>`
                : App.state.userRole === 'owner' && creator.role !== 'owner'
                  ? `<button class="btn btn-primary btn-sm" style="background:var(--primary); padding: 4px 10px;" onclick="App.promoteCreator('${creator.email}', 'super_admin')">سوبر أدمن</button>
                     <button class="btn btn-primary btn-sm" style="background:var(--primary); padding: 4px 10px;" onclick="App.promoteCreator('${creator.email}', 'admin')">أدمن</button>
                     <button class="btn btn-danger btn-sm" style="padding: 4px 10px;" onclick="App.deleteCreator('${creator.email}')">حذف</button>`
                  : creator.role === 'admin' && App.state.userRole === 'super_admin'
                    ? `<button class="btn btn-primary btn-sm" style="background:var(--primary); padding: 4px 10px;" onclick="App.promoteCreator('${creator.email}', 'super_admin')">ترقية</button>
                       <button class="btn btn-danger btn-sm" style="padding: 4px 10px;" onclick="App.deleteCreator('${creator.email}')">حذف</button>`
                    : creator.role === 'super_admin' || creator.role === 'owner'
                      ? `<span style="color:var(--text-tertiary); font-size:0.8rem;">لا يمكن التعديل</span>`
                      : `<button class="btn btn-danger btn-sm" style="padding: 4px 10px;" onclick="App.deleteCreator('${creator.email}')">حذف</button>`}
            </div>
          </td>
        </tr>
      `).join('');

    } catch (e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="3" style="padding:20px; text-align:center; color:var(--danger);">فشل في جلب البيانات</td></tr>`;
    }
  },

  async toggleIsolationMode(isEnabled) {
    try {
      const { error } = await supabaseClient
        .from('system_settings')
        .upsert({ key: 'isolation_mode', value: isEnabled ? 'true' : 'false' }, { onConflict: 'key' });
      
      if (error) throw error;
      this.showToast('تم تحديث نظام العزل بنجاح', 'success');
      
      // Reload forms with new settings if needed
      this.loadForms();
    } catch(e) {
      console.error("Error updating isolation mode:", e);
      this.showToast('حدث خطأ، يرجى التأكد من إنشاء جدول system_settings بقاعدة البيانات', 'error');
      document.getElementById('admin-isolation-mode').checked = !isEnabled; // Revert
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
      btn.innerHTML = 'إضافة';
    }
  },

  async deleteCreator(email, isReject = false) {
    const msg = isReject 
      ? `هل أنت متأكد من رفض طلب الانضمام وحذف الإيميل (${email})؟` 
      : `هل أنت متأكد من سحب صلاحيات الدخول من (${email})؟`;
    
    const isConfirmed = await App.confirm(msg);
    if(!isConfirmed) return;

    try {
      const { error } = await supabaseClient
        .from('allowed_creators')
        .delete()
        .eq('email', email);

      if(error) throw error;

      this.showToast(isReject ? 'تم رفض الطلب وحذفه بنجاح' : 'تم حذف المشرف بنجاح', 'success');
      this.loadCreators();
    } catch(e) {
      console.error(e);
      this.showToast('حدث خطأ أثناء الحذف', 'error');
    }
  },

  async approveCreator(email) {
    const isConfirmed = await App.confirm(`هل أنت متأكد من قبول طلب الانضمام لـ (${email}) وإعطائه صلاحيات مدير؟`);
    if(!isConfirmed) return;
    try {
      const { error } = await supabaseClient
        .from('allowed_creators')
        .update({ role: 'admin' })
        .eq('email', email);

      if(error) throw error;
      this.showToast('تم قبول المشرف بنجاح', 'success');
      this.loadCreators();
    } catch(e) {
      console.error(e);
      this.showToast('حدث خطأ أثناء القبول', 'error');
    }
  },

  async promoteCreator(email, newRole) {
    const roleName = newRole === 'owner' ? 'مالك (Owner)' : newRole === 'super_admin' ? 'مدير عام (Super Admin)' : 'مدير عادي (Admin)';
    const isConfirmed = await App.confirm(`هل أنت متأكد من تغيير رتبة (${email}) إلى ${roleName}؟`);
    if(!isConfirmed) return;
    try {
      const { error } = await supabaseClient
        .from('allowed_creators')
        .update({ role: newRole })
        .eq('email', email);

      if(error) throw error;
      if (newRole === 'owner' && email === App.state.currentUser.email) {
        App.state.userRole = 'owner';
      }
      this.showToast(`تم تغيير الرتبة إلى ${roleName} بنجاح`, 'success');
      this.loadCreators();
      
      // Re-render role permissions UI if current user just became owner
      if (newRole === 'owner' && email === App.state.currentUser.email) {
        this.renderAdmin();
      }
      
    } catch(e) {
      console.error(e);
      this.showToast('حدث خطأ أثناء تغيير الرتبة', 'error');
    }
  },

  async updateRolePermission(role, action, value) {
    this.state.rolePermissions[role][action] = value;
    
    // Save to forms table as settings
    try {
      const { data } = await supabaseClient.from('forms').select('id').eq('title', 'Role Permissions Configuration').maybeSingle();
      if (data) {
        await supabaseClient.from('forms').update({
          settings: { rolePermissions: this.state.rolePermissions }
        }).eq('id', data.id);
      } else {
        await supabaseClient.from('forms').insert([{
          title: 'Role Permissions Configuration',
          description: 'System role permissions configuration',
          fields: [],
          settings: { rolePermissions: this.state.rolePermissions },
          user_id: this.state.currentUser.id
        }]);
      }
      this.showToast('تم تحديث الصلاحيات بنجاح', 'success');
      
      // Reflect for UI buttons currently visible
      if (document.getElementById('btn-new-form')) {
        document.getElementById('btn-new-form').style.display = App.hasPermission('create') ? 'inline-flex' : 'none';
      }
    } catch(e) {
      console.error(e);
      this.showToast('حدث خطأ أثناء حفظ الصلاحيات', 'error');
    }
  }
});
