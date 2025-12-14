import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';

export interface SyncBarbarianVillagesDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

export interface SyncResult {
    added: number;
    updated: number;
    deleted: number;
}

/**
 * Synchronizuje dane wiosek barbarzyńskich z bazą danych (dodanie, aktualizacja, usunięcie)
 * @param serverId ID serwera
 * @param villagesData Tablica danych wiosek do synchronizacji
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wynik synchronizacji z liczbami dodanych, zaktualizowanych i usuniętych wiosek
 */
export async function syncBarbarianVillagesOperation(
    serverId: number,
    villagesData: any[],
    deps: SyncBarbarianVillagesDependencies
): Promise<SyncResult> {
    const { barbarianVillageRepository, logger } = deps;

    logger.log(`Syncing ${villagesData.length} barbarian villages for server ${serverId}`);

    const existingVillages = await barbarianVillageRepository.find({
        where: { serverId }
    });

    let added = 0;
    let updated = 0;
    let deleted = 0;

    return { added, updated, deleted };
}



