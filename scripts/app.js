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
  currentUser:   null,        // { email, name, provider }
};

/* ============================================================
   localStorage – zapis / odczyt (per-user)
   ============================================================ */
function userKey(key) {
  const uid = state.currentUser ? state.currentUser.email : '_guest';
  return `tm_${uid}_${key}`;
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
   AUTH – rejestracja / logowanie / wylogowanie
   ============================================================ */
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASS_REGEX   = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

function getUsers() {
  try { return JSON.parse(localStorage.getItem('tm_users') || '[]'); }
  catch { return []; }
}

function saveUsers(users) {
  localStorage.setItem('tm_users', JSON.stringify(users));
}

function registerUser(name, email, password) {
  const users = getUsers();
  if (users.find(u => u.email === email.toLowerCase())) {
    return { ok: false, error: 'Konto z tym adresem e-mail już istnieje.' };
  }
  const user = {
    name:     name.trim(),
    email:    email.toLowerCase().trim(),
    password, // w prawdziwej aplikacji – hash!
    provider: 'email',
    createdAt: Date.now(),
  };
  users.push(user);
  saveUsers(users);
  return { ok: true, user };
}

function loginUser(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email.toLowerCase().trim());
  if (!user) return { ok: false, error: 'Nie znaleziono konta z tym adresem e-mail.' };
  if (user.password !== password) return { ok: false, error: 'Nieprawidłowe hasło.' };
  return { ok: true, user };
}

/* ============================================================
   GOOGLE IDENTITY SERVICES (prawdziwy OAuth)
   ============================================================ */
// ↓ Wklej tutaj swój Client ID z Google Cloud Console
const GOOGLE_CLIENT_ID = '899283010824-akk03hma7k4a07pc9so1sqb9amo1jgn3.apps.googleusercontent.com';

// Klient OAuth2 – inicjowany raz, wywoływany przy każdym kliknięciu
let _googleTokenClient = null;

function initGoogleAuth() {
  if (typeof google === 'undefined' || !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('REPLACE')) return;
  try {
    _googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope:     'openid email profile',
      callback:  async (tokenResponse) => {
        if (tokenResponse.error) {
          showToast('Błąd Google: ' + tokenResponse.error, 'error');
          return;
        }
        try {
          const res  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          });
          const info = await res.json();
          handleGoogleUserInfo(info);
        } catch (e) {
          showToast('Nie udało się pobrać danych profilu Google.', 'error');
        }
      },
    });
  } catch (e) {
    console.warn('[Google Auth] Inicjalizacja nieudana:', e);
  }
}

function handleGoogleUserInfo(info) {
  if (!info.email) { showToast('Błąd logowania Google.', 'error'); return; }

  const user = {
    name:      info.name    || info.email.split('@')[0],
    email:     info.email,
    picture:   info.picture || '',
    provider:  'google',
    password:  '',
    createdAt: Date.now(),
  };

  const users = getUsers();
  const idx = users.findIndex(u => u.email === user.email && u.provider === 'google');
  if (idx >= 0) users[idx] = { ...users[idx], name: user.name, picture: user.picture };
  else users.push(user);
  saveUsers(users);

  setSession(user);
  onLoginSuccess();
}

function triggerGoogleSignIn() {
  if (typeof google === 'undefined') {
    showToast('Biblioteka Google nie załadowana — sprawdź połączenie.', 'error');
    return;
  }
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('REPLACE')) {
    showToast('Brak Client ID — skonfiguruj Google Cloud Console.', 'error');
    return;
  }
  if (!_googleTokenClient) {
    initGoogleAuth();
    if (!_googleTokenClient) {
      showToast('Google Auth nie jest gotowy — odśwież stronę.', 'error');
      return;
    }
  }
  // Otwiera niezawodne okno popup Google
  _googleTokenClient.requestAccessToken();
}

function guestLogin() {
  const guestUser = { name: 'Gość', email: '_guest', provider: 'guest' };
  localStorage.setItem('tm_session', JSON.stringify(guestUser));
  state.currentUser = guestUser;
  onLoginSuccess();
}

function setSession(user) {
  const sessionUser = { name: user.name, email: user.email, provider: user.provider };
  localStorage.setItem('tm_session', JSON.stringify(sessionUser));
  state.currentUser = sessionUser;
}

function getSession() {
  try { return JSON.parse(localStorage.getItem('tm_session')); }
  catch { return null; }
}

function clearSession() {
  localStorage.removeItem('tm_session');
  state.currentUser = null;
}

function showApp() {
  document.getElementById('auth-screen').hidden = true;
  document.getElementById('app-wrapper').hidden = false;

  // Pokaż dane użytkownika w headerze
  const avatar = document.getElementById('user-avatar');
  const nameEl = document.getElementById('user-name');
  const u = state.currentUser;
  const isGuest = u.provider === 'guest';

  nameEl.textContent = isGuest ? 'Tryb gościa' : u.name;

  const initials = isGuest
    ? '👤'
    : u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  avatar.textContent = initials;
  avatar.className   = 'user-avatar';
  if (u.provider === 'google') avatar.classList.add('social-google');
  if (isGuest)                 avatar.classList.add('social-guest');

  // Banner gościa
  const banner = document.getElementById('guest-banner');
  banner.hidden = !isGuest;
  document.body.classList.toggle('guest-mode', isGuest);
}

function showAuth() {
  document.getElementById('auth-screen').hidden = false;
  document.getElementById('app-wrapper').hidden  = true;
  document.getElementById('guest-banner').hidden = true;
  document.body.classList.remove('guest-mode');

  // Wyczyść pola formularzy
  document.getElementById('login-form').reset();
  document.getElementById('register-form').reset();

  // Wyczyść błędy walidacji
  ['login-email-error','login-password-error',
   'register-name-error','register-email-error','register-password-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  document.querySelectorAll('.auth-panel .error').forEach(el => el.classList.remove('error'));

  // Wróć na zakładkę Logowanie
  document.querySelectorAll('.auth-tab').forEach(t => {
    const isLogin = t.dataset.authTab === 'login';
    t.classList.toggle('active', isLogin);
    t.setAttribute('aria-selected', String(isLogin));
  });
  document.getElementById('login-panel').hidden    = false;
  document.getElementById('register-panel').hidden = true;
}

function logout() {
  clearSession();
  // Reset state
  state.tasks = [];
  state.darkMode = false;
  state.notifications = true;
  applyDarkMode(false);
  showAuth();
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
  return task;
}

function removeTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return null;
  task.done = !task.done;
  saveState();
  return task;
}

function editTask(id, patch) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  Object.assign(task, patch);
  saveState();
}

/* ============================================================
   FILTROWANIE / SORTOWANIE
   ============================================================ */
function getVisibleTasks() {
  let list = [...state.tasks];

  // Filtr statusu
  if (state.filter === 'active') list = list.filter(t => !t.done);
  if (state.filter === 'done')   list = list.filter(t =>  t.done);

  // Wyszukiwanie (input event)
  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    list = list.filter(t => t.name.toLowerCase().includes(q));
  }

  // Sortowanie
  switch (state.sort) {
    case 'date-asc':
      list.sort((a, b) => a.createdAt - b.createdAt); break;
    case 'date-desc':
      list.sort((a, b) => b.createdAt - a.createdAt); break;
    case 'priority-high':
      list.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]); break;
    case 'priority-low':
      list.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]); break;
    case 'alpha-asc':
      list.sort((a, b) => a.name.localeCompare(b.name, 'pl')); break;
    case 'alpha-desc':
      list.sort((a, b) => b.name.localeCompare(a.name, 'pl')); break;
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
   RENDEROWANIE LISTY ZADAŃ  (manipulacja DOM)
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

  // Dynamiczne dodawanie elementów DOM
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className      = `task-item${task.done ? ' done' : ''}`;
    li.dataset.id     = task.id;
    li.setAttribute('role', 'listitem');

    li.innerHTML = `
      <button
        class="task-checkbox"
        data-action="toggle"
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
  // Ukryj wszystkie widoki
  document.querySelectorAll('.view').forEach(s => {
    s.hidden = true;
    s.classList.remove('active');
  });

  // Aktualizuj linki nawigacji
  document.querySelectorAll('.nav-link').forEach(a => {
    const isActive = a.dataset.view === viewId;
    a.classList.toggle('active', isActive);
    a.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Pokaż wybrany widok
  const target = document.getElementById(viewId);
  if (target) {
    target.hidden = false;
    target.classList.add('active');
  }

  // Odśwież statystyki gdy otwierany jest ten widok
  if (viewId === 'stats') renderStats();
}

/* ============================================================
   WALIDACJA FORMULARZA  (RegExp)
   ============================================================ */
// Tylko litery (w tym polskie), cyfry, spacje, myślniki – min 2 znaki
const VALID_TASK = /^[\p{L}\p{N}\s\-.,!?()]{2,120}$/u;

function validateName(value, inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);

  const v = value.trim();

  if (v.length === 0) {
    setError(input, error, 'Nazwa zadania nie może być pusta.');
    return false;
  }
  if (v.length < 2) {
    setError(input, error, 'Nazwa musi mieć co najmniej 2 znaki.');
    return false;
  }
  if (v.length > 120) {
    setError(input, error, 'Nazwa nie może przekraczać 120 znaków.');
    return false;
  }
  if (!VALID_TASK.test(v)) {
    setError(input, error, 'Nazwa zawiera niedozwolone znaki.');
    return false;
  }

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

  // Jednorazowe listenery – usuń poprzednie klony
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
   EKSPORT DANYCH  (async – Promise)
   ============================================================ */
function exportDataAsync() {
  // Asynchroniczność #2 – Promise
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const payload = {
          exportedAt: new Date().toISOString(),
          version:    '1.0.0',
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
   DARK MODE
   ============================================================ */
function applyDarkMode(enabled) {
  document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');

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
  state.tasks         = [];
  state.darkMode      = false;
  state.notifications = true;
  saveState();

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
   REJESTRACJA ZDARZEŃ
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
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();

    const emailInput = document.getElementById('login-email');
    const passInput  = document.getElementById('login-password');
    let valid = true;

    // Walidacja email (RegExp)
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

    const result = loginUser(emailInput.value, passInput.value);
    if (!result.ok) {
      setError(passInput, document.getElementById('login-password-error'), result.error);
      return;
    }

    setSession(result.user);
    onLoginSuccess();
  });

  /* ── Register form (submit) ────────────────────────────── */
  document.getElementById('register-form').addEventListener('submit', e => {
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
      setError(passInput, document.getElementById('register-password-error'), 'Min. 6 znaków, 1 wielka litera i 1 cyfra.');
      valid = false;
    } else {
      clearError(passInput, document.getElementById('register-password-error'));
    }

    if (!valid) return;

    const result = registerUser(nameInput.value, emailInput.value, passInput.value);
    if (!result.ok) {
      setError(emailInput, document.getElementById('register-email-error'), result.error);
      return;
    }

    setSession(result.user);
    onLoginSuccess();
  });

  /* ── Przyciski Google Sign-In (click) ──────────────────── */
  document.getElementById('google-login').addEventListener('click',    triggerGoogleSignIn);
  document.getElementById('google-register').addEventListener('click', triggerGoogleSignIn);

  /* ── Tryb gościa (click) ────────────────────────────────── */
  document.getElementById('guest-btn').addEventListener('click', guestLogin);

  /* ── Banner gościa: zaloguj się (click) ─────────────────── */
  document.getElementById('guest-banner-login').addEventListener('click', () => {
    openConfirm(
      'Przejdź do logowania',
      'Twoje zadania jako gość zostaną zachowane lokalnie. Po zalogowaniu na konto będziesz pracować na osobnym zestawie zadań.',
      () => {
        clearSession();
        state.tasks = [];
        state.darkMode = false;
        state.notifications = true;
        applyDarkMode(false);
        showAuth();
      }
    );
  });

  /* ── Banner gościa: zamknij (click) ─────────────────────── */
  document.getElementById('guest-banner-close').addEventListener('click', () => {
    document.getElementById('guest-banner').hidden = true;
    document.body.classList.remove('guest-mode');
    // Przywróć normalny padding main
    document.querySelector('main').style.paddingTop = '';
  });
}

function onLoginSuccess() {
  // Załaduj dane użytkownika i pokaż aplikację
  state.tasks = [];
  state.darkMode = false;
  state.notifications = true;
  loadState();
  applyDarkMode(state.darkMode);

  const notifToggle = document.getElementById('notifications-toggle');
  notifToggle.checked = state.notifications;
  notifToggle.setAttribute('aria-checked', String(state.notifications));

  renderTaskList();
  switchView('tasks');
  showApp();
  const isGuest = state.currentUser.provider === 'guest';
  showToast(
    isGuest ? 'Tryb gościa — zadania są lokalne 👤' : `Witaj, ${state.currentUser.name}! 👋`,
    isGuest ? 'warning' : 'success',
    3500
  );

  // Przykładowe zadania dla nowego użytkownika
  if (state.tasks.length === 0) {
    setTimeout(() => {
      const samples = [
        { name: 'Zaplanuj tygodniowy harmonogram', priority: 'high',   category: 'work' },
        { name: 'Zrób zakupy spożywcze',           priority: 'medium', category: 'shopping' },
        { name: 'Spacer 30 minut',                  priority: 'low',    category: 'health' },
      ];
      samples.forEach(s => addTask(s.name, s.priority, s.category));
      renderTaskList();
    }, 500);
  }
}

function setupEvents() {

  /* ── Nawigacja (click) ─────────────────────────────────── */
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();               // event.preventDefault()
      switchView(link.dataset.view);
    });
  });

  /* ── Formularz dodawania (submit) ──────────────────────── */
  document.getElementById('task-form').addEventListener('submit', e => {
    e.preventDefault();                 // event.preventDefault()

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
        // Dynamiczne usuwanie elementu
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
    e.target.setAttribute('aria-checked', String(state.darkMode));
    applyDarkMode(state.darkMode);
    saveState();
    showToast(state.darkMode ? 'Tryb ciemny włączony 🌙' : 'Tryb jasny włączony ☀️', 'success');
  });

  /* ── Powiadomienia toggle (change) ─────────────────────── */
  document.getElementById('notifications-toggle').addEventListener('change', e => {
    state.notifications = e.target.checked;
    e.target.setAttribute('aria-checked', String(state.notifications));
    saveState();
  });

  /* ── Wyczyść dane (click) ──────────────────────────────── */
  document.getElementById('clear-data-btn').addEventListener('click', () => {
    openConfirm(
      'Wyczyść dane',
      'Czy na pewno chcesz usunąć wszystkie zadania i zresetować ustawienia? Tej operacji nie można cofnąć.',
      clearAll
    );
  });

  /* ── Eksport (click + async/await) ─────────────────────── */
  document.getElementById('export-btn').addEventListener('click', async () => {
    const btn = document.getElementById('export-btn');
    btn.disabled    = true;
    btn.textContent = 'Eksportowanie…';

    try {
      await exportDataAsync();
      showToast('Eksport zakończony pomyślnie!', 'success');
    } catch {
      showToast('Błąd podczas eksportu danych.', 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Eksportuj JSON';
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
    e.preventDefault();                 // event.preventDefault()

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
function init() {
  // Najpierw zarejestruj eventy auth (zawsze dostępne)
  setupAuthEvents();
  setupEvents();

  // Zainicjuj Google Identity Services (GIS)
  if (typeof google !== 'undefined') {
    initGoogleAuth();
  } else {
    // GIS script ładuje się asynchronicznie — czekamy na jego załadowanie
    const gisScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (gisScript) gisScript.addEventListener('load', initGoogleAuth);
    else window.addEventListener('load', () => { if (typeof google !== 'undefined') initGoogleAuth(); });
  }

  // Sprawdź czy jest zapisana sesja
  const session = getSession();
  if (session) {
    state.currentUser = session;
    loadState();
    applyDarkMode(state.darkMode);

    const notifToggle = document.getElementById('notifications-toggle');
    notifToggle.checked = state.notifications;
    notifToggle.setAttribute('aria-checked', String(state.notifications));

    renderTaskList();
    switchView('tasks');
    showApp();
  } else {
    showAuth();
  }
}

/* Uruchom po załadowaniu DOM */
document.addEventListener('DOMContentLoaded', init);
