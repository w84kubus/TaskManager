# TaskManager

Aplikacja webowa do zarządzania zadaniami — dodawaj, edytuj, filtruj i śledź postęp swoich zadań. Dane synchronizują się w czasie rzeczywistym między wszystkimi urządzeniami.

## Demo

🌐 **https://w84kubus.github.io/TaskManager/**

## Funkcjonalności

### Logowanie / Rejestracja (Firebase Auth)
- **Google** — logowanie przez oficjalne popup Google OAuth (Firebase Authentication)
- **E-mail** — rejestracja i logowanie z walidacją + zapis w Firebase Auth
- **Weryfikacja e-mail** — link weryfikacyjny przy rejestracji; bez potwierdzenia brak dostępu do aplikacji
- **Reset hasła** — „Zapomniałem hasła?" wysyła link resetujący na podany adres e-mail
- Konto online — zaloguj się z dowolnego urządzenia, zadania zawsze aktualne
- Sesja persystuje po zamknięciu/odświeżeniu strony (Firebase Auth state)
- Dane zadań izolowane per-konto (każdy użytkownik widzi tylko swoje)
- Własny modal potwierdzenia zamiast natywnego `confirm()`
- Tryb gościa — lokalny dostęp bez zakładania konta

### Synchronizacja w chmurze (Firebase Firestore)
- Synchronizacja zadań w **czasie rzeczywistym** (`onSnapshot` listener)
- Każde zadanie = osobny dokument Firestore (brak konfliktów przy równoczesnym zapisie)
- Dark mode i powiadomienia synchronizowane między urządzeniami
- Widoczne komunikaty przy problemach z uprawnieniami Firestore

### 3 widoki
- **Zadania** — dodawanie, edycja, usuwanie, oznaczanie jako ukończone
- **Statystyki** — karty podsumowujące + wykresy słupkowe (kategorie, priorytety)
- **Ustawienia** — dark mode, powiadomienia toast, eksport JSON, eksport TXT, czyszczenie danych

### Interaktywność
- Dynamiczne dodawanie i usuwanie elementów DOM (z animacją)
- Filtrowanie (wszystkie / aktywne / ukończone) + wyszukiwanie live
- Sortowanie (data, priorytet, alfabet)
- Dark mode z zapisem w Firestore (synced) i localStorage (fallback)
- Modal edycji zadania
- Toast notifications

### Eksport danych
- **JSON** — pełna kopia zapasowa z metadanymi
- **TXT** — czytelna lista zadań z formatowaniem

### Ikona i PWA-ready
- Własna ikona SVG (favicon + apple-touch-icon)
- `meta theme-color` — dostosowany kolor paska systemowego iOS/Android
- `viewport-fit=cover` — obsługa notcha / Dynamic Island iPhone (safe-area-inset)
- `apple-mobile-web-app-capable` — możliwość dodania do ekranu głównego
- Mobile header: emoji-only nawigacja na ≤480px (iPhone), boczne safe-area paddingi

### Technologie

| Wymaganie | Realizacja |
|---|---|
| HTML5 semantyczny | `<header>`, `<nav>`, `<main>`, `<section>` ×3, `<footer>` |
| Atrybuty dostępności | 59× `aria-*`, `role`, `alt` |
| Własne CSS (bez frameworków) | 950+ linii czystego CSS |
| Flexbox ×3 | header-inner, form-row, task-item |
| CSS Grid ×2 | stats-grid (4 kol.), settings-grid (2 kol.) |
| Media queries ×2 | 768px (tablet), 480px (mobile) |
| Transitions / animations ×3+ | logo hover, przyciski, slideIn, fadeUp, modalPop, toast |
| CSS Variables | 40+ zmiennych (light + dark) + safe-area env() |
| Firebase Auth | rejestracja + login e-mail + Google OAuth + weryfikacja e-mail + reset hasła |
| Firebase Firestore | real-time sync, per-task subcollection |
| Bezpieczne reguły Firestore | `request.auth.uid == userId` |
| DOM manipulation | createElement, innerHTML, appendChild |
| Event listeners ×4 typy | `click`, `submit`, `input`, `scroll` |
| Walidacja RegExp | `/^[\p{L}\p{N}\s\-.,!?()]{2,120}$/u` |
| `event.preventDefault()` | ×3 (formularze, nawigacja) |
| `localStorage` | fallback offline + dark mode per-device |
| Async (setTimeout / Promise) | toast auto-hide, eksport JSON/TXT |

## Struktura plików

```
Task Manager/
├── index.html            # Główna strona HTML
├── favicon.svg           # Ikona aplikacji (SVG)
├── styles/
│   └── style.css         # Arkusz stylów
├── scripts/
│   └── app.js            # Logika aplikacji
└── README.md
```

## Uruchomienie

Otwórz **https://w84kubus.github.io/TaskManager/** w przeglądarce.

Lub lokalnie:
```bash
# Node.js
npx serve .

# Python
python -m http.server 3000
```

## Konfiguracja Firebase

### Reguły Firestore (Firebase Console → Firestore → Rules):
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

### Autoryzowane domeny (Firebase Console → Authentication → Settings → Authorized domains):
- `localhost`
- `w84kubus.github.io`

### Włączone metody logowania (Firebase Console → Authentication → Sign-in method):
- Email/Password ✅
- Google ✅

### Szablon e-mail weryfikacyjnego (Firebase Console → Authentication → Templates → Email address verification):
- Subject: `Potwierdź swój adres e-mail – TaskManager`
- Sender name: `TaskManager`

## Testowanie

| Przeglądarka / urządzenie | Status |
|---|---|
| Chrome | ✅ |
| Firefox | ✅ |
| Safari iOS (iPhone) | ✅ |
| iPhone 16 Pro (mobile header) | ✅ |
| Konsola (0 błędów) | ✅ |
| Responsywność mobile (≤480px) | ✅ |
| Responsywność tablet (≤768px) | ✅ |
| Responsywność desktop | ✅ |
| Sync real-time | ✅ |
| Weryfikacja e-mail | ✅ |
| Reset hasła | ✅ |

## Autorzy

Projekt zespołowy — szczegóły w historii commitów.
