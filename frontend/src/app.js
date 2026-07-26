import { auth } from './firebase.js';
import store from './modules/store/store.js';
import { renderNavbar, injectNavbarStyles } from './components/Navbar.js';
import { renderLoginPage } from './pages/LoginPage.js';
import { renderDashboardPage } from './pages/DashboardPage.js';
import { renderSessionPage } from './pages/SessionPage.js';
import { renderAnalyticsPage } from './pages/AnalyticsPage.js';

const app = document.getElementById('app');

// === Router ===
const routes = {
    '#/dashboard': renderDashboardPage,
    '#/session': renderSessionPage,
    '#/analytics': renderAnalyticsPage,
};

async function renderApp(user) {
    app.innerHTML = '';

    if (!user) {
        app.appendChild(renderLoginPage());
        return;
    }

    // Authenticated — build main layout
    store.set('user', user);
    injectNavbarStyles();

    const layout = document.createElement('div');
    layout.className = 'main-layout';

    const sidebar = renderNavbar();
    const main = document.createElement('main');
    main.className = 'main-content';
    main.id = 'main-outlet';

    layout.appendChild(sidebar);
    layout.appendChild(main);
    app.appendChild(layout);

    // Initial route
    if (!location.hash || !routes[location.hash]) {
        location.hash = '#/dashboard';
    }

    await navigateTo(location.hash, main);
}

async function navigateTo(hash, mainEl) {
    const outlet = mainEl || document.getElementById('main-outlet');
    if (!outlet) return;

    const render = routes[hash];
    if (!render) {
        outlet.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>Page not found</h3></div>`;
        return;
    }

    outlet.innerHTML = '';
    const loader = document.createElement('div');
    loader.className = 'empty-state';
    loader.innerHTML = '<div class="animate-spin" style="font-size:2rem">🧠</div>';
    outlet.appendChild(loader);

    try {
        const page = await render();
        outlet.innerHTML = '';
        outlet.appendChild(page);
    } catch (err) {
        outlet.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error loading page</h3><p>${err.message}</p></div>`;
    }
}

// Listen for hash changes
window.addEventListener('hashchange', () => {
    navigateTo(location.hash);
});

// === Firebase Auth State ===
auth.onAuthStateChanged(async (user) => {
    await renderApp(user);

    // Redirect after login
    if (user && (!location.hash || location.hash === '#/' || location.hash === '#/login')) {
        location.hash = '#/dashboard';
    }

    // Redirect to login if logged out
    if (!user && location.hash !== '#/login') {
        location.hash = '#/login';
    }
});

// Add toast styles globally
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  #toast-container {
    position: fixed; top: var(--space-6); right: var(--space-6);
    display: flex; flex-direction: column; gap: var(--space-3);
    z-index: 9999; max-width: 360px;
  }
  .toast {
    display: flex; align-items: center; gap: var(--space-3);
    background: var(--bg-surface); border: 1px solid var(--border);
    backdrop-filter: blur(20px);
    border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
    box-shadow: var(--shadow-lg); font-size: var(--text-sm);
  }
  .toast-success { border-left: 3px solid var(--success); }
  .toast-error   { border-left: 3px solid var(--danger);  }
  .toast-warning { border-left: 3px solid var(--warning); }
  .toast-info    { border-left: 3px solid var(--primary); }
  .toast-icon { font-size: 1rem; flex-shrink: 0; }
  .toast-msg  { flex: 1; color: var(--text-primary); }
  .toast-close { color: var(--text-muted); font-size: 1.2rem; line-height: 1; cursor: pointer; background: none; transition: color var(--transition-fast); }
  .toast-close:hover { color: var(--text-primary); }
`;
document.head.appendChild(toastStyle);
