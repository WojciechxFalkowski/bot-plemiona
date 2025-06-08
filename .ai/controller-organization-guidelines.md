# 📋 Wytyczne organizacji controllerów i struktury folderów

## 🎯 **Cel**

Zachowanie czystości i czytelności kodu controllerów poprzez wyodrębnienie dekoratorów i DTO do osobnych plików.

## 📁 **Struktura folderów dla każdego modułu**

```
src/{module-name}/
├── dto/                          # Data Transfer Objects
│   ├── index.ts                  # Eksport wszystkich DTO
│   ├── {entity}.dto.ts           # DTO dla pojedynczej encji
│   ├── {collection}.dto.ts       # DTO dla kolekcji encji
│   └── {operation}.dto.ts        # DTO dla specyficznych operacji
├── decorators/                   # Dekoratory Swagger per endpoint
│   ├── index.ts                  # Eksport wszystkich dekoratorów
│   ├── get-{resource}.decorator.ts
│   ├── create-{resource}.decorator.ts
│   ├── update-{resource}.decorator.ts
│   ├── delete-{resource}.decorator.ts
│   └── {custom-endpoint}.decorator.ts
├── {module}.controller.ts        # Główny kontroler (tylko logika)
├── {module}.service.ts
├── {module}.module.ts
└── ...
```

## 🎨 **Dekoratory**

### **Zasady tworzenia dekoratorów:**

1. **Jeden plik = jeden endpoint** - każdy endpoint ma swój osobny plik dekoratora
2. **Nazwnictwo**: `{action}-{resource}.decorator.ts`

   - `get-setting.decorator.ts`
   - `create-user.decorator.ts`
   - `update-plemiona-cookies.decorator.ts`

3. **Struktura dekoratora:**

```typescript
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { SomeDto } from '../dto';

export function GetResourceDecorators() {
  return applyDecorators(
    ApiOperation({
      summary: 'Krótki opis',
      description: 'Szczegółowy opis operacji',
    }),
    ApiParam({
      /* ... */
    }),
    ApiBody({
      /* ... */
    }),
    ApiResponse({ status: 200 /* ... */ }),
    ApiResponse({ status: 404 /* ... */ }),
    // dodatkowe dekoratory...
  );
}
```

4. **Import w kontrolerze:**

```typescript
import {
    GetResourceDecorators,
    CreateResourceDecorators,
    // ...
} from './decorators';

@Get(':id')
@GetResourceDecorators()
async getResource(@Param('id') id: string) {
    // tylko logika biznesowa
}
```

## 📝 **DTO (Data Transfer Objects)**

### **Zasady organizacji DTO:**

1. **Jeden plik = jedna klasa DTO**
2. **Nazwnictwo**: `{resource-name}.dto.ts`

   - `user.dto.ts`
   - `plemiona-cookie.dto.ts`
   - `auto-scavenging.dto.ts`

3. **Struktura DTO:**

```typescript
import { ApiProperty } from '@nestjs/swagger';

/**
 * Szczegółowy opis klasy DTO
 */
export class ResourceDto {
  @ApiProperty({
    example: 'przykład',
    description: 'Opis pola',
    required: true,
  })
  fieldName: string;
}
```

4. **Index file eksportuje wszystkie DTO:**

```typescript
export { ResourceDto } from './resource.dto';
export { AnotherDto } from './another.dto';
```

## 🚫 **Czego unikać w controllerach**

### **NIE ROBIĆ:**

- ❌ Umieszczania długich dekoratorów bezpośrednio przy metodach
- ❌ Definiowania DTO wewnątrz pliku kontrolera
- ❌ Tworzenia kontrolerów dłuższych niż 200 linii
- ❌ Mieszania logiki biznesowej z konfiguracją Swagger

### **ROBIĆ:**

- ✅ Wyodrębniać dekoratory do osobnych plików
- ✅ Trzymać DTO w dedykowanym folderze
- ✅ Fokusować kontroler tylko na logice endpointów
- ✅ Używać opisowych nazw funkcji dekoratorów

## 📊 **Metryki jakości**

### **Kontroler można uznać za "czysty" gdy:**

- Długość pliku nie przekracza 200 linii
- Każda metoda ma maksymalnie 1-2 dekoratory (zwykle tylko endpoint + custom decorator)
- Brak definicji DTO wewnątrz pliku
- Fokus na logice biznesowej, nie na konfiguracji

### **Przykład "przed" vs "po":**

**❌ PRZED (nieczytelne):**

```typescript
@Get(':key')
@ApiOperation({ summary: 'Get setting by key', description: '...' })
@ApiParam({ name: 'key', description: '...', example: '...' })
@ApiResponse({ status: 200, description: '...' })
@ApiResponse({ status: 404, description: '...' })
async getSetting(@Param('key') key: string) {
    // logika
}
```

**✅ PO (czytelne):**

```typescript
@Get(':key')
@GetSettingDecorators()
async getSetting(@Param('key') key: string) {
    // logika
}
```

## 🔄 **Refaktoring istniejących controllerów**

### **Proces refaktoringu:**

1. **Analiza** - sprawdź długość pliku i liczbę dekoratorów
2. **Wyodrębnienie DTO** - przenieś do `dto/` folder
3. **Wyodrębnienie dekoratorów** - stwórz pliki w `decorators/`
4. **Aktualizacja importów** - zaktualizuj główny kontroler
5. **Testowanie** - sprawdź czy wszystko kompiluje się poprawnie

### **Kiedy refaktorować:**

- Kontroler ma więcej niż 200 linii
- Więcej niż 3 dekoratory na metodę
- DTO są zdefiniowane w kontrolerze
- Trudno znaleźć logikę biznesową przez dekoratory

## 📚 **Przykłady implementacji**

### **Struktura po refaktoringu (src/settings/):**

```
settings/
├── dto/
│   ├── index.ts (3 eksporty)
│   ├── plemiona-cookie.dto.ts (42 linie)
│   ├── plemiona-cookies.dto.ts (44 linie)
│   └── auto-scavenging.dto.ts (14 linii)
├── decorators/
│   ├── index.ts (10 eksportów)
│   └── 10 plików dekoratorów (15-28 linii każdy)
└── settings.controller.ts (182 linie vs 325 przed)
```

### **Rezultat:**

- **44% redukcja** długości głównego kontrolera
- **Modularność** - każdy endpoint ma swój dekorator
- **Czytelność** - fokus na logice biznesowej
- **Łatwość utrzymania** - zmiany w jednym miejscu

---

## 🏆 **Podsumowanie**

Przestrzeganie tych wytycznych zapewni:

- 📖 **Czytelność** kodu
- 🔧 **Łatwość utrzymania**
- 🧪 **Testowalność** komponentów
- 🚀 **Skalowalność** projektu
- 👥 **Spójność** w zespole

**Pamiętaj**: Lepiej mieć więcej małych, wyspecjalizowanych plików niż jeden duży, nieuporządkowany kontroler!
