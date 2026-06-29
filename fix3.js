const fs = require('fs');

// 1. builder.js
let b = fs.readFileSync('js/app/builder.js', 'utf8');
b = b.replace(/title="إعدادات"><\/button>/g, 'title="إعدادات">إعدادات</button>');
b = b.replace(/title="نسخ"><\/button>/g, 'title="نسخ">نسخ</button>');
b = b.replace(/title="حذف"><\/button>/g, 'title="حذف">حذف</button>');
fs.writeFileSync('js/app/builder.js', b);

// 2. crm.js
let c = fs.readFileSync('js/app/crm.js', 'utf8');
c = c.replace(/title="مسح"><\/button>/g, 'title="مسح">مسح</button>');
fs.writeFileSync('js/app/crm.js', c);

// 3. fill.js
let f = fs.readFileSync('js/app/fill.js', 'utf8');
f = f.replace(/contains\('dark-mode'\) \? '' : ''" title="تبديل الوضع الليلي"><\/button>/g, "contains('dark-mode') ? 'السمة' : 'السمة'\" title=\"تبديل الوضع الليلي\">السمة</button>");
fs.writeFileSync('js/app/fill.js', f);

// 4. pages.css
let p = fs.readFileSync('css/pages.css', 'utf8');
p = p.replace(
  /width: 32px; height: 32px; border-radius: 50%;/,
  'width: auto; min-width: 32px; height: 32px; padding: 0 8px; border-radius: 16px;'
);
fs.writeFileSync('css/pages.css', p);
