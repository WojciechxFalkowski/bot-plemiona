import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';

export interface DeleteVillageDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Usuwa wioskę dla danego serwera
 * @param serverId ID serwera
 * @param id ID wioski do usunięcia
 * @param deps Zależności potrzebne do wykonania operacji
 * @throws NotFoundException jeśli wioska nie istnieje
 */
export async function deleteVillageOperation(
    serverId: number,
    id: string,
    deps: DeleteVillageDependencies
): Promise<void> {
    const { villageRepository, logger } = deps;
    
    logger.log(`Deleting village ${id} from server ${serverId}`);

    const village = await villageRepository.findOne({
        where: { serverId, id }
    });

    if (!village) {
        throw new NotFoundException(`Village with ID ${id} not found on server ${serverId}`);
    }

    await villageRepository.remove(village);
    logger.log(`Village deleted successfully: ${village.name} (${id}) from server ${serverId}`);
}

