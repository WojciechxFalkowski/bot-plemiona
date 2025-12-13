import { Page } from 'playwright';

export interface NavigateToPageDependencies {
    page: Page;
}

export interface NavigateToPageOptions {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
}

/**
 * Navigates to a specific URL
 * @param url URL to navigate to
 * @param options Navigation options
 * @param deps Dependencies containing page instance
 */
export async function navigateToPageOperation(
    url: string,
    options: NavigateToPageOptions,
    deps: NavigateToPageDependencies
): Promise<void> {
    const { page } = deps;
    await page.goto(url, {
        waitUntil: options.waitUntil || 'networkidle',
        timeout: options.timeout || 15000
    });
}


