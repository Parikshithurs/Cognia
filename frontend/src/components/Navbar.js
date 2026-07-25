import { auth } from '../firebase.js';
import store from '../modules/store/store.js';

const NAV_ITEMS = [
    { label: 'Dashboard', icon: '🏠', hash: '#/dashboard' },
    { label: 'Focus Session', icon: '⚡', hash: '#/session' },
    { label: 'Analytics', icon: '📊', hash: '#/analytics' },
];

export function renderNavbar() {
    const user = store.get('user');
    const nav = document.createElement('nav');
    nav.className = 'sidebar';
    nav.id = 'main-nav';
    nav.innerHTML = `
    <div class="sidebar-brand">
      <span class="brand-icon">🧠</span>
      <span class="brand-name">Cognia</span>
    </div>
    <div class="sidebar-nav">
      ${NAV_ITEMS.map(item => `
        <a href="${item.hash}" class="nav-item ${location.hash === item.hash ? 'nav-item--active' : ''}">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
        </a>
      `).join('')}
    </div>
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">${user?.email?.[0]?.toUpperCase() ?? '?'}</div>
        <div class="user-details">
          <div class="user-email">${user?.email ?? 'User'}</div>
          <div class="user-role">Focus Learner</div>
        </div>
      </div>
      <button id="logout-btn" class="btn btn-secondary btn-sm" title="Sign out">↩ Sign Out</button>
    </div>
  `;

    nav.querySelector('#logout-btn').addEventListener('click', () => auth.signOut());

    // Highlight active item on hash change
    window.addEventListener('hashchange', () => {
        nav.querySelectorAll('.nav-item').forEach(a => {
            a.classList.toggle('nav-item--active', a.getAttribute('href') === location.hash);
        });
    });

    return nav;
}

export function injectNavbarStyles() {
    const style = document.createElement('style');
    style.textContent = `
    .sidebar {
      width: 260px;
      height: 100vh;
      position: sticky;
      top: 0;
      background: rgba(14,16,41,0.8);
      backdrop-filter: blur(20px);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: var(--space-6);
      z-index: 100;
    }
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-8);
    }
    .brand-icon { font-size: 2rem; }
    .brand-name {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary-light), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .sidebar-nav { display: flex; flex-direction: column; gap: var(--space-2); flex: 1; }
    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-weight: 500;
      font-size: var(--text-sm);
      transition: all var(--transition-base);
    }
    .nav-item:hover {
      background: var(--bg-card-hover);
      color: var(--text-primary);
    }
    .nav-item--active {
      background: rgba(99,102,241,0.12);
      color: var(--primary-light);
      border: 1px solid rgba(99,102,241,0.2);
    }
    .nav-icon { font-size: 1.1rem; width: 20px; text-align: center; }
    .sidebar-footer { border-top: 1px solid var(--border); padding-top: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
    .user-info { display: flex; align-items: center; gap: var(--space-3); }
    .user-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: var(--text-sm); color: white; flex-shrink: 0;
    }
    .user-email { font-size: var(--text-xs); color: var(--text-primary); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
    .user-role { font-size: 0.7rem; color: var(--text-muted); }
  `;
    if (!document.getElementById('navbar-styles')) {
        style.id = 'navbar-styles';
        document.head.appendChild(style);
    }
}
