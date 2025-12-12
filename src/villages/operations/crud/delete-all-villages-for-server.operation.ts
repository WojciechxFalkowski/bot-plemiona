import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';

export interface DeleteAllVillagesForServerDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Usuwa wszystkie wioski dla danego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function deleteAllVillagesForServerOperation(
    serverId: number,
    deps: DeleteAllVillagesForServerDependencies
): Promise<void> {
    const { villageRepository, logger } = deps;

    logger.log(`Deleting all villages for server ${serverId}`);

    await villageRepository.delete({ serverId });

    logger.log(`All villages deleted for server ${serverId}`);
}

