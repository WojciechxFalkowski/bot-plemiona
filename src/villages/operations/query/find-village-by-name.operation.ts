import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { VillageResponseDto } from '../../dto/village-response.dto';
import { mapToResponseDtoOperation } from '../utilities/map-to-response-dto.operation';

export interface FindVillageByNameDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Znajduje wioskę po nazwie dla danego serwera
 * @param serverId ID serwera
 * @param name Nazwa wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO wioski
 * @throws NotFoundException jeśli wioska nie istnieje
 */
export async function findVillageByNameOperation(
    serverId: number,
    name: string,
    deps: FindVillageByNameDependencies
): Promise<VillageResponseDto> {
    const { villageRepository, logger } = deps;
    
    logger.debug(`Finding village "${name}" for server ${serverId}`);

    const village = await villageRepository.findOne({
        where: { serverId, name }
    });

    if (!village) {
        throw new NotFoundException(`Village with name "${name}" not found on server ${serverId}`);
    }
    
    return mapToResponseDtoOperation(village);
}

