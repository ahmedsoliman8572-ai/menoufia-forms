// =============================================
// VALIDATION HELPERS
// =============================================
const Validators = {
  // Arabic: Unicode ranges for Arabic characters + spaces only
  isArabicOnly(str) {
    return /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/.test(str);
  },
  // English: Latin letters + spaces only
  isEnglishOnly(str) {
    return /^[A-Za-z\s]+$/.test(str);
  },
  // Count words (4 minimum for names)
  wordCount(str) {
    return str.trim().split(/\s+/).filter(w => w.length > 0).length;
  },
  // National ID: exactly 14 digits
  isValidNationalId(str) {
    return /^\d{14}$/.test(str);
  },
  // Strip non-Arabic chars for real-time filtering
  stripNonArabic(str) {
    return str.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, '');
  },
  // Strip non-English chars for real-time filtering
  stripNonEnglish(str) {
    return str.replace(/[^A-Za-z\s]/g, '');
  },
  // Strip non-digits
  stripNonDigits(str) {
    return str.replace(/[^0-9]/g, '');
  },
  isEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  },
  isEgyptianPhone(str) {
    return /^01[0125][0-9]{8}$/.test(str);
  },
  isTaxId(str) {
    return /^\d{9}$/.test(str);
  },
  isUrl(str) {
    try {
      new URL(str);
      return true;
    } catch (_) {
      return false;
    }
  },
  parseNationalId(id) {
    if (!this.isValidNationalId(id)) return null;
    
    // Format: CYYMMDDGGNNNNZ
    const centuryMap = { '2': 1900, '3': 2000 };
    const centuryStr = id.substring(0, 1);
    if (!centuryMap[centuryStr]) return null; // Invalid century

    const year = centuryMap[centuryStr] + parseInt(id.substring(1, 3));
    const month = parseInt(id.substring(3, 5));
    const day = parseInt(id.substring(5, 7));
    const govCode = id.substring(7, 9);
    const govMap = {
      '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بورسعيد', '04': 'السويس', '11': 'دمياط', '12': 'الدقهلية',
      '13': 'الشرقية', '14': 'القليوبية', '15': 'كفر الشيخ', '16': 'الغربية', '17': 'المنوفية', '18': 'البحيرة',
      '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف', '23': 'الفيوم', '24': 'المنيا', '25': 'أسيوط',
      '26': 'سوهاج', '27': 'قنا', '28': 'أسوان', '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد',
      '33': 'مطروح', '34': 'شمال سيناء', '35': 'جنوب سيناء', '88': 'خارج الجمهورية'
    };
    
    const sequence = parseInt(id.substring(9, 13));
    const gender = (sequence % 2 !== 0) ? 'ذكر' : 'أنثى';
    const gov = govMap[govCode] || 'غير معروف';

    return {
      birthDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
      governorate: gov,
      gender: gender
    };
  }
};
