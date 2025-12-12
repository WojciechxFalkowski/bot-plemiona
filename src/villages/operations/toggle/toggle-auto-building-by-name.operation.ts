import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { VillageToggleResponseDto } from '../../dto/village-response.dto';

export interface ToggleAutoBuildingByNameDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Przełącza ustawienie auto-building dla wioski po nazwie
 * @param serverId ID serwera
 * @param name Nazwa wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO z aktualnym stanem ustawienia
 * @throws NotFoundException jeśli wioska nie istnieje
 */
export async function toggleAutoBuildingByNameOperation(
    serverId: number,
    name: string,
    deps: ToggleAutoBuildingByNameDependencies
): Promise<VillageToggleResponseDto> {
    const { villageRepository, logger } = deps;
    
    logger.debug(`Toggling auto-building for village "${name}" on server ${serverId}`);

    const village = await villageRepository.findOne({
        where: { serverId, name }
    });

    if (!village) {
        throw new NotFoundException(`Village with name "${name}" not found on server ${serverId}`);
    }

    village.isAutoBuildEnabled = !village.isAutoBuildEnabled;
    await villageRepository.save(village);

    logger.log(`Auto-building ${village.isAutoBuildEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${village.id}) on server ${serverId}`);

    return {
        id: village.id,
        isAutoBuildEnabled: village.isAutoBuildEnabled
    };
}

