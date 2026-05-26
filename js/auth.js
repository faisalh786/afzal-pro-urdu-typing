// ============================================================
// AUTH.JS — Firebase Authentication + Free/Pro Access Gate
// Afzal Pro Urdu Typing Master
// ============================================================
// REPLACE the values below with your real Firebase config
// from your saved firebase-config.txt file
// ============================================================
<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyB4SvcdYEvi8pXlTWX0JV8MdAf88s0FCOo",
    authDomain: "afzal-pro-urdu-typing-master.firebaseapp.com",
    projectId: "afzal-pro-urdu-typing-master",
    storageBucket: "afzal-pro-urdu-typing-master.firebasestorage.app",
    messagingSenderId: "896561418284",
    appId: "1:896561418284:web:1194d44bcee51d0f924189"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
</script>
// ── Free tier lesson IDs (Home Row only — ids 0-5) ──────────
const FREE_LESSONS = new Set([0, 1, 2, 3, 4, 5]);

// ── App state ────────────────────────────────────────────────
window.AUTH = {
  user:    null,   // Firebase user object
  plan:    'free', // 'free' | 'pro'
  ready:   false,  // true after auth check completes
  db:      null,   // Firestore instance
  isAdmin: false   // admin override
};

// ── Initialize Firebase ──────────────────────────────────────
firebase.initializeApp(FIREBASE_CONFIG);
const _auth = firebase.auth();
const _db   = firebase.firestore();
window.AUTH.db = _db;

// ============================================================
// AUTH STATE LISTENER — runs on every page load
// ============================================================
_auth.onAuthStateChanged(async (user) => {
  if (user) {
    // User is logged in
    window.AUTH.user = user;
    await _loadUserPlan(user);
    _hideLoginScreen();
    _updateHeaderUser(user);
    _applyPlanGate();
    window.AUTH.ready = true;
    _bootApp();
  } else {
    // Not logged in — show login screen
    window.AUTH.user = null;
    window.AUTH.plan = 'free';
    window.AUTH.ready = false;
    _showLoginScreen();
  }
});

// ============================================================
// LOAD USER PLAN FROM FIRESTORE
// ============================================================
async function _loadUserPlan(user) {
  try {
    const docRef = _db.collection('users').doc(user.uid);
    const doc    = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      window.AUTH.plan    = data.plan || 'free';
      window.AUTH.isAdmin = data.isAdmin || false;
    } else {
      // First time user — create their record as free
      await docRef.set({
        uid:       user.uid,
        email:     user.email,
        name:      user.displayName || '',
        plan:      'free',
        isAdmin:   false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.AUTH.plan = 'free';
    }
  } catch (err) {
    console.error('Plan load error:', err);
    window.AUTH.plan = 'free'; // default to free on error
  }
}

// ============================================================
// LOGIN — Google Sign In
// ============================================================
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  _setLoginLoading(true, 'Connecting to Google...');
  _auth.signInWithPopup(provider)
    .catch(err => {
      _setLoginLoading(false);
      _showLoginError(_friendlyError(err));
    });
}

// ============================================================
// LOGIN — Email / Password Sign In
// ============================================================
function loginWithEmail() {
  const email = document.getElementById('auth-email')?.value?.trim();
  const pass  = document.getElementById('auth-pass')?.value;
  if (!email || !pass) { _showLoginError('Please enter email and password.'); return; }
  _setLoginLoading(true, 'Signing in...');
  _auth.signInWithEmailAndPassword(email, pass)
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
  if (!email || !pass)        { _showLoginError('Please enter email and password.'); return; }
  if (pass.length < 6)        { _showLoginError('Password must be at least 6 characters.'); return; }
  _setLoginLoading(true, 'Creating account...');
  _auth.createUserWithEmailAndPassword(email, pass)
    .then(cred => cred.user.updateProfile({ displayName: name || email.split('@')[0] }))
    .catch(err => {
      _setLoginLoading(false);
      _showLoginError(_friendlyError(err));
    });
}

// ============================================================
// LOGOUT
// ============================================================
function logout() {
  _auth.signOut().then(() => {
    window.AUTH.user = null;
    window.AUTH.plan = 'free';
    _showLoginScreen();
    _updateHeaderUser(null);
  });
}

// ============================================================
// PLAN GATE — lock/unlock lessons based on plan
// ============================================================
function _applyPlanGate() {
  const isPro = window.AUTH.plan === 'pro' || window.AUTH.isAdmin;

  // Update header badge
  const planBadge = document.getElementById('user-plan-badge');
  if (planBadge) {
    planBadge.textContent  = isPro ? '⭐ PRO' : 'FREE';
    planBadge.className    = 'user-plan-badge ' + (isPro ? 'pro' : 'free');
  }

  // Lock/unlock lesson group buttons
  const groups = ['hr','tr','nr','br'];
  groups.forEach(g => {
    const btn = document.getElementById('lg-' + g);
    if (!btn) return;
    const isLocked = !isPro && g !== 'hr';
    btn.classList.toggle('locked', isLocked);
    if (isLocked) {
      btn.setAttribute('title', '🔒 Pro feature — Upgrade to unlock');
      btn.onclick = () => _showUpgradePrompt();
    } else {
      btn.removeAttribute('title');
      btn.onclick = () => selectGroup(g);
    }
  });

  // Lock pro lesson phase buttons
  document.querySelectorAll('.lesson-phase-btn').forEach(btn => {
    const idx = parseInt(btn.getAttribute('data-idx'));
    if (!isNaN(idx) && !isPro && !FREE_LESSONS.has(idx)) {
      btn.classList.add('locked');
      btn.onclick = (e) => { e.stopPropagation(); _showUpgradePrompt(); };
    }
  });

  // Lock practice, timed test, progress, reference tabs for free users
  const proTabs = ['practice','test','history','ref'];
  document.querySelectorAll('.tab').forEach(tab => {
    const onclick = tab.getAttribute('onclick') || '';
    const tabName = onclick.match(/'([^']+)'/)?.[1];
    if (!isPro && tabName && proTabs.includes(tabName)) {
      tab.classList.add('tab-locked');
      tab.onclick = (e) => { e.preventDefault(); _showUpgradePrompt(); };
      if (!tab.querySelector('.lock-icon')) {
        tab.insertAdjacentHTML('beforeend', '<span class="lock-icon">🔒</span>');
      }
    }
  });
}

// ============================================================
// CHECK if a lesson is accessible
// ============================================================
function canAccessLesson(lessonId) {
  if (window.AUTH.plan === 'pro' || window.AUTH.isAdmin) return true;
  return FREE_LESSONS.has(lessonId);
}

// ============================================================
// UPGRADE PROMPT
// ============================================================
function _showUpgradePrompt() {
  document.getElementById('upgrade-modal')?.style &&
  (document.getElementById('upgrade-modal').style.display = 'flex');
}

function closeUpgradeModal() {
  const m = document.getElementById('upgrade-modal');
  if (m) m.style.display = 'none';
}

function upgradeViaWhatsApp() {
  const name = window.AUTH.user?.displayName || window.AUTH.user?.email || 'User';
  const msg  = encodeURIComponent(
    `السلام علیکم!\nMy name is ${name}.\nI want to upgrade to Afzal Pro Urdu Typing Master — PRO plan.\nMy email: ${window.AUTH.user?.email || ''}`
  );
  window.open(`https://wa.me/923069528175?text=${msg}`, '_blank');
}

// ============================================================
// HEADER USER UI
// ============================================================
function _updateHeaderUser(user) {
  const wrap = document.getElementById('header-user-wrap');
  if (!wrap) return;
  if (user) {
    const photo = user.photoURL
      ? `<img src="${user.photoURL}" class="user-avatar" alt="avatar">`
      : `<div class="user-avatar-initials">${(user.displayName||user.email||'U')[0].toUpperCase()}</div>`;
    wrap.innerHTML = `
      <div class="user-info-wrap" onclick="toggleUserMenu()">
        ${photo}
        <div class="user-details">
          <span class="user-name">${user.displayName || user.email.split('@')[0]}</span>
          <span class="user-plan-badge ${window.AUTH.plan==='pro'?'pro':'free'}" id="user-plan-badge">
            ${window.AUTH.plan==='pro'?'⭐ PRO':'FREE'}
          </span>
        </div>
        <span class="user-chevron">▾</span>
      </div>
      <div class="user-menu" id="user-menu">
        <div class="user-menu-email">${user.email}</div>
        ${window.AUTH.plan==='free'
          ? `<button class="user-menu-item upgrade-item" onclick="closeUpgradeModal();_showUpgradePrompt()">⭐ Upgrade to Pro</button>`
          : `<div class="user-menu-item pro-active">⭐ Pro Plan Active</div>`
        }
        <button class="user-menu-item" onclick="logout()">🚪 Sign Out</button>
      </div>`;
  } else {
    wrap.innerHTML = '';
  }
}

function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) menu.classList.toggle('visible');
}

// Close menu on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.user-info-wrap')) {
    document.getElementById('user-menu')?.classList.remove('visible');
  }
});

// ============================================================
// LOGIN SCREEN SHOW / HIDE
// ============================================================
function _showLoginScreen() {
  let screen = document.getElementById('login-screen');
  if (screen) { screen.style.display = 'flex'; return; }

  // Build it dynamically if not in HTML yet
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
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
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
          onkeydown="if(event.key==='Enter') _authSubmit()">
      </div>

      <div class="login-error" id="login-error" style="display:none;"></div>
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
  document.getElementById('auth-email')?.focus();
}

function _hideLoginScreen() {
  const screen = document.getElementById('login-screen');
  if (screen) screen.style.display = 'none';
}

// ============================================================
// AUTH MODE TOGGLE — Sign In / Create Account
// ============================================================
let _authMode = 'signin';
function switchAuthMode(mode) {
  _authMode = mode;
  document.getElementById('btn-signin').classList.toggle('active', mode === 'signin');
  document.getElementById('btn-signup').classList.toggle('active', mode === 'signup');
  const nameWrap = document.getElementById('auth-name-wrap');
  if (nameWrap) nameWrap.style.display = mode === 'signup' ? 'block' : 'none';
  const submitBtn = document.getElementById('login-submit-btn');
  if (submitBtn) submitBtn.textContent = mode === 'signup' ? 'Create Account' : 'Sign In';
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
  if (loading) { loading.style.display = show ? 'flex' : 'none';
    document.getElementById('login-loading-text').textContent = text; }
  if (btn)    btn.disabled   = show;
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
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/popup-closed-by-user': 'Sign-in cancelled. Please try again.',
    'auth/network-request-failed':'Network error. Check your connection.',
    'auth/too-many-requests':    'Too many attempts. Please wait a moment.',
    'auth/invalid-credential':   'Invalid email or password.',
  };
  return map[err.code] || err.message || 'Something went wrong. Please try again.';
}

// ============================================================
// BOOT APP — called after successful auth
// ============================================================
function _bootApp() {
  if (typeof buildKeyboard  === 'function') buildKeyboard();
  if (typeof selectGroup    === 'function') selectGroup('hr');
  if (typeof initLesson     === 'function') initLesson();
  if (typeof buildRef       === 'function') buildRef();
  const initData = typeof loadData === 'function' ? loadData() : {};
  const streakEl = document.getElementById('streak-val');
  if (streakEl) streakEl.textContent = initData.streak || 0;
  const savedCand = localStorage.getItem('urdu-tm-candidate') || '';
  const nameInput = document.getElementById('candidate-name-input');
  if (nameInput && savedCand) nameInput.value = savedCand;
  const cap = document.getElementById('capture');
  if (cap) cap.focus();
}
