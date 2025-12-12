import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { VillageToggleResponseDto } from '../../dto/village-response.dto';

export interface ToggleAutoScavengingDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Przełącza ustawienie auto-scavenging dla wioski po ID
 * @param serverId ID serwera
 * @param id ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO z aktualnym stanem ustawienia
 * @throws NotFoundException jeśli wioska nie istnieje
 */
export async function toggleAutoScavengingOperation(
    serverId: number,
    id: string,
    deps: ToggleAutoScavengingDependencies
): Promise<VillageToggleResponseDto> {
    const { villageRepository, logger } = deps;
    
    logger.debug(`Toggling auto-scavenging for village ${id} on server ${serverId}`);

    const village = await villageRepository.findOne({
        where: { serverId, id }
    });

    if (!village) {
        throw new NotFoundException(`Village with ID ${id} not found on server ${serverId}`);
    }

    village.isAutoScavengingEnabled = !village.isAutoScavengingEnabled;
    await villageRepository.save(village);

    logger.log(`Auto-scavenging ${village.isAutoScavengingEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${id}) on server ${serverId}`);

    return {
        id: village.id,
        isAutoScavengingEnabled: village.isAutoScavengingEnabled
    };
}

