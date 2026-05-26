// ============================================================
// AUTH.JS — Firebase Authentication + Free/Pro Access Gate
// Uses ES Modules (type="module") — matches Firebase SDK v12
// ============================================================

import { initializeApp }                              from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup,
         signInWithEmailAndPassword, createUserWithEmailAndPassword,
         updateProfile, signOut, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc,
         serverTimestamp }                            from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// ── Firebase Config ─────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyB4SvcdYEvi8pXlTWX0JV8MdAf88s0FCOo",
  authDomain:        "afzal-pro-urdu-typing-master.firebaseapp.com",
  projectId:         "afzal-pro-urdu-typing-master",
  storageBucket:     "afzal-pro-urdu-typing-master.firebasestorage.app",
  messagingSenderId: "896561418284",
  appId:             "1:896561418284:web:1194d44bcee51d0f924189"
};

// ── Free tier lesson IDs (Home Row only — ids 0-5) ──────────
const FREE_LESSONS = new Set([0, 1, 2, 3, 4, 5]);

// ── Initialize Firebase ──────────────────────────────────────
const _app      = initializeApp(FIREBASE_CONFIG);
const _auth     = getAuth(_app);
const _db       = getFirestore(_app);
const _provider = new GoogleAuthProvider();

// ── App state (global so other files can read it) ────────────
window.AUTH = {
  user:    null,
  plan:    'free',
  ready:   false,
  isAdmin: false
};

// ── Expose auth functions globally so HTML onclick= works ────
window.loginWithGoogle   = loginWithGoogle;
window.loginWithEmail    = loginWithEmail;
window.registerWithEmail = registerWithEmail;
window.logout            = logout;
window.switchAuthMode    = switchAuthMode;
window._authSubmit       = _authSubmit;
window.toggleUserMenu    = toggleUserMenu;
window.closeUpgradeModal = closeUpgradeModal;
window.upgradeViaWhatsApp= upgradeViaWhatsApp;

// ============================================================
// SHOW LOADING SPINNER IMMEDIATELY
// ============================================================
(function () {
  const loading = document.createElement('div');
  loading.id = 'auth-loading';
  loading.style.cssText = [
    'position:fixed','inset:0','z-index:9998',
    'background:#0a0f1e','display:flex',
    'align-items:center','justify-content:center',
    'flex-direction:column','gap:16px'
  ].join(';');
  loading.innerHTML =
    '<div style="width:48px;height:48px;border:3px solid rgba(78,158,255,0.2);' +
    'border-top-color:#4e9eff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>' +
    '<div style="color:rgba(255,255,255,0.45);font-size:0.75rem;' +
    'font-family:\'JetBrains Mono\',monospace;letter-spacing:2px;">LOADING...</div>';
  document.body.appendChild(loading);
})();

// ============================================================
// AUTH STATE LISTENER
// ============================================================
onAuthStateChanged(_auth, async (user) => {
  document.getElementById('auth-loading')?.remove();

  if (user) {
    window.AUTH.user = user;
    await _loadUserPlan(user);
    _hideLoginScreen();
    _updateHeaderUser(user);
    _applyPlanGate();
    window.AUTH.ready = true;
    _bootApp();
  } else {
    window.AUTH.user  = null;
    window.AUTH.plan  = 'free';
    window.AUTH.ready = false;
    _showLoginScreen();
  }
});

// ============================================================
// LOAD USER PLAN FROM FIRESTORE
// ============================================================
async function _loadUserPlan(user) {
  try {
    const docRef = doc(_db, 'users', user.uid);
    const snap   = await getDoc(docRef);
    if (snap.exists()) {
      const data          = snap.data();
      window.AUTH.plan    = data.plan    || 'free';
      window.AUTH.isAdmin = data.isAdmin || false;
    } else {
      // First login — create free user record
      await setDoc(docRef, {
        uid:       user.uid,
        email:     user.email,
        name:      user.displayName || '',
        plan:      'free',
        isAdmin:   false,
        createdAt: serverTimestamp()
      });
      window.AUTH.plan    = 'free';
      window.AUTH.isAdmin = false;
    }
  } catch (err) {
    console.error('Firestore error:', err);
    window.AUTH.plan = 'free';
  }
}

// ============================================================
// LOGIN — Google
// ============================================================
function loginWithGoogle() {
  _setLoginLoading(true, 'Connecting to Google...');
  signInWithPopup(_auth, _provider)
    .catch(err => {
      _setLoginLoading(false);
      _showLoginError(_friendlyError(err));
    });
}

// ============================================================
// LOGIN — Email / Password
// ============================================================
function loginWithEmail() {
  const email = document.getElementById('auth-email')?.value?.trim();
  const pass  = document.getElementById('auth-pass')?.value;
  if (!email || !pass) { _showLoginError('Please enter email and password.'); return; }
  _setLoginLoading(true, 'Signing in...');
  signInWithEmailAndPassword(_auth, email, pass)
    .catch(err => {
      _setLoginLoading(false);
      _showLoginError(_friendlyError(err));
    });
}

// ============================================================
// REGISTER — Email / Password
// ============================================================
function registerWithEmail() {
  const email = document.getElementById('auth-email')?.value?.trim();
  const pass  = document.getElementById('auth-pass')?.value;
  const name  = document.getElementById('auth-name')?.value?.trim();
  if (!email || !pass)  { _showLoginError('Please enter email and password.'); return; }
  if (pass.length < 6)  { _showLoginError('Password must be at least 6 characters.'); return; }
  _setLoginLoading(true, 'Creating account...');
  createUserWithEmailAndPassword(_auth, email, pass)
    .then(cred => updateProfile(cred.user, { displayName: name || email.split('@')[0] }))
    .catch(err => {
      _setLoginLoading(false);
      _showLoginError(_friendlyError(err));
    });
}

// ============================================================
// LOGOUT
// ============================================================
function logout() {
  signOut(_auth).then(() => {
    window.AUTH.user = null;
    window.AUTH.plan = 'free';
    _showLoginScreen();
    _updateHeaderUser(null);
    // Hide app again
    document.getElementById('main-app')?.style    && (document.getElementById('main-app').style.display    = 'none');
    document.getElementById('main-header')?.style && (document.getElementById('main-header').style.display = 'none');
    document.getElementById('kb-hint-bar')?.style && (document.getElementById('kb-hint-bar').style.display = 'none');
  });
}

// ============================================================
// PLAN GATE
// ============================================================
function _applyPlanGate() {
  const isPro = window.AUTH.plan === 'pro' || window.AUTH.isAdmin;

  // Update plan badge
  const badge = document.getElementById('user-plan-badge');
  if (badge) {
    badge.textContent = isPro ? '⭐ PRO' : 'FREE';
    badge.className   = 'user-plan-badge ' + (isPro ? 'pro' : 'free');
  }

  // Lock lesson group buttons (Top Row, Number Row, Bottom Row)
  ['tr', 'nr', 'br'].forEach(g => {
    const btn = document.getElementById('lg-' + g);
    if (!btn) return;
    if (!isPro) {
      btn.classList.add('locked');
      btn.setAttribute('title', '🔒 Pro feature — Upgrade to unlock');
      btn.onclick = () => _showUpgradePrompt();
    } else {
      btn.classList.remove('locked');
      btn.removeAttribute('title');
      btn.onclick = () => selectGroup(g);
    }
  });

  // Lock Pro tabs (practice, timed test, progress, reference)
  const proTabs = ['practice', 'test', 'history', 'ref'];
  document.querySelectorAll('.tab').forEach(tab => {
    const match = (tab.getAttribute('onclick') || '').match(/'([^']+)'/);
    const name  = match?.[1];
    if (!isPro && name && proTabs.includes(name)) {
      tab.classList.add('tab-locked');
      tab.onclick = e => { e.preventDefault(); _showUpgradePrompt(); };
      if (!tab.querySelector('.lock-icon')) {
        tab.insertAdjacentHTML('beforeend', '<span class="lock-icon">🔒</span>');
      }
    } else if (isPro) {
      tab.classList.remove('tab-locked');
      tab.querySelectorAll('.lock-icon').forEach(i => i.remove());
    }
  });
}

// ── Check if lesson is accessible ───────────────────────────
window.canAccessLesson = function(lessonId) {
  return window.AUTH.plan === 'pro' || window.AUTH.isAdmin || FREE_LESSONS.has(lessonId);
};

// ============================================================
// UPGRADE PROMPT
// ============================================================
function _showUpgradePrompt() {
  const m = document.getElementById('upgrade-modal');
  if (m) m.style.display = 'flex';
}
function closeUpgradeModal() {
  const m = document.getElementById('upgrade-modal');
  if (m) m.style.display = 'none';
}
function upgradeViaWhatsApp() {
  const name = window.AUTH.user?.displayName || window.AUTH.user?.email || 'User';
  const msg  = encodeURIComponent(
    `السلام علیکم!\nMy name is ${name}.\nI want to upgrade to Afzal Pro — PRO plan.\nEmail: ${window.AUTH.user?.email || ''}`
  );
  window.open(`https://wa.me/923069528175?text=${msg}`, '_blank');
}

// ============================================================
// HEADER USER UI
// ============================================================
function _updateHeaderUser(user) {
  const wrap = document.getElementById('header-user-wrap');
  if (!wrap) return;
  if (!user) { wrap.innerHTML = ''; return; }

  const photo = user.photoURL
    ? `<img src="${user.photoURL}" class="user-avatar" alt="">`
    : `<div class="user-avatar-initials">${(user.displayName || user.email || 'U')[0].toUpperCase()}</div>`;

  wrap.innerHTML = `
    <div class="user-info-wrap" onclick="toggleUserMenu()">
      ${photo}
      <div class="user-details">
        <span class="user-name">${user.displayName || user.email.split('@')[0]}</span>
        <span class="user-plan-badge ${window.AUTH.plan === 'pro' ? 'pro' : 'free'}" id="user-plan-badge">
          ${window.AUTH.plan === 'pro' ? '⭐ PRO' : 'FREE'}
        </span>
      </div>
      <span class="user-chevron">▾</span>
    </div>
    <div class="user-menu" id="user-menu">
      <div class="user-menu-email">${user.email}</div>
      ${window.AUTH.plan === 'free'
        ? `<button class="user-menu-item upgrade-item" onclick="_showUpgradePrompt()">⭐ Upgrade to Pro</button>`
        : `<div class="user-menu-item pro-active">⭐ Pro Plan Active</div>`}
      <button class="user-menu-item" onclick="logout()">🚪 Sign Out</button>
    </div>`;
}

function toggleUserMenu() {
  document.getElementById('user-menu')?.classList.toggle('visible');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.user-info-wrap'))
    document.getElementById('user-menu')?.classList.remove('visible');
});

// ============================================================
// LOGIN SCREEN
// ============================================================
function _showLoginScreen() {
  let screen = document.getElementById('login-screen');
  if (screen) { screen.style.display = 'flex'; return; }

  screen = document.createElement('div');
  screen.id        = 'login-screen';
  screen.className = 'login-screen';
  screen.innerHTML = `
    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo-icon">AF</div>
        <div>
          <div class="login-logo-text">AFZAL PRO</div>
          <div class="login-logo-sub">Urdu Typing Master</div>
        </div>
      </div>
      <div class="login-title">Welcome Back</div>
      <div class="login-subtitle">Sign in to continue your Urdu typing journey</div>
      <button class="login-google-btn" onclick="loginWithGoogle()">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continue with Google
      </button>
      <div class="login-divider"><span>or sign in with email</span></div>
      <div class="login-toggle">
        <button class="login-toggle-btn active" id="btn-signin" onclick="switchAuthMode('signin')">Sign In</button>
        <button class="login-toggle-btn"        id="btn-signup" onclick="switchAuthMode('signup')">Create Account</button>
      </div>
      <div id="auth-name-wrap" class="login-field" style="display:none;">
        <input type="text" id="auth-name" class="login-input" placeholder="Your full name">
      </div>
      <div class="login-field">
        <input type="email" id="auth-email" class="login-input" placeholder="Email address">
      </div>
      <div class="login-field">
        <input type="password" id="auth-pass" class="login-input" placeholder="Password"
          onkeydown="if(event.key==='Enter')_authSubmit()">
      </div>
      <div class="login-error"   id="login-error"   style="display:none;"></div>
      <div class="login-loading" id="login-loading" style="display:none;">
        <div class="login-spinner"></div>
        <span id="login-loading-text">Please wait...</span>
      </div>
      <button class="login-submit-btn" id="login-submit-btn" onclick="_authSubmit()">Sign In</button>
      <div class="login-free-note">
        🎉 Free account includes <strong>Home Row lessons</strong> — upgrade for full access
      </div>
    </div>`;
  document.body.appendChild(screen);
  setTimeout(() => document.getElementById('auth-email')?.focus(), 100);
}

function _hideLoginScreen() {
  const screen = document.getElementById('login-screen');
  if (screen) screen.style.display = 'none';
  // Reveal app
  const app    = document.getElementById('main-app');
  const header = document.getElementById('main-header');
  const hint   = document.getElementById('kb-hint-bar');
  if (app)    app.style.display    = '';
  if (header) header.style.display = '';
  if (hint)   hint.style.display   = '';
}

// ============================================================
// AUTH MODE TOGGLE
// ============================================================
let _authMode = 'signin';
function switchAuthMode(mode) {
  _authMode = mode;
  document.getElementById('btn-signin')?.classList.toggle('active', mode === 'signin');
  document.getElementById('btn-signup')?.classList.toggle('active', mode === 'signup');
  const nameWrap  = document.getElementById('auth-name-wrap');
  const submitBtn = document.getElementById('login-submit-btn');
  if (nameWrap)  nameWrap.style.display  = mode === 'signup' ? 'block' : 'none';
  if (submitBtn) submitBtn.textContent   = mode === 'signup' ? 'Create Account' : 'Sign In';
  _clearLoginError();
}
function _authSubmit() {
  if (_authMode === 'signup') registerWithEmail();
  else loginWithEmail();
}

// ============================================================
// LOGIN UI HELPERS
// ============================================================
function _setLoginLoading(show, text = 'Please wait...') {
  const loading = document.getElementById('login-loading');
  const btn     = document.getElementById('login-submit-btn');
  const google  = document.querySelector('.login-google-btn');
  if (loading) {
    loading.style.display = show ? 'flex' : 'none';
    const lt = document.getElementById('login-loading-text');
    if (lt) lt.textContent = text;
  }
  if (btn)    btn.disabled    = show;
  if (google) google.disabled = show;
}
function _showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function _clearLoginError() {
  const el = document.getElementById('login-error');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}
function _friendlyError(err) {
  const map = {
    'auth/user-not-found':        'No account found with this email.',
    'auth/wrong-password':        'Incorrect password. Please try again.',
    'auth/invalid-credential':    'Invalid email or password.',
    'auth/email-already-in-use':  'An account already exists with this email.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/weak-password':         'Password must be at least 6 characters.',
    'auth/popup-closed-by-user':  'Sign-in cancelled. Please try again.',
    'auth/network-request-failed':'Network error. Check your connection.',
    'auth/too-many-requests':     'Too many attempts. Please wait a moment.',
  };
  return map[err.code] || err.message || 'Something went wrong. Please try again.';
}

// ============================================================
// BOOT APP — called after successful auth
// ============================================================
function _bootApp() {
  if (typeof buildKeyboard === 'function') buildKeyboard();
  if (typeof selectGroup   === 'function') selectGroup('hr');
  if (typeof initLesson    === 'function') initLesson();
  if (typeof buildRef      === 'function') buildRef();
  const initData = typeof loadData === 'function' ? loadData() : {};
  const streakEl = document.getElementById('streak-val');
  if (streakEl) streakEl.textContent = initData.streak || 0;
  const savedCand = localStorage.getItem('urdu-tm-candidate') || '';
  const nameInput = document.getElementById('candidate-name-input');
  if (nameInput && savedCand) nameInput.value = savedCand;
  const cap = document.getElementById('capture');
  if (cap) setTimeout(() => cap.focus(), 200);
}
