'use strict';

/* ============================================================
   STAŁE / SŁOWNIKI
   ============================================================ */
/* ── Priorytety i kategorie definiowane przez użytkownika ─────
   Wbudowane pozycje mają stałe id (zgodne z zadaniami zapisanymi wcześniej),
   własne dostają id typu „c_…". Kolejność na liście = ranga (pierwszy = najwyższy priorytet). */
const PRIORITY_COLORS = ['red', 'orange', 'amber', 'green', 'teal', 'blue', 'plum', 'gray'];

const CATEGORY_ICONS = [
  'icon-user', 'icon-briefcase', 'icon-shopping-cart', 'icon-heart', 'icon-package',
  'icon-house', 'icon-book-open', 'icon-graduation-cap', 'icon-airplane', 'icon-car',
  'icon-wallet', 'icon-fork-knife', 'icon-barbell', 'icon-music', 'icon-game',
  'icon-wrench', 'icon-paw', 'icon-star', 'icon-lightbulb', 'icon-code',
];

const DEFAULT_PRIORITIES = [
  { id: 'high',   color: 'red'   },
  { id: 'medium', color: 'amber' },
  { id: 'low',    color: 'green' },
];

const DEFAULT_CATEGORIES = [
  { id: 'personal', icon: 'icon-user'          },
  { id: 'work',     icon: 'icon-briefcase'     },
  { id: 'shopping', icon: 'icon-shopping-cart' },
  { id: 'health',   icon: 'icon-heart'         },
  { id: 'other',    icon: 'icon-package'       },
];

// kind → konfiguracja wspólna dla obu list (jeden kod obsługuje priorytety i kategorie)
const LIST_KIND = {
  priorities: {
    prefix: 'priority', field: 'color', choices: PRIORITY_COLORS, defaults: DEFAULT_PRIORITIES,
    max: 8,  taskKey: 'priority', labelDict: 'priorityLabel',
  },
  categories: {
    prefix: 'category', field: 'icon',  choices: CATEGORY_ICONS,  defaults: DEFAULT_CATEGORIES,
    max: 20, taskKey: 'category', labelDict: 'categoryLabel',
  },
};

const LIST_ID_RE   = /^[A-Za-z0-9_-]{1,40}$/;
const LIST_NAME_RE = /^[\p{L}\p{N} \-.,!?()&/+]{2,24}$/u;

/* ============================================================
   I18N — TŁUMACZENIA (PL / EN)
   ============================================================ */
const LANG_STORAGE_KEY = 'tm_lang';
const LOCALE_MAP = { pl: 'pl-PL', en: 'en-US' };

const I18N = {
  pl: {
    meta: {
      title: 'TaskManager – Twoje zadania',
      description: 'TaskManager – aplikacja do zarządzania zadaniami. Dodawaj, filtruj i śledź postęp swoich zadań.',
    },
    priorityLabel: { low: 'Niski', medium: 'Średni', high: 'Wysoki' },
    categoryLabel: {
      personal: 'Osobiste', work: 'Praca', shopping: 'Zakupy',
      health: 'Zdrowie', other: 'Inne',
    },
    auth: {
      subtitle: 'Zaloguj się, aby zarządzać swoimi zadaniami',
      tabLogin: 'Logowanie',
      tabRegister: 'Rejestracja',
      googleLogin: 'Kontynuuj z Google',
      googleRegister: 'Zarejestruj przez Google',
      dividerLogin: 'lub zaloguj się e-mailem',
      dividerRegister: 'lub utwórz konto e-mailem',
      emailLabel: 'Adres e-mail',
      emailPlaceholder: 'twoj@email.pl',
      passwordLabel: 'Hasło',
      passwordPlaceholder: 'Wpisz hasło',
      registerPasswordPlaceholder: 'Min. 6 znaków, 1 cyfra, 1 wielka litera',
      loginSubmit: 'Zaloguj się',
      loginSubmitting: 'Logowanie…',
      registerSubmit: 'Utwórz konto',
      registerSubmitting: 'Rejestracja…',
      forgotLink: 'Zapomniałem hasła?',
      nameLabel: 'Imię',
      namePlaceholder: 'Twoje imię',
      consentPrefix: 'Akceptuję',
      privacyPolicyLink: 'Politykę Prywatności',
      consentSuffix: 'i wyrażam zgodę na przetwarzanie danych osobowych.',
      forgotDesc: 'Podaj adres e-mail powiązany z kontem — wyślemy Ci link do ustawienia nowego hasła.',
      forgotSubtitle: 'Zresetuj swoje hasło',
      forgotSubmit: 'Wyślij link resetujący',
      forgotSubmitting: 'Wysyłanie…',
      forgotBack: '← Wróć do logowania',
      or: 'lub',
      guestBtn: 'Kontynuuj bez logowania →',
      guestBtnAria: 'Kontynuuj bez logowania jako gość',
      googleLoginAria: 'Zaloguj się przez Google',
      googleRegisterAria: 'Zarejestruj się przez Google',
      langToggleAria: 'Przełącz język na angielski',
    },
    verify: {
      step1: 'Otwórz skrzynkę e-mail',
      step2: 'Kliknij link weryfikacyjny od TaskManager',
      step3: 'Wróć tutaj i naciśnij przycisk poniżej',
      hintHtml: 'Nie widzisz wiadomości? Sprawdź folder <strong>Spam / Oferty / Powiadomienia</strong>.',
      checkBtn: 'Potwierdziłem — zaloguj mnie',
      checkBtnChecking: 'Sprawdzam…',
      resendBtn: 'Wyślij link ponownie',
      resendBtnSending: 'Wysyłanie…',
      backBtn: 'Użyj innego konta',
      blockedTitle: 'Weryfikacja wymagana',
      blockedDescHtml: 'Twoje konto nie zostało jeszcze potwierdzone.<br>Kliknij link weryfikacyjny w wiadomości wysłanej na<br><strong>{email}</strong>',
      freshTitle: 'Potwierdź adres e-mail',
      freshDescHtml: 'Wysłaliśmy link weryfikacyjny na<br><strong>{email}</strong>',
    },
    nav: { tasks: 'Zadania', stats: 'Statystyki', settings: 'Ustawienia' },
    userMenu: { logoutAria: 'Wyloguj się', logoutTitle: 'Wyloguj', guestMode: 'Tryb gościa' },
    guestBanner: {
      textHtml: 'Korzystasz jako <strong>Gość</strong> — zadania są zapisane tylko lokalnie w tej przeglądarce.',
      loginBtn: 'Zaloguj się / Zarejestruj',
      closeAria: 'Zamknij powiadomienie',
    },
    tasks: {
      title: 'Moje zadania',
      subtitle: 'Organizuj i śledź postęp swoich zadań',
      nameLabel: 'Nazwa zadania',
      namePlaceholder: 'Wpisz nazwę zadania (min. 2 znaki)…',
      priorityLabel: 'Priorytet',
      categoryLabel: 'Kategoria',
      addBtn: 'Dodaj zadanie',
      filterAll: 'Wszystkie',
      filterActive: 'Aktywne',
      filterDone: 'Ukończone',
      searchPlaceholder: 'Szukaj zadania…',
      filterPriorityAria: 'Filtruj według priorytetu',
      filterCategoryAria: 'Filtruj według kategorii',
      allPriorities: 'Wszystkie priorytety',
      allCategories: 'Wszystkie kategorie',
      sortDateDesc: 'Najnowsze',
      sortDateAsc: 'Najstarsze',
      sortPriorityHigh: 'Priorytet ↑',
      sortPriorityLow: 'Priorytet ↓',
      sortAlphaAsc: 'A → Z',
      sortAlphaDesc: 'Z → A',
      emptyTitle: 'Brak zadań do wyświetlenia',
      emptyHint: 'Dodaj pierwsze zadanie powyżej lub zmień filtry',
      toggleToDone: 'Oznacz jako ukończone',
      toggleToActive: 'Oznacz jako aktywne',
      titleDone: 'Cofnij',
      titleUndone: 'Ukończ',
      editAria: 'Edytuj zadanie: {name}',
      deleteAria: 'Usuń zadanie: {name}',
      editTitle: 'Edytuj',
      deleteTitle: 'Usuń',
    },
    stats: {
      title: 'Statystyki', subtitle: 'Przegląd Twoich postępów',
      total: 'Wszystkich zadań', active: 'Aktywnych', done: 'Ukończonych', percent: 'Procent ukończenia',
      byCategory: 'Według kategorii', byPriority: 'Według priorytetu',
    },
    settings: {
      title: 'Ustawienia', subtitle: 'Dostosuj aplikację do swoich potrzeb',
      darkMode: 'Tryb ciemny', darkModeDesc: 'Przełącz między jasnym a ciemnym motywem interfejsu',
      notifications: 'Powiadomienia', notificationsDesc: 'Wyświetlaj komunikaty toast po każdej akcji',
      clearData: 'Wyczyść dane', clearDataDesc: 'Trwale usuń wszystkie zadania i zresetuj ustawienia aplikacji', clearDataBtn: 'Wyczyść dane',
      deleteAccount: 'Usuń konto', deleteAccountDesc: 'Trwale usuń konto i wszystkie powiązane dane — operacja nieodwracalna (prawo do bycia zapomnianym)', deleteAccountBtn: 'Usuń konto',
      exportJson: 'Eksportuj JSON', exportJsonDesc: 'Pobierz kopię zapasową swoich zadań w formacie JSON',
      exportTxt: 'Eksportuj TXT', exportTxtDesc: 'Pobierz czytelną listę zadań w formacie tekstowym',
      exporting: 'Eksportowanie…',
      deleting: 'Usuwanie…',
      tabsAria: 'Sekcje ustawień',
      tabGeneral: 'Ogólne', tabPriorities: 'Priorytety', tabCategories: 'Kategorie',
    },
    lists: {
      prioritiesTitle: 'Twoje priorytety',
      prioritiesDesc: 'Kolejność ma znaczenie: od najwyższego do najniższego. Według niej sortowane są zadania.',
      categoriesTitle: 'Twoje kategorie',
      categoriesDesc: 'Porządkuj zadania po swojemu — dodaj własne kategorie i wybierz dla nich ikonę.',
      addPriority: 'Dodaj priorytet', editPriority: 'Edytuj priorytet',
      addCategory: 'Dodaj kategorię', editCategory: 'Edytuj kategorię',
      nameLabel: 'Nazwa',
      namePlaceholderPriority: 'np. Krytyczny',
      namePlaceholderCategory: 'np. Nauka',
      colorLabel: 'Kolor', iconLabel: 'Ikona',
      add: 'Dodaj', save: 'Zapisz', cancel: 'Anuluj',
      restoreDefaults: 'Przywróć domyślne',
      restoreTitle: 'Przywrócić domyślne?',
      restoreMsg: 'Brakujące pozycje domyślne zostaną dodane, a ich nazwy i wygląd przywrócone. Twoje własne pozycje zostaną zachowane.',
      usedIn: 'Użyte w zadaniach: {n}',
      moveUp: 'Przesuń w górę: {name}', moveDown: 'Przesuń w dół: {name}',
      edit: 'Edytuj: {name}', remove: 'Usuń: {name}',
      cannotRemoveLast: 'Musi zostać co najmniej jedna pozycja',
      deletePriorityTitle: 'Usunąć priorytet?', deleteCategoryTitle: 'Usunąć kategorię?',
      deleteUnused: 'Pozycja „{name}" zostanie usunięta.',
      deleteUsed: 'Pozycja „{name}" zostanie usunięta. Zadania z tą pozycją ({n}) zostaną przeniesione do „{target}".',
      errLength: 'Nazwa musi mieć od 2 do 24 znaków',
      errChars: 'Dozwolone: litery, cyfry, spacje oraz - . , ! ? ( ) & / +',
      errDuplicate: 'Pozycja o takiej nazwie już istnieje',
      errLimit: 'Osiągnięto limit pozycji ({max})',
      unknown: 'Nieznane',
      colors: {
        red: 'Czerwony', orange: 'Pomarańczowy', amber: 'Bursztynowy', green: 'Zielony',
        teal: 'Morski', blue: 'Niebieski', plum: 'Śliwkowy', gray: 'Szary',
      },
      icons: {
        'icon-user': 'Osoba', 'icon-briefcase': 'Teczka', 'icon-shopping-cart': 'Koszyk', 'icon-heart': 'Serce',
        'icon-package': 'Paczka', 'icon-house': 'Dom', 'icon-book-open': 'Książka', 'icon-graduation-cap': 'Nauka',
        'icon-airplane': 'Samolot', 'icon-car': 'Samochód', 'icon-wallet': 'Portfel', 'icon-fork-knife': 'Jedzenie',
        'icon-barbell': 'Sport', 'icon-music': 'Muzyka', 'icon-game': 'Gry', 'icon-wrench': 'Naprawy',
        'icon-paw': 'Zwierzęta', 'icon-star': 'Gwiazdka', 'icon-lightbulb': 'Pomysły', 'icon-code': 'Kod',
      },
    },
    modal: { editTitle: 'Edytuj zadanie', cancel: 'Anuluj', save: 'Zapisz zmiany', confirm: 'Potwierdź' },
    footer: {
      copyright: '© 2026 TaskManager. Wszelkie prawa zastrzeżone.',
      privacy: 'Polityka Prywatności',
      builtWithPrefix: 'Zbudowany z',
      builtWithSuffix: 'używając czystego HTML, CSS i JavaScript',
    },
    privacy: {
      title: 'Polityka Prywatności',
      updated: 'Ostatnia aktualizacja: 18 kwietnia 2026 r.',
      h1: '1. Administrator danych osobowych',
      p1: 'Administratorem danych osobowych jest właściciel aplikacji TaskManager dostępnej pod adresem <strong>https://w84kubus.github.io/TaskManager/</strong> (dalej: „Administrator"). Kontakt: profil GitHub <a href="https://github.com/w84kubus" target="_blank" rel="noopener">github.com/w84kubus</a>.',
      h2: '2. Jakie dane zbieramy',
      d1: '<strong>Adres e-mail</strong> — wymagany do rejestracji i logowania',
      d2: '<strong>Imię</strong> — podawane dobrowolnie przy rejestracji, wyświetlane w interfejsie',
      d3: '<strong>Treść zadań</strong> — zadania dodawane przez użytkownika (mogą zawierać dane osobowe)',
      d4: '<strong>Ustawienia aplikacji</strong> — tryb ciemny, preferencje powiadomień, własne priorytety i kategorie',
      p2: 'Nie zbieramy danych o lokalizacji, numerów telefonów ani informacji płatniczych.',
      h3: '3. Cel i podstawa prawna przetwarzania',
      l1: 'Świadczenie usługi (obsługa konta, synchronizacja zadań) — <strong>art. 6 ust. 1 lit. b RODO</strong> (wykonanie umowy)',
      l2: 'Wysyłka e-maila weryfikacyjnego i linku resetowania hasła — <strong>art. 6 ust. 1 lit. b RODO</strong>',
      l3: 'Przetwarzanie na podstawie zgody udzielonej przy rejestracji — <strong>art. 6 ust. 1 lit. a RODO</strong>',
      h4: '4. Procesorzy danych (podmioty trzecie)',
      p3: 'Dane są przechowywane w usługach Google LLC w ramach platformy <strong>Firebase</strong>:',
      f1: '<strong>Firebase Authentication</strong> — zarządzanie kontami i sesjami',
      f2: '<strong>Firebase Firestore</strong> — przechowywanie zadań i ustawień',
      p4: 'Google LLC stosuje standardowe klauzule umowne (SCC) zapewniające ochronę danych zgodną z RODO. Polityka prywatności Google: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a>.',
      h5: '5. Okres przechowywania danych',
      p5: 'Dane są przechowywane do momentu <strong>usunięcia konta</strong> przez użytkownika. Usunięcie konta powoduje trwałe usunięcie wszystkich danych z Firebase Authentication i Firestore. Opcja usunięcia konta dostępna jest w sekcji <strong>Ustawienia → Usuń konto</strong>.',
      h6: '6. Prawa użytkownika (RODO)',
      r1: '<strong>Prawo dostępu</strong> — możesz pobrać swoje dane (Ustawienia → Eksportuj JSON)',
      r2: '<strong>Prawo do sprostowania</strong> — możesz edytować swoje zadania w aplikacji',
      r3: '<strong>Prawo do usunięcia</strong> — usuń konto w Ustawienia → Usuń konto',
      r4: '<strong>Prawo do przenoszenia</strong> — eksport danych w formacie JSON lub TXT',
      r5: '<strong>Prawo do cofnięcia zgody</strong> — możesz usunąć konto w dowolnym momencie',
      r6: '<strong>Prawo do skargi</strong> — możesz złożyć skargę do Prezesa UODO (<a href="https://uodo.gov.pl" target="_blank" rel="noopener">uodo.gov.pl</a>)',
      h7: '7. Pliki cookie i pamięć lokalna',
      p6: 'Aplikacja nie używa plików cookie. Korzysta z <strong>localStorage</strong> przeglądarki wyłącznie do przechowywania informacji o sesji gościa i lokalnych ustawień. Dane te nie są przesyłane do zewnętrznych serwerów przez samą aplikację.',
      h8: '8. Bezpieczeństwo danych',
      p7: 'Hasła nigdy nie są przechowywane w postaci jawnej — są hashowane przez Firebase Authentication. Dostęp do danych w Firestore jest chroniony regułami bezpieczeństwa: każdy użytkownik ma dostęp wyłącznie do własnych danych (<code>request.auth.uid == userId</code>). Komunikacja z serwerami Firebase odbywa się wyłącznie przez szyfrowane połączenie HTTPS.',
      h9: '9. Zmiany w polityce prywatności',
      p8: 'O istotnych zmianach w polityce prywatności użytkownicy zostaną poinformowani przez toast powiadomienie w aplikacji lub e-mail. Aktualna wersja zawsze dostępna jest pod przyciskiem „Polityka Prywatności" w stopce aplikacji.',
      accept: 'Rozumiem',
    },
    relative: { justNow: 'Przed chwilą', minAgo: '{n} min. temu', hoursAgo: '{n} godz. temu', daysAgo: '{n} dni temu' },
    toast: {
      added: 'Dodano: „{name}"',
      deleted: 'Usunięto: „{name}"',
      listAdded: 'Dodano: „{name}"',
      listUpdated: 'Zapisano: „{name}"',
      listDeleted: 'Usunięto: „{name}"',
      listRestored: 'Przywrócono domyślne pozycje',
      updated: 'Zadanie zaktualizowane!',
      completed: 'Zadanie ukończone!',
      allCleared: 'Wszystkie dane zostały wyczyszczone.',
      darkOn: 'Tryb ciemny włączony',
      darkOff: 'Tryb jasny włączony',
      exportJsonDone: 'Eksport JSON zakończony!',
      exportJsonError: 'Błąd podczas eksportu JSON.',
      exportTxtDone: 'Eksport TXT zakończony!',
      exportTxtError: 'Błąd podczas eksportu TXT.',
      welcomeBack: 'Witaj, {name}!',
      guestWelcome: 'Tryb gościa — zadania są lokalne',
      verifyEmailSentAfterRegister: 'Wysłano link weryfikacyjny na {email} — kliknij go, aby potwierdzić konto',
      verifyEmailReminder: 'Adres e-mail niezweryfikowany — sprawdź skrzynkę i kliknij link',
      verifyResent: 'Wysłano ponownie — sprawdź skrzynkę i folder Spam',
      verifyTooMany: 'Zbyt wiele prób — poczekaj chwilę i spróbuj ponownie',
      verifyResendError: 'Błąd wysyłania — spróbuj ponownie',
      verifyNotYet: 'E-mail jeszcze nie zweryfikowany — kliknij link w wiadomości',
      verifyCheckError: 'Błąd sprawdzania — spróbuj ponownie',
      resetLinkSent: 'Wysłano link resetowania hasła na {email} — sprawdź skrzynkę',
      firebaseNotLoaded: 'Firebase nie załadowany — odśwież stronę.',
      googleLoadError: 'Nie można załadować Google Sign-In. Odśwież stronę.',
      googleCancelled: 'Logowanie Google anulowane.',
      syncNoPermission: 'Sync: brak uprawnień Firestore — sprawdź reguły',
      firestoreNoPermission: 'Firestore: brak uprawnień — sprawdź reguły bezpieczeństwa',
      syncInactiveNoPermission: 'Sync nieaktywny — brak uprawnień Firestore',
      synced: 'Zsynchronizowano',
      accountDeleted: 'Konto zostało trwale usunięte.',
      accountDeleteReauth: 'Ze względów bezpieczeństwa zaloguj się ponownie i spróbuj jeszcze raz.',
      accountDeleteError: 'Błąd usuwania konta — spróbuj ponownie.',
    },
    confirm: {
      logoutTitle: 'Wyloguj się', logoutMsg: 'Czy na pewno chcesz się wylogować?',
      guestLoginTitle: 'Przejdź do logowania',
      guestLoginMsg: 'Twoje zadania jako gość zostaną zachowane lokalnie. Po zalogowaniu na konto będziesz pracować na osobnym zestawie zadań.',
      clearDataTitle: 'Wyczyść dane',
      clearDataMsg: 'Czy na pewno chcesz usunąć wszystkie zadania i zresetować ustawienia? Tej operacji nie można cofnąć.',
      deleteAccountTitle: 'Usuń konto',
      deleteAccountMsg: 'Czy na pewno chcesz trwale usunąć konto i wszystkie dane? Tej operacji nie można cofnąć.',
    },
    validation: {
      taskEmpty: 'Nazwa zadania nie może być pusta.',
      taskTooShort: 'Nazwa musi mieć co najmniej 2 znaki.',
      taskTooLong: 'Nazwa nie może przekraczać 120 znaków.',
      taskInvalidChars: 'Nazwa zawiera niedozwolone znaki.',
      emailInvalid: 'Wpisz poprawny adres e-mail.',
      passwordEmpty: 'Wpisz hasło.',
      nameTooShort: 'Imię musi mieć co najmniej 2 znaki.',
      passwordWeak: 'Min. 6 znaków, 1 wielka litera i 1 cyfra.',
      consentRequired: 'Akceptacja Polityki Prywatności jest wymagana.',
    },
    authError: {
      'auth/email-already-in-use': 'Konto z tym adresem e-mail już istnieje.',
      'auth/invalid-email': 'Nieprawidłowy adres e-mail.',
      'auth/user-not-found': 'Nie znaleziono konta z tym adresem e-mail.',
      'auth/wrong-password': 'Nieprawidłowe hasło.',
      'auth/invalid-credential': 'Nieprawidłowy e-mail lub hasło.',
      'auth/weak-password': 'Hasło musi mieć co najmniej 6 znaków.',
      'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
      'auth/network-request-failed': 'Błąd sieci. Sprawdź połączenie.',
      'auth/popup-blocked': 'Popup zablokowany — zezwól na wyskakujące okna.',
      'auth/popup-closed-by-user': 'Logowanie anulowane.',
      generic: 'Wystąpił błąd. Spróbuj ponownie.',
    },
    samples: [
      { name: 'Zaplanuj tygodniowy harmonogram', priority: 'high',   category: 'work'     },
      { name: 'Zrób zakupy spożywcze',           priority: 'medium', category: 'shopping' },
      { name: 'Spacer 30 minut',                  priority: 'low',    category: 'health'   },
    ],
    exportTxt: {
      titleBox: 'TASKMANAGER — ZADANIA',
      exportDate: 'Data eksportu',
      user: 'Użytkownik',
      totalLine: 'Wszystkich',
      activeWord: 'Aktywnych',
      doneWord: 'Ukończonych',
      empty: 'Brak zadań do wyeksportowania.',
      priorityWord: 'Priorytet',
      categoryWord: 'Kategoria',
      addedWord: 'Dodano',
      generatedBy: 'Wygenerowano przez TaskManager',
    },
  },

  en: {
    meta: {
      title: 'TaskManager – Your Tasks',
      description: 'TaskManager – a task management app. Add, filter and track the progress of your tasks.',
    },
    priorityLabel: { low: 'Low', medium: 'Medium', high: 'High' },
    categoryLabel: {
      personal: 'Personal', work: 'Work', shopping: 'Shopping',
      health: 'Health', other: 'Other',
    },
    auth: {
      subtitle: 'Sign in to manage your tasks',
      tabLogin: 'Sign in',
      tabRegister: 'Sign up',
      googleLogin: 'Continue with Google',
      googleRegister: 'Sign up with Google',
      dividerLogin: 'or sign in with email',
      dividerRegister: 'or create an account with email',
      emailLabel: 'Email address',
      emailPlaceholder: 'you@email.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      registerPasswordPlaceholder: 'Min. 6 characters, 1 digit, 1 uppercase letter',
      loginSubmit: 'Sign in',
      loginSubmitting: 'Signing in…',
      registerSubmit: 'Create account',
      registerSubmitting: 'Creating account…',
      forgotLink: 'Forgot your password?',
      nameLabel: 'Name',
      namePlaceholder: 'Your name',
      consentPrefix: 'I accept the',
      privacyPolicyLink: 'Privacy Policy',
      consentSuffix: 'and consent to the processing of my personal data.',
      forgotDesc: 'Enter the email address linked to your account — we’ll send you a link to set a new password.',
      forgotSubtitle: 'Reset your password',
      forgotSubmit: 'Send reset link',
      forgotSubmitting: 'Sending…',
      forgotBack: '← Back to sign in',
      or: 'or',
      guestBtn: 'Continue without signing in →',
      guestBtnAria: 'Continue without signing in as a guest',
      googleLoginAria: 'Sign in with Google',
      googleRegisterAria: 'Sign up with Google',
      langToggleAria: 'Switch language to Polish',
    },
    verify: {
      step1: 'Open your inbox',
      step2: 'Click the verification link from TaskManager',
      step3: 'Come back here and press the button below',
      hintHtml: 'Don’t see the email? Check your <strong>Spam / Promotions / Notifications</strong> folder.',
      checkBtn: 'I’ve confirmed — sign me in',
      checkBtnChecking: 'Checking…',
      resendBtn: 'Resend link',
      resendBtnSending: 'Sending…',
      backBtn: 'Use a different account',
      blockedTitle: 'Verification required',
      blockedDescHtml: 'Your account hasn’t been confirmed yet.<br>Click the verification link in the email sent to<br><strong>{email}</strong>',
      freshTitle: 'Confirm your email address',
      freshDescHtml: 'We sent a verification link to<br><strong>{email}</strong>',
    },
    nav: { tasks: 'Tasks', stats: 'Statistics', settings: 'Settings' },
    userMenu: { logoutAria: 'Sign out', logoutTitle: 'Sign out', guestMode: 'Guest mode' },
    guestBanner: {
      textHtml: 'You’re using <strong>Guest mode</strong> — tasks are saved only locally in this browser.',
      loginBtn: 'Sign in / Sign up',
      closeAria: 'Dismiss notification',
    },
    tasks: {
      title: 'My tasks',
      subtitle: 'Organize and track the progress of your tasks',
      nameLabel: 'Task name',
      namePlaceholder: 'Enter a task name (min. 2 characters)…',
      priorityLabel: 'Priority',
      categoryLabel: 'Category',
      addBtn: 'Add task',
      filterAll: 'All',
      filterActive: 'Active',
      filterDone: 'Done',
      searchPlaceholder: 'Search tasks…',
      filterPriorityAria: 'Filter by priority',
      filterCategoryAria: 'Filter by category',
      allPriorities: 'All priorities',
      allCategories: 'All categories',
      sortDateDesc: 'Newest',
      sortDateAsc: 'Oldest',
      sortPriorityHigh: 'Priority ↑',
      sortPriorityLow: 'Priority ↓',
      sortAlphaAsc: 'A → Z',
      sortAlphaDesc: 'Z → A',
      emptyTitle: 'No tasks to display',
      emptyHint: 'Add your first task above or change the filters',
      toggleToDone: 'Mark as done',
      toggleToActive: 'Mark as active',
      titleDone: 'Undo',
      titleUndone: 'Complete',
      editAria: 'Edit task: {name}',
      deleteAria: 'Delete task: {name}',
      editTitle: 'Edit',
      deleteTitle: 'Delete',
    },
    stats: {
      title: 'Statistics', subtitle: 'An overview of your progress',
      total: 'Total tasks', active: 'Active', done: 'Completed', percent: 'Completion rate',
      byCategory: 'By category', byPriority: 'By priority',
    },
    settings: {
      title: 'Settings', subtitle: 'Customize the app to your needs',
      darkMode: 'Dark mode', darkModeDesc: 'Switch between light and dark interface theme',
      notifications: 'Notifications', notificationsDesc: 'Show toast messages after every action',
      clearData: 'Clear data', clearDataDesc: 'Permanently delete all tasks and reset app settings', clearDataBtn: 'Clear data',
      deleteAccount: 'Delete account', deleteAccountDesc: 'Permanently delete your account and all related data — this cannot be undone (right to be forgotten)', deleteAccountBtn: 'Delete account',
      exportJson: 'Export JSON', exportJsonDesc: 'Download a backup of your tasks in JSON format',
      exportTxt: 'Export TXT', exportTxtDesc: 'Download a readable list of your tasks as a text file',
      exporting: 'Exporting…',
      deleting: 'Deleting…',
      tabsAria: 'Settings sections',
      tabGeneral: 'General', tabPriorities: 'Priorities', tabCategories: 'Categories',
    },
    lists: {
      prioritiesTitle: 'Your priorities',
      prioritiesDesc: 'Order matters: highest first, lowest last. Tasks are sorted by it.',
      categoriesTitle: 'Your categories',
      categoriesDesc: 'Organize tasks your way — add your own categories and pick an icon for each.',
      addPriority: 'Add priority', editPriority: 'Edit priority',
      addCategory: 'Add category', editCategory: 'Edit category',
      nameLabel: 'Name',
      namePlaceholderPriority: 'e.g. Critical',
      namePlaceholderCategory: 'e.g. Study',
      colorLabel: 'Color', iconLabel: 'Icon',
      add: 'Add', save: 'Save', cancel: 'Cancel',
      restoreDefaults: 'Restore defaults',
      restoreTitle: 'Restore defaults?',
      restoreMsg: 'Missing default entries will be added back, and their names and looks restored. Your own entries will be kept.',
      usedIn: 'Used in tasks: {n}',
      moveUp: 'Move up: {name}', moveDown: 'Move down: {name}',
      edit: 'Edit: {name}', remove: 'Delete: {name}',
      cannotRemoveLast: 'At least one entry must remain',
      deletePriorityTitle: 'Delete priority?', deleteCategoryTitle: 'Delete category?',
      deleteUnused: '"{name}" will be deleted.',
      deleteUsed: '"{name}" will be deleted. Tasks using it ({n}) will be moved to "{target}".',
      errLength: 'Name must be 2 to 24 characters',
      errChars: 'Allowed: letters, digits, spaces and - . , ! ? ( ) & / +',
      errDuplicate: 'An entry with this name already exists',
      errLimit: 'Limit reached ({max} entries)',
      unknown: 'Unknown',
      colors: {
        red: 'Red', orange: 'Orange', amber: 'Amber', green: 'Green',
        teal: 'Teal', blue: 'Blue', plum: 'Plum', gray: 'Gray',
      },
      icons: {
        'icon-user': 'Person', 'icon-briefcase': 'Briefcase', 'icon-shopping-cart': 'Cart', 'icon-heart': 'Heart',
        'icon-package': 'Package', 'icon-house': 'Home', 'icon-book-open': 'Book', 'icon-graduation-cap': 'Study',
        'icon-airplane': 'Plane', 'icon-car': 'Car', 'icon-wallet': 'Wallet', 'icon-fork-knife': 'Food',
        'icon-barbell': 'Sport', 'icon-music': 'Music', 'icon-game': 'Games', 'icon-wrench': 'Repairs',
        'icon-paw': 'Pets', 'icon-star': 'Star', 'icon-lightbulb': 'Ideas', 'icon-code': 'Code',
      },
    },
    modal: { editTitle: 'Edit task', cancel: 'Cancel', save: 'Save changes', confirm: 'Confirm' },
    footer: {
      copyright: '© 2026 TaskManager. All rights reserved.',
      privacy: 'Privacy Policy',
      builtWithPrefix: 'Built with',
      builtWithSuffix: 'using plain HTML, CSS and JavaScript',
    },
    privacy: {
      title: 'Privacy Policy',
      updated: 'Last updated: April 18, 2026',
      h1: '1. Data controller',
      p1: 'The data controller is the owner of the TaskManager application available at <strong>https://w84kubus.github.io/TaskManager/</strong> (hereinafter: the "Controller"). Contact: GitHub profile <a href="https://github.com/w84kubus" target="_blank" rel="noopener">github.com/w84kubus</a>.',
      h2: '2. What data we collect',
      d1: '<strong>Email address</strong> — required for registration and sign-in',
      d2: '<strong>Name</strong> — provided voluntarily at registration, shown in the interface',
      d3: '<strong>Task content</strong> — tasks added by the user (may contain personal data)',
      d4: '<strong>App settings</strong> — dark mode, notification preferences, custom priorities and categories',
      p2: 'We do not collect location data, phone numbers, or payment information.',
      h3: '3. Purpose and legal basis for processing',
      l1: 'Providing the service (account handling, task synchronization) — <strong>Art. 6(1)(b) GDPR</strong> (performance of a contract)',
      l2: 'Sending verification emails and password reset links — <strong>Art. 6(1)(b) GDPR</strong>',
      l3: 'Processing based on consent given at registration — <strong>Art. 6(1)(a) GDPR</strong>',
      h4: '4. Data processors (third parties)',
      p3: 'Data is stored with Google LLC services as part of the <strong>Firebase</strong> platform:',
      f1: '<strong>Firebase Authentication</strong> — account and session management',
      f2: '<strong>Firebase Firestore</strong> — storage of tasks and settings',
      p4: 'Google LLC applies standard contractual clauses (SCCs) to ensure GDPR-compliant data protection. Google’s privacy policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a>.',
      h5: '5. Data retention period',
      p5: 'Data is stored until the user <strong>deletes their account</strong>. Deleting your account permanently removes all data from Firebase Authentication and Firestore. The account deletion option is available under <strong>Settings → Delete account</strong>.',
      h6: '6. User rights (GDPR)',
      r1: '<strong>Right of access</strong> — you can download your data (Settings → Export JSON)',
      r2: '<strong>Right to rectification</strong> — you can edit your tasks in the app',
      r3: '<strong>Right to erasure</strong> — delete your account under Settings → Delete account',
      r4: '<strong>Right to data portability</strong> — export your data in JSON or TXT format',
      r5: '<strong>Right to withdraw consent</strong> — you can delete your account at any time',
      r6: '<strong>Right to lodge a complaint</strong> — you may file a complaint with your national data protection authority (in Poland: <a href="https://uodo.gov.pl" target="_blank" rel="noopener">uodo.gov.pl</a>)',
      h7: '7. Cookies and local storage',
      p6: 'The application does not use cookies. It uses the browser’s <strong>localStorage</strong> solely to store guest session information and local settings. This data is not transmitted to external servers by the app itself.',
      h8: '8. Data security',
      p7: 'Passwords are never stored in plain text — they are hashed by Firebase Authentication. Access to Firestore data is protected by security rules: each user can only access their own data (<code>request.auth.uid == userId</code>). Communication with Firebase servers uses encrypted HTTPS only.',
      h9: '9. Changes to this privacy policy',
      p8: 'Users will be informed of any significant changes to this privacy policy via an in-app toast notification or email. The current version is always available via the "Privacy Policy" button in the app footer.',
      accept: 'Got it',
    },
    relative: { justNow: 'Just now', minAgo: '{n} min ago', hoursAgo: '{n}h ago', daysAgo: '{n}d ago' },
    toast: {
      added: 'Added: "{name}"',
      deleted: 'Deleted: "{name}"',
      listAdded: 'Added: "{name}"',
      listUpdated: 'Saved: "{name}"',
      listDeleted: 'Deleted: "{name}"',
      listRestored: 'Default entries restored',
      updated: 'Task updated!',
      completed: 'Task completed!',
      allCleared: 'All data has been cleared.',
      darkOn: 'Dark mode enabled',
      darkOff: 'Light mode enabled',
      exportJsonDone: 'JSON export complete!',
      exportJsonError: 'Error during JSON export.',
      exportTxtDone: 'TXT export complete!',
      exportTxtError: 'Error during TXT export.',
      welcomeBack: 'Welcome, {name}!',
      guestWelcome: 'Guest mode — tasks are stored locally',
      verifyEmailSentAfterRegister: 'A verification link was sent to {email} — click it to confirm your account',
      verifyEmailReminder: 'Email not verified — check your inbox and click the link',
      verifyResent: 'Resent — check your inbox and Spam folder',
      verifyTooMany: 'Too many attempts — please wait a moment and try again',
      verifyResendError: 'Failed to send — please try again',
      verifyNotYet: 'Email not verified yet — click the link in the message',
      verifyCheckError: 'Error checking status — please try again',
      resetLinkSent: 'Password reset link sent to {email} — check your inbox',
      firebaseNotLoaded: 'Firebase failed to load — refresh the page.',
      googleLoadError: 'Could not load Google Sign-In. Refresh the page.',
      googleCancelled: 'Google sign-in cancelled.',
      syncNoPermission: 'Sync: Firestore permission denied — check your rules',
      firestoreNoPermission: 'Firestore: permission denied — check your security rules',
      syncInactiveNoPermission: 'Sync inactive — Firestore permission denied',
      synced: 'Synced',
      accountDeleted: 'Your account has been permanently deleted.',
      accountDeleteReauth: 'For security reasons, please sign in again and retry.',
      accountDeleteError: 'Error deleting account — please try again.',
    },
    confirm: {
      logoutTitle: 'Sign out', logoutMsg: 'Are you sure you want to sign out?',
      guestLoginTitle: 'Go to sign in',
      guestLoginMsg: 'Your guest tasks will remain saved locally. Once signed in, you’ll work with a separate set of tasks.',
      clearDataTitle: 'Clear data',
      clearDataMsg: 'Are you sure you want to delete all tasks and reset your settings? This action cannot be undone.',
      deleteAccountTitle: 'Delete account',
      deleteAccountMsg: 'Are you sure you want to permanently delete your account and all data? This action cannot be undone.',
    },
    validation: {
      taskEmpty: 'Task name cannot be empty.',
      taskTooShort: 'Name must be at least 2 characters long.',
      taskTooLong: 'Name cannot exceed 120 characters.',
      taskInvalidChars: 'Name contains invalid characters.',
      emailInvalid: 'Enter a valid email address.',
      passwordEmpty: 'Enter your password.',
      nameTooShort: 'Name must be at least 2 characters long.',
      passwordWeak: 'Min. 6 characters, 1 uppercase letter and 1 digit.',
      consentRequired: 'You must accept the Privacy Policy.',
    },
    authError: {
      'auth/email-already-in-use': 'An account with this email address already exists.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/weak-password': 'Password must be at least 6 characters long.',
      'auth/too-many-requests': 'Too many attempts. Please try again shortly.',
      'auth/network-request-failed': 'Network error. Check your connection.',
      'auth/popup-blocked': 'Popup blocked — please allow pop-up windows.',
      'auth/popup-closed-by-user': 'Sign-in cancelled.',
      generic: 'An error occurred. Please try again.',
    },
    samples: [
      { name: 'Plan your weekly schedule', priority: 'high',   category: 'work'     },
      { name: 'Buy groceries',             priority: 'medium', category: 'shopping' },
      { name: '30-minute walk',            priority: 'low',    category: 'health'   },
    ],
    exportTxt: {
      titleBox: 'TASKMANAGER — TASKS',
      exportDate: 'Export date',
      user: 'User',
      totalLine: 'Total',
      activeWord: 'Active',
      doneWord: 'Completed',
      empty: 'No tasks to export.',
      priorityWord: 'Priority',
      categoryWord: 'Category',
      addedWord: 'Added',
      generatedBy: 'Generated by TaskManager',
    },
  },
};

/**
 * Pobierz przetłumaczony string po ścieżce kropkowej, np. t('toast.added', {name: 'Test'}).
 * Fallback do polskiego, jeśli klucz nie istnieje w bieżącym języku.
 */
function t(path, vars) {
  const dict = I18N[state.lang] || I18N.pl;
  const fallback = I18N.pl;
  const get = (obj) => path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  let str = get(dict);
  if (str === undefined) str = get(fallback);
  if (str === undefined) return path;
  if (vars && typeof str === 'string') {
    Object.keys(vars).forEach(k => { str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]); });
  }
  return str;
}

/* ============================================================
   STAN APLIKACJI
   ============================================================ */
const state = {
  tasks:         [],
  priorities:    defaultList('priorities'),   // [{ id, color, name? }] — od najwyższego
  categories:    defaultList('categories'),   // [{ id, icon,  name? }]
  filter:        'all',
  filterPriority: '',    // id priorytetu albo '' = wszystkie
  filterCategory: '',    // id kategorii albo '' = wszystkie
  sort:          'date-desc',
  search:        '',
  darkMode:      false,
  notifications: true,
  currentUser:   null,   // { email, name, provider, uid }
  lang:          'pl',   // 'pl' | 'en'
};

/* ============================================================
   PRIORYTETY I KATEGORIE — dane
   ============================================================ */
function defaultList(kind) {
  return LIST_KIND[kind].defaults.map(d => ({ ...d }));
}

function isBuiltinId(kind, id) {
  return LIST_KIND[kind].defaults.some(d => d.id === id);
}

/** Wczytanie listy z localStorage / Firestore — nic z zewnątrz nie jest zaufane. */
function sanitizeList(kind, raw) {
  const cfg = LIST_KIND[kind];
  if (!Array.isArray(raw)) return defaultList(kind);

  const seen = new Set();
  const out  = [];
  for (const r of raw) {
    if (out.length >= cfg.max) break;
    if (!r || typeof r.id !== 'string' || !LIST_ID_RE.test(r.id) || seen.has(r.id)) continue;

    const def  = cfg.defaults.find(d => d.id === r.id);
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    const nameOk = LIST_NAME_RE.test(name) && /[\p{L}\p{N}]/u.test(name);
    if (!def && !nameOk) continue;                       // własna pozycja bez poprawnej nazwy — pomiń

    const choice = cfg.choices.includes(r[cfg.field]) ? r[cfg.field] : (def ? def[cfg.field] : cfg.choices[0]);
    const item = { id: r.id, [cfg.field]: choice };      // stała kolejność kluczy — potrzebna do porównań JSON
    if (nameOk) item.name = name;

    seen.add(r.id);
    out.push(item);
  }
  return out.length ? out : defaultList(kind);
}

function listItem(kind, id) {
  return state[kind].find(i => i.id === id) || null;
}

function itemLabel(kind, item) {
  if (item.name) return item.name;
  return isBuiltinId(kind, item.id) ? t(`${LIST_KIND[kind].labelDict}.${item.id}`) : t('lists.unknown');
}

function priorityLabel(id) {
  const item = listItem('priorities', id);
  return item ? itemLabel('priorities', item) : t('lists.unknown');
}

function categoryLabel(id) {
  const item = listItem('categories', id);
  return item ? itemLabel('categories', item) : t('lists.unknown');
}

/** Ranga do sortowania: indeks na liście (0 = najwyższy). Nieznany priorytet ląduje na końcu. */
function priorityRank(id) {
  const i = state.priorities.findIndex(p => p.id === id);
  return i === -1 ? state.priorities.length : i;
}

/** Dokąd przenieść zadania po usunięciu pozycji / dla nieznanego id. */
function fallbackId(kind, items) {
  if (kind === 'priorities') return (items.find(i => i.id === 'medium') || items[Math.floor(items.length / 2)]).id;
  return (items.find(i => i.id === 'other') || items[items.length - 1]).id;
}

function resolveListId(kind, id) {
  return listItem(kind, id) ? id : fallbackId(kind, state[kind]);
}

function listsAreDefault() {
  return JSON.stringify(state.priorities) === JSON.stringify(defaultList('priorities'))
      && JSON.stringify(state.categories) === JSON.stringify(defaultList('categories'));
}

/* ============================================================
   ZASTOSOWANIE JĘZYKA (i18n)
   ============================================================ */
// Zapamiętaj ostatni stan ekranu weryfikacji, żeby móc go przetłumaczyć „na żywo"
let _lastVerifyState = null; // { email, source }

function updateLangToggleButtons() {
  const current = state.lang;
  const target  = current === 'pl' ? 'en' : 'pl';
  const label   = target === 'en' ? 'EN' : 'PL';
  document.querySelectorAll('.lang-toggle').forEach(btn => {
    const labelEl = btn.querySelector('.lang-label');
    if (labelEl) labelEl.textContent = label;
    btn.setAttribute('aria-label', I18N[current].auth.langToggleAria);
  });
}

function applyLanguage(lang) {
  if (lang !== 'pl' && lang !== 'en') lang = 'pl';
  state.lang = lang;
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (e) { /* ignore */ }

  document.documentElement.lang = lang;

  const titleEl = document.querySelector('title');
  if (titleEl) titleEl.textContent = t('meta.title');
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) descMeta.content = t('meta.description');

  // Proste tłumaczenie tekstu
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // Tłumaczenie z zaufanym HTML (własna treść, nie dane użytkownika)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  // Placeholdery
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  // Etykiety aria (np. grupy zakładek)
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });

  // Selecty i panele zarządzania — etykiety wbudowanych pozycji zależą od języka
  renderListControls();

  updateLangToggleButtons();

  // Aria-labels dla kluczowych elementów interaktywnych
  const ariaMap = {
    'guest-btn':            'auth.guestBtnAria',
    'google-login':         'auth.googleLoginAria',
    'google-register':      'auth.googleRegisterAria',
    'logout-btn':           'userMenu.logoutAria',
    'guest-banner-close':   'guestBanner.closeAria',
  };
  Object.entries(ariaMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('aria-label', t(key));
  });
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.title = t('userMenu.logoutTitle');

  // Odśwież dynamiczne widoki, które nie korzystają z data-i18n
  if (document.getElementById('app-wrapper') && !document.getElementById('app-wrapper').hidden) {
    renderTaskList();
    if (!document.getElementById('stats').hidden) renderStats();
    const nameEl = document.getElementById('user-name');
    if (nameEl && state.currentUser?.provider === 'guest') nameEl.textContent = t('userMenu.guestMode');
  }

  // Odśwież ekran weryfikacji, jeśli aktualnie widoczny
  if (_lastVerifyState && !document.getElementById('verify-screen').hidden) {
    showEmailVerification(_lastVerifyState.email, _lastVerifyState.source);
  }

  // Jeśli panel „zapomniałem hasła" jest otwarty, odśwież jego nagłówek
  const forgotPanel = document.getElementById('forgot-panel');
  if (forgotPanel && !forgotPanel.hidden) {
    document.querySelector('.auth-subtitle').textContent = t('auth.forgotSubtitle');
  }
}

function initLanguage() {
  let saved = null;
  try { saved = localStorage.getItem(LANG_STORAGE_KEY); } catch (e) { /* ignore */ }
  applyLanguage(saved === 'en' ? 'en' : 'pl');
}

function setupLangToggle() {
  document.querySelectorAll('.lang-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      applyLanguage(state.lang === 'pl' ? 'en' : 'pl');
    });
  });
}

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
  localStorage.setItem(userKey('priorities'), JSON.stringify(state.priorities));
  localStorage.setItem(userKey('categories'), JSON.stringify(state.categories));
}

function loadState() {
  try {
    const tasks = localStorage.getItem(userKey('tasks'));
    const dark  = localStorage.getItem(userKey('dark'));
    const notif = localStorage.getItem(userKey('notif'));
    const prios = localStorage.getItem(userKey('priorities'));
    const cats  = localStorage.getItem(userKey('categories'));

    if (tasks !== null) state.tasks         = JSON.parse(tasks);
    if (dark  !== null) state.darkMode      = JSON.parse(dark);
    if (notif !== null) state.notifications = JSON.parse(notif);
    if (prios !== null) state.priorities    = sanitizeList('priorities', JSON.parse(prios));
    if (cats  !== null) state.categories    = sanitizeList('categories', JSON.parse(cats));
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
      showToast(t('toast.syncNoPermission'), 'error', 6000);
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
      showToast(t('toast.syncNoPermission'), 'error', 6000);
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

// Synchronizuj własne priorytety i kategorie (osobno od ustawień — zmieniają się rzadziej)
function firestoreSyncLists() {
  const docId = firestoreDocId();
  if (!_db || !docId) return;
  _db.collection('users').doc(docId).set({
    priorities: state.priorities,
    categories: state.categories,
    updatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true }).catch(e => console.warn('[FB] syncLists:', e));
}

// Czy chmura miała już zapisane listy (żeby nie nadpisać ich domyślnymi)
let _cloudHadLists = false;

// Wczytaj wszystkie dane z Firestore (przy logowaniu / ładowaniu strony)
async function firestoreLoad() {
  const docId = firestoreDocId();
  if (!_db || !docId) return false;
  _cloudHadLists = false;
  try {
    const userDoc = await _db.collection('users').doc(docId).get();
    if (userDoc.exists) {
      const d = userDoc.data();
      if (typeof d.notifications === 'boolean') state.notifications = d.notifications;
      if (typeof d.darkMode      === 'boolean') state.darkMode      = d.darkMode;
      if (Array.isArray(d.priorities)) { state.priorities = sanitizeList('priorities', d.priorities); _cloudHadLists = true; }
      if (Array.isArray(d.categories)) { state.categories = sanitizeList('categories', d.categories); _cloudHadLists = true; }
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
      showToast(t('toast.firestoreNoPermission'), 'error', 8000);
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
      showToast(t('toast.synced'), 'success', 1800);
    }
  }, err => {
    console.warn('[FB] listener:', err);
    if (err.code === 'permission-denied') {
      showToast(t('toast.syncInactiveNoPermission'), 'error', 8000);
    }
  });
}

// Nasłuchiwacz czasu rzeczywistego — dokument użytkownika (priorytety i kategorie z innych urządzeń)
let _settingsUnsubscribe = null;

function firestoreStartSettingsListener() {
  const docId = firestoreDocId();
  if (!_db || !docId) return;
  if (_settingsUnsubscribe) { _settingsUnsubscribe(); _settingsUnsubscribe = null; }

  _settingsUnsubscribe = _db.collection('users').doc(docId).onSnapshot(snap => {
    if (!snap.exists || snap.metadata.hasPendingWrites) return;   // własne, jeszcze niepotwierdzone zapisy pomijamy
    const d = snap.data();
    const prios = Array.isArray(d.priorities) ? sanitizeList('priorities', d.priorities) : state.priorities;
    const cats  = Array.isArray(d.categories) ? sanitizeList('categories', d.categories) : state.categories;

    if (JSON.stringify(prios) === JSON.stringify(state.priorities) &&
        JSON.stringify(cats)  === JSON.stringify(state.categories)) return;

    state.priorities = prios;
    state.categories = cats;
    saveState();
    renderListControls();
    renderTaskList();
    if (!document.getElementById('stats').hidden) renderStats();
  }, err => console.warn('[FB] settings listener:', err));
}

function stopFirestoreListeners() {
  if (_firestoreUnsubscribe) { _firestoreUnsubscribe(); _firestoreUnsubscribe = null; }
  if (_settingsUnsubscribe)  { _settingsUnsubscribe();  _settingsUnsubscribe  = null; }
}

// Pełna inicjalizacja synchronizacji przy logowaniu / ładowaniu strony
async function firestoreOnLoad() {
  if (!state.currentUser || state.currentUser.provider === 'guest') return false;
  if (!_db) return false;

  const localTasks  = [...state.tasks];
  const cloudExists = await firestoreLoad();

  if (cloudExists) {
    saveState();
    applyDarkMode(state.darkMode);
    const nt = document.getElementById('notifications-toggle');
    if (nt) { nt.checked = state.notifications; nt.setAttribute('aria-checked', String(state.notifications)); }
    renderListControls();
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

  // Własne listy są tylko lokalnie (chmura ich jeszcze nie ma) — wyślij je, żeby nie zginęły
  if (!_cloudHadLists && !listsAreDefault()) firestoreSyncLists();

  firestoreStartListener();
  firestoreStartSettingsListener();
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
    name:          firebaseUser.displayName || firebaseUser.email.split('@')[0],
    email:         firebaseUser.email,
    picture:       firebaseUser.photoURL || '',
    provider,
    uid:           firebaseUser.uid,
    emailVerified: firebaseUser.emailVerified,
  };
}

// Flaga: true jeśli użytkownik właśnie się zarejestrował (żeby pokazać właściwy toast)
let _justRegistered = false;

// Tłumaczenie kodów błędów Firebase Auth
function translateAuthError(code) {
  const dict = I18N[state.lang] || I18N.pl;
  return dict.authError[code] || dict.authError.generic;
}

// Logowanie Google przez GIS (Google Identity Services)
// Omija Firebase /__/auth/handler – działa bez Firebase Hosting
function triggerGoogleSignIn() {
  if (!_auth) { showToast(t('toast.firebaseNotLoaded'), 'error'); return; }

  if (!window.google?.accounts?.oauth2) {
    showToast(t('toast.googleLoadError'), 'error');
    return;
  }

  const client = google.accounts.oauth2.initTokenClient({
    client_id: '749463900730-3sj2t8q2n9veggn3uvf93jrioiqdh4f9.apps.googleusercontent.com',
    scope: 'email profile',
    callback: async (response) => {
      if (response.error) {
        if (response.error !== 'access_denied') {
          showToast(t('toast.googleCancelled'), 'error');
        }
        return;
      }
      try {
        const credential = firebase.auth.GoogleAuthProvider.credential(null, response.access_token);
        await _auth.signInWithCredential(credential);
        // onAuthStateChanged obsługuje resztę
      } catch (err) {
        showToast(translateAuthError(err.code), 'error');
      }
    },
  });

  client.requestAccessToken({ prompt: 'select_account' });
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

/* ============================================================
   RESET HASŁA
   ============================================================ */
function showForgotPanel() {
  document.querySelector('.auth-tabs').hidden          = true;
  document.getElementById('login-panel').hidden        = true;
  document.getElementById('register-panel').hidden     = true;
  document.getElementById('forgot-panel').hidden       = false;
  document.querySelector('.auth-subtitle').textContent = t('auth.forgotSubtitle');
}

function hideForgotPanel() {
  document.getElementById('forgot-panel').hidden       = true;
  document.querySelector('.auth-tabs').hidden          = false;
  document.getElementById('login-panel').hidden        = false;
  document.getElementById('register-panel').hidden     = true;
  document.querySelector('.auth-subtitle').textContent = t('auth.subtitle');
  // Przywróć aktywną zakładkę „Logowanie"
  document.querySelectorAll('.auth-tab').forEach(t => {
    const isLogin = t.dataset.authTab === 'login';
    t.classList.toggle('active', isLogin);
    t.setAttribute('aria-selected', String(isLogin));
  });
}

/* ============================================================
   EKRAN WERYFIKACJI E-MAIL
   ============================================================ */
/**
 * Pokaż ekran weryfikacji e-mail.
 * @param {string} email  - adres e-mail użytkownika
 * @param {'register'|'login'} source - skąd pochodzi wywołanie:
 *   'register' = świeża rejestracja (wysłano link, poinformuj użytkownika)
 *   'login'    = próba logowania, konto niezweryfikowane (blokada)
 */
function showEmailVerification(email, source) {
  document.getElementById('auth-screen').hidden   = true;
  document.getElementById('verify-screen').hidden = false;
  document.getElementById('app-wrapper').hidden   = true;

  _lastVerifyState = { email, source };

  const card      = document.querySelector('#verify-screen .verify-card');
  const iconWrap  = document.getElementById('verify-icon-wrap');
  const titleEl   = document.getElementById('verify-title');
  const descEl    = document.getElementById('verify-desc');
  // Zabezpiecz e-mail przed XSS
  const safeEmail = (email || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  if (source === 'login') {
    // Konto niezweryfikowane — blokada dostępu
    card.classList.add('blocked');
    iconWrap.innerHTML   = iconSvg('icon-lock');
    titleEl.textContent  = t('verify.blockedTitle');
    descEl.innerHTML     = t('verify.blockedDescHtml', { email: safeEmail });
  } else {
    // Świeża rejestracja — poinformuj o wysłaniu linku
    card.classList.remove('blocked');
    iconWrap.innerHTML   = iconSvg('icon-mail');
    titleEl.textContent  = t('verify.freshTitle');
    descEl.innerHTML     = t('verify.freshDescHtml', { email: safeEmail });
  }
}

function hideEmailVerification() {
  document.getElementById('verify-screen').hidden = true;
  _lastVerifyState = null;
}

async function resendVerificationEmail() {
  const user = _auth?.currentUser;
  if (!user) return;
  const btn = document.getElementById('verify-resend-btn');
  btn.disabled    = true;
  btn.textContent = t('verify.resendBtnSending');
  try {
    await user.sendEmailVerification({ url: 'https://w84kubus.github.io/TaskManager/' });
    showToast(t('toast.verifyResent'), 'success', 5000);
  } catch (e) {
    if (e.code === 'auth/too-many-requests') {
      showToast(t('toast.verifyTooMany'), 'error');
    } else {
      showToast(t('toast.verifyResendError'), 'error');
    }
  } finally {
    btn.disabled    = false;
    btn.textContent = t('verify.resendBtn');
  }
}

async function checkEmailVerification() {
  const user = _auth?.currentUser;
  if (!user) return;
  const btn      = document.getElementById('verify-check-btn');
  const labelEl  = document.getElementById('verify-check-btn-label');
  btn.disabled   = true;
  labelEl.textContent = t('verify.checkBtnChecking');
  try {
    await user.reload(); // odśwież dane użytkownika z serwera
    if (_auth.currentUser.emailVerified) {
      hideEmailVerification();
      state.currentUser = mapFirebaseUser(_auth.currentUser);
      await onLoginSuccess(true);
    } else {
      showToast(t('toast.verifyNotYet'), 'warning', 5000);
    }
  } catch (e) {
    showToast(t('toast.verifyCheckError'), 'error');
  } finally {
    btn.disabled   = false;
    labelEl.textContent = t('verify.checkBtn');
  }
}

function showApp() {
  document.getElementById('auth-screen').hidden = true;
  document.getElementById('app-wrapper').hidden = false;

  const avatar = document.getElementById('user-avatar');
  const nameEl = document.getElementById('user-name');
  const u      = state.currentUser;
  const isGuest = u.provider === 'guest';

  nameEl.textContent = isGuest ? t('userMenu.guestMode') : u.name;

  if (isGuest) {
    avatar.innerHTML = iconSvg('icon-user');
  } else {
    avatar.textContent = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  avatar.className = 'user-avatar';
  if (u.provider === 'google') avatar.classList.add('social-google');
  if (isGuest)                 avatar.classList.add('social-guest');

  const banner = document.getElementById('guest-banner');
  banner.hidden = !isGuest;
  document.body.classList.toggle('guest-mode', isGuest);

  // Ukryj "Usuń konto" dla gościa (nie ma konta Firebase)
  const deleteCard = document.getElementById('delete-account-card');
  if (deleteCard) deleteCard.hidden = isGuest;
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
  stopFirestoreListeners();

  state.tasks         = [];
  state.filterPriority = '';
  state.filterCategory = '';
  state.priorities    = defaultList('priorities');
  state.categories    = defaultList('categories');
  state.darkMode      = false;
  state.notifications = true;
  applyDarkMode(false);
  renderListControls();

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

  if (state.filterPriority) list = list.filter(t => t.priority === state.filterPriority);
  if (state.filterCategory) list = list.filter(t => t.category === state.filterCategory);

  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    list = list.filter(t => t.name.toLowerCase().includes(q));
  }

  switch (state.sort) {
    case 'date-asc':      list.sort((a, b) => a.createdAt - b.createdAt); break;
    case 'date-desc':     list.sort((a, b) => b.createdAt - a.createdAt); break;
    case 'priority-high': list.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)); break;
    case 'priority-low':  list.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority)); break;
    case 'alpha-asc':     list.sort((a, b) => a.name.localeCompare(b.name, 'pl')); break;
    case 'alpha-desc':    list.sort((a, b) => b.name.localeCompare(a.name, 'pl')); break;
  }

  // Ukończone zawsze na końcu (niezależnie od sortowania)
  list.sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));

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

  if (mins  <  1) return t('relative.justNow');
  if (mins  < 60) return t('relative.minAgo',   { n: mins  });
  if (hours < 24) return t('relative.hoursAgo', { n: hours });
  if (days  <  7) return t('relative.daysAgo',  { n: days  });
  return new Date(ts).toLocaleDateString(LOCALE_MAP[state.lang] || 'pl-PL', { day: 'numeric', month: 'short' });
}

/* ============================================================
   BEZPIECZNE WSTAWIANIE TEKSTU (ochrona przed XSS)
   ============================================================ */
function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// Do wartości atrybutów HTML (escHtml nie zamienia cudzysłowów)
function escAttr(str) {
  return escHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ============================================================
   IKONY SVG — spójny system zamiast emoji (sprite w index.html)
   ============================================================ */
function iconSvg(name, extraClass = '') {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}" aria-hidden="true"><use href="#${name}"/></svg>`;
}

/* ============================================================
   RENDEROWANIE LISTY ZADAŃ
   ============================================================ */
function renderTaskList() {
  const ul         = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const tasks      = getVisibleTasks();

  updateManageCounts();
  ul.innerHTML = '';

  if (tasks.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  tasks.forEach(task => {
    const prio  = listItem('priorities', task.priority);
    const cat   = listItem('categories', task.category);
    const prioText = priorityLabel(task.priority);
    const catText  = categoryLabel(task.category);

    const li = document.createElement('li');
    // klasa pc-<kolor> ustawia --pc: kolor lewej krawędzi i badge'a priorytetu (kolor z białej listy, nie z danych)
    li.className  = `task-item${task.done ? ' done' : ''}${prio ? ` pc-${prio.color}` : ''}`;
    li.dataset.id = task.id;
    li.setAttribute('role', 'listitem');

    li.innerHTML = `
      <button class="task-checkbox" data-action="toggle"
        aria-label="${task.done ? t('tasks.toggleToActive') : t('tasks.toggleToDone')}"
        title="${task.done ? t('tasks.titleDone') : t('tasks.titleUndone')}"
      >${task.done ? iconSvg('icon-check') : ''}</button>

      <div class="task-content">
        <div class="task-name">${escHtml(task.name)}</div>
        <div class="task-meta">
          <span class="badge badge-prio"
                aria-label="${escAttr(prioText)}">
            ${iconSvg('icon-dot')} ${escHtml(prioText)}
          </span>
          <span class="badge badge-cat"
                aria-label="${escAttr(catText)}">
            ${iconSvg(cat ? cat.icon : 'icon-package')} ${escHtml(catText)}
          </span>
          <span class="task-date">${relativeTime(task.createdAt)}</span>
        </div>
      </div>

      <div class="task-actions">
        <button class="task-btn edit"   data-action="edit"
                aria-label="${t('tasks.editAria', { name: escHtml(task.name) })}" title="${t('tasks.editTitle')}">${iconSvg('icon-edit')}</button>
        <button class="task-btn delete" data-action="delete"
                aria-label="${t('tasks.deleteAria', { name: escHtml(task.name) })}"  title="${t('tasks.deleteTitle')}">${iconSvg('icon-x')}</button>
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

  renderBarChart('category-chart', countByKey('category'), chartRows('categories'));
  renderBarChart('priority-chart', countByKey('priority'), chartRows('priorities'));
}

function countByKey(key) {
  return state.tasks.reduce((acc, t) => {
    acc[t[key]] = (acc[t[key]] || 0) + 1;
    return acc;
  }, {});
}

// Wiersze wykresu = lista użytkownika w jego kolejności
function chartRows(kind) {
  return state[kind].map(item => ({ id: item.id, label: itemLabel(kind, item) }));
}

function renderBarChart(id, counts, rows) {
  const container = document.getElementById(id);
  container.innerHTML = '';

  // Zadania ze znikniętą pozycją (np. jeszcze niezsynchronizowaną) — jeden zbiorczy wiersz
  const known   = new Set(rows.map(r => r.id));
  const orphans = Object.entries(counts).filter(([key]) => !known.has(key)).reduce((n, [, c]) => n + c, 0);
  const all     = orphans > 0 ? [...rows, { id: '__unknown', label: t('lists.unknown') }] : rows;
  const value   = r => (r.id === '__unknown' ? orphans : (counts[r.id] || 0));

  const maxVal = Math.max(...all.map(value), 1);

  all.forEach(r => {
    const count = value(r);
    const pct   = Math.round((count / maxVal) * 100);

    const row = document.createElement('div');
    row.className = 'bar-item';
    row.innerHTML = `
      <span class="bar-label">${escHtml(r.label)}</span>
      <div class="bar-track"
           role="progressbar"
           aria-valuenow="${count}"
           aria-valuemin="0"
           aria-valuemax="${maxVal}"
           aria-label="${escAttr(r.label)}: ${count}">
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

  if (v.length === 0)      { setError(input, error, t('validation.taskEmpty'));       return false; }
  if (v.length < 2)        { setError(input, error, t('validation.taskTooShort'));    return false; }
  if (v.length > 120)      { setError(input, error, t('validation.taskTooLong'));     return false; }
  if (!VALID_TASK.test(v)) { setError(input, error, t('validation.taskInvalidChars')); return false; }

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

  renderSelectOptions();   // odśwież opcje (i usuń tymczasowe z poprzedniego otwarcia)

  document.getElementById('edit-task-id').value       = task.id;
  document.getElementById('edit-task-name').value     = task.name;
  setSelectValue('edit-task-priority', task.priority);
  setSelectValue('edit-task-category', task.category);

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

  const icons = { success: 'icon-check', warning: 'icon-alert-triangle', error: 'icon-x' };
  toast.innerHTML = `${iconSvg(icons[type] || 'icon-check', 'toast-icon')}${escHtml(message)}`;

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
          version:    '2.1.0',
          priorities: state.priorities,
          categories: state.categories,
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
function boxHeader(text) {
  const width = Math.max(38, text.length + 4);
  const pad   = width - text.length;
  const left  = Math.floor(pad / 2), right = pad - left;
  return [
    '╔' + '═'.repeat(width) + '╗',
    '║' + ' '.repeat(left) + text + ' '.repeat(right) + '║',
    '╚' + '═'.repeat(width) + '╝',
  ];
}

function exportTxtAsync() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const locale = LOCALE_MAP[state.lang] || 'pl-PL';
        const ex     = (I18N[state.lang] || I18N.pl).exportTxt;
        const dateStr = new Date().toLocaleDateString(locale, {
          day: 'numeric', month: 'long', year: 'numeric',
        });
        const total  = state.tasks.length;
        const done   = state.tasks.filter(t => t.done).length;
        const active = total - done;
        const isGuest = state.currentUser?.provider === 'guest';
        const userLabel = isGuest ? t('userMenu.guestMode') : (state.currentUser?.name || '—');

        const lines = [
          ...boxHeader(ex.titleBox),
          `  ${ex.exportDate} : ${dateStr}`,
          `  ${ex.user}${' '.repeat(Math.max(0, ex.exportDate.length - ex.user.length))} : ${userLabel}`,
          `  ${ex.totalLine} : ${total}  |  ${ex.activeWord}: ${active}  |  ${ex.doneWord}: ${done}`,
          '',
          '──────────────────────────────────────',
          '',
        ];

        if (state.tasks.length === 0) {
          lines.push(`  ${ex.empty}`);
        } else {
          const sorted = [...state.tasks].sort((a, b) => b.createdAt - a.createdAt);
          sorted.forEach((task, i) => {
            const status   = task.done ? '[✓]' : '[ ]';
            const created  = new Date(task.createdAt).toLocaleString(locale);
            const priority = priorityLabel(task.priority) || task.priority;
            const category = categoryLabel(task.category) || task.category;
            lines.push(`${i + 1}. ${status} ${task.name}`);
            lines.push(`     ${ex.priorityWord} : ${priority}`);
            lines.push(`     ${ex.categoryWord} : ${category}`);
            lines.push(`     ${ex.addedWord} : ${created}`);
            lines.push('');
          });
        }

        lines.push('──────────────────────────────────────');
        lines.push(`  ${ex.generatedBy}`);
        lines.push('  https://w84kubus.github.io/TaskManager/');

        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `${state.lang === 'en' ? 'tasks' : 'zadania'}_${new Date().toISOString().slice(0, 10)}.txt`;
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
   POLITYKA PRYWATNOŚCI
   ============================================================ */
function showPrivacyPolicy() {
  document.getElementById('privacy-modal').hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('privacy-close-btn').focus();
}

function hidePrivacyPolicy() {
  document.getElementById('privacy-modal').hidden = true;
  document.body.style.overflow = '';
}

/* ============================================================
   USUŃ KONTO (RODO – prawo do bycia zapomnianym)
   ============================================================ */
async function deleteAccount() {
  const user = _auth?.currentUser;
  if (!user) return;

  openConfirm(t('confirm.deleteAccountTitle'), t('confirm.deleteAccountMsg'), async () => {
    const btn = document.getElementById('delete-account-btn');
    btn.disabled    = true;
    btn.textContent = t('settings.deleting');

    try {
      // 1. Zatrzymaj listenery Firestore
      stopFirestoreListeners();

      // 2. Usuń wszystkie zadania z Firestore
      const col = tasksCol();
      if (col && _db) {
        const snap = await col.get();
        if (!snap.empty) {
          const batch = _db.batch();
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        // Usuń dokument użytkownika (ustawienia)
        await _db.collection('users').doc(firestoreDocId()).delete().catch(() => {});
      }

      // 3. Usuń konto z Firebase Auth
      await user.delete();

      // 4. Wyczyść localStorage
      localStorage.clear();

      // 5. Pokaż ekran logowania
      state.currentUser = null;
      state.tasks = [];
      state.filterPriority = '';
      state.filterCategory = '';
      state.priorities = defaultList('priorities');
      state.categories = defaultList('categories');
      renderListControls();
      showAuth();
      showToast(t('toast.accountDeleted'), 'success', 5000);
    } catch (err) {
      btn.disabled    = false;
      btn.textContent = t('settings.deleteAccountBtn');

      if (err.code === 'auth/requires-recent-login') {
        showToast(t('toast.accountDeleteReauth'), 'error', 7000);
        await _auth.signOut();
        showAuth();
      } else {
        showToast(t('toast.accountDeleteError'), 'error');
        console.error('[DeleteAccount]', err);
      }
    }
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
  state.priorities    = defaultList('priorities');
  state.categories    = defaultList('categories');
  state.darkMode      = false;
  state.notifications = true;
  listEdit.priorities = null;
  listEdit.categories = null;
  saveState();
  firestoreSyncSettings();
  firestoreSyncLists();

  applyDarkMode(false);
  renderListControls();
  document.getElementById('notifications-toggle').checked = true;
  document.getElementById('notifications-toggle').setAttribute('aria-checked', 'true');
  document.getElementById('dark-mode-toggle').checked = false;
  document.getElementById('dark-mode-toggle').setAttribute('aria-checked', 'false');

  renderTaskList();
  renderStats();
  showToast(t('toast.allCleared'), 'warning');
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
      setError(emailInput, document.getElementById('login-email-error'), t('validation.emailInvalid'));
      valid = false;
    } else {
      clearError(emailInput, document.getElementById('login-email-error'));
    }

    if (passInput.value.length < 1) {
      setError(passInput, document.getElementById('login-password-error'), t('validation.passwordEmpty'));
      valid = false;
    } else {
      clearError(passInput, document.getElementById('login-password-error'));
    }

    if (!valid) return;

    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled    = true;
    submitBtn.textContent = t('auth.loginSubmitting');

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
      submitBtn.textContent = t('auth.loginSubmit');
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
      setError(nameInput, document.getElementById('register-name-error'), t('validation.nameTooShort'));
      valid = false;
    } else {
      clearError(nameInput, document.getElementById('register-name-error'));
    }

    if (!EMAIL_REGEX.test(emailInput.value.trim())) {
      setError(emailInput, document.getElementById('register-email-error'), t('validation.emailInvalid'));
      valid = false;
    } else {
      clearError(emailInput, document.getElementById('register-email-error'));
    }

    if (!PASS_REGEX.test(passInput.value)) {
      setError(passInput, document.getElementById('register-password-error'),
        t('validation.passwordWeak'));
      valid = false;
    } else {
      clearError(passInput, document.getElementById('register-password-error'));
    }

    const consentBox = document.getElementById('register-consent');
    if (!consentBox.checked) {
      setError(consentBox, document.getElementById('register-consent-error'),
        t('validation.consentRequired'));
      valid = false;
    } else {
      clearError(consentBox, document.getElementById('register-consent-error'));
    }

    if (!valid) return;

    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled    = true;
    submitBtn.textContent = t('auth.registerSubmitting');

    try {
      const cred = await _auth.createUserWithEmailAndPassword(
        emailInput.value.trim(),
        passInput.value
      );
      await cred.user.updateProfile({ displayName: nameInput.value.trim() });

      // Wyślij e-mail weryfikacyjny PRZED tym jak onAuthStateChanged pokaże ekran
      await cred.user.sendEmailVerification({
        url: 'https://w84kubus.github.io/TaskManager/',
      });

      // Pokaż ekran weryfikacji ręcznie (onAuthStateChanged i tak to zrobi, ale upewniamy się)
      showEmailVerification(cred.user.email, 'register');
    } catch (err) {
      setError(emailInput, document.getElementById('register-email-error'),
        translateAuthError(err.code));
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = t('auth.registerSubmit');
    }
  });

  /* ── Przyciski Google Sign-In ──────────────────────────── */
  document.getElementById('google-login').addEventListener('click',    triggerGoogleSignIn);
  document.getElementById('google-register').addEventListener('click', triggerGoogleSignIn);

  /* ── Zapomniałem hasła ──────────────────────────────────── */
  document.getElementById('forgot-btn').addEventListener('click', showForgotPanel);

  document.getElementById('forgot-back-btn').addEventListener('click', () => {
    document.getElementById('forgot-email').value = '';
    clearError(
      document.getElementById('forgot-email'),
      document.getElementById('forgot-email-error')
    );
    hideForgotPanel();
  });

  document.getElementById('forgot-form').addEventListener('submit', async e => {
    e.preventDefault();
    const emailInput = document.getElementById('forgot-email');
    const emailError = document.getElementById('forgot-email-error');

    if (!EMAIL_REGEX.test(emailInput.value.trim())) {
      setError(emailInput, emailError, t('validation.emailInvalid'));
      return;
    }
    clearError(emailInput, emailError);

    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled    = true;
    submitBtn.textContent = t('auth.forgotSubmitting');

    try {
      await _auth.sendPasswordResetEmail(emailInput.value.trim(), {
        url: 'https://w84kubus.github.io/TaskManager/',
      });
      showToast(
        t('toast.resetLinkSent', { email: emailInput.value.trim() }),
        'success', 7000
      );
      emailInput.value = '';
      hideForgotPanel();
    } catch (err) {
      setError(emailInput, emailError, translateAuthError(err.code));
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = t('auth.forgotSubmit');
    }
  });

  /* ── Polityka prywatności – otwieranie z formularza rejestracji ── */
  document.getElementById('open-privacy-reg').addEventListener('click', showPrivacyPolicy);

  /* ── Weryfikacja e-mail: przyciski ──────────────────────── */
  document.getElementById('verify-check-btn').addEventListener('click',  checkEmailVerification);
  document.getElementById('verify-resend-btn').addEventListener('click', resendVerificationEmail);
  document.getElementById('verify-back-btn').addEventListener('click', () => {
    hideEmailVerification();
    if (_auth) _auth.signOut().catch(() => {});
    showAuth();
  });

  /* ── Tryb gościa (click) ────────────────────────────────── */
  document.getElementById('guest-btn').addEventListener('click', guestLogin);

  /* ── Banner gościa: zaloguj się ─────────────────────────── */
  document.getElementById('guest-banner-login').addEventListener('click', () => {
    openConfirm(
      t('confirm.guestLoginTitle'),
      t('confirm.guestLoginMsg'),
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
  state.filterPriority = '';
  state.filterCategory = '';
  state.priorities    = defaultList('priorities');
  state.categories    = defaultList('categories');
  state.darkMode      = false;
  state.notifications = true;
  listEdit.priorities = null;
  listEdit.categories = null;

  // 1. Szybki odczyt z localStorage (offline-first)
  loadState();
  applyDarkMode(state.darkMode);

  const notifToggle = document.getElementById('notifications-toggle');
  notifToggle.checked = state.notifications;
  notifToggle.setAttribute('aria-checked', String(state.notifications));

  renderListControls();
  renderTaskList();
  switchView('tasks');
  showApp();

  if (isFreshLogin) {
    const isGuest = state.currentUser.provider === 'guest';
    showToast(
      isGuest ? t('toast.guestWelcome') : t('toast.welcomeBack', { name: state.currentUser.name }),
      isGuest ? 'warning' : 'success',
      3500
    );

    if (!isGuest && state.currentUser.provider === 'email') {
      if (_justRegistered) {
        // Świeża rejestracja — poinformuj o e-mailu weryfikacyjnym
        _justRegistered = false;
        setTimeout(() => showToast(
          t('toast.verifyEmailSentAfterRegister', { email: state.currentUser.email }),
          'warning', 8000
        ), 3800);
      } else if (!state.currentUser.emailVerified) {
        // Logowanie na niezweryfikowane konto — przypomnij
        setTimeout(() => showToast(
          t('toast.verifyEmailReminder'),
          'warning', 6000
        ), 3800);
      }
    }
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
      const samples = (I18N[state.lang] || I18N.pl).samples;
      samples.forEach(s => addTask(
        s.name,
        resolveListId('priorities', s.priority),
        resolveListId('categories', s.category)
      ));
      renderTaskList();
    }, 500);
  }
}

/* ============================================================
   PRIORYTETY I KATEGORIE — interfejs (Ustawienia → zakładki)
   ============================================================ */
const listEdit = { priorities: null, categories: null };   // id edytowanej pozycji albo null

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

function newListId() {
  return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

function pickerName(kind) {
  const cfg = LIST_KIND[kind];
  return `${cfg.prefix}-${cfg.field}`;
}

function selectedChoice(kind) {
  return document.querySelector(`input[name="${pickerName(kind)}"]:checked`)?.value || null;
}

/* ── Selecty w formularzach zadań ───────────────────────────── */
// Domyślnie zaznaczona pozycja w formularzu dodawania: środkowy priorytet, pierwsza kategoria
function defaultChoiceId(kind) {
  return kind === 'priorities' ? fallbackId(kind, state[kind]) : state[kind][0].id;
}

function fillSelect(selectId, kind) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  const prev  = sel.value;
  const items = state[kind];
  sel.innerHTML = '';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value       = item.id;
    opt.textContent = itemLabel(kind, item);
    sel.appendChild(opt);
  });
  sel.value = items.some(i => i.id === prev) ? prev : defaultChoiceId(kind);
}

// Select filtra: „wszystkie" + pozycje z listy użytkownika. Źródłem prawdy jest state, nie DOM.
function fillFilterSelect(selectId, kind, stateKey, allLabelKey) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  const items = state[kind];
  // filtrowana pozycja została usunięta (np. w Ustawieniach lub z innego urządzenia) — wracamy do „wszystkie"
  if (state[stateKey] && !items.some(i => i.id === state[stateKey])) state[stateKey] = '';

  sel.innerHTML = '';
  const all = document.createElement('option');
  all.value       = '';
  all.textContent = t(allLabelKey);
  sel.appendChild(all);
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value       = item.id;
    opt.textContent = itemLabel(kind, item);
    sel.appendChild(opt);
  });

  sel.value = state[stateKey];
  sel.classList.toggle('is-filtered', state[stateKey] !== '');
}

function renderSelectOptions() {
  fillFilterSelect('filter-priority', 'priorities', 'filterPriority', 'tasks.allPriorities');
  fillFilterSelect('filter-category', 'categories', 'filterCategory', 'tasks.allCategories');
  fillSelect('task-priority',      'priorities');
  fillSelect('edit-task-priority', 'priorities');
  fillSelect('task-category',      'categories');
  fillSelect('edit-task-category', 'categories');
}

// Dla zadania z nieznaną pozycją dodaje tymczasową opcję — zapis niczego po cichu nie zmieni
function setSelectValue(selectId, value) {
  const sel = document.getElementById(selectId);
  if (![...sel.options].some(o => o.value === value)) {
    const opt = document.createElement('option');
    opt.value       = value;
    opt.textContent = t('lists.unknown');
    sel.appendChild(opt);
  }
  sel.value = value;
}

/* ── Panel zarządzania (lista + formularz) ──────────────────── */
function needsRestore(kind) {
  const cfg = LIST_KIND[kind];
  return cfg.defaults.some(d => {
    const it = listItem(kind, d.id);
    return !it || it.name || it[cfg.field] !== d[cfg.field];
  });
}

function renderPicker(kind, selected) {
  const cfg = LIST_KIND[kind];
  const box = document.getElementById(`${cfg.prefix}-picker`);
  if (!box) return;

  box.innerHTML = '';
  const isColor = kind === 'priorities';
  cfg.choices.forEach(choice => {
    const name = t(`lists.${isColor ? 'colors' : 'icons'}.${choice}`);

    const label = document.createElement('label');
    label.className = isColor ? `swatch pc-${choice}` : 'icon-choice';
    label.title     = name;

    const input = document.createElement('input');
    input.type    = 'radio';
    input.name    = pickerName(kind);
    input.value   = choice;
    input.checked = choice === selected;

    const face = document.createElement('span');
    face.className = isColor ? 'swatch-face' : 'icon-choice-face';
    if (!isColor) face.innerHTML = iconSvg(choice);

    const sr = document.createElement('span');
    sr.className   = 'sr-only';
    sr.textContent = name;

    label.append(input, face, sr);
    box.appendChild(label);
  });
}

function renderManagePanel(kind) {
  const cfg  = LIST_KIND[kind];
  const list = document.getElementById(`${kind}-list`);
  if (!list) return;

  const items   = state[kind];
  const isColor = kind === 'priorities';
  if (listEdit[kind] && !listItem(kind, listEdit[kind])) listEdit[kind] = null;   // pozycja zniknęła (np. po synchronizacji)

  list.innerHTML = '';
  items.forEach((item, idx) => {
    const label = itemLabel(kind, item);
    const used  = state.tasks.filter(tk => tk[cfg.taskKey] === item.id).length;
    const usedText = t('lists.usedIn', { n: used });
    const isOnly   = items.length === 1;

    const li = document.createElement('li');
    li.className  = `manage-item${isColor ? ` pc-${item.color}` : ''}${listEdit[kind] === item.id ? ' editing' : ''}`;
    li.dataset.id = item.id;
    li.innerHTML = `
      <span class="manage-mark${isColor ? ' manage-mark--color' : ''}" aria-hidden="true">${isColor ? '' : iconSvg(item.icon)}</span>
      <span class="manage-name">${escHtml(label)}</span>
      <span class="manage-count" title="${escAttr(usedText)}">
        <span aria-hidden="true">${used}</span><span class="sr-only">${escHtml(usedText)}</span>
      </span>
      <div class="manage-actions">
        <button type="button" class="task-btn" data-action="up" ${idx === 0 ? 'disabled' : ''}
                aria-label="${escAttr(t('lists.moveUp', { name: label }))}"
                title="${escAttr(t('lists.moveUp', { name: label }))}">${iconSvg('icon-caret-up')}</button>
        <button type="button" class="task-btn" data-action="down" ${idx === items.length - 1 ? 'disabled' : ''}
                aria-label="${escAttr(t('lists.moveDown', { name: label }))}"
                title="${escAttr(t('lists.moveDown', { name: label }))}">${iconSvg('icon-caret-down')}</button>
        <button type="button" class="task-btn" data-action="edit"
                aria-label="${escAttr(t('lists.edit', { name: label }))}"
                title="${escAttr(t('lists.edit', { name: label }))}">${iconSvg('icon-edit')}</button>
        <button type="button" class="task-btn delete" data-action="delete" ${isOnly ? 'disabled' : ''}
                aria-label="${escAttr(t('lists.remove', { name: label }))}"
                title="${escAttr(isOnly ? t('lists.cannotRemoveLast') : t('lists.remove', { name: label }))}">${iconSvg('icon-trash')}</button>
      </div>
    `;
    list.appendChild(li);
  });

  // Formularz: dodawanie albo edycja
  const editing = listEdit[kind] ? listItem(kind, listEdit[kind]) : null;
  const cap     = capitalize(cfg.prefix);
  document.getElementById(`${cfg.prefix}-form-title`).textContent = t(`lists.${editing ? 'edit' : 'add'}${cap}`);
  document.getElementById(`${cfg.prefix}-submit`).textContent     = t(editing ? 'lists.save' : 'lists.add');
  document.getElementById(`${cfg.prefix}-cancel`).hidden          = !editing;
  document.getElementById(`${cfg.prefix}-name`).placeholder       = t(`lists.namePlaceholder${cap}`);

  // Wybór koloru/ikony: zachowaj niezapisany wybór, dopóki edytujemy tę samą pozycję
  const box  = document.getElementById(`${cfg.prefix}-picker`);
  const same = box.dataset.for === (editing ? editing.id : '') && selectedChoice(kind);
  renderPicker(kind, same ? selectedChoice(kind) : (editing ? editing[cfg.field] : cfg.choices[0]));
  box.dataset.for = editing ? editing.id : '';

  document.getElementById(`${kind}-count`).textContent = `${items.length} / ${cfg.max}`;
  document.getElementById(`${kind}-reset`).disabled    = !needsRestore(kind);
}

// Liczniki „użyte w zadaniach" — odświeżane przy każdej zmianie zadań (bez przebudowy całego panelu)
function updateManageCounts() {
  Object.entries(LIST_KIND).forEach(([kind, cfg]) => {
    document.querySelectorAll(`#${kind}-list .manage-item`).forEach(li => {
      const counter = li.querySelector('.manage-count');
      if (!counter) return;
      const used = state.tasks.filter(tk => tk[cfg.taskKey] === li.dataset.id).length;
      const text = t('lists.usedIn', { n: used });
      counter.title = text;
      counter.firstElementChild.textContent = used;
      counter.lastElementChild.textContent  = text;
    });
  });
}

function renderListControls() {
  renderSelectOptions();
  renderManagePanel('priorities');
  renderManagePanel('categories');
}

/* ── Operacje na listach ────────────────────────────────────── */
function commitLists() {
  state.priorities = sanitizeList('priorities', state.priorities);
  state.categories = sanitizeList('categories', state.categories);
  saveState();
  firestoreSyncLists();
  renderListControls();
  renderTaskList();
  if (!document.getElementById('stats').hidden) renderStats();
}

function validateListName(kind, value, editingId) {
  const cfg = LIST_KIND[kind];
  if (value.length < 2 || value.length > 24) return t('lists.errLength');
  if (!LIST_NAME_RE.test(value) || !/[\p{L}\p{N}]/u.test(value)) return t('lists.errChars');
  if (!editingId && state[kind].length >= cfg.max) return t('lists.errLimit', { max: cfg.max });

  const lc = value.toLocaleLowerCase();
  const taken = state[kind].some(i => i.id !== editingId && itemLabel(kind, i).toLocaleLowerCase() === lc);
  return taken ? t('lists.errDuplicate') : null;
}

function startEdit(kind, id) {
  const cfg  = LIST_KIND[kind];
  const item = listItem(kind, id);
  if (!item) return;

  listEdit[kind] = id;
  const input = document.getElementById(`${cfg.prefix}-name`);
  input.value = itemLabel(kind, item);
  clearError(input, document.getElementById(`${cfg.prefix}-name-error`));
  renderManagePanel(kind);
  input.focus();
  input.select();
  input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function cancelEdit(kind) {
  const cfg   = LIST_KIND[kind];
  const input = document.getElementById(`${cfg.prefix}-name`);
  listEdit[kind] = null;
  input.value = '';
  clearError(input, document.getElementById(`${cfg.prefix}-name-error`));
  renderManagePanel(kind);
}

function submitList(kind) {
  const cfg     = LIST_KIND[kind];
  const input   = document.getElementById(`${cfg.prefix}-name`);
  const errEl   = document.getElementById(`${cfg.prefix}-name-error`);
  const editId  = listEdit[kind];
  const value   = input.value.trim().replace(/ {2,}/g, ' ');

  const err = validateListName(kind, value, editId);
  if (err) { setError(input, errEl, err); input.focus(); return; }
  clearError(input, errEl);

  const picked = selectedChoice(kind) || cfg.choices[0];

  if (editId) {
    const item = listItem(kind, editId);
    if (!item) return;
    item[cfg.field] = picked;
    // nazwa równa domyślnej (w bieżącym języku) = wracamy do tłumaczonej etykiety
    if (isBuiltinId(kind, item.id) && value === t(`${cfg.labelDict}.${item.id}`)) delete item.name;
    else item.name = value;
    showToast(t('toast.listUpdated', { name: value }), 'success');
  } else {
    state[kind].push({ id: newListId(), [cfg.field]: picked, name: value });
    showToast(t('toast.listAdded', { name: value }), 'success');
  }

  listEdit[kind] = null;
  input.value = '';
  commitLists();
  input.focus();
}

function moveItem(kind, id, dir) {
  const items = state[kind];
  const from  = items.findIndex(i => i.id === id);
  const to    = from + dir;
  if (from === -1 || to < 0 || to >= items.length) return;

  [items[from], items[to]] = [items[to], items[from]];
  commitLists();

  // Focus wraca na przycisku przeniesionej pozycji (DOM został przebudowany)
  const row  = document.querySelector(`#${kind}-list [data-id="${id}"]`);
  const pref = row?.querySelector(`[data-action="${dir < 0 ? 'up' : 'down'}"]`);
  (pref && !pref.disabled ? pref : row?.querySelector(`[data-action="${dir < 0 ? 'down' : 'up'}"]`))?.focus();
}

function removeItem(kind, id) {
  const cfg   = LIST_KIND[kind];
  const items = state[kind];
  const item  = listItem(kind, id);
  if (!item || items.length <= 1) return;

  const label     = itemLabel(kind, item);
  const used      = state.tasks.filter(tk => tk[cfg.taskKey] === id).length;
  const remaining = items.filter(i => i.id !== id);
  const target    = remaining.find(i => i.id === fallbackId(kind, remaining));
  const targetLabel = itemLabel(kind, target);

  openConfirm(
    t(`lists.delete${capitalize(cfg.prefix)}Title`),
    used > 0
      ? t('lists.deleteUsed',   { name: label, n: used, target: targetLabel })
      : t('lists.deleteUnused', { name: label }),
    () => {
      // zadania z usuwaną pozycją przechodzą na pozycję zastępczą — żadne zadanie nie zostaje „w próżni"
      state.tasks.forEach(task => {
        if (task[cfg.taskKey] === id) { task[cfg.taskKey] = target.id; firestoreSetTask(task); }
      });
      state[kind] = state[kind].filter(i => i.id !== id);
      if (listEdit[kind] === id) cancelEdit(kind);
      commitLists();
      showToast(t('toast.listDeleted', { name: label }), 'warning');
    }
  );
}

function restoreDefaults(kind) {
  const cfg = LIST_KIND[kind];
  openConfirm(t('lists.restoreTitle'), t('lists.restoreMsg'), () => {
    cfg.defaults.forEach(d => {
      const it = listItem(kind, d.id);
      if (it) { it[cfg.field] = d[cfg.field]; delete it.name; }
      else if (state[kind].length < cfg.max) state[kind].push({ ...d });
    });
    commitLists();
    showToast(t('toast.listRestored'), 'success');
  });
}

/* ── Zakładki ustawień ──────────────────────────────────────── */
function switchSettingsTab(name) {
  document.querySelectorAll('.settings-tab').forEach(tab => {
    const on = tab.dataset.settingsTab === name;
    tab.classList.toggle('active', on);
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll('.settings-panel').forEach(p => { p.hidden = p.dataset.panel !== name; });
}

function setupListEvents() {
  const tabs = [...document.querySelectorAll('.settings-tab')];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => switchSettingsTab(tab.dataset.settingsTab));
    tab.addEventListener('keydown', e => {
      const move = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      let next = null;
      if (move)               next = tabs[(i + move + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End')  next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      next.focus();
      switchSettingsTab(next.dataset.settingsTab);
    });
  });

  Object.entries(LIST_KIND).forEach(([kind, cfg]) => {
    const input = document.getElementById(`${cfg.prefix}-name`);

    document.getElementById(`${cfg.prefix}-form`).addEventListener('submit', e => {
      e.preventDefault();
      submitList(kind);
    });
    document.getElementById(`${cfg.prefix}-cancel`).addEventListener('click', () => cancelEdit(kind));
    document.getElementById(`${kind}-reset`).addEventListener('click', () => restoreDefaults(kind));
    input.addEventListener('input', () => clearError(input, document.getElementById(`${cfg.prefix}-name-error`)));

    document.getElementById(`${kind}-list`).addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.disabled) return;
      const id = btn.closest('.manage-item')?.dataset.id;
      if (!id) return;
      switch (btn.dataset.action) {
        case 'up':     moveItem(kind, id, -1); break;
        case 'down':   moveItem(kind, id,  1); break;
        case 'edit':   startEdit(kind, id);    break;
        case 'delete': removeItem(kind, id);   break;
      }
    });
  });
}

/* ============================================================
   REJESTRACJA ZDARZEŃ – APLIKACJA
   ============================================================ */
function setupEvents() {
  setupListEvents();

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
    showToast(t('toast.added', { name: name.trim() }), 'success');

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
        if (task?.done) showToast(t('toast.completed'), 'success');
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
          showToast(t('toast.deleted', { name: task.name }), 'warning');
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

  /* ── Filtry: priorytet i kategoria (change) ─────────────── */
  [['filter-priority', 'filterPriority'], ['filter-category', 'filterCategory']].forEach(([id, key]) => {
    document.getElementById(id).addEventListener('change', e => {
      state[key] = e.target.value;
      e.target.classList.toggle('is-filtered', state[key] !== '');
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
    showToast(state.darkMode ? t('toast.darkOn') : t('toast.darkOff'), 'success');
  });

  /* ── Powiadomienia toggle (change) ─────────────────────── */
  document.getElementById('notifications-toggle').addEventListener('change', e => {
    state.notifications = e.target.checked;
    e.target.setAttribute('aria-checked', String(state.notifications));
    saveState();
    firestoreSyncSettings();
  });

  /* ── Polityka prywatności – stopka i modal ─────────────── */
  document.getElementById('open-privacy-footer').addEventListener('click', showPrivacyPolicy);
  document.getElementById('privacy-close-btn').addEventListener('click',  hidePrivacyPolicy);
  document.getElementById('privacy-accept-btn').addEventListener('click', hidePrivacyPolicy);
  document.getElementById('privacy-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('privacy-modal')) hidePrivacyPolicy();
  });

  /* ── Usuń konto ─────────────────────────────────────────── */
  document.getElementById('delete-account-btn').addEventListener('click', deleteAccount);

  /* ── Wyczyść dane (click) ──────────────────────────────── */
  document.getElementById('clear-data-btn').addEventListener('click', () => {
    openConfirm(
      t('confirm.clearDataTitle'),
      t('confirm.clearDataMsg'),
      clearAll
    );
  });

  /* ── Eksport JSON (click + async/await) ─────────────────── */
  document.getElementById('export-btn').addEventListener('click', async () => {
    const btn = document.getElementById('export-btn');
    btn.disabled    = true;
    btn.textContent = t('settings.exporting');
    try {
      await exportDataAsync();
      showToast(t('toast.exportJsonDone'), 'success');
    } catch {
      showToast(t('toast.exportJsonError'), 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = t('settings.exportJson');
    }
  });

  /* ── Eksport TXT (click + async/await) ─────────────────── */
  document.getElementById('export-txt-btn').addEventListener('click', async () => {
    const btn = document.getElementById('export-txt-btn');
    btn.disabled    = true;
    btn.textContent = t('settings.exporting');
    try {
      await exportTxtAsync();
      showToast(t('toast.exportTxtDone'), 'success');
    } catch {
      showToast(t('toast.exportTxtError'), 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = t('settings.exportTxt');
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
    showToast(t('toast.updated'), 'success');
  });

  /* ── Scroll – cień nagłówka (scroll) ───────────────────── */
  window.addEventListener('scroll', () => {
    document.getElementById('site-header')
      .classList.toggle('scrolled', window.scrollY > 8);
  });

  /* ── Wyloguj (click) ────────────────────────────────────── */
  document.getElementById('logout-btn').addEventListener('click', () => {
    openConfirm(t('confirm.logoutTitle'), t('confirm.logoutMsg'), logout);
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
  initLanguage();
  setupLangToggle();
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
      // Blokuj dostęp dla niezweryfikowanych kont e-mail
      if (firebaseUser.providerData[0]?.providerId === 'password' && !firebaseUser.emailVerified) {
        showEmailVerification(firebaseUser.email, 'login');
        return;
      }
      state.currentUser = mapFirebaseUser(firebaseUser);
      await onLoginSuccess(!isPageLoad); // ciche przywrócenie przy page reload
    } else {
      // Brak Firebase user — ukryj ekran weryfikacji jeśli był widoczny
      hideEmailVerification();
      // Sprawdź tryb gościa
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
