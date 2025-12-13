import { ServersService } from '@/servers/servers.service';
import { ServerResponseDto } from '@/servers/dto';
import { Logger } from '@nestjs/common';

export interface GetActiveServersDependencies {
    serversService: ServersService;
    logger: Logger;
}

/**
 * Gets list of active servers
 * @param deps Dependencies needed for query
 * @returns Array of active servers
 */
export async function getActiveServersOperation(
    deps: GetActiveServersDependencies
): Promise<ServerResponseDto[]> {
    const { serversService, logger } = deps;

    try {
        return await serversService.findActiveServers();
    } catch (error) {
        logger.error('Error getting active servers:', error);
        throw error;
    }
}


