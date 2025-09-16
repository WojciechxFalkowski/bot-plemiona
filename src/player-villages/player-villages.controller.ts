import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { PlayerVillagesService } from './player-villages.service';
import { CreatePlayerVillageDto } from './dto/create-player-village.dto';
import { CreatePlayerVillageFromUrlDto } from './dto/create-player-village-from-url.dto';
import { UpdatePlayerVillageDto } from './dto/update-player-village.dto';
import { PlayerVillageDto } from './dto/player-village.dto';

@ApiTags('Player Villages')
@Controller('player-villages')
export class PlayerVillagesController {
    constructor(private readonly playerVillagesService: PlayerVillagesService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new player village' })
    @ApiResponse({ status: 201, description: 'Player village created successfully', type: PlayerVillageDto })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 409, description: 'Player village already exists' })
    create(@Body() createPlayerVillageDto: CreatePlayerVillageDto) {
        return this.playerVillagesService.create(createPlayerVillageDto);
    }

    @Post(':serverId/from-url')
    @ApiOperation({ 
        summary: 'Create player village from URL',
        description: 'Creates a player village from a Plemiona game URL for a specific server'
    })
    @ApiParam({
        name: 'serverId',
        description: 'Server ID',
        type: 'number',
        example: 1
    })
    @ApiResponse({ status: 201, description: 'Player village created successfully from URL', type: PlayerVillageDto })
    @ApiResponse({ status: 400, description: 'Invalid URL format' })
    @ApiResponse({ status: 409, description: 'Player village already exists' })
    createFromUrl(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Body() createFromUrlDto: CreatePlayerVillageFromUrlDto
    ) {
        return this.playerVillagesService.createFromUrl(serverId, createFromUrlDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all player villages' })
    @ApiQuery({ name: 'serverId', required: false, type: Number, description: 'Filter by server ID' })
    @ApiResponse({ status: 200, description: 'List of player villages', type: [PlayerVillageDto] })
    findAll(@Query('serverId') serverId?: number) {
        if (serverId) {
            return this.playerVillagesService.findByServerId(serverId);
        }
        return this.playerVillagesService.findAll();
    }

    @Get('attackable/:serverId')
    @ApiOperation({ summary: 'Get attackable player villages for a server' })
    @ApiResponse({ status: 200, description: 'List of attackable player villages', type: [PlayerVillageDto] })
    findAttackableVillages(@Param('serverId') serverId: number) {
        return this.playerVillagesService.findAttackableVillages(serverId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a player village by ID' })
    @ApiResponse({ status: 200, description: 'Player village found', type: PlayerVillageDto })
    @ApiResponse({ status: 404, description: 'Player village not found' })
    findOne(@Param('id') id: number) {
        return this.playerVillagesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a player village' })
    @ApiResponse({ status: 200, description: 'Player village updated successfully', type: PlayerVillageDto })
    @ApiResponse({ status: 404, description: 'Player village not found' })
    update(@Param('id') id: number, @Body() updatePlayerVillageDto: UpdatePlayerVillageDto) {
        return this.playerVillagesService.update(id, updatePlayerVillageDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a player village' })
    @ApiResponse({ status: 200, description: 'Player village deleted successfully' })
    @ApiResponse({ status: 404, description: 'Player village not found' })
    remove(@Param('id') id: number) {
        return this.playerVillagesService.remove(id);
    }

    @Post(':id/verify-owner')
    @ApiOperation({ summary: 'Verify player village owner' })
    @ApiParam({
        name: 'id',
        description: 'Player village ID',
        type: 'number',
        example: 1
    })
    @ApiQuery({
        name: 'serverCode',
        description: 'Server code (e.g., pl216, pl219)',
        type: 'string',
        example: 'pl216'
    })
    @ApiResponse({ status: 200, description: 'Village owner verified successfully' })
    @ApiResponse({ status: 404, description: 'Player village not found' })
    @ApiResponse({ status: 400, description: 'Invalid server code or verification failed' })
    async verifyVillageOwner(
        @Param('id', ParseIntPipe) id: number, 
        @Query('serverCode') serverCode: string
    ) {
        return await this.playerVillagesService.verifyVillageOwner(id, serverCode);
    }

    @Post('execute-attacks/:serverId')
    @ApiOperation({ summary: 'Execute attacks on player villages for a server' })
    @ApiResponse({ status: 200, description: 'Attacks executed successfully' })
    executeAttacks(@Param('serverId') serverId: number) {
        // This endpoint would trigger the attack execution process
        // Implementation would be handled by CrawlerOrchestratorService
        return this.playerVillagesService.executeAttacks(serverId);
    }
}
