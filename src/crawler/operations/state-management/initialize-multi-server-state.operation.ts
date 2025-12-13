import { ServerResponseDto } from '@/servers/dto';
import { Logger } from '@nestjs/common';
import { MultiServerState, ServerCrawlerPlan } from '../query/get-multi-server-status.operation';

export interface InitializeMultiServerStateDependencies {
    logger: Logger;
}

/**
 * Initializes the multi-server state structure
 * @param deps Dependencies needed for initialization
 * @returns Initialized multi-server state
 */
export function initializeMultiServerStateOperation(
    deps: InitializeMultiServerStateDependencies
): MultiServerState {
    const { logger } = deps;

    const state: MultiServerState = {
        currentServerIndex: 0,
        activeServers: [],
        serverPlans: new Map(),
        isRotating: false
    };

    logger.log('Multi-server state initialized');
    return state;
}


