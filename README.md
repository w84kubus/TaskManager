# TaskManager

Aplikacja webowa do zarządzania zadaniami — dodawaj, edytuj, filtruj i śledź postęp swoich zadań.

## Demo

Otwórz `index.html` w przeglądarce (Chrome / Firefox) lub uruchom lokalny serwer.

## Funkcjonalności

### Logowanie / Rejestracja
- **Google** — symulowany OAuth (frontend demo; w produkcji: Google Identity Services)
- **Apple** — symulowany OAuth (frontend demo; w produkcji: Sign in with Apple)
- **E-mail** — pełna rejestracja i logowanie z walidacją RegExp + zapis w `localStorage`
- Sesja persystuje po zamknięciu/odświeżeniu strony
- Dane zadań izolowane per-konto (każdy użytkownik widzi tylko swoje)
- Własny modal potwierdzenia zamiast natywnego `confirm()`

### 3 widoki
- **Zadania** — dodawanie, edycja, usuwanie, oznaczanie jako ukończone
- **Statystyki** — karty podsumowujące + wykresy słupkowe (kategorie, priorytety)
- **Ustawienia** — dark mode, powiadomienia toast, eksport JSON, czyszczenie danych

### Interaktywność
- Dynamiczne dodawanie i usuwanie elementów DOM (z animacją)
- Filtrowanie (wszystkie / aktywne / ukończone) + wyszukiwanie live
- Sortowanie (data, priorytet, alfabet)
- Dark mode z zapisem w `localStorage`
- Modal edycji zadania
- Toast notifications

### Technologie

| Wymaganie | Realizacja |
|---|---|
| HTML5 semantyczny | `<header>`, `<nav>`, `<main>`, `<section>` ×3, `<footer>` |
| Atrybuty dostępności | 59× `aria-*`, `role`, `alt` |
| Własne CSS (bez frameworków) | 903 linii czystego CSS |
| Flexbox ×3 | header-inner, form-row, task-item |
| CSS Grid ×2 | stats-grid (4 kol.), settings-grid (2 kol.) |
| Media queries ×2 | 768px (tablet), 480px (mobile) |
| Transitions / animations ×3+ | logo hover, przyciski, slideIn, fadeUp, modalPop, toast |
| CSS Variables | 40+ zmiennych (light + dark) |
| Auth system | rejestracja + login e-mail, Google, Apple (frontend demo) |
| Per-user storage | dane izolowane kluczem `tm_{email}_{key}` |
| Session persistence | `tm_session` w localStorage, auto-login po reload |
| Confirm modal | własny `openConfirm()` zamiast natywnego `confirm()` |
| DOM manipulation | createElement, innerHTML, appendChild |
| Event listeners ×4 typy | `click`, `submit`, `input`, `scroll` |
| Walidacja RegExp | `/^[\p{L}\p{N}\s\-.,!?()]{2,120}$/u` |
| `event.preventDefault()` | ×3 (formularze, nawigacja) |
| `localStorage` | zapis/odczyt zadań + ustawień |
| Async (setTimeout / Promise) | toast auto-hide, eksport JSON |

## Struktura plików

```
Task Manager/
├── index.html            # Główna strona HTML
├── styles/
│   └── style.css         # Arkusz stylów
├── scripts/
│   └── app.js            # Logika aplikacji
└── README.md
```

## Uruchomienie

1. Sklonuj repozytorium
2. Otwórz `index.html` w przeglądarce

Lub z serwerem lokalnym:
```bash
# Node.js
npx serve .

# Python
python -m http.server 3000
```

## Testowanie

| Przeglądarka | Status |
|---|---|
| Chrome | ✅ |
| Firefox | ✅ |
| Konsola (0 błędów) | ✅ |
| Responsywność mobile | ✅ |
| Responsywność tablet | ✅ |
| Responsywność desktop | ✅ |

## Autorzy

Projekt zespołowy — szczegóły w historii commitów.
