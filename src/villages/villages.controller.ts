import { Controller, Get, Put, Post, Param, Logger } from '@nestjs/common';
import { VillagesService } from './villages.service';
import { VillageResponseDto, VillageToggleResponseDto } from './dto';

@Controller('villages')
export class VillagesController {
    private readonly logger = new Logger(VillagesController.name);

    constructor(
        private readonly villagesService: VillagesService,
    ) { }

    /**
     * GET /villages - Pobiera wszystkie wioski z auto-refresh jeśli dane > 1h
     */
    @Get()
    async getAllVillages(): Promise<VillageResponseDto[]> {
        this.logger.log('GET /villages - Fetching all villages with auto-refresh check');
        return this.villagesService.findAll(true);
    }

    /**
     * GET /villages/:name - Pobiera pojedynczą wioskę po nazwie
     */
    @Get(':name')
    async getVillageByName(@Param('name') name: string): Promise<VillageResponseDto> {
        this.logger.log(`GET /villages/${name} - Fetching village by name`);
        return this.villagesService.findByName(name);
    }

    /**
     * POST /villages/refresh - Ręczne odświeżenie danych ze scrapingu
     */
    @Post('manual-refresh')
    async refreshVillages(): Promise<{ message: string; result: any }> {
        this.logger.log('POST /villages/refresh - Manual village data refresh');
        try {
            const result = await this.villagesService.refreshVillageData();
            return {
                message: 'Village data refreshed successfully',
                result
            };
        } catch (error) {
            this.logger.error('Failed to refresh village data:', error);
            throw error;
        }
    }
 
    /**
     * GET /villages/auto-scavenging-status/:name - Pobiera status auto-scavenging dla konkretnej wioski
     */
    @Get(':name/auto-scavenging-status')
    async getAutoScavengingStatus(@Param('name') name: string): Promise<{ isAutoScavengingEnabled: boolean }> {
        this.logger.log(`GET /villages/${name}/auto-scavenging-status - Fetching auto-scavenging status for village ${name}`);
        const village = await this.villagesService.findByName(name);
        return { isAutoScavengingEnabled: village.isAutoScavengingEnabled };
    }

    /**
     * GET /villages/auto-building-status/:name - Pobiera status auto-building dla konkretnej wioski
     */
    @Get(':name/auto-building-status')
    async getAutoBuildingStatus(@Param('name') name: string): Promise<{ isAutoBuildEnabled: boolean }> {
        this.logger.log(`GET /villages/${name}/auto-building-status - Fetching auto-building status for village ${name}`);
        const village = await this.villagesService.findByName(name);
        return { isAutoBuildEnabled: village.isAutoBuildEnabled };
    }

    /**
     * PUT /villages/:name/scavenging - Toggle automatycznego zbieractwa
     */
    @Put(':name/scavenging')
    async toggleAutoScavenging(@Param('name') name: string): Promise<VillageToggleResponseDto> {
        this.logger.log(`PUT /villages/${name}/scavenging - Toggling auto-scavenging for village ${name}`);
        return this.villagesService.toggleAutoScavengingByName(name);
    }

    /**
     * PUT /villages/:name/building - Toggle automatycznego budowania
     */
    @Put(':name/building')
    async toggleAutoBuilding(@Param('name') name: string): Promise<VillageToggleResponseDto> {
        this.logger.log(`PUT /villages/${name}/building - Toggling auto-building for village ${name}`);
        return this.villagesService.toggleAutoBuildingByName(name);
    }
} 