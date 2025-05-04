# TypeORM Migrations Guide

## Dostępne komendy w package.json

```bash
# Uruchomienie migracji
npm run migration:run

# Wygenerowanie nowej migracji
npm run migration:generate --name=AddSettingsTable

# Wygenerowanie migracji do usunięcia kolumn
npm run migration:generate --name=RemovepriceeAndPriceee

# Pokazanie statusu migracji
npm run migration:show  

# Cofnięcie ostatniej migracji
npm run migration:revert
```

## Przykłady migracji

### 1. Migracja początkowa (tworzenie tabel)

Ta migracja tworzy wszystkie podstawowe tabele w bazie danych:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1742232286338 implements MigrationInterface {
    name = 'InitialMigration1742232286338'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`tracked_urls\` (\`id\` int NOT NULL AUTO_INCREMENT, \`url\` longtext NOT NULL, \`description\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`car_details\` (\`id\` int NOT NULL AUTO_INCREMENT, \`brand\` varchar(255) NOT NULL, \`model\` varchar(255) NOT NULL, \`version\` varchar(255) NULL, \`color\` varchar(255) NULL, \`doorCount\` varchar(255) NULL, \`seatCount\` varchar(255) NULL, \`productionYear\` varchar(255) NULL, \`generation\` varchar(255) NULL, \`vin\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`car_specifications\` (\`id\` int NOT NULL AUTO_INCREMENT, \`fuelType\` varchar(255) NULL, \`engineCapacity\` varchar(255) NULL, \`power\` varchar(255) NULL, \`bodyType\` varchar(255) NULL, \`gearbox\` varchar(255) NULL, \`drive\` varchar(255) NULL, \`mileage\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`cars\` (\`id\` int NOT NULL AUTO_INCREMENT, \`externalId\` varchar(255) NOT NULL, \`title\` varchar(255) NOT NULL, \`price\` int NULL, \`pricee\` int NULL, \`priceee\` varchar(255) NULL, \`url\` varchar(255) NOT NULL, \`publishedDate\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`trackedUrlId\` int NULL, \`detailsId\` int NULL, \`specificationId\` int NULL, UNIQUE INDEX \`IDX_f3938b07f37132df20288c3fa7\` (\`externalId\`), UNIQUE INDEX \`IDX_24413af4620d16b50c4d127da6\` (\`url\`), UNIQUE INDEX \`REL_140778b240787b412a24b2972d\` (\`detailsId\`), UNIQUE INDEX \`REL_e80c1cfc74965cf923a89f9952\` (\`specificationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`car_images\` (\`id\` int NOT NULL AUTO_INCREMENT, \`imageUrl\` longtext NOT NULL, \`offerId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`cars\` ADD CONSTRAINT \`FK_c40a5dd7d73920a42c20a49e262\` FOREIGN KEY (\`trackedUrlId\`) REFERENCES \`tracked_urls\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`cars\` ADD CONSTRAINT \`FK_140778b240787b412a24b2972d1\` FOREIGN KEY (\`detailsId\`) REFERENCES \`car_details\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`cars\` ADD CONSTRAINT \`FK_e80c1cfc74965cf923a89f9952b\` FOREIGN KEY (\`specificationId\`) REFERENCES \`car_specifications\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`car_images\` ADD CONSTRAINT \`FK_4c2b5b6ac2e384f2ec034ea6c39\` FOREIGN KEY (\`offerId\`) REFERENCES \`cars\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`car_images\` DROP FOREIGN KEY \`FK_4c2b5b6ac2e384f2ec034ea6c39\``);
        await queryRunner.query(`ALTER TABLE \`cars\` DROP FOREIGN KEY \`FK_e80c1cfc74965cf923a89f9952b\``);
        await queryRunner.query(`ALTER TABLE \`cars\` DROP FOREIGN KEY \`FK_140778b240787b412a24b2972d1\``);
        await queryRunner.query(`ALTER TABLE \`cars\` DROP FOREIGN KEY \`FK_c40a5dd7d73920a42c20a49e262\``);
        await queryRunner.query(`DROP TABLE \`car_images\``);
        await queryRunner.query(`DROP INDEX \`REL_e80c1cfc74965cf923a89f9952\` ON \`cars\``);
        await queryRunner.query(`DROP INDEX \`REL_140778b240787b412a24b2972d\` ON \`cars\``);
        await queryRunner.query(`DROP INDEX \`IDX_24413af4620d16b50c4d127da6\` ON \`cars\``);
        await queryRunner.query(`DROP INDEX \`IDX_f3938b07f37132df20288c3fa7\` ON \`cars\``);
        await queryRunner.query(`DROP TABLE \`cars\``);
        await queryRunner.query(`DROP TABLE \`car_specifications\``);
        await queryRunner.query(`DROP TABLE \`car_details\``);
        await queryRunner.query(`DROP TABLE \`tracked_urls\``);
    }
}
```

### 2. Dodawanie kolumn do istniejącej tabeli

Poniższa migracja dodaje kolumny `brand` i `model` do tabeli `tracked_urls`:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrandAndModelToTrackedUrl1712320000001 implements MigrationInterface {
    name = 'AddBrandAndModelToTrackedUrl1712320000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tracked_urls\` ADD \`brand\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`tracked_urls\` ADD \`model\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tracked_urls\` DROP COLUMN \`model\``);
        await queryRunner.query(`ALTER TABLE \`tracked_urls\` DROP COLUMN \`brand\``);
    }
}
```

### 3. Usuwanie kolumn z tabeli

Ta migracja usuwa kolumny `pricee` i `priceee` z tabeli `cars`:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovepriceeAndPriceee1742236311073 implements MigrationInterface {
    name = 'RemovepriceeAndPriceee1742236311073'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cars\` DROP COLUMN \`pricee\``);
        await queryRunner.query(`ALTER TABLE \`cars\` DROP COLUMN \`priceee\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cars\` ADD \`priceee\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`cars\` ADD \`pricee\` int NULL`);
    }
}
```

### 4. Usuwanie relacji między tabelami

Poniższa migracja usuwa relację między tabelami `cars` i `tracked_urls` z bezpiecznym sprawdzeniem czy kolumna istnieje:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveTrackedUrlRelation1712320000000 implements MigrationInterface {
    name = 'RemoveTrackedUrlRelation1712320000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First check if the column exists
        const columnExists = await queryRunner.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'cars' 
            AND COLUMN_NAME = 'trackedUrlId'
        `);

        if (columnExists.length > 0) {
            // Get the actual foreign key name
            const foreignKey = await queryRunner.query(`
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_NAME = 'cars' 
                AND COLUMN_NAME = 'trackedUrlId' 
                AND REFERENCED_TABLE_NAME = 'tracked_urls'
            `);

            if (foreignKey.length > 0) {
                // Drop foreign key constraint
                await queryRunner.query(`ALTER TABLE \`cars\` DROP FOREIGN KEY \`${foreignKey[0].CONSTRAINT_NAME}\``);
            }

            // Drop the column
            await queryRunner.query(`ALTER TABLE \`cars\` DROP COLUMN \`trackedUrlId\``);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add the column back
        await queryRunner.query(`ALTER TABLE \`cars\` ADD \`trackedUrlId\` int NULL`);

        // Add foreign key constraint back
        await queryRunner.query(`ALTER TABLE \`cars\` ADD CONSTRAINT \`FK_cars_trackedUrlId\` FOREIGN KEY (\`trackedUrlId\`) REFERENCES \`tracked_urls\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }
}
```

### 5. Tworzenie nowej tabeli

Migracja tworząca nową tabelę `settings` z unikalnym kluczem:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSettingsTable1742238108371 implements MigrationInterface {
    name = 'AddSettingsTable1742238108371'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`settings\` (\`id\` int NOT NULL AUTO_INCREMENT, \`key\` varchar(255) NOT NULL, \`value\` json NOT NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_c8639b7626fa94ba8265628f21\` (\`key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_c8639b7626fa94ba8265628f21\` ON \`settings\``);
        await queryRunner.query(`DROP TABLE \`settings\``);
    }
}
```

### 6. Dodawanie nowej kolumny i tabeli

Ta migracja dodaje kolumnę `isActive` do tabeli `cars` oraz tworzy nową tabelę `car_price_history`:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCarPriceHistoryAndIsActive1744405539544 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add isActive column to cars table
        await queryRunner.query(`ALTER TABLE cars ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT TRUE`);

        // Create car_price_history table
        await queryRunner.query(`
            CREATE TABLE car_price_history (
                id INT NOT NULL AUTO_INCREMENT,
                carId INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY (carId) REFERENCES cars(id) ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop car_price_history table
        await queryRunner.query(`DROP TABLE car_price_history`);

        // Remove isActive column from cars table
        await queryRunner.query(`ALTER TABLE cars DROP COLUMN isActive`);
    }
}
```

### 7. Modyfikacja kolumny i przenoszenie danych

Ta migracja pokazuje jak zmienić właściwości kolumny (zrobić ją `NULL`) i przenieść dane z jednej kolumny do drugiej:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShortenedUrlToCars1744471266805 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Make externalId nullable first
        await queryRunner.query(`ALTER TABLE cars MODIFY COLUMN externalId VARCHAR(255) NULL;`);

        // Add shortenedUrl column
        await queryRunner.query(`ALTER TABLE cars ADD COLUMN shortenedUrl VARCHAR(255) NULL;`);

        // Copy data from externalId to shortenedUrl
        await queryRunner.query(`UPDATE cars SET shortenedUrl = externalId;`);

        // Clear externalId
        await queryRunner.query(`UPDATE cars SET externalId = NULL;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Copy data back from shortenedUrl to externalId
        await queryRunner.query(`UPDATE cars SET externalId = shortenedUrl;`);

        // Drop shortenedUrl column
        await queryRunner.query(`ALTER TABLE cars DROP COLUMN shortenedUrl;`);
    }
}
```

## Wskazówki dotyczące migracji

1. **Zawsze implementuj metodę `down`** - aby móc cofnąć zmiany w razie potrzeby
2. **Używaj znaczących nazw dla migracji** - np. `AddColumnX`, `CreateTableY`, `ModifyRelationZ`
3. **Testuj migracje na kopii bazy produkcyjnej** - przed wdrożeniem na produkcję
4. **Przechowuj wszystkie migracje w repozytorium** - razem z kodem aplikacji
5. **Nie modyfikuj istniejących migracji** - zamiast tego twórz nowe migracje naprawiające
6. **Sprawdzaj czy kolumny/tabele istnieją przed ich modyfikacją** - aby uniknąć błędów
7. **Używaj transakcji dla złożonych migracji** - aby zapewnić spójność danych

## Struktura katalogów

Migracje są przechowywane w katalogu `src/migrations`. Baza danych jest skonfigurowana w folderze `src/database`, którego nie trzeba modyfikować, ponieważ działa poprawnie w wielu projektach. 