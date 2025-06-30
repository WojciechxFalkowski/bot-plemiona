# ScavengingUtils - Product Requirements Document (PRD)

## Przegląd

`ScavengingUtils` to klasa utilities zawierająca wszystkie metody związane ze zbieractwem w grze Plemiona. Klasa została wydzielona z głównego `CrawlerService` w celu poprawy modularności i czytelności kodu.

## Główne funkcjonalności

### 1. `getScavengingLevelStatuses(page: Page)`

**Cel:** Sprawdza status każdego poziomu zbieractwa (1-4) w aktualnej wiosce.

**Przykład działania:**

```typescript
const statuses = await ScavengingUtils.getScavengingLevelStatuses(page);

// Zwraca:
[
  {
    level: 1,
    isLocked: false,
    isBusy: true,
    isAvailable: false,
    isUnlocking: false,
    containerLocator: Locator, // Playwright locator elementu
  },
  {
    level: 2,
    isLocked: false,
    isBusy: false,
    isAvailable: true,
    isUnlocking: false,
    containerLocator: Locator,
  },
  {
    level: 3,
    isLocked: true,
    isBusy: false,
    isAvailable: false,
    isUnlocking: false,
    containerLocator: Locator,
  },
  {
    level: 4,
    isLocked: false,
    isBusy: false,
    isAvailable: false,
    isUnlocking: true,
    containerLocator: Locator,
  },
];
```

**Logika statusów:**

- `isLocked`: Poziom jest zablokowany (widoczny przycisk "Odblokuj")
- `isUnlocking`: Poziom jest w trakcie odblokowywania
- `isAvailable`: Poziom jest dostępny do wysłania misji (widoczny przycisk "Start")
- `isBusy`: Poziom ma aktywną misję (brak przycisku "Start", nie jest zablokowany/odblokowywany)

---

### 2. `getAvailableUnits(page: Page)`

**Cel:** Odczytuje liczbę dostępnych jednostek w aktualnej wiosce.

**Przykład działania:**

```typescript
const units = await ScavengingUtils.getAvailableUnits(page);

// Zwraca:
{
  spear: 250,      // Pikinierzy
  sword: 100,      // Miecznicy
  axe: 75,         // Topornicze
  archer: 50,      // Łucznicy
  scout: 15,       // Zwiadowcy
  light_cavalry: 20, // Lekka kawaleria
  mounted_archer: 10, // Łucznicy na koniu
  heavy_cavalry: 5,   // Ciężka kawaleria
  ram: 2,          // Taran
  catapult: 1,     // Katapulta
  paladin: 1       // Paladyn (jeśli dostępny)
}
```

**Logika odczytu:**

- Używa selektorów z `availableUnitSelectors` do znajdowania elementów
- Parsuje tekst w formacie "(250)" do liczby 250
- Zwraca 0 jeśli element nie jest widoczny lub wystąpi błąd

---

### 3. `calculateTroopDistribution(availableUnits, freeLevels)`

**Cel:** Oblicza optymalną dystrybucję wojsk na dostępne poziomy zbieractwa.

**Przykład działania:**

```typescript
const availableUnits = {
  spear: 300,
  sword: 150,
  axe: 100,
  // ... inne jednostki
};

const freeLevels = [
  { level: 1, isAvailable: true /* ... */ },
  { level: 2, isAvailable: true /* ... */ },
  { level: 4, isAvailable: true /* ... */ },
];

const plans = ScavengingUtils.calculateTroopDistribution(
  availableUnits,
  freeLevels,
);

// Zwraca:
[
  {
    level: 1,
    dispatchUnits: {
      spear: 50, // 300 * (2/12) ≈ 50
      sword: 25, // 150 * (2/12) ≈ 25
      axe: 17, // 100 * (2/12) ≈ 17
    },
  },
  {
    level: 2,
    dispatchUnits: {
      spear: 75, // 300 * (3/12) = 75
      sword: 38, // 150 * (3/12) ≈ 38
      axe: 25, // 100 * (3/12) = 25
    },
  },
  {
    level: 4,
    dispatchUnits: {
      spear: 175, // 300 * (7/12) ≈ 175
      sword: 87, // 150 * (7/12) ≈ 87
      axe: 58, // 100 * (7/12) ≈ 58
    },
  },
];
```

**Logika obliczeń:**

- Używa `levelPacks` do proporcjonalnego podziału (poziom 1: 2 paczki, poziom 2: 3 paczki, poziom 4: 7 paczek)
- Respektuje ustawienie `skip_level_1` - pomija poziom 1 jeśli jest więcej poziomów dostępnych
- Stosuje limity `max_resources` z dynamicznym mnożnikiem zależnym od liczby poziomów
- Zaokrągla w dół do pełnych jednostek

---

### 4. `collectScavengingTimeData(page, villageId, villageName)`

**Cel:** Zbiera szczegółowe dane o czasach zbieractwa dla konkretnej wioski.

**Przykład działania:**

```typescript
const data = await ScavengingUtils.collectScavengingTimeData(page, "12345", "Moja Wioska");

// Zwraca:
{
  villageId: "12345",
  villageName: "Moja Wioska",
  lastUpdated: "2024-01-15T10:30:00.000Z",
  levels: [
    {
      level: 1,
      timeRemaining: "1:23:45",
      timeRemainingSeconds: 5025,
      status: "busy",
      estimatedCompletionTime: "2024-01-15T11:53:45.000Z"
    },
    {
      level: 2,
      timeRemaining: null,
      timeRemainingSeconds: 0,
      status: "available",
      estimatedCompletionTime: undefined
    },
    {
      level: 3,
      timeRemaining: null,
      timeRemainingSeconds: 0,
      status: "locked",
      estimatedCompletionTime: undefined
    },
    {
      level: 4,
      timeRemaining: "45:30",
      timeRemainingSeconds: 2730,
      status: "unlocking",
      estimatedCompletionTime: "2024-01-15T11:15:30.000Z"
    }
  ]
}
```

**Obsługiwane statusy:**

- `busy`: Poziom ma aktywną misję zbieractwa
- `available`: Poziom jest dostępny do rozpoczęcia misji
- `locked`: Poziom jest zablokowany
- `unlocking`: Poziom jest w trakcie odblokowywania

---

### 5. `parseTimeToSeconds(timeText: string)`

**Cel:** Konwertuje tekst czasu na liczbę sekund.

**Przykłady działania:**

```typescript
// Format HH:MM:SS
ScavengingUtils.parseTimeToSeconds('2:30:45'); // → 9045 sekund

// Format H:MM:SS
ScavengingUtils.parseTimeToSeconds('1:05:30'); // → 3930 sekund

// Format MM:SS
ScavengingUtils.parseTimeToSeconds('45:30'); // → 2730 sekund

// Format M:SS
ScavengingUtils.parseTimeToSeconds('5:30'); // → 330 sekund

// Nieprawidłowy format
ScavengingUtils.parseTimeToSeconds('invalid'); // → 0 sekund
```

---

### 6. `calculateOptimalScheduleTime(scavengingTimeData)`

**Cel:** Oblicza optymalny czas do następnego uruchomienia bota na podstawie zebranych danych.

**Przykład działania:**

```typescript
const scavengingTimeData = {
  lastCollected: '2024-01-15T10:30:00.000Z',
  villages: [
    {
      villageId: '12345',
      villageName: 'Wioska A',
      levels: [
        { level: 1, status: 'busy', timeRemainingSeconds: 3600 }, // 1h
        { level: 2, status: 'busy', timeRemainingSeconds: 1800 }, // 30min
        { level: 3, status: 'available', timeRemainingSeconds: 0 },
      ],
    },
    {
      villageId: '12346',
      villageName: 'Wioska B',
      levels: [
        { level: 1, status: 'busy', timeRemainingSeconds: 2700 }, // 45min
        { level: 2, status: 'busy', timeRemainingSeconds: 5400 }, // 1.5h
        { level: 3, status: 'locked', timeRemainingSeconds: 0 },
      ],
    },
    {
      villageId: '12347',
      villageName: 'Wioska C',
      levels: [
        { level: 1, status: 'available', timeRemainingSeconds: 0 },
        { level: 2, status: 'available', timeRemainingSeconds: 0 },
      ],
    },
  ],
};

const optimalTime =
  ScavengingUtils.calculateOptimalScheduleTime(scavengingTimeData);
// → 0 sekund (Wioska C ma dostępne poziomy, więc bot może uruchomić się od razu)
```

**Logika obliczeń:**

1. **Dla każdej wioski znajdź najdłuższy czas busy:**

   - Wioska A: max(3600, 1800) = 3600s
   - Wioska B: max(2700, 5400) = 5400s
   - Wioska C: brak busy → ma available → 0s

2. **Znajdź najkrótszy z najdłuższych czasów:**

   - min(3600, 5400, 0) = 0s

3. **Zwróć wynik:**
   - Bot uruchomi się gdy pierwsza wioska skończy swoje najdłuższe zbieractwo

**Przypadki specjalne:**

- Wioska z poziomami `available` → czas 0 (gotowa od razu)
- Wioska tylko z poziomami `locked`/`unlocking` → czas infinite (ignorowane)
- Wszystkie wioski mają infinite → zwraca `null`

---

### 7. `getFallbackScheduleTime(page: Page)`

**Cel:** Fallback metoda do odczytu czasów bezpośrednio ze strony gdy nowa logika zawiedzie.

**Przykład działania:**

```typescript
const result = await ScavengingUtils.getFallbackScheduleTime(page);

// Zwraca:
{
  maxRemainingTimeSeconds: 3600,  // Najdłuższy znaleziony czas busy w sekundach
  successfullyReadTime: true     // Czy udało się odczytać jakikolwiek czas
}

// Lub gdy brak aktywnych misji:
{
  maxRemainingTimeSeconds: 0,
  successfullyReadTime: false
}
```

---

### 8. `fillUnitsForLevel(page, levelPlan, villageName)`

**Cel:** Wypełnia formularz jednostkami dla danego poziomu zbieractwa.

**Przykład działania:**

```typescript
const levelPlan = {
  level: 2,
  dispatchUnits: {
    spear: 100,
    sword: 50,
    axe: 25,
  },
};

const success = await ScavengingUtils.fillUnitsForLevel(
  page,
  levelPlan,
  'Moja Wioska',
);
// → true jeśli wszystkie pola zostały wypełnione pomyślnie
// → false jeśli wystąpiły błędy przy wypełnianiu
```

**Logika wypełniania:**

- Iteruje przez wszystkie jednostki w `unitOrder`
- Dla każdej jednostki z liczbą > 0:
  - Znajduje pole input używając `unitInputNames[unit]`
  - Wypełnia pole wartością jako string
  - Loguje sukces/błąd dla każdego pola

---

### 9. Metody logowania

#### `logDispatchInfo(levelPlan, villageName)`

**Cel:** Wylogowuje szczegółowe informacje o planowanej wysyłce dla poziomu.

**Przykład wyjścia:**

```
------ WYSYŁKA WOJSKA dla POZIOMU 2 w Moja Wioska ------
Wojsko do wysłania na poziom 2:
  - spear: 100 jednostek
  - sword: 50 jednostek
  - axe: 25 jednostek
  * Łącznie: 175 jednostek
  * Pojemność: 1750 surowców
----------------------------------------------------
```

#### `logDispatchPlan(dispatchPlan, villageName)`

**Cel:** Wylogowuje cały plan dystrybucji dla wioski.

**Przykład wyjścia:**

```
--- Calculated Scavenging Dispatch Plan for Moja Wioska ---
Level 1: spear=50, sword=25, axe=17, archer=0, scout=0, light_cavalry=0, mounted_archer=0, heavy_cavalry=0, ram=0, catapult=0
Level 2: spear=75, sword=38, axe=25, archer=0, scout=0, light_cavalry=0, mounted_archer=0, heavy_cavalry=0, ram=0, catapult=0
Level 4: spear=175, sword=87, axe=58, archer=0, scout=0, light_cavalry=0, mounted_archer=0, heavy_cavalry=0, ram=0, catapult=0
---------------------------------------------------
```

#### `logScavengingTimeData(villageScavengingData)`

**Cel:** Wylogowuje zebrane dane o czasach zbieractwa dla wioski.

**Przykład wyjścia:**

```
=== SCAVENGING TIME DATA for Moja Wioska ===
  Level 1: busy (1:23:45 remaining, 5025s)
    Estimated completion: 15.01.2024, 11:53:45
  Level 2: available
  Level 3: locked
  Level 4: unlocking (45:30 remaining)
=======================================
```

## Zależności

### Zewnętrzne:

- `playwright` - Page, Locator
- `@nestjs/common` - Logger

### Wewnętrzne:

- `../../utils/scavenging.config` - Konfiguracja zbieractwa
- `./scavenging.interfaces` - Interfejsy TypeScript

## Wykorzystywane konfiguracje

### Z `scavenging.config.ts`:

- `scavengingSettings` - Ustawienia ogólne (skip_level_1, max_resources)
- `unitSettings` - Właściwości jednostek (capacity)
- `unitOrder` - Kolejność przetwarzania jednostek
- `levelPacks` - Wagi poziomów do dystrybucji
- `availableUnitSelectors` - Selektory CSS dla odczytu jednostek
- `unitInputNames` - Nazwy pól formularza dla jednostek
- `levelSelectors` - Selektory CSS dla poziomów zbieractwa
- `scheduleBufferSeconds` - Bufor czasowy dla planowania

## Błędy i obsługa wyjątków

Wszystkie metody obsługują błędy poprzez:

- Try-catch bloki z logowaniem błędów
- Zwracanie wartości domyślnych (np. 0, false, null)
- Kontynuowanie działania mimo częściowych błędów
- Szczegółowe logowanie dla debugowania

## Testowanie

### Przykładowe scenariusze testowe:

1. **Test dystrybucji z pomijaniem poziomu 1:**

   ```typescript
   // Given: skip_level_1 = 1, dostępne poziomy [1,2,3]
   // When: calculateTroopDistribution()
   // Then: Poziom 1 jest pomijany, dystrybucja tylko na [2,3]
   ```

2. **Test obliczeń czasowych:**

   ```typescript
   // Given: Wioska A (busy: 3600s), Wioska B (available), Wioska C (locked)
   // When: calculateOptimalScheduleTime()
   // Then: Zwraca 0s (Wioska B gotowa od razu)
   ```

3. **Test parsowania czasu:**
   ```typescript
   // Given: "2:30:45"
   // When: parseTimeToSeconds()
   // Then: Zwraca 9045
   ```
