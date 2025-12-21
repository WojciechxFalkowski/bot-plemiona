import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { CreateBarbarianVillageDto } from '../../dto/create-barbarian-village.dto';
import { Logger } from '@nestjs/common';

export interface CreateBarbarianVillageDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Tworzy nową wioskę barbarzyńską z walidacją duplikatów
 * @param serverId ID serwera
 * @param createBarbarianVillageDto DTO z danymi wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Utworzona encja wioski barbarzyńskiej
 * @throws ConflictException jeśli wioska już istnieje
 */
export async function createBarbarianVillageOperation(
    serverId: number,
    createBarbarianVillageDto: CreateBarbarianVillageDto,
    deps: CreateBarbarianVillageDependencies
): Promise<BarbarianVillageEntity> {
    const { barbarianVillageRepository, logger } = deps;

    logger.log(`Creating barbarian village for server ${serverId}: ${JSON.stringify(createBarbarianVillageDto)}`);

    const existingVillage = await barbarianVillageRepository.findOne({
        where: { serverId, target: createBarbarianVillageDto.target }
    });

    if (existingVillage) {
        throw new ConflictException(`Barbarian village with target ${createBarbarianVillageDto.target} already exists on server ${serverId}`);
    }

    const village = barbarianVillageRepository.create({
        ...createBarbarianVillageDto,
        serverId
    });

    const savedVillage = await barbarianVillageRepository.save(village);
    logger.log(`Barbarian village created successfully: ${savedVillage.name} (${savedVillage.target}) on server ${serverId}`);

    return savedVillage;
}
