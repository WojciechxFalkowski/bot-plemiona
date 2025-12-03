# Database Setup Guide - TypeORM & MySQL

## Spis treści

1. [Wprowadzenie](#wprowadzenie)
2. [Architektura i technologie](#architektura-i-technologie)
3. [Instalacja zależności](#instalacja-zależności)
4. [Zmienne środowiskowe](#zmienne-środowiskowe)
5. [Struktura katalogów](#struktura-katalogów)
6. [Konfiguracja bazy danych](#konfiguracja-bazy-danych)
7. [Tworzenie Entities](#tworzenie-entities)
8. [System migracji](#system-migracji)
9. [Integracja z modułami NestJS](#integracja-z-modułami-nestjs)
10. [Docker i docker-compose](#docker-i-docker-compose)
11. [Best practices](#best-practices)
12. [Przykłady implementacji](#przykłady-implementacji)
13. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Wprowadzenie

Niniejszy dokument opisuje kompleksowy proces dodania, konfiguracji i integracji bazy danych MySQL z TypeORM w projekcie NestJS. Guide stanowi blueprint do wykorzystania w innych projektach, zapewniając jednolitość i jakość implementacji.

### Cel dokumentu

- Szczegółowy opis procesu dodania bazy danych od zera
- Dokumentacja wzorców i konwencji używanych w projekcie
- Przewodnik po systemie migracji
- Best practices dla TypeORM w NestJS
- Rozwiązania typowych problemów

---

## Architektura i technologie

### Stack technologiczny

| Technologia | Wersja | Cel |
|-------------|--------|-----|
| **NestJS** | ^11.0.1 | Framework backendowy |
| **TypeORM** | ^0.3.21 | ORM (Object-Relational Mapping) |
| **MySQL** | ^5.7 / ^8.0 | Relacyjna baza danych |
| **mysql2** | ^3.12.0 | Driver MySQL dla Node.js |
| **TypeScript** | ^5.7.3 | Język programowania |

### Dlaczego ten stack?

1. **TypeORM** - najpopularniejszy ORM dla TypeScript, doskonała integracja z NestJS
2. **MySQL** - stabilna, wydajna, darmowa relacyjna baza danych
3. **Custom Providers Pattern** - większa kontrola nad dependency injection niż standardowe `TypeOrmModule.forFeature()`

---

## Instalacja zależności

### 1. Podstawowe pakiety

```bash
npm install --save @nestjs/typeorm typeorm mysql2
```

#### Opis pakietów:
- `@nestjs/typeorm` - integracja TypeORM z NestJS
- `typeorm` - sam ORM
- `mysql2` - nowoczesny driver MySQL dla Node.js (szybszy niż mysql)

### 2. Pakiety deweloperskie

```bash
npm install --save-dev @types/node ts-node tsconfig-paths
```

#### Opis pakietów:
- `@types/node` - typy TypeScript dla Node.js
- `ts-node` - wykonywanie TypeScript bezpośrednio (potrzebne do migracji)
- `tsconfig-paths` - wsparcie dla aliasów ścieżek w TypeScript

### 3. Dodatkowe pakiety

```bash
npm install --save @nestjs/config dotenv
```

#### Opis pakietów:
- `@nestjs/config` - zarządzanie konfiguracją w NestJS
- `dotenv` - ładowanie zmiennych środowiskowych z pliku .env

---

## Zmienne środowiskowe

### 1. Struktura pliku .env

Utwórz plik `.env` w głównym katalogu projektu:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_ROOT_USER=root
DATABASE_ROOT_PASSWORD=your_password_here
DATABASE_NAME=plemiona_bot

# Application Configuration
BACKEND_PORT=3000
NODE_ENV=development

# Optional - dla innych funkcjonalności
ALLOWED_ORIGIN=http://localhost:5173
```

### 2. Opis zmiennych

| Zmienna | Typ | Domyślna wartość | Opis |
|---------|-----|------------------|------|
| `DATABASE_HOST` | string | localhost | Host bazy danych |
| `DATABASE_PORT` | number | 3306 | Port MySQL |
| `DATABASE_ROOT_USER` | string | root | Użytkownik bazy danych |
| `DATABASE_ROOT_PASSWORD` | string | - | Hasło do bazy danych |
| `DATABASE_NAME` | string | - | Nazwa bazy danych |
| `BACKEND_PORT` | number | 3000 | Port aplikacji NestJS |

### 3. Bezpieczeństwo

⚠️ **WAŻNE:**
- **NIGDY** nie commituj pliku `.env` do repozytorium
- Dodaj `.env` do `.gitignore`
- Użyj `.env.example` jako template bez wrażliwych danych
- W produkcji używaj secrets management (np. AWS Secrets Manager, Azure Key Vault)

Przykład `.env.example`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_ROOT_USER=root
DATABASE_ROOT_PASSWORD=
DATABASE_NAME=your_database_name
BACKEND_PORT=3000
```

---

## Struktura katalogów

### 1. Organizacja plików bazy danych

```
src/
├── database/
│   ├── database-configuration.ts    # Konfiguracja zmiennych środowiskowych
│   ├── database.contracts.ts        # Stałe dla DI (dependency injection)
│   ├── database.module.ts           # Moduł NestJS
│   └── database.providers.ts        # Provider DataSource
├── migrations/                       # Wszystkie migracje bazy danych
│   ├── 1742238108371-AddSettingsTable.ts
│   ├── 1742248000000-AddVillagesTable.ts
│   └── ...
└── [module-name]/                   # Każdy moduł aplikacji
    ├── entities/
    │   └── [entity-name].entity.ts
    ├── dto/
    │   └── ...
    ├── [module-name].module.ts
    ├── [module-name].service.ts
    ├── [module-name].service.providers.ts
    ├── [module-name].service.contracts.ts
    └── [module-name].controller.ts
```

### 2. Konwencje nazewnictwa

| Typ pliku | Konwencja | Przykład |
|-----------|-----------|----------|
| Entity | `[nazwa].entity.ts` | `user.entity.ts` |
| Migration | `[timestamp]-[Opis].ts` | `1742238108371-AddSettingsTable.ts` |
| Provider | `[module].service.providers.ts` | `settings.service.providers.ts` |
| Contract | `[module].service.contracts.ts` | `settings.service.contracts.ts` |
| Module | `[module].module.ts` | `settings.module.ts` |

---

## Konfiguracja bazy danych

### 1. database-configuration.ts

Plik konfiguracyjny odczytuje zmienne środowiskowe:

```typescript
// src/database/database-configuration.ts
export default () => {
    return {
        database: {
            root_user: process.env.DATABASE_ROOT_USER,
            root_password: process.env.DATABASE_ROOT_PASSWORD,
            database_name: process.env.DATABASE_NAME,
            host: process.env.DATABASE_HOST,
            port: process.env.DATABASE_PORT || 3307,
        },
        environment: {
            port: process.env.BACKEND_PORT
        },
        allowed: {
            origin: process.env.ALLOWED_ORIGIN,
        },
    }
};
```

**Kluczowe aspekty:**
- Funkcja factory zwracająca obiekt konfiguracji
- Fallback dla portu (3307)
- Możliwość grupowania różnych konfiguracji (database, environment, allowed)
- Łatwe rozszerzanie o nowe konfiguracje

### 2. database.contracts.ts

Stałe używane w Dependency Injection:

```typescript
// src/database/database.contracts.ts
export const DATA_SOURCE = 'DATA_SOURCE'
```

**Cel:**
- Unikanie magic strings w kodzie
- Type safety dla dependency injection
- Centralizacja nazw providerów

### 3. database.providers.ts

Główny provider DataSource dla TypeORM:

```typescript
// src/database/database.providers.ts
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import configuration from '@/database/database-configuration';
import { DATA_SOURCE } from './database.contracts';

config();

const configService = new ConfigService(configuration());

const dataSource = new DataSource({
  type: 'mysql',
  host: configService.get('database.host'),
  port: configService.get('database.port'),
  username: configService.get('database.root_user'),
  password: configService.get('database.root_password'),
  database: configService.get('database.database_name'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
  migrationsRun: false,
  synchronize: false,
  // logging: ['query', 'error'] // Odkomentuj dla debugowania
});

export const databaseProviders = [
  {
    provide: DATA_SOURCE,
    useFactory: async () => {
      return dataSource.initialize()
    },
  }
]

export default dataSource;
```

**Konfiguracja opcji:**

| Opcja | Wartość | Opis |
|-------|---------|------|
| `type` | 'mysql' | Typ bazy danych |
| `host` | z .env | Host bazy danych |
| `port` | z .env | Port bazy danych |
| `username` | z .env | Użytkownik |
| `password` | z .env | Hasło |
| `database` | z .env | Nazwa bazy danych |
| `entities` | glob pattern | Automatyczne ładowanie wszystkich entities |
| `migrations` | glob pattern | Ścieżka do migracji |
| `migrationsRun` | false | ❌ NIE uruchamiaj migracji automatycznie |
| `synchronize` | false | ❌ NIE synchronizuj automatycznie (tylko dev!) |
| `logging` | opcjonalne | Logowanie zapytań SQL |

⚠️ **KRYTYCZNE - Produkcja:**
- `synchronize: false` - **ZAWSZE** false w produkcji!
- `migrationsRun: false` - migracje uruchamiamy manualnie
- Automatyczna synchronizacja może **usunąć dane** w produkcji!

### 4. database.module.ts

Moduł NestJS eksportujący providery:

```typescript
// src/database/database.module.ts
import { Module } from '@nestjs/common'
import { databaseProviders } from './database.providers'

@Module({
  providers: [...databaseProviders],
  exports: [...databaseProviders]
})
export class DatabaseModule {}
```

**Cel:**
- Enkapsulacja konfiguracji bazy danych
- Export providerów dla innych modułów
- Singleton pattern dla DataSource

---

## Tworzenie Entities

### 1. Podstawowa struktura Entity

Entity to klasa TypeScript reprezentująca tabelę w bazie danych:

```typescript
// src/settings/settings.entity.ts
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    UpdateDateColumn, 
    CreateDateColumn,
    Index,
    Unique 
} from 'typeorm';

@Entity('settings')
@Unique('UQ_settings_serverId_key', ['serverId', 'key'])
export class SettingsEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    @Index()
    serverId: number;

    @Column({ type: 'varchar', length: 255 })
    key: string;

    @Column({ type: 'json' })
    value: Record<string, any>;

    @UpdateDateColumn()
    updatedAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}
```

### 2. Dekoratory TypeORM

#### Dekoratory klasy:

| Dekorator | Cel | Przykład |
|-----------|-----|----------|
| `@Entity('nazwa_tabeli')` | Oznacza klasę jako entity | `@Entity('users')` |
| `@Unique('constraint_name', ['kolumny'])` | Constraint unikalności | `@Unique('UQ_email', ['email'])` |

#### Dekoratory właściwości:

| Dekorator | Cel | Przykład |
|-----------|-----|----------|
| `@PrimaryGeneratedColumn()` | Auto-increment primary key | `id: number` |
| `@PrimaryColumn()` | Ręczny primary key | `id: string` |
| `@Column(options)` | Zwykła kolumna | `@Column({ type: 'varchar' })` |
| `@CreateDateColumn()` | Timestamp utworzenia | `createdAt: Date` |
| `@UpdateDateColumn()` | Timestamp aktualizacji | `updatedAt: Date` |
| `@Index()` | Indeks na kolumnie | `@Index()` |

### 3. Typy kolumn MySQL

```typescript
// Podstawowe typy
@Column({ type: 'varchar', length: 255 })
name: string;

@Column({ type: 'int' })
age: number;

@Column({ type: 'tinyint' })
isActive: boolean;

@Column({ type: 'text' })
description: string;

@Column({ type: 'decimal', precision: 10, scale: 2 })
price: number;

// JSON
@Column({ type: 'json' })
metadata: Record<string, any>;

// Enum
@Column({ type: 'enum', enum: ['ACTIVE', 'INACTIVE'] })
status: string;

// Nullable
@Column({ type: 'varchar', nullable: true })
optionalField?: string;

// Default value
@Column({ type: 'tinyint', default: false })
isEnabled: boolean;
```

### 4. Relacje między tabelami

#### One-to-Many / Many-to-One

```typescript
// Parent (One)
@Entity('servers')
export class ServerEntity {
    @PrimaryColumn()
    id: number;

    @OneToMany(() => VillageEntity, village => village.server)
    villages: VillageEntity[];
}

// Child (Many)
@Entity('villages')
export class VillageEntity {
    @PrimaryColumn()
    id: string;

    @Column({ type: 'int' })
    serverId: number;

    @ManyToOne(() => ServerEntity, server => server.villages, { 
        onDelete: 'CASCADE' 
    })
    @JoinColumn({ name: 'serverId' })
    server: ServerEntity;
}
```

#### One-to-One

```typescript
// Parent
@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => UserProfileEntity, profile => profile.user, {
        cascade: true
    })
    profile: UserProfileEntity;
}

// Child
@Entity('user_profiles')
export class UserProfileEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @OneToOne(() => UserEntity, user => user.profile)
    @JoinColumn({ name: 'userId' })
    user: UserEntity;
}
```

### 5. Opcje relacji

| Opcja | Opis | Przykład |
|-------|------|----------|
| `onDelete: 'CASCADE'` | Usuń child przy usunięciu parent | Foreign key cascade |
| `onDelete: 'SET NULL'` | Ustaw NULL przy usunięciu parent | Opcjonalne powiązanie |
| `cascade: true` | Zapisz/usuń powiązane entities | Automatyczne zarządzanie |
| `eager: true` | Ładuj relacje automatycznie | Częste użycie |
| `lazy: true` | Ładuj relacje na żądanie | Rzadkie użycie |

### 6. Konwencje nazewnictwa

```typescript
// ✅ DOBRE
export class UserEntity { }           // PascalCase + Entity suffix
export class SettingsEntity { }
export class VillageConstructionQueueEntity { }

// ❌ ZŁE
export class user { }                  // brak PascalCase
export class UserModel { }             // Model zamiast Entity
export class Users { }                 // liczba mnoga
```

---

## System migracji

### 1. Konfiguracja skryptów npm

Dodaj do `package.json`:

```json
{
  "scripts": {
    "typeorm": "ts-node ./node_modules/typeorm/cli",
    "migration:run": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d ./src/database/database.providers.ts",
    "migration:generate": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate ./src/migrations/%npm_config_name% -d ./src/database/database.providers.ts",
    "migration:create": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:create ./src/migrations/%npm_config_name%",
    "migration:revert": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:revert -d ./src/database/database.providers.ts",
    "migration:show": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:show -d ./src/database/database.providers.ts"
  }
}
```

### 2. Dostępne komendy

| Komenda | Opis | Przykład |
|---------|------|----------|
| `migration:run` | Uruchamia pending migracje | `npm run migration:run` |
| `migration:generate` | Generuje migrację z różnic w entities | `npm run migration:generate --name=AddUsersTable` |
| `migration:create` | Tworzy pustą migrację | `npm run migration:create --name=AddCustomLogic` |
| `migration:revert` | Cofa ostatnią migrację | `npm run migration:revert` |
| `migration:show` | Pokazuje status migracji | `npm run migration:show` |

### 3. Tworzenie migracji

#### Metoda 1: Automatyczne generowanie (zalecane)

1. Stwórz/zmodyfikuj entity
2. Wygeneruj migrację:

```bash
npm run migration:generate --name=AddUsersTable
```

TypeORM automatycznie wykryje różnice między entities a schematem bazy.

#### Metoda 2: Ręczne tworzenie

```bash
npm run migration:create --name=CustomLogic
```

### 4. Struktura migracji

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSettingsTable1742238108371 implements MigrationInterface {
    name = 'AddSettingsTable1742238108371'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Wykonywane przy migration:run
        await queryRunner.query(`
            CREATE TABLE \`settings\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`key\` varchar(255) NOT NULL,
                \`value\` json NOT NULL,
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) 
                    ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_settings_key\` (\`key\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Wykonywane przy migration:revert
        await queryRunner.query(`DROP INDEX \`IDX_settings_key\` ON \`settings\``);
        await queryRunner.query(`DROP TABLE \`settings\``);
    }
}
```

### 5. Przykłady migracji

#### Tworzenie tabeli

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE \`users\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`email\` varchar(255) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            UNIQUE INDEX \`IDX_users_email\` (\`email\`),
            PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
    `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_users_email\` ON \`users\``);
    await queryRunner.query(`DROP TABLE \`users\``);
}
```

#### Dodawanie kolumny

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE \`users\` 
        ADD \`phoneNumber\` varchar(20) NULL
    `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE \`users\` 
        DROP COLUMN \`phoneNumber\`
    `);
}
```

#### Dodawanie foreign key

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE \`villages\` 
        ADD CONSTRAINT \`FK_villages_serverId\` 
        FOREIGN KEY (\`serverId\`) 
        REFERENCES \`servers\`(\`id\`) 
        ON DELETE CASCADE
    `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE \`villages\` 
        DROP FOREIGN KEY \`FK_villages_serverId\`
    `);
}
```

#### Modyfikacja danych

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
    // Dodaj kolumnę
    await queryRunner.query(`
        ALTER TABLE \`users\` 
        ADD \`fullName\` varchar(255) NULL
    `);
    
    // Przenieś dane
    await queryRunner.query(`
        UPDATE \`users\` 
        SET \`fullName\` = CONCAT(\`firstName\`, ' ', \`lastName\`)
    `);
    
    // Usuń stare kolumny
    await queryRunner.query(`
        ALTER TABLE \`users\` 
        DROP COLUMN \`firstName\`,
        DROP COLUMN \`lastName\`
    `);
}
```

### 6. Best practices dla migracji

#### ✅ DOBRE praktyki:

1. **Zawsze implementuj `down` method** - umożliwia rollback
2. **Jedna zmiana logiczna na migrację** - łatwiejszy debugging
3. **Testuj migracje na kopii produkcji** - przed wdrożeniem
4. **Nigdy nie modyfikuj wykonanych migracji** - stwórz nową
5. **Używaj transakcji dla złożonych operacji**
6. **Sprawdzaj istnienie przed DROP/ALTER**
7. **Backup przed migration:run w produkcji**

#### ❌ ZŁE praktyki:

1. Modyfikowanie już wykonanych migracji
2. Mieszanie wielu logicznie niezależnych zmian
3. Brak metody `down`
4. Brak testów na środowisku testowym
5. Automatyczne `synchronize: true` w produkcji

### 7. Workflow migracji

```bash
# 1. Stwórz/zmodyfikuj entity
# src/users/entities/user.entity.ts

# 2. Wygeneruj migrację
npm run migration:generate --name=AddUsersTable

# 3. Sprawdź wygenerowany kod
# src/migrations/[timestamp]-AddUsersTable.ts

# 4. Opcjonalnie dostosuj migrację
# Edytuj plik migracji jeśli potrzeba

# 5. Uruchom migrację
npm run migration:run

# 6. Sprawdź status
npm run migration:show

# 7. W razie problemu - rollback
npm run migration:revert
```

### 8. Tracking migracji

TypeORM automatycznie tworzy tabelę `migrations`:

```sql
CREATE TABLE `migrations` (
    `id` int NOT NULL AUTO_INCREMENT,
    `timestamp` bigint NOT NULL,
    `name` varchar(255) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB
```

Ta tabela śledzi które migracje zostały wykonane.

---

## Integracja z modułami NestJS

### 1. Custom Providers Pattern

Projekt używa **custom providers** zamiast standardowego `TypeOrmModule.forFeature()`.

#### Dlaczego?

- ✅ Większa kontrola nad dependency injection
- ✅ Jednolity wzorzec w całym projekcie
- ✅ Łatwiejsze testowanie (mock providers)
- ✅ Lepsze oddzielenie warstw

### 2. Struktura modułu z bazą danych

Każdy moduł używający bazy danych składa się z:

```
module-name/
├── entities/
│   └── module.entity.ts              # Entity (tabela)
├── dto/
│   ├── create-module.dto.ts          # DTO dla tworzenia
│   └── update-module.dto.ts          # DTO dla aktualizacji
├── module.service.contracts.ts       # Stałe DI
├── module.service.providers.ts       # Providers
├── module.service.ts                 # Logika biznesowa
├── module.controller.ts              # HTTP endpoints
└── module.module.ts                  # Moduł NestJS
```

### 3. Implementacja krok po kroku

#### Krok 1: Stwórz Entity

```typescript
// src/settings/entities/settings.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class SettingsEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    serverId: number;

    @Column({ type: 'varchar' })
    key: string;

    @Column({ type: 'json' })
    value: Record<string, any>;

    @UpdateDateColumn()
    updatedAt: Date;
}
```

#### Krok 2: Stwórz contracts (stałe DI)

```typescript
// src/settings/settings.service.contracts.ts
export const SETTINGS_ENTITY_REPOSITORY = 'SETTINGS_ENTITY_REPOSITORY';
```

**Konwencja nazewnictwa:**
```typescript
[ENTITY_NAME]_ENTITY_REPOSITORY
```

Przykłady:
- `SETTINGS_ENTITY_REPOSITORY`
- `USERS_ENTITY_REPOSITORY`
- `VILLAGES_ENTITY_REPOSITORY`

#### Krok 3: Stwórz providers

```typescript
// src/settings/settings.service.providers.ts
import { DATA_SOURCE } from 'src/database/database.contracts';
import { DataSource } from 'typeorm';
import { SettingsEntity } from './entities/settings.entity';
import { SETTINGS_ENTITY_REPOSITORY } from './settings.service.contracts';

export const settingsProviders = [
  {
    provide: SETTINGS_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => 
      dataSource.getRepository(SettingsEntity),
    inject: [DATA_SOURCE],
  }
];
```

**Wyjaśnienie:**
- `provide` - nazwa tokena do dependency injection
- `useFactory` - funkcja tworząca instancję
- `dataSource.getRepository()` - pobiera TypeORM Repository
- `inject` - zależności (DATA_SOURCE z database module)

#### Krok 4: Stwórz Service

```typescript
// src/settings/settings.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SettingsEntity } from './entities/settings.entity';
import { SETTINGS_ENTITY_REPOSITORY } from './settings.service.contracts';

@Injectable()
export class SettingsService {
    constructor(
        @Inject(SETTINGS_ENTITY_REPOSITORY)
        private readonly settingsRepo: Repository<SettingsEntity>,
    ) { }

    async findAll(): Promise<SettingsEntity[]> {
        return this.settingsRepo.find();
    }

    async findOne(id: number): Promise<SettingsEntity> {
        const setting = await this.settingsRepo.findOne({ 
            where: { id } 
        });
        
        if (!setting) {
            throw new NotFoundException(`Setting #${id} not found`);
        }
        
        return setting;
    }

    async create(data: Partial<SettingsEntity>): Promise<SettingsEntity> {
        const setting = this.settingsRepo.create(data);
        return this.settingsRepo.save(setting);
    }

    async update(id: number, data: Partial<SettingsEntity>): Promise<SettingsEntity> {
        await this.settingsRepo.update(id, data);
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        const result = await this.settingsRepo.delete(id);
        
        if (result.affected === 0) {
            throw new NotFoundException(`Setting #${id} not found`);
        }
    }
}
```

**Kluczowe metody Repository:**

| Metoda | Opis | Przykład |
|--------|------|----------|
| `find()` | Znajdź wiele rekordów | `find({ where: { isActive: true }})` |
| `findOne()` | Znajdź jeden rekord | `findOne({ where: { id: 1 }})` |
| `create()` | Utwórz instancję entity | `create({ name: 'John' })` |
| `save()` | Zapisz do bazy | `save(entity)` |
| `update()` | Aktualizuj rekordy | `update(id, { name: 'Jane' })` |
| `delete()` | Usuń rekordy | `delete(id)` |
| `count()` | Policz rekordy | `count({ where: { isActive: true }})` |

#### Krok 5: Stwórz Module

```typescript
// src/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { settingsProviders } from './settings.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule,    // ✅ Import DatabaseModule (DATA_SOURCE)
    ConfigModule,      // Opcjonalnie dla konfiguracji
  ],
  controllers: [SettingsController],
  providers: [
    ...settingsProviders,  // ✅ Spread providers
    SettingsService
  ],
  exports: [SettingsService],  // Export jeśli inne moduły potrzebują
})
export class SettingsModule { }
```

**Checklist modułu:**
- ✅ Import `DatabaseModule`
- ✅ Spread `...providersArray`
- ✅ Include service w providers
- ✅ Export service jeśli potrzebny w innych modułach

### 4. Repository API - TypeORM

#### Podstawowe operacje CRUD

```typescript
// CREATE
const user = this.userRepo.create({ name: 'John', email: 'john@example.com' });
await this.userRepo.save(user);

// READ - jeden
const user = await this.userRepo.findOne({ where: { id: 1 } });

// READ - wiele
const users = await this.userRepo.find({ where: { isActive: true } });

// READ - z relacjami
const user = await this.userRepo.findOne({ 
    where: { id: 1 },
    relations: ['profile', 'posts']
});

// UPDATE
await this.userRepo.update({ id: 1 }, { name: 'Jane' });

// DELETE
await this.userRepo.delete({ id: 1 });
```

#### Zaawansowane zapytania

```typescript
// QueryBuilder
const users = await this.userRepo
    .createQueryBuilder('user')
    .where('user.age > :age', { age: 18 })
    .andWhere('user.isActive = :isActive', { isActive: true })
    .orderBy('user.createdAt', 'DESC')
    .take(10)
    .getMany();

// Agregacje
const count = await this.userRepo.count({ where: { isActive: true } });

const { sum } = await this.orderRepo
    .createQueryBuilder('order')
    .select('SUM(order.total)', 'sum')
    .where('order.status = :status', { status: 'PAID' })
    .getRawOne();

// Soft delete
await this.userRepo.softDelete(id);

// Restore soft deleted
await this.userRepo.restore(id);
```

### 5. Porównanie: Custom Providers vs TypeOrmModule.forFeature()

#### ❌ TypeOrmModule.forFeature() (NIE używamy)

```typescript
// module.ts
@Module({
    imports: [
        TypeOrmModule.forFeature([SettingsEntity])
    ],
    providers: [SettingsService],
})
export class SettingsModule {}

// service.ts
import { InjectRepository } from '@nestjs/typeorm';

constructor(
    @InjectRepository(SettingsEntity)
    private readonly settingsRepo: Repository<SettingsEntity>,
) {}
```

#### ✅ Custom Providers (używamy w projekcie)

```typescript
// module.ts
@Module({
    imports: [DatabaseModule],
    providers: [...settingsProviders, SettingsService],
})
export class SettingsModule {}

// service.ts
import { Inject } from '@nestjs/common';
import { SETTINGS_ENTITY_REPOSITORY } from './settings.service.contracts';

constructor(
    @Inject(SETTINGS_ENTITY_REPOSITORY)
    private readonly settingsRepo: Repository<SettingsEntity>,
) {}
```

**Dlaczego custom providers?**
1. Większa kontrola nad DI
2. Jednolity pattern w projekcie
3. Łatwiejsze mockowanie w testach
4. Kompatybilność z istniejącą architekturą

---

## Docker i docker-compose

### 1. docker-compose.yml z MySQL

```yaml
version: "3.8"

services:
  mysql:
    image: mysql:8.0
    container_name: plemiona-bot-db
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: ${DATABASE_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DATABASE_NAME}
      MYSQL_USER: ${DATABASE_ROOT_USER}
      MYSQL_PASSWORD: ${DATABASE_ROOT_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: plemiona-bot-backend
    environment:
      DATABASE_HOST: mysql
      DATABASE_PORT: 3306
      DATABASE_ROOT_USER: ${DATABASE_ROOT_USER}
      DATABASE_ROOT_PASSWORD: ${DATABASE_ROOT_PASSWORD}
      DATABASE_NAME: ${DATABASE_NAME}
      BACKEND_PORT: ${BACKEND_PORT}
    ports:
      - "${BACKEND_PORT}:${BACKEND_PORT}"
    depends_on:
      mysql:
        condition: service_healthy
    restart: always

volumes:
  mysql_data:
```

**Kluczowe elementy:**

| Element | Opis |
|---------|------|
| `mysql:8.0` | Oficjalny image MySQL |
| `volumes` | Persystencja danych |
| `healthcheck` | Sprawdzenie czy MySQL jest gotowy |
| `depends_on` | Backend czeka na MySQL |
| `condition: service_healthy` | Start po healthcheck |

### 2. Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

### 3. Workflow z Dockerem

```bash
# 1. Uruchom kontenery
docker-compose up -d

# 2. Sprawdź logi
docker-compose logs -f backend
docker-compose logs -f mysql

# 3. Uruchom migracje (w kontenerze)
docker-compose exec backend npm run migration:run

# 4. Restart serwisów
docker-compose restart backend

# 5. Zatrzymaj
docker-compose down

# 6. Zatrzymaj i usuń volumes (UWAGA: usuwa dane!)
docker-compose down -v
```

### 4. Inicjalizacja bazy danych w Dockerze

#### Opcja 1: Skrypt SQL

```yaml
# docker-compose.yml
mysql:
  volumes:
    - mysql_data:/var/lib/mysql
    - ./init.sql:/docker-entrypoint-initdb.d/init.sql
```

```sql
-- init.sql
CREATE DATABASE IF NOT EXISTS plemiona_bot;
USE plemiona_bot;

-- Opcjonalnie początkowe dane
INSERT INTO settings (key, value) VALUES ('initialized', 'true');
```

#### Opcja 2: Automatyczne migracje

```dockerfile
# Dockerfile
CMD ["sh", "-c", "npm run migration:run && npm run start:prod"]
```

⚠️ **Uwaga:** Automatyczne migracje w produkcji mogą być ryzykowne!

---

## Best Practices

### 1. Konfiguracja

#### ✅ DOBRE:

```typescript
// Użyj ConfigService
constructor(private configService: ConfigService) {}

const host = this.configService.get<string>('database.host');
```

#### ❌ ZŁE:

```typescript
// Bezpośredni dostęp do process.env
const host = process.env.DATABASE_HOST;
```

### 2. Entity Design

#### ✅ DOBRE:

```typescript
@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    email: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
```

**Zasady:**
- Zawsze dodawaj `createdAt` i `updatedAt`
- Używaj konkretnych typów kolumn
- Określaj długość dla varchar
- Nazwij tabele w liczbie mnogiej
- Nazwij klasy Entity w liczbie pojedynczej + suffix "Entity"

#### ❌ ZŁE:

```typescript
@Entity()  // Brak nazwy tabeli
export class User {  // Brak suffix Entity
    @PrimaryGeneratedColumn()
    id: number;

    @Column()  // Brak typu
    email;  // Brak TypeScript type
}
```

### 3. Transactions

Użyj transakcji dla operacji wieloetapowych:

```typescript
async transferMoney(fromId: number, toId: number, amount: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        await queryRunner.manager.update(Account, fromId, {
            balance: () => `balance - ${amount}`
        });
        
        await queryRunner.manager.update(Account, toId, {
            balance: () => `balance + ${amount}`
        });
        
        await queryRunner.commitTransaction();
    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
}
```

### 4. Repository Pattern

#### ✅ DOBRE - Serwis z Repository:

```typescript
@Injectable()
export class UsersService {
    constructor(
        @Inject(USERS_ENTITY_REPOSITORY)
        private readonly usersRepo: Repository<UserEntity>,
    ) {}

    async findActiveUsers(): Promise<UserEntity[]> {
        return this.usersRepo.find({
            where: { isActive: true },
            order: { createdAt: 'DESC' }
        });
    }
}
```

#### ❌ ZŁE - SQL w kontrolerze:

```typescript
@Controller('users')
export class UsersController {
    @Get()
    async getUsers(@Inject(DATA_SOURCE) dataSource: DataSource) {
        return dataSource.query('SELECT * FROM users');  // NIE RÓB TEGO!
    }
}
```

### 5. Error Handling

```typescript
async findOne(id: number): Promise<UserEntity> {
    const user = await this.usersRepo.findOne({ where: { id } });
    
    if (!user) {
        throw new NotFoundException(`User #${id} not found`);
    }
    
    return user;
}

async create(data: CreateUserDto): Promise<UserEntity> {
    try {
        const user = this.usersRepo.create(data);
        return await this.usersRepo.save(user);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new ConflictException('User with this email already exists');
        }
        throw error;
    }
}
```

### 6. DTOs i Validation

```typescript
// create-user.dto.ts
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @MinLength(2)
    name: string;

    @ApiProperty({ example: '+48123456789', required: false })
    @IsOptional()
    @IsString()
    phoneNumber?: string;
}
```

### 7. Testing

```typescript
describe('UsersService', () => {
    let service: UsersService;
    let repository: Repository<UserEntity>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: USERS_ENTITY_REPOSITORY,
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        repository = module.get<Repository<UserEntity>>(USERS_ENTITY_REPOSITORY);
    });

    it('should find all users', async () => {
        const users = [{ id: 1, name: 'John' }];
        jest.spyOn(repository, 'find').mockResolvedValue(users as UserEntity[]);

        expect(await service.findAll()).toBe(users);
    });
});
```

### 8. Indexes

Dodawaj indeksy dla często wyszukiwanych pól:

```typescript
@Entity('users')
@Index('IDX_users_email', ['email'])
@Index('IDX_users_createdAt', ['createdAt'])
export class UserEntity {
    @Column({ type: 'varchar' })
    @Index()  // Pojedynczy indeks
    email: string;

    @Column({ type: 'varchar' })
    @Column({ type: 'varchar' })
    @Index('IDX_users_firstName_lastName', ['firstName', 'lastName'])  // Composite index
    firstName: string;
    
    @Column({ type: 'varchar' })
    lastName: string;
}
```

### 9. Soft Deletes

```typescript
@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @DeleteDateColumn()
    deletedAt?: Date;
}

// Użycie
await this.usersRepo.softDelete(id);  // Soft delete
await this.usersRepo.restore(id);     // Restore
await this.usersRepo.find();          // Nie zwraca soft deleted
await this.usersRepo.find({ withDeleted: true });  // Zwraca wszystkie
```

### 10. Query Optimization

```typescript
// ❌ ZŁE - N+1 problem
const users = await this.usersRepo.find();
for (const user of users) {
    user.posts = await this.postsRepo.find({ where: { userId: user.id } });
}

// ✅ DOBRE - Eager loading
const users = await this.usersRepo.find({
    relations: ['posts']
});

// ✅ DOBRE - QueryBuilder z JOIN
const users = await this.usersRepo
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.posts', 'post')
    .where('user.isActive = :isActive', { isActive: true })
    .getMany();
```

---

## Przykłady implementacji

### 1. Kompletny CRUD Module

#### Entity

```typescript
// src/products/entities/product.entity.ts
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn, 
    UpdateDateColumn,
    Index 
} from 'typeorm';

@Entity('products')
@Index('IDX_products_sku', ['sku'])
export class ProductEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100, unique: true })
    sku: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'int', default: 0 })
    stock: number;

    @Column({ type: 'tinyint', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
```

#### DTOs

```typescript
// src/products/dto/create-product.dto.ts
import { IsString, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
    @ApiProperty({ example: 'SKU-001' })
    @IsString()
    @MaxLength(100)
    sku: string;

    @ApiProperty({ example: 'Laptop' })
    @IsString()
    @MaxLength(255)
    name: string;

    @ApiProperty({ example: 'High-performance laptop', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 999.99 })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({ example: 50 })
    @IsNumber()
    @Min(0)
    stock: number;
}

// src/products/dto/update-product.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

#### Contracts

```typescript
// src/products/products.service.contracts.ts
export const PRODUCTS_ENTITY_REPOSITORY = 'PRODUCTS_ENTITY_REPOSITORY';
```

#### Providers

```typescript
// src/products/products.service.providers.ts
import { DATA_SOURCE } from 'src/database/database.contracts';
import { DataSource } from 'typeorm';
import { ProductEntity } from './entities/product.entity';
import { PRODUCTS_ENTITY_REPOSITORY } from './products.service.contracts';

export const productsProviders = [
  {
    provide: PRODUCTS_ENTITY_REPOSITORY,
    useFactory: (dataSource: DataSource) => 
      dataSource.getRepository(ProductEntity),
    inject: [DATA_SOURCE],
  }
];
```

#### Service

```typescript
// src/products/products.service.ts
import { 
    Injectable, 
    NotFoundException, 
    ConflictException,
    Inject 
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProductEntity } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PRODUCTS_ENTITY_REPOSITORY } from './products.service.contracts';

@Injectable()
export class ProductsService {
    constructor(
        @Inject(PRODUCTS_ENTITY_REPOSITORY)
        private readonly productsRepo: Repository<ProductEntity>,
    ) {}

    async findAll(): Promise<ProductEntity[]> {
        return this.productsRepo.find({
            where: { isActive: true },
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: number): Promise<ProductEntity> {
        const product = await this.productsRepo.findOne({ 
            where: { id } 
        });
        
        if (!product) {
            throw new NotFoundException(`Product #${id} not found`);
        }
        
        return product;
    }

    async create(createProductDto: CreateProductDto): Promise<ProductEntity> {
        try {
            const product = this.productsRepo.create(createProductDto);
            return await this.productsRepo.save(product);
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new ConflictException(
                    `Product with SKU ${createProductDto.sku} already exists`
                );
            }
            throw error;
        }
    }

    async update(
        id: number, 
        updateProductDto: UpdateProductDto
    ): Promise<ProductEntity> {
        const product = await this.findOne(id);
        
        Object.assign(product, updateProductDto);
        
        return this.productsRepo.save(product);
    }

    async remove(id: number): Promise<void> {
        const result = await this.productsRepo.delete(id);
        
        if (result.affected === 0) {
            throw new NotFoundException(`Product #${id} not found`);
        }
    }

    async findBySku(sku: string): Promise<ProductEntity> {
        const product = await this.productsRepo.findOne({ 
            where: { sku } 
        });
        
        if (!product) {
            throw new NotFoundException(`Product with SKU ${sku} not found`);
        }
        
        return product;
    }

    async updateStock(id: number, quantity: number): Promise<ProductEntity> {
        const product = await this.findOne(id);
        
        product.stock += quantity;
        
        if (product.stock < 0) {
            throw new ConflictException('Insufficient stock');
        }
        
        return this.productsRepo.save(product);
    }
}
```

#### Controller

```typescript
// src/products/products.controller.ts
import { 
    Controller, 
    Get, 
    Post, 
    Put, 
    Delete, 
    Body, 
    Param,
    ParseIntPipe,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    @ApiOperation({ summary: 'Get all products' })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    findAll() {
        return this.productsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get product by ID' })
    @ApiResponse({ status: 200, description: 'Product found' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create new product' })
    @ApiResponse({ status: 201, description: 'Product created' })
    @ApiResponse({ status: 409, description: 'Product already exists' })
    create(@Body() createProductDto: CreateProductDto) {
        return this.productsService.create(createProductDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update product' })
    @ApiResponse({ status: 200, description: 'Product updated' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateProductDto: UpdateProductDto
    ) {
        return this.productsService.update(id, updateProductDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete product' })
    @ApiResponse({ status: 204, description: 'Product deleted' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.remove(id);
    }

    @Put(':id/stock')
    @ApiOperation({ summary: 'Update product stock' })
    @ApiResponse({ status: 200, description: 'Stock updated' })
    updateStock(
        @Param('id', ParseIntPipe) id: number,
        @Body('quantity', ParseIntPipe) quantity: number
    ) {
        return this.productsService.updateStock(id, quantity);
    }
}
```

#### Module

```typescript
// src/products/products.module.ts
import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { productsProviders } from './products.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [DatabaseModule, ConfigModule],
    controllers: [ProductsController],
    providers: [...productsProviders, ProductsService],
    exports: [ProductsService],
})
export class ProductsModule {}
```

### 2. Relacje One-to-Many

#### Parent Entity (Category)

```typescript
// src/categories/entities/category.entity.ts
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    OneToMany 
} from 'typeorm';
import { ProductEntity } from '@/products/entities/product.entity';

@Entity('categories')
export class CategoryEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @OneToMany(() => ProductEntity, product => product.category)
    products: ProductEntity[];
}
```

#### Child Entity (Product)

```typescript
// src/products/entities/product.entity.ts
import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    ManyToOne,
    JoinColumn 
} from 'typeorm';
import { CategoryEntity } from '@/categories/entities/category.entity';

@Entity('products')
export class ProductEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'int' })
    categoryId: number;

    @ManyToOne(() => CategoryEntity, category => category.products, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'categoryId' })
    category: CategoryEntity;
}
```

#### Service z relacjami

```typescript
// src/products/products.service.ts
async findWithCategory(id: number): Promise<ProductEntity> {
    return this.productsRepo.findOne({
        where: { id },
        relations: ['category']
    });
}

async findAllWithCategories(): Promise<ProductEntity[]> {
    return this.productsRepo.find({
        relations: ['category'],
        order: { createdAt: 'DESC' }
    });
}
```

### 3. QueryBuilder - zaawansowane zapytania

```typescript
async searchProducts(
    search: string,
    categoryId?: number,
    minPrice?: number,
    maxPrice?: number
): Promise<ProductEntity[]> {
    const query = this.productsRepo
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category');

    if (search) {
        query.where(
            '(product.name LIKE :search OR product.description LIKE :search)',
            { search: `%${search}%` }
        );
    }

    if (categoryId) {
        query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
        query.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
        query.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    return query
        .orderBy('product.createdAt', 'DESC')
        .getMany();
}
```

---

## Rozwiązywanie problemów

### 1. UnknownDependenciesException

**Problem:**
```
Error: Nest can't resolve dependencies of the Repository (?).
```

**Rozwiązanie:**
Sprawdź czy:
1. ✅ Importujesz `DatabaseModule` w module
2. ✅ Używasz `@Inject()` z prawidłową stałą
3. ✅ Provider jest w tablicy `providers`
4. ✅ Nazwa stałej w contracts zgadza się z nazwą w providers

### 2. Entity not found

**Problem:**
```
Error: Entity "UserEntity" was not found
```

**Rozwiązanie:**
1. Sprawdź czy entity ma dekorator `@Entity()`
2. Sprawdź pattern w `database.providers.ts`:
   ```typescript
   entities: [__dirname + '/../**/*.entity{.ts,.js}']
   ```
3. Zrestartuj aplikację

### 3. Migration failed

**Problem:**
```
QueryFailedError: Table 'users' already exists
```

**Rozwiązanie:**
```bash
# Sprawdź status migracji
npm run migration:show

# Cofnij ostatnią migrację
npm run migration:revert

# Usuń ręcznie tabelę (UWAGA!)
# Następnie uruchom ponownie
npm run migration:run
```

### 4. Connection timeout

**Problem:**
```
Error: connect ETIMEDOUT
```

**Rozwiązanie:**
1. Sprawdź czy MySQL działa:
   ```bash
   mysql -u root -p
   ```
2. Sprawdź zmienne środowiskowe
3. Sprawdź firewall/port
4. W Dockerze sprawdź healthcheck

### 5. Duplicate entry

**Problem:**
```
Error: ER_DUP_ENTRY: Duplicate entry 'john@example.com' for key 'email'
```

**Rozwiązanie:**
Obsłuż w service:
```typescript
try {
    return await this.usersRepo.save(user);
} catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Email already exists');
    }
    throw error;
}
```

### 6. Brak relacji

**Problem:**
```typescript
const user = await this.usersRepo.findOne({ where: { id: 1 } });
console.log(user.posts); // undefined
```

**Rozwiązanie:**
```typescript
const user = await this.usersRepo.findOne({ 
    where: { id: 1 },
    relations: ['posts']  // ✅ Dodaj relations
});
```

---

## Podsumowanie

### Checklist integracji bazy danych

- [ ] Zainstaluj zależności (`typeorm`, `mysql2`, `@nestjs/typeorm`)
- [ ] Utwórz `.env` z zmiennymi środowiskowymi
- [ ] Stwórz folder `src/database/` z plikami konfiguracyjnymi
- [ ] Dodaj `DatabaseModule` do `AppModule`
- [ ] Dodaj skrypty migracji do `package.json`
- [ ] Stwórz pierwszą entity
- [ ] Wygeneruj migrację
- [ ] Uruchom migrację
- [ ] Stwórz service z custom providers
- [ ] Stwórz module z importem `DatabaseModule`
- [ ] Przetestuj CRUD operations
- [ ] Dodaj `.env` do `.gitignore`
- [ ] Stwórz `.env.example` dla innych deweloperów

### Kluczowe zasady

1. **NIGDY** `synchronize: true` w produkcji
2. **ZAWSZE** używaj migracji
3. **ZAWSZE** implementuj metody `down` w migracjach
4. **NIGDY** nie commituj `.env`
5. **ZAWSZE** dodawaj `createdAt` i `updatedAt`
6. **UŻYWAJ** custom providers pattern w tym projekcie
7. **TESTUJ** migracje na kopii produkcji
8. **BACKUP** przed uruchomieniem migracji w produkcji

---

## Dodatkowe zasoby

- [TypeORM Documentation](https://typeorm.io/)
- [NestJS Database Documentation](https://docs.nestjs.com/techniques/database)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [TypeORM Migrations Guide](https://typeorm.io/migrations)

---

**Dokument stworzony:** 2024  
**Projekt:** plemiona-bot-backend  
**Wersja:** 1.0.0  
**Autor:** Dokumentacja projektu

---

*Ten dokument stanowi kompletny przewodnik po integracji bazy danych MySQL z TypeORM w projekcie NestJS. Może być używany jako blueprint dla innych projektów.*

