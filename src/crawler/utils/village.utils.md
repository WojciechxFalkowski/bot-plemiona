# VillageUtils - Product Requirements Document (PRD)

## Przegląd

`VillageUtils` to klasa utilities zawierająca wszystkie metody związane z zarządzaniem danymi wiosek w grze Plemiona. Klasa została wydzielona z głównego `CrawlerService` w celu poprawy modularności i umożliwienia zaawansowanego zarządzania informacjami o wioskach.

## Główne funkcjonalności

### 1. `collectVillageInformation(page: Page, options?: VillageCollectionOptions)`

**Cel:** Kompleksowa metoda zbierania wszystkich informacji o wioskach gracza.

**Przykład działania:**

```typescript
// Podstawowe użycie - zbiera wszystkie dane
const result = await VillageUtils.collectVillageInformation(page);

// Wynik:
{
  success: true,
  villagesProcessed: 15,
  villagesWithErrors: 1,
  totalVillages: 16,
  data: [/* VillageData[] */],
  errors: [
    {
      villageId: "12345",
      villageName: "Village A",
      error: "Navigation timeout",
      stage: "detailed"
    }
  ],
  processingTime: 45000
}

// Zaawansowane opcje
const advancedResult = await VillageUtils.collectVillageInformation(page, {
  includeDetailedData: true,       // Zbieraj szczegóły (budynki, armia)
  includeOverviewOnly: false,      // Nie tylko przegląd
  skipBrokenVillages: true,        // Pomijaj błędne wioski
  delayBetweenVillages: 2000,      // 2s opóźnienia między wioskami
  timeoutPerVillage: 45000         // 45s timeout na wioskę
});
```

**Algorytm działania:**

1. Zbiera podstawowe dane z przeglądu wiosek
2. Jeśli `includeOverviewOnly = true`, kończy tutaj
3. W przeciwnym razie zbiera szczegółowe dane dla każdej wioski
4. Obsługuje błędy zgodnie z `skipBrokenVillages`
5. Zwraca kompletny raport z czasami i błędami

---

### 2. `collectVillageOverviewData(page: Page)`

**Cel:** Zbiera podstawowe dane wszystkich wiosek z ekranu przeglądu.

**Przykład działania:**

```typescript
const villages = await VillageUtils.collectVillageOverviewData(page);

// Przykładowy wynik:
[
  {
    id: '12345',
    name: 'Wioska 1',
    coordinates: '456|789',
    points: 8234,
    resources: { wood: 15000, clay: 12000, iron: 8000 },
    storage: 24000,
    population: { current: 7800, max: 8000 },
  },
  {
    id: '12346',
    name: 'Wioska 2',
    coordinates: '457|790',
    points: 12456,
    resources: { wood: 20000, clay: 18000, iron: 15000 },
    storage: 24000,
    population: { current: 7950, max: 8000 },
  },
];
```

**Proces zbierania:**

- Nawiguje do strony przeglądu wiosek
- Czeka na załadowanie tabeli
- Wyciąga dane z każdego wiersza tabeli
- Parsuje surowce, punkty, populację
- Loguje zebrane dane

---

### 3. `collectDetailedVillageData(page, villageData, options?)`

**Cel:** Zbiera szczegółowe informacje dla każdej wioski (budynki, armia, kolejki).

**Przykład działania:**

```typescript
const detailedResult = await VillageUtils.collectDetailedVillageData(
  page,
  basicVillageData,
  {
    skipBrokenVillages: true,
    delayBetweenVillages: 1500,
    timeoutPerVillage: 30000,
  },
);

// Wzbogacone dane wiosek:
[
  {
    id: '12345',
    name: 'Wioska 1',
    // ... dane podstawowe ...
    buildingLevels: {
      headquarters: 20,
      barracks: 15,
      stable: 10,
      workshop: 5,
      timber_camp: 25,
      clay_pit: 25,
      iron_mine: 25,
      farm: 20,
      warehouse: 15,
      wall: 8,
    },
    armyUnits: {
      barracks: { spear: 150, sword: 80, axe: 120, archer: 200 },
      stable: {
        scout: 50,
        light_cavalry: 40,
        mounted_archer: 30,
        heavy_cavalry: 20,
      },
      workshop: { ram: 5, catapult: 3 },
      church: { paladin: 1 },
    },
    buildQueue: [
      { building: 'headquarters', level: 21, timeRemaining: '2:15:30' },
    ],
    researchQueue: [
      { technology: 'Improved Swords', timeRemaining: '1:45:00' },
    ],
  },
];
```

**Strategia zbierania:**

- Dla każdej wioski nawiguje do jej ekranu głównego
- Zbiera poziomy budynków z interfejsu
- Zbiera liczby jednostek z koszar/stajni/warsztatu
- Sprawdza kolejki budowy i badań
- Obsługuje timeouty i błędy na poziomie wioski

---

### 4. `validateVillageData(village: VillageData)`

**Cel:** Waliduje kompletność i poprawność danych wioski.

**Przykład działania:**

```typescript
// Poprawne dane:
const validVillage = {
  id: "12345",
  name: "Wioska 1",
  coordinates: "456|789",
  points: 8234,
  resources: { wood: 15000, clay: 12000, iron: 8000 },
  storage: 24000,
  population: { current: 7800, max: 8000 }
};

const validation1 = VillageUtils.validateVillageData(validVillage);
// Wynik:
{
  isValid: true,
  village: validVillage,
  issues: []
}

// Niepoprawne dane:
const invalidVillage = {
  id: "",                           // Puste ID
  name: "Wioska 2",
  coordinates: "invalid_coords",    // Zły format
  points: -100,                     // Ujemne punkty
  resources: { wood: -500, clay: 12000, iron: 8000 }, // Ujemne surowce
  storage: 24000,
  population: { current: 8100, max: 8000 } // Przekroczona populacja
};

const validation2 = VillageUtils.validateVillageData(invalidVillage);
// Wynik:
{
  isValid: false,
  village: invalidVillage,
  issues: [
    { field: "id", issue: "Village ID is missing or empty", severity: "error" },
    { field: "coordinates", issue: "Invalid coordinate format (should be XXX|YYY)", severity: "warning" },
    { field: "points", issue: "Points cannot be negative", severity: "error" },
    { field: "resources", issue: "Resource values cannot be negative", severity: "error" },
    { field: "population", issue: "Current population exceeds maximum", severity: "warning" }
  ]
}
```

**Reguły walidacji:**

- **ID:** Nie może być puste
- **Nazwa:** Nie może być pusta
- **Współrzędne:** Format XXX|YYY
- **Punkty:** Nie mogą być ujemne
- **Populacja:** current ≤ max, wartości ≥ 0
- **Surowce:** Nie mogą być ujemne
- **Magazyn:** Musi być > 0

---

### 5. `filterVillages(villages: VillageData[], criteria: VillageFilterCriteria)`

**Cel:** Filtruje wioski według różnych kryteriów.

**Przykład działania:**

```typescript
const allVillages = [
  /* lista wiosek */
];

// Filtr 1: Wioski z wolną farmą i minimum 5000 punktów
const highPointVillages = VillageUtils.filterVillages(allVillages, {
  minPoints: 5000,
  hasFreeFarm: true,
});

// Filtr 2: Wioski z surowcami w określonym zakresie populacji
const farmingVillages = VillageUtils.filterVillages(allVillages, {
  minPopulation: 6000,
  maxPopulation: 7500,
  hasResources: true,
});

// Filtr 3: Wioski według wzorca nazwy i współrzędnych
const specificVillages = VillageUtils.filterVillages(allVillages, {
  namePattern: 'Farm.*', // Regex: nazwy zaczynające się od "Farm"
  coordinates: ['456|789', '457|790'], // Tylko te współrzędne
  excludeCoordinates: ['500|500'], // Wyklucz te współrzędne
});

// Filtr 4: Kombinowany
const combinedFilter = VillageUtils.filterVillages(allVillages, {
  minPoints: 8000,
  maxPoints: 15000,
  hasFreeFarm: true,
  hasResources: true,
  namePattern: '(Obr|Def).*', // Wioski obronne
});
```

**Dostępne kryteria:**

- `minPoints/maxPoints` - zakres punktów
- `minPopulation/maxPopulation` - zakres populacji
- `hasFreeFarm` - czy ma wolną farmę
- `hasResources` - czy ma jakiekolwiek surowce
- `namePattern` - regex dla nazwy
- `coordinates` - lista dozwolonych współrzędnych
- `excludeCoordinates` - lista wykluczonych współrzędnych

---

### 6. `sortVillages(villages: VillageData[], criteria: VillageSortCriteria)`

**Cel:** Sortuje wioski według wybranego kryterium.

**Przykład działania:**

```typescript
// Sortowanie według punktów (malejąco)
const byPoints = VillageUtils.sortVillages(villages, {
  field: 'points',
  direction: 'desc',
});

// Sortowanie według nazwy (rosnąco)
const byName = VillageUtils.sortVillages(villages, {
  field: 'name',
  direction: 'asc',
});

// Sortowanie według populacji (malejąco)
const byPopulation = VillageUtils.sortVillages(villages, {
  field: 'population',
  direction: 'desc',
});

// Sortowanie według surowców (suma, malejąco)
const byResources = VillageUtils.sortVillages(villages, {
  field: 'resources',
  direction: 'desc',
});

// Sortowanie według współrzędnych (rosnąco)
const byCoordinates = VillageUtils.sortVillages(villages, {
  field: 'coordinates',
  direction: 'asc',
});
```

**Dostępne pola sortowania:**

- `name` - alfabetycznie według nazwy
- `points` - według liczby punktów
- `population` - według bieżącej populacji
- `resources` - według sumy wszystkich surowców
- `coordinates` - według współrzędnych (string)

---

### 7. `calculateVillageStatistics(villages: VillageData[])`

**Cel:** Oblicza szczegółowe statystyki dla grupy wiosek.

**Przykład działania:**

```typescript
const stats = VillageUtils.calculateVillageStatistics(villages);

// Wynik:
{
  totalVillages: 15,
  totalPoints: 156780,
  averagePoints: 10452.0,
  totalPopulation: 117500,
  averagePopulation: 7833.33,
  totalResources: {
    wood: 245000,
    clay: 198000,
    iron: 167000
  },
  averageResources: {
    wood: 16333.33,
    clay: 13200.0,
    iron: 11133.33
  },
  villagesWithFreeFarm: 12,        // 12 wiosek ma wolną farmę
  villagesWithFullStorage: 3       // 3 wioski mają ≥90% wypełnienia magazynu
}

// Dla pustej listy:
const emptyStats = VillageUtils.calculateVillageStatistics([]);
// Zwraca wszystkie wartości = 0
```

**Obliczane metryki:**

- Łączne/średnie punkty i populacja
- Łączne/średnie surowce (każdy typ osobno)
- Liczba wiosek z wolną farmą
- Liczba wiosek z pełnym magazynem (≥90%)

---

### 8. `findBestVillagesFor(villages, purpose, limit?)`

**Cel:** Znajduje najlepsze wioski do określonego celu.

**Przykład działania:**

```typescript
// Najlepsze wioski do zbieractwa (wolna farma + wysokie punkty)
const scavengingVillages = VillageUtils.findBestVillagesFor(
  villages,
  'scavenging',
  5,
);
// Zwraca: 5 wiosek z wolną farmą posortowanych według punktów (malejąco)

// Najlepsze wioski do farmowania (dużo surowców)
const farmingVillages = VillageUtils.findBestVillagesFor(
  villages,
  'farming',
  3,
);
// Zwraca: 3 wioski z największą sumą surowców

// Najlepsze wioski do obrony (punkty + poziom muru)
const defenseVillages = VillageUtils.findBestVillagesFor(
  villages,
  'defense',
  10,
);
// Zwraca: 10 wiosek z najwyższym wynikiem (punkty + poziom_muru*100)

// Domyślne sortowanie (według punktów)
const defaultBest = VillageUtils.findBestVillagesFor(
  villages,
  'unknown_purpose',
);
// Zwraca: 5 wiosek z najwyższymi punktami
```

**Dostępne cele:**

- `scavenging` - filtruje wioski z wolną farmą, sortuje według punktów
- `farming` - sortuje według sumy surowców
- `defense` - sortuje według punktów + poziom muru
- `*` (inne) - domyślnie sortuje według punktów

---

### 9. `exportVillageData(villages, options: VillageExportOptions)`

**Cel:** Eksportuje dane wiosek do różnych formatów.

**Przykład działania:**

```typescript
// Eksport do JSON (z szczegółami)
const jsonData = VillageUtils.exportVillageData(villages, {
  format: 'json',
  includeDetailedData: true,
});

// Wynik (fragment):
`{
  "id": "12345",
  "name": "Wioska 1",
  "coordinates": "456|789", 
  "points": 8234,
  "resources": { "wood": 15000, "clay": 12000, "iron": 8000 },
  "buildingLevels": { "headquarters": 20, ... },
  "armyUnits": { "barracks": { "spear": 150, ... }, ... }
}`;

// Eksport do CSV (bez szczegółów)
const csvData = VillageUtils.exportVillageData(villages, {
  format: 'csv',
  includeDetailedData: false,
});

// Wynik:
`id,name,coordinates,points,resources,storage,population
12345,Wioska 1,456|789,8234,"{""wood"":15000,""clay"":12000,""iron"":8000}",24000,"{""current"":7800,""max"":8000}"
12346,Wioska 2,457|790,12456,"{""wood"":20000,""clay"":18000,""iron"":15000}",24000,"{""current"":7950,""max"":8000}"`;

// Eksport do XML
const xmlData = VillageUtils.exportVillageData(villages, {
  format: 'xml',
  includeDetailedData: true,
});

// Wynik:
`<?xml version="1.0" encoding="UTF-8"?>
<villages>
  <village>
    <id>12345</id>
    <name>Wioska 1</name>
    <coordinates>456|789</coordinates>
    <points>8234</points>
    <!-- ... więcej danych ... -->
  </village>
</villages>`;
```

**Opcje eksportu:**

- `format` - 'json' | 'csv' | 'xml'
- `includeDetailedData` - czy uwzględnić buildingLevels, armyUnits, kolejki
- `compressOutput` - (przyszłość) kompresja
- `filename` - (przyszłość) nazwa pliku

---

### 10. Metody cache'owania

**Cel:** Optymalizacja poprzez tymczasowe przechowywanie danych w pamięci.

**Przykład działania:**

```typescript
// Cache'owanie danych
VillageUtils.cacheVillageData('player_villages', villages, {
  ttl: 600000, // 10 minut TTL
});

// Pobieranie z cache
const cachedVillages = VillageUtils.getCachedVillageData('player_villages');
if (cachedVillages) {
  console.log('Using cached data');
  // Użyj cachedVillages
} else {
  console.log('Cache miss, fetching fresh data');
  // Pobierz świeże dane
}

// Czyszczenie cache
VillageUtils.clearCache('player_villages'); // Konkretny klucz
VillageUtils.clearCache(); // Cały cache
```

**Funkcje cache:**

- `cacheVillageData(key, data, options)` - zapisuje dane
- `getCachedVillageData(key)` - odczytuje dane (null jeśli brak/expired)
- `clearCache(key?)` - czyści cache (konkretny klucz lub wszystko)

---

### 11. Metody logowania

**Cel:** Strukturalne logowanie danych wiosek z różnymi poziomami szczegółowości.

**Przykład działania:**

```typescript
// Logowanie przeglądu wiosek
VillageUtils.logVillageOverviewData(villages);
// Wyświetla:
// === VILLAGE OVERVIEW DATA ===
// Village 1:
//   ID: 12345
//   Name: Wioska 1
//   Coordinates: 456|789
//   Points: 8,234
//   Resources: Wood=15,000, Clay=12,000, Iron=8,000
//   Storage: 24,000
//   Population: 7800/8000
//   ---
// === TOTAL VILLAGES: 15 ===

// Logowanie szczegółów wioski
VillageUtils.logDetailedVillageData(village, 1, {
  includeResources: true,
  includeBuildings: true,
  includeArmy: false, // Pomiń armię
  includeQueues: true,
  detailLevel: 'detailed', // Maksymalny poziom
});

// Wyświetla:
// === DETAILED DATA FOR VILLAGE 1: Wioska 1 ===
// ID: 12345, Coordinates: 456|789, Points: 8,234
// Resources: Wood=15,000, Clay=12,000, Iron=8,000
// Storage: 24,000, Population: 7800/8000
// Building Levels:
//   Military: Barracks=15, Stable=10, Workshop=5
//   Resources: Timber=25, Clay=25, Iron=25
//   Infrastructure: HQ=20, Farm=20, Warehouse=15, Wall=8
// Build Queue:
//   1. headquarters Level 21 - 2:15:30 remaining
// Research Queue: Empty
// ---
```

**Opcje logowania:**

- `includeResources` - czy logować surowce
- `includeBuildings` - czy logować poziomy budynków
- `includeArmy` - czy logować jednostki armii
- `includeQueues` - czy logować kolejki budowy/badań
- `detailLevel` - 'minimal' | 'standard' | 'detailed'

---

## Interfejsy

### `VillageCollectionOptions`

```typescript
interface VillageCollectionOptions {
  includeDetailedData?: boolean; // Czy zbierać szczegóły (domyślnie true)
  includeOverviewOnly?: boolean; // Czy tylko przegląd (domyślnie false)
  skipBrokenVillages?: boolean; // Czy pomijać błędne (domyślnie true)
  delayBetweenVillages?: number; // Opóźnienie w ms (domyślnie 1000)
  timeoutPerVillage?: number; // Timeout w ms (domyślnie 30000)
}
```

### `VillageCollectionResult`

```typescript
interface VillageCollectionResult {
  success: boolean; // Czy operacja się udała
  villagesProcessed: number; // Liczba przetworzonych
  villagesWithErrors: number; // Liczba z błędami
  totalVillages: number; // Całkowita liczba
  data: VillageData[]; // Zebrane dane
  errors: VillageCollectionError[]; // Lista błędów
  processingTime: number; // Czas w ms
}
```

### `VillageFilterCriteria`

```typescript
interface VillageFilterCriteria {
  minPoints?: number;
  maxPoints?: number;
  minPopulation?: number;
  maxPopulation?: number;
  hasFreeFarm?: boolean;
  hasResources?: boolean;
  namePattern?: string; // Regex pattern
  coordinates?: string[]; // Lista do uwzględnienia
  excludeCoordinates?: string[]; // Lista do wykluczenia
}
```

## Obsługa błędów

Wszystkie metody obsługują błędy poprzez:

- **Szczegółowe logowanie** z poziomami (error, warn, info, debug)
- **Graceful degradation** - kontynuowanie przy błędach częściowych
- **Strukturalne raporty błędów** z informacją o etapie i przyczynie
- **Timeout handling** z konfigurowalnymi wartościami
- **Walidacja danych** z kategoryzowanymi problemami

### Przykłady błędów:

```typescript
// Błąd nawigacji:
{
  villageId: "12345",
  villageName: "Wioska 1",
  error: "TimeoutError: Timeout 30000ms exceeded",
  stage: "navigation"
}

// Błąd zbierania szczegółów:
{
  villageId: "12346",
  villageName: "Wioska 2",
  error: "Cannot read property 'textContent' of null",
  stage: "detailed"
}

// Błąd walidacji:
{
  field: "coordinates",
  issue: "Invalid coordinate format (should be XXX|YYY)",
  severity: "warning"
}
```

## Zależności

### Zewnętrzne:

- `playwright` - Page
- `@nestjs/common` - Logger

### Wewnętrzne:

- `../pages/village-overview.page` - VillageOverviewPage, VillageData
- `../pages/village-detail.page` - VillageDetailPage
- `./village.interfaces` - Wszystkie interfejsy TypeScript

## Performance i optymalizacja

### Cache system:

- **In-memory cache** z TTL
- **Automatyczne czyszczenie** wygasłych wpisów
- **Kopiowanie danych** (defensive copying)

### Batch processing:

- **Konfigurowalne opóźnienia** między wioskami
- **Timeout per village** dla stabilności
- **Skip strategy** dla błędnych wiosek

### Algorytmy filtrowania:

- **Efektywne filtrowanie** z early returns
- **Optymalizowane sortowanie** z custom comparatorami
- **Lazy evaluation** gdzie możliwe

## Testowanie

### Przykładowe scenariusze testowe:

1. **Test zbierania danych:**

   ```typescript
   // Given: Zalogowany gracz z 5 wioskami
   // When: collectVillageInformation() z domyślnymi opcjami
   // Then: Zwraca 5 wiosek z wszystkimi danymi, success=true
   ```

2. **Test filtrowania:**

   ```typescript
   // Given: 10 wiosek, 3 z wolną farmą
   // When: filterVillages() z hasFreeFarm=true
   // Then: Zwraca dokładnie 3 wioski
   ```

3. **Test walidacji:**

   ```typescript
   // Given: Wioska z ujemnymi punktami
   // When: validateVillageData()
   // Then: isValid=false, issues zawiera błąd severity='error'
   ```

4. **Test cache:**

   ```typescript
   // Given: Dane w cache z TTL=1s
   // When: Czekaj 2s i pobierz getCachedVillageData()
   // Then: Zwraca null (wygasł)
   ```

5. **Test eksportu:**
   ```typescript
   // Given: 2 wioski z pełnymi danymi
   // When: exportVillageData() format='json'
   // Then: Zwraca poprawny JSON string
   ```
