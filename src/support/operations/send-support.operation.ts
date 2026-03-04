import { Logger } from '@nestjs/common';
import { Browser, Page } from 'playwright';
import { createBrowserPage } from '../../utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { TroopDispatchPage } from '@/models/tribal-wars/troop-dispatch-page';
import { VillageAllocationDto } from '../dto/send-support.dto';
import { handleCrawlerErrorOperation } from '@/crawler/operations/utils/handle-crawler-error.operation';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';

/**
 * Result of a single support dispatch
 */
export interface SupportDispatchResult {
  villageId: string;
  villageName: string;
  success: boolean;
  unitsSent: Record<string, number>;
  error?: string;
}

/**
 * Result of the entire support operation
 */
export interface SendSupportResult {
  success: boolean;
  totalAllocations: number;
  successfulDispatches: number;
  failedDispatches: number;
  results: SupportDispatchResult[];
  error?: string;
}

/**
 * Configuration for sending support
 */
export interface SendSupportConfig {
  serverId: number;
  serverCode: string;
  serverName: string;
  targetVillageId: number;
  allocations: VillageAllocationDto[];
  /** Whether to run browser in headless mode (default: true) */
  headless?: boolean;
}

/**
 * Dependencies for sendSupportOperation
 */
export interface SendSupportDependencies {
  logger: Logger;
  credentials: PlemionaCredentials;
  plemionaCookiesService: PlemionaCookiesService;
  activityContext?: {
    serverId: number;
    logActivity: (evt: { eventType: CrawlerActivityEventType; message: string }) => Promise<void>;
    onRecaptchaBlocked?: (serverId: number) => void;
  };
}

/**
 * Sends support troops from multiple villages to a target village
 * 
 * Algorithm:
 * 1. Create browser and login to the game
 * 2. For each allocation in the list:
 *    - Navigate to place screen with source village and target
 *    - Fill spear and sword unit inputs
 *    - Click support button (#target_support)
 *    - Confirm on the next page (#troop_confirm_submit)
 *    - Log success/failure
 * 3. Return summary of all dispatches
 * 
 * @param config - Support configuration
 * @param deps - Dependencies (logger, credentials, cookies service)
 * @returns Result with success/failure status for each allocation
 */
export async function sendSupportOperation(
  config: SendSupportConfig,
  deps: SendSupportDependencies
): Promise<SendSupportResult> {
  const { logger, credentials, plemionaCookiesService, activityContext } = deps;
  const { serverCode, serverName, targetVillageId, allocations } = config;

  logger.log(`=== Starting support dispatch operation ===`);
  logger.log(`Target village ID: ${targetVillageId}`);
  logger.log(`Server: ${serverName} (${serverCode})`);
  logger.log(`Total allocations: ${allocations.length}`);

  const results: SupportDispatchResult[] = [];
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Create browser session
    const headlessMode = config.headless ?? true;
    logger.log(`Creating browser session (headless: ${headlessMode})...`);
    const browserSession = await createBrowserPage({ headless: headlessMode });
    browser = browserSession.browser;
    page = browserSession.page;
    logger.debug('Browser session created');

    // Login to the game
    logger.log('Logging in to Tribal Wars...');
    const loginResult = await AuthUtils.loginAndSelectWorld(
      page,
      credentials,
      plemionaCookiesService,
      serverName
    );

    if (!loginResult.success || !loginResult.worldSelected) {
      const errorMsg = `Login failed: ${loginResult.error || 'Unknown error'}`;
      logger.error(errorMsg);
      return {
        success: false,
        totalAllocations: allocations.length,
        successfulDispatches: 0,
        failedDispatches: allocations.length,
        results: [],
        error: errorMsg,
      };
    }

    logger.log(`Login successful using method: ${loginResult.method}`);

    // Create TroopDispatchPage instance
    const troopDispatchPage = new TroopDispatchPage(page, serverCode);

    // Process each allocation
    for (let i = 0; i < allocations.length; i++) {
      const allocation = allocations[i];
      const progress = `[${i + 1}/${allocations.length}]`;

      const unitsSummary = Object.entries(allocation.unitsToSend)
        .map(([unit, count]) => `${count} ${unit}`)
        .join(', ');

      logger.log(`${progress} Processing village "${allocation.villageName}" (ID: ${allocation.villageId})`);
      logger.log(`${progress} Sending ${unitsSummary}`);

      try {
        // Navigate to troop dispatch page
        logger.debug(`${progress} Navigating to place screen...`);
        await troopDispatchPage.navigateToTroopDispatch(
          allocation.villageId,
          targetVillageId.toString()
        );

        // Wait for page to load
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await page.waitForTimeout(1000);
        logger.debug(`${progress} Place screen loaded`);

        // Weryfikacja twardych błędów (reCAPTCHA, wylogowanie)
        const currentUrl = page.url();
        const errorClassification = await handleCrawlerErrorOperation(page, currentUrl, {
          serverId: activityContext?.serverId || config.serverId,
          operationType: 'Wysłanie wsparcia',
          logActivity: activityContext?.logActivity,
          onRecaptchaBlocked: activityContext?.onRecaptchaBlocked,
          skipLogOnGenericError: true // We handle generic errors manually via error_box text
        });

        if (errorClassification === 'recaptcha_blocked' || errorClassification === 'session_expired') {
          const hardErrorMsg = errorClassification === 'recaptcha_blocked' ? 'Wykryto reCAPTCHA. Przerwano wysyłanie wsparcia.' : 'Sesja wygasła. Przerwano wysyłanie wsparcia.';
          logger.error(`${progress} Hard Error: ${hardErrorMsg}`);

          // Push failed result for current and throw to abort rest
          results.push({
            villageId: allocation.villageId,
            villageName: allocation.villageName,
            success: false,
            unitsSent: {},
            error: hardErrorMsg,
          });
          throw new Error(hardErrorMsg); // Break out of the entire loop
        }

        // Check if command form exists
        const formExists = await page.locator('#command-data-form').isVisible({ timeout: 5000 });
        if (!formExists) {
          throw new Error('Command form (#command-data-form) not found on page');
        }

        // Fill support units
        logger.debug(`${progress} Filling unit inputs...`);
        await troopDispatchPage.fillSupportUnits(allocation.unitsToSend);

        // Confirm support sequence
        logger.debug(`${progress} Clicking support button and confirming...`);
        await troopDispatchPage.confirmSupportSequence();

        // Wait a bit after confirmation
        await page.waitForTimeout(500);

        logger.log(`${progress} ✅ Success - support sent from "${allocation.villageName}"`);

        results.push({
          villageId: allocation.villageId,
          villageName: allocation.villageName,
          success: true,
          unitsSent: allocation.unitsToSend,
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`${progress} ❌ Failed - ${allocation.villageName}: ${errorMsg}`);

        // Take screenshot on error if it's not a global abort
        if (!errorMsg.includes('reCAPTCHA') && !errorMsg.includes('Sesja wygasła')) {
          try {
            const screenshotPath = `support_error_${allocation.villageId}_${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            logger.debug(`${progress} Error screenshot saved: ${screenshotPath}`);
          } catch (screenshotError) {
            logger.warn(`${progress} Failed to take error screenshot`);
          }
        }

        // Add result if it wasn't already added by the hard error checker
        if (!results.find(r => r.villageId === allocation.villageId)) {
          results.push({
            villageId: allocation.villageId,
            villageName: allocation.villageName,
            success: false,
            unitsSent: {},
            error: errorMsg,
          });
        }

        // Jeśli to twardy błąd, chcemy wyjść z pętli żeby nie przepalać wiosek
        if (errorMsg.includes('reCAPTCHA') || errorMsg.includes('Sesja wygasła')) {
          logger.warn(`Aborting remaining ${allocations.length - i - 1} support task(s) due to hard error.`);
          break;
        }
      }
    }

    // Calculate summary
    const successfulDispatches = results.filter(r => r.success).length;
    const failedDispatches = results.filter(r => !r.success).length;

    logger.log(`=== Support dispatch operation completed ===`);
    logger.log(`Successful: ${successfulDispatches}/${allocations.length}`);
    logger.log(`Failed: ${failedDispatches}/${allocations.length}`);

    if (failedDispatches > 0) {
      logger.warn('Failed villages:');
      results
        .filter(r => !r.success)
        .forEach(r => logger.warn(`  - ${r.villageName}: ${r.error}`));
    }

    return {
      success: failedDispatches === 0,
      totalAllocations: allocations.length,
      successfulDispatches,
      failedDispatches,
      results,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Support operation failed with error: ${errorMsg}`);

    // Take screenshot on critical error
    if (page) {
      try {
        const screenshotPath = `support_critical_error_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        logger.debug(`Critical error screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        logger.warn('Failed to take critical error screenshot');
      }
    }

    return {
      success: false,
      totalAllocations: allocations.length,
      successfulDispatches: results.filter(r => r.success).length,
      failedDispatches: allocations.length - results.filter(r => r.success).length,
      results,
      error: errorMsg,
    };

  } finally {
    // Close browser
    if (browser) {
      logger.debug('Closing browser...');
      await browser.close();
      logger.debug('Browser closed');
    }
  }
}

