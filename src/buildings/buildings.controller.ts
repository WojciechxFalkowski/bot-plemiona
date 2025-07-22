import { Controller, Get, Param } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingDto } from './dto/building.dto';
import { BuildingsResponseDto } from './dto/buildings-response.dto';
import { GetAllBuildingsDecorator } from './decorators/get-all-buildings.decorator';
import { GetBuildingByScreenDecorator } from './decorators/get-building-by-screen.decorator';

@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @GetAllBuildingsDecorator()
  getAllBuildings(): BuildingsResponseDto {
    const buildings = this.buildingsService.getAllBuildings();
    return { buildings };
  }

  @Get(':screen')
  @GetBuildingByScreenDecorator()
  getBuildingByScreen(@Param('screen') screen: string): BuildingDto {
    return this.buildingsService.getBuildingByScreen(screen);
  }
} 