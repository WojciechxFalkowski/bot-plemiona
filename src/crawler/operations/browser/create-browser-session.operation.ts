import { createBrowserPage } from '@/utils/browser.utils';
import { Browser, BrowserContext, Page } from 'playwright';

export interface CreateBrowserSessionOptions {
    headless?: boolean;
}

export interface CreateBrowserSessionResult {
    browser: Browser;
    context: BrowserContext;
    page: Page;
}

/**
 * Creates a new browser instance, context, and page
 * @param options Optional browser options (e.g., headless mode)
 * @returns Object containing browser, context, and page instances
 */
export async function createBrowserSessionOperation(
    options?: CreateBrowserSessionOptions
): Promise<CreateBrowserSessionResult> {
    return await createBrowserPage(options);
}


