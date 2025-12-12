import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { CreateVillageDto } from '../../dto/create-village.dto';
import { VillageResponseDto } from '../../dto/village-response.dto';
import { mapToResponseDtoOperation } from '../utilities/map-to-response-dto.operation';

export interface CreateVillageDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Tworzy nową wioskę dla danego serwera
 * @param serverId ID serwera
 * @param createVillageDto Dane wioski do utworzenia
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO utworzonej wioski
 * @throws Error jeśli wioska o podanym ID już istnieje
 */
export async function createVillageOperation(
    serverId: number,
    createVillageDto: CreateVillageDto,
    deps: CreateVillageDependencies
): Promise<VillageResponseDto> {
    const { villageRepository, logger } = deps;
    
    logger.log(`Creating village for server ${serverId}: ${JSON.stringify(createVillageDto)}`);

    // Check if village already exists on this server
    const existingVillage = await villageRepository.findOne({
        where: { serverId, id: createVillageDto.id }
    });

    if (existingVillage) {
        throw new Error(`Village with ID ${createVillageDto.id} already exists on server ${serverId}`);
    }

    const village = villageRepository.create({
        ...createVillageDto,
        serverId
    });

    const savedVillage = await villageRepository.save(village);
    logger.log(`Village created successfully: ${savedVillage.name} (${savedVillage.id}) on server ${serverId}`);

    return mapToResponseDtoOperation(savedVillage);
}

