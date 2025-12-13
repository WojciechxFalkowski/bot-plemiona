import { BadRequestException } from '@nestjs/common';
import { Browser, BrowserContext, Page } from 'playwright';
import { Logger } from '@nestjs/common';
import { createBrowserPage } from '@/utils/browser.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';

export interface CreateBrowserSessionDependencies {
    serversService: ServersService;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
    logger: Logger;
}

export interface BrowserSession {
    browser: Browser;
    context: BrowserContext;
    page: Page;
}

/**
 * Tworzy sesję przeglądarki z zalogowaniem do gry
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Obiekt z przeglądarką, kontekstem i stroną
 * @throws BadRequestException jeśli logowanie się nie powiodło
 */
export async function createBrowserSessionOperation(
    serverId: number,
    deps: CreateBrowserSessionDependencies
): Promise<BrowserSession> {
    const { serversService, credentials, plemionaCookiesService, logger } = deps;
    const { browser, context, page } = await createBrowserPage({ headless: true });
    const serverName = await serversService.getServerName(serverId);
    const loginResult = await AuthUtils.loginAndSelectWorld(
        page,
        credentials,
        plemionaCookiesService,
        serverName
    );

    if (!loginResult.success || !loginResult.worldSelected) {
        await browser.close();
        logger.error(`Login failed: ${loginResult.error || 'Unknown error'}`);
        throw new BadRequestException(`Login failed: ${loginResult.error || 'Unknown error'}`);
    }

    return { browser, context, page };
}


