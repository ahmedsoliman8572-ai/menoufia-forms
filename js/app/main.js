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
