import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';
import { MiniAttackStrategyResponseDto } from '../../dto/mini-attack-strategy-response.dto';
import { mapStrategyToResponseDtoOperation } from '../utilities/map-strategy-to-response-dto.operation';

export interface FindAllStrategiesByServerAndVillageDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Pobiera wszystkie strategie dla konkretnego serwera i wioski
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica DTO strategii
 */
export async function findAllStrategiesByServerAndVillageOperation(
    serverId: number,
    villageId: string,
    deps: FindAllStrategiesByServerAndVillageDependencies
): Promise<MiniAttackStrategyResponseDto[]> {
    const { strategiesRepo, logger } = deps;

    logger.debug(`Finding all strategies for server ${serverId}, village ${villageId}`);

    const strategies = await strategiesRepo.find({
        where: { serverId, villageId },
        order: { id: 'ASC' }
    });

    logger.debug(`Found ${strategies.length} strategies for server ${serverId}, village ${villageId}`);

    return strategies.map(strategy => mapStrategyToResponseDtoOperation(strategy));
}