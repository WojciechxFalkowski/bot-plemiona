import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { VillageResponseDto } from '../../dto/village-response.dto';
import { mapToResponseDtoOperation } from '../utilities/map-to-response-dto.operation';

export interface FindAllVillagesDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Znajduje wszystkie wioski dla danego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Lista wiosek posortowana alfabetycznie po nazwie
 */
export async function findAllVillagesOperation(
    serverId: number,
    deps: FindAllVillagesDependencies
): Promise<VillageResponseDto[]> {
    const { villageRepository, logger } = deps;
    
    logger.debug(`Finding all villages for server ${serverId}`);

    const villages = await villageRepository.find({
        where: { serverId },
        order: { name: 'ASC' }
    });

    return villages.map(village => mapToResponseDtoOperation(village));
}

