# Barbarian Villages Module

## 🎯 Opis

Moduł `barbarian-villages` jest odpowiedzialny za zarządzanie wioskami barbarzyńskimi w grze Plemiona. Zapewnia pełną funkcjonalność CRUD (Create, Read, Update, Delete) oraz automatyczne wykonywanie mini ataków na wskazane wioski.

## 📁 Struktura modułu

```
src/barbarian-villages/
├── README.md                           # Dokumentacja modułu
├── barbarian-villages.module.ts        # Główny moduł NestJS
├── barbarian-villages.controller.ts    # Controller z endpointami API
├── barbarian-villages.service.ts       # Serwis z logiką biznesową
├── barbarian-villages.service.contracts.ts  # Kontrakty dla DI
├── barbarian-villages.service.providers.ts  # Providery dla TypeORM
├── dto/                                # Data Transfer Objects
│   ├── index.ts
│   ├── barbarian-village.dto.ts        # DTO odpowiedzi
│   ├── create-barbarian-village.dto.ts # DTO tworzenia
│   └── update-barbarian-village.dto.ts # DTO aktualizacji
├── decorators/                         # Decoratory Swagger
│   ├── index.ts
│   ├── get-all-barbarian-villages.decorator.ts
│   ├── get-barbarian-village.decorator.ts
│   ├── create-barbarian-village.decorator.ts
│   ├── update-barbarian-village.decorator.ts
│   └── delete-barbarian-village.decorator.ts
└── entities/
    └── barbarian-village.entity.ts     # Entity TypeORM
```

## 🗄️ Model danych

### BarbarianVillageEntity

```typescript
interface BarbarianVillage {
    target: string;        // Unikalny ID wioski (klucz główny)
    name: string;          // Nazwa wioski
    coordinateX: number;   // Współrzędna X (0-1000)
    coordinateY: number;   // Współrzędna Y (0-1000)
    createdAt: Date;       // Data utworzenia
    updatedAt: Date;       // Data ostatniej aktualizacji
}
```

**Tabela bazy danych:** `barbarian_villages`

**Walidacja:**
- `target`: wymagane, string, unikalny
- `name`: wymagane, string
- `coordinateX`: wymagane, liczba całkowita 0-1000
- `coordinateY`: wymagane, liczba całkowita 0-1000

## 🌐 API Endpoints

Wszystkie endpointy są udokumentowane w Swagger UI pod tagiem `Barbarian Villages`.

### GET `/barbarian-villages`
**Opis:** Pobiera listę wszystkich wiosek barbarzyńskich  
**Odpowiedź:** `200` - Lista wiosek w formacie `BarbarianVillageDto[]`

### GET `/barbarian-villages/:target`
**Opis:** Pobiera szczegóły konkretnej wioski  
**Parametry:** `target` - ID wioski  
**Odpowiedź:** 
- `200` - Szczegóły wioski `BarbarianVillageDto`
- `404` - Wioska nie została znaleziona

### POST `/barbarian-villages`
**Opis:** Tworzy nową wioskę barbarzyńską  
**Body:** `CreateBarbarianVillageDto`  
**Odpowiedź:**
- `201` - Wioska utworzona `BarbarianVillageDto`
- `409` - Wioska o podanym target już istnieje
- `400` - Błędne dane wejściowe

### PUT `/barbarian-villages/:target`
**Opis:** Aktualizuje istniejącą wioskę  
**Parametry:** `target` - ID wioski  
**Body:** `UpdateBarbarianVillageDto`  
**Odpowiedź:**
- `200` - Wioska zaktualizowana `BarbarianVillageDto`
- `404` - Wioska nie została znaleziona

### DELETE `/barbarian-villages/:target`
**Opis:** Usuwa wioskę barbarzyńską  
**Parametry:** `target` - ID wioski  
**Odpowiedź:**
- `200` - Wioska usunięta
- `404` - Wioska nie została znaleziona

## ⚔️ Funkcjonalność ataków

### `executeMiniAttacks()`
**Opis:** Wykonuje automatyczne mini ataki na wioski barbarzyńskie

**Funkcjonalność:**
1. **Zarządzanie przeglądarką:** Automatyczne tworzenie i zamykanie sesji
2. **Logowanie:** Automatyczne logowanie do gry
3. **Pobieranie danych wojska:** Sprawdzanie dostępnych jednostek
4. **Cykliczne atakowanie:** Automatyczny wybór kolejnych celów
5. **Zapisywanie stanu:** Pamiętanie ostatniego atakowanego celu

**Konfiguracja ataków:**
- **Jednostki na atak:** 2 włócznie + 2 miecze
- **Cykle:** Automatyczne przechodzenie przez listę wiosek
- **Opóźnienia:** 2 sekundy między atakami
- **Logowanie:** Szczegółowe logi dla każdego ataku

**Wymagania:**
- Skonfigurowane credentials w zmiennych środowiskowych
- Dostępne jednostki (minimum 2 włócznie + 2 miecze)
- Wioski barbarzyńskie w bazie danych

## 🔧 Konfiguracja

### Dependencies
Moduł wymaga następujących zależności:
- `DatabaseModule` - połączenie z bazą danych
- `ConfigModule` - konfiguracja aplikacji
- `SettingsModule` - zarządzanie ustawieniami

### Zmienne środowiskowe
```env
# Credentials do gry Plemiona
PLEMIONA_USERNAME=your_username
PLEMIONA_WORLD=216

# Konfiguracja wioski
VILLAGE_ID=2197
```

### Ustawienia w bazie danych
- `MINI_ATTACKS_NEXT_TARGET_INDEX` - indeks następnego celu do ataku

## 📝 Przykłady użycia

### Tworzenie nowej wioski
```bash
curl -X POST http://localhost:3000/barbarian-villages \
  -H "Content-Type: application/json" \
  -d '{
    "target": "1101", 
    "name": "Wioska barbarzyńska", 
    "coordinateX": 542, 
    "coordinateY": 489
  }'
```

### Pobieranie wszystkich wiosek
```bash
curl http://localhost:3000/barbarian-villages
```

### Wykonanie ataków (programowo)
```typescript
// Wstrzyknięcie serwisu
constructor(
  private readonly barbarianVillagesService: BarbarianVillagesService
) {}

// Wykonanie ataków
async performAttacks() {
  const results = await this.barbarianVillagesService.executeMiniAttacks();
  console.log(`Wykonano ${results.length} ataków`);
}
```

## 🏗️ Architektura

### Separacja odpowiedzialności
- **Controller:** Obsługa HTTP requests i responses
- **Service:** Logika biznesowa i operacje na bazie danych
- **DTOs:** Walidacja i transformacja danych
- **Decorators:** Dokumentacja API (Swagger)
- **Entity:** Mapowanie bazy danych (TypeORM)

### Wzorce projektowe
- **Repository Pattern:** Przez TypeORM i custom providers
- **Dependency Injection:** NestJS DI container
- **Data Transfer Object:** Separacja warstw danych
- **Decorator Pattern:** Composable Swagger documentation

## 🔄 Integracja z innymi modułami

### CrawlerOrchestratorService
```typescript
// Orkestrator wywołuje mini ataki
await this.barbarianVillagesService.executeMiniAttacks();
```

### SettingsService
- Zarządzanie indeksem następnego celu
- Konfiguracja automatycznych ataków

### AttackUtils
- Wykonywanie rzeczywistych ataków w grze
- Logika wyboru kolejnych celów

## 🧪 Testowanie

### Przykładowe dane testowe
```sql
INSERT INTO barbarian_villages (target, name, coordinateX, coordinateY) VALUES
('1101', 'Wioska barbarzyńska 1', 542, 489),
('1102', 'Wioska barbarzyńska 2', 543, 490),
('1103', 'Wioska barbarzyńska 3', 544, 491);
```

### Testowanie API
Użyj Swagger UI pod adresem: `http://localhost:3000/api`

## 📊 Monitorowanie

### Logi
Serwis generuje szczegółowe logi:
- Info o załadowanych wioskach
- Progress ataków
- Błędy i sukcesy
- Stan wojska

### Metryki
- Liczba dostępnych wiosek
- Liczba wykonanych ataków
- Współczynnik sukcesu ataków

## 🚀 Deployment

Moduł jest automatycznie ładowany przez `app.module.ts` i nie wymaga dodatkowej konfiguracji do uruchomienia.

**Wymagania:**
- Node.js 18+
- PostgreSQL
- Poprawnie skonfigurowane zmienne środowiskowe 