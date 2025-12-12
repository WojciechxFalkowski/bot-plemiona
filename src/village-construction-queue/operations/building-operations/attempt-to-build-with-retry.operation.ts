import { Page } from 'playwright';
import { extractGameBuildQueueOperation, ExtractGameBuildQueueDependencies } from './extract-game-build-queue.operation';

export interface AttemptToBuildWithRetryDependencies {
    logger: any;
    maxRetries: number;
    clickTimeout: number;
    verifyDelay: number;
    extractGameBuildQueueDeps: ExtractGameBuildQueueDependencies;
}

export interface AttemptToBuildResult {
    success: boolean;
    reason: string;
}

/**
 * Próbuje zbudować budynek z mechanizmem retry
 * @param serverCode Kod serwera
 * @param buttonSelector Selektor przycisku budowania
 * @param page Strona przeglądarki
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Rezultat próby budowania
 */
export async function attemptToBuildWithRetryOperation(
    serverCode: string,
    buttonSelector: string,
    page: Page,
    deps: AttemptToBuildWithRetryDependencies
): Promise<AttemptToBuildResult> {
    const { logger, maxRetries, clickTimeout, verifyDelay, extractGameBuildQueueDeps } = deps;
    
    // Get initial queue length for verification
    const initialQueue = await extractGameBuildQueueOperation(serverCode, page, extractGameBuildQueueDeps);
    const initialQueueLength = initialQueue.length;

    logger.debug(`Initial game queue length: ${initialQueueLength}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.debug(`🔨 Build attempt ${attempt}/${maxRetries}: clicking button ${buttonSelector}`);

            // 1. Check if button exists and is clickable
            const buildButton = page.locator(buttonSelector);
            const buttonExists = await buildButton.count() > 0;

            if (!buttonExists) {
                logger.warn(`Build button not found: ${buttonSelector}`);
                return {
                    success: false,
                    reason: `Build button not found: ${buttonSelector}`
                };
            }

            // Check if button is visible and enabled
            const isVisible = await buildButton.isVisible();
            const isEnabled = await buildButton.isEnabled();

            if (!isVisible) {
                logger.warn(`Build button not visible: ${buttonSelector}`);
                return {
                    success: false,
                    reason: `Build button not visible: ${buttonSelector}`
                };
            }

            if (!isEnabled) {
                logger.warn(`Build button not enabled: ${buttonSelector}`);
                return {
                    success: false,
                    reason: `Build button not enabled: ${buttonSelector}`
                };
            }

            // 2. Click the build button
            logger.debug(`Clicking build button: ${buttonSelector}`);
            await buildButton.click({ timeout: clickTimeout });

            // 3. Wait for the game to process the request
            logger.debug(`Waiting ${verifyDelay}ms for game to process building request...`);
            await page.waitForTimeout(verifyDelay);

            // 4. Verify by checking if queue length increased
            logger.debug('Verifying if building was added to queue...');
            const newQueue = await extractGameBuildQueueOperation(serverCode, page, extractGameBuildQueueDeps);
            const newQueueLength = newQueue.length;

            logger.debug(`Queue length after click: ${newQueueLength} (was: ${initialQueueLength})`);

            if (newQueueLength > initialQueueLength) {
                // Success - queue length increased
                const addedBuilding = newQueue[newQueue.length - 1]; // Get last item (newest)
                logger.log(`✅ Successfully added building to queue: ${addedBuilding.building} Level ${addedBuilding.level}`);
                return {
                    success: true,
                    reason: `Building added to queue successfully`
                };
            } else {
                // Failed - queue length didn't change
                logger.warn(`⚠️  Queue length didn't increase after clicking button (attempt ${attempt}/${maxRetries})`);

                if (attempt === maxRetries) {
                    return {
                        success: false,
                        reason: `Queue length didn't increase after ${maxRetries} attempts`
                    };
                }

                // Wait before retry
                await page.waitForTimeout(1000);
                continue;
            }

        } catch (error) {
            logger.warn(`Build attempt ${attempt}/${maxRetries} failed:`, error);

            if (attempt === maxRetries) {
                return {
                    success: false,
                    reason: `All ${maxRetries} attempts failed: ${error.message}`
                };
            }

            // Wait before retry
            await page.waitForTimeout(1000);
        }
    }

    return {
        success: false,
        reason: 'Unexpected error in retry loop'
    };
}

