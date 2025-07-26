import { Injectable, Logger } from '@nestjs/common';
import { CreateVillagesCrawlerDto } from './dto/create-villages-crawler.dto';
import { UpdateVillagesCrawlerDto } from './dto/update-villages-crawler.dto';
import { createBrowserPage } from '../utils/browser.utils';
import { SettingsService } from '@/settings/settings.service';
import { ConfigService } from '@nestjs/config';
import { VillageData } from '@/crawler/pages/village-overview.page';
import { VillageUtils } from '@/utils/village/village.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';

@Injectable()
export class VillagesCrawlerService {
  private readonly logger = new Logger(VillagesCrawlerService.name);
  // Game credentials from environment variables
  private readonly credentials: PlemionaCredentials;

  constructor(
    private settingsService: SettingsService,
    private plemionaCookiesService: PlemionaCookiesService,
    private configService: ConfigService,
    private serversService: ServersService
  ) {
    // Initialize credentials from environment variables with default values if not set
    this.credentials = AuthUtils.getCredentialsFromEnvironmentVariables(this.configService);
    // Validate credentials
    this.validateCredentials();
  }

  /**
   * Validates the credentials
   * @returns void
   */
  public async validateCredentials() {
    const validation = AuthUtils.validateCredentials(this.credentials);
    if (!validation.isValid) {
      this.logger.warn(`Invalid credentials: missing fields: ${validation.missingFields.join(', ')}, errors: ${validation.errors.join(', ')}. Fallback to cookies will be attempted.`);
    } else {
      this.logger.log('Plemiona credentials loaded from environment variables successfully.');
    }
  }

  /**
 * Gets villages overview with login verification
 * Logs into the account and retrieves basic village information with URLs
 * @param options - Browser options
 * @returns Promise with login and villages overview result
 */
  public async getVillagesOverview(serverId: number, options?: { headless?: boolean }): Promise<{
    success: boolean;
    message?: string;
    villages?: Array<{
      id: string;
      name: string;
      coordinates: string;
      url: string;
    }>
  }> {
    const { headless = true } = options || {};

    this.logger.log('Starting villages overview with login verification...');
    const { browser, context, page } = await createBrowserPage({ headless });

    try {
      const serverName = await this.serversService.getServerName(serverId);
      // Use AuthUtils for comprehensive login and world selection
      const loginResult = await AuthUtils.loginAndSelectWorld(
        page,
        this.credentials,
        this.plemionaCookiesService,
        serverName
      );

      if (!loginResult.success || !loginResult.worldSelected) {
        this.logger.error(`Login failed: ${loginResult.error || 'Unknown error'}`);
        return {
          success: false,
          message: loginResult.error || 'Login failed with unknown error'
        };
      }

      this.logger.log(`Login successful using method: ${loginResult.method}`);

      // Verify we're on the game page by checking for game elements
      try {
        await page.waitForSelector('#header_info', { timeout: 5000 });
        this.logger.log('Game page loaded correctly');
      } catch (verificationError) {
        this.logger.warn('Login appeared successful but game page verification failed:', verificationError);
        return {
          success: false,
          message: 'Login successful but game page verification failed'
        };
      }

      // Collect village information
      try {
        this.logger.log('Collecting villages information...');
        const villages = await VillageUtils.collectVillageOverviewData(page);

        if (!villages || villages.length === 0) {
          this.logger.warn('No villages found');
          return {
            success: true,
            message: 'Login successful but no villages found',
            villages: []
          };
        }

        // Transform villages data to include URLs
        const villagesWithUrls = villages.map(village => ({
          id: village.id,
          name: village.name,
          coordinates: village.coordinates,
          url: `https://pl216.plemiona.pl/game.php?village=${village.id}&screen=overview`,
        }));

        this.logger.log(`Successfully retrieved ${villagesWithUrls.length} villages`);

        return {
          success: true,
          message: `Login successful using ${loginResult.method}. Found ${villagesWithUrls.length} villages.`,
          villages: villagesWithUrls
        };

      } catch (villageError) {
        this.logger.error('Error collecting village information:', villageError);
        return {
          success: false,
          message: `Login successful but failed to collect village information: ${villageError.message}`
        };
      }

    } catch (error) {
      this.logger.error('Error during villages overview:', error);
      return {
        success: false,
        message: `Villages overview failed with error: ${error.message}`
      };
    } finally {
      // Close browser after test
      if (browser) {
        await browser.close();
        this.logger.log('Browser closed after villages overview.');
      }
    }
  }

  // create(createVillagesCrawlerDto: CreateVillagesCrawlerDto) {
  //   return 'This action adds a new villagesCrawler';
  // }

  // findAll() {
  //   return `This action returns all villagesCrawler`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} villagesCrawler`;
  // }

  // update(id: number, updateVillagesCrawlerDto: UpdateVillagesCrawlerDto) {
  //   return `This action updates a #${id} villagesCrawler`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} villagesCrawler`;
  // }
}
