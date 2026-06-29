const fs = require('fs');

const emojisToRemove = [
  '🔍', '👥', '📊', '➕', '📈', '👑', '🏠', '🔗', '⚙️', '👁️', '💾', '🗑️', '🎨', '🖼️', '🌄', '🌙', '🔒', '🎉', '🔁', '🎓', '⏳', '📋', '📁', '⚠️', '💎', '🛡️', '✅', '❌', '🚀', '🔤', '🪪', '🚻', '🗺️', '📍', '📚', '🏠', '💳', '📱', '🤝', '📑', '✏️', '📝', '🔢', '📧', '📞', '📅', '⏰', '⭐', '🔗', '📎', '✍️', '⏱️', '⭕', '☑️', '📋', '💳', '☀️', '🌙', '🚫', '🔽', '🖼️', '🧹', '👑', '💎', '🛡️', '✅', '❌', '🗑️'
];

function removeEmojisFromFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Specific cleanups for index.html
  if (filePath.endsWith('index.html') || filePath.endsWith('dashboard.js')) {
    content = content.replace(/<span>[\u2700-\u27BF|\uE000-\uF8FF|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]]+<\/span>\s*/g, '');
    content = content.replace(/<span class="nav-brand-icon"[^>]*>.*?<\/span>/g, '');
  }

  if (filePath.endsWith('admin.js')) {
    content = content.replace(/ \uD83D\uDC8E/g, ''); // 💎
    content = content.replace(/ \uD83D\uDC51/g, ''); // 👑
    content = content.replace(/ \uD83D\uDEE1\uFE0F/g, ''); // 🛡️
    content = content.replace(/ \u23F3/g, ''); // ⏳
  }

  // Remove all specified emojis with optional trailing spaces
  emojisToRemove.forEach(emoji => {
    // Regex to match the emoji and optional following spaces if it's next to text
    const regex = new RegExp(emoji + '\\s*', 'g');
    content = content.replace(regex, '');
  });

  // Handle specific button cases where only emoji was present, replace with text if empty
  if (filePath.endsWith('index.html')) {
    content = content.replace(/title="رجوع"\s*aria-label="العودة للوحة التحكم"[^>]*><\/button>/g, 'title="رجوع" aria-label="العودة للوحة التحكم" id="btn-back-dashboard">رجوع</button>');
  }

  fs.writeFileSync(filePath, content);
}

const files = [
  'index.html',
  'js/config.js',
  'js/app/core.js',
  'js/app/dashboard.js',
  'js/app/admin.js',
  'js/app/crm.js',
  'js/app/builder.js',
  'js/app/fill.js',
  'js/app/responses.js',
  'js/app/share.js'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    removeEmojisFromFile(f);
    console.log('Cleaned', f);
  }
});
