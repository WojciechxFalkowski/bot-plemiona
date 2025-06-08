# Village Construction Queue System

## 📋 Przegląd

System kolejki budowy dla wiosek (Village Construction Queue) to kompletne rozwiązanie do automatyzacji budowy budynków w grze Plemiona. System umożliwia dodawanie budynków do kolejki za pomocą intuicyjnego API, a następnie automatycznie realizuje budowę w grze.

## 🚀 Kluczowe Funkcjonalności

### 1. **API z nazwami wiosek**

- Zamiast używania ID wiosek, API akceptuje **nazwy wiosek** (np. "0001", "0002")
- Automatyczne mapowanie nazw na ID wewnętrznie
- Bardziej user-friendly dla użytkowników

### 2. **Pełna automatyzacja budowy**

- ✅ Dodawanie budynków do kolejki przez API
- ✅ Automatyczny procesor uruchamiany co 5 minut
- ✅ Logowanie do gry i nawigacja po wioskach
- ✅ Sprawdzanie poziomów budynków
- ✅ Klikanie przycisków budowy w grze
- ✅ Weryfikacja powodzenia operacji

### 3. **Zaawansowana walidacja**

- ✅ Walidacja wymagań budynków (level dependencies)
- ✅ Sprawdzanie maksymalnych poziomów
- ✅ Kontrola ciągłości poziomów (nie można pominąć poziomów)
- ✅ Sprawdzanie duplikatów w kolejce
- ✅ Scraping danych z gry w czasie rzeczywistym

### 4. **Inteligentne przetwarzanie**

- ✅ FIFO (First In, First Out) - najstarsze budynki mają priorytet
- ✅ Jeden budynek na wioskę na cykl
- ✅ Sprawdzanie miejsca w kolejce gry (max 2 sloty)
- ✅ Automatyczne usuwanie ukończonych/nieaktualnych budynków

## 🛠️ API Endpoints

### POST `/api/village-construction-queue`

**Dodaje budynek do kolejki budowy**

```json
{
  "villageName": "0001",
  "buildingId": "main",
  "targetLevel": 5
}
```

#### Parametry:

- `villageName` (string) - Nazwa wioski (np. "0001", "0002")
- `buildingId` (enum) - ID budynku zgodne z TRIBAL_WARS_BUILDINGS
- `targetLevel` (number) - Docelowy poziom budynku (1-30)

#### Dostępne buildingId:

```
main, wood, stone, iron, farm, storage, hide, place,
barracks, stable, garage, smith, wall, market, snob,
church, first_church, watchtower, statue
```

### GET `/api/village-construction-queue/village/:villageId`

**Pobiera kolejkę budowy dla wioski**

### DELETE `/api/village-construction-queue/:id`

**Usuwa budynek z kolejki**

### GET `/api/village-construction-queue/scrape-all-villages-queue`

**Pobiera dane o kolejkach ze wszystkich wiosek z gry**

## 📚 Przykłady użycia

### Swagger UI - Gotowe przykłady

API zawiera 19 gotowych przykładów dla wszystkich budynków na poziom 1:

- `Ratusz - main`
- `Tartak - wood`
- `Cegielnia - stone`
- `Huta Żelaza - iron`
- `Zagroda - farm`
- `Spichlerz - storage`
- `Schowek - hide`
- `Plac - place`
- `Koszary - barracks`
- `Stajnia - stable`
- `Warsztat - garage`
- `Kuźnia - smith`
- `Mur Obronny - wall`
- `Rynek - market`
- `Pałac - snob`
- `Kościół - church`
- `Pierwszy Kościół - first_church`
- `Wieża Strażnicza - watchtower`
- `Piedestał - statue`

### Przykład kompletnej sekwencji budowy

```bash
# 1. Dodaj Ratusz poziom 2
curl -X POST /api/village-construction-queue \
  -H "Content-Type: application/json" \
  -d '{"villageName": "0001", "buildingId": "main", "targetLevel": 2}'

# 2. Dodaj Tartak poziom 2 (wymaga Ratusz poziom 1)
curl -X POST /api/village-construction-queue \
  -H "Content-Type: application/json" \
  -d '{"villageName": "0001", "buildingId": "wood", "targetLevel": 2}'

# 3. Sprawdź kolejkę
curl -X GET /api/village-construction-queue/village/12142
```

## 🔧 Architektura systemu

### Struktura katalogów

```
src/village-construction-queue/
├── dto/
│   ├── create-construction-queue.dto.ts      # DTO wewnętrzne (villageId)
│   └── create-construction-queue-api.dto.ts  # DTO publiczne (villageName)
├── entities/
│   └── village-construction-queue.entity.ts  # Encja bazy danych
├── village-construction-queue.controller.ts  # API endpoints
├── village-construction-queue.service.ts     # Logika biznesowa
├── api-examples.ts                           # Przykłady Swagger
└── api-responses.ts                          # Definicje odpowiedzi API
```

### Przepływ danych

```
1. API Request (villageName)
   ↓
2. Controller: mapowanie nazwy → ID wioski
   ↓
3. Service: walidacja + scraping danych z gry
   ↓
4. Database: zapis do kolejki
   ↓
5. Processor (co 5 min): pobranie z kolejki
   ↓
6. Browser automation: logowanie + budowa
   ↓
7. Verification: sprawdzenie powodzenia
   ↓
8. Cleanup: usunięcie z bazy danych
```

## ⚙️ Automatyczny procesor

### Konfiguracja

```typescript
INTERVAL_TIME = 5 minut
MAX_RETRIES = 3
CLICK_TIMEOUT = 5 sekund
VERIFY_DELAY = 3 sekundy
```

### Algorytm przetwarzania

1. **Pobranie zadań** - najstarszy budynek z każdej wioski (FIFO)
2. **Logowanie** - jedna sesja przeglądarki dla całego batch'a
3. **Przetwarzanie sekwencyjne** - jedna wioska na raz
4. **Dla każdego budynku:**
   - Nawigacja do wioski
   - Sprawdzenie obecnego poziomu
   - Weryfikacja miejsca w kolejce gry (max 2)
   - Sprawdzenie dostępności budynku (przycisk vs czas)
   - Kliknięcie przycisku budowy
   - Weryfikacja powodzenia (sprawdzenie długości kolejki)
   - Usunięcie z bazy w przypadku sukcesu
5. **Zamknięcie przeglądarki**

## 🔍 Walidacja i kontrola błędów

### Walidacja przed dodaniem do kolejki

- ✅ Sprawdzenie istnienia wioski
- ✅ Walidacja buildingId i maxLevel
- ✅ Kontrola duplikatów
- ✅ **Live scraping** - sprawdzenie wymagań w grze
- ✅ **Kontrola ciągłości poziomów** - gra + kolejka gry + baza danych

### Obsługa błędów podczas przetwarzania

- ⚠️ **Budynek już zbudowany** → usunięcie z kolejki
- ⚠️ **Kolejka gry pełna** → ponowienie w następnym cyklu
- ⚠️ **Brak surowców** → logowanie czasu dostępności
- ⚠️ **Błąd kliknięcia** → retry z mechanizmem wykładniczego backoff
- ⚠️ **Błąd krytyczny** → kontynuacja z pozostałymi budynkami

## 📊 Logowanie i monitoring

### Logi informacyjne

```
🔄 Processing construction queue from database...
📋 Found 3 buildings to process across 2 villages
🏘️ Processing village 0001 (1/3): Ratusz Level 2
🔨 Attempting to build Ratusz Level 2
✅ Successfully added Ratusz Level 2 to game queue
```

### Logi błędów

```
❌ Village "0001" not found
⚠️ Game queue full (2/2 slots)
⏰ Tartak Level 3 - Resources available at dzisiaj o 23:22
🗑️ Removed from database: Already built
```

## 🎯 Korzyści systemu

### Dla użytkowników

- 🎮 **Przyjazne API** - nazwy wiosek zamiast ID
- 📝 **Gotowe przykłady** - 19 przykładów w Swagger UI
- 🔄 **Pełna automatyzacja** - ustaw i zapomnij
- 📊 **Transparentność** - szczegółowe logi operacji

### Dla programistów

- 🏗️ **Modułowa architektura** - czysta separacja warstw
- ✅ **Kompletna walidacja** - zarówno statyczna jak i dynamiczna
- 🔧 **Konfigurowalność** - łatwa zmiana parametrów
- 🛡️ **Odporność na błędy** - graceful degradation

## 🚦 Status implementacji

### ✅ Zaimplementowane

- [x] API controllers z mapowaniem nazw wiosek
- [x] Walidacja budynków i poziomów
- [x] Scraping danych z gry (poziomy, kolejka, dostępność)
- [x] Automatyczny procesor kolejki
- [x] Browser automation (nawigacja, klikanie)
- [x] Weryfikacja powodzenia operacji
- [x] Obsługa błędów i retry mechanisms
- [x] Szczegółowe logowanie
- [x] Dokumentacja API w Swagger

### 🎯 Możliwe rozszerzenia

- [ ] Dashboard web UI dla monitoringu kolejek
- [ ] Notyfikacje o ukończeniu budowy
- [ ] Optymalizacja kosztów (kolejność budowy)
- [ ] Integracja z systemem zasobów
- [ ] Planowanie długoterminowe (harmonogramy)

## 🔧 Konfiguracja

Aby uruchomić system:

1. **Skonfiguruj zmienne środowiskowe** w `.env`
2. **Ustaw ciasteczka Plemiona** przez API settings
3. **Uruchom aplikację** - `npm run start:dev`
4. **Sprawdź Swagger UI** - `http://localhost:3000/api`
5. **Dodaj budynki do kolejki** przez API
6. **Obserwuj logi** - automatyczny procesor działa co 5 minut

System jest gotowy do użycia w środowisku produkcyjnym! 🚀
