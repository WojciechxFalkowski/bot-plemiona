import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServersService } from '@/servers';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { SendSupportDto } from './dto';
import { sendSupportOperation, SendSupportResult } from './operations';
import { CrawlerOrchestratorService } from '@/crawler/crawler-orchestrator.service';

/**
 * Response DTO for send support endpoint (direct execution - legacy)
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
 * Response DTO for queued support request
 */
export interface QueuedSupportResponseDto {
  /** Unique task ID for tracking */
  taskId: string;
  /** Position in the manual task queue (1-based) */
  queuePosition: number;
  /** Estimated wait time in seconds */
  estimatedWaitTime: number;
  /** Status message */
  message: string;
  /** Total allocations queued */
  totalAllocations: number;
  /** Target village ID */
  targetVillageId: number;
}

/**
 * Service for sending support troops to target villages
 * Queues support requests via CrawlerOrchestratorService for coordinated execution
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private readonly credentials: PlemionaCredentials;

  constructor(
    private readonly configService: ConfigService,
    private readonly serversService: ServersService,
    private readonly plemionaCookiesService: PlemionaCookiesService,
    @Inject(forwardRef(() => CrawlerOrchestratorService))
    private readonly crawlerOrchestratorService: CrawlerOrchestratorService,
  ) {
    // Initialize credentials from ConfigService
    this.credentials = {
      username: this.configService.get<string>('PLEMIONA_USERNAME') || '',
    };
  }

  /**
   * Queues support troops dispatch to a target village
   * The task will be executed by the orchestrator when it's safe to do so
   * 
   * @param dto - Send support request data
   * @returns Queue confirmation with task ID and position
   */
  async queueSupport(dto: SendSupportDto): Promise<QueuedSupportResponseDto> {
    this.logger.log(`=== Support dispatch request received (queuing) ===`);
    this.logger.log(`Server ID: ${dto.serverId}`);
    this.logger.log(`Target village ID: ${dto.targetVillageId}`);
    this.logger.log(`Total allocations: ${dto.allocations.length}`);
    this.logger.log(`Total packages: ${dto.totalPackages}`);
    this.logger.log(`Package size: ${dto.packageSize}`);

    // Log allocation summary
    const totalSpear = dto.allocations.reduce((sum, a) => sum + a.spearToSend, 0);
    const totalSword = dto.allocations.reduce((sum, a) => sum + a.swordToSend, 0);
    this.logger.log(`Total troops to queue: ${totalSpear} spear, ${totalSword} sword`);

    // Validate server exists
    const serverCode = await this.serversService.getServerCode(dto.serverId);
    const serverName = await this.serversService.getServerName(dto.serverId);

    if (!serverCode || !serverName) {
      this.logger.error(`Server not found: ${dto.serverId}`);
      throw new Error(`Serwer o ID ${dto.serverId} nie został znaleziony`);
    }

    this.logger.log(`Server info: ${serverName} (${serverCode})`);

    // Queue the task via orchestrator
    const queueResult = this.crawlerOrchestratorService.queueManualTask(
      'sendSupport',
      dto.serverId,
      dto,
    );

    // Build response message
    let message: string;
    if (queueResult.queuePosition === 1) {
      message = `Zadanie wysłania wsparcia dodane do kolejki. Rozpocznie się wkrótce.`;
    } else {
      message = `Zadanie dodane do kolejki na pozycji ${queueResult.queuePosition}. Szacowany czas oczekiwania: ~${queueResult.estimatedWaitTime} sekund.`;
    }

    this.logger.log(`Support dispatch queued: taskId=${queueResult.taskId}, position=${queueResult.queuePosition}`);

    return {
      taskId: queueResult.taskId,
      queuePosition: queueResult.queuePosition,
      estimatedWaitTime: queueResult.estimatedWaitTime,
      message,
      totalAllocations: dto.allocations.length,
      targetVillageId: dto.targetVillageId,
    };
  }

  /**
   * Gets the status of a queued support task
   * 
   * @param taskId - Task ID to check
   * @returns Task status or null if not found
   */
  getTaskStatus(taskId: string) {
    return this.crawlerOrchestratorService.getManualTaskStatus(taskId);
  }

  /**
   * Sends support troops directly (legacy - for testing/emergency use)
   * WARNING: This bypasses the queue and may interfere with other browser sessions
   * 
   * @param dto - Send support request data
   * @returns Result with success/failure status for each allocation
   */
  async sendSupportDirect(dto: SendSupportDto): Promise<SendSupportResponseDto> {
    this.logger.warn(`=== DIRECT support dispatch (bypassing queue) ===`);
    this.logger.log(`Server ID: ${dto.serverId}`);
    this.logger.log(`Target village ID: ${dto.targetVillageId}`);
    this.logger.log(`Total allocations: ${dto.allocations.length}`);

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

    // Call the operation directly
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

