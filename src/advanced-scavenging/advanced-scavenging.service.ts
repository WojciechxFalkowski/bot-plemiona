import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { VillagesService } from '@/villages/villages.service';
import { ServersService } from '@/servers/servers.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { createBrowserPage } from '@/utils/browser.utils';
import { VillageUnitsConfig, ScavengingUnitsConfig } from './interfaces/scavenging-units-config.interface';
import { UpdateVillageUnitsConfigDto } from './dto/update-village-units-config.dto';
import { VillageScavengingUnitsConfigEntity } from './entities/village-scavenging-units-config.entity';
import { VILLAGE_SCAVENGING_UNITS_CONFIG_ENTITY_REPOSITORY } from './advanced-scavenging.contracts';
import { CrawlerService } from '@/crawler/crawler.service';

@Injectable()
export class AdvancedScavengingService {
  private readonly logger = new Logger(AdvancedScavengingService.name);
  private readonly credentials: PlemionaCredentials;

  constructor(
    @Inject(VILLAGE_SCAVENGING_UNITS_CONFIG_ENTITY_REPOSITORY)
    private readonly configRepository: Repository<VillageScavengingUnitsConfigEntity>,
    private readonly villagesService: VillagesService,
    private readonly serversService: ServersService,
    private readonly plemionaCookiesService: PlemionaCookiesService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => CrawlerService))
    private readonly crawlerService: CrawlerService,
  ) {
    this.credentials = {
      username: this.configService.get<string>('PLEMIONA_USERNAME') || '',
    };
  }

  /**
   * Pobiera konfigurację jednostek dla wioski
   */
  async getVillageUnitsConfig(serverId: number, villageId: string): Promise<VillageUnitsConfig> {
    const village = await this.villagesService.findById(serverId, villageId);

    // Pobierz konfigurację z nowej tabeli lub utwórz domyślną
    let config = await this.configRepository.findOne({
      where: { villageId, serverId },
    });

    if (!config) {
      // Utwórz domyślną konfigurację jeśli nie istnieje
      config = this.configRepository.create({
        villageId,
        serverId,
        isScavengingSpearEnabled: true,
        isScavengingSwordEnabled: false,
        isScavengingAxeEnabled: false,
        isScavengingArcherEnabled: false,
        isScavengingLightEnabled: false,
        isScavengingMarcherEnabled: false,
        isScavengingHeavyEnabled: false,
      });
      await this.configRepository.save(config);
    }

    const units: ScavengingUnitsConfig = {
      spear: config.isScavengingSpearEnabled,
      sword: config.isScavengingSwordEnabled,
      axe: config.isScavengingAxeEnabled,
      archer: config.isScavengingArcherEnabled,
      light: config.isScavengingLightEnabled,
      marcher: config.isScavengingMarcherEnabled,
      heavy: config.isScavengingHeavyEnabled,
    };

    return {
      villageId: village.id,
      villageName: village.name,
      serverId: village.serverId,
      isAutoScavengingEnabled: village.isAutoScavengingEnabled,
      units,
    };
  }

  /**
   * Aktualizuje konfigurację jednostek dla wioski
   */
  async updateVillageUnitsConfig(
    serverId: number,
    villageId: string,
    updateDto: UpdateVillageUnitsConfigDto,
  ): Promise<VillageUnitsConfig> {
    const village = await this.villagesService.findById(serverId, villageId);

    // Pobierz istniejącą konfigurację lub utwórz nową
    let config = await this.configRepository.findOne({
      where: { villageId },
    });

    if (!config) {
      config = this.configRepository.create({
        villageId,
        serverId,
        isScavengingSpearEnabled: true,
        isScavengingSwordEnabled: false,
        isScavengingAxeEnabled: false,
        isScavengingArcherEnabled: false,
        isScavengingLightEnabled: false,
        isScavengingMarcherEnabled: false,
        isScavengingHeavyEnabled: false,
      });
    }

    // Aktualizuj wartości z DTO
    if (updateDto.units) {
      if (updateDto.units.spear !== undefined) {
        config.isScavengingSpearEnabled = updateDto.units.spear;
      }
      if (updateDto.units.sword !== undefined) {
        config.isScavengingSwordEnabled = updateDto.units.sword;
      }
      if (updateDto.units.axe !== undefined) {
        config.isScavengingAxeEnabled = updateDto.units.axe;
      }
      if (updateDto.units.archer !== undefined) {
        config.isScavengingArcherEnabled = updateDto.units.archer;
      }
      if (updateDto.units.light !== undefined) {
        config.isScavengingLightEnabled = updateDto.units.light;
      }
      if (updateDto.units.marcher !== undefined) {
        config.isScavengingMarcherEnabled = updateDto.units.marcher;
      }
      if (updateDto.units.heavy !== undefined) {
        config.isScavengingHeavyEnabled = updateDto.units.heavy;
      }
    }

    // Walidacja: przynajmniej jedna jednostka musi być włączona
    const updatedUnits: ScavengingUnitsConfig = {
      spear: config.isScavengingSpearEnabled,
      sword: config.isScavengingSwordEnabled,
      axe: config.isScavengingAxeEnabled,
      archer: config.isScavengingArcherEnabled,
      light: config.isScavengingLightEnabled,
      marcher: config.isScavengingMarcherEnabled,
      heavy: config.isScavengingHeavyEnabled,
    };

    const hasAnyEnabled = Object.values(updatedUnits).some(enabled => enabled === true);
    if (!hasAnyEnabled) {
      throw new BadRequestException('At least one unit type must be enabled for scavenging');
    }

    // Zapisz konfigurację
    await this.configRepository.save(config);
    
    // Pobierz zaktualizowaną encję z bazy aby upewnić się, że mamy najnowsze dane
    const refreshedConfig = await this.configRepository.findOne({
      where: { villageId },
    });
    
    if (refreshedConfig) {
      // Użyj zaktualizowanych danych z bazy
      const refreshedUnits: ScavengingUnitsConfig = {
        spear: refreshedConfig.isScavengingSpearEnabled,
        sword: refreshedConfig.isScavengingSwordEnabled,
        axe: refreshedConfig.isScavengingAxeEnabled,
        archer: refreshedConfig.isScavengingArcherEnabled,
        light: refreshedConfig.isScavengingLightEnabled,
        marcher: refreshedConfig.isScavengingMarcherEnabled,
        heavy: refreshedConfig.isScavengingHeavyEnabled,
      };
      
      return {
        villageId: village.id,
        villageName: village.name,
        serverId: village.serverId,
        isAutoScavengingEnabled: village.isAutoScavengingEnabled,
        units: refreshedUnits,
      };
    }

    return {
      villageId: village.id,
      villageName: village.name,
      serverId: village.serverId,
      isAutoScavengingEnabled: village.isAutoScavengingEnabled,
      units: updatedUnits,
    };
  }

  /**
   * Pobiera konfigurację jednostek dla wszystkich wiosek serwera
   * Zwraca tylko wioski z włączonym automatycznym zbieractwem (isAutoScavengingEnabled === true)
   */
  async getServerVillagesUnitsConfig(serverId: number): Promise<VillageUnitsConfig[]> {
    const villages = await this.villagesService.findAll(serverId, false);

    // Filtruj tylko wioski z włączonym automatycznym zbieractwem
    const enabledVillages = villages.filter(village => village.isAutoScavengingEnabled);

    // Pobierz wszystkie konfiguracje dla wiosek z tego serwera
    // Użyj queryBuildera aby uniknąć problemów z cache
    const configs = await this.configRepository
      .createQueryBuilder('config')
      .where('config.serverId = :serverId', { serverId })
      .getMany();

    const configMap = new Map(configs.map(c => [c.villageId, c]));

    return enabledVillages.map(village => {
      const config = configMap.get(village.id);
      
      // Jeśli nie ma konfiguracji, użyj domyślnych wartości
      const units: ScavengingUnitsConfig = config ? {
        spear: config.isScavengingSpearEnabled,
        sword: config.isScavengingSwordEnabled,
        axe: config.isScavengingAxeEnabled,
        archer: config.isScavengingArcherEnabled,
        light: config.isScavengingLightEnabled,
        marcher: config.isScavengingMarcherEnabled,
        heavy: config.isScavengingHeavyEnabled,
      } : {
        spear: true,
        sword: false,
        axe: false,
        archer: false,
        light: false,
        marcher: false,
        heavy: false,
      };

      return {
        villageId: village.id,
        villageName: village.name,
        serverId: village.serverId,
        isAutoScavengingEnabled: village.isAutoScavengingEnabled,
        units,
      };
    });
  }

  /**
   * Testowy endpoint do logowania - otwiera przeglądarkę z headless: false
   * Używane do testowania w Postmanie
   */
  async testLogin(serverId: number): Promise<{ success: boolean; message: string; url?: string }> {
    this.logger.log(`Testing login for server ${serverId} (headless: false)`);

    let browser: any = null;

    try {
      // Utwórz przeglądarkę z headless: false (widoczna)
      const browserPage = await createBrowserPage({ headless: false });
      browser = browserPage.browser;
      const { page } = browserPage;

      // Pobierz nazwę serwera
      const serverName = await this.serversService.getServerName(serverId);

      this.logger.log(`Logging in to server ${serverName}...`);

      // Wykonaj logowanie
      const loginResult = await AuthUtils.loginAndSelectWorld(
        page,
        this.credentials,
        this.plemionaCookiesService,
        serverName,
      );

      if (!loginResult.success || !loginResult.worldSelected) {
        const errorMessage = loginResult.error || 'Unknown error';
        this.logger.error(`Login failed: ${errorMessage}`);
        return {
          success: false,
          message: `Login failed: ${errorMessage}`,
        };
      }

      const currentUrl = page.url();
      this.logger.log(`Login successful! Current URL: ${currentUrl}`);
      this.logger.log(`Browser will remain open for manual inspection. Close it manually when done.`);

      return {
        success: true,
        message: `Successfully logged in to ${serverName}. Browser is open for inspection.`,
        url: currentUrl,
      };
    } catch (error) {
      this.logger.error('Error during test login:', error);
      return {
        success: false,
        message: `Error during login: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    } finally {
      // NIE zamykamy przeglądarki - użytkownik może ją sprawdzić ręcznie
      // browser pozostanie otwarty
      this.logger.log('Test login completed. Browser remains open for manual inspection.');
    }
  }

  /**
   * Ręcznie wyzwala zbieractwo dla konkretnej wioski
   */
  async triggerScavengingForVillage(serverId: number, villageId: string): Promise<{ success: boolean; message: string; dispatchedCount: number }> {
    this.logger.log(`Manual scavenging trigger requested for village ${villageId} on server ${serverId}`);
    return await this.crawlerService.performScavengingForVillage(serverId, villageId);
  }
}

