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
  const re = new RegExp(key + "\\s*:\\s*\\{\\s*icon:\\s*''");
  c = c.replace(re, key + ': { icon: \'' + iconsMap[key] + '\'');
}
fs.writeFileSync('js/config.js', c);
console.log('Restored config.js icons');
