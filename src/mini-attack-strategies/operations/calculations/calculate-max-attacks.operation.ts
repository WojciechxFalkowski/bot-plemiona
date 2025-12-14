import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MiniAttackStrategyEntity } from '../../entities/mini-attack-strategy.entity';
import { CalculateAttacksRequestDto } from '../../dto/calculate-attacks-request.dto';
import { CalculateAttacksResponseDto } from '../../dto/calculate-attacks-response.dto';
import { MILITARY_UNITS } from '../../constants/units.constants';

export interface CalculateMaxAttacksDependencies {
    strategiesRepo: Repository<MiniAttackStrategyEntity>;
    logger: Logger;
}

/**
 * Kalkuluje maksymalną liczbę ataków na podstawie dostępnych jednostek
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param availableUnits DTO z dostępnymi jednostkami
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO z wynikami kalkulacji
 * @throws NotFoundException jeśli strategia nie istnieje
 */
export async function calculateMaxAttacksOperation(
    serverId: number,
    villageId: string,
    availableUnits: CalculateAttacksRequestDto,
    deps: CalculateMaxAttacksDependencies
): Promise<CalculateAttacksResponseDto> {
    const { strategiesRepo, logger } = deps;

    logger.debug(`Calculating max attacks for server ${serverId}, village ${villageId}`);

    const strategy = await strategiesRepo.findOne({
        where: { serverId, villageId },
        order: { id: 'ASC' }
    });

    if (!strategy) {
        throw new NotFoundException(`Strategy not found for server ${serverId}, village ${villageId}`);
    }

    const calculationDetails: Record<string, { available: number; required: number; maxAttacks: number | null }> = {};
    let minAttacks = Infinity;
    let bottleneckUnit = '';
    let bottleneckUnitPL = '';
    let availableBottleneckUnits = 0;
    let requiredBottleneckUnits = 0;

    for (const unit of MILITARY_UNITS) {
        const unitName = unit.name;
        const requiredCount = strategy[unitName as keyof MiniAttackStrategyEntity] as number;
        const availableCount = availableUnits[`available${unit.name.charAt(0).toUpperCase() + unit.name.slice(1)}` as keyof CalculateAttacksRequestDto] as number ?? 0;

        calculationDetails[unitName] = {
            available: availableCount,
            required: requiredCount,
            maxAttacks: null
        };

        if (requiredCount > 0) {
            const maxAttacksForThisUnit = Math.floor(availableCount / requiredCount);
            calculationDetails[unitName].maxAttacks = maxAttacksForThisUnit;

            if (maxAttacksForThisUnit < minAttacks) {
                minAttacks = maxAttacksForThisUnit;
                bottleneckUnit = unitName;
                bottleneckUnitPL = unit.namePL;
                availableBottleneckUnits = availableCount;
                requiredBottleneckUnits = requiredCount;
            }
        }
    }

    const maxAttacks = minAttacks === Infinity ? 0 : Math.max(0, minAttacks);

    logger.debug(`Max attacks calculated: ${maxAttacks}, bottleneck: ${bottleneckUnit}`);

    return {
        maxAttacks,
        bottleneckUnit,
        bottleneckUnitPL,
        availableBottleneckUnits,
        requiredBottleneckUnits,
        calculationDetails
    };
}



