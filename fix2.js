const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/title="العودة للرئيسية"><\/button>/g, 'title="العودة للرئيسية">رجوع</button>');
html = html.replace(/aria-label="إضافة حقل"><\/button>/g, 'aria-label="إضافة حقل">إضافة</button>');
html = html.replace(/title="العودة للنموذج"><\/button>/g, 'title="العودة للنموذج">رجوع</button>');
fs.writeFileSync('index.html', html);
