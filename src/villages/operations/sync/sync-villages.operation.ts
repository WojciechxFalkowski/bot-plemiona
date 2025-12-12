import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { BasicVillageData } from '@/crawler/pages/profile.page';
import { VillagesSyncResult } from '../../contracts/villages.contract';

export interface SyncVillagesDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Synchronizuje wioski z listą danych (upsert/delete logic)
 * Dodaje nowe wioski, aktualizuje istniejące i usuwa te, które już nie istnieją w grze
 * @param serverId ID serwera
 * @param villageDataList Lista danych wiosek z gry
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wynik synchronizacji z liczbami dodanych, zaktualizowanych i usuniętych wiosek
 */
export async function syncVillagesOperation(
    serverId: number,
    villageDataList: BasicVillageData[],
    deps: SyncVillagesDependencies
): Promise<VillagesSyncResult> {
    const { villageRepository, logger } = deps;
    
    logger.log(`Syncing ${villageDataList.length} villages from crawler data for server ${serverId}`);

    const existingVillages = await villageRepository.find({
        where: { serverId }
    });

    const existingVillageIds = new Set(existingVillages.map(v => v.id));
    const incomingVillageIds = new Set(villageDataList.map(v => v.id));

    let added = 0;
    let updated = 0;
    let deleted = 0;

    // Add new villages and update existing ones
    for (const villageData of villageDataList) {
        const villageId = villageData.id;
        const existingVillage = existingVillages.find(v => v.id === villageId);

        if (existingVillage) {
            // Always update to refresh the updatedAt timestamp
            let hasChanges = false;
            if (existingVillage.name !== villageData.name || existingVillage.coordinates !== villageData.coordinates) {
                existingVillage.name = villageData.name;
                existingVillage.coordinates = villageData.coordinates;
                hasChanges = true;
            }

            // Always save to update the updatedAt timestamp
            await villageRepository.save(existingVillage);

            if (hasChanges) {
                updated++;
                logger.log(`Updated village ${villageData.name} (${villageData.id}) on server ${serverId}`);
            }
        } else {
            // Add new village
            const newVillage = villageRepository.create({
                id: villageId,
                serverId,
                name: villageData.name,
                coordinates: villageData.coordinates,
                isAutoBuildEnabled: false,
                isAutoScavengingEnabled: false
            });
            await villageRepository.save(newVillage);
            added++;
            logger.log(`Added new village ${villageData.name} (${villageData.id}) on server ${serverId}`);
        }
    }

    // Remove villages that no longer exist
    for (const existingVillage of existingVillages) {
        if (!incomingVillageIds.has(existingVillage.id)) {
            await villageRepository.remove(existingVillage);
            deleted++;
            logger.log(`Deleted village ${existingVillage.name} (${existingVillage.id}) from server ${serverId}`);
        }
    }

    const result: VillagesSyncResult = {
        totalProcessed: villageDataList.length,
        added,
        updated,
        deleted,
        currentTotal: await villageRepository.count({ where: { serverId } })
    };

    logger.log(`Village sync completed for server ${serverId}: ${JSON.stringify(result)}`);
    return result;
}

