// =============================================
// SHARE MODAL
// =============================================
Object.assign(window.App, {
  async openShareModal() {
    const form = this.getForm();
    if(!form) return;

    const shareUrl = `${window.location.origin}${window.location.pathname}?fill=${form.id}`;
    
    // Set default value immediately
    document.getElementById('share-link-input').value = shareUrl;

    this.updateQRCode(shareUrl);

    this.switchShareTab('link');
    document.getElementById('share-modal').style.display = 'flex';
  },

  async updateQRCode(url) {
    const container = document.getElementById('qrcode-container');
    if (!container) return;
    
    container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;">جاري التحميل...</p>';
    
    try {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js');
      container.innerHTML = '';
      new QRCode(container, {
        text: url,
        width: 150,
        height: 150,
        colorDark: "#6366f1",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch(e) {
      container.innerHTML = '<p style="color:red;font-size:0.9rem;">فشل تحميل الـ QR Code</p>';
    }
  },

  switchShareTab(tab) {
    document.querySelectorAll('[id^="share-content-"]').forEach(el => el.style.display = 'none');
    document.querySelectorAll('[id^="share-tab-"]').forEach(el => { el.classList.remove('btn-primary'); el.classList.add('btn-ghost'); });
    
    document.getElementById('share-content-' + tab).style.display = 'block';
    document.getElementById('share-tab-' + tab).classList.remove('btn-ghost');
    document.getElementById('share-tab-' + tab).classList.add('btn-primary');
  },

  copyShareLink() {
    const input = document.getElementById('share-link-input');
    const text = input.value;
    if(navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('تم نسخ الرابط بنجاح 🔗', 'success');
      }).catch(() => {
        // Fallback
        input.select();
        document.execCommand('copy');
        this.showToast('تم نسخ الرابط بنجاح 🔗', 'success');
      });
    } else {
      input.select();
      document.execCommand('copy');
      this.showToast('تم نسخ الرابط بنجاح 🔗', 'success');
    }
  },


  shareSocial(platform) {
    const url = encodeURIComponent(document.getElementById('share-link-input').value);
    const text = encodeURIComponent('شاركني رأيك في هذا النموذج:');
    let shareUrl = '';

    if(platform === 'whatsapp') shareUrl = `https://api.whatsapp.com/send?text=${text}%20${url}`;
    if(platform === 'telegram') shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
    if(platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;

    if(shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
  },

  
});
