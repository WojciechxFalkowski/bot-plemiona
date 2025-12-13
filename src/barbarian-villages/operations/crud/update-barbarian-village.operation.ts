import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { UpdateBarbarianVillageDto } from '../../dto/update-barbarian-village.dto';
import { Logger } from '@nestjs/common';
import { findOneBarbarianVillageOperation } from '../query/find-one-barbarian-village.operation';

export interface UpdateBarbarianVillageDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Aktualizuje wioskę barbarzyńską z walidacją istnienia
 * @param serverId ID serwera
 * @param target ID wioski (target)
 * @param updateBarbarianVillageDto DTO z danymi do aktualizacji
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Zaktualizowana encja wioski barbarzyńskiej
 */
export async function updateBarbarianVillageOperation(
    serverId: number,
    target: string,
    updateBarbarianVillageDto: UpdateBarbarianVillageDto,
    deps: UpdateBarbarianVillageDependencies
): Promise<BarbarianVillageEntity> {
    const { barbarianVillageRepository, logger } = deps;

    logger.log(`Updating barbarian village ${target} on server ${serverId}: ${JSON.stringify(updateBarbarianVillageDto)}`);

    const village = await findOneBarbarianVillageOperation(serverId, target, {
        barbarianVillageRepository,
        logger
    });

    Object.assign(village, updateBarbarianVillageDto);
    const savedVillage = await barbarianVillageRepository.save(village);

    logger.log(`Barbarian village updated successfully: ${savedVillage.name} (${savedVillage.target}) on server ${serverId}`);
    return savedVillage;
}


