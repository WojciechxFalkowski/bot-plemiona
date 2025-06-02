# AuthUtils - Product Requirements Document (PRD)

## Przegląd

`AuthUtils` to klasa utilities zawierająca wszystkie metody związane z uwierzytelnianiem i logowaniem do gry Plemiona. Klasa została wydzielona z głównego `CrawlerService` w celu poprawy modularności i czytelności kodu związanego z procesami logowania.

## Główne funkcjonalności

### 1. `addPlemionaCookies(context: BrowserContext, settingsService: SettingsService)`

**Cel:** Dodaje zapisane cookies Plemiona do kontekstu przeglądarki dla automatycznego logowania.

**Przykład działania:**
```typescript
// W CrawlerService
try {
  await AuthUtils.addPlemionaCookies(context, this.settingsService);
  console.log('Cookies added successfully');
} catch (error) {
  console.log('Failed to add cookies:', error.message);
}

// Cookies z bazy danych:
const cookiesFromDB = [
  {
    name: 'sid',
    value: 'abc123def456',
    domain: '.plemiona.pl',
    path: '/',
    expires: 1705123456
  },
  {
    name: 'world',
    value: 'pl214',
    domain: '.plemiona.pl', 
    path: '/',
    expires: 1705123456
  }
];

// Po przetworzeniu przez AuthUtils:
const processedCookies = [
  {
    name: 'sid',
    value: 'abc123def456',
    domain: '.plemiona.pl',
    path: '/',
    expires: 1705123456,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax'
  }
  // ... więcej cookies
];
```

**Logika działania:**
- Pobiera cookies z bazy danych przez `SettingsService`
- Dodaje wymagane właściwości (`httpOnly`, `secure`, `sameSite`)
- Aplikuje cookies do kontekstu przeglądarki
- Rzuca wyjątek jeśli cookies nie są dostępne

---

### 2. `loginToPlemiona(page: Page, credentials: PlemionaCredentials)`

**Cel:** Wykonuje ręczne logowanie wypełniając formularz logowania.

**Przykład działania:**
```typescript
const credentials = {
  username: 'mojLogin',
  password: 'mojeHaslo123',
  targetWorld: 'Świat 214'
};

try {
  await AuthUtils.loginToPlemiona(page, credentials);
  console.log('Manual login completed');
} catch (error) {
  console.log('Login failed:', error.message);
}
```

**Sekwencja kroków:**
1. Wypełnia pole "Nazwa gracza:" wartością `credentials.username`
2. Wypełnia pole "Hasło:" wartością `credentials.password` 
3. Klika przycisk "Logowanie"
4. Czeka 3 sekundy na przeładowanie strony

**Obsługa błędów:**
- Element nie znaleziony → rzuca wyjątek
- Timeout → rzuca wyjątek 
- Network error → rzuca wyjątek

---

### 3. `selectWorld(page: Page, targetWorld: string, timeout?: number)`

**Cel:** Wybiera docelowy świat po pomyślnym logowaniu.

**Przykład działania:**
```typescript
try {
  await AuthUtils.selectWorld(page, 'Świat 214', 15000);
  console.log('World selected successfully');
} catch (error) {
  console.log('World selection failed:', error.message);
}
```

**Logika działania:**
- Sprawdza czy selektor świata jest widoczny
- Klika na tekst zawierający nazwę świata
- Czeka na załadowanie strony świata (`networkidle`)
- Domyślny timeout: 15 sekund

**Możliwe błędy:**
- `World selector for "Świat 214" not visible` - selektor nie jest widoczny
- Timeout podczas ładowania strony
- Błąd sieci

---

### 4. `loginAndSelectWorld(page, credentials, settingsService, options?)`

**Cel:** Kompleksowa metoda łącząca cookies, ręczne logowanie i wybór świata.

**Przykład działania:**
```typescript
const credentials = {
  username: 'mojLogin',
  password: 'mojeHaslo123', 
  targetWorld: 'Świat 214'
};

const options = {
  useManualLogin: false,        // Preferuj cookies
  skipCookies: false,          // Nie pomijaj cookies
  loginTimeout: 15000,         // 15s timeout na logowanie
  worldSelectionTimeout: 15000 // 15s timeout na wybór świata
};

const result = await AuthUtils.loginAndSelectWorld(
  page, 
  credentials, 
  settingsService, 
  options
);

// Możliwe wyniki:
// Sukces z cookies:
{
  success: true,
  method: 'cookies',
  worldSelected: true
}

// Sukces z manual login:
{
  success: true,
  method: 'manual', 
  worldSelected: true
}

// Sukces mix (cookies + manual):
{
  success: true,
  method: 'mixed',
  worldSelected: true
}

// Błąd:
{
  success: false,
  method: 'manual',
  worldSelected: false,
  error: 'World selector not visible after manual login attempt'
}
```

**Algorytm działania:**
1. **Cookies (jeśli nie wyłączone):**
   - Próbuje dodać cookies
   - Nawiguje do strony logowania
   - Sprawdza czy selektor świata jest widoczny

2. **Manual login (jeśli cookies nie działają):**
   - Wypełnia formularz logowania
   - Sprawdza ponownie selektor świata

3. **Wybór świata:**
   - Klika na docelowy świat
   - Czeka na załadowanie

**Metody uwierzytelniania:**
- `'cookies'` - pomyślne logowanie tylko przez cookies
- `'manual'` - pomyślne logowanie tylko przez formularz
- `'mixed'` - cookies dodane, ale wymagane było ręczne logowanie

---

### 5. `validateCredentials(credentials: PlemionaCredentials)`

**Cel:** Waliduje kompletność i poprawność danych logowania.

**Przykład działania:**
```typescript
// Poprawne credentials:
const validCredentials = {
  username: 'mojLogin',
  password: 'mojeHaslo123',
  targetWorld: 'Świat 214'
};

const validation1 = AuthUtils.validateCredentials(validCredentials);
// Wynik:
{
  isValid: true,
  missingFields: [],
  errors: []
}

// Niepoprawne credentials:
const invalidCredentials = {
  username: 'ab',           // Za krótkie
  password: '',             // Puste
  targetWorld: 'World214'   // Zły format
};

const validation2 = AuthUtils.validateCredentials(invalidCredentials);
// Wynik:
{
  isValid: false,
  missingFields: ['password'],
  errors: [
    'Username must be at least 3 characters long',
    'Target world should be in format "Świat XXX"'
  ]
}
```

**Reguły walidacji:**
- **Brakujące pola:** username, password, targetWorld nie mogą być puste
- **Username:** Minimum 3 znaki
- **Password:** Minimum 5 znaków
- **TargetWorld:** Powinien zawierać "Świat"

---

### 6. `isLoggedIn(page: Page, targetWorld?: string)`

**Cel:** Sprawdza aktualny status logowania i czy jesteśmy na poprawnym świecie.

**Przykład działania:**
```typescript
// Sprawdzenie ogólnego statusu:
const status1 = await AuthUtils.isLoggedIn(page);
// Wynik:
{
  isLoggedIn: true,
  isOnCorrectWorld: true,  // true bo nie sprawdzamy konkretnego świata
  currentUrl: 'https://pl214.plemiona.pl/game.php?village=12345&screen=overview'
}

// Sprawdzenie z konkretnym światem:
const status2 = await AuthUtils.isLoggedIn(page, 'Świat 214');
// Wynik dla poprawnego świata:
{
  isLoggedIn: true,
  isOnCorrectWorld: true,
  currentUrl: 'https://pl214.plemiona.pl/game.php?village=12345&screen=overview'
}

// Wynik dla niepoprawnego świata:
{
  isLoggedIn: true,
  isOnCorrectWorld: false,  // jesteśmy na pl215 zamiast pl214
  currentUrl: 'https://pl215.plemiona.pl/game.php?village=67890&screen=overview'
}

// Wynik gdy nie zalogowani:
{
  isLoggedIn: false,
  isOnCorrectWorld: false,
  currentUrl: 'https://www.plemiona.pl/'
}
```

**Logika sprawdzania:**
- **isLoggedIn:** URL zawiera `/game.php` i nie ma tekstu "Wybierz świat"
- **isOnCorrectWorld:** Numer świata w URL odpowiada oczekiwanemu
- **currentUrl:** Aktualny adres strony

**Rozpoznawanie świata z URL:**
```typescript
// URL: https://pl214.plemiona.pl/game.php
// Regex: /https:\/\/pl(\d+)\.plemiona\.pl/
// Wyciąga: "214"
// Porównuje z: "Świat 214" → "214"
```

---

### 7. `logout(page: Page)`

**Cel:** Wylogowuje użytkownika z gry.

**Przykład działania:**
```typescript
try {
  await AuthUtils.logout(page);
  console.log('Logout successful');
} catch (error) {
  console.log('Logout failed:', error.message);
}
```

**Strategia wylogowania:**
1. **Preferowana metoda - kliknięcie linku:**
   - Szuka link zawierający `action=logout`
   - Klika pierwszy znaleziony link
   - Czeka na załadowanie strony

2. **Fallback - bezpośrednia nawigacja:**
   - Buduje URL wylogowania z aktualnego URL
   - Nawiguje bezpośrednio do `/?action=logout`

**Przykładowe URLe wylogowania:**
```typescript
// Aktualne URL: https://pl214.plemiona.pl/game.php?village=12345&screen=overview
// Logout URL:   https://pl214.plemiona.pl/?action=logout

// Aktualne URL: https://pl214.plemiona.pl/game.php?screen=place&mode=scavenge
// Logout URL:   https://pl214.plemiona.pl/?action=logout
```

---

## Interfejsy

### `PlemionaCredentials`
```typescript
interface PlemionaCredentials {
  username: string;    // Login użytkownika
  password: string;    // Hasło użytkownika  
  targetWorld: string; // Nazwa świata (np. "Świat 214")
}
```

### `LoginOptions`
```typescript
interface LoginOptions {
  useManualLogin?: boolean;       // Wymuś ręczne logowanie (domyślnie false)
  skipCookies?: boolean;          // Pomiń cookies (domyślnie false)
  loginTimeout?: number;          // Timeout logowania w ms (domyślnie 15000)
  worldSelectionTimeout?: number; // Timeout wyboru świata w ms (domyślnie 15000)
}
```

### `LoginResult`
```typescript
interface LoginResult {
  success: boolean;                        // Czy logowanie się udało
  method: 'cookies' | 'manual' | 'mixed'; // Metoda logowania
  worldSelected: boolean;                  // Czy świat został wybrany
  error?: string;                         // Opis błędu (jeśli wystąpił)
}
```

### `PlemionaCookie`
```typescript
interface PlemionaCookie {
  name: string;     // Nazwa cookie
  value: string;    // Wartość cookie
  domain: string;   // Domena (np. ".plemiona.pl")
  path: string;     // Ścieżka (np. "/")
  expires: number;  // Data wygaśnięcia (timestamp)
}
```

## Obsługa błędów

Wszystkie metody obsługują błędy poprzez:

- **Try-catch bloki** z szczegółowym logowaniem
- **Throwing exceptions** z opisowymi komunikatami
- **Graceful degradation** (fallback metody)
- **Timeout handling** z konfigurowalnymi wartościami

### Przykłady błędów:

```typescript
// Cookies nie dostępne:
"No Plemiona cookies found in settings"

// Element nie znaleziony:
"World selector for \"Świat 214\" not visible"

// Timeout:
"Error selecting world \"Świat 214\": TimeoutError: Timeout 15000ms exceeded"

// Logowanie nieudane:
"Login and world selection failed: World selector not visible after manual login attempt"
```

## Zależności

### Zewnętrzne:
- `playwright` - Page, BrowserContext
- `@nestjs/common` - Logger

### Wewnętrzne:
- `../../settings/settings.service` - SettingsService
- `../../settings/settings-keys.enum` - SettingsKey
- `./auth.interfaces` - Interfejsy TypeScript

## Wykorzystywane stałe

```typescript
private static readonly PLEMIONA_LOGIN_URL = 'https://www.plemiona.pl/';
private static readonly PLEMIONA_USERNAME_SELECTOR = 'textbox[name="Nazwa gracza:"]';
private static readonly PLEMIONA_PASSWORD_SELECTOR = 'textbox[name="Hasło:"]';
private static readonly PLEMIONA_LOGIN_BUTTON_SELECTOR = 'link[name="Logowanie"]';
private static readonly PLEMIONA_WORLD_SELECTOR = (worldName: string) => `text=${worldName}`;
```

## Testowanie

### Przykładowe scenariusze testowe:

1. **Test logowania przez cookies:**
   ```typescript
   // Given: Ważne cookies w bazie danych
   // When: addPlemionaCookies() + nawigacja na stronę
   // Then: Selektor świata jest widoczny, method = 'cookies'
   ```

2. **Test fallback na manual login:**
   ```typescript
   // Given: Brak cookies lub nieważne cookies
   // When: loginAndSelectWorld() z valid credentials
   // Then: Manual login wykonany, method = 'manual'
   ```

3. **Test walidacji credentials:**
   ```typescript
   // Given: Credentials z krótkimi polami
   // When: validateCredentials()
   // Then: isValid = false, errors zawiera konkretne błędy
   ```

4. **Test sprawdzania statusu logowania:**
   ```typescript
   // Given: Strona game.php z pl214 w URL
   // When: isLoggedIn(page, 'Świat 214')
   // Then: isLoggedIn = true, isOnCorrectWorld = true
   ```

5. **Test wylogowania:**
   ```typescript
   // Given: Zalogowany użytkownik na stronie gry
   // When: logout(page)
   // Then: Przekierowanie na stronę logowania
   ``` 