// Run before the first paint so the saved theme does not flash on page load.
try {
  const requested = new URLSearchParams(location.search).get('theme');
  const saved = requested ?? localStorage.getItem('motionlab.theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch {
  // Storage can be unavailable in a private or embedded browser. Use the system theme.
}
