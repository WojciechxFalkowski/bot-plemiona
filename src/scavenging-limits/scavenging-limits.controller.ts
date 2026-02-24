import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
import { ScavengingLimitsService } from './scavenging-limits.service';
import { CreateScavengingLimitDto } from './dto/create-scavenging-limit.dto';
import { UpdateScavengingLimitDto } from './dto/update-scavenging-limit.dto';
import { GlobalScavengingLimitDto } from './dto/global-scavenging-limit.dto';

@Controller('scavenging-limits')
export class ScavengingLimitsController {
    constructor(private readonly scavengingLimitsService: ScavengingLimitsService) {}

    @Get('global')
    findGlobalLimit(@Query('serverId') serverId: string) {
        if (!serverId) {
            throw new BadRequestException('serverId query parameter is required');
        }
        return this.scavengingLimitsService.findGlobalLimit(+serverId);
    }

    @Post('global')
    createOrUpdateGlobalLimit(
        @Query('serverId') serverId: string,
        @Body() body: GlobalScavengingLimitDto,
    ) {
        if (!serverId) {
            throw new BadRequestException('serverId query parameter is required');
        }
        return this.scavengingLimitsService.createOrUpdateGlobalLimit(+serverId, body);
    }

    @Delete('global')
    deleteGlobalLimit(@Query('serverId') serverId: string) {
        if (!serverId) {
            throw new BadRequestException('serverId query parameter is required');
        }
        return this.scavengingLimitsService.deleteGlobalLimit(+serverId);
    }

    @Post()
    create(@Body() createScavengingLimitDto: CreateScavengingLimitDto) {
        return this.scavengingLimitsService.create(createScavengingLimitDto);
    }

    @Get()
    findByServer(@Query('serverId') serverId: string) {
        if (!serverId) {
            throw new BadRequestException('serverId query parameter is required');
        }
        return this.scavengingLimitsService.findByServer(+serverId);
    }

    @Get('village')
    findByServerAndVillage(
        @Query('serverId') serverId: string,
        @Query('villageId') villageId: string
    ) {
        if (!serverId || !villageId) {
            throw new BadRequestException('Both serverId and villageId query parameters are required');
        }
        return this.scavengingLimitsService.findByServerAndVillage(+serverId, villageId);
    }

    @Post('village')
    createOrUpdate(
        @Query('serverId') serverId: string,
        @Query('villageId') villageId: string,
        @Body() limits: {
            maxSpearUnits?: number | null;
            maxSwordUnits?: number | null;
            maxAxeUnits?: number | null;
            maxArcherUnits?: number | null;
            maxLightUnits?: number | null;
            maxMarcherUnits?: number | null;
            maxHeavyUnits?: number | null;
        }
    ) {
        if (!serverId || !villageId) {
            throw new BadRequestException('Both serverId and villageId query parameters are required');
        }
        
        return this.scavengingLimitsService.createOrUpdate(+serverId, villageId, limits);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateScavengingLimitDto: UpdateScavengingLimitDto) {
        return this.scavengingLimitsService.update(+id, updateScavengingLimitDto);
    }

    @Delete('village')
    deleteByServerAndVillage(
        @Query('serverId') serverId: string,
        @Query('villageId') villageId: string
    ) {
        if (!serverId || !villageId) {
            throw new BadRequestException('Both serverId and villageId query parameters are required');
        }
        return this.scavengingLimitsService.delete(+serverId, villageId);
    }

    @Delete(':id')
    deleteById(@Param('id') id: string) {
        return this.scavengingLimitsService.deleteById(+id);
    }
}
