import { ServerResponseDto } from '@/servers/dto';
import { Logger } from '@nestjs/common';
import { ServerCrawlerPlan, CrawlerTask } from '../query/get-multi-server-status.operation';
import { getInitialIntervalsOperation } from '../calculations/get-initial-intervals.operation';

export interface InitializeServerPlanDependencies {
    logger: Logger;
}

/**
 * Initializes crawler plan for a new server
 * @param server Server to initialize plan for
 * @param deps Dependencies needed for initialization
 * @returns Initialized server crawler plan
 */
export function initializeServerPlanOperation(
    server: ServerResponseDto,
    deps: InitializeServerPlanDependencies
): ServerCrawlerPlan {
    const { logger } = deps;
    const now = new Date();
    const intervals = getInitialIntervalsOperation();

    const serverPlan: ServerCrawlerPlan = {
        serverId: server.id,
        serverCode: server.serverCode,
        serverName: server.serverName,
        isActive: server.isActive,
        constructionQueue: {
            nextExecutionTime: new Date(now.getTime() + intervals.construction),
            enabled: false,
            lastExecuted: null,
            name: 'Construction Queue'
        },
        scavenging: {
            nextExecutionTime: new Date(now.getTime() + 30000), // Start in 30 seconds
            enabled: false,
            lastExecuted: null,
            name: 'Scavenging',
            optimalDelay: null
        },
        miniAttacks: {
            nextExecutionTime: new Date(now.getTime() + intervals.miniAttack),
            enabled: false,
            lastExecuted: null,
            name: 'Mini Attacks',
            nextTargetIndex: 0,
            lastAttackTime: null
        },
        playerVillageAttacks: {
            nextExecutionTime: new Date(now.getTime() + intervals.playerVillageAttack),
            enabled: false,
            lastExecuted: null,
            name: 'Player Village Attacks',
            nextTargetIndex: 0,
            lastAttackTime: null
        },
        armyTraining: {
            nextExecutionTime: new Date(now.getTime() + intervals.armyTraining),
            enabled: false,
            lastExecuted: null,
            name: 'Army Training',
            villageId: null
        },
        lastSuccessfulExecution: null
    };

    logger.log(`✅ Initialized crawler plan for server ${server.serverCode} (${server.serverName})`);
    return serverPlan;
}


