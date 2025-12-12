import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';

export interface GetOldestBuildingPerVillageDependencies {
    queueRepository: Repository<VillageConstructionQueueEntity>;
    logger: any;
}

/**
 * Pobiera najstarszy budynek dla każdej wioski z kolejki budowy
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Lista budynków do przetworzenia (jeden na wioskę)
 */
export async function getOldestBuildingPerVillageOperation(
    deps: GetOldestBuildingPerVillageDependencies
): Promise<VillageConstructionQueueEntity[]> {
    const { queueRepository, logger } = deps;
    try {
        // Pobierz wszystkie budynki posortowane według daty utworzenia (FIFO)
        const allQueueItems = await queueRepository.find({
            relations: ['village'],
            order: { createdAt: 'ASC' }
        });

        if (allQueueItems.length === 0) {
            return [];
        }

        // Grupuj według ID wioski i weź tylko pierwszy (najstarszy) dla każdej wioski
        const buildingsPerVillage = new Map<string, VillageConstructionQueueEntity>();

        for (const item of allQueueItems) {
            if (!buildingsPerVillage.has(item.villageId)) {
                buildingsPerVillage.set(item.villageId, item);
            }
        }

        const result = Array.from(buildingsPerVillage.values());

        logger.log(`📦 Selected ${result.length} oldest buildings from ${allQueueItems.length} total queue items`);

        // Log details for each selected building
        result.forEach((building, index) => {
            logger.log(`  ${index + 1}. Village ${building.village?.name || building.villageId}: ${building.buildingName} L${building.targetLevel} (created: ${building.createdAt})`);
        });

        return result;

    } catch (error) {
        logger.error('Error fetching oldest buildings per village:', error);
        return [];
    }
}

