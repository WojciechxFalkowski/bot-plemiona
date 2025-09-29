import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ArmyTrainingStrategiesService } from './army-training-strategies.service';
import { CreateArmyTrainingStrategyDto } from './dto/create-army-training-strategy.dto';
import { UpdateArmyTrainingStrategyDto } from './dto/update-army-training-strategy.dto';
import { ArmyTrainingStrategyResponseDto } from './dto/army-training-strategy-response.dto';

@ApiTags('Army Training Strategies')
@Controller('army-training-strategies')
export class ArmyTrainingStrategiesController {
    constructor(
        private readonly armyTrainingStrategiesService: ArmyTrainingStrategiesService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Create a new army training strategy' })
    @ApiResponse({ status: 201, description: 'Army training strategy created successfully', type: ArmyTrainingStrategyResponseDto })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async create(@Body() createDto: CreateArmyTrainingStrategyDto): Promise<ArmyTrainingStrategyResponseDto> {
        return this.armyTrainingStrategiesService.create(createDto);
    }

    @Get('server/:serverId')
    @ApiOperation({ summary: 'Get all army training strategies for a server' })
    @ApiParam({ name: 'serverId', description: 'Server ID', type: 'number' })
    @ApiResponse({ status: 200, description: 'Army training strategies retrieved successfully', type: [ArmyTrainingStrategyResponseDto] })
    async findAllByServer(@Param('serverId') serverId: number): Promise<ArmyTrainingStrategyResponseDto[]> {
        return this.armyTrainingStrategiesService.findAllByServer(serverId);
    }

    @Get('server/:serverId/active')
    @ApiOperation({ summary: 'Get active army training strategies for a server' })
    @ApiParam({ name: 'serverId', description: 'Server ID', type: 'number' })
    @ApiResponse({ status: 200, description: 'Active army training strategies retrieved successfully', type: [ArmyTrainingStrategyResponseDto] })
    async findActiveByServer(@Param('serverId') serverId: number): Promise<ArmyTrainingStrategyResponseDto[]> {
        return this.armyTrainingStrategiesService.findActiveByServer(serverId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get army training strategy by ID' })
    @ApiParam({ name: 'id', description: 'Strategy ID', type: 'number' })
    @ApiResponse({ status: 200, description: 'Army training strategy retrieved successfully', type: ArmyTrainingStrategyResponseDto })
    @ApiResponse({ status: 404, description: 'Army training strategy not found' })
    async findById(@Param('id') id: number): Promise<ArmyTrainingStrategyResponseDto> {
        return this.armyTrainingStrategiesService.findById(id);
    }

    @Get('server/:serverId/village/:villageId')
    @ApiOperation({ summary: 'Get army training strategy by server and village' })
    @ApiParam({ name: 'serverId', description: 'Server ID', type: 'number' })
    @ApiParam({ name: 'villageId', description: 'Village ID', type: 'string' })
    @ApiResponse({ status: 200, description: 'Army training strategy retrieved successfully', type: ArmyTrainingStrategyResponseDto })
    @ApiResponse({ status: 404, description: 'Army training strategy not found' })
    async findByServerAndVillage(
        @Param('serverId') serverId: number,
        @Param('villageId') villageId: string
    ): Promise<ArmyTrainingStrategyResponseDto | null> {
        return this.armyTrainingStrategiesService.findByServerAndVillage(serverId, villageId);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update army training strategy by ID' })
    @ApiParam({ name: 'id', description: 'Strategy ID', type: 'number' })
    @ApiResponse({ status: 200, description: 'Army training strategy updated successfully', type: ArmyTrainingStrategyResponseDto })
    @ApiResponse({ status: 404, description: 'Army training strategy not found' })
    async updateById(
        @Param('id') id: number,
        @Body() updateDto: UpdateArmyTrainingStrategyDto
    ): Promise<ArmyTrainingStrategyResponseDto> {
        return this.armyTrainingStrategiesService.updateById(id, updateDto);
    }

    @Put('server/:serverId/village/:villageId')
    @ApiOperation({ summary: 'Update army training strategy by server and village' })
    @ApiParam({ name: 'serverId', description: 'Server ID', type: 'number' })
    @ApiParam({ name: 'villageId', description: 'Village ID', type: 'string' })
    @ApiResponse({ status: 200, description: 'Army training strategy updated successfully', type: ArmyTrainingStrategyResponseDto })
    @ApiResponse({ status: 404, description: 'Army training strategy not found' })
    async update(
        @Param('serverId') serverId: number,
        @Param('villageId') villageId: string,
        @Body() updateDto: UpdateArmyTrainingStrategyDto
    ): Promise<ArmyTrainingStrategyResponseDto> {
        return this.armyTrainingStrategiesService.update(serverId, villageId, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete army training strategy by ID' })
    @ApiParam({ name: 'id', description: 'Strategy ID', type: 'number' })
    @ApiResponse({ status: 200, description: 'Army training strategy deleted successfully' })
    @ApiResponse({ status: 404, description: 'Army training strategy not found' })
    async deleteById(@Param('id') id: number): Promise<void> {
        return this.armyTrainingStrategiesService.deleteById(id);
    }

    @Delete('server/:serverId/village/:villageId')
    @ApiOperation({ summary: 'Delete army training strategy by server and village' })
    @ApiParam({ name: 'serverId', description: 'Server ID', type: 'number' })
    @ApiParam({ name: 'villageId', description: 'Village ID', type: 'string' })
    @ApiResponse({ status: 200, description: 'Army training strategy deleted successfully' })
    @ApiResponse({ status: 404, description: 'Army training strategy not found' })
    async deleteByServerAndVillage(
        @Param('serverId') serverId: number,
        @Param('villageId') villageId: string
    ): Promise<void> {
        return this.armyTrainingStrategiesService.deleteByServerAndVillage(serverId, villageId);
    }

    @Put('server/:serverId/village/:villageId/toggle')
    @ApiOperation({ summary: 'Toggle army training strategy active status' })
    @ApiParam({ name: 'serverId', description: 'Server ID', type: 'number' })
    @ApiParam({ name: 'villageId', description: 'Village ID', type: 'string' })
    @ApiQuery({ name: 'isActive', description: 'Active status', type: 'boolean' })
    @ApiResponse({ status: 200, description: 'Army training strategy status toggled successfully' })
    @ApiResponse({ status: 404, description: 'Army training strategy not found' })
    async toggleStrategy(
        @Param('serverId') serverId: number,
        @Param('villageId') villageId: string,
        @Query('isActive') isActive: boolean
    ): Promise<void> {
        return this.armyTrainingStrategiesService.toggleStrategy(serverId, villageId, isActive);
    }
}
