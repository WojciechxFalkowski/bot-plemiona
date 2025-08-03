import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ArmyTrainingService } from './army-training.service';

@Controller('army-training')
export class ArmyTrainingController {
  constructor(private readonly armyTrainingService: ArmyTrainingService) {
  }

  @Get('get-army-data')
  async getArmyData(@Query('villageId') villageId: string, @Query('serverId') serverId: number) {
    if (!villageId) {
      throw new BadRequestException('Village ID is required');
    }
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    return this.armyTrainingService.getArmyData(villageId, serverId);
  }

  @Get('get-units-in-production')
  async getUnitsInProduction(@Query('villageId') villageId: string, @Query('serverId') serverId: number) {
    if (!villageId) {
      throw new BadRequestException('Village ID is required');
    }
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }
    return this.armyTrainingService.getUnitsInProduction(villageId, serverId);
  }

  @Get('start-training-light')
  async startTrainingLight(@Query('villageId') villageId: string, @Query('serverId') serverId: number) {
    if (!villageId) {
      throw new BadRequestException('Village ID is required');
    }
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }
    return this.armyTrainingService.startTrainingLight(villageId, serverId);
  }
}
