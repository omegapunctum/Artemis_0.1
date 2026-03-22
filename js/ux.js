let loadingCounter = 0;

export function debounce(fn, delay) {
  let timerId = null;
  return function debounced(...args) {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => fn.apply(this, args), delay);
  };
}

export function showError(message) {
  const banner = document.getElementById('error-banner');
  if (!banner) return;
  banner.textContent = String(message || 'Произошла ошибка.');
  banner.hidden = false;
}

export function clearError() {
  const banner = document.getElementById('error-banner');
  if (!banner) return;
  banner.hidden = true;
  banner.textContent = '';
}

export function showLoading() {
  const indicator = document.getElementById('loading-indicator');
  if (!indicator) return;
  loadingCounter += 1;
  indicator.hidden = false;
}

export function hideLoading() {
  const indicator = document.getElementById('loading-indicator');
  if (!indicator) return;
  loadingCounter = Math.max(0, loadingCounter - 1);
  indicator.hidden = loadingCounter > 0;
}
