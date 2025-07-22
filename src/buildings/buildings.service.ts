import { Injectable, NotFoundException } from '@nestjs/common';
import { BUILDINGS, BuildingData } from './constants/buildings.constants';

@Injectable()
export class BuildingsService {
  /**
   * Get all available buildings in the game
   */
  getAllBuildings(): BuildingData[] {
    return [...BUILDINGS];
  }

  /**
   * Get a specific building by screen identifier
   */
  getBuildingByScreen(screen: string): BuildingData {
    const building = BUILDINGS.find((building) => building.screen === screen);
    
    if (!building) {
      throw new NotFoundException(`Building with screen '${screen}' not found`);
    }
    
    return building;
  }

  /**
   * Get list of all available screen identifiers
   */
  getAvailableScreens(): string[] {
    return BUILDINGS.map((building) => building.screen);
  }
} 