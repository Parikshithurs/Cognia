/**
 * Toast notification system
 * Usage: showToast('message', 'success' | 'error' | 'info' | 'warning')
 */
const DURATION = 4000;

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: '💡' };
    toast.innerHTML = `
    <span class="toast-icon">${icons[type] ?? '💡'}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="Dismiss">×</button>
  `;

    const remove = () => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', remove);
    container.appendChild(toast);
    toast.style.animation = 'toastSlideIn 0.3s ease forwards';

    setTimeout(remove, DURATION);
}
