import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ServersService } from '@/servers/servers.service';
import { createBrowserPage } from '@/utils/browser.utils';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { EncryptionService } from '@/utils/encryption/encryption.service';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { scrapeAttackPlannerTableOperation } from './operations/scrape-attack-planner-table.operation';
import {
    filterAttacksToSendOperation,
    type FilteredAttackRow
} from './operations/filter-attacks-to-send.operation';
import { computeAttackFingerprintOperation } from './operations/compute-attack-fingerprint.operation';
import { sendFakeAttackOperation } from './operations/send-fake-attack.operation';
import { sendBurzakAttackOperation } from './operations/send-burzak-attack.operation';
import { clearSentInTwDatabaseOperation } from './operations/clear-sent-in-twdatabase.operation';
import { isOnPlemionaMainLandingPage } from './operations/is-plemiona-main-landing.operation';
import { classifyCrawlerErrorOperation } from '@/crawler/operations/utils/classify-crawler-error.operation';
import { FejkMethodsConfigService } from './fejk-methods-config.service';
import {
    TwDatabaseAttackEntity,
    TwDatabaseAttackStatus
} from './entities/tw-database-attack.entity';
import { TwDatabaseAttackDetailsEntity } from './entities/tw-database-attack-details.entity';
import { TW_DATABASE_ATTACK_ENTITY_REPOSITORY } from './tw-database.service.contracts';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';

export interface VisitAttackPlannerActivityContext {
    executionLogId: number | null;
    serverId: number;
    logActivity: (evt: { eventType: CrawlerActivityEventType; message: string }) => Promise<void>;
    /** Called when recaptcha is detected - marks server for header display */
    onRecaptchaBlocked?: (serverId: number) => void;
}

/** URL of TWDatabase Attack Planner page - will be used in crawler (e.g. every 30 min) */
export const TW_DATABASE_ATTACK_PLANNER_URL = 'https://twdatabase.online/AttackPlanner/Show';

export interface TwDatabaseCredentials {
    login: string;
    password: string;
}

export interface VisitAttackPlannerResult {
    success: boolean;
    loggedIn: boolean;
    pageTitle: string | null;
    url: string;
    durationMs: number;
    message: string;
}

/**
 * Service for interacting with TWDatabase (twdatabase.online).
 * Two tabs: Tab 1 TWDatabase, Tab 2 Plemiona. Logs in once per site.
 */
@Injectable()
export class TwDatabaseService {
    private readonly logger = new Logger(TwDatabaseService.name);

    private readonly plemionaCredentials: PlemionaCredentials;

    constructor(
        private readonly configService: ConfigService,
        private readonly plemionaCookiesService: PlemionaCookiesService,
        private readonly fejkMethodsConfig: FejkMethodsConfigService,
        private readonly settingsService: SettingsService,
        private readonly encryptionService: EncryptionService,
        private readonly serversService: ServersService,
        @Inject(TW_DATABASE_ATTACK_ENTITY_REPOSITORY)
        private readonly attackRepo: Repository<TwDatabaseAttackEntity>
    ) {
        this.plemionaCredentials = {
            username: this.configService.get<string>('PLEMIONA_USERNAME') ?? ''
        };
    }

    /**
     * Gets TWDatabase credentials. Priority: settings (per server) > env (TW_DATABASE_LOGIN, TW_DATABASE_PASSWORD).
     */
    async getCredentials(serverId: number): Promise<TwDatabaseCredentials> {
        const setting = await this.settingsService.getSetting<{
            login?: string;
            passwordEncrypted?: string;
        }>(serverId, SettingsKey.TW_DATABASE);

        if (setting?.login && setting?.passwordEncrypted && this.encryptionService.isAvailable()) {
            try {
                const password = this.encryptionService.decrypt(setting.passwordEncrypted);
                return { login: setting.login, password };
            } catch {
                this.logger.warn(`Could not decrypt TW Database password for server ${serverId}, falling back to env`);
            }
        }

        return {
            login: this.configService.get<string>('TW_DATABASE_LOGIN') ?? '',
            password: this.configService.get<string>('TW_DATABASE_PASSWORD') ?? ''
        };
    }

    /**
     * Opens TWDatabase Attack Planner, scrapes table, saves to DB, navigates to first fejk's place URL.
     * Two tabs: Tab 1 TWDatabase, Tab 2 Plemiona. Logs in once per site.
     *
     * @param serverId - Server ID for credentials lookup
     * @param headless - Run browser in headless mode (default: NODE_ENV === 'production')
     * @param activityContext - Optional context for logging activity events (fejki sent, session expired)
     * @returns Result with page title and duration
     */
    async visitAttackPlanner(
        serverId: number,
        headless?: boolean,
        activityContext?: VisitAttackPlannerActivityContext
    ): Promise<VisitAttackPlannerResult> {
        const isHeadless = headless ?? process.env.NODE_ENV === 'production';
        const startTime = Date.now();
        this.logger.log(`Opening TWDatabase Attack Planner: ${TW_DATABASE_ATTACK_PLANNER_URL}`);

        try {
            const { browser, context, page } = await createBrowserPage({ headless: isHeadless });

            try {
                // Add Plemiona cookies before any navigation (for Tab 2)
                await AuthUtils.addPlemionaCookies(context, this.plemionaCookiesService);

                // Tab 1: TWDatabase
                await page.goto(TW_DATABASE_ATTACK_PLANNER_URL, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
                let finalUrl = page.url();
                let loggedIn = false;

                const acceptCookiesBtn = page.getByRole('button', { name: 'Akceptuję wszystkie' });
                if (await acceptCookiesBtn.isVisible().catch(() => false)) {
                    this.logger.log('Accepting cookie banner...');
                    await acceptCookiesBtn.click();
                    await page.waitForTimeout(500);
                }

                const isLoginPage = finalUrl.includes('/Account/Login');
                if (isLoginPage) {
                    this.logger.log('Login page detected - attempting to log in...');
                    const { login, password } = await this.getCredentials(serverId);
                    if (!login || !password) {
                        this.logger.warn('TWDatabase credentials not configured (TW_DATABASE_LOGIN, TW_DATABASE_PASSWORD)');
                    } else {
                        await page.getByRole('textbox', { name: 'Login' }).fill(login);
                        await page.getByRole('textbox', { name: 'Hasło' }).fill(password);
                        await page.getByRole('button', { name: 'Zaloguj się' }).click();
                        await page.waitForLoadState('domcontentloaded');
                        await page.waitForTimeout(2000);
                        finalUrl = page.url();
                        loggedIn = !finalUrl.includes('/Account/Login');
                        this.logger.log(loggedIn ? 'Login successful' : 'Login may have failed - still on login page');
                    }
                } else {
                    loggedIn = true;
                }

                const attacksToProcess: { row: FilteredAttackRow; fingerprint: string }[] = [];

                if (loggedIn) {
                    await page.goto(TW_DATABASE_ATTACK_PLANNER_URL, {
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    });
                    const tableData = await scrapeAttackPlannerTableOperation({
                        page,
                        logger: this.logger
                    });
                    await clearSentInTwDatabaseOperation({
                        page,
                        attackRepo: this.attackRepo,
                        logger: this.logger
                    });

                    const filtered = filterAttacksToSendOperation(tableData.rows, { logger: this.logger });

                    for (const row of filtered) {
                        const fingerprint = computeAttackFingerprintOperation(row);
                        const serverId = await this.resolveServerIdFromAkcjaUrl(row['AKCJA'] ?? '');
                        const existing = await this.attackRepo.findOne({
                            where: { fingerprint },
                            relations: ['details']
                        });
                        const detailsData = this.mapRowToDetails(row);
                        if (existing) {
                            existing.serverId = serverId;
                            if (existing.details) {
                                Object.assign(existing.details, detailsData);
                            } else {
                                existing.details = this.attackRepo.manager.create(TwDatabaseAttackDetailsEntity, {
                                    ...detailsData,
                                    attackId: existing.id
                                });
                            }
                            await this.attackRepo.save(existing);
                        } else {
                            const attack = this.attackRepo.create({
                                fingerprint,
                                serverId,
                                status: TwDatabaseAttackStatus.PENDING
                            });
                            const savedAttack = await this.attackRepo.save(attack);
                            const details = this.attackRepo.manager.create(TwDatabaseAttackDetailsEntity, {
                                ...detailsData,
                                attackId: savedAttack.id
                            });
                            await this.attackRepo.manager.save(TwDatabaseAttackDetailsEntity, details);
                        }
                    }

                    for (const row of filtered) {
                        const fingerprint = computeAttackFingerprintOperation(row);
                        const existing = await this.attackRepo.findOne({ where: { fingerprint } });
                        if (existing?.status === TwDatabaseAttackStatus.SENT) continue;
                        const akcjaUrl = row['AKCJA']?.trim();
                        if (akcjaUrl?.startsWith('http')) {
                            attacksToProcess.push({ row, fingerprint });
                        }
                    }
                }

                if (attacksToProcess.length > 0) {
                    const tab2 = await context.newPage();
                    try {
                        const firstAkcjaUrl = attacksToProcess[0].row['AKCJA']?.trim() ?? '';
                        const worldMatch = firstAkcjaUrl.match(/https?:\/\/(pl\d+)\.plemiona\.pl/);
                        const serverName = worldMatch
                            ? `Świat ${worldMatch[1].replace('pl', '')}`
                            : null;

                        if (serverName) {
                            this.logger.log(`Logging into Plemiona and selecting world: ${serverName}`);
                            const loginResult = await AuthUtils.loginAndSelectWorld(
                                tab2,
                                this.plemionaCredentials,
                                this.plemionaCookiesService,
                                serverName
                            );
                            if (loginResult.success && loginResult.worldSelected) {
                                this.logger.log(`Processing ${attacksToProcess.length} attack(s)`);

                                for (let i = 0; i < attacksToProcess.length; i++) {
                                    const { row, fingerprint } = attacksToProcess[i];
                                    const attackLabel = row.attackType === 'fejk' ? 'fejk' : 'burzak';
                                    this.logger.log(
                                        `[${i + 1}/${attacksToProcess.length}] Sending ${attackLabel}: ${row['WIOSKA WYSYŁAJĄCA']} -> ${row['WIOSKA DOCELOWA']}`
                                    );

                                    const result =
                                        row.attackType === 'fejk'
                                            ? await sendFakeAttackOperation({
                                                  page: tab2,
                                                  attackRow: row,
                                                  fejkConfig: this.fejkMethodsConfig.getConfig(),
                                                  logger: this.logger
                                              })
                                            : await sendBurzakAttackOperation({
                                                  page: tab2,
                                                  attackRow: row,
                                                  logger: this.logger
                                              });

                                    const entity = await this.attackRepo.findOne({ where: { fingerprint } });
                                    if (entity) {
                                        if (result.success) {
                                            entity.status = TwDatabaseAttackStatus.SENT;
                                            entity.sentAt = new Date();
                                            entity.failureReason = null;
                                            entity.clearedFromTwDatabase = false;
                                            await this.attackRepo.save(entity);
                                            this.logger.log(
                                                `[${i + 1}/${attacksToProcess.length}] ${attackLabel} sent successfully`
                                            );
                                            const activityMsg =
                                                row.attackType === 'fejk'
                                                    ? `Wysłano fejk: ${row['WIOSKA WYSYŁAJĄCA']} -> ${row['WIOSKA DOCELOWA']}`
                                                    : `Wysłano burzak: ${row['WIOSKA WYSYŁAJĄCA']} -> ${row['WIOSKA DOCELOWA']}`;
                                            await activityContext?.logActivity({
                                                eventType: CrawlerActivityEventType.SUCCESS,
                                                message: activityMsg,
                                            });
                                        } else {
                                            entity.status = TwDatabaseAttackStatus.FAILED;
                                            entity.failureReason = result.error ?? 'Unknown error';
                                            await this.attackRepo.save(entity);
                                            this.logger.warn(
                                                `[${i + 1}/${attacksToProcess.length}] ${attackLabel} failed: ${result.error}`
                                            );
                                        }
                                    }

                                    if (!result.success) {
                                        const currentUrl = await tab2.url();
                                        const classification = await classifyCrawlerErrorOperation(tab2, currentUrl);

                                        if (classification === 'session_expired') {
                                            this.logger.warn(
                                                'Session lost (user logged in?) - stopping early. Next run in ~30 min.'
                                            );
                                            await activityContext?.logActivity({
                                                eventType: CrawlerActivityEventType.SESSION_EXPIRED,
                                                message: 'Sesja wygasła (użytkownik zalogował się?)',
                                            });
                                            break;
                                        }

                                        if (classification === 'recaptcha_blocked') {
                                            this.logger.warn('reCAPTCHA detected - stopping early. Next run in ~30 min.');
                                            activityContext?.onRecaptchaBlocked?.(serverId);
                                            await activityContext?.logActivity({
                                                eventType: CrawlerActivityEventType.RECAPTCHA_BLOCKED,
                                                message: 'reCAPTCHA wymaga odblokowania',
                                            });
                                            break;
                                        }
                                    }

                                    if (i < attacksToProcess.length - 1) {
                                        await tab2.waitForTimeout(2000);
                                    }
                                }
                            } else {
                                this.logger.warn(`Plemiona login/select failed: ${loginResult.error}`);
                                const count = attacksToProcess.length;
                                await activityContext?.logActivity({
                                    eventType: CrawlerActivityEventType.ERROR,
                                    message:
                                        count === 1
                                            ? `1 atak do wysłania, nie wysłany – nie udało się zalogować do Plemion (${loginResult.error ?? 'nieznany błąd'})`
                                            : `${count} ataków do wysłania, żaden nie wysłany – nie udało się zalogować do Plemion (${loginResult.error ?? 'nieznany błąd'})`,
                                });
                            }
                        } else {
                            this.logger.warn('Could not extract world from akcja_url');
                            const count = attacksToProcess.length;
                            await activityContext?.logActivity({
                                eventType: CrawlerActivityEventType.ERROR,
                                message:
                                    count === 1
                                        ? '1 atak do wysłania, nie wysłany – nie można wyodrębnić świata z URL'
                                        : `${count} ataków do wysłania, żaden nie wysłany – nie można wyodrębnić świata z URL`,
                            });
                        }
                    } finally {
                        await tab2.close();
                    }
                } else {
                    this.logger.log(
                        'Brak ataków do wysłania (fejk/burzak SPÓŹNIONY/teraz) lub wszystkie już wysłane'
                    );
                    await activityContext?.logActivity({
                        eventType: CrawlerActivityEventType.INFO,
                        message: 'Brak ataków do wysłania – wszystkie już wysłane lub brak w planerze',
                    });
                }

                if (loggedIn) {
                    await clearSentInTwDatabaseOperation({
                        page,
                        attackRepo: this.attackRepo,
                        logger: this.logger
                    });
                }

                await page.waitForTimeout(5000);
                const durationMs = Date.now() - startTime;
                return {
                    success: true,
                    loggedIn,
                    pageTitle: await page.title(),
                    url: page.url(),
                    durationMs,
                    message: loggedIn
                        ? `Zalogowano pomyślnie w ${durationMs}ms`
                        : `Strona załadowana (logowanie nieudane lub brak credentials) w ${durationMs}ms`
                };
            } finally {
                await browser.close();
            }
        } catch (error) {
            const durationMs = Date.now() - startTime;
            this.logger.error(`Error visiting TWDatabase Attack Planner:`, error);
            const msg = error instanceof Error ? error.message : String(error);
            const isCookieError = msg.includes('cookies') || msg.includes('No Plemiona cookies');
            await activityContext?.logActivity({
                eventType: CrawlerActivityEventType.ERROR,
                message: isCookieError ? `Błąd: ${msg}` : `Wystąpił błąd: ${msg}`,
            });
            return {
                success: false,
                loggedIn: false,
                pageTitle: null,
                url: TW_DATABASE_ATTACK_PLANNER_URL,
                durationMs,
                message: isCookieError
                    ? `Brak ciasteczek Plemiona - spróbuj ponownie za jakiś czas. ${msg}`
                    : `Błąd: ${msg}`
            };
        }
    }

    /**
     * Gets attacks for a server with optional status filter.
     * @param serverId - Required server ID
     * @param status - Optional: pending | sent | failed
     */
    async getAttacks(
        serverId: number,
        status?: TwDatabaseAttackStatus
    ): Promise<(TwDatabaseAttackEntity & { details: TwDatabaseAttackDetailsEntity })[]> {
        const qb = this.attackRepo
            .createQueryBuilder('attack')
            .leftJoinAndSelect('attack.details', 'details')
            .where('attack.serverId = :serverId', { serverId });
        if (status) {
            qb.andWhere('attack.status = :status', { status });
        }
        qb.orderBy('attack.createdAt', 'DESC');
        return qb.getMany() as Promise<(TwDatabaseAttackEntity & { details: TwDatabaseAttackDetailsEntity })[]>;
    }

    /**
     * Returns attack counts per status for a server. Used for sidebar status indicator.
     * @param serverId - Required server ID
     */
    async getAttacksSummary(serverId: number): Promise<{ pending: number; sent: number; failed: number }> {
        const [pending, sent, failed] = await Promise.all([
            this.attackRepo.count({ where: { serverId, status: TwDatabaseAttackStatus.PENDING } }),
            this.attackRepo.count({ where: { serverId, status: TwDatabaseAttackStatus.SENT } }),
            this.attackRepo.count({ where: { serverId, status: TwDatabaseAttackStatus.FAILED } })
        ]);
        return { pending, sent, failed };
    }

    /**
     * Resolves server ID from AKCJA URL (e.g. https://pl222.plemiona.pl/... -> servers.id for pl222)
     */
    private async resolveServerIdFromAkcjaUrl(akcjaUrl: string): Promise<number | null> {
        const match = (akcjaUrl || '').trim().match(/https?:\/\/(pl\d+)\.plemiona\.pl/);
        if (!match) return null;
        try {
            const server = await this.serversService.findByCode(match[1]);
            return server?.id ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Maps scraped row to TwDatabaseAttackDetailsEntity fields
     */
    private mapRowToDetails(row: FilteredAttackRow): Omit<TwDatabaseAttackDetailsEntity, 'attackId' | 'attack'> {
        return {
            lp: (row['LP.'] ?? '').trim() || null,
            etykietaAtaku: (row['ETYKIETA ATAKU'] ?? '').trim() || null,
            dataWyjsciaOd: (row['DATA WYJŚCIA OD'] ?? '').trim() || null,
            dataWyjsciaDo: (row['DATA WYJŚCIA DO'] ?? '').trim() || null,
            wioskaWysylajaca: (row['WIOSKA WYSYŁAJĄCA'] ?? '').trim() || null,
            wioskaDocelowa: (row['WIOSKA DOCELOWA'] ?? '').trim() || null,
            atakowanyGracz: (row['ATAKOWANY GRACZ'] ?? '').trim() || null,
            dataDotarcia: (row['DATA DOTARCIA'] ?? '').trim() || null,
            czasDoWysylki: (row['CZAS DO WYSYŁKI'] ?? '').trim() || null,
            akcjaUrl: (row['AKCJA'] ?? '').trim() || null,
            attackType: row.attackType ?? null
        };
    }
}
