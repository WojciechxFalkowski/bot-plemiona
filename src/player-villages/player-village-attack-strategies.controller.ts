import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PlayerVillageAttackStrategiesService } from './player-village-attack-strategies.service';
import { CreatePlayerVillageAttackStrategyDto } from './dto/create-player-village-attack-strategy.dto';
import { UpdatePlayerVillageAttackStrategyDto } from './dto/update-player-village-attack-strategy.dto';
import { PlayerVillageAttackStrategyDto } from './dto/player-village-attack-strategy.dto';

@ApiTags('Player Village Attack Strategies')
@Controller('player-village-attack-strategies')
export class PlayerVillageAttackStrategiesController {
    constructor(private readonly playerVillageAttackStrategiesService: PlayerVillageAttackStrategiesService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new player village attack strategy' })
    @ApiResponse({ status: 201, description: 'Player village attack strategy created successfully', type: PlayerVillageAttackStrategyDto })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 409, description: 'Player village attack strategy already exists' })
    create(@Body() createDto: CreatePlayerVillageAttackStrategyDto) {
        return this.playerVillageAttackStrategiesService.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all player village attack strategies' })
    @ApiQuery({ name: 'serverId', required: false, type: Number, description: 'Filter by server ID' })
    @ApiResponse({ status: 200, description: 'List of player village attack strategies', type: [PlayerVillageAttackStrategyDto] })
    findAll(@Query('serverId') serverId?: number) {
        if (serverId) {
            return this.playerVillageAttackStrategiesService.findByServerId(serverId);
        }
        return this.playerVillageAttackStrategiesService.findAll();
    }

    @Get('village/:serverId/:villageId')
    @ApiOperation({ summary: 'Get attack strategy for specific village' })
    @ApiResponse({ status: 200, description: 'Attack strategy found', type: PlayerVillageAttackStrategyDto })
    @ApiResponse({ status: 404, description: 'Attack strategy not found' })
    findByVillage(@Param('serverId') serverId: number, @Param('villageId') villageId: string) {
        return this.playerVillageAttackStrategiesService.findByVillageId(serverId, villageId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a player village attack strategy by ID' })
    @ApiResponse({ status: 200, description: 'Player village attack strategy found', type: PlayerVillageAttackStrategyDto })
    @ApiResponse({ status: 404, description: 'Player village attack strategy not found' })
    findOne(@Param('id') id: number) {
        return this.playerVillageAttackStrategiesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a player village attack strategy' })
    @ApiResponse({ status: 200, description: 'Player village attack strategy updated successfully', type: PlayerVillageAttackStrategyDto })
    @ApiResponse({ status: 404, description: 'Player village attack strategy not found' })
    update(@Param('id') id: number, @Body() updateDto: UpdatePlayerVillageAttackStrategyDto) {
        return this.playerVillageAttackStrategiesService.update(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a player village attack strategy' })
    @ApiResponse({ status: 200, description: 'Player village attack strategy deleted successfully' })
    @ApiResponse({ status: 404, description: 'Player village attack strategy not found' })
    remove(@Param('id') id: number) {
        return this.playerVillageAttackStrategiesService.remove(id);
    }
}
