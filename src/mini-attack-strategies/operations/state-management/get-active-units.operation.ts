import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';
import { MILITARY_UNITS } from '../../constants/units.constants';

export interface GetActiveUnitsDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Zwraca tylko aktywne jednostki (różne od 0) ze strategii
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Obiekt z aktywnymi jednostkami (nazwa jednostki -> liczba)
 * @throws NotFoundException jeśli strategia nie istnieje
 */
export async function getActiveUnitsOperation(
    serverId: number,
    villageId: string,
    deps: GetActiveUnitsDependencies
): Promise<Record<string, number>> {
    const { strategiesRepo, logger } = deps;

    const strategy = await strategiesRepo.findOne({
        where: { serverId, villageId },
        order: { id: 'ASC' }
    });

    if (!strategy) {
        throw new NotFoundException(`Strategy not found for server ${serverId}, village ${villageId}`);
    }

    const activeUnits: Record<string, number> = {};

    for (const unit of MILITARY_UNITS) {
        const unitName = unit.name;
        const count = strategy[unitName as keyof MiniAttackStrategyEntity] as number;

        if (count > 0) {
            activeUnits[unitName] = count;
        }
    }

    return activeUnits;
}