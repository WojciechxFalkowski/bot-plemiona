import { removeFromQueueOperation, RemoveFromQueueDependencies } from '../queue-management/remove-from-queue.operation';

export interface RemoveFromDatabaseWithReasonDependencies {
    logger: any;
    removeFromQueueDeps: RemoveFromQueueDependencies;
}

/**
 * Usuwa budynek z bazy danych z podaniem powodu
 * @param buildingId ID budynku do usunięcia
 * @param reason Powód usunięcia
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function removeFromDatabaseWithReasonOperation(
    buildingId: number,
    reason: string,
    deps: RemoveFromDatabaseWithReasonDependencies
): Promise<void> {
    const { logger, removeFromQueueDeps } = deps;
    try {
        await removeFromQueueOperation(buildingId, removeFromQueueDeps);
        logger.log(`🗑️  Removed from database: ${reason}`);
    } catch (error) {
        logger.error(`Error removing building ${buildingId} from database:`, error);
        throw error;
    }
}

