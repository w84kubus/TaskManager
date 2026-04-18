'use strict';

/* ============================================================
   STAŁE / SŁOWNIKI
   ============================================================ */
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const PRIORITY_LABEL = { high: 'Wysoki', medium: 'Średni', low: 'Niski' };
const CATEGORY_LABEL = {
  personal: 'Osobiste',
  work:     'Praca',
  shopping: 'Zakupy',
  health:   'Zdrowie',
  other:    'Inne',
};

/* ============================================================
   STAN APLIKACJI
   ============================================================ */
const state = {
  tasks:         [],
  filter:        'all',
  sort:          'date-desc',
  search:        '',
  darkMode:      false,
  notifications: true,
  currentUser:   null,   // { email, name, provider, uid }
};

/* ============================================================
   localStorage – zapis / odczyt (per-user)
   ============================================================ */
function userKey(key) {
  const id = state.currentUser
    ? (state.currentUser.email || state.currentUser.uid || '_guest')
    : '_guest';
  return `tm_${id}_${key}`;
}

function saveState() {
  localStorage.setItem(userKey('tasks'), JSON.stringify(state.tasks));
  localStorage.setItem(userKey('dark'),  JSON.stringify(state.darkMode));
  localStorage.setItem(userKey('notif'), JSON.stringify(state.notifications));
}

function loadState() {
  try {
    const tasks = localStorage.getItem(userKey('tasks'));
    const dark  = localStorage.getItem(userKey('dark'));
    const notif = localStorage.getItem(userKey('notif'));

    if (tasks !== null) state.tasks         = JSON.parse(tasks);
    if (dark  !== null) state.darkMode      = JSON.parse(dark);
    if (notif !== null) state.notifications = JSON.parse(notif);
  } catch (e) {
    console.warn('[TaskManager] Błąd odczytu localStorage:', e);
  }
}

/* ============================================================
   FIREBASE – konfiguracja i synchronizacja w chmurze
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyB9wNhtfhgXAepXE2cGxRECK4PQ3HVYYy8',
  authDomain:        'taskmanager-6dcaf.firebaseapp.com',
  projectId:         'taskmanager-6dcaf',
  storageBucket:     'taskmanager-6dcaf.firebasestorage.app',
  messagingSenderId: '749463900730',
  appId:             '1:749463900730:web:85a386c0aa36c32dab9b03',
};

let _db   = null;
let _auth = null;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') return;
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db   = firebase.firestore();
    _auth = firebase.auth();
  } catch (e) {
    console.warn('[Firebase] Inicjalizacja nieudana:', e);
  }
}

// ID dokumentu = Firebase Auth UID (bezpieczne, unikalne)
function firestoreDocId() {
  if (!state.currentUser || state.currentUser.provider === 'guest') return null;
  return state.currentUser.uid || null;
}

// Referencja do kolekcji zadań użytkownika (każde zadanie = osobny dokument)
function tasksCol() {
  const docId = firestoreDocId();
  return (_db && docId) ? _db.collection('users').doc(docId).collection('tasks') : null;
}

// Zapisz / zaktualizuj jedno zadanie w Firestore
function firestoreSetTask(task) {
  const col = tasksCol();
  if (!col) return;
  col.doc(task.id).set(task).catch(e => {
    console.warn('[FB] setTask:', e);
    if (e.code === 'permission-denied') {
      showToast('⚠️ Sync: brak uprawnień Firestore — sprawdź reguły', 'error', 6000);
    }
  });
}

// Usuń jedno zadanie z Firestore
function firestoreDeleteTask(taskId) {
  const col = tasksCol();
  if (!col) return;
  col.doc(taskId).delete().catch(e => {
    console.warn('[FB] deleteTask:', e);
    if (e.code === 'permission-denied') {
      showToast('⚠️ Sync: brak uprawnień Firestore — sprawdź reguły', 'error', 6000);
    }
  });
}

// Synchronizuj ustawienia konta (powiadomienia + dark mode)
function firestoreSyncSettings() {
  const docId = firestoreDocId();
  if (!_db || !docId) return;
  _db.collection('users').doc(docId).set({
    notifications: state.notifications,
    darkMode:      state.darkMode,
    updatedAt:     firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true }).catch(e => console.warn('[FB] syncSettings:', e));
}

// Wczytaj wszystkie dane z Firestore (przy logowaniu / ładowaniu strony)
async function firestoreLoad() {
  const docId = firestoreDocId();
  if (!_db || !docId) return false;
  try {
    const userDoc = await _db.collection('users').doc(docId).get();
    if (userDoc.exists) {
      const d = userDoc.data();
      if (typeof d.notifications === 'boolean') state.notifications = d.notifications;
      if (typeof d.darkMode      === 'boolean') state.darkMode      = d.darkMode;
    }
    const snap = await tasksCol().get();
    if (!snap.empty) {
      state.tasks = snap.docs.map(d => d.data());
      state.tasks.sort((a, b) => b.createdAt - a.createdAt);
      return true;
    }
    return userDoc.exists;
  } catch (e) {
    console.warn('[FB] load:', e);
    if (e.code === 'permission-denied') {
      showToast('⚠️ Firestore: brak uprawnień — sprawdź reguły bezpieczeństwa', 'error', 8000);
    }
    return false;
  }
}

// Nasłuchiwacz czasu rzeczywistego — kolekcja zadań
let _firestoreUnsubscribe = null;

function firestoreStartListener() {
  const col = tasksCol();
  if (!col) return;
  if (_firestoreUnsubscribe) { _firestoreUnsubscribe(); _firestoreUnsubscribe = null; }

  _firestoreUnsubscribe = col.onSnapshot(snapshot => {
    let changed = false;

    snapshot.docChanges().forEach(change => {
      if (change.doc.metadata.hasPendingWrites) return;
      const task = change.doc.data();

      if (change.type === 'added') {
        if (!state.tasks.find(t => t.id === task.id)) {
          state.tasks.unshift(task);
          changed = true;
        }
      } else if (change.type === 'modified') {
        const idx = state.tasks.findIndex(t => t.id === task.id);
        if (idx >= 0) { state.tasks[idx] = task; changed = true; }
      } else if (change.type === 'removed') {
        const before = state.tasks.length;
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        if (state.tasks.length !== before) changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(userKey('tasks'), JSON.stringify(state.tasks));
      renderTaskList();
      if (!document.getElementById('stats').hidden) renderStats();
      showToast('☁️ Zsynchronizowano', 'success', 1800);
    }
  }, err => {
    console.warn('[FB] listener:', err);
    if (err.code === 'permission-denied') {
      showToast('⚠️ Sync nieaktywny — brak uprawnień Firestore', 'error', 8000);
    }
  });
}

// Pełna inicjalizacja synchronizacji przy logowaniu / ładowaniu strony
async function firestoreOnLoad() {
  if (!state.currentUser || state.currentUser.provider === 'guest') return false;
  if (!_db) return false;

  const localTasks  = [...state.tasks];
  const cloudExists = await firestoreLoad();

  if (cloudExists) {
    localStorage.setItem(userKey('tasks'), JSON.stringify(state.tasks));
    localStorage.setItem(userKey('dark'),  JSON.stringify(state.darkMode));
    localStorage.setItem(userKey('notif'), JSON.stringify(state.notifications));
    applyDarkMode(state.darkMode);
    const nt = document.getElementById('notifications-toggle');
    if (nt) { nt.checked = state.notifications; nt.setAttribute('aria-checked', String(state.notifications)); }
    renderTaskList();
  } else if (localTasks.length > 0) {
    // Migracja lokalnych zadań do chmury
    const col = tasksCol();
    if (col) {
      const batch = _db.batch();
      localTasks.forEach(t => batch.set(col.doc(t.id), t));
      batch.commit().catch(e => console.warn('[FB] migration:', e));
    }
  }

  firestoreStartListener();
  return cloudExists;
}

/* ============================================================
   AUTH – Firebase Authentication
   ============================================================ */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASS_REGEX  = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

// Mapuj użytkownika Firebase na wewnętrzny format
function mapFirebaseUser(firebaseUser) {
  const pid      = firebaseUser.providerData?.[0]?.providerId;
  const provider = pid === 'google.com' ? 'google' : 'email';
  return {
    name:    firebaseUser.displayName || firebaseUser.email.split('@')[0],
    email:   firebaseUser.email,
    picture: firebaseUser.photoURL || '',
    provider,
    uid:     firebaseUser.uid,
  };
}

// Tłumaczenie kodów błędów Firebase Auth
function translateAuthError(code) {
  const map = {
    'auth/email-already-in-use':   'Konto z tym adresem e-mail już istnieje.',
    'auth/invalid-email':          'Nieprawidłowy adres e-mail.',
    'auth/user-not-found':         'Nie znaleziono konta z tym adresem e-mail.',
    'auth/wrong-password':         'Nieprawidłowe hasło.',
    'auth/invalid-credential':     'Nieprawidłowy e-mail lub hasło.',
    'auth/weak-password':          'Hasło musi mieć co najmniej 6 znaków.',
    'auth/too-many-requests':      'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
    'auth/network-request-failed': 'Błąd sieci. Sprawdź połączenie.',
    'auth/popup-blocked':          'Popup zablokowany — zezwól na wyskakujące okna.',
    'auth/popup-closed-by-user':   'Logowanie anulowane.',
  };
  return map[code] || 'Wystąpił błąd. Spróbuj ponownie.';
}

// Logowanie Google przez Firebase Auth
async function triggerGoogleSignIn() {
  if (!_auth) { showToast('Firebase nie załadowany — odśwież stronę.', 'error'); return; }
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await _auth.signInWithPopup(provider);
    // onAuthStateChanged obsługuje resztę
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showToast(translateAuthError(err.code), 'error');
    }
  }
}

// Tryb gościa (bez Firebase Auth — tylko localStorage)
function guestLogin() {
  const guestUser = { name: 'Gość', email: '_guest', provider: 'guest', uid: '_guest' };
  localStorage.setItem('tm_guest_session', JSON.stringify(guestUser));
  state.currentUser = guestUser;
  onLoginSuccess(true);
}

function clearGuestSession() {
  localStorage.removeItem('tm_guest_session');
}

function showApp() {
  document.getElementById('auth-screen').hidden = true;
  document.getElementById('app-wrapper').hidden = false;

  const avatar = document.getElementById('user-avatar');
  const nameEl = document.getElementById('user-name');
  const u      = state.currentUser;
  const isGuest = u.provider === 'guest';

  nameEl.textContent = isGuest ? 'Tryb gościa' : u.name;

  const initials = isGuest
    ? '👤'
    : u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  avatar.textContent = initials;
  avatar.className   = 'user-avatar';
  if (u.provider === 'google') avatar.classList.add('social-google');
  if (isGuest)                 avatar.classList.add('social-guest');

  const banner = document.getElementById('guest-banner');
  banner.hidden = !isGuest;
  document.body.classList.toggle('guest-mode', isGuest);
}

function showAuth() {
  document.getElementById('auth-screen').hidden = false;
  document.getElementById('app-wrapper').hidden  = true;
  document.getElementById('guest-banner').hidden = true;
  document.body.classList.remove('guest-mode');

  document.getElementById('login-form').reset();
  document.getElementById('register-form').reset();

  ['login-email-error','login-password-error',
   'register-name-error','register-email-error','register-password-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  document.querySelectorAll('.auth-panel .error').forEach(el => el.classList.remove('error'));

  document.querySelectorAll('.auth-tab').forEach(t => {
    const isLogin = t.dataset.authTab === 'login';
    t.classList.toggle('active', isLogin);
    t.setAttribute('aria-selected', String(isLogin));
  });
  document.getElementById('login-panel').hidden    = false;
  document.getElementById('register-panel').hidden = true;
}

function logout() {
  if (_firestoreUnsubscribe) { _firestoreUnsubscribe(); _firestoreUnsubscribe = null; }

  state.tasks         = [];
  state.darkMode      = false;
  state.notifications = true;
  applyDarkMode(false);

  if (state.currentUser?.provider === 'guest') {
    clearGuestSession();
    state.currentUser = null;
    showAuth();
  } else {
    state.currentUser = null;
    if (_auth) _auth.signOut().catch(e => console.warn('[Auth] signOut:', e));
    // onAuthStateChanged wywoła showAuth()
  }
}

/* ============================================================
   OPERACJE NA ZADANIACH
   ============================================================ */
function genId() {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function addTask(name, priority, category) {
  const task = {
    id:        genId(),
    name:      name.trim(),
    priority,
    category,
    done:      false,
    createdAt: Date.now(),
  };
  state.tasks.unshift(task);
  saveState();
  firestoreSetTask(task);
  return task;
}

function removeTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  firestoreDeleteTask(id);
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return null;
  task.done = !task.done;
  saveState();
  firestoreSetTask(task);
  return task;
}

function editTask(id, patch) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  Object.assign(task, patch);
  saveState();
  firestoreSetTask(task);
}

/* ============================================================
   FILTROWANIE / SORTOWANIE
   ============================================================ */
function getVisibleTasks() {
  let list = [...state.tasks];

  if (state.filter === 'active') list = list.filter(t => !t.done);
  if (state.filter === 'done')   list = list.filter(t =>  t.done);

  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    list = list.filter(t => t.name.toLowerCase().includes(q));
  }

  switch (state.sort) {
    case 'date-asc':      list.sort((a, b) => a.createdAt - b.createdAt); break;
    case 'date-desc':     list.sort((a, b) => b.createdAt - a.createdAt); break;
    case 'priority-high': list.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]); break;
    case 'priority-low':  list.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]); break;
    case 'alpha-asc':     list.sort((a, b) => a.name.localeCompare(b.name, 'pl')); break;
    case 'alpha-desc':    list.sort((a, b) => b.name.localeCompare(a.name, 'pl')); break;
  }

  return list;
}

/* ============================================================
   FORMAT DATY
   ============================================================ */
function relativeTime(ts) {
  const diff  = Date.now() - ts;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  <  1) return 'Przed chwilą';
  if (mins  < 60) return `${mins} min. temu`;
  if (hours < 24) return `${hours} godz. temu`;
  if (days  <  7) return `${days} dni temu`;
  return new Date(ts).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

/* ============================================================
   BEZPIECZNE WSTAWIANIE TEKSTU (ochrona przed XSS)
   ============================================================ */
function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

/* ============================================================
   RENDEROWANIE LISTY ZADAŃ
   ============================================================ */
function renderTaskList() {
  const ul         = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const tasks      = getVisibleTasks();

  ul.innerHTML = '';

  if (tasks.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className  = `task-item${task.done ? ' done' : ''}`;
    li.dataset.id = task.id;
    li.setAttribute('role', 'listitem');

    li.innerHTML = `
      <button class="task-checkbox" data-action="toggle"
        aria-label="${task.done ? 'Oznacz jako aktywne' : 'Oznacz jako ukończone'}"
        title="${task.done ? 'Cofnij' : 'Ukończ'}"
      >${task.done ? '✓' : ''}</button>

      <div class="task-content">
        <div class="task-name">${escHtml(task.name)}</div>
        <div class="task-meta">
          <span class="badge badge-${task.priority}"
                aria-label="Priorytet: ${PRIORITY_LABEL[task.priority]}">
            ${PRIORITY_LABEL[task.priority]}
          </span>
          <span class="badge badge-cat"
                aria-label="Kategoria: ${CATEGORY_LABEL[task.category]}">
            ${CATEGORY_LABEL[task.category]}
          </span>
          <span class="task-date">${relativeTime(task.createdAt)}</span>
        </div>
      </div>

      <div class="task-actions">
        <button class="task-btn edit"   data-action="edit"
                aria-label="Edytuj zadanie: ${escHtml(task.name)}" title="Edytuj">✎</button>
        <button class="task-btn delete" data-action="delete"
                aria-label="Usuń zadanie: ${escHtml(task.name)}"  title="Usuń">✕</button>
      </div>
    `;

    ul.appendChild(li);
  });
}

/* ============================================================
   RENDEROWANIE STATYSTYK
   ============================================================ */
function renderStats() {
  const total   = state.tasks.length;
  const done    = state.tasks.filter(t => t.done).length;
  const active  = total - done;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-active').textContent  = active;
  document.getElementById('stat-done').textContent    = done;
  document.getElementById('stat-percent').textContent = `${percent}%`;

  renderBarChart('category-chart', countByKey('category'), CATEGORY_LABEL);
  renderBarChart('priority-chart', countByKey('priority'), PRIORITY_LABEL);
}

function countByKey(key) {
  return state.tasks.reduce((acc, t) => {
    acc[t[key]] = (acc[t[key]] || 0) + 1;
    return acc;
  }, {});
}

function renderBarChart(id, counts, labels) {
  const container = document.getElementById(id);
  container.innerHTML = '';
  const maxVal = Math.max(...Object.values(counts), 1);

  Object.entries(labels).forEach(([key, label]) => {
    const count = counts[key] || 0;
    const pct   = Math.round((count / maxVal) * 100);

    const row = document.createElement('div');
    row.className = 'bar-item';
    row.innerHTML = `
      <span class="bar-label">${label}</span>
      <div class="bar-track"
           role="progressbar"
           aria-valuenow="${count}"
           aria-valuemin="0"
           aria-valuemax="${maxVal}"
           aria-label="${label}: ${count}">
        <div class="bar-fill" style="width:${pct}%"></div>
      </div>
      <span class="bar-count">${count}</span>
    `;
    container.appendChild(row);
  });
}

/* ============================================================
   NAWIGACJA MIĘDZY WIDOKAMI
   ============================================================ */
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(s => {
    s.hidden = true;
    s.classList.remove('active');
  });

  document.querySelectorAll('.nav-link').forEach(a => {
    const isActive = a.dataset.view === viewId;
    a.classList.toggle('active', isActive);
    a.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  const target = document.getElementById(viewId);
  if (target) {
    target.hidden = false;
    target.classList.add('active');
  }

  if (viewId === 'stats') renderStats();
}

/* ============================================================
   WALIDACJA FORMULARZA
   ============================================================ */
const VALID_TASK = /^[\p{L}\p{N}\s\-.,!?()]{2,120}$/u;

function validateName(value, inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  const v = value.trim();

  if (v.length === 0)      { setError(input, error, 'Nazwa zadania nie może być pusta.');      return false; }
  if (v.length < 2)        { setError(input, error, 'Nazwa musi mieć co najmniej 2 znaki.');   return false; }
  if (v.length > 120)      { setError(input, error, 'Nazwa nie może przekraczać 120 znaków.'); return false; }
  if (!VALID_TASK.test(v)) { setError(input, error, 'Nazwa zawiera niedozwolone znaki.');       return false; }

  clearError(input, error);
  return true;
}

function setError(input, errorEl, msg) {
  input.classList.add('error');
  errorEl.textContent = msg;
}

function clearError(input, errorEl) {
  input.classList.remove('error');
  errorEl.textContent = '';
}

/* ============================================================
   MODAL POTWIERDZENIA (zastępuje natywny confirm())
   ============================================================ */
function openConfirm(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent   = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-modal').hidden = false;

  const okBtn = document.getElementById('confirm-ok');
  const newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);

  newOk.addEventListener('click', () => {
    document.getElementById('confirm-modal').hidden = true;
    onConfirm();
  });
}

function closeConfirm() {
  document.getElementById('confirm-modal').hidden = true;
}

/* ============================================================
   MODAL EDYCJI
   ============================================================ */
function openModal(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('edit-task-id').value       = task.id;
  document.getElementById('edit-task-name').value     = task.name;
  document.getElementById('edit-task-priority').value = task.priority;
  document.getElementById('edit-task-category').value = task.category;

  clearError(
    document.getElementById('edit-task-name'),
    document.getElementById('edit-name-error')
  );

  const modal = document.getElementById('modal');
  modal.hidden = false;
  document.getElementById('edit-task-name').focus();
}

function closeModal() {
  document.getElementById('modal').hidden = true;
}

/* ============================================================
   TOAST POWIADOMIENIA  (async – setTimeout)
   ============================================================ */
function showToast(message, type = 'success', duration = 3200) {
  if (!state.notifications && type !== 'error') return;

  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');

  const icons = { success: '✓', warning: '⚠', error: '✕' };
  toast.innerHTML = `<span aria-hidden="true">${icons[type] || '•'}</span>${escHtml(message)}`;

  container.appendChild(toast);

  // Asynchroniczność #1 – setTimeout
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

/* ============================================================
   EKSPORT JSON  (async – Promise)
   ============================================================ */
function exportDataAsync() {
  // Asynchroniczność #2 – Promise
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const payload = {
          exportedAt: new Date().toISOString(),
          version:    '2.0.0',
          tasks:      state.tasks,
        };
        const blob = new Blob(
          [JSON.stringify(payload, null, 2)],
          { type: 'application/json' }
        );
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `taskmanager_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 300);
  });
}

/* ============================================================
   EKSPORT TXT  (async – Promise)
   ============================================================ */
function exportTxtAsync() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const dateStr = new Date().toLocaleDateString('pl-PL', {
          day: 'numeric', month: 'long', year: 'numeric',
        });
        const total  = state.tasks.length;
        const done   = state.tasks.filter(t => t.done).length;
        const active = total - done;

        const lines = [
          '╔══════════════════════════════════════╗',
          '║         TASKMANAGER — ZADANIA        ║',
          '╚══════════════════════════════════════╝',
          `  Data eksportu : ${dateStr}`,
          `  Użytkownik    : ${state.currentUser?.name || '—'}`,
          `  Wszystkich    : ${total}  |  Aktywnych: ${active}  |  Ukończonych: ${done}`,
          '',
          '──────────────────────────────────────',
          '',
        ];

        if (state.tasks.length === 0) {
          lines.push('  Brak zadań do wyeksportowania.');
        } else {
          const sorted = [...state.tasks].sort((a, b) => b.createdAt - a.createdAt);
          sorted.forEach((task, i) => {
            const status   = task.done ? '[✓]' : '[ ]';
            const created  = new Date(task.createdAt).toLocaleString('pl-PL');
            const priority = PRIORITY_LABEL[task.priority] || task.priority;
            const category = CATEGORY_LABEL[task.category] || task.category;
            lines.push(`${i + 1}. ${status} ${task.name}`);
            lines.push(`     Priorytet : ${priority}`);
            lines.push(`     Kategoria : ${category}`);
            lines.push(`     Dodano    : ${created}`);
            lines.push('');
          });
        }

        lines.push('──────────────────────────────────────');
        lines.push('  Wygenerowano przez TaskManager');
        lines.push('  https://w84kubus.github.io/TaskManager/');

        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `zadania_${new Date().toISOString().slice(0, 10)}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 300);
  });
}

/* ============================================================
   DARK MODE
   ============================================================ */
function applyDarkMode(enabled) {
  document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');

  // Aktualizuj kolor paska statusu iOS
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = enabled ? '#161b27' : '#5a6bff';

  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) {
    toggle.checked = enabled;
    toggle.setAttribute('aria-checked', String(enabled));
  }
}

/* ============================================================
   WYCZYSZCZENIE DANYCH
   ============================================================ */
function clearAll() {
  const col = tasksCol();
  if (col) state.tasks.forEach(t => col.doc(t.id).delete().catch(() => {}));

  state.tasks         = [];
  state.darkMode      = false;
  state.notifications = true;
  saveState();
  firestoreSyncSettings();

  applyDarkMode(false);
  document.getElementById('notifications-toggle').checked = true;
  document.getElementById('notifications-toggle').setAttribute('aria-checked', 'true');
  document.getElementById('dark-mode-toggle').checked = false;
  document.getElementById('dark-mode-toggle').setAttribute('aria-checked', 'false');

  renderTaskList();
  renderStats();
  showToast('Wszystkie dane zostały wyczyszczone.', 'warning');
}

/* ============================================================
   REJESTRACJA ZDARZEŃ – AUTH
   ============================================================ */
function setupAuthEvents() {

  /* ── Auth tabs ─────────────────────────────────────────── */
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const isLogin = tab.dataset.authTab === 'login';
      document.getElementById('login-panel').hidden    = !isLogin;
      document.getElementById('register-panel').hidden =  isLogin;
    });
  });

  /* ── Login form (submit) ───────────────────────────────── */
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();

    const emailInput = document.getElementById('login-email');
    const passInput  = document.getElementById('login-password');
    let valid = true;

    if (!EMAIL_REGEX.test(emailInput.value.trim())) {
      setError(emailInput, document.getElementById('login-email-error'), 'Wpisz poprawny adres e-mail.');
      valid = false;
    } else {
      clearError(emailInput, document.getElementById('login-email-error'));
    }

    if (passInput.value.length < 1) {
      setError(passInput, document.getElementById('login-password-error'), 'Wpisz hasło.');
      valid = false;
    } else {
      clearError(passInput, document.getElementById('login-password-error'));
    }

    if (!valid) return;

    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Logowanie…';

    try {
      await _auth.signInWithEmailAndPassword(
        emailInput.value.trim(),
        passInput.value
      );
      // onAuthStateChanged obsługuje resztę
    } catch (err) {
      setError(passInput, document.getElementById('login-password-error'),
        translateAuthError(err.code));
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Zaloguj się';
    }
  });

  /* ── Register form (submit) ────────────────────────────── */
  document.getElementById('register-form').addEventListener('submit', async e => {
    e.preventDefault();

    const nameInput  = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passInput  = document.getElementById('register-password');
    let valid = true;

    if (nameInput.value.trim().length < 2) {
      setError(nameInput, document.getElementById('register-name-error'), 'Imię musi mieć co najmniej 2 znaki.');
      valid = false;
    } else {
      clearError(nameInput, document.getElementById('register-name-error'));
    }

    if (!EMAIL_REGEX.test(emailInput.value.trim())) {
      setError(emailInput, document.getElementById('register-email-error'), 'Wpisz poprawny adres e-mail.');
      valid = false;
    } else {
      clearError(emailInput, document.getElementById('register-email-error'));
    }

    if (!PASS_REGEX.test(passInput.value)) {
      setError(passInput, document.getElementById('register-password-error'),
        'Min. 6 znaków, 1 wielka litera i 1 cyfra.');
      valid = false;
    } else {
      clearError(passInput, document.getElementById('register-password-error'));
    }

    if (!valid) return;

    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Rejestracja…';

    try {
      const cred = await _auth.createUserWithEmailAndPassword(
        emailInput.value.trim(),
        passInput.value
      );
      await cred.user.updateProfile({ displayName: nameInput.value.trim() });
      // onAuthStateChanged obsługuje resztę
    } catch (err) {
      setError(emailInput, document.getElementById('register-email-error'),
        translateAuthError(err.code));
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Utwórz konto';
    }
  });

  /* ── Przyciski Google Sign-In ──────────────────────────── */
  document.getElementById('google-login').addEventListener('click',    triggerGoogleSignIn);
  document.getElementById('google-register').addEventListener('click', triggerGoogleSignIn);

  /* ── Tryb gościa (click) ────────────────────────────────── */
  document.getElementById('guest-btn').addEventListener('click', guestLogin);

  /* ── Banner gościa: zaloguj się ─────────────────────────── */
  document.getElementById('guest-banner-login').addEventListener('click', () => {
    openConfirm(
      'Przejdź do logowania',
      'Twoje zadania jako gość zostaną zachowane lokalnie. Po zalogowaniu na konto będziesz pracować na osobnym zestawie zadań.',
      () => {
        clearGuestSession();
        state.currentUser = null;
        state.tasks       = [];
        state.darkMode    = false;
        state.notifications = true;
        applyDarkMode(false);
        showAuth();
      }
    );
  });

  /* ── Banner gościa: zamknij ─────────────────────────────── */
  document.getElementById('guest-banner-close').addEventListener('click', () => {
    document.getElementById('guest-banner').hidden = true;
    document.body.classList.remove('guest-mode');
    document.querySelector('main').style.paddingTop = '';
  });
}

/* ============================================================
   onLoginSuccess – po zalogowaniu / przywróceniu sesji
   isFreshLogin = true  → pokaż toast powitalny
   isFreshLogin = false → ciche przywrócenie (page reload)
   ============================================================ */
async function onLoginSuccess(isFreshLogin = true) {
  state.tasks         = [];
  state.darkMode      = false;
  state.notifications = true;

  // 1. Szybki odczyt z localStorage (offline-first)
  loadState();
  applyDarkMode(state.darkMode);

  const notifToggle = document.getElementById('notifications-toggle');
  notifToggle.checked = state.notifications;
  notifToggle.setAttribute('aria-checked', String(state.notifications));

  renderTaskList();
  switchView('tasks');
  showApp();

  if (isFreshLogin) {
    const isGuest = state.currentUser.provider === 'guest';
    showToast(
      isGuest ? 'Tryb gościa — zadania są lokalne 👤' : `Witaj, ${state.currentUser.name}! 👋`,
      isGuest ? 'warning' : 'success',
      3500
    );
  }

  // 2. Synchronizacja z Firestore (tylko dla zalogowanych)
  const isGuest = state.currentUser.provider === 'guest';
  let isNewUser = isGuest;
  if (!isGuest) {
    const cloudDocExists = await firestoreOnLoad();
    isNewUser = !cloudDocExists;
  }

  // Przykładowe zadania TYLKO dla absolutnie nowych użytkowników
  if (isNewUser && state.tasks.length === 0) {
    setTimeout(() => {
      const samples = [
        { name: 'Zaplanuj tygodniowy harmonogram', priority: 'high',   category: 'work'     },
        { name: 'Zrób zakupy spożywcze',           priority: 'medium', category: 'shopping' },
        { name: 'Spacer 30 minut',                  priority: 'low',    category: 'health'   },
      ];
      samples.forEach(s => addTask(s.name, s.priority, s.category));
      renderTaskList();
    }, 500);
  }
}

/* ============================================================
   REJESTRACJA ZDARZEŃ – APLIKACJA
   ============================================================ */
function setupEvents() {

  /* ── Nawigacja (click) ─────────────────────────────────── */
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();                // event.preventDefault() #1
      switchView(link.dataset.view);
    });
  });

  /* ── Formularz dodawania (submit) ──────────────────────── */
  document.getElementById('task-form').addEventListener('submit', e => {
    e.preventDefault();                  // event.preventDefault() #2

    const nameInput = document.getElementById('task-name');
    const name      = nameInput.value;
    const priority  = document.getElementById('task-priority').value;
    const category  = document.getElementById('task-category').value;

    if (!validateName(name, 'task-name', 'name-error')) {
      nameInput.focus();
      return;
    }

    addTask(name, priority, category);
    renderTaskList();
    showToast(`Dodano: „${name.trim()}"`, 'success');

    nameInput.value = '';
    nameInput.focus();
  });

  /* ── Akcje na liście zadań (click – delegacja) ─────────── */
  document.getElementById('task-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const li     = btn.closest('.task-item');
    const taskId = li?.dataset.id;
    if (!taskId) return;

    switch (btn.dataset.action) {

      case 'toggle': {
        const task = toggleTask(taskId);
        if (task?.done) showToast('Zadanie ukończone! 🎉', 'success');
        renderTaskList();
        break;
      }

      case 'delete': {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) break;
        li.style.transition = 'opacity .2s, transform .2s';
        li.style.opacity    = '0';
        li.style.transform  = 'translateX(20px)';
        setTimeout(() => {
          removeTask(taskId);
          renderTaskList();
          showToast(`Usunięto: „${task.name}"`, 'warning');
        }, 200);
        break;
      }

      case 'edit':
        openModal(taskId);
        break;
    }
  });

  /* ── Przyciski filtrów (click) ─────────────────────────── */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      renderTaskList();
    });
  });

  /* ── Sortowanie (change) ───────────────────────────────── */
  document.getElementById('sort-select').addEventListener('change', e => {
    state.sort = e.target.value;
    renderTaskList();
  });

  /* ── Wyszukiwanie (input) ──────────────────────────────── */
  document.getElementById('search-input').addEventListener('input', e => {
    state.search = e.target.value;
    renderTaskList();
  });

  /* ── Dark mode toggle (change) ─────────────────────────── */
  document.getElementById('dark-mode-toggle').addEventListener('change', e => {
    state.darkMode = e.target.checked;
    applyDarkMode(state.darkMode);
    saveState();
    firestoreSyncSettings();
    showToast(state.darkMode ? 'Tryb ciemny włączony 🌙' : 'Tryb jasny włączony ☀️', 'success');
  });

  /* ── Powiadomienia toggle (change) ─────────────────────── */
  document.getElementById('notifications-toggle').addEventListener('change', e => {
    state.notifications = e.target.checked;
    e.target.setAttribute('aria-checked', String(state.notifications));
    saveState();
    firestoreSyncSettings();
  });

  /* ── Wyczyść dane (click) ──────────────────────────────── */
  document.getElementById('clear-data-btn').addEventListener('click', () => {
    openConfirm(
      'Wyczyść dane',
      'Czy na pewno chcesz usunąć wszystkie zadania i zresetować ustawienia? Tej operacji nie można cofnąć.',
      clearAll
    );
  });

  /* ── Eksport JSON (click + async/await) ─────────────────── */
  document.getElementById('export-btn').addEventListener('click', async () => {
    const btn = document.getElementById('export-btn');
    btn.disabled    = true;
    btn.textContent = 'Eksportowanie…';
    try {
      await exportDataAsync();
      showToast('Eksport JSON zakończony!', 'success');
    } catch {
      showToast('Błąd podczas eksportu JSON.', 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Eksportuj JSON';
    }
  });

  /* ── Eksport TXT (click + async/await) ─────────────────── */
  document.getElementById('export-txt-btn').addEventListener('click', async () => {
    const btn = document.getElementById('export-txt-btn');
    btn.disabled    = true;
    btn.textContent = 'Eksportowanie…';
    try {
      await exportTxtAsync();
      showToast('Eksport TXT zakończony!', 'success');
    } catch {
      showToast('Błąd podczas eksportu TXT.', 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Eksportuj TXT';
    }
  });

  /* ── Modal: zamykanie (click) ──────────────────────────── */
  document.getElementById('modal-close').addEventListener('click',   closeModal);
  document.getElementById('modal-cancel').addEventListener('click',  closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);

  /* ── Confirm modal: anuluj (click) ─────────────────────── */
  document.getElementById('confirm-cancel').addEventListener('click',  closeConfirm);
  document.getElementById('confirm-overlay').addEventListener('click', closeConfirm);

  /* ── Formularz edycji (submit) ─────────────────────────── */
  document.getElementById('edit-form').addEventListener('submit', e => {
    e.preventDefault();                  // event.preventDefault() #3

    const nameInput = document.getElementById('edit-task-name');
    if (!validateName(nameInput.value, 'edit-task-name', 'edit-name-error')) {
      nameInput.focus();
      return;
    }

    editTask(document.getElementById('edit-task-id').value, {
      name:     nameInput.value.trim(),
      priority: document.getElementById('edit-task-priority').value,
      category: document.getElementById('edit-task-category').value,
    });

    closeModal();
    renderTaskList();
    showToast('Zadanie zaktualizowane!', 'success');
  });

  /* ── Scroll – cień nagłówka (scroll) ───────────────────── */
  window.addEventListener('scroll', () => {
    document.getElementById('site-header')
      .classList.toggle('scrolled', window.scrollY > 8);
  });

  /* ── Wyloguj (click) ────────────────────────────────────── */
  document.getElementById('logout-btn').addEventListener('click', () => {
    openConfirm('Wyloguj się', 'Czy na pewno chcesz się wylogować?', logout);
  });

  /* ── Klawiatura: Escape zamyka modal (keydown) ─────────── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('modal').hidden) {
      closeModal();
    }
  });
}

/* ============================================================
   INICJALIZACJA
   ============================================================ */
let _authInitialized = false;

function init() {
  initFirebase();
  setupAuthEvents();
  setupEvents();

  if (!_auth) {
    // Firebase niedostępny — sprawdź sesję gościa
    const guestData = localStorage.getItem('tm_guest_session');
    if (guestData) {
      try { state.currentUser = JSON.parse(guestData); onLoginSuccess(false); }
      catch { showAuth(); }
    } else {
      showAuth();
    }
    return;
  }

  // Firebase Auth — nasłuchiwacz stanu sesji (zastępuje getSession/setSession)
  _auth.onAuthStateChanged(async (firebaseUser) => {
    const isPageLoad = !_authInitialized;
    _authInitialized = true;

    if (firebaseUser) {
      state.currentUser = mapFirebaseUser(firebaseUser);
      await onLoginSuccess(!isPageLoad); // ciche przywrócenie przy page reload
    } else {
      // Brak Firebase user — sprawdź tryb gościa
      const guestData = localStorage.getItem('tm_guest_session');
      if (guestData) {
        try {
          state.currentUser = JSON.parse(guestData);
          await onLoginSuccess(!isPageLoad);
          return;
        } catch { /* fall through */ }
      }
      state.currentUser = null;
      state.tasks = [];
      showAuth();
    }
  });
}

/* Uruchom po załadowaniu DOM */
document.addEventListener('DOMContentLoaded', init);
