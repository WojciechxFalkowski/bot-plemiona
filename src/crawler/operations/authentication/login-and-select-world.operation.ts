import { Page } from 'playwright';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { LoginOptions, LoginResult } from '@/utils/auth/auth.interfaces';

export interface LoginAndSelectWorldDependencies {
    page: Page;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
}

/**
 * Performs comprehensive login and world selection
 * @param serverName Name of the server/world to select
 * @param options Login options
 * @param deps Dependencies needed for login
 * @returns Login result with success status and method used
 */
export async function loginAndSelectWorldOperation(
    serverName: string,
    options: LoginOptions | undefined,
    deps: LoginAndSelectWorldDependencies
): Promise<LoginResult> {
    const { page, credentials, plemionaCookiesService } = deps;
    return await AuthUtils.loginAndSelectWorld(
        page,
        credentials,
        plemionaCookiesService,
        serverName,
        options
    );
}


