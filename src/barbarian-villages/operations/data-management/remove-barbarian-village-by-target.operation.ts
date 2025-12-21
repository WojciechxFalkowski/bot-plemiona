import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';

export interface RemoveBarbarianVillageByTargetDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Usuwa wioskę barbarzyńską po target (bez walidacji serwera)
 * @param target ID wioski (target)
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function removeBarbarianVillageByTargetOperation(
    target: string,
    deps: RemoveBarbarianVillageByTargetDependencies
): Promise<void> {
    const { barbarianVillageRepository, logger } = deps;

    logger.log(`Removing barbarian village with target ${target} from database`);
    const result = await barbarianVillageRepository.delete({ target });

    if (result.affected === 0) {
        logger.warn(`No barbarian village found with target ${target} to delete.`);
    } else {
        logger.log(`Barbarian village with target ${target} deleted successfully.`);
    }
}




