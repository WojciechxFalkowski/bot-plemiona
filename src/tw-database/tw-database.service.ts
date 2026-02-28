import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { createBrowserPage } from '@/utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { scrapeAttackPlannerTableOperation } from './operations/scrape-attack-planner-table.operation';
import { filterAttacksToSendOperation } from './operations/filter-attacks-to-send.operation';
import { computeAttackFingerprintOperation } from './operations/compute-attack-fingerprint.operation';
import { sendFakeAttackOperation } from './operations/send-fake-attack.operation';
import { clearSentInTwDatabaseOperation } from './operations/clear-sent-in-twdatabase.operation';
import { FejkMethodsConfigService } from './fejk-methods-config.service';
import { TwDatabaseAttackEntity, TwDatabaseAttackStatus } from './entities/tw-database-attack.entity';
import { TW_DATABASE_ATTACK_ENTITY_REPOSITORY } from './tw-database.service.contracts';

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
    /** Path to saved JSON file (when table was scraped) */
    savedToFile?: string;
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
        @Inject(TW_DATABASE_ATTACK_ENTITY_REPOSITORY)
        private readonly attackRepo: Repository<TwDatabaseAttackEntity>
    ) {
        this.plemionaCredentials = {
            username: this.configService.get<string>('PLEMIONA_USERNAME') ?? ''
        };
    }

    /**
     * Gets TWDatabase credentials from environment (TW_DATABASE_LOGIN, TW_DATABASE_PASSWORD)
     */
    getCredentials(): TwDatabaseCredentials {
        return {
            login: this.configService.get<string>('TW_DATABASE_LOGIN') ?? '',
            password: this.configService.get<string>('TW_DATABASE_PASSWORD') ?? ''
        };
    }

    /**
     * Opens TWDatabase Attack Planner, scrapes table, saves to DB, navigates to first fejk's place URL.
     * Two tabs: Tab 1 TWDatabase, Tab 2 Plemiona. Logs in once per site.
     *
     * @param headless - Run browser in headless mode (default: true)
     * @returns Result with page title and duration
     */
    async visitAttackPlanner(headless = true): Promise<VisitAttackPlannerResult> {
        const startTime = Date.now();
        this.logger.log(`Opening TWDatabase Attack Planner: ${TW_DATABASE_ATTACK_PLANNER_URL}`);

        try {
            const { browser, context, page } = await createBrowserPage({ headless });

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
                    const { login, password } = this.getCredentials();
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

                let savedToFile: string | undefined;
                const attacksToProcess: { row: Record<string, string>; fingerprint: string }[] = [];

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
                    this.logTableDataToConsole(tableData);
                    savedToFile = await this.saveTableDataToJson(tableData);
                    if (savedToFile) {
                        this.logger.log(`Dane zapisane do pliku: ${savedToFile}`);
                    }

                    const filtered = filterAttacksToSendOperation(tableData.rows, { logger: this.logger });

                    for (const row of filtered) {
                        const fingerprint = computeAttackFingerprintOperation(row);
                        const existing = await this.attackRepo.findOne({ where: { fingerprint } });
                        if (existing) {
                            existing.rawData = row;
                            await this.attackRepo.save(existing);
                        } else {
                            await this.attackRepo.save({
                                fingerprint,
                                rawData: row,
                                status: TwDatabaseAttackStatus.PENDING
                            });
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
                                this.logger.log(`Processing ${attacksToProcess.length} fejk(s)`);

                                for (let i = 0; i < attacksToProcess.length; i++) {
                                    const { row, fingerprint } = attacksToProcess[i];
                                    this.logger.log(`[${i + 1}/${attacksToProcess.length}] Sending fejk: ${row['WIOSKA WYSYŁAJĄCA']} -> ${row['WIOSKA DOCELOWA']}`);
                                    const result = await sendFakeAttackOperation({
                                        page: tab2,
                                        attackRow: row,
                                        fejkConfig: this.fejkMethodsConfig.getConfig(),
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
                                            this.logger.log(`[${i + 1}/${attacksToProcess.length}] Fejk sent successfully`);
                                        } else {
                                            entity.status = TwDatabaseAttackStatus.FAILED;
                                            entity.failureReason = result.error ?? 'Unknown error';
                                            await this.attackRepo.save(entity);
                                            this.logger.warn(`[${i + 1}/${attacksToProcess.length}] Fejk failed: ${result.error}`);
                                        }
                                    }

                                    if (i < attacksToProcess.length - 1) {
                                        await tab2.waitForTimeout(2000);
                                    }
                                }
                            } else {
                                this.logger.warn(`Plemiona login/select failed: ${loginResult.error}`);
                            }
                        } else {
                            this.logger.warn('Could not extract world from akcja_url');
                        }
                    } finally {
                        await tab2.close();
                    }
                } else {
                    this.logger.log('Brak fejków do wysłania (SPÓŹNIONY/teraz) lub wszystkie już wysłane');
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
                        : `Strona załadowana (logowanie nieudane lub brak credentials) w ${durationMs}ms`,
                    savedToFile
                };
            } finally {
                await browser.close();
            }
        } catch (error) {
            const durationMs = Date.now() - startTime;
            this.logger.error(`Error visiting TWDatabase Attack Planner:`, error);
            const msg = error instanceof Error ? error.message : String(error);
            const isCookieError = msg.includes('cookies') || msg.includes('No Plemiona cookies');
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
     * Saves scraped table data to JSON file in data/tw-database/
     * @returns Absolute path to saved file or undefined on error
     */
    private async saveTableDataToJson(data: {
        columns: string[];
        rows: Record<string, string>[];
        rowCount: number;
    }): Promise<string | undefined> {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const fileName = `attack-planner-${timestamp}.json`;
            const outputDir = join(process.cwd(), 'data', 'tw-database');
            await fs.mkdir(outputDir, { recursive: true });
            const filePath = join(outputDir, fileName);
            const jsonContent = JSON.stringify(
                {
                    scrapedAt: new Date().toISOString(),
                    source: TW_DATABASE_ATTACK_PLANNER_URL,
                    columns: data.columns,
                    rowCount: data.rowCount,
                    rows: data.rows
                },
                null,
                2
            );
            await fs.writeFile(filePath, jsonContent, 'utf-8');
            return filePath;
        } catch (error) {
            this.logger.error('Error saving table data to JSON:', error);
            return undefined;
        }
    }

    /**
     * Logs scraped table data to console - all columns and each row
     */
    private logTableDataToConsole(data: {
        columns: string[];
        rows: Record<string, string>[];
        rowCount: number;
    }): void {
        this.logger.log('========== TWDatabase Attack Planner - Table Data ==========');
        this.logger.log(`Kolumny (${data.columns.length}): ${data.columns.join(' | ')}`);
        this.logger.log(`Liczba wierszy: ${data.rowCount}`);
        this.logger.log('------------------------------------------------------------');
        data.rows.forEach((row, index) => {
            const line = data.columns
                .map(col => `${col}: ${row[col] ?? ''}`)
                .join(' | ');
            this.logger.log(`[${index + 1}] ${line}`);
        });
        this.logger.log('========== Koniec tabeli ==========');
    }
}
