import { Controller, Get, Post, Body, Param, Put, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CreateBarbarianVillageDto, CreateBarbarianVillageFromUrlDto, UpdateBarbarianVillageDto } from './dto';
import { BarbarianVillagesService } from './barbarian-villages.service';

@ApiTags('Barbarian Villages')
@Controller('barbarian-villages')
export class BarbarianVillagesController {
  constructor(
    private readonly barbarianVillagesService: BarbarianVillagesService
  ) { }

  @Get(':serverId')
  @ApiOperation({
    summary: 'Get all barbarian villages for a server',
    description: 'Retrieves all barbarian villages for a specific server'
  })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    type: 'number',
    example: 217
  })
  @ApiResponse({
    status: 200,
    description: 'Barbarian villages retrieved successfully'
  })
  async findAll(@Param('serverId', ParseIntPipe) serverId: number) {
    return await this.barbarianVillagesService.findAll(serverId);
  }

  @Get(':serverId/attackable')
  @ApiOperation({
    summary: 'Get attackable barbarian villages',
    description: 'Retrieves all barbarian villages that can be attacked for a specific server'
  })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    type: 'number',
    example: 217
  })
  async findAttackable(@Param('serverId', ParseIntPipe) serverId: number, @Param('villageId') villageId: string) {
    return await this.barbarianVillagesService.findAttackableVillages(serverId, villageId);
  }

  @Get(':serverId/:target')
  @ApiOperation({
    summary: 'Get barbarian village by target',
    description: 'Retrieves a specific barbarian village by its target ID for a specific server'
  })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    type: 'number',
    example: 217
  })
  @ApiParam({
    name: 'target',
    description: 'Village target ID',
    type: 'string',
    example: '1101'
  })
  async findOne(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('target') target: string
  ) {
    return await this.barbarianVillagesService.findOne(serverId, target);
  }

  @Post(':serverId')
  @ApiOperation({
    summary: 'Create barbarian village',
    description: 'Creates a new barbarian village for a specific server'
  })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    type: 'number',
    example: 217
  })
  async create(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Body() createBarbarianVillageDto: CreateBarbarianVillageDto
  ) {
    return await this.barbarianVillagesService.create(serverId, createBarbarianVillageDto);
  }

  @Post(':serverId/from-url')
  @ApiOperation({
    summary: 'Create barbarian village from URL',
    description: 'Creates a barbarian village from a game URL for a specific server'
  })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    type: 'number',
    example: 217
  })
  async createFromUrl(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Body() createFromUrlDto: CreateBarbarianVillageFromUrlDto
  ) {
    return await this.barbarianVillagesService.createFromUrl(serverId, createFromUrlDto);
  }

  @Put(':serverId/:target')
  @ApiOperation({
    summary: 'Update barbarian village',
    description: 'Updates a specific barbarian village for a specific server'
  })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    type: 'number',
    example: 217
  })
  @ApiParam({
    name: 'target',
    description: 'Village target ID',
    type: 'string',
    example: '1101'
  })
  async update(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('target') target: string,
    @Body() updateBarbarianVillageDto: UpdateBarbarianVillageDto
  ) {
    return await this.barbarianVillagesService.update(serverId, target, updateBarbarianVillageDto);
  }

  @Put(':serverId/:target/toggle-attack')
  @ApiOperation({
    summary: 'Toggle canAttack flag',
    description: 'Toggles the canAttack flag for a barbarian village'
  })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    type: 'number',
    example: 217
  })
  @ApiParam({
    name: 'target',
    description: 'Village target ID',
    type: 'string',
    example: '1101'
  })
  async toggleCanAttack(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('target') target: string
  ) {
    return await this.barbarianVillagesService.toggleCanAttack(serverId, target);
  }

  @Delete(':serverId/:target')
  @ApiOperation({
    summary: 'Delete barbarian village',
    description: 'Deletes a specific barbarian village for a specific server'
  })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    type: 'number',
    example: 217
  })
  @ApiParam({
    name: 'target',
    description: 'Village target ID',
    type: 'string',
    example: '1101'
  })
  async remove(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Param('target') target: string
  ) {
    await this.barbarianVillagesService.remove(serverId, target);
    return { message: `Barbarian village ${target} deleted successfully from server ${serverId}` };
  }

  @Post(':serverId/execute-mini-attacks-for-all-villages-in-server')
  @ApiOperation({
    summary: 'Execute mini attacks for all villages in server',
    description: 'Executes mini attacks on all barbarian villages for a specific server'
  })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    type: 'number',
    example: 217
  })
  async executeMiniAttacks(@Param('serverId', ParseIntPipe) serverId: number) {
    const result = await this.barbarianVillagesService.executeMiniAttacksForAllVillagesInServer(serverId);
    return {
      message: `Mini attacks executed for server ${serverId}`,
      results: result
    };
  }

  @Post(':serverId/refresh')
  @ApiOperation({
    summary: 'Refresh barbarian villages',
    description: 'Refreshes barbarian villages data from the game for a specific server'
  })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    type: 'number',
    example: 217
  })
  async refresh(@Param('serverId', ParseIntPipe) serverId: number) {
    const result = await this.barbarianVillagesService.refreshBarbarianVillages(serverId);
    return {
      message: `Barbarian villages refreshed for server ${serverId}`,
      result
    };
  }

  @Get(':serverId/stats')
  @ApiOperation({
    summary: 'Get barbarian villages statistics',
    description: 'Retrieves statistics for barbarian villages on a specific server'
  })
  @ApiParam({
    name: 'serverId',
    description: 'Server ID',
    type: 'number',
    example: 217
  })
  async getStats(@Param('serverId', ParseIntPipe) serverId: number) {
    const [total, attackable] = await Promise.all([
      this.barbarianVillagesService.getCount(serverId),
      this.barbarianVillagesService.getAttackableCount(serverId)
    ]);

    return {
      total,
      attackable,
      nonAttackable: total - attackable
    };
  }
} 