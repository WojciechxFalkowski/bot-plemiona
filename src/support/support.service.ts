import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServersService } from '@/servers';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { SendSupportDto } from './dto';
import { sendSupportOperation, SendSupportResult } from './operations';

/**
 * Response DTO for send support endpoint
 */
export interface SendSupportResponseDto {
  success: boolean;
  message: string;
  totalAllocations: number;
  successfulDispatches: number;
  failedDispatches: number;
  results: {
    villageId: string;
    villageName: string;
    success: boolean;
    spearSent: number;
    swordSent: number;
    error?: string;
  }[];
}

/**
 * Service for sending support troops to target villages
 * Acts as an orchestrator, delegating to operations
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private readonly credentials: PlemionaCredentials;

  constructor(
    private readonly configService: ConfigService,
    private readonly serversService: ServersService,
    private readonly plemionaCookiesService: PlemionaCookiesService,
  ) {
    // Initialize credentials from ConfigService
    this.credentials = {
      username: this.configService.get<string>('PLEMIONA_USERNAME') || '',
    };
  }

  /**
   * Sends support troops to a target village from multiple source villages
   * 
   * @param dto - Send support request data
   * @returns Result with success/failure status for each allocation
   */
  async sendSupport(dto: SendSupportDto): Promise<SendSupportResponseDto> {
    this.logger.log(`=== Support dispatch request received ===`);
    this.logger.log(`Server ID: ${dto.serverId}`);
    this.logger.log(`Target village ID: ${dto.targetVillageId}`);
    this.logger.log(`Total allocations: ${dto.allocations.length}`);
    this.logger.log(`Total packages: ${dto.totalPackages}`);
    this.logger.log(`Package size: ${dto.packageSize}`);

    // Log allocation summary
    const totalSpear = dto.allocations.reduce((sum, a) => sum + a.spearToSend, 0);
    const totalSword = dto.allocations.reduce((sum, a) => sum + a.swordToSend, 0);
    this.logger.log(`Total troops to send: ${totalSpear} spear, ${totalSword} sword`);

    // Get server information
    const serverCode = await this.serversService.getServerCode(dto.serverId);
    const serverName = await this.serversService.getServerName(dto.serverId);

    if (!serverCode || !serverName) {
      this.logger.error(`Server not found: ${dto.serverId}`);
      return {
        success: false,
        message: `Serwer o ID ${dto.serverId} nie został znaleziony`,
        totalAllocations: dto.allocations.length,
        successfulDispatches: 0,
        failedDispatches: dto.allocations.length,
        results: [],
      };
    }

    this.logger.log(`Server info: ${serverName} (${serverCode})`);

    // Call the operation
    const result: SendSupportResult = await sendSupportOperation(
      {
        serverId: dto.serverId,
        serverCode,
        serverName,
        targetVillageId: dto.targetVillageId,
        allocations: dto.allocations,
      },
      {
        logger: this.logger,
        credentials: this.credentials,
        plemionaCookiesService: this.plemionaCookiesService,
      },
    );

    // Build response message
    let message: string;
    if (result.success) {
      message = `Wsparcie wysłane pomyślnie ze wszystkich ${result.successfulDispatches} wiosek`;
    } else if (result.successfulDispatches > 0) {
      message = `Wsparcie wysłane z ${result.successfulDispatches}/${result.totalAllocations} wiosek. ${result.failedDispatches} wiosek nie udało się obsłużyć.`;
    } else {
      message = result.error || 'Wysyłanie wsparcia nie powiodło się';
    }

    this.logger.log(`Support dispatch result: ${message}`);

    return {
      success: result.success,
      message,
      totalAllocations: result.totalAllocations,
      successfulDispatches: result.successfulDispatches,
      failedDispatches: result.failedDispatches,
      results: result.results,
    };
  }
}

