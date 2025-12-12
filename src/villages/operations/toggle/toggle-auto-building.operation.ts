import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { VillageToggleResponseDto } from '../../dto/village-response.dto';

export interface ToggleAutoBuildingDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Przełącza ustawienie auto-building dla wioski po ID
 * @param serverId ID serwera
 * @param id ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO z aktualnym stanem ustawienia
 * @throws NotFoundException jeśli wioska nie istnieje
 */
export async function toggleAutoBuildingOperation(
    serverId: number,
    id: string,
    deps: ToggleAutoBuildingDependencies
): Promise<VillageToggleResponseDto> {
    const { villageRepository, logger } = deps;
    
    logger.debug(`Toggling auto-building for village ${id} on server ${serverId}`);

    const village = await villageRepository.findOne({
        where: { serverId, id }
    });

    if (!village) {
        throw new NotFoundException(`Village with ID ${id} not found on server ${serverId}`);
    }

    village.isAutoBuildEnabled = !village.isAutoBuildEnabled;
    await villageRepository.save(village);

    logger.log(`Auto-building ${village.isAutoBuildEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${id}) on server ${serverId}`);

    return {
        id: village.id,
        isAutoBuildEnabled: village.isAutoBuildEnabled
    };
}

