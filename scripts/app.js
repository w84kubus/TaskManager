'use strict';

/* ================================================================
   TaskFlow — Full App Logic
   Keeps all Firebase auth intact, completely rebuilds UI layer
================================================================ */

/* ── Constants ──────────────────────────────────────────────── */
const PRIORITY_ORDER  = { urgent:0, high:1, medium:2, low:3 };
const PRIORITY_LABEL  = { urgent:'Pilny', high:'Wysoki', medium:'Średni', low:'Niski' };
const PRIORITY_COLOR  = { urgent:'var(--prio-urgent)', high:'var(--prio-high)', medium:'var(--prio-medium)', low:'var(--prio-low)' };
const STATUS_LABEL    = { todo:'Todo', doing:'In Progress', review:'Review', done:'Done' };
const STATUS_ORDER    = { todo:0, doing:1, review:2, done:3 };
const CATEGORY_LABEL  = { personal:'Osobiste', work:'Praca', shopping:'Zakupy', health:'Zdrowie', other:'Inne' };
const KANBAN_STATUSES = ['todo','doing','review','done'];
const PROJECT_COLORS  = ['#4f88ff','#9366ff','#f43f5e','#fb923c','#fbbf24','#34d399','#38bdf8','#e879f9','#f472b6','#6ee7b7'];
const POM_MODES       = { work:25, short:5, long:15 };
const VIEW_LABELS = {
  dashboard:'Dashboard', tasks:'Zadania', today:'Dzisiaj',
  upcoming:'Nadchodzące', starred:'Ulubione', kanban:'Kanban',
  calendar:'Kalendarz', focus:'Focus Mode', analytics:'Analityka', settings:'Ustawienia'
};

/* ── State ──────────────────────────────────────────────────── */
const state = {
  tasks:         [],
  projects:      [],
  filter:        'all',
  sort:          'date-desc',
  group:         'none',
  search:        '',
  darkMode:      true,
  notifications: true,
  currentUser:   null,
  activeView:    'dashboard',
  activeProject: null,
  pomoDurations: { work:25, short:5, long:15 },
  streak:        0,
};

const pom = {
  mode:     'work',
  running:  false,
  elapsed:  0,
  total:    25*60,
  sessions: 0,
  taskId:   null,
  _timer:   null,
};

let calendarDate = new Date();
let dragSrcStatus = null;
let dragSrcId     = null;

/* ── localStorage ───────────────────────────────────────────── */
function userKey(k){
  const id = state.currentUser
    ? (state.currentUser.email || state.currentUser.uid || '_guest') : '_guest';
  return `tf_${id}_${k}`;
}

function saveState(){
  localStorage.setItem(userKey('tasks'),    JSON.stringify(state.tasks));
  localStorage.setItem(userKey('projects'), JSON.stringify(state.projects));
  localStorage.setItem(userKey('dark'),     JSON.stringify(state.darkMode));
  localStorage.setItem(userKey('notif'),    JSON.stringify(state.notifications));
  localStorage.setItem(userKey('pom'),      JSON.stringify(state.pomoDurations));
  localStorage.setItem(userKey('streak'),   JSON.stringify(state.streak));
  // streak date
  const today = todayStr();
  const lastActive = localStorage.getItem(userKey('lastActive'));
  if (lastActive !== today) {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
    const yStr = yesterday.toISOString().split('T')[0];
    if (lastActive === yStr) {
      state.streak++;
    } else if (lastActive !== today) {
      state.streak = 1;
    }
    localStorage.setItem(userKey('lastActive'), today);
    localStorage.setItem(userKey('streak'), JSON.stringify(state.streak));
  }
}

function loadState(){
  try {
    const tasks    = localStorage.getItem(userKey('tasks'));
    const projects = localStorage.getItem(userKey('projects'));
    const dark     = localStorage.getItem(userKey('dark'));
    const notif    = localStorage.getItem(userKey('notif'));
    const pom      = localStorage.getItem(userKey('pom'));
    const streak   = localStorage.getItem(userKey('streak'));
    if (tasks)    state.tasks         = JSON.parse(tasks);
    if (projects) state.projects      = JSON.parse(projects);
    if (dark)     state.darkMode      = JSON.parse(dark);
    if (notif)    state.notifications = JSON.parse(notif);
    if (pom)      state.pomoDurations = JSON.parse(pom);
    if (streak)   state.streak        = JSON.parse(streak) || 0;

    // Migrate old tasks that lack new fields
    state.tasks = state.tasks.map(t => ({
      done: false, status: 'todo', description: '', tags: [],
      subtasks: [], starred: false, dueDate: null, dueTime: null,
      estimatedTime: 0, projectId: null,
      ...t,
      priority: ['urgent','high','medium','low'].includes(t.priority) ? t.priority : 'medium',
      status: ['todo','doing','review','done'].includes(t.status) ? t.status
        : (t.done ? 'done' : (t.status === 'draft' || !t.status ? 'todo' : 'todo')),
    }));
  } catch(e){ console.warn('[TF] loadState:', e); }
}

/* ── Helpers ────────────────────────────────────────────────── */
function genId(){ return `t_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }
function genPId(){ return `p_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }
function todayStr(){ return new Date().toISOString().split('T')[0]; }
function escHtml(s){ const d=document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; }

function relativeTime(ts){
  const diff=Date.now()-ts, m=Math.floor(diff/6e4), h=Math.floor(diff/36e5), d=Math.floor(diff/864e5);
  if(m<1) return 'Przed chwilą';
  if(m<60) return `${m} min. temu`;
  if(h<24) return `${h} godz. temu`;
  if(d<7)  return `${d} dni temu`;
  return new Date(ts).toLocaleDateString('pl-PL',{day:'numeric',month:'short'});
}

function formatDate(dateStr){
  if(!dateStr) return null;
  const d = new Date(dateStr+'T12:00:00');
  return d.toLocaleDateString('pl-PL',{day:'numeric',month:'short'});
}

function isOverdue(task){
  if(!task.dueDate || task.done) return false;
  return task.dueDate < todayStr();
}

function isDueToday(task){
  return task.dueDate === todayStr() && !task.done;
}

function getPriorityBg(priority){
  const map={urgent:'rgba(244,63,94,.12)',high:'rgba(251,146,60,.11)',medium:'rgba(251,191,36,.1)',low:'rgba(52,211,153,.1)'};
  return map[priority]||'transparent';
}

/* ── Firebase ───────────────────────────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey:'AIzaSyB9wNhtfhgXAepXE2cGxRECK4PQ3HVYYy8',
  authDomain:'taskmanager-6dcaf.firebaseapp.com',
  projectId:'taskmanager-6dcaf',
  storageBucket:'taskmanager-6dcaf.firebasestorage.app',
  messagingSenderId:'749463900730',
  appId:'1:749463900730:web:85a386c0aa36c32dab9b03',
};

let _db=null, _auth=null;

function initFirebase(){
  try{
    if(typeof firebase==='undefined') return;
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db=firebase.firestore(); _auth=firebase.auth();
  }catch(e){ console.warn('[Firebase] init:',e); }
}

function userKey_fb(){ return state.currentUser?.uid||null; }
function tasksCol(){
  const id=userKey_fb();
  return(_db&&id)?_db.collection('users').doc(id).collection('tasks'):null;
}
function projectsCol(){
  const id=userKey_fb();
  return(_db&&id)?_db.collection('users').doc(id).collection('projects'):null;
}

function firestoreSetTask(t){ const c=tasksCol(); if(c) c.doc(t.id).set(t).catch(e=>console.warn('[FB] setTask:',e)); }
function firestoreDeleteTask(id){ const c=tasksCol(); if(c) c.doc(id).delete().catch(e=>console.warn('[FB] delTask:',e)); }
function firestoreSetProject(p){ const c=projectsCol(); if(c) c.doc(p.id).set(p).catch(e=>console.warn('[FB] setProject:',e)); }
function firestoreDeleteProject(id){ const c=projectsCol(); if(c) c.doc(id).delete().catch(e=>console.warn('[FB] delProject:',e)); }

function firestoreSyncSettings(){
  const id=userKey_fb(); if(!_db||!id) return;
  _db.collection('users').doc(id).set({
    notifications:state.notifications, darkMode:state.darkMode,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  },{merge:true}).catch(e=>console.warn('[FB] syncSettings:',e));
}

async function firestoreLoad(){
  const id=userKey_fb(); if(!_db||!id) return false;
  try{
    const userDoc=await _db.collection('users').doc(id).get();
    if(userDoc.exists){
      const d=userDoc.data();
      if(typeof d.notifications==='boolean') state.notifications=d.notifications;
      if(typeof d.darkMode==='boolean') state.darkMode=d.darkMode;
    }
    const snap=await tasksCol().get();
    if(!snap.empty){
      state.tasks=snap.docs.map(d=>d.data());
      state.tasks.sort((a,b)=>b.createdAt-a.createdAt);
    }
    const pSnap=await projectsCol().get();
    if(!pSnap.empty) state.projects=pSnap.docs.map(d=>d.data());
    return userDoc.exists||!snap.empty;
  }catch(e){ console.warn('[FB] load:',e); return false; }
}

let _firestoreUnsub=null;
function firestoreStartListener(){
  const col=tasksCol(); if(!col) return;
  if(_firestoreUnsub){ _firestoreUnsub(); _firestoreUnsub=null; }
  _firestoreUnsub=col.onSnapshot(snap=>{
    let changed=false;
    snap.docChanges().forEach(ch=>{
      if(ch.doc.metadata.hasPendingWrites) return;
      const t=ch.doc.data();
      if(ch.type==='added'){ if(!state.tasks.find(x=>x.id===t.id)){state.tasks.unshift(t);changed=true;} }
      else if(ch.type==='modified'){ const i=state.tasks.findIndex(x=>x.id===t.id); if(i>=0){state.tasks[i]=t;changed=true;} }
      else if(ch.type==='removed'){ const before=state.tasks.length; state.tasks=state.tasks.filter(x=>x.id!==t.id); if(state.tasks.length!==before) changed=true; }
    });
    if(changed){ localStorage.setItem(userKey('tasks'),JSON.stringify(state.tasks)); renderAll(); showToast('☁️ Zsynchronizowano','success',1800); }
  },e=>{ if(e.code==='permission-denied') showToast('⚠️ Sync nieaktywny — brak uprawnień','error',5000); });
}

async function firestoreOnLoad(){
  if(!state.currentUser||state.currentUser.provider==='guest') return false;
  if(!_db) return false;
  const localTasks=[...state.tasks]; const localProjects=[...state.projects];
  const cloudExists=await firestoreLoad();
  if(cloudExists){
    saveState(); applyDarkMode(state.darkMode);
    const nt=document.getElementById('notifications-toggle');
    if(nt){nt.checked=state.notifications;nt.setAttribute('aria-checked',String(state.notifications));}
    renderAll();
  } else if(localTasks.length>0){
    const c=tasksCol(); if(c){ const b=_db.batch(); localTasks.forEach(t=>b.set(c.doc(t.id),t)); b.commit().catch(()=>{}); }
  }
  firestoreStartListener(); return cloudExists;
}

/* ── Auth ───────────────────────────────────────────────────── */
const EMAIL_REGEX=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASS_REGEX=/^(?=.*[A-Z])(?=.*\d).{6,}$/;

function mapFirebaseUser(u){
  const pid=u.providerData?.[0]?.providerId;
  return { name:u.displayName||u.email.split('@')[0], email:u.email,
    picture:u.photoURL||'', provider:pid==='google.com'?'google':'email',
    uid:u.uid, emailVerified:u.emailVerified };
}

let _justRegistered=false;

function translateAuthError(code){
  const m={'auth/email-already-in-use':'Konto z tym adresem już istnieje.',
    'auth/invalid-email':'Nieprawidłowy e-mail.','auth/user-not-found':'Nie znaleziono konta.',
    'auth/wrong-password':'Nieprawidłowe hasło.','auth/invalid-credential':'Nieprawidłowy e-mail lub hasło.',
    'auth/weak-password':'Hasło musi mieć co najmniej 6 znaków.',
    'auth/too-many-requests':'Zbyt wiele prób. Spróbuj ponownie później.',
    'auth/network-request-failed':'Błąd sieci. Sprawdź połączenie.',
    'auth/popup-blocked':'Popup zablokowany.','auth/popup-closed-by-user':'Logowanie anulowane.'};
  return m[code]||'Wystąpił błąd. Spróbuj ponownie.';
}

function triggerGoogleSignIn(){
  if(!_auth){ showToast('Firebase nie załadowany','error'); return; }
  if(!window.google?.accounts?.oauth2){ showToast('Nie można załadować Google Sign-In','error'); return; }
  const client=google.accounts.oauth2.initTokenClient({
    client_id:'749463900730-3sj2t8q2n9veggn3uvf93jrioiqdh4f9.apps.googleusercontent.com',
    scope:'email profile',
    callback:async r=>{
      if(r.error){ if(r.error!=='access_denied') showToast('Logowanie Google anulowane','error'); return; }
      try{ await _auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(null,r.access_token)); }
      catch(e){ showToast(translateAuthError(e.code),'error'); }
    }
  });
  client.requestAccessToken({prompt:'select_account'});
}

function guestLogin(){
  const u={name:'Gość',email:'_guest',provider:'guest',uid:'_guest'};
  localStorage.setItem('tf_guest_session',JSON.stringify(u));
  state.currentUser=u; onLoginSuccess(true);
}

function clearGuestSession(){ localStorage.removeItem('tf_guest_session'); }

function showForgotPanel(){
  document.querySelector('.auth-tabs').hidden=true;
  document.getElementById('login-panel').hidden=true;
  document.getElementById('register-panel').hidden=true;
  document.getElementById('forgot-panel').hidden=false;
  document.querySelector('.auth-subtitle').textContent='Zresetuj swoje hasło';
}

function hideForgotPanel(){
  document.getElementById('forgot-panel').hidden=true;
  document.querySelector('.auth-tabs').hidden=false;
  document.getElementById('login-panel').hidden=false;
  document.getElementById('register-panel').hidden=true;
  document.querySelector('.auth-subtitle').textContent='Zaloguj się, aby zarządzać swoimi zadaniami';
  document.querySelectorAll('.auth-tab').forEach(t=>{
    const isL=t.dataset.authTab==='login'; t.classList.toggle('active',isL); t.setAttribute('aria-selected',String(isL));
  });
}

function showEmailVerification(email,source){
  document.getElementById('auth-screen').hidden=true;
  document.getElementById('verify-screen').hidden=false;
  document.getElementById('app-wrapper').hidden=true;
  const card=document.querySelector('#verify-screen .verify-card');
  const safe=email.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if(source==='login'){
    card.classList.add('blocked');
    document.getElementById('verify-icon-wrap').textContent='🔒';
    document.getElementById('verify-title').textContent='Weryfikacja wymagana';
    document.getElementById('verify-desc').innerHTML=`Twoje konto nie zostało jeszcze potwierdzone.<br>Kliknij link weryfikacyjny wysłany na<br><strong>${safe}</strong>`;
  } else {
    card.classList.remove('blocked');
    document.getElementById('verify-icon-wrap').textContent='📧';
    document.getElementById('verify-title').textContent='Potwierdź adres e-mail';
    document.getElementById('verify-desc').innerHTML=`Wysłaliśmy link weryfikacyjny na<br><strong>${safe}</strong>`;
  }
}

function hideEmailVerification(){ document.getElementById('verify-screen').hidden=true; }

async function resendVerificationEmail(){
  const u=_auth?.currentUser; if(!u) return;
  const btn=document.getElementById('verify-resend-btn');
  btn.disabled=true; btn.textContent='Wysyłanie…';
  try{ await u.sendEmailVerification({url:'https://w84kubus.github.io/TaskManager/'}); showToast('📧 Wysłano ponownie — sprawdź Spam','success',5000); }
  catch(e){ showToast(e.code==='auth/too-many-requests'?'Zbyt wiele prób':'Błąd wysyłania','error'); }
  finally{ btn.disabled=false; btn.textContent='Wyślij link ponownie'; }
}

async function checkEmailVerification(){
  const u=_auth?.currentUser; if(!u) return;
  const btn=document.getElementById('verify-check-btn'); btn.disabled=true; btn.textContent='Sprawdzam…';
  try{
    await u.reload();
    if(_auth.currentUser.emailVerified){ hideEmailVerification(); state.currentUser=mapFirebaseUser(_auth.currentUser); await onLoginSuccess(true); }
    else showToast('E-mail jeszcze nie zweryfikowany','warning',5000);
  }catch(e){ showToast('Błąd — spróbuj ponownie','error'); }
  finally{ btn.disabled=false; btn.textContent='✓ Potwierdziłem — zaloguj mnie'; }
}

function showApp(){
  document.getElementById('auth-screen').hidden=true;
  document.getElementById('app-wrapper').hidden=false;
  const u=state.currentUser; const isGuest=u.provider==='guest';
  // sidebar user
  const av=document.getElementById('user-avatar');
  const nm=document.getElementById('user-name');
  if(av){ av.textContent=isGuest?'👤':u.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2); av.className='user-avatar'+(u.provider==='google'?' social-google':isGuest?' social-guest':''); }
  if(nm) nm.textContent=isGuest?'Tryb gościa':u.name;
  // topbar avatar
  const ta=document.getElementById('topbar-avatar');
  if(ta){ ta.textContent=isGuest?'👤':u.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2); ta.className='topbar-avatar'+(u.provider==='google'?' social-google':isGuest?' social-guest':''); }
  // guest banner
  const banner=document.getElementById('guest-banner');
  if(banner) banner.hidden=!isGuest;
  document.body.classList.toggle('guest-mode',isGuest);
  // delete account card
  const dac=document.getElementById('delete-account-card');
  if(dac) dac.hidden=isGuest;
}

function showAuth(){
  document.getElementById('auth-screen').hidden=false;
  document.getElementById('app-wrapper').hidden=true;
  document.getElementById('guest-banner').hidden=true;
  document.body.classList.remove('guest-mode');
  document.getElementById('login-form').reset();
  document.getElementById('register-form').reset();
  ['login-email-error','login-password-error','register-name-error','register-email-error','register-password-error'].forEach(id=>{ const e=document.getElementById(id); if(e) e.textContent=''; });
  document.querySelectorAll('.auth-tab').forEach(t=>{ const isL=t.dataset.authTab==='login'; t.classList.toggle('active',isL); t.setAttribute('aria-selected',String(isL)); });
  document.getElementById('login-panel').hidden=false;
  document.getElementById('register-panel').hidden=true;
}

function logout(){
  if(_firestoreUnsub){ _firestoreUnsub(); _firestoreUnsub=null; }
  pomStop();
  state.tasks=[]; state.projects=[]; state.darkMode=false; state.notifications=true;
  applyDarkMode(false);
  if(state.currentUser?.provider==='guest'){ clearGuestSession(); state.currentUser=null; showAuth(); }
  else{ state.currentUser=null; if(_auth) _auth.signOut().catch(()=>{}); }
}

/* ── Task Operations ────────────────────────────────────────── */
function addTask(data){
  const task={
    id:genId(), name:'', description:'', priority:'medium', status:'todo',
    category:'personal', projectId:null, tags:[], dueDate:null, dueTime:null,
    estimatedTime:0, subtasks:[], starred:false, done:false,
    createdAt:Date.now(), completedAt:null,
    ...data,
    name:(data.name||'').trim(),
  };
  if(!task.name) return null;
  state.tasks.unshift(task); saveState(); firestoreSetTask(task); return task;
}

function removeTask(id){
  state.tasks=state.tasks.filter(t=>t.id!==id); saveState(); firestoreDeleteTask(id);
}

function updateTask(id,patch){
  const t=state.tasks.find(t=>t.id===id); if(!t) return;
  if(patch.done===true && !t.completedAt) patch.completedAt=Date.now();
  if(patch.done===false) patch.completedAt=null;
  Object.assign(t,patch); saveState(); firestoreSetTask(t); return t;
}

function toggleTask(id){
  const t=state.tasks.find(x=>x.id===id); if(!t) return null;
  const done=!t.done;
  return updateTask(id,{done,status:done?'done':'todo',completedAt:done?Date.now():null});
}

/* ── Project Operations ─────────────────────────────────────── */
function addProject(data){
  const p={id:genPId(),name:'',color:PROJECT_COLORS[0],emoji:'📁',createdAt:Date.now(),...data};
  state.projects.push(p); saveState(); firestoreSetProject(p); return p;
}

function removeProject(id){
  state.projects=state.projects.filter(p=>p.id!==id);
  state.tasks.forEach(t=>{ if(t.projectId===id) t.projectId=null; });
  saveState(); firestoreDeleteProject(id);
  state.tasks.filter(t=>!t.projectId).forEach(firestoreSetTask);
}

function getProject(id){ return state.projects.find(p=>p.id===id)||null; }

/* ── Filtering / Sorting ────────────────────────────────────── */
function filterTasks(tasks, filter, search, projectId){
  let list=[...tasks];
  // project filter
  if(projectId) list=list.filter(t=>t.projectId===projectId);
  // main filter
  if(filter==='active')   list=list.filter(t=>!t.done);
  if(filter==='done')     list=list.filter(t=>t.done);
  if(filter==='overdue')  list=list.filter(t=>isOverdue(t));
  if(filter==='today')    list=list.filter(t=>t.dueDate===todayStr());
  if(filter==='upcoming') list=list.filter(t=>t.dueDate&&t.dueDate>todayStr()&&!t.done);
  if(filter==='starred')  list=list.filter(t=>t.starred);
  // search
  if(search.trim()){ const q=search.trim().toLowerCase(); list=list.filter(t=>t.name.toLowerCase().includes(q)||t.description?.toLowerCase().includes(q)||(t.tags||[]).some(tag=>tag.toLowerCase().includes(q))); }
  // sort
  switch(state.sort){
    case 'date-asc':      list.sort((a,b)=>a.createdAt-b.createdAt); break;
    case 'date-desc':     list.sort((a,b)=>b.createdAt-a.createdAt); break;
    case 'priority-high': list.sort((a,b)=>(PRIORITY_ORDER[a.priority]??99)-(PRIORITY_ORDER[b.priority]??99)); break;
    case 'priority-low':  list.sort((a,b)=>(PRIORITY_ORDER[b.priority]??99)-(PRIORITY_ORDER[a.priority]??99)); break;
    case 'alpha-asc':     list.sort((a,b)=>a.name.localeCompare(b.name,'pl')); break;
    case 'alpha-desc':    list.sort((a,b)=>b.name.localeCompare(a.name,'pl')); break;
    case 'due-date':      list.sort((a,b)=>{
      if(!a.dueDate && !b.dueDate) return 0;
      if(!a.dueDate) return 1; if(!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }); break;
  }
  // pinned first
  list.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
  return list;
}

function groupTasks(tasks, groupBy){
  if(groupBy==='none') return [{label:null,tasks}];
  const groups={};
  tasks.forEach(t=>{
    let key;
    if(groupBy==='priority') key=t.priority;
    else if(groupBy==='status') key=t.status||'todo';
    else if(groupBy==='project') key=t.projectId||'_none';
    groups[key]=groups[key]||[];
    groups[key].push(t);
  });
  const result=[];
  if(groupBy==='priority') ['urgent','high','medium','low'].forEach(k=>{ if(groups[k]) result.push({label:PRIORITY_LABEL[k],key:k,tasks:groups[k]}); });
  else if(groupBy==='status') ['todo','doing','review','done'].forEach(k=>{ if(groups[k]) result.push({label:STATUS_LABEL[k],key:k,tasks:groups[k]}); });
  else if(groupBy==='project'){
    if(groups['_none']) result.push({label:'Bez projektu',key:'_none',tasks:groups['_none']});
    state.projects.forEach(p=>{ if(groups[p.id]) result.push({label:p.name,key:p.id,tasks:groups[p.id],color:p.color}); });
  }
  return result;
}

/* ── Task Card / Item Renderers ─────────────────────────────── */
function createTaskItem(task, opts={}){
  const li=document.createElement('li');
  li.className=`task-item${task.done?' done':''}`;
  li.dataset.id=task.id;
  li.dataset.priority=task.priority;

  const overdue=isOverdue(task); const today=isDueToday(task);
  const project=getProject(task.projectId);
  const subtasksDone=(task.subtasks||[]).filter(s=>s.done).length;
  const subtasksTotal=(task.subtasks||[]).length;
  const hasSubs=subtasksTotal>0;
  const tags=(task.tags||[]).slice(0,3);
  const pct=hasSubs?Math.round(subtasksDone/subtasksTotal*100):0;

  li.innerHTML=`
    <button class="task-check" data-action="toggle" aria-label="${task.done?'Oznacz jako aktywne':'Ukończ zadanie'}"></button>
    <div class="task-item-body">
      <div class="task-item-top">
        <span class="task-item-name">${escHtml(task.name)}</span>
        ${tags.map(tag=>`<span class="task-tag tag-medium" style="background:rgba(79,136,255,.12);color:var(--accent-blue)">${escHtml(tag)}</span>`).join('')}
        ${task.starred?'<span title="Ulubione" style="font-size:.8rem">⭐</span>':''}
      </div>
      <div class="task-item-meta">
        ${task.priority!=='medium'?`<span class="task-meta-chip" style="color:${PRIORITY_COLOR[task.priority]}">${PRIORITY_LABEL[task.priority]}</span>`:''}
        ${task.dueDate?`<span class="task-meta-chip ${overdue?'overdue':today?'today':''}">${overdue?'⚠️ ':'📅 '}${formatDate(task.dueDate)}</span>`:''}
        ${project?`<span class="task-meta-chip project">● ${escHtml(project.name)}</span>`:''}
        ${task.estimatedTime?`<span class="task-meta-chip">⏱ ${task.estimatedTime}m</span>`:''}
      </div>
      ${hasSubs?`<div class="task-subtask-bar">
        <div class="task-subtask-track"><div class="task-subtask-fill" style="width:${pct}%"></div></div>
        <span class="task-subtask-label">${subtasksDone}/${subtasksTotal}</span>
      </div>`:''}
      ${task.description||hasSubs?`<div class="task-item-expand">
        ${task.description?`<div class="task-item-desc">${escHtml(task.description)}</div>`:''}
        ${hasSubs?`<div class="subtasks-mini">${(task.subtasks||[]).map(s=>`
          <div class="subtask-mini-item">
            <button class="subtask-mini-check${s.done?' done':''}" data-action="toggle-sub" data-sub-id="${s.id}" aria-label="${s.done?'Odznacz':'Ukończ'} podzadanie"></button>
            <span class="subtask-mini-label${s.done?' done':''}">${escHtml(s.name)}</span>
          </div>`).join('')}</div>`:''}
      </div>`:''}
    </div>
    <div class="task-item-status">
      <button class="status-badge status-${task.status||'todo'}" data-action="cycle-status" title="Zmień status">${STATUS_LABEL[task.status||'todo']}</button>
    </div>
    <div class="task-item-actions">
      <button class="task-action-btn star${task.starred?' starred':''}" data-action="star" title="${task.starred?'Usuń z ulubionych':'Dodaj do ulubionych'}">★</button>
      ${task.description||(task.subtasks||[]).length?`<button class="task-action-btn expand-btn" data-action="expand" title="Rozwiń/zwiń">⌄</button>`:''}
      <button class="task-action-btn" data-action="edit" title="Edytuj">✎</button>
      <button class="task-action-btn delete" data-action="delete" title="Usuń">✕</button>
    </div>`;
  return li;
}

function createKanbanCard(task){
  const div=document.createElement('div');
  div.className=`kanban-card${task.done?' done':''}`;
  div.dataset.id=task.id;
  div.dataset.priority=task.priority;
  div.draggable=true;
  const project=getProject(task.projectId);
  const overdue=isOverdue(task);
  const subtasksTotal=(task.subtasks||[]).length;
  const subtasksDone=(task.subtasks||[]).filter(s=>s.done).length;
  div.innerHTML=`
    <div class="kanban-card-name">${escHtml(task.name)}</div>
    <div class="kanban-card-meta">
      <span class="task-tag" style="background:${getPriorityBg(task.priority)};color:${PRIORITY_COLOR[task.priority]}">${PRIORITY_LABEL[task.priority]}</span>
      ${task.dueDate?`<span class="task-meta-chip ${overdue?'overdue':isDueToday(task)?'today':''}" style="font-size:.62rem">📅 ${formatDate(task.dueDate)}</span>`:''}
      ${project?`<span class="task-meta-chip project" style="font-size:.62rem">● ${escHtml(project.name)}</span>`:''}
      ${subtasksTotal?`<span class="task-meta-chip" style="font-size:.62rem">☑ ${subtasksDone}/${subtasksTotal}</span>`:''}
    </div>`;
  return div;
}

function createDashTaskItem(task){
  const div=document.createElement('div');
  div.className='dash-task-item'; div.dataset.id=task.id;
  const overdue=isOverdue(task); const today=isDueToday(task);
  div.innerHTML=`
    <div class="dash-task-dot" style="background:${PRIORITY_COLOR[task.priority]}"></div>
    <span class="dash-task-name">${escHtml(task.name)}</span>
    ${task.dueDate?`<span class="dash-task-due ${overdue?'overdue':today?'today':''}">${overdue?'Zaległe':formatDate(task.dueDate)}</span>`:''}`;
  return div;
}

/* ── View Switching ─────────────────────────────────────────── */
function switchView(viewId){
  state.activeView=viewId;
  document.querySelectorAll('.view').forEach(s=>s.hidden=true);
  const target=document.getElementById(viewId);
  if(target){ target.hidden=false; target.style.removeProperty('display'); }

  document.querySelectorAll('.sidebar-nav-item, .project-item').forEach(a=>{
    const isActive=a.dataset.view===viewId;
    a.classList.toggle('active',isActive);
  });

  // breadcrumb
  const bc=document.getElementById('header-breadcrumb');
  if(bc){ bc.textContent=VIEW_LABELS[viewId]||viewId; }

  // render
  renderForView(viewId);

  // sidebar tasks filter views title
  if(['tasks','today','upcoming','starred'].includes(viewId)){
    const filterMap={tasks:'all',today:'today',upcoming:'upcoming',starred:'starred'};
    state.filter=filterMap[viewId]||'all';
    updateTasksViewTitle(viewId);
  }

  // close mobile sidebar if open
  const sidebar=document.getElementById('sidebar');
  if(sidebar?.classList.contains('mobile-open')) sidebar.classList.remove('mobile-open');
}

function updateTasksViewTitle(viewId){
  const t=document.getElementById('tasks-view-title');
  const s=document.getElementById('tasks-view-subtitle');
  if(t) t.textContent=VIEW_LABELS[viewId]||'Zadania';
  if(s){
    if(viewId==='today') s.textContent=new Date().toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'});
    else if(viewId==='upcoming') s.textContent='Zadania z przyszłymi terminami';
    else if(viewId==='starred') s.textContent='Oznaczone gwiazdką';
    else s.textContent='Wszystkie Twoje zadania';
  }
}

function renderForView(viewId){
  switch(viewId){
    case 'dashboard': renderDashboard(); break;
    case 'tasks': case 'today': case 'upcoming': case 'starred': renderTasksView(); break;
    case 'kanban': renderKanban(); break;
    case 'calendar': renderCalendar(); break;
    case 'focus': renderFocus(); break;
    case 'analytics': renderAnalytics(); break;
    case 'settings': syncSettingsUI(); break;
  }
}

function renderAll(){
  renderSidebarProjects();
  renderSidebarStreak();
  renderBadges();
  renderForView(state.activeView);
}

/* ── Render: Dashboard ──────────────────────────────────────── */
function renderDashboard(){
  // Greeting
  const h=new Date().getHours();
  const greet=h<12?'Dzień dobry':'Cześć';
  const name=state.currentUser?.name||'';
  const emoji=h<12?'☀️':h<18?'🌤':'🌙';
  const el=document.getElementById('greeting-text');
  if(el) el.textContent=`${greet}, ${name}! ${emoji}`;
  const dateEl=document.getElementById('greeting-date');
  if(dateEl) dateEl.textContent=new Date().toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  // Stats
  const today=todayStr();
  const todayTasks=state.tasks.filter(t=>t.dueDate===today);
  const overdueTasks=state.tasks.filter(t=>isOverdue(t));
  const weekAgo=Date.now()-7*864e5;
  const weekDone=state.tasks.filter(t=>t.done&&t.completedAt&&t.completedAt>=weekAgo);

  const setStat=(id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
  setStat('dash-stat-today',todayTasks.length);
  setStat('dash-stat-overdue',overdueTasks.length);
  setStat('dash-stat-streak',`🔥 ${state.streak}`);
  setStat('dash-stat-week',weekDone.length);

  // Today widget
  const todayList=document.getElementById('dash-today-list');
  if(todayList){
    todayList.innerHTML='';
    const items=todayTasks.slice(0,5);
    if(!items.length){ todayList.innerHTML='<div class="dash-empty">Brak zadań na dziś 🎉</div>'; }
    else items.forEach(t=>todayList.appendChild(createDashTaskItem(t)));
  }

  // Upcoming widget
  const upcomingList=document.getElementById('dash-upcoming-list');
  if(upcomingList){
    upcomingList.innerHTML='';
    const items=state.tasks.filter(t=>t.dueDate&&t.dueDate>today&&!t.done).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,5);
    if(!items.length){ upcomingList.innerHTML='<div class="dash-empty">Brak nadchodzących zadań 🗓</div>'; }
    else items.forEach(t=>upcomingList.appendChild(createDashTaskItem(t)));
  }

  // Week chart
  renderWeekChart('week-chart');
}

function renderWeekChart(containerId){
  const el=document.getElementById(containerId); if(!el) return;
  const days=['Pn','Wt','Śr','Cz','Pt','So','Nd'];
  const counts=[]; let maxVal=1;
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const ds=d.toISOString().split('T')[0];
    const done=state.tasks.filter(t=>t.done&&t.completedAt&&new Date(t.completedAt).toISOString().split('T')[0]===ds).length;
    counts.push({label:days[d.getDay()===0?6:d.getDay()-1],done,date:ds});
    if(done>maxVal) maxVal=done;
  }
  el.innerHTML=counts.map(({label,done,date})=>{
    const h=Math.max(8,Math.round(done/maxVal*80));
    const isToday=date===todayStr();
    return `<div class="week-bar-wrap">
      <div class="week-bar${done?(' has-done'+(isToday?' today':'')):''}" style="height:${h}px" title="${done} ukończonych"></div>
      <span class="week-bar-label">${label}</span>
    </div>`;
  }).join('');
}

/* ── Render: Task List Views ────────────────────────────────── */
function renderTasksView(){
  const filterMap={tasks:'all',today:'today',upcoming:'upcoming',starred:'starred'};
  const filter=filterMap[state.activeView]||state.filter;
  const tasks=filterTasks(state.tasks, filter, state.search, state.activeProject);
  const groups=groupTasks(tasks, state.group);

  const ul=document.getElementById('task-list');
  const empty=document.getElementById('empty-state');
  if(!ul) return;
  ul.innerHTML='';

  if(!tasks.length){
    if(empty) empty.hidden=false;
    return;
  }
  if(empty) empty.hidden=true;

  groups.forEach(({label,tasks:gTasks,color})=>{
    if(label&&groups.length>1){
      const header=document.createElement('li');
      header.innerHTML=`<div class="task-group-header">
        ${color?`<span class="project-dot" style="background:${color}"></span>`:''}
        <span class="task-group-label">${escHtml(label)}</span>
        <span class="task-group-count">${gTasks.length}</span>
        <div class="task-group-divider"></div>
      </div>`;
      ul.appendChild(header);
    }
    gTasks.forEach(t=>ul.appendChild(createTaskItem(t)));
  });

  // Also render today/upcoming/starred specific lists
  renderSpecificLists(filter);
}

function renderSpecificLists(filter){
  // Today list
  const todayUl=document.getElementById('today-list');
  const todayEm=document.getElementById('today-empty');
  if(todayUl){
    const items=state.tasks.filter(t=>isDueToday(t));
    todayUl.innerHTML='';
    if(!items.length){ if(todayEm) todayEm.hidden=false; }
    else{ if(todayEm) todayEm.hidden=true; items.forEach(t=>todayUl.appendChild(createTaskItem(t))); }
    const sub=document.getElementById('today-subtitle');
    if(sub) sub.textContent=new Date().toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'});
  }
  // Upcoming
  const upUl=document.getElementById('upcoming-list');
  const upEm=document.getElementById('upcoming-empty');
  if(upUl){
    const today=todayStr();
    const items=state.tasks.filter(t=>t.dueDate&&t.dueDate>today&&!t.done).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
    upUl.innerHTML='';
    if(!items.length){ if(upEm) upEm.hidden=false; }
    else{ if(upEm) upEm.hidden=true; items.forEach(t=>upUl.appendChild(createTaskItem(t))); }
  }
  // Starred
  const stUl=document.getElementById('starred-list');
  const stEm=document.getElementById('starred-empty');
  if(stUl){
    const items=state.tasks.filter(t=>t.starred);
    stUl.innerHTML='';
    if(!items.length){ if(stEm) stEm.hidden=false; }
    else{ if(stEm) stEm.hidden=true; items.forEach(t=>stUl.appendChild(createTaskItem(t))); }
  }
}

/* ── Render: Kanban ──────────────────────────────────────────── */
function renderKanban(){
  KANBAN_STATUSES.forEach(s=>{
    const col=document.getElementById(`col-${s}`);
    const cnt=document.getElementById(`count-${s}`);
    if(!col) return;
    const tasks=state.tasks.filter(t=>(t.status||'todo')===s);
    if(cnt) cnt.textContent=tasks.length;
    col.innerHTML='';
    if(!tasks.length){ col.innerHTML='<div class="kanban-col-empty"><span class="kanban-col-empty-icon">○</span>Brak kart</div>'; return; }
    tasks.forEach(t=>{
      const card=createKanbanCard(t);
      // drag events
      card.addEventListener('dragstart',e=>{ dragSrcId=t.id; dragSrcStatus=t.status||'todo'; card.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      card.addEventListener('dragend',()=>card.classList.remove('dragging'));
      card.addEventListener('click',()=>openEditModal(t.id));
      col.appendChild(card);
    });
  });
  // drop zones
  document.querySelectorAll('.kanban-col-body').forEach(col=>{
    col.addEventListener('dragover',e=>{ e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave',()=>col.classList.remove('drag-over'));
    col.addEventListener('drop',e=>{
      e.preventDefault(); col.classList.remove('drag-over');
      const newStatus=col.closest('.kanban-column')?.dataset.status;
      if(dragSrcId&&newStatus&&newStatus!==dragSrcStatus){
        updateTask(dragSrcId,{status:newStatus,done:newStatus==='done'});
        renderKanban();
        if(newStatus==='done') showToast('Zadanie ukończone! 🎉','success');
      }
    });
  });
}

/* ── Render: Calendar ────────────────────────────────────────── */
function renderCalendar(){
  const today=new Date(); const todayStr_=todayStr();
  const y=calendarDate.getFullYear(); const m=calendarDate.getMonth();
  const label=calendarDate.toLocaleDateString('pl-PL',{month:'long',year:'numeric'});
  const el=document.getElementById('cal-month-label'); if(el) el.textContent=label;
  const grid=document.getElementById('cal-grid'); if(!grid) return;
  grid.innerHTML='';

  const firstDay=new Date(y,m,1); let startDow=firstDay.getDay(); if(startDow===0) startDow=7;
  const daysInMonth=new Date(y,m+1,0).getDate();
  const prevDays=new Date(y,m,0).getDate();

  // Build days array
  const cells=[];
  for(let i=startDow-1;i>0;i--) cells.push({day:prevDays-i+1,curr:false,date:null});
  for(let i=1;i<=daysInMonth;i++){
    const date=`${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    cells.push({day:i,curr:true,date});
  }
  while(cells.length%7!==0) cells.push({day:cells.length-daysInMonth-startDow+2,curr:false,date:null});

  cells.forEach(({day,curr,date})=>{
    const div=document.createElement('div');
    div.className=`cal-day${!curr?' other-month':''}${date===todayStr_?' today':''}`;
    const dayTasks=date?state.tasks.filter(t=>t.dueDate===date):[];
    const hasOverdue=dayTasks.some(t=>!t.done&&date<todayStr_);
    if(hasOverdue) div.classList.add('has-overdue');
    div.innerHTML=`<div class="cal-day-num">${day}</div>
      <div class="cal-day-dots">${dayTasks.slice(0,3).map(t=>`<div class="cal-dot" style="background:${PRIORITY_COLOR[t.priority]}"></div>`).join('')}${dayTasks.length>3?`<span class="cal-more">+${dayTasks.length-3}</span>`:''}</div>`;
    if(curr&&date) div.addEventListener('click',()=>showCalDayPanel(date,dayTasks));
    grid.appendChild(div);
  });
}

function showCalDayPanel(date,tasks){
  const panel=document.getElementById('cal-day-panel');
  const title=document.getElementById('cal-day-title');
  const list=document.getElementById('cal-day-tasks');
  const empty=document.getElementById('cal-day-empty');
  if(!panel) return;
  panel.hidden=false;
  const d=new Date(date+'T12:00:00');
  if(title) title.textContent=d.toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'});
  if(list){
    list.innerHTML='';
    if(!tasks.length){ if(empty) empty.hidden=false; }
    else{
      if(empty) empty.hidden=true;
      tasks.forEach(t=>{ const li=createTaskItem(t); list.appendChild(li); });
    }
  }
  // highlight selected day
  document.querySelectorAll('.cal-day').forEach(c=>c.classList.remove('selected'));
  // mark selected
}

/* ── Render: Focus Mode ──────────────────────────────────────── */
function renderFocus(){
  updatePomDisplay();
  renderFocusTask();
}

function renderFocusTask(){
  const el=document.getElementById('focus-active-task');
  const nm=document.getElementById('focus-task-name');
  if(!el||!nm) return;
  if(pom.taskId){
    const t=state.tasks.find(x=>x.id===pom.taskId);
    if(t){ el.hidden=false; nm.textContent=t.name; return; }
  }
  el.hidden=true;
}

function updatePomDisplay(){
  const remaining=pom.total-pom.elapsed;
  const m=Math.floor(remaining/60); const s=remaining%60;
  const str=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const disp=document.getElementById('focus-timer-display'); if(disp) disp.textContent=str;
  const mini=document.getElementById('mini-timer-display'); if(mini) mini.textContent=str;
  const miniWrap=document.getElementById('mini-timer'); if(miniWrap) miniWrap.hidden=!pom.running;
  const label=document.getElementById('focus-timer-label');
  if(label) label.textContent={work:'Focus',short:'Krótka przerwa',long:'Długa przerwa'}[pom.mode];
  // ring
  const ring=document.getElementById('focus-ring');
  if(ring){ const c=2*Math.PI*96; const offset=c*(1-pom.elapsed/pom.total); ring.style.strokeDashoffset=offset; }
  // play/pause icons
  const play=document.getElementById('focus-play-icon'); const pause=document.getElementById('focus-pause-icon');
  if(play) play.hidden=pom.running; if(pause) pause.hidden=!pom.running;
  // session dots
  document.querySelectorAll('.focus-session-dot').forEach((d,i)=>d.classList.toggle('done',i<pom.sessions));
}

function pomStart(){
  if(pom.running) return;
  pom.running=true;
  pom._timer=setInterval(()=>{
    pom.elapsed++;
    if(pom.elapsed>=pom.total){ pomComplete(); return; }
    updatePomDisplay();
  },1000);
  updatePomDisplay();
}

function pomPause(){ if(!pom.running) return; pom.running=false; clearInterval(pom._timer); updatePomDisplay(); }
function pomStop(){ pomPause(); pom.elapsed=0; updatePomDisplay(); }

function pomSetMode(mode){
  pomStop(); pom.mode=mode; pom.total=(state.pomoDurations[mode]||POM_MODES[mode])*60; pom.elapsed=0;
  document.querySelectorAll('.focus-mode-tab').forEach(t=>t.classList.toggle('active',t.dataset.mode===mode));
  updatePomDisplay();
}

function pomComplete(){
  pomPause(); pom.elapsed=0;
  if(pom.mode==='work'){
    pom.sessions=(pom.sessions+1)%4;
    if(pom.sessions===0) pomSetMode('long');
    else pomSetMode('short');
    showToast('⏰ Sesja Focus zakończona! Czas na przerwę.','success',5000);
  } else {
    pomSetMode('work');
    showToast('✅ Przerwa skończona! Czas na Focus.','success',4000);
  }
}

/* ── Render: Analytics ───────────────────────────────────────── */
function renderAnalytics(){
  const total=state.tasks.length;
  const done=state.tasks.filter(t=>t.done).length;
  const pct=total?Math.round(done/total*100):0;
  const setStat=(id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
  setStat('stat-total',total); setStat('stat-done',done); setStat('stat-percent',`${pct}%`);
  setStat('stat-best-streak',state.streak); setStat('stat-active',total-done);

  // 7-day activity
  const actEl=document.getElementById('activity-chart');
  if(actEl){
    const days=['Pn','Wt','Śr','Cz','Pt','So','Nd'];
    const counts=[]; let maxVal=1;
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const ds=d.toISOString().split('T')[0];
      const cnt=state.tasks.filter(t=>t.done&&t.completedAt&&new Date(t.completedAt).toISOString().split('T')[0]===ds).length;
      counts.push({label:days[d.getDay()===0?6:d.getDay()-1],cnt});
      if(cnt>maxVal) maxVal=cnt;
    }
    actEl.innerHTML=counts.map(({label,cnt})=>
      `<div class="act-bar-wrap"><div class="act-bar${cnt?' active':''}" style="height:${Math.max(6,Math.round(cnt/maxVal*90))}px" title="${cnt} ukończonych"></div><span class="act-bar-label">${label}</span></div>`
    ).join('');
  }

  // Priority donut
  const pEl=document.getElementById('priority-donut');
  const lgEl=document.getElementById('priority-legend');
  if(pEl){
    const prioCount={urgent:0,high:0,medium:0,low:0};
    state.tasks.forEach(t=>{ if(prioCount[t.priority]!==undefined) prioCount[t.priority]++; });
    const tot2=Object.values(prioCount).reduce((a,b)=>a+b,0)||1;
    let deg=0;
    const segs=Object.entries(prioCount).map(([k,v])=>{
      const pct=v/tot2*360; const seg=`${PRIORITY_COLOR[k]} ${deg}deg ${deg+pct}deg`; deg+=pct; return seg;
    });
    pEl.style.cssText=`width:120px;height:120px;border-radius:50%;background:conic-gradient(${segs.join(',')})`;
    if(lgEl) lgEl.innerHTML=Object.entries(prioCount).map(([k,v])=>
      `<div class="priority-legend-item"><div class="priority-legend-dot" style="background:${PRIORITY_COLOR[k]}"></div>${PRIORITY_LABEL[k]}: <strong>${v}</strong></div>`
    ).join('');
  }

  // Category bars
  const catEl=document.getElementById('category-chart');
  if(catEl){
    const counts={}; state.tasks.forEach(t=>{ counts[t.category]=(counts[t.category]||0)+1; });
    const maxC=Math.max(...Object.values(counts),1);
    catEl.innerHTML=Object.entries(CATEGORY_LABEL).map(([k,lbl])=>{
      const c=counts[k]||0;
      return `<div class="bar-item"><span class="bar-label">${lbl}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(c/maxC*100)}%"></div></div><span class="bar-count">${c}</span></div>`;
    }).join('');
  }

  // Heatmap (28 days)
  const hmEl=document.getElementById('heatmap');
  if(hmEl){
    hmEl.innerHTML='';
    const cols=4; const rows=7;
    for(let c=0;c<cols;c++){
      const col=document.createElement('div'); col.className='heatmap-col';
      for(let r=0;r<rows;r++){
        const dayOffset=(cols-1-c)*rows+(rows-1-r);
        const d=new Date(); d.setDate(d.getDate()-dayOffset);
        const ds=d.toISOString().split('T')[0];
        const cnt=state.tasks.filter(t=>t.done&&t.completedAt&&new Date(t.completedAt).toISOString().split('T')[0]===ds).length;
        const lv=cnt===0?'':cnt<2?'lv1':cnt<4?'lv2':cnt<6?'lv3':'lv4';
        const cell=document.createElement('div');
        cell.className=`heatmap-cell${lv?' '+lv:''}`;
        cell.title=`${ds}: ${cnt} ukończonych`;
        col.appendChild(cell);
      }
      hmEl.appendChild(col);
    }
  }
}

/* ── Render: Sidebar ─────────────────────────────────────────── */
function renderSidebarProjects(){
  const list=document.getElementById('sidebar-projects-list'); if(!list) return;
  list.innerHTML='';
  state.projects.forEach(p=>{
    const btn=document.createElement('button');
    btn.className=`project-item${state.activeProject===p.id?' active':''}`;
    btn.dataset.projectId=p.id;
    const taskCount=state.tasks.filter(t=>t.projectId===p.id).length;
    btn.innerHTML=`<span class="project-dot" style="background:${p.color}"></span><span class="project-name">${escHtml(p.emoji||'📁')} ${escHtml(p.name)}</span><span class="project-count">${taskCount}</span>`;
    btn.addEventListener('click',()=>{
      if(state.activeProject===p.id){ state.activeProject=null; document.querySelectorAll('.project-item').forEach(x=>x.classList.remove('active')); }
      else{ state.activeProject=p.id; document.querySelectorAll('.project-item').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); }
      if(!['tasks','today','upcoming','starred'].includes(state.activeView)) switchView('tasks');
      else renderTasksView();
    });
    // right-click to delete
    btn.addEventListener('contextmenu',e=>{ e.preventDefault(); openConfirm('Usuń projekt',`Usunąć projekt "${p.name}"?`,()=>{ removeProject(p.id); renderAll(); }); });
    list.appendChild(btn);
  });
}

function renderSidebarStreak(){
  const el=document.getElementById('streak-count'); if(el) el.textContent=state.streak;
}

function renderBadges(){
  const today=todayStr();
  const overdueCount=state.tasks.filter(t=>isOverdue(t)).length;
  // Add badge to Dashboard nav item
}

/* ── Render: Settings UI ─────────────────────────────────────── */
function syncSettingsUI(){
  const dm=document.getElementById('dark-mode-toggle');
  if(dm){ dm.checked=state.darkMode; dm.setAttribute('aria-checked',String(state.darkMode)); }
  const nt=document.getElementById('notifications-toggle');
  if(nt){ nt.checked=state.notifications; nt.setAttribute('aria-checked',String(state.notifications)); }
  const pw=document.getElementById('pomo-work'); if(pw) pw.value=state.pomoDurations.work||25;
  const ps=document.getElementById('pomo-short'); if(ps) ps.value=state.pomoDurations.short||5;
  const pl=document.getElementById('pomo-long'); if(pl) pl.value=state.pomoDurations.long||15;
}

/* ── Add/Edit Modal ──────────────────────────────────────────── */
let _editingTaskId=null;
let _modalSubtasks=[];
let _modalTags=[];
let _modalPriority='medium';

function openAddModal(defaults={}){
  _editingTaskId=null;
  _modalSubtasks=[]; _modalTags=[]; _modalPriority='medium';
  const modal=document.getElementById('add-modal');
  if(!modal) return;
  document.getElementById('add-modal-title').textContent='Nowe zadanie';
  document.getElementById('task-name').value='';
  document.getElementById('task-desc').value='';
  document.getElementById('task-priority').value=defaults.priority||'medium';
  document.getElementById('task-category').value=defaults.category||'personal';
  document.getElementById('task-due').value=defaults.dueDate||'';
  document.getElementById('task-due-time').value='';
  document.getElementById('task-tags').value='';
  const nameErr=document.getElementById('name-error'); if(nameErr) nameErr.textContent='';
  modal.hidden=false;
  setTimeout(()=>document.getElementById('task-name')?.focus(),50);
}

function closeAddModal(){
  const m=document.getElementById('add-modal'); if(m) m.hidden=true;
}

function openEditModal(taskId){
  const task=state.tasks.find(t=>t.id===taskId); if(!task) return;
  _editingTaskId=taskId;
  const modal=document.getElementById('modal'); if(!modal) return;
  document.getElementById('modal-title').textContent='Edytuj zadanie';
  document.getElementById('edit-task-id').value=taskId;
  document.getElementById('edit-task-name').value=task.name;
  document.getElementById('edit-task-desc').value=task.description||'';
  document.getElementById('edit-task-priority').value=task.priority;
  document.getElementById('edit-task-status').value=task.status||'todo';
  document.getElementById('edit-task-category').value=task.category||'personal';
  document.getElementById('edit-task-due').value=task.dueDate||'';
  document.getElementById('edit-task-tags').value=(task.tags||[]).join(', ');
  const nameErr=document.getElementById('edit-name-error'); if(nameErr) nameErr.textContent='';
  // Subtasks
  _modalSubtasks=[...(task.subtasks||[])];
  renderModalSubtasks();
  modal.hidden=false;
  setTimeout(()=>document.getElementById('edit-task-name')?.focus(),50);
}

function renderModalSubtasks(){
  const ul=document.getElementById('subtasks-list'); if(!ul) return;
  ul.innerHTML='';
  _modalSubtasks.forEach((s,i)=>{
    const li=document.createElement('li'); li.className='subtask-item';
    li.innerHTML=`<button class="subtask-check-btn${s.done?' done':''}" data-i="${i}" type="button"></button>
      <input type="text" class="subtask-name-input" value="${escHtml(s.name)}" data-i="${i}" maxlength="120">
      <button class="subtask-remove" data-i="${i}" type="button" title="Usuń">✕</button>`;
    ul.appendChild(li);
  });
}

function closeEditModal(){ const m=document.getElementById('modal'); if(m) m.hidden=true; }

/* ── Project Modal ───────────────────────────────────────────── */
let _selectedProjectColor=PROJECT_COLORS[0];

function openProjectModal(){
  const m=document.getElementById('project-modal'); if(!m) return;
  document.getElementById('project-name-input').value='';
  document.getElementById('project-emoji-input').value='📁';
  _selectedProjectColor=PROJECT_COLORS[0];
  const picker=document.getElementById('project-color-picker');
  if(picker){
    picker.innerHTML=PROJECT_COLORS.map(c=>`<div class="color-swatch${c===_selectedProjectColor?' selected':''}" style="background:${c}" data-color="${c}"></div>`).join('');
    picker.addEventListener('click',e=>{
      const sw=e.target.closest('.color-swatch'); if(!sw) return;
      _selectedProjectColor=sw.dataset.color;
      picker.querySelectorAll('.color-swatch').forEach(x=>x.classList.toggle('selected',x.dataset.color===_selectedProjectColor));
    });
  }
  m.hidden=false;
  setTimeout(()=>document.getElementById('project-name-input')?.focus(),50);
}

function closeProjectModal(){ const m=document.getElementById('project-modal'); if(m) m.hidden=true; }

/* ── Confirm Modal ───────────────────────────────────────────── */
function openConfirm(title,msg,onOk){
  const m=document.getElementById('confirm-modal'); if(!m) return;
  document.getElementById('confirm-title').textContent=title;
  document.getElementById('confirm-message').textContent=msg;
  m.hidden=false;
  const ok=document.getElementById('confirm-ok');
  const newOk=ok.cloneNode(true); ok.parentNode.replaceChild(newOk,ok);
  newOk.addEventListener('click',()=>{ m.hidden=true; onOk(); });
}

function closeConfirm(){ const m=document.getElementById('confirm-modal'); if(m) m.hidden=true; }

/* ── Search Overlay ──────────────────────────────────────────── */
function openSearch(){
  const ov=document.getElementById('search-overlay'); if(!ov) return;
  ov.hidden=false;
  const inp=document.getElementById('search-overlay-input'); if(inp){ inp.value=''; inp.focus(); }
  document.getElementById('search-overlay-results').innerHTML='';
}

function closeSearch(){ const ov=document.getElementById('search-overlay'); if(ov) ov.hidden=true; }

function renderSearchResults(q){
  const res=document.getElementById('search-overlay-results'); if(!res) return;
  if(!q.trim()){ res.innerHTML=''; return; }
  const found=state.tasks.filter(t=>t.name.toLowerCase().includes(q.toLowerCase())||t.description?.toLowerCase().includes(q.toLowerCase())).slice(0,8);
  if(!found.length){ res.innerHTML='<div class="search-no-results">Brak wyników dla "'+escHtml(q)+'"</div>'; return; }
  res.innerHTML='';
  found.forEach(t=>{
    const li=document.createElement('li'); li.className='search-result-item';
    li.innerHTML=`<div class="search-result-prio" style="background:${PRIORITY_COLOR[t.priority]}"></div>
      <span class="search-result-name">${escHtml(t.name)}</span>
      <span class="search-result-meta">${STATUS_LABEL[t.status||'todo']}</span>`;
    li.addEventListener('click',()=>{ closeSearch(); openEditModal(t.id); });
    res.appendChild(li);
  });
}

/* ── Toast ───────────────────────────────────────────────────── */
function showToast(msg,type='success',dur=3200){
  if(!state.notifications&&type!=='error') return;
  const c=document.getElementById('toast-container'); if(!c) return;
  const t=document.createElement('div'); t.className=`toast ${type}`;
  t.setAttribute('role','status');
  const icons={success:'✓',warning:'⚠',error:'✕'};
  t.innerHTML=`<span aria-hidden="true">${icons[type]||'•'}</span>${escHtml(msg)}`;
  c.appendChild(t);
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),320); },dur);
}

/* ── Dark Mode ───────────────────────────────────────────────── */
function applyDarkMode(enabled){
  document.documentElement.setAttribute('data-theme',enabled?'dark':'light');
  const m=document.querySelector('meta[name="theme-color"]'); if(m) m.content=enabled?'#060810':'#4f88ff';
}

/* ── Export ──────────────────────────────────────────────────── */
function exportDataAsync(){
  return new Promise((res,rej)=>setTimeout(()=>{
    try{
      const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),version:'3.0.0',tasks:state.tasks,projects:state.projects},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`taskflow_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); res();
    }catch(e){rej(e);}
  },300));
}

function exportTxtAsync(){
  return new Promise((res,rej)=>setTimeout(()=>{
    try{
      const lines=['╔══════════════════════════════╗','║     TASKFLOW — EKSPORT       ║','╚══════════════════════════════╝',`  Data: ${new Date().toLocaleDateString('pl-PL')}`,`  Użytkownik: ${state.currentUser?.name||'—'}`,`  Łącznie: ${state.tasks.length}  |  Ukończone: ${state.tasks.filter(t=>t.done).length}`,'','─────────────────────────────'];
      const sorted=[...state.tasks].sort((a,b)=>b.createdAt-a.createdAt);
      sorted.forEach((t,i)=>{ lines.push(`${i+1}. [${t.done?'✓':' '}] ${t.name}`); if(t.dueDate) lines.push(`     Termin: ${t.dueDate}`); lines.push(`     Priorytet: ${PRIORITY_LABEL[t.priority]}`); lines.push(''); });
      const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`taskflow_${new Date().toISOString().slice(0,10)}.txt`; a.click(); URL.revokeObjectURL(url); res();
    }catch(e){rej(e);}
  },300));
}

/* ── Clear / Delete Account ──────────────────────────────────── */
function clearAll(){
  const c=tasksCol(); if(c) state.tasks.forEach(t=>c.doc(t.id).delete().catch(()=>{}));
  state.tasks=[]; state.projects=[]; saveState(); renderAll();
  showToast('Dane wyczyszczone','warning');
}

async function deleteAccount(){
  const u=_auth?.currentUser; if(!u) return;
  openConfirm('Usuń konto','Czy na pewno chcesz trwale usunąć konto i wszystkie dane? Tej operacji nie można cofnąć.',async()=>{
    const btn=document.getElementById('delete-account-btn');
    if(btn){btn.disabled=true;btn.textContent='Usuwanie…';}
    try{
      if(_firestoreUnsub){_firestoreUnsub();_firestoreUnsub=null;}
      const c=tasksCol();
      if(c&&_db){ const snap=await c.get(); if(!snap.empty){const b=_db.batch();snap.docs.forEach(d=>b.delete(d.ref));await b.commit();} await _db.collection('users').doc(userKey_fb()).delete().catch(()=>{}); }
      await u.delete(); localStorage.clear(); state.currentUser=null; state.tasks=[]; showAuth(); showToast('Konto usunięte','success',5000);
    }catch(e){
      if(btn){btn.disabled=false;btn.textContent='Usuń konto';}
      if(e.code==='auth/requires-recent-login'){showToast('Ze względów bezpieczeństwa zaloguj się ponownie','error',7000);await _auth.signOut();showAuth();}
      else showToast('Błąd usuwania konta','error');
    }
  });
}

/* ── Privacy ─────────────────────────────────────────────────── */
function showPrivacy(){ const m=document.getElementById('privacy-modal'); if(m) m.hidden=false; document.body.style.overflow='hidden'; }
function hidePrivacy(){ const m=document.getElementById('privacy-modal'); if(m) m.hidden=true; document.body.style.overflow=''; }

/* ── Validation ──────────────────────────────────────────────── */
const VALID_NAME=/^[\p{L}\p{N}\s\-.,!?()]{2,120}$/u;
function validateName(val,inputId,errorId){
  const inp=document.getElementById(inputId); const err=document.getElementById(errorId);
  const v=val.trim();
  if(!v){ if(inp) inp.classList.add('error'); if(err) err.textContent='Nazwa nie może być pusta.'; return false; }
  if(v.length<2){ if(inp) inp.classList.add('error'); if(err) err.textContent='Min. 2 znaki.'; return false; }
  if(!VALID_NAME.test(v)){ if(inp) inp.classList.add('error'); if(err) err.textContent='Niedozwolone znaki.'; return false; }
  if(inp) inp.classList.remove('error'); if(err) err.textContent=''; return true;
}

/* ── onLoginSuccess ──────────────────────────────────────────── */
async function onLoginSuccess(isFresh=true){
  state.tasks=[]; state.projects=[]; state.darkMode=true; state.notifications=true; state.streak=0;
  loadState(); applyDarkMode(state.darkMode);
  syncSettingsUI(); showApp(); renderSidebarProjects(); renderSidebarStreak();
  switchView('dashboard');
  if(isFresh){
    const isGuest=state.currentUser.provider==='guest';
    showToast(isGuest?'Tryb gościa — zadania lokalne 👤':`Witaj, ${state.currentUser.name}! 👋`,isGuest?'warning':'success',3500);
  }
  const isGuest=state.currentUser.provider==='guest';
  let isNew=isGuest;
  if(!isGuest){ const existed=await firestoreOnLoad(); isNew=!existed; }
  if(isNew&&state.tasks.length===0){
    setTimeout(()=>{
      [
        {name:'Zaplanuj tygodniowy harmonogram',priority:'high',category:'work',dueDate:todayStr()},
        {name:'Sprawdź skrzynkę e-mail',priority:'medium',category:'work',starred:true},
        {name:'Spacer 30 minut',priority:'low',category:'health'},
        {name:'Zrób zakupy spożywcze',priority:'medium',category:'shopping'},
      ].forEach(t=>addTask(t));
      renderAll();
    },600);
  }
}

/* ── Event Setup ─────────────────────────────────────────────── */
function setupAuthEvents(){
  // tabs
  document.querySelectorAll('.auth-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.auth-tab').forEach(t=>{t.classList.remove('active');t.setAttribute('aria-selected','false');});
      tab.classList.add('active'); tab.setAttribute('aria-selected','true');
      const isLogin=tab.dataset.authTab==='login';
      document.getElementById('login-panel').hidden=!isLogin;
      document.getElementById('register-panel').hidden=isLogin;
    });
  });
  // login form
  document.getElementById('login-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const emailIn=document.getElementById('login-email'); const passIn=document.getElementById('login-password');
    let ok=true;
    if(!EMAIL_REGEX.test(emailIn.value.trim())){ emailIn.classList.add('error'); document.getElementById('login-email-error').textContent='Wpisz poprawny e-mail.'; ok=false; }
    else{ emailIn.classList.remove('error'); document.getElementById('login-email-error').textContent=''; }
    if(!passIn.value){ passIn.classList.add('error'); document.getElementById('login-password-error').textContent='Wpisz hasło.'; ok=false; }
    else{ passIn.classList.remove('error'); document.getElementById('login-password-error').textContent=''; }
    if(!ok) return;
    const btn=e.target.querySelector('[type="submit"]'); btn.disabled=true; btn.textContent='Logowanie…';
    try{ await _auth.signInWithEmailAndPassword(emailIn.value.trim(),passIn.value); }
    catch(err){ passIn.classList.add('error'); document.getElementById('login-password-error').textContent=translateAuthError(err.code); }
    finally{ btn.disabled=false; btn.textContent='Zaloguj się'; }
  });
  // register form
  document.getElementById('register-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const nI=document.getElementById('register-name'),eI=document.getElementById('register-email'),pI=document.getElementById('register-password'),cI=document.getElementById('register-consent');
    let ok=true;
    if(nI.value.trim().length<2){nI.classList.add('error');document.getElementById('register-name-error').textContent='Min. 2 znaki.';ok=false;}else{nI.classList.remove('error');document.getElementById('register-name-error').textContent='';}
    if(!EMAIL_REGEX.test(eI.value.trim())){eI.classList.add('error');document.getElementById('register-email-error').textContent='Wpisz poprawny e-mail.';ok=false;}else{eI.classList.remove('error');document.getElementById('register-email-error').textContent='';}
    if(!PASS_REGEX.test(pI.value)){pI.classList.add('error');document.getElementById('register-password-error').textContent='Min. 6 znaków, 1 wielka litera i 1 cyfra.';ok=false;}else{pI.classList.remove('error');document.getElementById('register-password-error').textContent='';}
    if(!cI.checked){cI.classList.add('error');document.getElementById('register-consent-error').textContent='Wymagana akceptacja.';ok=false;}else{cI.classList.remove('error');document.getElementById('register-consent-error').textContent='';}
    if(!ok) return;
    const btn=e.target.querySelector('[type="submit"]'); btn.disabled=true; btn.textContent='Rejestracja…';
    try{
      const cred=await _auth.createUserWithEmailAndPassword(eI.value.trim(),pI.value);
      await cred.user.updateProfile({displayName:nI.value.trim()});
      _justRegistered=true;
      await cred.user.sendEmailVerification({url:'https://w84kubus.github.io/TaskManager/'});
      showEmailVerification(cred.user.email,'register');
    }catch(err){eI.classList.add('error');document.getElementById('register-email-error').textContent=translateAuthError(err.code);}
    finally{btn.disabled=false;btn.textContent='Utwórz konto';}
  });
  // Google
  document.getElementById('google-login').addEventListener('click',triggerGoogleSignIn);
  document.getElementById('google-register').addEventListener('click',triggerGoogleSignIn);
  // Forgot
  document.getElementById('forgot-btn').addEventListener('click',showForgotPanel);
  document.getElementById('forgot-back-btn').addEventListener('click',()=>{document.getElementById('forgot-email').value='';document.getElementById('forgot-email-error').textContent='';hideForgotPanel();});
  document.getElementById('forgot-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const eI=document.getElementById('forgot-email');
    if(!EMAIL_REGEX.test(eI.value.trim())){eI.classList.add('error');document.getElementById('forgot-email-error').textContent='Wpisz poprawny e-mail.';return;}
    eI.classList.remove('error');document.getElementById('forgot-email-error').textContent='';
    const btn=e.target.querySelector('[type="submit"]'); btn.disabled=true; btn.textContent='Wysyłanie…';
    try{await _auth.sendPasswordResetEmail(eI.value.trim(),{url:'https://w84kubus.github.io/TaskManager/'});showToast(`📧 Wysłano link na ${eI.value.trim()}. Sprawdź Spam.`,'success',7000);eI.value='';hideForgotPanel();}
    catch(err){eI.classList.add('error');document.getElementById('forgot-email-error').textContent=translateAuthError(err.code);}
    finally{btn.disabled=false;btn.textContent='Wyślij link resetujący';}
  });
  document.getElementById('open-privacy-reg').addEventListener('click',showPrivacy);
  document.getElementById('verify-check-btn').addEventListener('click',checkEmailVerification);
  document.getElementById('verify-resend-btn').addEventListener('click',resendVerificationEmail);
  document.getElementById('verify-back-btn').addEventListener('click',()=>{hideEmailVerification();if(_auth) _auth.signOut().catch(()=>{});showAuth();});
  document.getElementById('guest-btn').addEventListener('click',guestLogin);
  document.getElementById('guest-banner-login').addEventListener('click',()=>openConfirm('Przejdź do logowania','Twoje zadania jako gość zostaną zachowane lokalnie.',()=>{clearGuestSession();state.currentUser=null;state.tasks=[];state.projects=[];state.darkMode=true;state.notifications=true;applyDarkMode(true);showAuth();}));
  document.getElementById('guest-banner-close').addEventListener('click',()=>{document.getElementById('guest-banner').hidden=true;document.body.classList.remove('guest-mode');});
}

function setupAppEvents(){
  // Sidebar navigation
  document.querySelectorAll('.sidebar-nav-item[data-view]').forEach(btn=>{
    btn.addEventListener('click',()=>switchView(btn.dataset.view));
  });

  // Sidebar new task btn
  document.getElementById('sidebar-new-btn')?.addEventListener('click',()=>openAddModal());

  // Sidebar toggle (collapse)
  document.getElementById('sidebar-toggle')?.addEventListener('click',()=>{
    document.body.classList.toggle('sidebar-collapsed');
  });

  // Mobile menu
  document.getElementById('mobile-menu-btn')?.addEventListener('click',()=>{
    document.getElementById('sidebar')?.classList.toggle('mobile-open');
  });

  // Add project btn
  document.getElementById('add-project-btn')?.addEventListener('click',openProjectModal);

  // Topbar search
  document.getElementById('search-btn')?.addEventListener('click',openSearch);
  document.getElementById('search-overlay-backdrop')?.addEventListener('click',closeSearch);
  document.getElementById('search-overlay-input')?.addEventListener('input',e=>renderSearchResults(e.target.value));

  // Add task modal
  document.getElementById('add-task-btn-tasks')?.addEventListener('click',()=>openAddModal());
  document.getElementById('add-task-btn-today')?.addEventListener('click',()=>openAddModal({dueDate:todayStr()}));
  document.getElementById('add-modal-close')?.addEventListener('click',closeAddModal);
  document.getElementById('add-modal-cancel')?.addEventListener('click',closeAddModal);
  document.getElementById('add-modal-overlay')?.addEventListener('click',closeAddModal);
  document.getElementById('task-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const nameVal=document.getElementById('task-name').value;
    if(!validateName(nameVal,'task-name','name-error')) return;
    const task=addTask({
      name:nameVal,
      description:document.getElementById('task-desc').value,
      priority:document.getElementById('task-priority').value,
      category:document.getElementById('task-category').value,
      dueDate:document.getElementById('task-due').value||null,
      dueTime:document.getElementById('task-due-time').value||null,
      tags:document.getElementById('task-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
      projectId:state.activeProject||null,
    });
    if(task){ closeAddModal(); renderAll(); showToast(`Dodano: „${task.name}"`, 'success'); }
  });

  // Quick add form (dashboard)
  document.getElementById('quick-add-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const inp=document.getElementById('quick-add-input'); if(!inp||!inp.value.trim()) return;
    const task=addTask({
      name:inp.value,
      priority:document.getElementById('quick-add-priority').value,
      dueDate:document.getElementById('quick-add-date').value||null,
    });
    if(task){ inp.value=''; document.getElementById('quick-add-date').value=''; renderAll(); showToast(`Dodano: „${task.name}"`,'success'); }
  });

  // Edit modal
  document.getElementById('modal-close')?.addEventListener('click',closeEditModal);
  document.getElementById('modal-cancel')?.addEventListener('click',closeEditModal);
  document.getElementById('modal-overlay')?.addEventListener('click',closeEditModal);
  document.getElementById('edit-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    if(!validateName(document.getElementById('edit-task-name').value,'edit-task-name','edit-name-error')) return;
    const id=document.getElementById('edit-task-id').value;
    // collect subtasks from DOM
    const subtasksEl=document.querySelectorAll('#subtasks-list .subtask-name-input');
    const subs=_modalSubtasks.map((s,i)=>({...s,name:subtasksEl[i]?.value||s.name})).filter(s=>s.name.trim());
    updateTask(id,{
      name:document.getElementById('edit-task-name').value.trim(),
      description:document.getElementById('edit-task-desc').value,
      priority:document.getElementById('edit-task-priority').value,
      status:document.getElementById('edit-task-status').value,
      done:document.getElementById('edit-task-status').value==='done',
      category:document.getElementById('edit-task-category').value,
      dueDate:document.getElementById('edit-task-due').value||null,
      tags:document.getElementById('edit-task-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
      subtasks:subs,
    });
    closeEditModal(); renderAll(); showToast('Zadanie zaktualizowane!','success');
  });
  // Add subtask in edit modal
  document.getElementById('add-subtask-btn')?.addEventListener('click',()=>{
    _modalSubtasks.push({id:genId(),name:'',done:false});
    renderModalSubtasks();
    const inputs=document.querySelectorAll('#subtasks-list .subtask-name-input');
    inputs[inputs.length-1]?.focus();
  });
  document.getElementById('subtasks-list')?.addEventListener('click',e=>{
    const i=parseInt(e.target.dataset.i);
    if(e.target.classList.contains('subtask-check-btn')){ _modalSubtasks[i].done=!_modalSubtasks[i].done; renderModalSubtasks(); }
    if(e.target.classList.contains('subtask-remove')){ _modalSubtasks.splice(i,1); renderModalSubtasks(); }
  });

  // Project modal
  document.getElementById('project-modal-close')?.addEventListener('click',closeProjectModal);
  document.getElementById('project-modal-cancel')?.addEventListener('click',closeProjectModal);
  document.getElementById('project-modal-overlay')?.addEventListener('click',closeProjectModal);
  document.getElementById('project-modal-save')?.addEventListener('click',()=>{
    const name=document.getElementById('project-name-input').value.trim();
    if(!name){ showToast('Podaj nazwę projektu','warning'); return; }
    const emoji=document.getElementById('project-emoji-input').value||'📁';
    addProject({name,color:_selectedProjectColor,emoji});
    closeProjectModal(); renderSidebarProjects(); showToast(`Projekt "${name}" utworzony!`,'success');
  });

  // Task list events (delegation)
  function setupTaskListEvents(containerId){
    const el=document.getElementById(containerId); if(!el) return;
    el.addEventListener('click',e=>{
      const btn=e.target.closest('[data-action]'); if(!btn) return;
      const li=btn.closest('.task-item'); const id=li?.dataset.id; if(!id) return;
      switch(btn.dataset.action){
        case 'toggle': {
          const t=toggleTask(id);
          const check=li.querySelector('.task-check');
          if(check) check.classList.add('task-check-anim');
          if(t?.done) showToast('Zadanie ukończone! 🎉','success');
          setTimeout(()=>renderAll(),250);
          break;
        }
        case 'delete': {
          const t=state.tasks.find(x=>x.id===id); if(!t) break;
          li.style.cssText='transition:opacity .2s,transform .2s;opacity:0;transform:translateX(20px)';
          setTimeout(()=>{removeTask(id);renderAll();showToast(`Usunięto: „${t.name}"`,'warning');},200);
          break;
        }
        case 'edit': openEditModal(id); break;
        case 'star': { const t=state.tasks.find(x=>x.id===id); if(t) updateTask(id,{starred:!t.starred}); renderAll(); break; }
        case 'expand': li.classList.toggle('expanded'); btn.textContent=li.classList.contains('expanded')?'⌃':'⌄'; break;
        case 'cycle-status': {
          const t=state.tasks.find(x=>x.id===id); if(!t) break;
          const sts=KANBAN_STATUSES; const cur=t.status||'todo'; const next=sts[(sts.indexOf(cur)+1)%sts.length];
          updateTask(id,{status:next,done:next==='done'}); renderAll();
          if(next==='done') showToast('Zadanie ukończone! 🎉','success');
          break;
        }
        case 'toggle-sub': {
          const t=state.tasks.find(x=>x.id===id); if(!t) break;
          const subId=btn.dataset.subId;
          const subs=(t.subtasks||[]).map(s=>s.id===subId?{...s,done:!s.done}:s);
          updateTask(id,{subtasks:subs}); renderAll(); break;
        }
      }
    });
  }
  setupTaskListEvents('task-list');
  setupTaskListEvents('today-list');
  setupTaskListEvents('upcoming-list');
  setupTaskListEvents('starred-list');
  setupTaskListEvents('dash-today-list');
  setupTaskListEvents('dash-upcoming-list');
  setupTaskListEvents('cal-day-tasks');

  // Kanban add card btn
  document.querySelectorAll('.kanban-add-btn').forEach(btn=>{
    btn.addEventListener('click',()=>openAddModal({status:btn.dataset.col}));
  });

  // Dashboard widget links
  document.querySelectorAll('.dash-widget-link[data-view]').forEach(btn=>{
    btn.addEventListener('click',()=>switchView(btn.dataset.view));
  });

  // Task controls (filter/sort/group/search)
  document.querySelectorAll('.chip[data-filter]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.chip[data-filter]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
      state.filter=btn.dataset.filter; renderTasksView();
    });
  });
  document.getElementById('sort-select')?.addEventListener('change',e=>{state.sort=e.target.value;renderTasksView();});
  document.getElementById('group-select')?.addEventListener('change',e=>{state.group=e.target.value;renderTasksView();});
  document.getElementById('search-input')?.addEventListener('input',e=>{state.search=e.target.value;renderTasksView();});

  // Calendar nav
  document.getElementById('cal-prev')?.addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);renderCalendar();});
  document.getElementById('cal-next')?.addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);renderCalendar();});
  document.getElementById('cal-today-btn')?.addEventListener('click',()=>{calendarDate=new Date();renderCalendar();});
  document.getElementById('cal-panel-close')?.addEventListener('click',()=>{const p=document.getElementById('cal-day-panel');if(p)p.hidden=true;});

  // Focus mode
  document.getElementById('focus-start-btn')?.addEventListener('click',()=>{ if(pom.running) pomPause(); else pomStart(); });
  document.getElementById('focus-reset-btn')?.addEventListener('click',()=>{ pomStop(); updatePomDisplay(); });
  document.querySelectorAll('.focus-mode-tab').forEach(tab=>{
    tab.addEventListener('click',()=>pomSetMode(tab.dataset.mode));
  });
  document.getElementById('focus-pick-task-btn')?.addEventListener('click',()=>{
    const ov=document.getElementById('focus-picker-overlay'); if(!ov) return;
    ov.hidden=false;
    renderFocusPickerList('');
  });
  document.getElementById('focus-picker-close')?.addEventListener('click',()=>{const ov=document.getElementById('focus-picker-overlay');if(ov) ov.hidden=true;});
  document.getElementById('focus-picker-search')?.addEventListener('input',e=>renderFocusPickerList(e.target.value));

  // Settings
  document.getElementById('dark-mode-toggle')?.addEventListener('change',e=>{
    state.darkMode=e.target.checked; applyDarkMode(state.darkMode); saveState(); firestoreSyncSettings();
    showToast(state.darkMode?'Tryb ciemny 🌙':'Tryb jasny ☀️','success');
  });
  document.getElementById('notifications-toggle')?.addEventListener('change',e=>{
    state.notifications=e.target.checked; saveState(); firestoreSyncSettings();
  });
  ['pomo-work','pomo-short','pomo-long'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change',e=>{
      const k=id.replace('pomo-',''); state.pomoDurations[k]=parseInt(e.target.value)||POM_MODES[k];
      saveState(); if(!pom.running) pomSetMode(pom.mode);
    });
  });
  document.getElementById('export-btn')?.addEventListener('click',async()=>{
    const btn=document.getElementById('export-btn'); btn.disabled=true; btn.textContent='Eksportowanie…';
    try{await exportDataAsync();showToast('Eksport JSON gotowy!','success');}catch{showToast('Błąd eksportu','error');}
    finally{btn.disabled=false;btn.textContent='Eksportuj JSON';}
  });
  document.getElementById('export-txt-btn')?.addEventListener('click',async()=>{
    const btn=document.getElementById('export-txt-btn'); btn.disabled=true; btn.textContent='Eksportowanie…';
    try{await exportTxtAsync();showToast('Eksport TXT gotowy!','success');}catch{showToast('Błąd eksportu','error');}
    finally{btn.disabled=false;btn.textContent='Eksportuj TXT';}
  });
  document.getElementById('clear-data-btn')?.addEventListener('click',()=>openConfirm('Wyczyść dane','Usunąć wszystkie zadania i projekty? Nie można cofnąć.',clearAll));
  document.getElementById('delete-account-btn')?.addEventListener('click',deleteAccount);
  document.getElementById('open-privacy-footer')?.addEventListener('click',showPrivacy);
  document.getElementById('privacy-close-btn')?.addEventListener('click',hidePrivacy);
  document.getElementById('privacy-accept-btn')?.addEventListener('click',hidePrivacy);
  document.getElementById('privacy-modal')?.addEventListener('click',e=>{if(e.target.id==='privacy-modal') hidePrivacy();});

  // Confirm modal cancel / backdrop
  document.getElementById('confirm-cancel')?.addEventListener('click',closeConfirm);
  document.getElementById('confirm-overlay')?.addEventListener('click',closeConfirm);

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click',()=>openConfirm('Wyloguj się','Czy na pewno chcesz się wylogować?',logout));

  // Keyboard shortcuts
  document.addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
    if(e.key==='Escape'){
      if(!document.getElementById('modal').hidden) closeEditModal();
      else if(!document.getElementById('add-modal').hidden) closeAddModal();
      else if(!document.getElementById('search-overlay').hidden) closeSearch();
      else if(!document.getElementById('focus-picker-overlay').hidden){ document.getElementById('focus-picker-overlay').hidden=true; }
      return;
    }
    if(e.key==='n'||e.key==='N') openAddModal();
    if(e.key==='/'){ e.preventDefault(); openSearch(); }
    if(e.key==='f'||e.key==='F') switchView('focus');
    if(e.key==='k'||e.key==='K') switchView('kanban');
    if(e.key==='d'||e.key==='D') switchView('dashboard');
  });
}

function renderFocusPickerList(q){
  const ul=document.getElementById('focus-picker-list'); if(!ul) return;
  const tasks=state.tasks.filter(t=>!t.done&&(q?t.name.toLowerCase().includes(q.toLowerCase()):true)).slice(0,12);
  ul.innerHTML='';
  if(!tasks.length){ ul.innerHTML='<li style="padding:.8rem;text-align:center;color:var(--text-3);font-size:.82rem">Brak zadań</li>'; return; }
  tasks.forEach(t=>{
    const li=document.createElement('li'); li.className=`focus-picker-item${pom.taskId===t.id?' active':''}`;
    li.innerHTML=`<div class="focus-picker-dot" style="background:${PRIORITY_COLOR[t.priority]}"></div><span class="focus-picker-name">${escHtml(t.name)}</span>`;
    li.addEventListener('click',()=>{
      pom.taskId=t.id;
      document.getElementById('focus-picker-overlay').hidden=true;
      renderFocusTask();
      showToast(`Focus: ${t.name}`,'success');
    });
    ul.appendChild(li);
  });
}

/* ── Legacy compat (called by Firestore listener) ─────────────── */
function renderTaskList(){ renderAll(); }
function renderStats(){ if(state.activeView==='analytics') renderAnalytics(); }

/* ── Init ────────────────────────────────────────────────────── */
let _authInit=false;

function init(){
  initFirebase(); setupAuthEvents(); setupAppEvents();
  // Initial pom setup
  pom.total=(state.pomoDurations.work||25)*60;

  if(!_auth){
    const g=localStorage.getItem('tf_guest_session');
    if(g){ try{state.currentUser=JSON.parse(g);onLoginSuccess(false);}catch{showAuth();} }
    else showAuth();
    return;
  }

  _auth.onAuthStateChanged(async fu=>{
    const isPageLoad=!_authInit; _authInit=true;
    if(fu){
      if(fu.providerData[0]?.providerId==='password'&&!fu.emailVerified){ showEmailVerification(fu.email,'login'); return; }
      state.currentUser=mapFirebaseUser(fu);
      await onLoginSuccess(!isPageLoad);
    } else {
      hideEmailVerification();
      const g=localStorage.getItem('tf_guest_session');
      if(g){ try{state.currentUser=JSON.parse(g);await onLoginSuccess(!isPageLoad);return;}catch{} }
      state.currentUser=null; state.tasks=[]; showAuth();
    }
  });
}

document.addEventListener('DOMContentLoaded',init);
