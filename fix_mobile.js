const fs = require('fs');

// Fix index.html
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<span class="hide-mobile">/g, '');
html = html.replace(/<\/span><\/button>/g, '</button>');
fs.writeFileSync('index.html', html);

// Fix responsive.css
let css = fs.readFileSync('css/responsive.css', 'utf8');
css = css.replace(
  /\.builder-toolbar-right \.btn \{ padding: 8px; width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; font-size: 1\.1rem; border-radius: 50%; \}/,
  '.builder-toolbar-right .btn { padding: 6px 12px; width: auto; height: auto; display: inline-flex; align-items: center; justify-content: center; font-size: 0.9rem; border-radius: var(--radius-sm); }'
);
fs.writeFileSync('css/responsive.css', css);
