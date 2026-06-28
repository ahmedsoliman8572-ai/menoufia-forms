// =============================================
// IMAGE COMPRESSOR UTILITY
// =============================================
window.ImageCompressor = {
  /**
   * Compress an image file
   * @param {File} file - The image file from input
   * @param {Object} options - Compression options
   * @param {number} options.maxWidth - Maximum width
   * @param {number} options.maxHeight - Maximum height
   * @param {number} options.quality - JPEG quality (0.0 to 1.0)
   * @returns {Promise<string>} - Base64 encoded compressed image
   */
  compress(file, { maxWidth = 800, maxHeight = 800, quality = 0.7 } = {}) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('يجب اختيار ملف صورة صالح.'));
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          // Fill with white background in case of transparent PNG to JPEG conversion
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Get compressed base64 (always use image/jpeg for better compression)
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('فشل في قراءة الصورة.'));
      };
      reader.onerror = () => reject(new Error('فشل في تحميل الملف.'));
    });
  }
};
