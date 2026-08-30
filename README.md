<p align="center">
  <img src="favicon.svg" width="96" height="96" alt="TaskManager logo" />
</p>

<h1 align="center">TaskManager</h1>

<p align="center">
  A focused task manager — add, filter and track your tasks in real time.
  <br />
  🇬🇧 <strong>English</strong> · <a href="README.pl.md">🇵🇱 Czytaj po polsku</a>
  <br />
  <a href="https://w84kubus.github.io/TaskManager/"><strong>🌐 w84kubus.github.io/TaskManager</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript ES6+" />
  <img src="https://img.shields.io/badge/Firebase-Auth+Firestore-FFCA28?logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/i18n-PL%2FEN-22C55E" alt="i18n PL/EN" />
  <img src="https://img.shields.io/badge/GDPR-compliant-22C55E" alt="GDPR compliant" />
</p>

---

## About the app

**TaskManager** is a task management web app built to stay out of your way — no framework, no build step, just a fast list you can trust. It answers four questions the moment you open it:

1. 📋 **What do I need to do today?**
2. 🎯 **What's most urgent right now?**
3. ✅ **What have I already finished?**
4. 📊 **How is my progress trending?**

Everything is entered by hand and synced in real time — no calendar imports, no auto-scheduling. A task you deliberately typed in is a task you're more likely to actually do.

## Screenshots

| Sign in | Task list |
|---------|-----------|
| ![Sign in](screenshots/screen-1.png) | ![Tasks](screenshots/screen-2.png) |

| Statistics | Settings |
|------------|----------|
| ![Statistics](screenshots/screen-3.png) | ![Settings](screenshots/screen-4.png) |

## Features

### Sign-in and account
- **Google** - sign-in via Google OAuth popup
- **Email / password** - registration with validation, stored in Firebase Auth
- **Email verification** - verification link sent on registration; no access without confirmation
- **Password reset** - "Forgot your password?" sends a reset link by email
- **Guest mode** - local access with no account required, data stays in the browser

### Cloud sync
- **Real-time** task synchronization (`onSnapshot`)
- Each task is its own Firestore document - no conflicts on concurrent writes
- Dark mode and notification preferences synced across devices
- Data isolated per account (`request.auth.uid == userId`)

### Tasks
- Add, edit, delete, mark as done - active tasks always shown above completed ones
- Filtering (all / active / done) + live search
- Sorting by date, priority, or alphabetically
- Confirmation modal replacing the native `confirm()`

### Statistics
- Summary cards - total, active, completed, completion rate
- Bar charts by category and by priority

### Bilingual interface (PL/EN)
- Language toggle in the header and on the sign-in screen
- The entire interface is translated, including the Privacy Policy
- Language choice remembered in `localStorage`

### Data export
- **JSON** - full backup with metadata
- **TXT** - readable, formatted task list, in the selected language

### GDPR compliance
- Full Privacy Policy in the footer and at registration (9 sections)
- Mandatory consent checkbox at registration
- **Delete account** - permanently removes the Firebase Auth account and all Firestore data
- Data export as the right to portability

### Mobile
- iOS safe-area support (notch / Dynamic Island)
- `apple-mobile-web-app-capable` for adding to the home screen
- Compact, icon-only navigation on small screens

## Tech stack

| Layer | Technology |
|---|---|
| Markup | Semantic HTML5 |
| Styling | Hand-written CSS (no framework) - CSS variables, Flexbox, Grid |
| Logic | Vanilla JavaScript (ES6+), no build step |
| Auth | Firebase Authentication (email + Google OAuth) |
| Database | Cloud Firestore (real-time sync) |
| i18n | Custom translation system (`data-i18n`, JS dictionary) |
| Icons | [Phosphor Icons](https://phosphoricons.com/) (MIT), inlined as a local SVG sprite |
| Fonts | Fraunces (display), Instrument Sans (UI) |
| Hosting | GitHub Pages |

## Architecture

```
TaskManager/
├── index.html          # Markup, SVG icon sprite, all views and modals
├── favicon.svg          # App icon
├── styles/
│   └── style.css        # Full stylesheet (theming, layout, components)
├── scripts/
│   └── app.js             # App state, Firebase, rendering, i18n dictionary
├── screenshots/            # README screenshots
├── README.md                # This file
└── README.pl.md               # Polish version
```

### Key design decisions

- **No framework, no build step** - plain HTML/CSS/JS deployed straight to GitHub Pages. Nothing to compile, nothing to break.
- **One task = one Firestore document** - avoids write conflicts and keeps sync simple; `onSnapshot` handles the rest.
- **Offline-first reads** - `localStorage` is read first on load, then reconciled with Firestore once it responds.
- **i18n via attributes, not a library** - `data-i18n` / `data-i18n-placeholder` / `data-i18n-html` on elements, applied in one pass by `applyLanguage()`; zero dependencies.
- **Nuclear border-radius reset** - every element is squared off by default (`* { border-radius: 0 }`), with two deliberate exceptions (the toggle switch, avatars) for a sharp "notebook" look.

## Running it locally

### Requirements
- Any modern browser
- A Firebase project with Authentication (email/password + Google) and Firestore enabled

### Setup
```bash
git clone https://github.com/w84kubus/TaskManager.git
cd TaskManager
```

Open `index.html` directly, or serve it locally:
```bash
# Node.js
npx serve .

# Python
python -m http.server 3000
```

Firebase config lives directly in `scripts/app.js` (`FIREBASE_CONFIG`) - swap in your own project's keys to run it against your own backend.

### Firestore rules
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

### Authorized domains
- `localhost`
- `w84kubus.github.io`

## Testing

| Scenario | Status |
|---|---|
| Chrome / Firefox / Safari (desktop) | ✅ |
| Safari iOS | ✅ |
| Responsive ≤480px / ≤768px / desktop | ✅ |
| Real-time sync (Firestore) | ✅ |
| Registration + email verification | ✅ |
| Google OAuth sign-in | ✅ |
| Account deletion (GDPR) | ✅ |
| PL/EN language switching | ✅ |
| Console — 0 errors | ✅ |

## License

Personal project. Source code public for educational purposes.

## Author

Created and maintained by [w84kubus](https://github.com/w84kubus).
