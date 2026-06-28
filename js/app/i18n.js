// =============================================
// i18n - ARABIC ONLY SUPPORT
// =============================================

window.i18nDict = {
  ar: {
    dashboard: "لوحة التحكم",
    newForm: "✨ نموذج جديد",
    responses: "الردود",
    settings: "الإعدادات",
    preview: "معاينة",
    save: "حفظ",
    share: "مشاركة",
    undo: "تراجع",
    redo: "إعادة",
    export: "تصدير JSON",
    addField: "إضافة حقل",
    shortText: "نص قصير",
    longText: "نص طويل",
    singleChoice: "اختيار من متعدد",
    multipleChoice: "مربعات اختيار",
    dropdown: "قائمة منسدلة",
    rating: "تقييم",
    linearScale: "مقياس خطي",
    date: "تاريخ",
    time: "وقت",
    sectionBreak: "فاصل أقسام",
    governorate: "محافظة مصرية",
    faculty: "كلية/معهد",
    deleteForm: "حذف النموذج",
    duplicateForm: "نسخ النموذج",
    viewResponses: "الردود والتحليلات",
    required: "مطلوب",
    optional: "اختياري",
    formTitle: "عنوان النموذج",
    fieldLabel: "سؤال...",
    successSave: "تم الحفظ بنجاح",
    errorSave: "حدث خطأ أثناء الحفظ",
    noResponses: "لا توجد ردود لتصديرها",
    totalForms: "إجمالي النماذج",
    totalFields: "إجمالي الحقول",
    totalResponses: "إجمالي الردود",
    readyForms: "نماذج جاهزة",
    imageUpload: "رفع صورة",
    timer: "مؤقت زمني",
    english: "English",
    arabic: "العربية",
    switchLang: "تغيير اللغة",
    themeToggle: "تبديل الوضع",
    submit: "إرسال",
    next: "التالي",
    prev: "السابق",
    thankYou: "تم إرسال ردك بنجاح. شكراً لك!"
  }
};

Object.assign(window.App, {
  t(key) {
    return window.i18nDict['ar'][key] || key;
  },

  toggleLanguage() {
    // Removed
  },

  applyLanguage() {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (window.i18nDict['ar'][key]) {
        el.textContent = window.i18nDict['ar'][key];
      }
    });
  }
});
