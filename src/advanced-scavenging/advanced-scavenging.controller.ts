import { Controller, Get, Put, Post, Param, Body, ParseIntPipe, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdvancedScavengingService } from './advanced-scavenging.service';
import { VillageUnitsConfigDto } from './dto/village-units-config.dto';
import { UpdateVillageUnitsConfigDto } from './dto/update-village-units-config.dto';
import { BatchUpdateVillageUnitsConfigDto } from './dto/batch-update-village-units-config.dto';
import {
  GetVillageUnitsConfigDecorators,
  UpdateVillageUnitsConfigDecorators,
  GetServerVillagesUnitsConfigDecorators,
  TestLoginDecorators,
  TriggerScavengingForVillageDecorators,
} from './decorators';

@ApiTags('Advanced Scavenging')
@Controller('advanced-scavenging')
export class AdvancedScavengingController {
  private readonly logger = new Logger(AdvancedScavengingController.name);

  constructor(private readonly advancedScavengingService: AdvancedScavengingService) {}

  // More specific routes first
  @Post(':serverId/village/:villageId/trigger-scavenging')
  @TriggerScavengingForVillageDecorators()
  async triggerScavengingForVillage(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('villageId') villageId: string,
  ): Promise<{ success: boolean; message: string; dispatchedCount: number }> {
    if (!villageId) {
      throw new BadRequestException('villageId parameter is required');
    }

    try {
      return await this.advancedScavengingService.triggerScavengingForVillage(serverId, villageId);
    } catch (error) {
      // Sprawdź czy błąd dotyczy wyłączonego auto-scavenging
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Auto-zbieractwo jest wyłączone')) {
        // Zwróć odpowiedź podobną do orchestrator - success: true z informacyjnym komunikatem
        this.logger.warn(`Auto-scavenging is disabled for server ${serverId}. Manual trigger will not run the bot.`);
        return {
          success: true,
          message: errorMessage,
          dispatchedCount: 0
        };
      }

      // Dla innych błędów rzuć wyjątek
      this.logger.error(`Error during manual scavenging trigger for village ${villageId} on server ${serverId}:`, error);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  @Get(':serverId/village/:villageId')
  @GetVillageUnitsConfigDecorators()
  async getVillageUnitsConfig(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('villageId') villageId: string,
  ): Promise<VillageUnitsConfigDto> {
    if (!villageId) {
      throw new BadRequestException('villageId parameter is required');
    }
    return this.advancedScavengingService.getVillageUnitsConfig(serverId, villageId);
  }

  @Put(':serverId/batch-units')
  async batchUpdateUnitsConfig(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Body() updateDto: BatchUpdateVillageUnitsConfigDto,
  ): Promise<{ updatedCount: number; skippedCount: number }> {
    return this.advancedScavengingService.batchUpdateUnitsConfig(serverId, updateDto.units);
  }

  @Put(':serverId/village/:villageId')
  @UpdateVillageUnitsConfigDecorators()
  async updateVillageUnitsConfig(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('villageId') villageId: string,
    @Body() updateDto: UpdateVillageUnitsConfigDto,
  ): Promise<VillageUnitsConfigDto> {
    if (!villageId) {
      throw new BadRequestException('villageId parameter is required');
    }
    return this.advancedScavengingService.updateVillageUnitsConfig(serverId, villageId, updateDto);
  }

  @Post(':serverId/test-login')
  @TestLoginDecorators()
  async testLogin(
    @Param('serverId', ParseIntPipe) serverId: number,
  ): Promise<{ success: boolean; message: string; url?: string }> {
    return this.advancedScavengingService.testLogin(serverId);
  }

  // Less specific routes last
  @Get(':serverId')
  @GetServerVillagesUnitsConfigDecorators()
  async getServerVillagesUnitsConfig(
    @Param('serverId', ParseIntPipe) serverId: number,
  ): Promise<VillageUnitsConfigDto[]> {
    return this.advancedScavengingService.getServerVillagesUnitsConfig(serverId);
  }
}

