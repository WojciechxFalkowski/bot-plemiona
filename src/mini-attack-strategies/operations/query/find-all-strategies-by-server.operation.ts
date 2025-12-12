import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';
import { MiniAttackStrategyResponseDto } from '../../dto/mini-attack-strategy-response.dto';
import { mapStrategyToResponseDtoOperation } from '../utilities/map-strategy-to-response-dto.operation';

export interface FindAllStrategiesByServerDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Pobiera wszystkie strategie dla konkretnego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica DTO strategii
 */
export async function findAllStrategiesByServerOperation(
    serverId: number,
    deps: FindAllStrategiesByServerDependencies
): Promise<MiniAttackStrategyResponseDto[]> {
    const { strategiesRepo, logger } = deps;

    logger.debug(`Finding all strategies for server ${serverId}`);

    const strategies = await strategiesRepo.find({
        where: { serverId },
        order: { villageId: 'ASC', id: 'ASC' }
    });

    logger.debug(`Found ${strategies.length} strategies for server ${serverId}`);

    return strategies.map(strategy => mapStrategyToResponseDtoOperation(strategy));
}

