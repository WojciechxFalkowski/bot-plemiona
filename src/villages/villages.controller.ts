import { Controller, Get, Put, Post, Patch, Param, Logger, Body, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { VillagesService } from './villages.service';
import { VillageResponseDto, VillageToggleResponseDto, VillageBulkToggleResponseDto, CreateVillageDto, UpdateVillageDto, BulkToggleDto } from './dto';
import { VillageEntity } from './entities/village.entity';

@ApiTags('Villages')
@Controller('villages')
export class VillagesController {
    private readonly logger = new Logger(VillagesController.name);

    constructor(
        private readonly villagesService: VillagesService,
    ) { }

    /**
     * GET /villages/:serverId - Get all villages for a server
     */
    @Get(':serverId')
    @ApiOperation({
        summary: 'Get all villages for a server',
        description: 'Retrieves all villages for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Villages retrieved successfully'
    })
    async getAllVillages(@Param('serverId', ParseIntPipe) serverId: number): Promise<VillageEntity[]> {
        this.logger.log(`GET /villages/${serverId} - Fetching all villages for server ${serverId}`);
        return this.villagesService.findAll(serverId, true);
    }

    /**
     * GET /villages/:serverId/auto-scavenging - Get villages with auto-scavenging enabled
     */
    @Get(':serverId/auto-scavenging')
    @ApiOperation({
        summary: 'Get villages with auto-scavenging enabled',
        description: 'Retrieves all villages with auto-scavenging enabled for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    async getVillagesWithAutoScavenging(@Param('serverId', ParseIntPipe) serverId: number): Promise<VillageResponseDto[]> {
        this.logger.log(`GET /villages/${serverId}/auto-scavenging - Fetching villages with auto-scavenging enabled`);
        return this.villagesService.findWithAutoScavenging(serverId);
    }

    /**
     * GET /villages/:serverId/auto-building - Get villages with auto-building enabled
     */
    @Get(':serverId/auto-building')
    @ApiOperation({
        summary: 'Get villages with auto-building enabled',
        description: 'Retrieves all villages with auto-building enabled for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    async getVillagesWithAutoBuilding(@Param('serverId', ParseIntPipe) serverId: number): Promise<VillageResponseDto[]> {
        this.logger.log(`GET /villages/${serverId}/auto-building - Fetching villages with auto-building enabled`);
        return this.villagesService.findWithAutoBuilding(serverId);
    }

    /**
     * GET /villages/:serverId/:villageId - Get specific village by ID
     */
    @Get(':serverId/:villageId')
    @ApiOperation({
        summary: 'Get village by ID',
        description: 'Retrieves a specific village by its ID for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiParam({
        name: 'villageId',
        description: 'Village ID',
        type: 'string',
        example: '12345'
    })
    async getVillageById(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageId') villageId: string
    ): Promise<VillageResponseDto> {
        this.logger.log(`GET /villages/${serverId}/${villageId} - Fetching village by ID`);
        return this.villagesService.findById(serverId, villageId);
    }

    /**
     * GET /villages/:serverId/name/:villageName - Get village by name
     */
    @Get(':serverId/name/:villageName')
    @ApiOperation({
        summary: 'Get village by name',
        description: 'Retrieves a specific village by its name for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiParam({
        name: 'villageName',
        description: 'Village name',
        type: 'string',
        example: 'Wioska Barbarzyńców'
    })
    async getVillageByName(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageName') villageName: string
    ): Promise<VillageResponseDto> {
        this.logger.log(`GET /villages/${serverId}/name/${villageName} - Fetching village by name`);
        return this.villagesService.findByName(serverId, villageName);
    }

    /**
     * POST /villages/:serverId - Create new village
     */
    @Post(':serverId')
    @ApiOperation({
        summary: 'Create new village',
        description: 'Creates a new village for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    async createVillage(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Body() createVillageDto: CreateVillageDto
    ): Promise<VillageResponseDto> {
        this.logger.log(`POST /villages/${serverId} - Creating village for server ${serverId}`);
        return this.villagesService.create(serverId, createVillageDto);
    }

    /**
     * PUT /villages/:serverId/:villageId - Update village
     */
    @Put(':serverId/:villageId')
    @ApiOperation({
        summary: 'Update village',
        description: 'Updates a specific village for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiParam({
        name: 'villageId',
        description: 'Village ID',
        type: 'string',
        example: '12345'
    })
    async updateVillage(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageId') villageId: string,
        @Body() updateVillageDto: UpdateVillageDto
    ): Promise<VillageResponseDto> {
        this.logger.log(`PUT /villages/${serverId}/${villageId} - Updating village`);
        return this.villagesService.update(serverId, villageId, updateVillageDto);
    }

    /**
     * DELETE /villages/:serverId/:villageId - Delete village
     */
    @Delete(':serverId/:villageId')
    @ApiOperation({
        summary: 'Delete village',
        description: 'Deletes a specific village for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiParam({
        name: 'villageId',
        description: 'Village ID',
        type: 'string',
        example: '12345'
    })
    async deleteVillage(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageId') villageId: string
    ): Promise<{ message: string }> {
        this.logger.log(`DELETE /villages/${serverId}/${villageId} - Deleting village`);
        await this.villagesService.delete(serverId, villageId);
        return { message: `Village ${villageId} deleted successfully from server ${serverId}` };
    }

    /**
     * POST /villages/:serverId/refresh - Manual village data refresh
     */
    @Post(':serverId/refresh')
    @ApiOperation({
        summary: 'Refresh village data',
        description: 'Manually refreshes village data from the game for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    async refreshVillages(@Param('serverId', ParseIntPipe) serverId: number): Promise<{ message: string; result: any }> {
        this.logger.log(`POST /villages/${serverId}/refresh - Manual village data refresh for server ${serverId}`);
        try {
            const result = await this.villagesService.refreshVillageData(serverId);
            return {
                message: `Village data refreshed successfully for server ${serverId}`,
                result
            };
        } catch (error) {
            this.logger.error(`Failed to refresh village data for server ${serverId}:`, error);
            throw error;
        }
    }

    /**
     * PATCH /villages/:serverId/bulk-settings/auto-scavenging - Set auto-scavenging for all villages
     */
    @Patch(':serverId/bulk-settings/auto-scavenging')
    @ApiOperation({
        summary: 'Ustaw zbieractwo dla wszystkich wiosek',
        description: 'Włącza lub wyłącza auto-scavenging dla wszystkich wiosek na serwerze'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Zaktualizowano ustawienia'
    })
    async bulkSetAutoScavenging(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Body() dto: BulkToggleDto
    ): Promise<VillageBulkToggleResponseDto> {
        this.logger.log(`PATCH /villages/${serverId}/bulk-settings/auto-scavenging - Bulk set auto-scavenging to ${dto.enabled}`);
        return this.villagesService.bulkSetAutoScavenging(serverId, dto.enabled);
    }

    /**
     * PATCH /villages/:serverId/bulk-settings/auto-building - Set auto-building for all villages
     */
    @Patch(':serverId/bulk-settings/auto-building')
    @ApiOperation({
        summary: 'Ustaw auto-budowanie dla wszystkich wiosek',
        description: 'Włącza lub wyłącza auto-building dla wszystkich wiosek na serwerze'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Zaktualizowano ustawienia'
    })
    async bulkSetAutoBuilding(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Body() dto: BulkToggleDto
    ): Promise<VillageBulkToggleResponseDto> {
        this.logger.log(`PATCH /villages/${serverId}/bulk-settings/auto-building - Bulk set auto-building to ${dto.enabled}`);
        return this.villagesService.bulkSetAutoBuilding(serverId, dto.enabled);
    }

    /**
     * PUT /villages/:serverId/:villageId/toggle/auto-scavenging - Toggle auto-scavenging
     */
    @Put(':serverId/:villageId/toggle/auto-scavenging')
    @ApiOperation({
        summary: 'Toggle auto-scavenging for village',
        description: 'Toggles auto-scavenging on/off for a specific village'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiParam({
        name: 'villageId',
        description: 'Village ID',
        type: 'string',
        example: '12345'
    })
    async toggleAutoScavenging(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageId') villageId: string
    ): Promise<VillageToggleResponseDto> {
        this.logger.log(`PUT /villages/${serverId}/${villageId}/toggle/auto-scavenging - Toggle auto-scavenging`);
        return this.villagesService.toggleAutoScavenging(serverId, villageId);
    }

    /**
     * PUT /villages/:serverId/:villageId/toggle/auto-building - Toggle auto-building
     */
    @Put(':serverId/:villageId/toggle/auto-building')
    @ApiOperation({
        summary: 'Toggle auto-building for village',
        description: 'Toggles auto-building on/off for a specific village'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiParam({
        name: 'villageId',
        description: 'Village ID',
        type: 'string',
        example: '12345'
    })
    async toggleAutoBuilding(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageId') villageId: string
    ): Promise<VillageToggleResponseDto> {
        this.logger.log(`PUT /villages/${serverId}/${villageId}/toggle/auto-building - Toggle auto-building`);
        return this.villagesService.toggleAutoBuilding(serverId, villageId);
    }

    /**
     * PUT /villages/:serverId/name/:villageName/toggle/auto-scavenging - Toggle auto-scavenging by name
     */
    @Put(':serverId/name/:villageName/toggle/auto-scavenging')
    @ApiOperation({
        summary: 'Toggle auto-scavenging for village by name',
        description: 'Toggles auto-scavenging on/off for a village identified by name'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiParam({
        name: 'villageName',
        description: 'Village name',
        type: 'string',
        example: 'Wioska Barbarzyńców'
    })
    async toggleAutoScavengingByName(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageName') villageName: string
    ): Promise<VillageToggleResponseDto> {
        this.logger.log(`PUT /villages/${serverId}/name/${villageName}/toggle/auto-scavenging - Toggle auto-scavenging by name`);
        return this.villagesService.toggleAutoScavengingByName(serverId, villageName);
    }

    /**
     * PUT /villages/:serverId/name/:villageName/toggle/auto-building - Toggle auto-building by name
     */
    @Put(':serverId/name/:villageName/toggle/auto-building')
    @ApiOperation({
        summary: 'Toggle auto-building for village by name',
        description: 'Toggles auto-building on/off for a village identified by name'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiParam({
        name: 'villageName',
        description: 'Village name',
        type: 'string',
        example: 'Wioska Barbarzyńców'
    })
    async toggleAutoBuildingByName(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageName') villageName: string
    ): Promise<VillageToggleResponseDto> {
        this.logger.log(`PUT /villages/${serverId}/name/${villageName}/toggle/auto-building - Toggle auto-building by name`);
        return this.villagesService.toggleAutoBuildingByName(serverId, villageName);
    }

    /**
     * GET /villages/:serverId/stats - Get village statistics
     */
    @Get(':serverId/stats')
    @ApiOperation({
        summary: 'Get village statistics',
        description: 'Retrieves statistics for villages on a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    async getVillageStats(@Param('serverId', ParseIntPipe) serverId: number): Promise<{
        totalVillages: number;
        autoScavengingEnabled: number;
        autoBuildingEnabled: number;
    }> {
        this.logger.log(`GET /villages/${serverId}/stats - Getting village statistics for server ${serverId}`);
        
        const [totalVillages, autoScavengingEnabled, autoBuildingEnabled] = await Promise.all([
            this.villagesService.getVillageCount(serverId),
            this.villagesService.getAutoScavengingCount(serverId),
            this.villagesService.getAutoBuildingCount(serverId)
        ]);

        return {
            totalVillages,
            autoScavengingEnabled,
            autoBuildingEnabled
        };
    }
} 