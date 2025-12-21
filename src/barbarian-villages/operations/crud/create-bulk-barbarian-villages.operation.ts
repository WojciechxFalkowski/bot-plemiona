import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';

export interface CreateBulkBarbarianVillagesDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

export interface VillageBulkData {
    target: string;
    villageId: string;
}

/**
 * Masowe tworzenie wiosek barbarzyńskich
 * @param serverId ID serwera
 * @param villagesData Tablica danych wiosek do utworzenia
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica utworzonych encji wiosek barbarzyńskich
 */
export async function createBulkBarbarianVillagesOperation(
    serverId: number,
    villagesData: VillageBulkData[],
    deps: CreateBulkBarbarianVillagesDependencies
): Promise<BarbarianVillageEntity[]> {
    const { barbarianVillageRepository, logger } = deps;

    logger.log(`Creating ${villagesData.length} barbarian villages in bulk for serverId=${serverId}`);

    if (villagesData.length === 0) {
        return [];
    }

    const villages = villagesData.map(data =>
        barbarianVillageRepository.create({
            target: data.target,
            serverId,
            villageId: data.villageId,
            name: 'Wioska barbarzyńska',
            coordinateX: 0,
            coordinateY: 0,
            canAttack: true
        })
    );

    const savedVillages = await barbarianVillageRepository.save(villages);
    logger.log(`Successfully created ${savedVillages.length} barbarian villages for serverId=${serverId}`);

    return savedVillages;
}




