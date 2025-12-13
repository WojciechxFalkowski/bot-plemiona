import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';
import { findOneBarbarianVillageOperation } from '../query/find-one-barbarian-village.operation';

export interface RemoveBarbarianVillageDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Usuwa wioskę barbarzyńską z walidacją istnienia
 * @param serverId ID serwera
 * @param target ID wioski (target)
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function removeBarbarianVillageOperation(
    serverId: number,
    target: string,
    deps: RemoveBarbarianVillageDependencies
): Promise<void> {
    const { barbarianVillageRepository, logger } = deps;

    logger.log(`Deleting barbarian village ${target} from server ${serverId}`);

    const village = await findOneBarbarianVillageOperation(serverId, target, {
        barbarianVillageRepository,
        logger
    });

    await barbarianVillageRepository.remove(village);

    logger.log(`Barbarian village deleted successfully: ${village.name} (${target}) from server ${serverId}`);
}


