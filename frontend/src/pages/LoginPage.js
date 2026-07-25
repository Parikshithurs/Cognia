import { auth } from '../firebase.js';
import { showToast } from '../components/Toast.js';

export function renderLoginPage() {
    const el = document.createElement('div');
    el.className = 'login-page';
    el.innerHTML = `
    <div class="login-bg">
      <div class="login-orb orb-1"></div>
      <div class="login-orb orb-2"></div>
      <div class="login-orb orb-3"></div>
    </div>
    <div class="login-container animate-fade-up">
      <div class="login-header">
        <span class="login-logo">🧠</span>
        <h1 class="login-title">Cognia</h1>
        <p class="login-subtitle">Your ADHD Focus Companion</p>
      </div>

      <div class="login-tabs">
        <button class="tab-btn tab-active" data-tab="login">Sign In</button>
        <button class="tab-btn" data-tab="register">Create Account</button>
      </div>

      <form id="auth-form" class="login-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input id="email" type="email" class="form-input" placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input id="password" type="password" class="form-input" placeholder="••••••••" required autocomplete="current-password" minlength="6" />
        </div>
        <div class="form-group" id="confirm-group" style="display:none">
          <label class="form-label" for="confirm">Confirm Password</label>
          <input id="confirm" type="password" class="form-input" placeholder="••••••••" autocomplete="new-password" />
        </div>
        <button type="submit" id="auth-submit" class="btn btn-primary btn-lg" style="width:100%">Sign In</button>
      </form>

      <div class="login-divider">
        <span>or continue with</span>
      </div>

      <button id="google-btn" class="btn btn-secondary btn-lg google-btn" style="width:100%">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <p class="login-features">
        <span>📷 Camera Focus Tracking</span>
        <span>⚡ Micro-Sessions</span>
        <span>📊 Progress Analytics</span>
      </p>
    </div>
  `;

    injectLoginStyles();

    let mode = 'login';

    // Tab switching
    el.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            mode = btn.dataset.tab;
            el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
            btn.classList.add('tab-active');

            const submit = el.querySelector('#auth-submit');
            const confirmGroup = el.querySelector('#confirm-group');
            const isRegister = mode === 'register';

            submit.textContent = isRegister ? 'Create Account' : 'Sign In';
            confirmGroup.style.display = isRegister ? 'flex' : 'none';
        });
    });

    // Auth form
    el.querySelector('#auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = el.querySelector('#email').value.trim();
        const password = el.querySelector('#password').value;
        const confirm = el.querySelector('#confirm').value;
        const btn = el.querySelector('#auth-submit');

        if (mode === 'register' && password !== confirm) {
            showToast('Passwords do not match.', 'error'); return;
        }

        btn.disabled = true;
        btn.textContent = '…';

        try {
            if (mode === 'login') {
                await auth.signInWithEmailAndPassword(email, password);
                showToast('Welcome back! 🧠', 'success');
            } else {
                await auth.createUserWithEmailAndPassword(email, password);
                showToast('Account created! Let\'s focus 🚀', 'success');
            }
        } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = mode === 'login' ? 'Sign In' : 'Create Account';
        }
    });

    // Google sign-in
    el.querySelector('#google-btn').addEventListener('click', async () => {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
            showToast('Signed in with Google! 🧠', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    return el;
}

function injectLoginStyles() {
    if (document.getElementById('login-styles')) return;
    const style = document.createElement('style');
    style.id = 'login-styles';
    style.textContent = `
    .login-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden; padding: var(--space-4);
    }
    .login-bg { position: absolute; inset: 0; pointer-events: none; }
    .login-orb {
      position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.35;
      animation: float 6s ease-in-out infinite;
    }
    .orb-1 { width: 400px; height: 400px; background: var(--primary); top: -100px; left: -100px; animation-delay: 0s; }
    .orb-2 { width: 300px; height: 300px; background: var(--accent); bottom: -80px; right: -80px; animation-delay: 2s; }
    .orb-3 { width: 200px; height: 200px; background: var(--primary-light); top: 50%; left: 50%; animation-delay: 4s; }
    .login-container {
      width: 100%; max-width: 420px;
      background: rgba(14,16,41,0.8); backdrop-filter: blur(30px);
      border: 1px solid var(--glass-border); border-radius: var(--radius-xl);
      padding: var(--space-10); position: relative; z-index: 1;
    }
    .login-header { text-align: center; margin-bottom: var(--space-8); }
    .login-logo { font-size: 3rem; display: block; margin-bottom: var(--space-3); animation: float 3s ease-in-out infinite; }
    .login-title {
      font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 700;
      background: linear-gradient(135deg, var(--primary-light), var(--accent));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .login-subtitle { color: var(--text-secondary); font-size: var(--text-sm); margin-top: var(--space-2); }
    .login-tabs { display: flex; background: var(--bg-card); border-radius: var(--radius-full); padding: 4px; margin-bottom: var(--space-6); }
    .tab-btn {
      flex: 1; padding: var(--space-2) var(--space-4); border-radius: var(--radius-full);
      font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary);
      transition: all var(--transition-base);
    }
    .tab-active { background: var(--primary); color: white; box-shadow: 0 0 15px var(--primary-glow); }
    .login-form { display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-4); }
    .login-divider {
      text-align: center; color: var(--text-muted); font-size: var(--text-xs);
      margin: var(--space-4) 0; position: relative;
    }
    .login-divider::before, .login-divider::after {
      content: ''; position: absolute; top: 50%; width: calc(50% - 50px);
      height: 1px; background: var(--border);
    }
    .login-divider::before { left: 0; }
    .login-divider::after { right: 0; }
    .google-btn { margin-bottom: var(--space-6); }
    .login-features {
      display: flex; justify-content: center; gap: var(--space-4);
      flex-wrap: wrap; color: var(--text-muted); font-size: var(--text-xs);
    }
  `;
    document.head.appendChild(style);
}
