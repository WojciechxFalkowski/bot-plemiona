import { getMiniAttackIntervalsOperation, GetMiniAttackIntervalsDependencies } from './get-mini-attack-intervals.operation';
import { Logger } from '@nestjs/common';

export interface CalculateRandomMiniAttackIntervalDependencies extends GetMiniAttackIntervalsDependencies {}

const DEFAULT_MIN_MINI_ATTACK_INTERVAL = 1000 * 60 * 10; // 10 minutes
const DEFAULT_MAX_MINI_ATTACK_INTERVAL = 1000 * 60 * 15; // 15 minutes

/**
 * Generates random interval for mini attacks based on database settings
 * @param serverId ID of the server
 * @param deps Dependencies needed for calculation
 * @returns Random interval in milliseconds
 */
export async function calculateRandomMiniAttackIntervalOperation(
    serverId: number,
    deps: CalculateRandomMiniAttackIntervalDependencies
): Promise<number> {
    const { logger } = deps;

    try {
        const intervals = await getMiniAttackIntervalsOperation(serverId, deps);
        return Math.floor(Math.random() * (intervals.maxInterval - intervals.minInterval + 1)) + intervals.minInterval;
    } catch (error) {
        logger.error(`Error getting mini attack interval for server ${serverId}:`, error);
        // Fallback to default values
        return Math.floor(Math.random() * (DEFAULT_MAX_MINI_ATTACK_INTERVAL - DEFAULT_MIN_MINI_ATTACK_INTERVAL + 1)) + DEFAULT_MIN_MINI_ATTACK_INTERVAL;
    }
}


