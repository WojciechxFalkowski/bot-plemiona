import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { VillagesService } from '@/villages/villages.service';
import { ServersService } from '@/servers/servers.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { VillageUnitsConfig } from './interfaces/scavenging-units-config.interface';
import { UpdateVillageUnitsConfigDto } from './dto/update-village-units-config.dto';
import { VillageScavengingUnitsConfigEntity } from './entities/village-scavenging-units-config.entity';
import { VILLAGE_SCAVENGING_UNITS_CONFIG_ENTITY_REPOSITORY } from './advanced-scavenging.contracts';
import { CrawlerService } from '@/crawler/crawler.service';
import { getVillageUnitsConfigOperation } from './operations/config-management/get-village-units-config.operation';
import { updateVillageUnitsConfigOperation } from './operations/config-management/update-village-units-config.operation';
import { getServerVillagesUnitsConfigOperation } from './operations/config-management/get-server-villages-units-config.operation';
import { testLoginOperation } from './operations/browser/test-login.operation';
import { triggerScavengingForVillageOperation } from './operations/scavenging/trigger-scavenging-for-village.operation';

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
   * Zwraca obiekt z wszystkimi zależnościami potrzebnymi przez operacje
   */
  private getDependencies() {
    return {
      configRepository: this.configRepository,
      villagesService: this.villagesService,
      serversService: this.serversService,
      plemionaCookiesService: this.plemionaCookiesService,
      configService: this.configService,
      crawlerService: this.crawlerService,
      credentials: this.credentials,
      logger: this.logger,
    };
  }

  /**
   * Pobiera konfigurację jednostek dla wioski
   */
  async getVillageUnitsConfig(serverId: number, villageId: string): Promise<VillageUnitsConfig> {
    return getVillageUnitsConfigOperation(serverId, villageId, {
      configRepository: this.configRepository,
      villagesService: this.villagesService,
      logger: this.logger,
    });
  }

  /**
   * Aktualizuje konfigurację jednostek dla wioski
   */
  async updateVillageUnitsConfig(
    serverId: number,
    villageId: string,
    updateDto: UpdateVillageUnitsConfigDto,
  ): Promise<VillageUnitsConfig> {
    return updateVillageUnitsConfigOperation(serverId, villageId, updateDto, {
      configRepository: this.configRepository,
      villagesService: this.villagesService,
      logger: this.logger,
    });
  }

  /**
   * Pobiera konfigurację jednostek dla wszystkich wiosek serwera
   * Zwraca tylko wioski z włączonym automatycznym zbieractwem (isAutoScavengingEnabled === true)
   */
  async getServerVillagesUnitsConfig(serverId: number): Promise<VillageUnitsConfig[]> {
    return getServerVillagesUnitsConfigOperation(serverId, {
      configRepository: this.configRepository,
      villagesService: this.villagesService,
      logger: this.logger,
    });
  }

  /**
   * Testowy endpoint do logowania - otwiera przeglądarkę z headless: false
   * Używane do testowania w Postmanie
   */
  async testLogin(serverId: number): Promise<{ success: boolean; message: string; url?: string }> {
    return testLoginOperation(serverId, {
      serversService: this.serversService,
      plemionaCookiesService: this.plemionaCookiesService,
      credentials: this.credentials,
      logger: this.logger,
    });
  }

  /**
   * Ręcznie wyzwala zbieractwo dla konkretnej wioski
   */
  async triggerScavengingForVillage(
    serverId: number,
    villageId: string,
  ): Promise<{ success: boolean; message: string; dispatchedCount: number }> {
    return triggerScavengingForVillageOperation(serverId, villageId, {
      crawlerService: this.crawlerService,
      logger: this.logger,
    });
  }
}
