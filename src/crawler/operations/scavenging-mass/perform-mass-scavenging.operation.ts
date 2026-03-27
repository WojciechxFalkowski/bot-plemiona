import { Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { createBrowserPage } from '../../../utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { VillagesService } from '@/villages/villages.service';
import { ServersService } from '@/servers';
import { AdvancedScavengingService } from '@/advanced-scavenging/advanced-scavenging.service';
import { ScavengingLimitsService } from '@/scavenging-limits/scavenging-limits.service';
import { SettingsService } from '@/settings/settings.service';
import { ScavengeLevelStatus, LevelDispatchPlan } from '@/utils/scavenging/scavenging.interfaces';
import { ScavengingUtils } from '@/utils/scavenging/scavenging.utils';
import {
    ScavengingUnit,
    scavengingUnitPolishColumnTitle,
    unitOrder
} from '@/utils/scavenging.config';
import type { ScavengingUnitsConfig } from '@/advanced-scavenging/interfaces/scavenging-units-config.interface';
import { ScrapedVillageStatus } from '@/crawler/pages/account-manager-combined.page';
import { ScavengeMassPage } from '@/crawler/pages/scavenge-mass.page';
import { scrapeCombinedOverviewOperation } from '../account-manager/scrape-combined-overview.operation';
import { validateAutoScavengingMassEnabledOperation } from '../validation/validate-auto-scavenging-mass-enabled.operation';
import { handleCrawlerErrorOperation } from '../utils/handle-crawler-error.operation';
import { ServerScavengingLimitEntity } from '@/scavenging-limits/entities/server-scavenging-limit.entity';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';

/** URL/game mode for premium mass scavenging (`screen=place&mode=scavenge_mass`). */
const MASS_SCAVENGE_GAME_MODE = 'scavenge_mass';

/**
 * Unofficial Tribal Wars rule: each scavenging slot typically ignores sends below this many units.
 * Mass flow does not skip or alter the distribution — we only surface this in logs / activity DB.
 */
const MIN_UNITS_PER_MASS_SCAVENGE_DISPATCH = 10;

export interface PerformMassScavengingDependencies {
    logger: Logger;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
    villagesService: VillagesService;
    serversService: ServersService;
    advancedScavengingService: AdvancedScavengingService;
    scavengingLimitsService: ScavengingLimitsService;
    settingsService: SettingsService;
    activityContext?: {
        executionLogId: number | null;
        serverId: number;
        logActivity: (evt: { eventType: string; message: string }) => Promise<void>;
        onRecaptchaBlocked?: (serverId: number) => void;
    };
}

/**
 * Loads per-village advanced scavenging unit toggles for aggregation.
 */
async function loadScavengingUnitsConfigByVillageId(
    serverId: number,
    enabledVillageIds: string[],
    advancedScavengingService: AdvancedScavengingService
): Promise<Map<string, ScavengingUnitsConfig>> {
    const map = new Map<string, ScavengingUnitsConfig>();
    for (const villageId of enabledVillageIds) {
        const cfg = await advancedScavengingService.getVillageUnitsConfig(serverId, villageId);
        map.set(villageId, cfg.units);
    }
    return map;
}

/**
 * OR of unit toggles across villages with auto-scavenging (for distribution eligibility flags).
 */
function buildUnionEnabledUnitsFromConfigs(
    configsByVillageId: Map<string, ScavengingUnitsConfig>,
    enabledVillageIds: Set<string>
): Record<ScavengingUnit, boolean> {
    const result: Record<ScavengingUnit, boolean> = {
        spear: false,
        sword: false,
        axe: false,
        archer: false,
        light: false,
        marcher: false,
        heavy: false
    };
    for (const villageId of enabledVillageIds) {
        const cfg = configsByVillageId.get(villageId);
        if (!cfg) continue;
        for (const unit of unitOrder) {
            if (cfg[unit]) {
                result[unit] = true;
            }
        }
    }
    return result;
}

/**
 * Sums scraped troops per unit, counting a village's units only for types enabled there in advanced config.
 */
function aggregateUnitsForMassScavenging(
    villages: ScrapedVillageStatus[],
    enabledVillageIds: Set<string>,
    configsByVillageId: Map<string, ScavengingUnitsConfig>
): Partial<Record<ScavengingUnit, number>> {
    const totals: Partial<Record<ScavengingUnit, number>> = {};
    for (const unit of unitOrder) {
        totals[unit] = 0;
    }
    for (const v of villages) {
        const vid = String(v.villageId);
        if (!enabledVillageIds.has(vid)) continue;
        const cfg = configsByVillageId.get(vid);
        if (!cfg) continue;
        for (const unit of unitOrder) {
            if (!cfg[unit]) continue;
            const polish = scavengingUnitPolishColumnTitle[unit];
            const raw = v.units[polish] ?? 0;
            const n = typeof raw === 'number' && !Number.isNaN(raw) ? raw : 0;
            totals[unit] = (totals[unit] ?? 0) + n;
        }
    }
    return totals;
}

function sumDispatchUnits(dispatch: Partial<Record<ScavengingUnit, number>>): number {
    let s = 0;
    for (const unit of unitOrder) {
        s += Math.floor(dispatch[unit] ?? 0);
    }
    return s;
}

function formatDispatchUnitsEn(dispatch: Partial<Record<ScavengingUnit, number>>): string {
    const parts: string[] = [];
    for (const unit of unitOrder) {
        const n = Math.floor(dispatch[unit] ?? 0);
        if (n > 0) parts.push(`${unit}=${n}`);
    }
    return parts.join(', ');
}

function formatDispatchUnitsPl(dispatch: Partial<Record<ScavengingUnit, number>>): string {
    const parts: string[] = [];
    for (const unit of unitOrder) {
        const n = Math.floor(dispatch[unit] ?? 0);
        if (n > 0) parts.push(`${scavengingUnitPolishColumnTitle[unit]}: ${n}`);
    }
    return parts.join('; ') || 'brak';
}

function formatScrapedTotalsPl(totals: Partial<Record<ScavengingUnit, number>>): string {
    const parts: string[] = [];
    for (const unit of unitOrder) {
        const n = Math.floor(totals[unit] ?? 0);
        if (n > 0) parts.push(`${scavengingUnitPolishColumnTitle[unit]}: ${n}`);
    }
    return parts.join('; ') || 'brak';
}

function buildSyntheticFreeLevels(page: Page): ScavengeLevelStatus[] {
    const placeholder = page.locator('body');
    return [1, 2, 3, 4].map((level) => ({
        level,
        isLocked: false,
        isBusy: false,
        isAvailable: true,
        isUnlocking: false,
        containerLocator: placeholder
    }));
}

function mapGlobalLimitToTroopLimits(
    global: ServerScavengingLimitEntity | null
):
    | {
          maxSpearUnits?: number | null;
          maxSwordUnits?: number | null;
          maxAxeUnits?: number | null;
          maxArcherUnits?: number | null;
          maxLightUnits?: number | null;
          maxMarcherUnits?: number | null;
          maxHeavyUnits?: number | null;
      }
    | undefined {
    if (!global) return undefined;
    return {
        maxSpearUnits: global.maxSpearUnits,
        maxSwordUnits: global.maxSwordUnits,
        maxAxeUnits: global.maxAxeUnits,
        maxArcherUnits: global.maxArcherUnits,
        maxLightUnits: global.maxLightUnits,
        maxMarcherUnits: global.maxMarcherUnits,
        maxHeavyUnits: global.maxHeavyUnits
    };
}

/**
 * Runs mass scavenging (scavenge_mass): combined scrape, multi-unit distribution, per-page bulk sends.
 */
export async function performMassScavengingOperation(
    serverId: number,
    deps: PerformMassScavengingDependencies
): Promise<void> {
    const {
        logger,
        credentials,
        plemionaCookiesService,
        villagesService,
        serversService,
        advancedScavengingService,
        scavengingLimitsService,
        settingsService,
        activityContext
    } = deps;

    const enabled = await validateAutoScavengingMassEnabledOperation(serverId, { settingsService });
    if (!enabled) {
        logger.warn(`Mass scavenging is disabled for server ${serverId}. Skipping.`);
        return;
    }

    const dbVillages = await villagesService.findAll(serverId, false);
    const enabledVillageIds = new Set(dbVillages.filter((v) => v.isAutoScavengingEnabled).map((v) => v.id));
    if (enabledVillageIds.size === 0) {
        logger.warn('Mass scavenging: no villages with auto-scavenging enabled. Skipping.');
        return;
    }

    const configsByVillageId = await loadScavengingUnitsConfigByVillageId(
        serverId,
        [...enabledVillageIds],
        advancedScavengingService
    );
    const unionEnabledUnits = buildUnionEnabledUnitsFromConfigs(configsByVillageId, enabledVillageIds);
    if (!unitOrder.some((u) => unionEnabledUnits[u])) {
        logger.warn(
            'Mass scavenging: no unit types enabled in advanced scavenging for any village with auto-scavenging. Skipping.'
        );
        return;
    }

    const headless = process.env.NODE_ENV === 'production';
    const browserPage = await createBrowserPage({ headless });
    const browser = browserPage.browser;
    const { page } = browserPage;

    try {
        const serverCode = await serversService.getServerCode(serverId);
        const serverName = await serversService.getServerName(serverId);
        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            credentials,
            plemionaCookiesService,
            serverName
        );
        if (!loginResult.success || !loginResult.worldSelected) {
            await handleCrawlerErrorOperation(page, page.url(), {
                serverId,
                operationType: 'Mass Scavenging',
                logActivity: activityContext?.logActivity,
                onRecaptchaBlocked: activityContext?.onRecaptchaBlocked,
                errorMessage: `Login failed: ${loginResult.error || 'unknown'}`
            });
            throw new Error(`Mass scavenging login failed for ${serverCode}`);
        }

        const firstVillageId = dbVillages[0].id;
        const scrapeResult = await scrapeCombinedOverviewOperation(serverCode, firstVillageId, page, {
            logger,
            serverId
        });

        const availableUnits = aggregateUnitsForMassScavenging(
            scrapeResult.villages,
            enabledVillageIds,
            configsByVillageId
        );
        const totalPooledUnits = unitOrder.reduce((s, u) => s + (availableUnits[u] ?? 0), 0);
        if (totalPooledUnits <= 0) {
            logger.warn(
                'Mass scavenging: zero troops available for enabled unit types across villages with auto-scavenging. Skipping.'
            );
            return;
        }

        const globalLimit = await scavengingLimitsService.findGlobalLimit(serverId);
        const unitLimits = mapGlobalLimitToTroopLimits(globalLimit);

        const freeLevels = buildSyntheticFreeLevels(page);
        const dispatchPlan = ScavengingUtils.calculateTroopDistribution(
            availableUnits,
            freeLevels,
            unionEnabledUnits,
            unitLimits
        );
        if (!dispatchPlan || dispatchPlan.length === 0) {
            logger.warn('Mass scavenging: could not compute dispatch plan. Skipping.');
            return;
        }

        const massPage = new ScavengeMassPage(page);
        try {
            await massPage.navigate(serverCode, firstVillageId);
        } catch (navErr) {
            const detail = navErr instanceof Error ? navErr.message : String(navErr);
            logger.error(`Mass scavenging: failed to open scavenge_mass screen: ${detail}`);
            await activityContext?.logActivity({
                eventType: CrawlerActivityEventType.ERROR,
                message:
                    `Zbieractwo masowe: nie udało się wczytać strony zbieractwa masowego (tryb ${MASS_SCAVENGE_GAME_MODE}). ` +
                    `Szczegóły: ${detail}`
            });
            throw navErr instanceof Error ? navErr : new Error(String(navErr));
        }

        const uiCheck = await massPage.validateMassScavengingUi();
        if (!uiCheck.ok) {
            logger.error(uiCheck.messageEn);
            await activityContext?.logActivity({
                eventType: CrawlerActivityEventType.ERROR,
                message: uiCheck.messagePl
            });
            throw new Error(uiCheck.messageEn);
        }

        const classification = await handleCrawlerErrorOperation(page, page.url(), {
            serverId,
            operationType: 'Mass Scavenging',
            logActivity: activityContext?.logActivity,
            onRecaptchaBlocked: activityContext?.onRecaptchaBlocked
        });
        if (classification === 'recaptcha_blocked') {
            throw new Error('reCAPTCHA blocked mass scavenging');
        }

        const perStageSummaryEn = dispatchPlan
            .slice()
            .sort((a, b) => a.level - b.level)
            .map((p) => `L${p.level}=[${formatDispatchUnitsEn(p.dispatchUnits)}]`)
            .join('; ');
        const plannedTotalUnits = dispatchPlan.reduce((s, p) => s + sumDispatchUnits(p.dispatchUnits), 0);
        logger.log(
            `Mass scavenging: dispatch plan before send [${MASS_SCAVENGE_GAME_MODE}] — ` +
                `scraped (per advanced config): ${formatDispatchUnitsEn(availableUnits)}; ` +
                `planned unit total after limits/distribution: ${plannedTotalUnits}; ` +
                `per stage: ${perStageSummaryEn}`
        );
        await activityContext?.logActivity({
            eventType: CrawlerActivityEventType.INFO,
            message:
                `Zbieractwo masowe: plan podziału przed wysłaniem (tryb ${MASS_SCAVENGE_GAME_MODE}) — ` +
                `z podglądu: ${formatScrapedTotalsPl(availableUnits)}; ` +
                `po limitach/algorytmie łącznie jednostek: ${plannedTotalUnits}; ` +
                `etapy: ${dispatchPlan
                    .slice()
                    .sort((a, b) => a.level - b.level)
                    .map((p) => `poziom ${p.level}: ${formatDispatchUnitsPl(p.dispatchUnits)}`)
                    .join(' | ')}`
        });

        let pageIndex = 0;
        let morePages = true;
        while (morePages) {
            pageIndex += 1;
            logger.log(`Mass scavenging: processing UI page ${pageIndex}`);
            await runLevelsOnCurrentPage(dispatchPlan, massPage, page, logger, {
                pageIndex,
                activityContext
            });
            morePages = await massPage.hasNextPage();
            if (morePages) {
                await massPage.clickNextPage();
            }
        }

        logger.log('Mass scavenging: completed all pagination pages.');
    } catch (err) {
        logger.error('Mass scavenging failed:', err);
        throw err;
    } finally {
        await browser.close();
    }
}

async function runLevelsOnCurrentPage(
    dispatchPlan: LevelDispatchPlan[],
    massPage: ScavengeMassPage,
    page: Page,
    logger: Logger,
    context: {
        pageIndex: number;
        activityContext?: PerformMassScavengingDependencies['activityContext'];
    }
): Promise<void> {
    const byLevel = new Map(dispatchPlan.map((p) => [p.level, p]));
    for (let level = 1; level <= 4; level++) {
        const plan = byLevel.get(level);
        const dispatch = plan?.dispatchUnits ?? {};
        const totalUnitsThisLevel = sumDispatchUnits(dispatch);
        if (totalUnitsThisLevel <= 0) {
            logger.log(`Mass scavenging: level ${level} has no units in plan — skip`);
            continue;
        }
        await massPage.fillCandidateUnits(dispatch);
        await massPage.clickSelectAllRowOption(level);
        await massPage.clickSend();
        await page.waitForTimeout(1500);
        await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => undefined);
        const summaryLine =
            `[${MASS_SCAVENGE_GAME_MODE}] UI page ${context.pageIndex}, level ${level}: ` +
            `planned dispatch units=${totalUnitsThisLevel} (${formatDispatchUnitsEn(dispatch)})`;
        const belowGameMinimum =
            totalUnitsThisLevel > 0 && totalUnitsThisLevel < MIN_UNITS_PER_MASS_SCAVENGE_DISPATCH;
        if (belowGameMinimum) {
            logger.warn(
                `Mass scavenging send summary: ${summaryLine} — ` +
                    `below typical in-game minimum of ${MIN_UNITS_PER_MASS_SCAVENGE_DISPATCH} units per slot; ` +
                    `the game may have ignored this dispatch.`
            );
        } else {
            logger.log(`Mass scavenging send summary: ${summaryLine}`);
        }
        let activityMessage =
            `Zbieractwo masowe: tryb ${MASS_SCAVENGE_GAME_MODE}, strona ${context.pageIndex}, ` +
            `poziom ${level}, ${totalUnitsThisLevel} jednostek (wg planu: ${formatDispatchUnitsPl(dispatch)})`;
        if (belowGameMinimum) {
            activityMessage +=
                ` — uwaga: gra zwykle wymaga minimum ${MIN_UNITS_PER_MASS_SCAVENGE_DISPATCH} jednostek na slot; ` +
                `wojska mogły nie zostać wysłane.`;
        }
        await context.activityContext?.logActivity({
            eventType: CrawlerActivityEventType.INFO,
            message: activityMessage
        });
    }
}
