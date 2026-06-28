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

window.addEventListener('online', () => {
  if (typeof App.processSyncQueue === 'function') {
    App.processSyncQueue();
  }
});
