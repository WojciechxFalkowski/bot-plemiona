# Wytyczne organizacji serwisów - Operations Pattern

## Cel

Zachowanie czytelności i utrzymywalności kodu serwisów poprzez wyodrębnienie operacji biznesowych do osobnych plików. Serwis pełni rolę orchestratora, który deleguje wykonanie do odpowiednich operacji.

## Problem

Duże serwisy (ponad 500-800 linii) stają się nieczytelne i trudne w utrzymaniu:
- Trudno znaleźć konkretną funkcjonalność
- Metody są długie i zawierają wiele odpowiedzialności
- Testowanie jest utrudnione
- Refaktoryzacja wymaga pracy z dużymi plikami
- Brak separacji odpowiedzialności wewnątrz serwisu

**Przykład**: `village-construction-queue.service.ts` ma **1467 linii** i jest bardzo nieczytelny.

## Rozwiązanie: Operations Pattern

### Zasada

**Serwis = Orchestrator** - zawiera tylko metody publiczne, które delegują wykonanie do operacji w folderze `operations/`.

**Operacja = Pojedyncza odpowiedzialność** - każda operacja biznesowa jest w osobnym pliku, pogrupowanym tematycznie w podfolderach.

### Struktura folderów modułu

```
{module-name}/
├── operations/                    # 📁 OPERACJE BIZNESOWE
│   ├── {category}/                # Kategoria operacji (cache, validation, etc.)
│   │   ├── {operation-name}.operation.ts
│   │   └── ...
│   └── index.ts                   # Eksport wszystkich operacji
├── {module}.service.ts           # Orchestrator - tylko delegacja
├── {module}.controller.ts
├── {module}.module.ts
├── dto/
├── entities/
├── decorators/
└── ...
```

### Kategoryzacja operacji

Operacje powinny być grupowane w podfolderach według odpowiedzialności:

- **`cache/`** - operacje związane z cache (zapisywanie, pobieranie, czyszczenie)
- **`validation/`** - walidacje (basic i advanced)
- **`queue-management/`** - CRUD operacje na kolejkach/zasobach
- **`queue-processing/`** - logika przetwarzania kolejek
- **`scraping/`** - operacje scrapowania danych
- **`browser/`** - zarządzanie sesjami przeglądarki
- **`calculations/`** - obliczenia (poziomy, maksima, statystyki)
- **`building-operations/`** - operacje związane z budowaniem/konstrukcją
- **`data-transformation/`** - transformacje danych
- **`notifications/`** - operacje powiadomień

**Uwaga**: Kategorie powinny być tworzone w zależności od potrzeb modułu. Nie wszystkie moduły potrzebują wszystkich kategorii.

### Format pliku operacji

Każdy plik operacji powinien:

1. **Eksportować pojedynczą funkcję** (lub logicznie powiązaną grupę)
2. **Mieć jasno zdefiniowane zależności** (dependencies injection)
3. **Być pure function** gdzie to możliwe (bez side effects)
4. **Mieć wyraźną odpowiedzialność**

#### Przykład struktury operacji

```typescript
// operations/validation/validate-village-exists.operation.ts

import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from '@/villages/entities/village.entity';

export interface ValidateVillageExistsDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Sprawdza czy wioska istnieje w bazie danych
 * @param villageId ID wioski do sprawdzenia
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Encja wioski jeśli istnieje
 * @throws NotFoundException jeśli wioska nie istnieje
 */
export async function validateVillageExistsOperation(
    villageId: string,
    deps: ValidateVillageExistsDependencies
): Promise<VillageEntity> {
    const { villageRepository, logger } = deps;
    
    const village = await villageRepository.findOne({
        where: { id: villageId }
    });

    if (!village) {
        logger.error(`Village ${villageId} not found`);
        throw new NotFoundException(`Village with ID ${villageId} not found`);
    }

    return village;
}
```

### Format serwisu (orchestrator)

Serwis powinien:

1. **Zawierać tylko metody publiczne** - delegujące do operacji
2. **Injektować zależności** przez constructor
3. **Być krótki i czytelny** - maksymalnie 200-300 linii
4. **Używać operacji** z folderu `operations/`

#### Przykład serwisu (orchestrator)

```typescript
// {module}.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { validateVillageExistsOperation } from './operations/validation/validate-village-exists.operation';
import { addToQueueOperation } from './operations/queue-management/add-to-queue.operation';
// ... inne operacje

@Injectable()
export class VillageConstructionQueueService {
    private readonly logger = new Logger(VillageConstructionQueueService.name);

    constructor(
        @Inject(VILLAGE_CONSTRUCTION_QUEUE_ENTITY_REPOSITORY)
        private readonly queueRepository: Repository<VillageConstructionQueueEntity>,
        @Inject(VILLAGES_ENTITY_REPOSITORY)
        private readonly villageRepository: Repository<VillageEntity>,
        // ... inne dependencies
    ) {}

    /**
     * Dodaje budynek do kolejki budowy
     */
    async addToQueue(dto: CreateConstructionQueueDto): Promise<VillageConstructionQueueEntity> {
        return addToQueueOperation(dto, {
            queueRepository: this.queueRepository,
            villageRepository: this.villageRepository,
            logger: this.logger,
            // ... przekazanie wszystkich potrzebnych dependencies
        });
    }

    /**
     * Sprawdza czy wioska istnieje
     */
    private async validateVillageExists(villageId: string): Promise<VillageEntity> {
        return validateVillageExistsOperation(villageId, {
            villageRepository: this.villageRepository,
            logger: this.logger,
        });
    }
}
```

### Konwencje nazewnictwa

#### Pliki operacji

- Format: `{operation-name}.operation.ts`
- Nazwa operacji powinna być **czasownikiem** opisującym akcję
- Używamy **kebab-case** dla nazw plików
- Nazwa powinna być **opisowa** i jednoznaczna

**Przykłady:**
- ✅ `validate-village-exists.operation.ts`
- ✅ `calculate-next-allowed-level.operation.ts`
- ✅ `scrape-village-building-data.operation.ts`
- ✅ `add-to-queue-from-cache.operation.ts`
- ❌ `validate.operation.ts` (zbyt ogólne)
- ❌ `helper.operation.ts` (nie opisowe)
- ❌ `utils.operation.ts` (nie opisowe)

#### Funkcje operacji

- Format: `{operationName}Operation`
- Używamy **camelCase** dla nazw funkcji
- Nazwa powinna odpowiadać nazwie pliku

**Przykłady:**
- ✅ `validateVillageExistsOperation`
- ✅ `calculateNextAllowedLevelOperation`
- ✅ `scrapeVillageBuildingDataOperation`

#### Interfejsy zależności

- Format: `{OperationName}Dependencies`
- Zawiera wszystkie zależności potrzebne do wykonania operacji

**Przykłady:**
- ✅ `ValidateVillageExistsDependencies`
- ✅ `CalculateNextAllowedLevelDependencies`

## Zalety Operations Pattern

1. ✅ **Czytelność** - każda operacja w osobnym, małym pliku
2. ✅ **Łatwe wyszukiwanie** - jasna struktura folderów
3. ✅ **Testowanie** - łatwe unit testy dla pojedynczych operacji
4. ✅ **Reużywalność** - operacje można używać w innych miejscach
5. ✅ **Separacja odpowiedzialności** - każdy plik ma jedną odpowiedzialność
6. ✅ **Skalowalność** - łatwo dodać nowe operacje
7. ✅ **Maintenance** - łatwiej utrzymać i refaktoryzować
8. ✅ **Code review** - łatwiejsze przeglądanie małych plików

## Kiedy używać Operations Pattern

### Obowiązkowo dla:

- Serwisów powyżej **800 linii** kodu
- Serwisów z **więcej niż 15 metodami**
- Serwisów z **złożoną logiką biznesową**
- Serwisów, które są **trudne do testowania**

### Opcjonalnie dla:

- Mniejszych serwisów z wyraźnymi kategoriami operacji
- Serwisów, które będą się rozrastać

### Nie wymagane dla:

- Prostych serwisów CRUD (< 300 linii)
- Serwisów z małą ilością logiki biznesowej

## Przykład migracji

### Przed refaktoryzacją

```typescript
// village-construction-queue.service.ts (1467 linii)

@Injectable()
export class VillageConstructionQueueService {
    // ... dependencies ...

    async addToQueue(dto: CreateConstructionQueueDto): Promise<VillageConstructionQueueEntity> {
        // 150 linii kodu z walidacją, scrapowaniem, etc.
    }

    private async validateVillageExists(villageId: string): Promise<VillageEntity> {
        // 20 linii kodu
    }

    private async validateBuildingConfig(buildingId: string, targetLevel: number) {
        // 30 linii kodu
    }

    // ... 30+ innych metod
}
```

### Po refaktoryzacji

```typescript
// village-construction-queue.service.ts (~200 linii - orchestrator)

@Injectable()
export class VillageConstructionQueueService {
    // ... dependencies ...

    async addToQueue(dto: CreateConstructionQueueDto): Promise<VillageConstructionQueueEntity> {
        return addToQueueOperation(dto, this.getDependencies());
    }
}

// operations/validation/validate-village-exists.operation.ts (~30 linii)
export async function validateVillageExistsOperation(...) { ... }

// operations/validation/validate-building-config.operation.ts (~40 linii)
export async function validateBuildingConfigOperation(...) { ... }
```

## Integracja z istniejącymi wzorcami

Operations Pattern współpracuje z istniejącymi wzorcami projektu:

- ✅ **Dependency Injection** - dependencies przekazywane przez interfejsy
- ✅ **Custom Providers** - operacje mogą używać tych samych providers
- ✅ **DTOs** - operacje używają DTOs z folderu `dto/`
- ✅ **Entities** - operacje używają entities z folderu `entities/`
- ✅ **Decorators** - serwis (orchestrator) pozostaje oznaczony przez dekoratory NestJS

## Best Practices

1. **Jedna odpowiedzialność** - każda operacja powinna robić jedną rzecz
2. **Pure functions** - gdzie to możliwe, unikaj side effects
3. **Type safety** - używaj TypeScript z pełnym typowaniem
4. **Error handling** - operacje powinny rzucać odpowiednie wyjątki
5. **Logging** - loguj ważne operacje przez przekazany logger
6. **Documentation** - dokumentuj operacje przez JSDoc
7. **Testing** - każda operacja powinna mieć testy jednostkowe

## Struktura przykładowego modułu

```
village-construction-queue/
├── operations/
│   ├── cache/
│   │   ├── cache-village-building-states.operation.ts
│   │   ├── get-cached-village-building-states.operation.ts
│   │   └── cleanup-expired-cache.operation.ts
│   ├── validation/
│   │   ├── validate-village-exists.operation.ts
│   │   ├── validate-building-config.operation.ts
│   │   ├── validate-no-duplicate-in-queue.operation.ts
│   │   ├── validate-building-requirements.operation.ts
│   │   └── validate-level-continuity.operation.ts
│   ├── queue-management/
│   │   ├── add-to-queue.operation.ts
│   │   ├── add-to-queue-from-cache.operation.ts
│   │   ├── get-queue-for-village.operation.ts
│   │   ├── get-all-queues.operation.ts
│   │   └── remove-from-queue.operation.ts
│   ├── queue-processing/
│   │   ├── process-and-check-construction-queue.operation.ts
│   │   ├── process-single-building.operation.ts
│   │   └── get-oldest-building-per-village.operation.ts
│   ├── scraping/
│   │   ├── scrape-village-queue.operation.ts
│   │   ├── scrape-all-villages-queue.operation.ts
│   │   └── scrape-village-building-data.operation.ts
│   ├── browser/
│   │   └── create-browser-session.operation.ts
│   ├── calculations/
│   │   ├── calculate-next-allowed-level.operation.ts
│   │   ├── calculate-next-allowed-level-from-cache.operation.ts
│   │   └── get-highest-level-from-game-queue.operation.ts
│   ├── building-operations/
│   │   ├── navigate-to-village-with-retry.operation.ts
│   │   ├── get-current-building-level.operation.ts
│   │   ├── attempt-to-build-with-retry.operation.ts
│   │   └── is-target-level-in-game-queue.operation.ts
│   └── index.ts
├── village-construction-queue.service.ts
├── village-construction-queue.controller.ts
├── village-construction-queue.module.ts
├── dto/
├── entities/
├── decorators/
└── ...
```

---

**Uwaga**: Ten dokument opisuje standardowy sposób organizacji kodu w serwisach backendu. Wszystkie nowe serwisy oraz refaktoryzacje istniejących powinny stosować się do tych wytycznych.
