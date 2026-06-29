const fs = require('fs');

// Fix dashboard.js
let dash = fs.readFileSync('js/app/dashboard.js', 'utf8');
dash = dash.replace(/title="مشاركة الرابط"><\/button>/g, 'title="مشاركة الرابط">مشاركة</button>');
dash = dash.replace(/title="نسخ النموذج"><\/button>/g, 'title="نسخ النموذج">نسخ</button>');
dash = dash.replace(/title="الردود والتحليلات"><\/button>/g, 'title="الردود والتحليلات">ردود</button>');
dash = dash.replace(/title="فتح النموذج">\uFE0F<\/button>/g, 'title="فتح النموذج">فتح</button>');
dash = dash.replace(/title="فتح النموذج"><\/button>/g, 'title="فتح النموذج">فتح</button>');
fs.writeFileSync('js/app/dashboard.js', dash);

// Fix index.html
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/id="nav-admin-panel-btn"([^>]*)><\/button>/g, 'id="nav-admin-panel-btn"$1>إدارة</button>');
html = html.replace(/onclick="App.logout\(\)"([^>]*)><\/button>/g, 'onclick="App.logout()"$1>خروج</button>');
html = html.replace(/id="theme-toggle"([^>]*)><\/button>/g, 'id="theme-toggle"$1>السمة</button>');
html = html.replace(/onclick="App.undo\(\)"([^>]*)><\/button>/g, 'onclick="App.undo()"$1>تراجع</button>');
html = html.replace(/onclick="App.redo\(\)"([^>]*)><\/button>/g, 'onclick="App.redo()"$1>إعادة</button>');

fs.writeFileSync('index.html', html);
console.log('Fixed empty buttons');
