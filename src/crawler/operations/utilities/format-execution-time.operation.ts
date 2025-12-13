/**
 * Formats execution time in milliseconds to a human-readable string
 * @param timeUntilExecution Time in milliseconds until execution
 * @returns Formatted time string (e.g., "5m 30s" or "45s")
 */
export function formatExecutionTimeOperation(timeUntilExecution: number): string {
    const timeUntil = Math.max(0, timeUntilExecution);
    const minutes = Math.floor(timeUntil / 1000 / 60);
    const seconds = Math.floor((timeUntil / 1000) % 60);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}


