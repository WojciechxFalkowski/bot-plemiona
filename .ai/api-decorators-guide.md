# API Decorators Guide - NestJS & Swagger

## Spis treści

1. [Wprowadzenie](#wprowadzenie)
2. [Architektura dekoratorów](#architektura-dekoratorów)
3. [Struktura katalogów](#struktura-katalogów)
4. [Typy dekoratorów Swagger](#typy-dekoratorów-swagger)
5. [Proces tworzenia dekoratora](#proces-tworzenia-dekoratora)
6. [Wzorce dla różnych HTTP methods](#wzorce-dla-różnych-http-methods)
7. [Integracja z kontrolerem](#integracja-z-kontrolerem)
8. [DTOs i dokumentacja API](#dtos-i-dokumentacja-api)
9. [Best practices](#best-practices)
10. [Przykłady implementacji](#przykłady-implementacji)
11. [Troubleshooting](#troubleshooting)

---

## Wprowadzenie

### Cel dokumentu

Niniejszy dokument opisuje kompletny proces tworzenia i organizacji dekoratorów API dla kontrolerów NestJS z automatyczną dokumentacją Swagger/OpenAPI. Guide jest oparty na wzorcach wykorzystanych w module `servers` i stanowi standard dla całego projektu.

### Dlaczego custom decorators?

#### ✅ Zalety:

1. **DRY (Don't Repeat Yourself)** - eliminacja duplikacji kodu dokumentacji API
2. **Centralizacja** - wszystkie dekoratory w jednym miejscu
3. **Spójność** - jednolita dokumentacja w całym API
4. **Czytelność** - kontrolery są czytelniejsze (single decorator zamiast 5-10)
5. **Łatwość utrzymania** - zmiana dokumentacji w jednym miejscu
6. **Typowanie** - lepsze wsparcie TypeScript
7. **Skalowalność** - łatwe dodawanie nowych endpointów

#### ❌ Bez custom decorators:

```typescript
// Kontroler staje się nieczytelny
@Get()
@ApiOperation({ summary: 'Get all servers' })
@ApiQuery({ name: 'includeInactive', required: false })
@ApiResponse({ status: 200, description: 'List of servers' })
@ApiResponse({ status: 500, description: 'Internal server error' })
async findAll(@Query('includeInactive') includeInactive?: boolean) {
    // ...
}
```

#### ✅ Z custom decorators:

```typescript
// Kontroler jest czysty i czytelny
@Get()
@GetAllServersDecorators()
async findAll(@Query('includeInactive') includeInactive?: boolean) {
    // ...
}
```

---

## Architektura dekoratorów

### Wzorzec Composite Decorator

Projekt wykorzystuje wzorzec **Composite Decorator** z NestJS, który pozwala na łączenie wielu dekoratorów w jeden przy pomocy funkcji `applyDecorators()`.

```typescript
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function MyCustomDecorator() {
    return applyDecorators(
        ApiOperation({ /* ... */ }),
        ApiResponse({ /* ... */ }),
        // Więcej dekoratorów...
    );
}
```

### Komponenty dekoratora

Każdy custom decorator składa się z:

1. **Import dekoratorów** - z `@nestjs/common` i `@nestjs/swagger`
2. **Funkcja factory** - zwraca wynik `applyDecorators()`
3. **Dekoratory Swagger** - dokumentacja API
4. **Typy DTO** - dla response bodies

---

## Struktura katalogów

### Organizacja plików w module

```
src/
└── [module-name]/                    # np. servers, users, products
    ├── entities/                     # TypeORM entities
    │   └── [entity].entity.ts
    ├── dto/                          # Data Transfer Objects
    │   ├── create-[entity].dto.ts
    │   ├── update-[entity].dto.ts
    │   ├── [entity]-response.dto.ts
    │   └── index.ts                  # Eksport wszystkich DTOs
    ├── decorators/                   # Custom API decorators
    │   ├── create-[entity].decorator.ts
    │   ├── get-all-[entities].decorator.ts
    │   ├── get-[entity]-by-id.decorator.ts
    │   ├── update-[entity].decorator.ts
    │   ├── delete-[entity].decorator.ts
    │   └── index.ts                  # Eksport wszystkich dekoratorów
    ├── [module].controller.ts        # HTTP endpoints
    ├── [module].service.ts           # Business logic
    ├── [module].service.providers.ts # DI providers
    ├── [module].service.contracts.ts # DI constants
    └── [module].module.ts            # NestJS module
```

### Konwencje nazewnictwa

#### Pliki dekoratorów:

| Typ operacji | Konwencja nazwy pliku | Przykład |
|--------------|----------------------|----------|
| **GET all** | `get-all-[entities].decorator.ts` | `get-all-servers.decorator.ts` |
| **GET one by ID** | `get-[entity]-by-id.decorator.ts` | `get-server-by-id.decorator.ts` |
| **GET one by code/slug** | `get-[entity]-by-[field].decorator.ts` | `get-server-by-code.decorator.ts` |
| **POST create** | `create-[entity].decorator.ts` | `create-server.decorator.ts` |
| **PUT/PATCH update** | `update-[entity].decorator.ts` | `update-server.decorator.ts` |
| **DELETE** | `delete-[entity].decorator.ts` | `delete-server.decorator.ts` |
| **Utility/Custom** | `[action]-[entity].decorator.ts` | `is-server-active.decorator.ts` |

#### Funkcje dekoratorów:

| Typ operacji | Konwencja nazwy funkcji | Przykład |
|--------------|------------------------|----------|
| **GET all** | `GetAll[Entities]Decorators()` | `GetAllServersDecorators()` |
| **GET one** | `Get[Entity]ById/ByCode/etc.Decorators()` | `GetServerByIdDecorators()` |
| **POST** | `Create[Entity]Decorators()` | `CreateServerDecorators()` |
| **PUT/PATCH** | `Update[Entity]Decorators()` | `UpdateServerDecorators()` |
| **DELETE** | `Delete[Entity]Decorators()` | `DeleteServerDecorators()` |
| **Custom** | `[Action][Entity]Decorators()` | `IsServerActiveDecorators()` |

**Zasady:**
- PascalCase dla funkcji
- Suffix `Decorators` (liczba mnoga!)
- Czasownik na początku (Get, Create, Update, Delete)
- Entity w liczbie pojedynczej (Server, User, Product)
- Dla list: liczba mnoga (GetAllServers, GetActiveServers)

---

## Typy dekoratorów Swagger

### Przegląd dekoratorów @nestjs/swagger

| Dekorator | Cel | Użycie |
|-----------|-----|--------|
| `@ApiOperation()` | Opis endpointu | Zawsze wymagane |
| `@ApiResponse()` | Dokumentacja odpowiedzi HTTP | Wielokrotnie dla różnych statusów |
| `@ApiParam()` | Parametry URL (path params) | Dla `:id`, `:code`, etc. |
| `@ApiQuery()` | Query parameters | Dla `?search=`, `?page=`, etc. |
| `@ApiBody()` | Request body | Rzadko (domyślnie z DTO) |
| `@ApiTags()` | Grupowanie w Swagger UI | Na poziomie kontrolera |
| `@ApiBearerAuth()` | Dokumentacja JWT auth | Dla chronionych endpointów |

### ApiOperation

Podstawowy opis endpointu:

```typescript
ApiOperation({ 
    summary: 'Krótki opis (1 linijka)',
    description: 'Dłuższy opis funkcjonalności endpointu'
})
```

**Zasady:**
- `summary` - krótkie (2-5 słów), konkretne
- `description` - opcjonalne, dla złożonych endpointów
- Używaj polskiego języka (zgodnie z projektem)
- Rozpoczynaj czasownikiem (Pobiera, Tworzy, Aktualizuje, Usuwa)

### ApiResponse

Dokumentacja odpowiedzi HTTP:

```typescript
ApiResponse({
    status: 200,                    // HTTP status code
    description: 'Opis odpowiedzi', // Co oznacza ten status
    type: ServerResponseDto,        // Typ odpowiedzi (DTO)
    // LUB
    schema: {                       // Custom schema
        type: 'boolean',
        example: true
    }
})
```

**Powszechne status codes:**

| Status | Znaczenie | Kiedy używać |
|--------|-----------|--------------|
| **200** | OK | GET, PUT - sukces z danymi |
| **201** | Created | POST - zasób utworzony |
| **204** | No Content | DELETE - sukces bez danych |
| **400** | Bad Request | Błędne dane wejściowe (validation) |
| **404** | Not Found | Zasób nie istnieje |
| **409** | Conflict | Konflikt (duplikat, constraint) |
| **500** | Internal Server Error | Błąd serwera |

### ApiParam

Parametry URL (path parameters):

```typescript
ApiParam({ 
    name: 'id',                     // Nazwa parametru z URL
    type: 'number',                 // Typ (number, string)
    description: 'ID serwera',      // Opis parametru
    example: 1                      // Przykładowa wartość
})
```

**Użycie:**
```typescript
@Get(':id')           // :id w URL
@ApiParam({ name: 'id', type: 'number' })

@Get('code/:serverCode')  // :serverCode w URL
@ApiParam({ name: 'serverCode', type: 'string' })
```

### ApiQuery

Query parameters (?key=value):

```typescript
ApiQuery({
    name: 'includeInactive',       // Nazwa parametru
    required: false,               // Czy wymagany
    type: Boolean,                 // Typ TypeScript
    description: 'Opis parametru', // Co robi
    example: true                  // Przykład
})
```

**Użycie:**
```typescript
@Get()
@ApiQuery({ name: 'search', required: false, type: String })
async search(@Query('search') search?: string) { }
```

---

## Proces tworzenia dekoratora

### Krok 1: Określ typ endpointu

Zidentyfikuj:
- HTTP method (GET, POST, PUT, DELETE)
- Path parameters (`:id`, `:code`)
- Query parameters (`?includeInactive=true`)
- Request body (DTO)
- Response type (DTO)
- Możliwe status codes

### Krok 2: Przygotuj DTOs

Upewnij się że masz:
- **Request DTO** - dla POST/PUT (np. `CreateServerDto`)
- **Response DTO** - dla odpowiedzi (np. `ServerResponseDto`)
- **Export w index.ts** - dla łatwego importu

```typescript
// dto/index.ts
export { CreateServerDto } from './create-server.dto';
export { UpdateServerDto } from './update-server.dto';
export { ServerResponseDto } from './server-response.dto';
```

### Krok 3: Stwórz plik dekoratora

```typescript
// decorators/[action]-[entity].decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EntityResponseDto } from '../dto';

export function ActionEntityDecorators() {
    return applyDecorators(
        // Dekoratory tutaj
    );
}
```

### Krok 4: Dodaj ApiOperation

```typescript
ApiOperation({ 
    summary: 'Krótki opis',
    description: 'Dłuższy opis (opcjonalnie)'
})
```

### Krok 5: Dodaj ApiParam (jeśli są path params)

```typescript
ApiParam({ 
    name: 'id', 
    type: 'number', 
    description: 'ID zasobu',
    example: 1
})
```

### Krok 6: Dodaj ApiQuery (jeśli są query params)

```typescript
ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Czy uwzględnić nieaktywne'
})
```

### Krok 7: Dodaj ApiResponse dla statusów

```typescript
// Success response
ApiResponse({
    status: 200,
    description: 'Sukces',
    type: EntityResponseDto
}),

// Error responses
ApiResponse({
    status: 404,
    description: 'Nie znaleziono'
}),

ApiResponse({
    status: 400,
    description: 'Błędne dane'
})
```

### Krok 8: Eksportuj w index.ts

```typescript
// decorators/index.ts
export { ActionEntityDecorators } from './action-entity.decorator';
```

### Krok 9: Użyj w kontrolerze

```typescript
import { ActionEntityDecorators } from './decorators';

@Controller('entities')
export class EntitiesController {
    @Get(':id')
    @ActionEntityDecorators()
    async findOne(@Param('id') id: number) {
        // ...
    }
}
```

---

## Wzorce dla różnych HTTP methods

### GET - Lista zasobów (GET /resources)

```typescript
// decorators/get-all-[entities].decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { EntityResponseDto } from '../dto';

export function GetAllEntitiesDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera wszystkie zasoby',
            description: 'Zwraca listę wszystkich zasobów z opcjonalnymi filtrami'
        }),
        ApiQuery({
            name: 'search',
            required: false,
            type: String,
            description: 'Wyszukiwanie po nazwie'
        }),
        ApiQuery({
            name: 'page',
            required: false,
            type: Number,
            description: 'Numer strony',
            example: 1
        }),
        ApiQuery({
            name: 'limit',
            required: false,
            type: Number,
            description: 'Liczba wyników na stronę',
            example: 10
        }),
        ApiResponse({
            status: 200,
            description: 'Lista zasobów',
            type: [EntityResponseDto]  // ⚠️ Tablica!
        })
    );
}
```

**Użycie w kontrolerze:**
```typescript
@Get()
@GetAllEntitiesDecorators()
async findAll(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
): Promise<EntityResponseDto[]> {
    return this.service.findAll({ search, page, limit });
}
```

### GET - Pojedynczy zasób (GET /resources/:id)

```typescript
// decorators/get-[entity]-by-id.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { EntityResponseDto } from '../dto';

export function GetEntityByIdDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera zasób po ID',
            description: 'Zwraca szczegóły zasobu o podanym ID'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number', 
            description: 'ID zasobu',
            example: 1
        }),
        ApiResponse({
            status: 200,
            description: 'Zasób znaleziony',
            type: EntityResponseDto
        }),
        ApiResponse({
            status: 404,
            description: 'Zasób nie został znaleziony'
        })
    );
}
```

**Użycie w kontrolerze:**
```typescript
@Get(':id')
@GetEntityByIdDecorators()
async findOne(@Param('id', ParseIntPipe) id: number): Promise<EntityResponseDto> {
    return this.service.findOne(id);
}
```

### GET - Filtrowane (GET /resources/active, /resources/code/:code)

#### Przykład 1: Lista filtrowana

```typescript
// decorators/get-active-[entities].decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EntityResponseDto } from '../dto';

export function GetActiveEntitiesDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera aktywne zasoby',
            description: 'Zwraca tylko zasoby oznaczone jako aktywne'
        }),
        ApiResponse({
            status: 200,
            description: 'Lista aktywnych zasobów',
            type: [EntityResponseDto]
        })
    );
}
```

#### Przykład 2: Po innym parametrze

```typescript
// decorators/get-[entity]-by-code.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { EntityResponseDto } from '../dto';

export function GetEntityByCodeDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera zasób po kodzie',
            description: 'Zwraca zasób o podanym unikalnym kodzie'
        }),
        ApiParam({ 
            name: 'code', 
            type: 'string', 
            description: 'Unikalny kod zasobu',
            example: 'ABC123'
        }),
        ApiResponse({
            status: 200,
            description: 'Zasób znaleziony',
            type: EntityResponseDto
        }),
        ApiResponse({
            status: 404,
            description: 'Zasób nie został znaleziony'
        })
    );
}
```

**Użycie w kontrolerze:**
```typescript
@Get('code/:code')
@GetEntityByCodeDecorators()
async findByCode(@Param('code') code: string): Promise<EntityResponseDto> {
    return this.service.findByCode(code);
}
```

### POST - Tworzenie zasobu (POST /resources)

```typescript
// decorators/create-[entity].decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EntityResponseDto } from '../dto';

export function CreateEntityDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Tworzy nowy zasób',
            description: 'Dodaje nowy zasób do bazy danych'
        }),
        ApiResponse({
            status: 201,
            description: 'Zasób został utworzony',
            type: EntityResponseDto
        }),
        ApiResponse({
            status: 400,
            description: 'Nieprawidłowe dane wejściowe'
        }),
        ApiResponse({
            status: 409,
            description: 'Zasób już istnieje (konflikt)'
        })
    );
}
```

**Użycie w kontrolerze:**
```typescript
@Post()
@CreateEntityDecorators()
async create(@Body() createDto: CreateEntityDto): Promise<EntityResponseDto> {
    return this.service.create(createDto);
}
```

**⚠️ Uwaga:** Request body jest automatycznie dokumentowane przez `@Body()` decorator wraz z DTO, nie trzeba używać `@ApiBody()`.

### PUT/PATCH - Aktualizacja zasobu (PUT /resources/:id)

```typescript
// decorators/update-[entity].decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { EntityResponseDto } from '../dto';

export function UpdateEntityDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Aktualizuje zasób',
            description: 'Modyfikuje dane istniejącego zasobu'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number', 
            description: 'ID zasobu',
            example: 1
        }),
        ApiResponse({
            status: 200,
            description: 'Zasób został zaktualizowany',
            type: EntityResponseDto
        }),
        ApiResponse({
            status: 404,
            description: 'Zasób nie został znaleziony'
        }),
        ApiResponse({
            status: 400,
            description: 'Nieprawidłowe dane wejściowe'
        }),
        ApiResponse({
            status: 409,
            description: 'Konflikt - nowe dane już istnieją'
        })
    );
}
```

**Użycie w kontrolerze:**
```typescript
@Put(':id')
@UpdateEntityDecorators()
async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEntityDto
): Promise<EntityResponseDto> {
    return this.service.update(id, updateDto);
}
```

### DELETE - Usuwanie zasobu (DELETE /resources/:id)

```typescript
// decorators/delete-[entity].decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function DeleteEntityDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Usuwa zasób',
            description: 'Usuwa zasób z bazy danych wraz z powiązanymi danymi'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number', 
            description: 'ID zasobu',
            example: 1
        }),
        ApiResponse({
            status: 204,
            description: 'Zasób został usunięty'
        }),
        ApiResponse({
            status: 404,
            description: 'Zasób nie został znaleziony'
        })
    );
}
```

**Użycie w kontrolerze:**
```typescript
@Delete(':id')
@DeleteEntityDecorators()
async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.service.remove(id);
}
```

**⚠️ Uwaga:** DELETE zwykle zwraca status 204 (No Content) bez body.

### Custom/Utility endpoints

Dla specyficznych operacji biznesowych:

```typescript
// decorators/is-[entity]-active.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function IsEntityActiveDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Sprawdza czy zasób jest aktywny',
            description: 'Zwraca true jeśli zasób istnieje i jest aktywny'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number', 
            description: 'ID zasobu',
            example: 1
        }),
        ApiResponse({
            status: 200,
            description: 'Status aktywności zasobu',
            schema: { 
                type: 'boolean',
                example: true
            }
        })
    );
}
```

**Użycie:**
```typescript
@Get(':id/active')
@IsEntityActiveDecorators()
async isActive(@Param('id', ParseIntPipe) id: number): Promise<boolean> {
    return this.service.isActive(id);
}
```

---

## Integracja z kontrolerem

### Struktura kontrolera z dekoratorami

```typescript
// [module].controller.ts
import { 
    Controller, 
    Get, 
    Post, 
    Put, 
    Delete, 
    Param, 
    Body, 
    Query,
    ParseIntPipe,
    Logger 
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EntityService } from './entity.service';
import { CreateEntityDto, UpdateEntityDto, EntityResponseDto } from './dto';
import {
    GetAllEntitiesDecorators,
    GetEntityByIdDecorators,
    CreateEntityDecorators,
    UpdateEntityDecorators,
    DeleteEntityDecorators
} from './decorators';

@ApiTags('Entities')  // Grupowanie w Swagger UI
@Controller('entities')
export class EntitiesController {
    private readonly logger = new Logger(EntitiesController.name);

    constructor(private readonly entityService: EntityService) {}

    @Get()
    @GetAllEntitiesDecorators()
    async findAll(
        @Query('search') search?: string
    ): Promise<EntityResponseDto[]> {
        this.logger.log(`Finding all entities (search: ${search})`);
        return this.entityService.findAll(search);
    }

    @Get(':id')
    @GetEntityByIdDecorators()
    async findOne(
        @Param('id', ParseIntPipe) id: number
    ): Promise<EntityResponseDto> {
        this.logger.log(`Finding entity by ID: ${id}`);
        return this.entityService.findOne(id);
    }

    @Post()
    @CreateEntityDecorators()
    async create(
        @Body() createDto: CreateEntityDto
    ): Promise<EntityResponseDto> {
        this.logger.log(`Creating entity`);
        return this.entityService.create(createDto);
    }

    @Put(':id')
    @UpdateEntityDecorators()
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateEntityDto
    ): Promise<EntityResponseDto> {
        this.logger.log(`Updating entity ID: ${id}`);
        return this.entityService.update(id, updateDto);
    }

    @Delete(':id')
    @DeleteEntityDecorators()
    async remove(
        @Param('id', ParseIntPipe) id: number
    ): Promise<void> {
        this.logger.log(`Deleting entity ID: ${id}`);
        await this.entityService.remove(id);
    }
}
```

### Import dekoratorów

#### ✅ DOBRE - Import z index.ts:

```typescript
import {
    GetAllEntitiesDecorators,
    GetEntityByIdDecorators,
    CreateEntityDecorators,
    UpdateEntityDecorators,
    DeleteEntityDecorators
} from './decorators';  // Z index.ts
```

#### ❌ ZŁE - Import bezpośredni:

```typescript
import { GetAllEntitiesDecorators } from './decorators/get-all-entities.decorator';
import { GetEntityByIdDecorators } from './decorators/get-entity-by-id.decorator';
// ... i tak dalej (dużo linii)
```

### Kolejność dekoratorów

```typescript
@Get(':id')                      // 1. HTTP method decorator
@GetEntityByIdDecorators()       // 2. Custom decorator (dokumentacja)
@UseGuards(JwtAuthGuard)         // 3. Guards (jeśli są)
@UsePipes(ValidationPipe)        // 4. Pipes (jeśli są)
async findOne() { }
```

---

## DTOs i dokumentacja API

### Response DTO

Response DTO służy do:
1. Dokumentacji struktury odpowiedzi w Swagger
2. Type safety w TypeScript
3. Automatycznej walidacji (opcjonalnie)

```typescript
// dto/[entity]-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class EntityResponseDto {
    @ApiProperty({
        description: 'ID zasobu',
        example: 1
    })
    id: number;

    @ApiProperty({
        description: 'Nazwa zasobu',
        example: 'Example Name'
    })
    name: string;

    @ApiProperty({
        description: 'Czy zasób jest aktywny',
        example: true
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Data utworzenia',
        example: '2024-01-15T10:30:00Z'
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Data ostatniej aktualizacji',
        example: '2024-01-15T10:30:00Z'
    })
    updatedAt: Date;

    @ApiProperty({
        description: 'Powiązany obiekt (opcjonalnie)',
        type: RelatedEntityDto,
        required: false
    })
    relatedEntity?: RelatedEntityDto;
}
```

### Request DTO (Create)

```typescript
// dto/create-[entity].dto.ts
import { 
    IsString, 
    IsBoolean, 
    IsOptional, 
    Length, 
    IsNotEmpty 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEntityDto {
    @ApiProperty({
        description: 'Nazwa zasobu',
        example: 'Example Name',
        minLength: 1,
        maxLength: 100
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 100)
    name: string;

    @ApiProperty({
        description: 'Opis zasobu',
        example: 'Detailed description',
        required: false
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Czy zasób jest aktywny',
        example: true,
        required: false,
        default: true
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;
}
```

### Request DTO (Update)

```typescript
// dto/update-[entity].dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateEntityDto } from './create-entity.dto';

export class UpdateEntityDto extends PartialType(CreateEntityDto) {}
```

**⚠️ Uwaga:** `PartialType` z `@nestjs/swagger` (nie z `@nestjs/mapped-types`) zachowuje dekoratory Swagger!

### Eksport DTOs

```typescript
// dto/index.ts
export { CreateEntityDto } from './create-entity.dto';
export { UpdateEntityDto } from './update-entity.dto';
export { EntityResponseDto } from './entity-response.dto';
```

---

## Best Practices

### 1. Konwencje nazewnictwa

#### ✅ DOBRE:

```typescript
// Pliki
get-all-servers.decorator.ts
create-server.decorator.ts
update-server.decorator.ts

// Funkcje
GetAllServersDecorators()
CreateServerDecorators()
UpdateServerDecorators()

// Zmienne
const servers = await this.service.findAll();
```

#### ❌ ZŁE:

```typescript
// Pliki
getAllServers.decorator.ts          // camelCase zamiast kebab-case
server-get-all.decorator.ts         // Zła kolejność
ServersGetAll.decorator.ts          // PascalCase w nazwie pliku

// Funkcje
getAllServersDecorator()            // Brak 's' na końcu
getAllServersDecorators             // Brak nawiasów ()
get_all_servers_decorators()        // snake_case
```

### 2. Struktura dekoratora

#### ✅ DOBRE:

```typescript
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EntityResponseDto } from '../dto';

export function GetEntityByIdDecorators() {
    return applyDecorators(
        // 1. Najpierw ApiOperation
        ApiOperation({ 
            summary: 'Pobiera zasób po ID',
            description: 'Zwraca szczegóły zasobu'
        }),
        
        // 2. Parametry (ApiParam, ApiQuery)
        ApiParam({ 
            name: 'id', 
            type: 'number',
            description: 'ID zasobu',
            example: 1
        }),
        
        // 3. Success response
        ApiResponse({
            status: 200,
            description: 'Zasób znaleziony',
            type: EntityResponseDto
        }),
        
        // 4. Error responses (malejąco po status code)
        ApiResponse({
            status: 404,
            description: 'Zasób nie został znaleziony'
        }),
        
        ApiResponse({
            status: 400,
            description: 'Nieprawidłowe ID'
        })
    );
}
```

#### ❌ ZŁE:

```typescript
// Brak kolejności, chaotyczna struktura
export function GetEntityByIdDecorators() {
    return applyDecorators(
        ApiResponse({ status: 404 }),
        ApiParam({ name: 'id' }),
        ApiResponse({ status: 200 }),
        ApiOperation({ summary: 'Get entity' })
    );
}
```

### 3. Opisywanie endpointów

#### ✅ DOBRE - Jasne, konkretne opisy:

```typescript
ApiOperation({ 
    summary: 'Pobiera wszystkie serwery',
    description: 'Zwraca listę wszystkich serwerów z opcją uwzględnienia nieaktywnych'
})

ApiResponse({
    status: 200,
    description: 'Lista serwerów została pomyślnie pobrana',
    type: [ServerResponseDto]
})

ApiResponse({
    status: 404,
    description: 'Serwer o podanym ID nie został znaleziony'
})
```

#### ❌ ZŁE - Ogólnikowe, nieużyteczne:

```typescript
ApiOperation({ 
    summary: 'Get',          // Zbyt ogólne
    description: 'Gets data'  // Nieużyteczne
})

ApiResponse({
    status: 200,
    description: 'OK'        // Nic nie mówi
})

ApiResponse({
    status: 404,
    description: 'Error'     // Zbyt ogólne
})
```

### 4. Używanie typów DTO

#### ✅ DOBRE - Import i użycie DTO:

```typescript
import { EntityResponseDto } from '../dto';

ApiResponse({
    status: 200,
    description: 'Lista zasobów',
    type: [EntityResponseDto]  // Tablica
})

ApiResponse({
    status: 200,
    description: 'Pojedynczy zasób',
    type: EntityResponseDto    // Pojedynczy obiekt
})
```

#### ❌ ZŁE - Brak type lub inline schema:

```typescript
// Brak dokumentacji typu
ApiResponse({
    status: 200,
    description: 'Success'
    // Brak type - Swagger nie wie jaką strukturę zwraca
})

// Inline schema (tylko dla prostych typów!)
ApiResponse({
    status: 200,
    schema: {
        type: 'object',
        properties: {
            id: { type: 'number' },
            name: { type: 'string' }
        }
    }
    // Trudne w utrzymaniu, duplikacja
})
```

### 5. Organizacja plików

#### ✅ DOBRE - Jeden dekorator na plik:

```
decorators/
├── get-all-servers.decorator.ts
├── get-server-by-id.decorator.ts
├── create-server.decorator.ts
├── update-server.decorator.ts
├── delete-server.decorator.ts
└── index.ts
```

#### ❌ ZŁE - Wszystko w jednym pliku:

```
decorators/
└── servers.decorators.ts  // 500+ linii kodu
```

### 6. Eksport dekoratorów

#### ✅ DOBRE - Użyj index.ts:

```typescript
// decorators/index.ts
export { GetAllServersDecorators } from './get-all-servers.decorator';
export { GetServerByIdDecorators } from './get-server-by-id.decorator';
export { CreateServerDecorators } from './create-server.decorator';
export { UpdateServerDecorators } from './update-server.decorator';
export { DeleteServerDecorators } from './delete-server.decorator';
```

Wtedy w kontrolerze:
```typescript
import {
    GetAllServersDecorators,
    GetServerByIdDecorators
} from './decorators';  // Czyste!
```

#### ❌ ZŁE - Bezpośrednie importy:

```typescript
import { GetAllServersDecorators } from './decorators/get-all-servers.decorator';
import { GetServerByIdDecorators } from './decorators/get-server-by-id.decorator';
// ... 10 więcej linii
```

### 7. Status codes

#### Kompletna lista dla każdego typu:

| HTTP Method | Success | Error codes |
|-------------|---------|-------------|
| **GET all** | 200 | - |
| **GET one** | 200 | 404 |
| **POST** | 201 | 400, 409 |
| **PUT/PATCH** | 200 | 400, 404, 409 |
| **DELETE** | 204 | 404 |

**Zawsze dokumentuj:**
- ✅ Success status (200, 201, 204)
- ✅ 404 dla endpointów z `:id`
- ✅ 400 dla endpointów z request body
- ✅ 409 dla konfliktów (duplikaty, constraints)

### 8. Przykłady w dokumentacji

#### ✅ DOBRE - Zawsze podawaj example:

```typescript
ApiParam({ 
    name: 'id', 
    type: 'number',
    description: 'ID serwera',
    example: 1  // ✅ Ułatwia testowanie w Swagger UI
})

ApiQuery({
    name: 'search',
    type: String,
    example: 'pl216'  // ✅
})
```

#### ❌ ZŁE - Brak przykładów:

```typescript
ApiParam({ 
    name: 'id', 
    type: 'number',
    description: 'ID serwera'
    // ❌ Brak example
})
```

### 9. Język dokumentacji

W tym projekcie używamy **polskiego języka** w dokumentacji API:

#### ✅ DOBRE:

```typescript
ApiOperation({ 
    summary: 'Pobiera wszystkie serwery',
    description: 'Zwraca listę wszystkich serwerów'
})
```

#### ❌ ZŁE (dla tego projektu):

```typescript
ApiOperation({ 
    summary: 'Get all servers',
    description: 'Returns list of all servers'
})
```

### 10. Komentarze w kodzie

#### ✅ DOBRE - Tylko gdy dodają wartość:

```typescript
export function GetEntityByIdDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera zasób po ID',
            description: 'Zwraca szczegóły zasobu wraz z relacjami'
        }),
        
        // Parametr ID musi być liczbą całkowitą dodatnią
        ApiParam({ 
            name: 'id', 
            type: 'number',
            description: 'ID zasobu',
            example: 1
        }),
        
        // ... rest
    );
}
```

#### ❌ ZŁE - Oczywiste komentarze:

```typescript
// Import decorators  ❌ Oczywiste
import { applyDecorators } from '@nestjs/common';

// Export function  ❌ Oczywiste
export function GetEntityByIdDecorators() {
    // Return decorators  ❌ Oczywiste
    return applyDecorators(
        // API Operation  ❌ Oczywiste
        ApiOperation({ /* ... */ })
    );
}
```

---

## Przykłady implementacji

### Przykład 1: Prosty CRUD

#### Moduł: Products

```typescript
// products/decorators/get-all-products.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductResponseDto } from '../dto';

export function GetAllProductsDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera wszystkie produkty',
            description: 'Zwraca listę wszystkich produktów'
        }),
        ApiResponse({
            status: 200,
            description: 'Lista produktów',
            type: [ProductResponseDto]
        })
    );
}
```

```typescript
// products/decorators/get-product-by-id.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ProductResponseDto } from '../dto';

export function GetProductByIdDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera produkt po ID',
            description: 'Zwraca szczegóły produktu o podanym ID'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number',
            description: 'ID produktu',
            example: 1
        }),
        ApiResponse({
            status: 200,
            description: 'Produkt znaleziony',
            type: ProductResponseDto
        }),
        ApiResponse({
            status: 404,
            description: 'Produkt nie został znaleziony'
        })
    );
}
```

```typescript
// products/decorators/create-product.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductResponseDto } from '../dto';

export function CreateProductDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Tworzy nowy produkt',
            description: 'Dodaje nowy produkt do katalogu'
        }),
        ApiResponse({
            status: 201,
            description: 'Produkt został utworzony',
            type: ProductResponseDto
        }),
        ApiResponse({
            status: 400,
            description: 'Nieprawidłowe dane wejściowe'
        }),
        ApiResponse({
            status: 409,
            description: 'Produkt z tym SKU już istnieje'
        })
    );
}
```

```typescript
// products/decorators/update-product.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ProductResponseDto } from '../dto';

export function UpdateProductDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Aktualizuje produkt',
            description: 'Modyfikuje dane istniejącego produktu'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number',
            description: 'ID produktu',
            example: 1
        }),
        ApiResponse({
            status: 200,
            description: 'Produkt został zaktualizowany',
            type: ProductResponseDto
        }),
        ApiResponse({
            status: 404,
            description: 'Produkt nie został znaleziony'
        }),
        ApiResponse({
            status: 400,
            description: 'Nieprawidłowe dane wejściowe'
        })
    );
}
```

```typescript
// products/decorators/delete-product.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function DeleteProductDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Usuwa produkt',
            description: 'Usuwa produkt z katalogu'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number',
            description: 'ID produktu',
            example: 1
        }),
        ApiResponse({
            status: 204,
            description: 'Produkt został usunięty'
        }),
        ApiResponse({
            status: 404,
            description: 'Produkt nie został znaleziony'
        })
    );
}
```

```typescript
// products/decorators/index.ts
export { GetAllProductsDecorators } from './get-all-products.decorator';
export { GetProductByIdDecorators } from './get-product-by-id.decorator';
export { CreateProductDecorators } from './create-product.decorator';
export { UpdateProductDecorators } from './update-product.decorator';
export { DeleteProductDecorators } from './delete-product.decorator';
```

```typescript
// products/products.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './dto';
import {
    GetAllProductsDecorators,
    GetProductByIdDecorators,
    CreateProductDecorators,
    UpdateProductDecorators,
    DeleteProductDecorators
} from './decorators';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    @GetAllProductsDecorators()
    findAll(): Promise<ProductResponseDto[]> {
        return this.productsService.findAll();
    }

    @Get(':id')
    @GetProductByIdDecorators()
    findOne(@Param('id', ParseIntPipe) id: number): Promise<ProductResponseDto> {
        return this.productsService.findOne(id);
    }

    @Post()
    @CreateProductDecorators()
    create(@Body() createDto: CreateProductDto): Promise<ProductResponseDto> {
        return this.productsService.create(createDto);
    }

    @Put(':id')
    @UpdateProductDecorators()
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateProductDto
    ): Promise<ProductResponseDto> {
        return this.productsService.update(id, updateDto);
    }

    @Delete(':id')
    @DeleteProductDecorators()
    remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.productsService.remove(id);
    }
}
```

### Przykład 2: Endpointy z query parameters

```typescript
// products/decorators/search-products.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ProductResponseDto } from '../dto';

export function SearchProductsDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Wyszukuje produkty',
            description: 'Wyszukuje produkty według różnych kryteriów z paginacją'
        }),
        ApiQuery({
            name: 'search',
            required: false,
            type: String,
            description: 'Fraza do wyszukania w nazwie lub opisie',
            example: 'laptop'
        }),
        ApiQuery({
            name: 'category',
            required: false,
            type: String,
            description: 'Filtrowanie po kategorii',
            example: 'electronics'
        }),
        ApiQuery({
            name: 'minPrice',
            required: false,
            type: Number,
            description: 'Minimalna cena',
            example: 100
        }),
        ApiQuery({
            name: 'maxPrice',
            required: false,
            type: Number,
            description: 'Maksymalna cena',
            example: 1000
        }),
        ApiQuery({
            name: 'page',
            required: false,
            type: Number,
            description: 'Numer strony (od 1)',
            example: 1
        }),
        ApiQuery({
            name: 'limit',
            required: false,
            type: Number,
            description: 'Liczba wyników na stronę',
            example: 10
        }),
        ApiResponse({
            status: 200,
            description: 'Lista produktów spełniających kryteria',
            type: [ProductResponseDto]
        })
    );
}
```

**Użycie:**
```typescript
@Get('search')
@SearchProductsDecorators()
async search(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
): Promise<ProductResponseDto[]> {
    return this.productsService.search({
        search,
        category,
        minPrice,
        maxPrice,
        page,
        limit
    });
}
```

### Przykład 3: Nested resources (Sub-resources)

```typescript
// products/decorators/get-product-reviews.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ReviewResponseDto } from '../dto';

export function GetProductReviewsDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera recenzje produktu',
            description: 'Zwraca wszystkie recenzje dla danego produktu'
        }),
        ApiParam({ 
            name: 'productId', 
            type: 'number',
            description: 'ID produktu',
            example: 1
        }),
        ApiResponse({
            status: 200,
            description: 'Lista recenzji produktu',
            type: [ReviewResponseDto]
        }),
        ApiResponse({
            status: 404,
            description: 'Produkt nie został znaleziony'
        })
    );
}
```

**Użycie:**
```typescript
@Get(':productId/reviews')
@GetProductReviewsDecorators()
async getReviews(
    @Param('productId', ParseIntPipe) productId: number
): Promise<ReviewResponseDto[]> {
    return this.reviewsService.findByProductId(productId);
}
```

### Przykład 4: Bulk operations

```typescript
// products/decorators/bulk-update-products.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function BulkUpdateProductsDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Masowa aktualizacja produktów',
            description: 'Aktualizuje wiele produktów jednocześnie'
        }),
        ApiResponse({
            status: 200,
            description: 'Produkty zostały zaktualizowane',
            schema: {
                type: 'object',
                properties: {
                    updated: { 
                        type: 'number',
                        example: 5
                    },
                    failed: { 
                        type: 'number',
                        example: 0
                    }
                }
            }
        }),
        ApiResponse({
            status: 400,
            description: 'Nieprawidłowe dane wejściowe'
        })
    );
}
```

### Przykład 5: Boolean utility endpoint

```typescript
// servers/decorators/is-server-active-by-code.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function IsServerActiveByCodeDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Sprawdza czy serwer jest aktywny po kodzie',
            description: 'Zwraca true jeśli serwer o podanym kodzie istnieje i jest aktywny'
        }),
        ApiParam({ 
            name: 'serverCode', 
            type: 'string',
            description: 'Kod serwera',
            example: 'pl216'
        }),
        ApiResponse({
            status: 200,
            description: 'Status aktywności serwera',
            schema: { 
                type: 'boolean',
                example: true
            }
        })
    );
}
```

**Użycie:**
```typescript
@Get('code/:serverCode/active')
@IsServerActiveByCodeDecorators()
async isServerActiveByCode(
    @Param('serverCode') serverCode: string
): Promise<boolean> {
    return this.serversService.isServerActiveByCode(serverCode);
}
```

---

## Troubleshooting

### Problem 1: Dekoratory nie pojawiają się w Swagger UI

**Objawy:**
- Endpoint jest dostępny przez API
- Nie ma go w dokumentacji Swagger
- Brak błędów w konsoli

**Rozwiązania:**

1. **Sprawdź czy main.ts ma konfigurację Swagger:**

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    
    // Konfiguracja Swagger
    const config = new DocumentBuilder()
        .setTitle('API Title')
        .setDescription('API Description')
        .setVersion('1.0')
        .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);  // Dostępne na /api
    
    await app.listen(3000);
}
```

2. **Sprawdź czy kontroler ma @ApiTags:**

```typescript
@ApiTags('Servers')  // ✅ Wymagane!
@Controller('servers')
export class ServersController { }
```

3. **Zrestartuj aplikację** - Swagger nie hot-reload

### Problem 2: Response type nie pojawia się w Swagger

**Objawy:**
- Endpoint jest w Swagger
- Brak schematu odpowiedzi lub pokazuje "any"

**Rozwiązania:**

1. **Sprawdź import DTO:**

```typescript
// ✅ DOBRE
import { EntityResponseDto } from '../dto';

ApiResponse({
    type: EntityResponseDto
})
```

2. **Sprawdź czy DTO ma @ApiProperty:**

```typescript
// ✅ DOBRE
export class EntityResponseDto {
    @ApiProperty()  // ✅ Wymagane!
    id: number;
}

// ❌ ZŁE
export class EntityResponseDto {
    id: number;  // Brak @ApiProperty
}
```

3. **Użyj PartialType z @nestjs/swagger:**

```typescript
// ✅ DOBRE
import { PartialType } from '@nestjs/swagger';

// ❌ ZŁE
import { PartialType } from '@nestjs/mapped-types';
```

### Problem 3: Query parameters nie działają

**Objawy:**
- Query params nie są dokumentowane
- Swagger UI nie pokazuje pól input

**Rozwiązanie:**

```typescript
// ✅ DOBRE - Dodaj ApiQuery
ApiQuery({
    name: 'search',
    required: false,
    type: String
})

// W kontrolerze
async findAll(@Query('search') search?: string) { }
```

### Problem 4: Błąd "Cannot find module './decorators'"

**Objawy:**
```
Error: Cannot find module './decorators'
```

**Rozwiązanie:**

Upewnij się że masz `index.ts` w folderze decorators:

```typescript
// decorators/index.ts
export { GetAllEntitiesDecorators } from './get-all-entities.decorator';
// ... więcej eksportów
```

### Problem 5: TypeScript error - "Type not assignable"

**Objawy:**
```typescript
Type 'EntityResponseDto' is not assignable to type '...'
```

**Rozwiązanie:**

1. Sprawdź czy return type w kontrolerze zgadza się z DTO:

```typescript
// ✅ DOBRE
async findOne(): Promise<EntityResponseDto> {
    return this.service.findOne(id);
}

// ❌ ZŁE - Brak typu
async findOne() {
    return this.service.findOne(id);
}
```

2. Sprawdź czy serwis zwraca poprawny typ:

```typescript
// service
async findOne(id: number): Promise<EntityResponseDto> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity; // Może trzeba zamapować
}
```

### Problem 6: Dekorator nie jest wywoływany

**Objawy:**
- Dekorator zaimportowany
- Endpoint działa
- Dokumentacja nie pojawia się

**Rozwiązanie:**

Sprawdź czy używasz `()` przy wywołaniu:

```typescript
// ✅ DOBRE
@Get()
@GetAllEntitiesDecorators()  // Z nawiasami!
async findAll() { }

// ❌ ZŁE
@Get()
@GetAllEntitiesDecorators  // Brak nawiasów
async findAll() { }
```

---

## Checklist - Dodawanie nowego dekoratora

Użyj tego checklisty przy dodawaniu nowego dekoratora:

### Planowanie

- [ ] Określ HTTP method (GET, POST, PUT, DELETE)
- [ ] Określ path (z parametrami?)
- [ ] Zidentyfikuj query parameters
- [ ] Określ request DTO (dla POST/PUT)
- [ ] Określ response DTO
- [ ] Lista możliwych status codes

### Implementacja DTO

- [ ] Stwórz/zaktualizuj request DTO (z validations)
- [ ] Stwórz/zaktualizuj response DTO (z @ApiProperty)
- [ ] Dodaj DTO do `dto/index.ts`

### Implementacja dekoratora

- [ ] Stwórz plik `[action]-[entity].decorator.ts`
- [ ] Import `applyDecorators` z `@nestjs/common`
- [ ] Import dekoratorów Swagger
- [ ] Import response DTO
- [ ] Dodaj ApiOperation z summary i description
- [ ] Dodaj ApiParam dla path parameters
- [ ] Dodaj ApiQuery dla query parameters
- [ ] Dodaj ApiResponse dla success (200/201/204)
- [ ] Dodaj ApiResponse dla błędów (400/404/409)
- [ ] Dodaj example do wszystkich parameters
- [ ] Eksportuj funkcję z prawidłową nazwą

### Export i integracja

- [ ] Dodaj export do `decorators/index.ts`
- [ ] Import dekoratora w kontrolerze
- [ ] Użyj dekoratora na endpoincie
- [ ] Sprawdź typy TypeScript
- [ ] Sprawdź czy endpoint działa
- [ ] Sprawdź dokumentację w Swagger UI

### Testowanie

- [ ] Otwórz Swagger UI (`/api`)
- [ ] Znajdź endpoint w odpowiedniej sekcji
- [ ] Sprawdź czy opis jest jasny
- [ ] Sprawdź czy wszystkie parametry są widoczne
- [ ] Sprawdź czy response schema jest poprawny
- [ ] Przetestuj endpoint przez Swagger UI
- [ ] Sprawdź wszystkie status codes

---

## Podsumowanie

### Kluczowe zasady

1. **Jeden dekorator = jeden plik** - łatwiejsze w utrzymaniu
2. **Konwencje nazewnictwa** - `[action]-[entity].decorator.ts`
3. **Funkcje z suffixem "Decorators"** - `CreateEntityDecorators()`
4. **Export przez index.ts** - czystsze importy
5. **Zawsze ApiOperation** - podstawowy opis endpointu
6. **Type w ApiResponse** - dokumentacja struktury danych
7. **Example w parameters** - łatwiejsze testowanie
8. **Język polski** - zgodnie z projektem
9. **Kolejność dekoratorów** - Operation → Params → Success → Errors

### Korzyści z custom decorators

- ✅ **DRY** - brak duplikacji
- ✅ **Czytelność** - czystsze kontrolery
- ✅ **Spójność** - jednolita dokumentacja
- ✅ **Łatwość utrzymania** - zmiany w jednym miejscu
- ✅ **Type safety** - TypeScript support
- ✅ **Automatyczna dokumentacja** - Swagger out-of-the-box

### Kolejne kroki

Po opanowaniu custom decorators rozważ:
1. **Guards decorators** - dla autoryzacji
2. **Interceptors decorators** - dla transformacji danych
3. **Pipes decorators** - dla walidacji
4. **Combined decorators** - łączące wiele funkcjonalności

---

## Przykładowy workflow

### Dodawanie nowego modułu z dekoratorami

```bash
# 1. Stwórz strukturę katalogów
mkdir -p src/products/{entities,dto,decorators}

# 2. Stwórz entity
touch src/products/entities/product.entity.ts

# 3. Stwórz DTOs
touch src/products/dto/create-product.dto.ts
touch src/products/dto/update-product.dto.ts
touch src/products/dto/product-response.dto.ts
touch src/products/dto/index.ts

# 4. Stwórz dekoratory
touch src/products/decorators/get-all-products.decorator.ts
touch src/products/decorators/get-product-by-id.decorator.ts
touch src/products/decorators/create-product.decorator.ts
touch src/products/decorators/update-product.decorator.ts
touch src/products/decorators/delete-product.decorator.ts
touch src/products/decorators/index.ts

# 5. Stwórz serwis, kontroler i moduł
nest g service products --no-spec
nest g controller products --no-spec
nest g module products
```

Następnie wypełnij każdy plik zgodnie z wzorcami opisanymi w tym dokumencie.

---

**Dokument stworzony:** 2024  
**Projekt:** plemiona-bot-backend  
**Wersja:** 1.0.0  
**Autor:** Dokumentacja projektu

---

*Ten dokument stanowi kompletny przewodnik po tworzeniu custom API decorators w NestJS z integracją Swagger. Może być używany jako standard dla wszystkich modułów w projekcie.*


