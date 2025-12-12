import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { VillageResponseDto } from '../../dto/village-response.dto';
import { mapToResponseDtoOperation } from '../utilities/map-to-response-dto.operation';

export interface FindVillageByIdDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Znajduje wioskę po ID dla danego serwera
 * @param serverId ID serwera
 * @param id ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO wioski
 * @throws NotFoundException jeśli wioska nie istnieje
 */
export async function findVillageByIdOperation(
    serverId: number,
    id: string,
    deps: FindVillageByIdDependencies
): Promise<VillageResponseDto> {
    const { villageRepository, logger } = deps;
    
    logger.debug(`Finding village ${id} for server ${serverId}`);

    const village = await villageRepository.findOne({
        where: { serverId, id }
    });

    if (!village) {
        throw new NotFoundException(`Village with ID ${id} not found on server ${serverId}`);
    }
    
    return mapToResponseDtoOperation(village);
}

