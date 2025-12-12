import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { VillageResponseDto } from '../../dto/village-response.dto';
import { mapToResponseDtoOperation } from '../utilities/map-to-response-dto.operation';

export interface FindVillagesWithAutoBuildingDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Znajduje wszystkie wioski z włączonym auto-building dla danego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Lista wiosek z włączonym auto-building, posortowana alfabetycznie
 */
export async function findVillagesWithAutoBuildingOperation(
    serverId: number,
    deps: FindVillagesWithAutoBuildingDependencies
): Promise<VillageResponseDto[]> {
    const { villageRepository, logger } = deps;
    
    logger.debug(`Finding villages with auto-building enabled for server ${serverId}`);

    const villages = await villageRepository.find({
        where: { serverId, isAutoBuildEnabled: true },
        order: { name: 'ASC' }
    });

    return villages.map(village => mapToResponseDtoOperation(village));
}

