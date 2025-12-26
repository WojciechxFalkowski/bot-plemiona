import { Controller, Post, Logger, Body, BadRequestException, InternalServerErrorException, NotFoundException, HttpException, Get, Param } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { ScavengingTimeData, VillageScavengingData } from '@/utils/scavenging/scavenging.interfaces';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiParam } from '@nestjs/swagger';
import { VillageUnitsData } from './pages/village-units-overview.page';

// DTO for adding building to queue
interface AddBuildingToQueueDto {
  buildingId: string;
  targetLevel: number;
  villageName: string;
}

@ApiTags('Scavenging Bot')
@Controller('scavenging')
export class CrawlerController {
  private readonly logger = new Logger(CrawlerController.name);

  constructor(private readonly crawlerService: CrawlerService) { }

  /**
   * Manually triggers the Plemiona scavenging bot with a visible browser window.
   * This is useful for debugging or when you want to see what the bot is doing.
   */
  @Get('run-visible')
  @ApiOperation({
    summary: 'Run scavenging bot with visible browser',
    description: 'Manually starts the scavenging bot in visible mode (shows browser window)'
  })
  @ApiResponse({ status: 200, description: 'Bot started successfully' })
  public async runScavengingVisible(@Param('serverId') serverId: number) {
    this.logger.log('Manually triggered scavenging bot (visible browser)');
    await this.crawlerService.runScavengingBot(serverId, { headless: false });
    return { message: 'Scavenging bot started in visible mode successfully' };
  }

  /**
   * Manually triggers the Plemiona scavenging bot in headless mode.
   * This runs the bot in the background without showing a browser window.
   */
  @Get('run-headless')
  @ApiOperation({
    summary: 'Run scavenging bot in headless mode',
    description: 'Manually starts the scavenging bot in headless mode (browser runs in background)'
  })
  @ApiResponse({ status: 200, description: 'Bot started successfully' })
  public async runScavengingHeadless(@Param('serverId') serverId: number) {
    this.logger.log('Manually triggered scavenging bot (headless)');
    await this.crawlerService.runScavengingBot(serverId, { headless: true });
    return { message: 'Scavenging bot started in headless mode successfully' };
  }

  /**
   * Adds a building to the construction queue for a specific village
   */
  @Post('add-building-to-queue')
  @ApiOperation({
    summary: 'Add building to construction queue',
    description: 'Adds a specified building to the construction queue for a given village'
  })
  @ApiBody({
    description: 'Building queue request',
    schema: {
      type: 'object',
      properties: {
        buildingId: {
          type: 'string',
          description: 'ID of the building to construct (e.g., "main", "barracks", "stable")',
          example: 'barracks'
        },
        targetLevel: {
          type: 'number',
          description: 'Target level to build the building to',
          example: 5,
          minimum: 1
        },
        villageName: {
          type: 'string',
          description: 'Name of the village where to build',
          example: 'Moja Wioska'
        }
      },
      required: ['buildingId', 'targetLevel', 'villageName']
    }
  })
  @ApiResponse({ status: 200, description: 'Building successfully added to construction queue' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 404, description: 'Village not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  public async addBuildingToQueue(@Body() dto: AddBuildingToQueueDto) {
    try {
      this.logger.log(`Adding building to queue: ${dto.buildingId} level ${dto.targetLevel} in village ${dto.villageName}`);

      // Validate input parameters
      if (!dto.buildingId || !dto.villageName || !dto.targetLevel) {
        throw new BadRequestException('Missing required parameters: buildingId, targetLevel, and villageName are required');
      }

      if (dto.targetLevel < 1) {
        throw new BadRequestException('Target level must be at least 1');
      }

      if (typeof dto.buildingId !== 'string' || dto.buildingId.trim() === '') {
        throw new BadRequestException('Building ID must be a non-empty string');
      }

      if (typeof dto.villageName !== 'string' || dto.villageName.trim() === '') {
        throw new BadRequestException('Village name must be a non-empty string');
      }

      // Call service method
      const result = await this.crawlerService.addBuildingToQueue(
        dto.buildingId.trim(),
        dto.targetLevel,
        dto.villageName.trim()
      );

      return {
        message: 'Building successfully added to construction queue',
        buildingId: dto.buildingId,
        targetLevel: dto.targetLevel,
        villageName: dto.villageName,
        result
      };

    } catch (error) {
      this.logger.error(`Error adding building to queue: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to add building to construction queue');
    }
  }

  /**
   * Gets the collected scavenging time data for all villages
   */
  @Get('scavenging-times')
  @ApiOperation({
    summary: 'Get scavenging time data',
    description: 'Returns collected data about scavenging times for all villages and levels'
  })
  @ApiResponse({
    status: 200,
    description: 'Scavenging time data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        lastCollected: {
          type: 'string',
          format: 'date-time',
          description: 'When the data was last collected'
        },
        villages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              villageId: { type: 'string' },
              villageName: { type: 'string' },
              lastUpdated: { type: 'string', format: 'date-time' },
              levels: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    level: { type: 'number' },
                    timeRemaining: { type: 'string', nullable: true },
                    timeRemainingSeconds: { type: 'number' },
                    status: {
                      type: 'string',
                      enum: ['busy', 'available', 'locked', 'unlocking']
                    },
                    estimatedCompletionTime: {
                      type: 'string',
                      format: 'date-time',
                      nullable: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  public getScavengingTimes(): ScavengingTimeData {
    this.logger.log('Requested scavenging time data');
    return this.crawlerService.getScavengingTimeData();
  }

  /**
   * Gets the scavenging time data for a specific village
   */
  @Get('scavenging-times/:villageId')
  @ApiOperation({
    summary: 'Get scavenging time data for specific village',
    description: 'Returns collected data about scavenging times for a specific village'
  })
  @ApiResponse({ status: 200, description: 'Village scavenging time data retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Village not found' })
  public getVillageScavengingTimes(@Param('villageId') villageId: string): VillageScavengingData | { message: string; villageId: string } {
    this.logger.log(`Requested scavenging time data for village: ${villageId}`);
    const villageData = this.crawlerService.getVillageScavengingData(villageId);

    if (!villageData) {
      return {
        message: 'Village not found or no scavenging data available',
        villageId
      };
    }

    return villageData;
  }

  /**
   * Gets village units data from overview table
   * Extracts all villages with their units data from the combined overview table
   */
  @Get('village-units/:serverId')
  @ApiOperation({
    summary: 'Pobierz dane o jednostkach wojskowych wszystkich wiosek',
    description: 'Wyciąga dane o jednostkach wojskowych ze strony przeglądu wiosek. Wymaga zalogowania i automatycznie obsługuje paginację.'
  })
  @ApiParam({
    name: 'serverId',
    description: 'ID serwera',
    type: Number,
    example: 1
  })
  @ApiResponse({
    status: 200,
    description: 'Dane o jednostkach wojskowych pobrane pomyślnie',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          villageId: { type: 'string', description: 'ID wioski' },
          name: { type: 'string', description: 'Nazwa wioski' },
          coordinates: { type: 'string', description: 'Koordynaty wioski (format: X|Y)' },
          population: {
            type: 'object',
            properties: {
              current: { type: 'number', description: 'Aktualna populacja' },
              max: { type: 'number', description: 'Maksymalna populacja' }
            }
          },
          units: {
            type: 'object',
            properties: {
              spear: { type: 'number', description: 'Pikinier' },
              sword: { type: 'number', description: 'Miecznik' },
              axe: { type: 'number', description: 'Topornik' },
              archer: { type: 'number', description: 'Łucznik (może nie być dostępny na wszystkich serwerach)' },
              spy: { type: 'number', description: 'Zwiadowca' },
              light: { type: 'number', description: 'Lekki kawalerzysta' },
              heavy: { type: 'number', description: 'Ciężki kawalerzysta' },
              ram: { type: 'number', description: 'Taran' },
              catapult: { type: 'number', description: 'Katapulta' },
              knight: { type: 'number', description: 'Rycerz' },
              snob: { type: 'number', description: 'Szlachcic' }
            }
          },
          traders: {
            type: 'object',
            properties: {
              current: { type: 'number', description: 'Aktualna liczba kupców' },
              max: { type: 'number', description: 'Maksymalna liczba kupców' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Nieprawidłowe parametry żądania' })
  @ApiResponse({ status: 500, description: 'Błąd serwera podczas wyciągania danych' })
  public async getVillageUnits(@Param('serverId') serverId: number): Promise<VillageUnitsData[]> {
    try {
      this.logger.log(`Requested village units data for server: ${serverId}`);
      
      if (!serverId || isNaN(Number(serverId))) {
        throw new BadRequestException('Invalid serverId parameter');
      }
      
      const villagesData = await this.crawlerService.getVillageUnitsData(Number(serverId));
      
      this.logger.log(`Successfully returned units data for ${villagesData.length} villages`);
      
      return villagesData;
      
    } catch (error) {
      this.logger.error(`Error getting village units data: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Failed to extract village units data: ${error.message}`);
    }
  }
} 
