# TaskManager

🇬🇧 **English** · [🇵🇱 Czytaj po polsku](README.pl.md)

A web app for managing tasks — add, edit, filter and track the progress of your tasks. Data syncs in real time across all your devices.

## App

🌐 **https://w84kubus.github.io/TaskManager/**

---

## Screenshots

| Sign in | Task list |
|---------|-----------|
| ![Sign in](screenshots/screen-1.png) | ![Tasks](screenshots/screen-2.png) |

| Statistics | Settings |
|------------|----------|
| ![Statistics](screenshots/screen-3.png) | ![Settings](screenshots/screen-4.png) |

---

## Features

### 🔐 Sign-in and account (Firebase Auth)
- **Google** — sign-in via Google OAuth popup
- **Email / password** — registration with validation, stored in Firebase Auth
- **Email verification** — verification link sent on registration; no access without confirmation
- **Password reset** — "Forgot your password?" sends a reset link by email
- Session persists across page reloads/closures
- Data isolated per account (`request.auth.uid == userId`)
- Guest mode — local access with no account required

### ☁️ Cloud sync (Firebase Firestore)
- **Real-time** task synchronization (`onSnapshot`)
- Each task is its own document (no conflicts on concurrent writes)
- Dark mode and notification preferences synced across devices
- Error messages surfaced on permission issues

### 📋 3 app views
- **Tasks** — add, edit, delete, mark as done (active tasks always shown above completed ones)
- **Statistics** — summary cards + bar charts (by category, by priority)
- **Settings** — dark mode, notifications, JSON/TXT export, clear data, delete account

### 🎛️ Interactivity
- Filtering (all / active / done) + live search
- Sorting (date, priority, alphabetical)
- Dark mode saved to Firestore (sync) and localStorage (fallback)
- Task edit modal, confirmation modal replacing the native `confirm()`
- Toast notifications with auto-hide

### 🌐 Bilingual interface (PL/EN)
- Language toggle button in the app header and on the sign-in screen
- The entire interface is translated: forms, buttons, messages, statistics, settings, Privacy Policy
- Language choice remembered in `localStorage`

### 📤 Data export
- **JSON** — full backup with metadata
- **TXT** — readable, formatted task list (adapted to the selected language)

### ⚖️ GDPR compliance
- **Privacy Policy** — full text available in the footer and at registration (9 sections: controller, data collected, purpose, legal basis, Firebase/Google as processor, retention, user rights, localStorage, security)
- **Consent at registration** — mandatory checkbox linking to the policy
- **Delete account** — permanently removes the Firebase Auth account + all Firestore data + localStorage (right to be forgotten, GDPR Art. 17)
- **Data export** — JSON/TXT fulfilling the right to data portability

### 📱 Mobile and PWA-ready
- Custom SVG icon (favicon + apple-touch-icon)
- `meta theme-color` — system status bar color on iOS/Android, updated with dark mode
- `viewport-fit=cover` + `env(safe-area-inset-*)` — notch / Dynamic Island support
- `apple-mobile-web-app-capable` — add to home screen
- At ≤480px (iPhone): emoji-only navigation, compact header, side safe-area padding
- Sticky footer — always pinned to the bottom of the screen

---

## Tech stack

| Requirement | Implementation |
|---|---|
| Semantic HTML5 | `<header>`, `<nav>`, `<main>`, `<section>` ×3, `<footer>` |
| Accessibility attributes | 60+ `aria-*`, `role`, `alt` |
| Hand-written CSS (no frameworks) | 1000+ lines of plain CSS |
| Flexbox ×3 | header-inner, form-row, task-item |
| CSS Grid ×2 | stats-grid (4 col.), settings-grid (2 col.) |
| Media queries ×2 | 768px (tablet), 480px (mobile) |
| Transitions / animations ×3+ | logo hover, buttons, slideIn, fadeUp, modalPop, toast |
| CSS variables | 40+ variables (light + dark) + `safe-area env()` |
| i18n (PL/EN) | custom translation system (`data-i18n`, JS dictionary) |
| Icons | [Phosphor Icons](https://phosphoricons.com/) (MIT), inlined as a local SVG sprite — no external requests |
| Firebase Auth | email + Google OAuth + verification + password reset |
| Firebase Firestore | real-time sync, per-task subcollection |
| Secure Firestore rules | `request.auth.uid == userId` |
| DOM manipulation | `createElement`, `innerHTML`, `appendChild` |
| Event listeners ×4 types | `click`, `submit`, `input`, `scroll` |
| RegExp validation | `/^[\p{L}\p{N}\s\-.,!?()]{2,120}$/u` |
| `event.preventDefault()` | ×3 (forms, navigation) |
| `localStorage` | offline fallback + per-device dark mode + language preference |
| Async (`setTimeout` / `Promise`) | toasts, JSON/TXT export, account deletion |

---

## File structure

```
Task Manager/
├── index.html            # Main HTML page
├── favicon.svg           # App icon (SVG)
├── styles/
│   └── style.css         # Stylesheet (1000+ lines)
├── scripts/
│   └── app.js            # App logic + i18n dictionary
├── README.md              # README (English)
└── README.pl.md           # README (Polish)
```

---

## Running it

Open **https://w84kubus.github.io/TaskManager/** in your browser.

Or run it locally:
```bash
# Node.js
npx serve .

# Python
python -m http.server 3000
```

---

## Firebase configuration

### Firestore rules (Firebase Console → Firestore → Rules)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Authorized domains (Authentication → Settings → Authorized domains)
- `localhost`
- `w84kubus.github.io`

### Enabled sign-in methods (Authentication → Sign-in method)
- Email/Password ✅
- Google ✅

### Email templates (Authentication → Templates)
| Template | Subject |
|---|---|
| Email address verification | `Potwierdź swój adres e-mail – TaskManager` |
| Password reset | `Zresetuj hasło – TaskManager` |

---

## Testing

| Browser / scenario | Status |
|---|---|
| Chrome (desktop) | ✅ |
| Firefox (desktop) | ✅ |
| Safari iOS (iPhone) | ✅ |
| iPhone 16 Pro — mobile header | ✅ |
| Responsive ≤480px | ✅ |
| Responsive ≤768px | ✅ |
| Responsive desktop | ✅ |
| Real-time sync (Firestore) | ✅ |
| Registration + email verification | ✅ |
| Google OAuth sign-in | ✅ |
| Password reset | ✅ |
| Account deletion (GDPR) | ✅ |
| Dark mode sync across devices | ✅ |
| JSON / TXT export | ✅ |
| Guest mode (localStorage) | ✅ |
| PL/EN language switching | ✅ |
| Console — 0 errors | ✅ |

---

## Author

**Jakub Bondel** — creator and maintainer of TaskManager.

[![GitHub](https://img.shields.io/badge/GitHub-w84kubus-181717?logo=github&logoColor=white)](https://github.com/w84kubus)
