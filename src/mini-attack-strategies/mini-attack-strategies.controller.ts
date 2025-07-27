import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus, Logger, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MiniAttackStrategiesService } from './mini-attack-strategies.service';
import { 
    CreateMiniAttackStrategyDto, 
    UpdateMiniAttackStrategyDto, 
    MiniAttackStrategyResponseDto,
    CalculateAttacksRequestDto,
    CalculateAttacksResponseDto
} from './dto';
import {
    GetMiniAttackStrategyDecorator,
    CreateMiniAttackStrategyDecorator,
    UpdateMiniAttackStrategyDecorator,
    DeleteMiniAttackStrategyDecorator,
    CalculateMaxAttacksDecorator,
    GetActiveUnitsDecorator
} from './decorators';

@ApiTags('Mini Attack Strategies')
@Controller('mini-attack-strategies')
export class MiniAttackStrategiesController {
    private readonly logger = new Logger(MiniAttackStrategiesController.name);

    constructor(
        private readonly strategiesService: MiniAttackStrategiesService
    ) { }

    @Get(':serverId/:villageId')
    @HttpCode(HttpStatus.OK)
    @GetMiniAttackStrategyDecorator()
    async getStrategy(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageId') villageId: string
    ): Promise<MiniAttackStrategyResponseDto> {
        this.logger.log(`Request to get strategy for server ${serverId}, village ${villageId}`);
        
        try {
            const strategy = await this.strategiesService.findByServerAndVillage(serverId, villageId);
            this.logger.log(`Successfully retrieved strategy for server ${serverId}, village ${villageId}`);
            return strategy;
        } catch (error) {
            this.logger.error(`Failed to get strategy for server ${serverId}, village ${villageId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @CreateMiniAttackStrategyDecorator()
    async createStrategy(
        @Body() createDto: CreateMiniAttackStrategyDto
    ): Promise<MiniAttackStrategyResponseDto> {
        this.logger.log(`Request to create strategy for server ${createDto.serverId}, village ${createDto.villageId}`);
        
        try {
            const strategy = await this.strategiesService.create(createDto);
            this.logger.log(`Successfully created strategy for server ${createDto.serverId}, village ${createDto.villageId}`);
            return strategy;
        } catch (error) {
            this.logger.error(`Failed to create strategy for server ${createDto.serverId}, village ${createDto.villageId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Put(':serverId/:villageId')
    @HttpCode(HttpStatus.OK)
    @UpdateMiniAttackStrategyDecorator()
    async updateStrategy(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageId') villageId: string,
        @Body() updateDto: UpdateMiniAttackStrategyDto
    ): Promise<MiniAttackStrategyResponseDto> {
        this.logger.log(`Request to update strategy for server ${serverId}, village ${villageId}`);
        
        try {
            const strategy = await this.strategiesService.update(serverId, villageId, updateDto);
            this.logger.log(`Successfully updated strategy for server ${serverId}, village ${villageId}`);
            return strategy;
        } catch (error) {
            this.logger.error(`Failed to update strategy for server ${serverId}, village ${villageId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Delete(':serverId/:villageId')
    @HttpCode(HttpStatus.OK)
    @DeleteMiniAttackStrategyDecorator()
    async deleteStrategy(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageId') villageId: string
    ): Promise<{ message: string }> {
        this.logger.log(`Request to delete strategy for server ${serverId}, village ${villageId}`);
        
        try {
            await this.strategiesService.delete(serverId, villageId);
            this.logger.log(`Successfully deleted strategy for server ${serverId}, village ${villageId}`);
            return { message: 'Strategy deleted successfully' };
        } catch (error) {
            this.logger.error(`Failed to delete strategy for server ${serverId}, village ${villageId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Post(':serverId/:villageId/calculate')
    @HttpCode(HttpStatus.OK)
    @CalculateMaxAttacksDecorator()
    async calculateMaxAttacks(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageId') villageId: string,
        @Body() calculateDto: CalculateAttacksRequestDto
    ): Promise<CalculateAttacksResponseDto> {
        this.logger.log(`Request to calculate max attacks for server ${serverId}, village ${villageId}`);
        
        try {
            const result = await this.strategiesService.calculateMaxAttacks(serverId, villageId, calculateDto);
            this.logger.log(`Successfully calculated max attacks for server ${serverId}, village ${villageId}: ${result.maxAttacks}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to calculate max attacks for server ${serverId}, village ${villageId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get(':serverId/:villageId/active-units')
    @HttpCode(HttpStatus.OK)
    @GetActiveUnitsDecorator()
    async getActiveUnits(
        @Param('serverId', ParseIntPipe) serverId: number,
        @Param('villageId') villageId: string
    ): Promise<Record<string, number>> {
        this.logger.log(`Request to get active units for server ${serverId}, village ${villageId}`);
        
        try {
            const activeUnits = await this.strategiesService.getActiveUnits(serverId, villageId);
            this.logger.log(`Successfully retrieved active units for server ${serverId}, village ${villageId}`);
            return activeUnits;
        } catch (error) {
            this.logger.error(`Failed to get active units for server ${serverId}, village ${villageId}: ${error.message}`, error.stack);
            throw error;
        }
    }
} 