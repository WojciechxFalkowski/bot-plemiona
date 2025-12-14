import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';

export interface DeleteAllForServerDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Usuwa wszystkie wioski barbarzyńskie dla danego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function deleteAllForServerOperation(
    serverId: number,
    deps: DeleteAllForServerDependencies
): Promise<void> {
    const { barbarianVillageRepository, logger } = deps;

    logger.log(`Deleting all barbarian villages for server ${serverId}`);

    await barbarianVillageRepository.delete({ serverId });

    logger.log(`All barbarian villages deleted for server ${serverId}`);
}



