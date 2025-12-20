import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';
import { MiniAttackStrategyResponseDto } from '../../dto/mini-attack-strategy-response.dto';
import { mapStrategyToResponseDtoOperation } from '../utilities/map-strategy-to-response-dto.operation';

export interface FindStrategyByServerAndVillageDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Pobiera strategię dla konkretnego serwera i wioski (pierwszą znalezioną)
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO strategii
 * @throws NotFoundException jeśli strategia nie istnieje
 */
export async function findStrategyByServerAndVillageOperation(
    serverId: number,
    villageId: string,
    deps: FindStrategyByServerAndVillageDependencies
): Promise<MiniAttackStrategyResponseDto> {
    const { strategiesRepo, logger } = deps;

    logger.debug(`Finding strategy for server ${serverId}, village ${villageId}`);

    const strategy = await strategiesRepo.findOne({
        where: { serverId, villageId },
        order: { id: 'ASC' }
    });

    if (!strategy) {
        throw new NotFoundException(`Strategy not found for server ${serverId}, village ${villageId}`);
    }

    return mapStrategyToResponseDtoOperation(strategy);
}















