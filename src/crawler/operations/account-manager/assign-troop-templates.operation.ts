import { Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { AccountManagerTroopsPage } from '../../pages/account-manager-troops.page';
import { ScrapedVillageStatus } from '../../pages/account-manager-combined.page';
import { handleCrawlerErrorOperation } from '../utils/handle-crawler-error.operation';

export interface AssignTroopTemplatesDependencies {
    logger: Logger;
    serverId: number;
}

export interface AssignTroopTemplatesResult {
    executionTimeMs: number;
    assignedGroups: {
        templateName: string;
        villageIds: number[];
        success: boolean;
    }[];
}

export async function assignTroopTemplatesOperation(
    serverCode: string,
    villages: ScrapedVillageStatus[],
    page: Page,
    deps: AssignTroopTemplatesDependencies
): Promise<AssignTroopTemplatesResult> {
    const { logger } = deps;
    const startTime = performance.now();
    const assignedGroups: AssignTroopTemplatesResult['assignedGroups'] = [];

    try {
        // 1. Filter out villages that are either blank or already recruiting
        const targetVillages = villages.filter(v => v.armyTemplateName !== '' && v.isRecruiting === false);

        if (targetVillages.length === 0) {
            logger.log('No villages require troop template assignment at this time.');
            return {
                executionTimeMs: Math.round(performance.now() - startTime),
                assignedGroups
            };
        }

        // 2. Group by armyTemplateName
        const groups = new Map<string, number[]>();
        for (const v of targetVillages) {
            const currentList = groups.get(v.armyTemplateName) || [];
            currentList.push(v.villageId);
            groups.set(v.armyTemplateName, currentList);
        }

        const amTroopsPage = new AccountManagerTroopsPage(page);

        // We can just use the first village ID to navigate to the view
        const navigationVillageId = targetVillages[0].villageId.toString();

        logger.log(`Navigating to Account Manager Troops view using village ID: ${navigationVillageId}...`);
        await amTroopsPage.navigate(serverCode, navigationVillageId);

        const classification = await handleCrawlerErrorOperation(page, page.url(), {
            operationType: 'Account Manager Templates Assignment',
            serverId: deps.serverId
        });

        if (classification === 'recaptcha_blocked') {
            throw new Error('reCAPTCHA wymaga odblokowania');
        } else if (classification === 'session_expired') {
            throw new Error('Sesja wygasła, wymagane ponowne logowanie');
        }

        // 3. Loop over each template group
        for (const [templateName, villageIds] of groups.entries()) {
            logger.log(`Assigning template [${templateName}] to ${villageIds.length} villages...`);
            let success = false;
            try {
                success = await amTroopsPage.assignTemplateToVillages(templateName, villageIds);
                if (success) {
                    logger.log(`Successfully assigned template [${templateName}].`);
                } else {
                    logger.warn(`Failed to assign template [${templateName}]. Checks logs.`);
                }
            } catch (err: any) {
                logger.error(`Failed to assign template [${templateName}]: ${err.message}`);
                success = false;
            }

            assignedGroups.push({
                templateName,
                villageIds,
                success
            });
        }

        const executionTimeMs = Math.round(performance.now() - startTime);

        return {
            executionTimeMs,
            assignedGroups
        };

    } catch (error) {
        logger.error(`Error during troop template assignment step:`, error);
        throw error;
    }
}
