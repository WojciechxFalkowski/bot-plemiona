import { ServersService } from '@/servers/servers.service';
import { Logger } from '@nestjs/common';

export interface GetServerInfoDependencies {
    serversService: ServersService;
    logger: Logger;
}

export interface ServerInfo {
    serverCode: string;
    serverName: string;
}

/**
 * Gets server code and name for a specific server
 * @param serverId ID of the server
 * @param deps Dependencies needed for query
 * @returns Server code and name
 */
export async function getServerInfoOperation(
    serverId: number,
    deps: GetServerInfoDependencies
): Promise<ServerInfo> {
    const { serversService, logger } = deps;

    try {
        const serverCode = await serversService.getServerCode(serverId);
        const serverName = await serversService.getServerName(serverId);
        return { serverCode, serverName };
    } catch (error) {
        logger.error(`Error getting server info for server ${serverId}:`, error);
        throw error;
    }
}


