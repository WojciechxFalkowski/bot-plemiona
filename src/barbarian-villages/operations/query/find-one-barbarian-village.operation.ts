import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';

export interface FindOneBarbarianVillageDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Pobiera pojedynczą wioskę barbarzyńską z walidacją istnienia
 * @param serverId ID serwera
 * @param target ID wioski (target)
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Encja wioski barbarzyńskiej
 * @throws NotFoundException jeśli wioska nie istnieje
 */
export async function findOneBarbarianVillageOperation(
    serverId: number,
    target: string,
    deps: FindOneBarbarianVillageDependencies
): Promise<BarbarianVillageEntity> {
    const { barbarianVillageRepository, logger } = deps;

    logger.debug(`Finding barbarian village ${target} for server ${serverId}`);
    const village = await barbarianVillageRepository.findOne({
        where: { serverId, target }
    });

    if (!village) {
        throw new NotFoundException(`Barbarian village with target ${target} not found on server ${serverId}`);
    }

    return village;
}



