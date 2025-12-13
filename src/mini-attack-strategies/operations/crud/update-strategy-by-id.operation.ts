import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';
import { UpdateMiniAttackStrategyDto } from '../../dto/update-mini-attack-strategy.dto';
import { MiniAttackStrategyResponseDto } from '../../dto/mini-attack-strategy-response.dto';
import { mapStrategyToResponseDtoOperation } from '../utilities/map-strategy-to-response-dto.operation';

export interface UpdateStrategyByIdDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Aktualizuje istniejącą strategię po ID
 * @param id ID strategii
 * @param updateDto DTO z danymi do aktualizacji
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO zaktualizowanej strategii
 * @throws NotFoundException jeśli strategia nie istnieje
 */
export async function updateStrategyByIdOperation(
    id: number,
    updateDto: UpdateMiniAttackStrategyDto,
    deps: UpdateStrategyByIdDependencies
): Promise<MiniAttackStrategyResponseDto> {
    const { strategiesRepo, logger } = deps;

    logger.log(`Updating strategy with ID ${id}`);

    const strategy = await strategiesRepo.findOne({
        where: { id }
    });

    if (!strategy) {
        throw new NotFoundException(`Strategy not found with ID ${id}`);
    }

    if (updateDto.spear !== undefined) strategy.spear = updateDto.spear;
    if (updateDto.sword !== undefined) strategy.sword = updateDto.sword;
    if (updateDto.axe !== undefined) strategy.axe = updateDto.axe;
    if (updateDto.archer !== undefined) strategy.archer = updateDto.archer;
    if (updateDto.spy !== undefined) strategy.spy = updateDto.spy;
    if (updateDto.light !== undefined) strategy.light = updateDto.light;
    if (updateDto.marcher !== undefined) strategy.marcher = updateDto.marcher;
    if (updateDto.heavy !== undefined) strategy.heavy = updateDto.heavy;
    if (updateDto.ram !== undefined) strategy.ram = updateDto.ram;
    if (updateDto.catapult !== undefined) strategy.catapult = updateDto.catapult;
    if (updateDto.knight !== undefined) strategy.knight = updateDto.knight;
    if (updateDto.snob !== undefined) strategy.snob = updateDto.snob;
    if (updateDto.next_target_index !== undefined) strategy.next_target_index = updateDto.next_target_index;
    if (updateDto.is_active !== undefined) strategy.is_active = updateDto.is_active;

    const savedStrategy = await strategiesRepo.save(strategy);
    logger.log(`Strategy updated successfully with ID ${id}`);

    return mapStrategyToResponseDtoOperation(savedStrategy);
}


