import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { CreateBarbarianVillageFromUrlDto } from '../../dto/create-barbarian-village-from-url.dto';
import { Logger } from '@nestjs/common';
import { parseBarbarianVillageUrlOperation } from '../validation/parse-barbarian-village-url.operation';

export interface CreateBarbarianVillageFromUrlDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Tworzy wioskę barbarzyńską z URL z parsowaniem i walidacją
 * @param serverId ID serwera
 * @param createFromUrlDto DTO zawierające URL
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Utworzona encja wioski barbarzyńskiej
 * @throws ConflictException jeśli wioska już istnieje
 */
export async function createBarbarianVillageFromUrlOperation(
    serverId: number,
    createFromUrlDto: CreateBarbarianVillageFromUrlDto,
    deps: CreateBarbarianVillageFromUrlDependencies
): Promise<BarbarianVillageEntity> {
    const { barbarianVillageRepository, logger } = deps;

    logger.log(`Creating barbarian village from URL for server ${serverId}: ${createFromUrlDto.url}`);

    const urlParams = parseBarbarianVillageUrlOperation(createFromUrlDto.url, { logger });
    const { target, coordinateX, coordinateY, villageId } = urlParams;

    const existingVillage = await barbarianVillageRepository.findOne({
        where: { serverId, target }
    });

    if (existingVillage) {
        throw new ConflictException(`Barbarian village with target ${target} already exists on server ${serverId}`);
    }

    const village = barbarianVillageRepository.create({
        target,
        serverId,
        villageId,
        name: `Wioska barbarzyńska`,
        coordinateX,
        coordinateY,
        canAttack: true
    });

    const savedVillage = await barbarianVillageRepository.save(village);
    logger.log(`Barbarian village created from URL: ${savedVillage.name} (${savedVillage.target}) on server ${serverId}`);

    return savedVillage;
}

