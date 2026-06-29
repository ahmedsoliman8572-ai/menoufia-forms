const fs = require('fs');

const iconsMap = {
  'arabic_name': '🔤', 'english_name': 'EN', 'national_id': '🪪', 'gender': '🚻', 'governorate': '🗺️',
  'markaz': '📍', 'faculty': '🎓', 'academic_year': '📚', 'address_detailed': '🏠', 'whatsapp': '📱', 'union_member': '🤝',
  'section_break': '📑', 'short_text': '✏️', 'long_text': '📝', 'number': '🔢', 'email': '📧', 'phone': '📞',
  'date': '📅', 'time': '⏰', 'rating': '⭐', 'linear_scale': '📊', 'url': '🔗', 'file_upload': '📎',
  'signature': '✍️', 'timer': '⏱️', 'single_choice': '⭕', 'multiple_choice': '☑️', 'dropdown': '📋', 'payment': '💳'
};

let c = fs.readFileSync('js/config.js', 'utf8');
for (const key in iconsMap) {
  const r = new RegExp(key + "\\s*:\\s*\\{\\s*icon:\\s*''");
  c = c.replace(r, key + ": { icon: '" + iconsMap[key] + "'");
}
fs.writeFileSync('js/config.js', c);

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<button class="icon-btn" id="nav-admin-panel-btn"([^>]*)>إدارة<\/button>/, '<button class="icon-btn" id="nav-admin-panel-btn"$1>👑</button>');
html = html.replace(/<button class="icon-btn" onclick="App.logout\(\)"([^>]*)>خروج<\/button>/, '<button class="icon-btn" onclick="App.logout()"$1>🚪</button>');
html = html.replace(/<button class="icon-btn" id="theme-toggle"([^>]*)>السمة<\/button>/, '<button class="icon-btn" id="theme-toggle"$1>🌙</button>');
html = html.replace(/<button class="icon-btn" onclick="App.navigate\('dashboard'\)" title="رجوع" aria-label="العودة للوحة التحكم" id="btn-back-dashboard">رجوع<\/button>/, '<button class="icon-btn" onclick="App.navigate(\'dashboard\')" title="رجوع" aria-label="العودة للوحة التحكم" id="btn-back-dashboard">🏠</button>');
html = html.replace(/<button class="icon-btn" onclick="App.navigate\('dashboard'\)" title="العودة للرئيسية">رجوع<\/button>/g, '<button class="icon-btn" onclick="App.navigate(\'dashboard\')" title="العودة للرئيسية">🏠</button>');
html = html.replace(/<button class="icon-btn" onclick="App.navigate\('builder', \{formId: App.state.currentFormId\}\)" title="العودة للنموذج">رجوع<\/button>/, '<button class="icon-btn" onclick="App.navigate(\'builder\', {formId: App.state.currentFormId})" title="العودة للنموذج">🏠</button>');
html = html.replace(/<button class="mobile-fab" id="mobile-fab" onclick="App.toggleMobileSidebar\(\)" aria-label="إضافة حقل">إضافة<\/button>/, '<button class="mobile-fab" id="mobile-fab" onclick="App.toggleMobileSidebar()" aria-label="إضافة حقل">➕</button>');
html = html.replace(/<div class="nav-brand-icon"([^>]*)><\/div>/, '<span class="nav-brand-icon" style="margin-right: 10px;">📋</span>');
// wait, the nav brand icon was removed via diff:
// <span class="nav-brand-icon" style="margin-right: 10px;">📋</span> -> nothing.
// I can just replace `<span>Menoufia Forms</span>` with `<span class="nav-brand-icon" style="margin-right: 10px;">📋</span><span>Menoufia Forms</span>`
html = html.replace(/<span>Menoufia Forms<\/span>/, '<span class="nav-brand-icon" style="margin-right: 10px;">📋</span><span>Menoufia Forms</span>');

html = html.replace(/<button class="btn btn-ghost" onclick="App.undo\(\)" title="تراجع \(Ctrl\+Z\)">تراجع<\/button>/, '<button class="btn btn-ghost" onclick="App.undo()" title="تراجع (Ctrl+Z)">↶</button>');
html = html.replace(/<button class="btn btn-ghost" onclick="App.redo\(\)" title="إعادة \(Ctrl\+Y\)">إعادة<\/button>/, '<button class="btn btn-ghost" onclick="App.redo()" title="إعادة (Ctrl+Y)">↷</button>');

fs.writeFileSync('index.html', html);

// dash.js
let dash = fs.readFileSync('js/app/dashboard.js', 'utf8');
dash = dash.replace(/title="مشاركة الرابط">مشاركة<\/button>/g, 'title="مشاركة الرابط">🔗</button>');
dash = dash.replace(/title="نسخ النموذج">نسخ<\/button>/g, 'title="نسخ النموذج">📋</button>');
dash = dash.replace(/title="الردود والتحليلات">ردود<\/button>/g, 'title="الردود والتحليلات">📊</button>');
dash = dash.replace(/title="فتح النموذج">فتح<\/button>/g, 'title="فتح النموذج">👁️</button>');
dash = dash.replace(/<div class="form-card-banner"><\/div>/g, '<div class="form-card-banner">📝</div>');
fs.writeFileSync('js/app/dashboard.js', dash);

// builder.js
let builder = fs.readFileSync('js/app/builder.js', 'utf8');
builder = builder.replace(/title="إعدادات">إعدادات<\/button>/g, 'title="إعدادات">⚙️</button>');
builder = builder.replace(/title="نسخ">نسخ<\/button>/g, 'title="نسخ">📋</button>');
builder = builder.replace(/title="حذف">حذف<\/button>/g, 'title="حذف">🗑️</button>');
fs.writeFileSync('js/app/builder.js', builder);

// crm.js
let crm = fs.readFileSync('js/app/crm.js', 'utf8');
crm = crm.replace(/title="مسح">مسح<\/button>/g, 'title="مسح">🗑️</button>');
fs.writeFileSync('js/app/crm.js', crm);

console.log('Restored all basic icons!');
