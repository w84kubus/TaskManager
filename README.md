# TaskManager

Aplikacja webowa do zarządzania zadaniami — dodawaj, edytuj, filtruj i śledź postęp swoich zadań. Dane synchronizują się w czasie rzeczywistym między wszystkimi urządzeniami.

## Demo

🌐 **https://w84kubus.github.io/TaskManager/**

---

## Funkcjonalności

### 🔐 Logowanie i konto (Firebase Auth)
- **Google** — logowanie przez popup Google OAuth
- **E-mail / hasło** — rejestracja z walidacją + zapis w Firebase Auth
- **Weryfikacja e-mail** — link weryfikacyjny przy rejestracji; bez potwierdzenia brak dostępu
- **Reset hasła** — „Zapomniałem hasła?" wysyła link resetujący na e-mail
- Sesja persystuje po zamknięciu/odświeżeniu strony
- Dane izolowane per-konto (`request.auth.uid == userId`)
- Tryb gościa — dostęp lokalny bez zakładania konta

### ☁️ Synchronizacja w chmurze (Firebase Firestore)
- Synchronizacja zadań w **czasie rzeczywistym** (`onSnapshot`)
- Każde zadanie = osobny dokument (brak konfliktów przy równoczesnym zapisie)
- Dark mode i powiadomienia synchronizowane między urządzeniami
- Komunikaty błędów przy problemach z uprawnieniami

### 📋 3 widoki aplikacji
- **Zadania** — dodawanie, edycja, usuwanie, oznaczanie jako ukończone
- **Statystyki** — karty podsumowujące + wykresy słupkowe (kategorie, priorytety)
- **Ustawienia** — dark mode, powiadomienia, eksport JSON/TXT, wyczyść dane, usuń konto

### 🎛️ Interaktywność
- Filtrowanie (wszystkie / aktywne / ukończone) + wyszukiwanie live
- Sortowanie (data, priorytet, alfabet)
- Dark mode z zapisem w Firestore (sync) i localStorage (fallback)
- Modal edycji zadania, modal potwierdzenia zamiast natywnego `confirm()`
- Toast notifications z auto-hide

### 📤 Eksport danych
- **JSON** — pełna kopia zapasowa z metadanymi
- **TXT** — czytelna lista zadań z formatowaniem

### ⚖️ Zgodność z RODO (GDPR)
- **Polityka Prywatności** — pełna treść dostępna w stopce i przy rejestracji (9 sekcji: administrator, dane, cel, podstawa prawna, Firebase/Google jako procesor, retencja, prawa użytkownika, localStorage, bezpieczeństwo)
- **Zgoda przy rejestracji** — obowiązkowy checkbox z linkiem do polityki
- **Usuń konto** — trwałe usunięcie konta Firebase Auth + wszystkich danych Firestore + localStorage (prawo do bycia zapomnianym, art. 17 RODO)
- **Eksport danych** — JSON/TXT jako realizacja prawa do przenoszenia danych

### 📱 Mobile i PWA-ready
- Własna ikona SVG (favicon + apple-touch-icon)
- `meta theme-color` — kolor paska systemowego iOS/Android, aktualizowany przy dark mode
- `viewport-fit=cover` + `env(safe-area-inset-*)` — obsługa notcha / Dynamic Island
- `apple-mobile-web-app-capable` — dodawanie do ekranu głównego
- Na ≤480px (iPhone): nawigacja emoji-only, kompaktowy header, boczne safe-area paddingi
- Sticky footer — zawsze przyklejony do dołu ekranu

---

## Technologie

| Wymaganie | Realizacja |
|---|---|
| HTML5 semantyczny | `<header>`, `<nav>`, `<main>`, `<section>` ×3, `<footer>` |
| Atrybuty dostępności | 60+ `aria-*`, `role`, `alt` |
| Własne CSS (bez frameworków) | 1000+ linii czystego CSS |
| Flexbox ×3 | header-inner, form-row, task-item |
| CSS Grid ×2 | stats-grid (4 kol.), settings-grid (2 kol.) |
| Media queries ×2 | 768px (tablet), 480px (mobile) |
| Transitions / animations ×3+ | logo hover, przyciski, slideIn, fadeUp, modalPop, toast |
| CSS Variables | 40+ zmiennych (light + dark) + `safe-area env()` |
| Firebase Auth | email + Google OAuth + weryfikacja + reset hasła |
| Firebase Firestore | real-time sync, per-task subcollection |
| Bezpieczne reguły Firestore | `request.auth.uid == userId` |
| DOM manipulation | `createElement`, `innerHTML`, `appendChild` |
| Event listeners ×4 typy | `click`, `submit`, `input`, `scroll` |
| Walidacja RegExp | `/^[\p{L}\p{N}\s\-.,!?()]{2,120}$/u` |
| `event.preventDefault()` | ×3 (formularze, nawigacja) |
| `localStorage` | fallback offline + dark mode per-device |
| Async (`setTimeout` / `Promise`) | toast, eksport JSON/TXT, usuwanie konta |

---

## Struktura plików

```
Task Manager/
├── index.html            # Główna strona HTML
├── favicon.svg           # Ikona aplikacji (SVG)
├── styles/
│   └── style.css         # Arkusz stylów (1000+ linii)
├── scripts/
│   └── app.js            # Logika aplikacji
└── README.md
```

---

## Uruchomienie

Otwórz **https://w84kubus.github.io/TaskManager/** w przeglądarce.

Lub lokalnie:
```bash
# Node.js
npx serve .

# Python
python -m http.server 3000
```

---

## Konfiguracja Firebase

### Reguły Firestore (Firebase Console → Firestore → Rules)
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

### Autoryzowane domeny (Authentication → Settings → Authorized domains)
- `localhost`
- `w84kubus.github.io`

### Włączone metody logowania (Authentication → Sign-in method)
- Email/Password ✅
- Google ✅

### Szablony e-mail (Authentication → Templates)
| Szablon | Subject |
|---|---|
| Email address verification | `Potwierdź swój adres e-mail – TaskManager` |
| Password reset | `Zresetuj hasło – TaskManager` |

---

## Testy

| Przeglądarka / scenariusz | Status |
|---|---|
| Chrome (desktop) | ✅ |
| Firefox (desktop) | ✅ |
| Safari iOS (iPhone) | ✅ |
| iPhone 16 Pro — mobile header | ✅ |
| Responsywność ≤480px | ✅ |
| Responsywność ≤768px | ✅ |
| Responsywność desktop | ✅ |
| Sync real-time (Firestore) | ✅ |
| Rejestracja + weryfikacja e-mail | ✅ |
| Logowanie Google OAuth | ✅ |
| Reset hasła | ✅ |
| Usunięcie konta (RODO) | ✅ |
| Dark mode sync między urządzeniami | ✅ |
| Eksport JSON / TXT | ✅ |
| Tryb gościa (localStorage) | ✅ |
| Konsola — 0 błędów | ✅ |

---

## Autorzy

Projekt zespołowy — szczegóły w historii commitów.
