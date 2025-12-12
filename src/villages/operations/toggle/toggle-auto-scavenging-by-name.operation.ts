import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { VillageToggleResponseDto } from '../../dto/village-response.dto';

export interface ToggleAutoScavengingByNameDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Przełącza ustawienie auto-scavenging dla wioski po nazwie
 * @param serverId ID serwera
 * @param name Nazwa wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO z aktualnym stanem ustawienia
 * @throws NotFoundException jeśli wioska nie istnieje
 */
export async function toggleAutoScavengingByNameOperation(
    serverId: number,
    name: string,
    deps: ToggleAutoScavengingByNameDependencies
): Promise<VillageToggleResponseDto> {
    const { villageRepository, logger } = deps;
    
    logger.debug(`Toggling auto-scavenging for village "${name}" on server ${serverId}`);

    const village = await villageRepository.findOne({
        where: { serverId, name }
    });

    if (!village) {
        throw new NotFoundException(`Village with name "${name}" not found on server ${serverId}`);
    }

    village.isAutoScavengingEnabled = !village.isAutoScavengingEnabled;
    await villageRepository.save(village);

    logger.log(`Auto-scavenging ${village.isAutoScavengingEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${village.id}) on server ${serverId}`);

    return {
        id: village.id,
        isAutoScavengingEnabled: village.isAutoScavengingEnabled
    };
}

