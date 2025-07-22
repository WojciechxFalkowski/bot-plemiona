import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BuildingDto } from '../dto/building.dto';

export const GetBuildingByScreenDecorator = () =>
  applyDecorators(
    ApiTags('Buildings'),
    ApiOperation({
      summary: 'Get building by screen',
      description: 'Retrieves a specific building by its screen identifier',
    }),
    ApiParam({
      name: 'screen',
      description: 'Screen identifier of the building (e.g., main, barracks, stable)',
      example: 'main',
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved the building',
      type: BuildingDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Building with specified screen not found',
    }),
  ); 