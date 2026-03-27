import { ServerResponseDto } from '@/servers/dto';
import { Logger } from '@nestjs/common';
import { ServerCrawlerPlan, CrawlerTask } from '../query/get-multi-server-status.operation';
import { buildDefaultResolvedOrchestratorScheduling } from '@/crawler/scheduling-config/build-default-resolved-orchestrator-scheduling.operation';

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
    const sched = buildDefaultResolvedOrchestratorScheduling();

    const serverPlan: ServerCrawlerPlan = {
        serverId: server.id,
        serverCode: server.serverCode,
        serverName: server.serverName,
        isActive: server.isActive,
        constructionQueue: {
            nextExecutionTime: new Date(now.getTime() + sched.constructionQueue.initialDelayMs),
            enabled: false,
            lastExecuted: null,
            name: 'Construction Queue'
        },
        scavenging: {
            nextExecutionTime: new Date(now.getTime() + sched.scavenging.initialDelayMs),
            enabled: false,
            lastExecuted: null,
            name: 'Scavenging',
            optimalDelay: null
        },
        massScavenging: {
            nextExecutionTime: new Date(now.getTime() + sched.massScavenging.initialDelayMs),
            enabled: false,
            lastExecuted: null,
            name: 'Mass Scavenging'
        },
        miniAttacks: {
            nextExecutionTime: new Date(now.getTime() + sched.miniAttacks.initialDelayMs),
            enabled: false,
            lastExecuted: null,
            name: 'Mini Attacks',
            nextTargetIndex: 0,
            lastAttackTime: null
        },
        playerVillageAttacks: {
            nextExecutionTime: new Date(now.getTime() + sched.playerVillageAttacks.initialDelayMs),
            enabled: false,
            lastExecuted: null,
            name: 'Player Village Attacks',
            nextTargetIndex: 0,
            lastAttackTime: null
        },
        armyTraining: {
            nextExecutionTime: new Date(now.getTime() + sched.armyTraining.initialDelayMs),
            enabled: false,
            lastExecuted: null,
            name: 'Army Training',
            villageId: null
        },
        twDatabase: {
            nextExecutionTime: new Date(now.getTime() + sched.twDatabase.initialDelayMs),
            enabled: false,
            lastExecuted: null,
            name: 'TW Database'
        },
        accountManager: {
            nextExecutionTime: new Date(now.getTime() + sched.accountManager.initialDelayMs),
            enabled: false,
            lastExecuted: null,
            name: 'Account Manager'
        },
        lastSuccessfulExecution: null
    };

    logger.log(`✅ Initialized crawler plan for server ${server.serverCode} (${server.serverName})`);
    return serverPlan;
}


