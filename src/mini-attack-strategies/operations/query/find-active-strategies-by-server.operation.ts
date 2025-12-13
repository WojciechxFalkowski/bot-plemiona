import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';
import { MiniAttackStrategyResponseDto } from '../../dto/mini-attack-strategy-response.dto';
import { mapStrategyToResponseDtoOperation } from '../utilities/map-strategy-to-response-dto.operation';

export interface FindActiveStrategiesByServerDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Pobiera tylko aktywne strategie dla konkretnego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica DTO aktywnych strategii
 */
export async function findActiveStrategiesByServerOperation(
    serverId: number,
    deps: FindActiveStrategiesByServerDependencies
): Promise<MiniAttackStrategyResponseDto[]> {
    const { strategiesRepo, logger } = deps;

    logger.debug(`Finding active strategies for server ${serverId}`);

    const strategies = await strategiesRepo.find({
        where: { serverId, is_active: true },
        order: { villageId: 'ASC', id: 'ASC' }
    });

    logger.debug(`Found ${strategies.length} active strategies for server ${serverId}`);

    return strategies.map(strategy => mapStrategyToResponseDtoOperation(strategy));
}


