import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BuildingsResponseDto } from '../dto/buildings-response.dto';

export const GetAllBuildingsDecorator = () =>
  applyDecorators(
    ApiTags('Buildings'),
    ApiOperation({
      summary: 'Get all buildings',
      description: 'Retrieves a list of all available buildings in Tribal Wars with their properties',
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved all buildings',
      type: BuildingsResponseDto,
    }),
  ); 