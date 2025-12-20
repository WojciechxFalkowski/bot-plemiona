import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ScheduledAttacksService } from './scheduled-attacks.service';
import { ImportAttackPlanDto } from './dto/import-attack-plan.dto';
import { CreateScheduledAttackDto } from './dto/create-scheduled-attack.dto';
import { UpdateScheduledAttackDto } from './dto/update-scheduled-attack.dto';
import { ScheduledAttackResponseDto } from './dto/scheduled-attack-response.dto';
import { ScheduledAttackEntity } from './entities/scheduled-attack.entity';

@ApiTags('Scheduled Attacks')
@Controller('scheduled-attacks')
export class ScheduledAttacksController {
  private readonly logger = new Logger(ScheduledAttacksController.name);

  constructor(private readonly scheduledAttacksService: ScheduledAttacksService) {}

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import attack plan from raw text' })
  @ApiResponse({ status: 200, description: 'Attacks imported successfully', type: [ScheduledAttackResponseDto] })
  @ApiResponse({ status: 400, description: 'Bad request - no valid attacks found' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  public async importAttackPlan(@Body() dto: ImportAttackPlanDto): Promise<ScheduledAttackResponseDto[]> {
    this.logger.log(`Importing scheduled attacks plan for server ${dto.serverId}`);
    const entities = await this.scheduledAttacksService.importAndSave(dto.rawPlan, dto.serverId);
    return entities.map((entity) => this.mapEntityToResponseDto(entity));
  }

  @Get()
  @ApiOperation({ summary: 'Get all scheduled attacks' })
  @ApiQuery({ name: 'serverId', required: false, type: Number, description: 'Filter by server ID' })
  @ApiResponse({ status: 200, description: 'List of scheduled attacks', type: [ScheduledAttackResponseDto] })
  public async findAll(@Query('serverId') serverId?: number): Promise<ScheduledAttackResponseDto[]> {
    if (serverId) {
      const entities = await this.scheduledAttacksService.findByServer(serverId);
      return entities.map((entity) => this.mapEntityToResponseDto(entity));
    }
    const entities = await this.scheduledAttacksService.findAll();
    return entities.map((entity) => this.mapEntityToResponseDto(entity));
  }

  @Get('server/:serverId')
  @ApiOperation({ summary: 'Get all scheduled attacks for a server' })
  @ApiParam({ name: 'serverId', type: Number, description: 'Server ID' })
  @ApiResponse({ status: 200, description: 'List of scheduled attacks for server', type: [ScheduledAttackResponseDto] })
  @ApiResponse({ status: 404, description: 'Server not found' })
  public async findByServer(@Param('serverId', ParseIntPipe) serverId: number): Promise<ScheduledAttackResponseDto[]> {
    const entities = await this.scheduledAttacksService.findByServer(serverId);
    return entities.map((entity) => this.mapEntityToResponseDto(entity));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a scheduled attack by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Scheduled attack ID' })
  @ApiResponse({ status: 200, description: 'Scheduled attack found', type: ScheduledAttackResponseDto })
  @ApiResponse({ status: 404, description: 'Scheduled attack not found' })
  public async findById(@Param('id', ParseIntPipe) id: number): Promise<ScheduledAttackResponseDto> {
    const entity = await this.scheduledAttacksService.findById(id);
    return this.mapEntityToResponseDto(entity);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new scheduled attack' })
  @ApiResponse({ status: 201, description: 'Scheduled attack created successfully', type: ScheduledAttackResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  public async create(@Body() createDto: CreateScheduledAttackDto): Promise<ScheduledAttackResponseDto> {
    const entity = await this.scheduledAttacksService.create(createDto);
    return this.mapEntityToResponseDto(entity);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a scheduled attack' })
  @ApiParam({ name: 'id', type: Number, description: 'Scheduled attack ID' })
  @ApiResponse({ status: 200, description: 'Scheduled attack updated successfully', type: ScheduledAttackResponseDto })
  @ApiResponse({ status: 404, description: 'Scheduled attack not found' })
  public async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateScheduledAttackDto): Promise<ScheduledAttackResponseDto> {
    const entity = await this.scheduledAttacksService.update(id, updateDto);
    return this.mapEntityToResponseDto(entity);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a scheduled attack' })
  @ApiParam({ name: 'id', type: Number, description: 'Scheduled attack ID' })
  @ApiResponse({ status: 200, description: 'Scheduled attack deleted successfully' })
  @ApiResponse({ status: 404, description: 'Scheduled attack not found' })
  public async delete(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.scheduledAttacksService.delete(id);
    return { message: 'Scheduled attack deleted successfully' };
  }

  private mapEntityToResponseDto(entity: ScheduledAttackEntity): ScheduledAttackResponseDto {
    return {
      id: entity.id,
      serverId: entity.serverId,
      villageId: entity.villageId,
      targetId: entity.targetId,
      sourceCoordinates: entity.sourceCoordinates,
      targetCoordinates: entity.targetCoordinates,
      attackUrl: entity.attackUrl,
      attackType: entity.attackType,
      sendTimeFrom: entity.sendTimeFrom,
      sendTimeTo: entity.sendTimeTo,
      status: entity.status,
      description: entity.description,
      metadata: entity.metadata,
      executedAt: entity.executedAt,
      errorMessage: entity.errorMessage,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
