import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { UpdateVillageDto } from '../../dto/update-village.dto';
import { VillageResponseDto } from '../../dto/village-response.dto';
import { mapToResponseDtoOperation } from '../utilities/map-to-response-dto.operation';

export interface UpdateVillageDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Aktualizuje wioskę dla danego serwera
 * @param serverId ID serwera
 * @param id ID wioski do aktualizacji
 * @param updateVillageDto Dane do aktualizacji
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO zaktualizowanej wioski
 * @throws NotFoundException jeśli wioska nie istnieje
 */
export async function updateVillageOperation(
    serverId: number,
    id: string,
    updateVillageDto: UpdateVillageDto,
    deps: UpdateVillageDependencies
): Promise<VillageResponseDto> {
    const { villageRepository, logger } = deps;
    
    logger.log(`Updating village ${id} on server ${serverId}: ${JSON.stringify(updateVillageDto)}`);

    const village = await villageRepository.findOne({
        where: { serverId, id }
    });

    if (!village) {
        throw new NotFoundException(`Village with ID ${id} not found on server ${serverId}`);
    }

    // Update properties
    Object.assign(village, updateVillageDto);
    const savedVillage = await villageRepository.save(village);

    logger.log(`Village updated successfully: ${savedVillage.name} (${savedVillage.id}) on server ${serverId}`);
    return mapToResponseDtoOperation(savedVillage);
}

