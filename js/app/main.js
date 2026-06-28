// =============================================
// MAIN INIT
// =============================================
window.onload = async () => {
  try {
    await App.init();
  } catch (err) {
    console.error("Failed to initialize app:", err);
  }
};

// Register Service Worker for PWA & Offline Caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}
