import { Logger } from '@nestjs/common';
import { formatMemoryUsageOperation } from '../utilities/format-memory-usage.operation';
import * as process from 'node:process';

export interface StartMemoryMonitoringDependencies {
    logger: Logger;
}

export interface MemoryMonitoringResult {
    timer: NodeJS.Timeout;
}

/**
 * Starts memory monitoring that logs memory usage periodically
 * @param intervalMs Interval in milliseconds between memory checks
 * @param deps Dependencies needed for monitoring
 * @returns Timer reference for stopping monitoring
 */
export function startMemoryMonitoringOperation(
    intervalMs: number,
    deps: StartMemoryMonitoringDependencies
): MemoryMonitoringResult {
    const { logger } = deps;

    logger.log('📊 Starting memory monitoring...');

    const timer = setInterval(() => {
        const memUsage = process.memoryUsage();
        const formatted = formatMemoryUsageOperation(memUsage);
        logger.log('📊 Memory Usage:', formatted);
    }, intervalMs);

    return { timer };
}


