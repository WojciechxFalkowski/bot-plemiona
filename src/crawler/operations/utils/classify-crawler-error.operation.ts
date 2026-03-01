import { Page } from 'playwright';
import { isOnPlemionaMainLandingPage } from '@/tw-database/operations/is-plemiona-main-landing.operation';

export type CrawlerErrorType = 'session_expired' | 'recaptcha_blocked' | 'error';

/**
 * Classifies crawler error based on current page state.
 * Used when an operation fails to determine whether it's session lost, recaptcha, or generic error.
 *
 * @param page Playwright page (may be null - then returns 'error')
 * @param url Current page URL
 * @returns Classification of the error type
 */
export async function classifyCrawlerErrorOperation(
    page: Page | null,
    url: string
): Promise<CrawlerErrorType> {
    if (isOnPlemionaMainLandingPage(url)) {
        return 'session_expired';
    }

    if (!page) {
        return 'error';
    }

    try {
        const botProtectionElement = await page.$('#botprotection_quest');
        if (botProtectionElement) {
            return 'recaptcha_blocked';
        }
    } catch {
        // Ignore errors during check (e.g. page closed)
    }

    return 'error';
}
