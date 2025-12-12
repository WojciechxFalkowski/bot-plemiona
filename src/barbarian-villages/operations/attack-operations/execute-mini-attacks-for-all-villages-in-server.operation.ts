import { Browser } from 'playwright';
import { Logger } from '@nestjs/common';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { MiniAttackStrategiesService } from '@/mini-attack-strategies';
import { createBrowserPage } from '@/utils/browser.utils';
import { AttackResult } from '@/utils/army/attack.utils';
import { executeMiniAttacksOperation } from './execute-mini-attacks.operation';
import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { ArmyUtils } from '@/utils/army/army.utils';
import { AttackUtils } from '@/utils/army/attack.utils';

export interface ExecuteMiniAttacksForAllVillagesInServerDependencies {
    serversService: ServersService;
    plemionaCookiesService: PlemionaCookiesService;
    credentials: PlemionaCredentials;
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    armyUtils: typeof ArmyUtils;
    attackUtils: typeof AttackUtils;
    miniAttackStrategiesService: MiniAttackStrategiesService;
    logger: Logger;
}

/**
 * Główna operacja ataków dla wszystkich wiosek serwera (orchestracja logowania, ataków)
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica wyników ataków
 */
export async function executeMiniAttacksForAllVillagesInServerOperation(
    serverId: number,
    deps: ExecuteMiniAttacksForAllVillagesInServerDependencies
): Promise<AttackResult[]> {
    const { serversService, plemionaCookiesService, credentials, barbarianVillageRepository, armyUtils, attackUtils, miniAttackStrategiesService, logger } = deps;

    const { browser, page } = await createBrowserPage({ headless: true });

    try {
        const serverName = await serversService.getServerName(serverId);
        const serverCode = await serversService.getServerCode(serverId);

        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            credentials,
            plemionaCookiesService,
            serverName
        );

        if (!loginResult.success || !loginResult.worldSelected) {
            throw new Error(`Login failed for server ${serverId}: ${loginResult.error || 'Unknown error'}`);
        }

        logger.log(`Successfully logged in for server ${serverId}, starting mini attacks...`);

        const strategies = await miniAttackStrategiesService.findAllByServer(serverId);
        const attackResults: AttackResult[] = [];

        for (const strategy of strategies) {
            const results = await executeMiniAttacksOperation({
                page,
                serverId,
                villageId: strategy.villageId,
                serverCode,
                barbarianVillageRepository,
                armyUtils,
                attackUtils,
                miniAttackStrategiesService,
                logger,
                strategy
            });
            attackResults.push(...results);
        }

        return attackResults;

    } finally {
        await browser.close();
    }
}

