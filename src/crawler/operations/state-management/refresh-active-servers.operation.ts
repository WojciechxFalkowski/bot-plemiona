import { Logger } from '@nestjs/common';
import { MultiServerState, ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import { ServerResponseDto } from '@/servers/dto';
import { getActiveServersOperation, GetActiveServersDependencies } from '../query/get-active-servers.operation';
import { initializeServerPlanOperation, InitializeServerPlanDependencies } from './initialize-server-plan.operation';

export interface RefreshActiveServersDependencies extends GetActiveServersDependencies, InitializeServerPlanDependencies {
    multiServerState: MultiServerState;
}

/**
 * Refreshes the list of active servers and initializes plans for new servers
 * @param deps Dependencies needed for refresh
 */
export async function refreshActiveServersOperation(
    deps: RefreshActiveServersDependencies
): Promise<void> {
    const { logger, multiServerState } = deps;

    try {
        const activeServers = await getActiveServersOperation(deps);

        // Update server list
        multiServerState.activeServers = activeServers;

        // Initialize plans for new servers
        for (const server of activeServers) {
            if (!multiServerState.serverPlans.has(server.id)) {
                const plan = initializeServerPlanOperation(server, deps);
                multiServerState.serverPlans.set(server.id, plan);
            }
        }

        // Remove plans for inactive servers
        const activeServerIds = new Set(activeServers.map(s => s.id));
        for (const serverId of multiServerState.serverPlans.keys()) {
            if (!activeServerIds.has(serverId)) {
                multiServerState.serverPlans.delete(serverId);
                logger.log(`🗑️ Removed plan for inactive server ${serverId}`);
            }
        }

        // Reset rotation index if needed
        if (multiServerState.currentServerIndex >= activeServers.length) {
            multiServerState.currentServerIndex = 0;
        }

        logger.debug(`🔄 Active servers refreshed: ${activeServers.length} servers`);
    } catch (error) {
        logger.error('❌ Error refreshing active servers:', error);
        throw error;
    }
}


