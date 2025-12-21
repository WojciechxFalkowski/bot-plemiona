import { Logger } from '@nestjs/common';
import { ServersService } from '@/servers/servers.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { createBrowserPage } from '@/utils/browser.utils';

export interface TestLoginDependencies {
  serversService: ServersService;
  plemionaCookiesService: PlemionaCookiesService;
  credentials: PlemionaCredentials;
  logger: Logger;
}

/**
 * Testowy endpoint do logowania - otwiera przeglądarkę z headless: false
 * Używane do testowania w Postmanie
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wynik logowania z informacją o sukcesie i URL
 */
export async function testLoginOperation(
  serverId: number,
  deps: TestLoginDependencies,
): Promise<{ success: boolean; message: string; url?: string }> {
  const { serversService, plemionaCookiesService, credentials, logger } = deps;

  logger.log(`Testing login for server ${serverId} (headless: false)`);

  let browser: any = null;

  try {
    const browserPage = await createBrowserPage({ headless: false });
    browser = browserPage.browser;
    const { page } = browserPage;

    const serverName = await serversService.getServerName(serverId);

    logger.log(`Logging in to server ${serverName}...`);

    const loginResult = await AuthUtils.loginAndSelectWorld(
      page,
      credentials,
      plemionaCookiesService,
      serverName,
    );

    if (!loginResult.success || !loginResult.worldSelected) {
      const errorMessage = loginResult.error || 'Unknown error';
      logger.error(`Login failed: ${errorMessage}`);
      return {
        success: false,
        message: `Login failed: ${errorMessage}`,
      };
    }

    const currentUrl = page.url();
    logger.log(`Login successful! Current URL: ${currentUrl}`);
    logger.log(`Browser will remain open for manual inspection. Close it manually when done.`);

    return {
      success: true,
      message: `Successfully logged in to ${serverName}. Browser is open for inspection.`,
      url: currentUrl,
    };
  } catch (error) {
    logger.error('Error during test login:', error);
    return {
      success: false,
      message: `Error during login: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  } finally {
    logger.log('Test login completed. Browser remains open for manual inspection.');
  }
}



