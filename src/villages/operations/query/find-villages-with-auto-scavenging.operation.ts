import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { VillageResponseDto } from '../../dto/village-response.dto';
import { mapToResponseDtoOperation } from '../utilities/map-to-response-dto.operation';

export interface FindVillagesWithAutoScavengingDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Znajduje wszystkie wioski z włączonym auto-scavenging dla danego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Lista wiosek z włączonym auto-scavenging, posortowana alfabetycznie
 */
export async function findVillagesWithAutoScavengingOperation(
    serverId: number,
    deps: FindVillagesWithAutoScavengingDependencies
): Promise<VillageResponseDto[]> {
    const { villageRepository, logger } = deps;
    
    logger.debug(`Finding villages with auto-scavenging enabled for server ${serverId}`);

    const villages = await villageRepository.find({
        where: { serverId, isAutoScavengingEnabled: true },
        order: { name: 'ASC' }
    });

    return villages.map(village => mapToResponseDtoOperation(village));
}

