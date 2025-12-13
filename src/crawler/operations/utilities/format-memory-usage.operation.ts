import * as process from 'node:process';

export interface FormattedMemoryUsage {
    rss: string;
    heapUsed: string;
    heapTotal: string;
    external: string;
    arrayBuffers: string;
    timestamp: string;
}

/**
 * Formats memory usage from Node.js process.memoryUsage() to human-readable format
 * @param memUsage Memory usage object from process.memoryUsage()
 * @returns Formatted memory usage with values in MB
 */
export function formatMemoryUsageOperation(memUsage: NodeJS.MemoryUsage): FormattedMemoryUsage {
    const formatBytes = (bytes: number): string => {
        return `${Math.round(bytes / 1024 / 1024)} MB`;
    };

    return {
        rss: formatBytes(memUsage.rss),
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        external: formatBytes(memUsage.external),
        arrayBuffers: formatBytes(memUsage.arrayBuffers),
        timestamp: new Date().toISOString()
    };
}

