import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Page, Browser } from 'playwright';
import { BuildingQueueItem, BuildingQueueManager } from '@/models/tribal-wars/building-queue-manager';
import { VillagesCrawlerService } from '@/villages-crawler/villages-crawler.service';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';

@Injectable()
export class BuildingCrawlerService {
  private readonly logger = new Logger(BuildingCrawlerService.name);
  private browser: Browser | null = null;
  private page: Page | null = null;
  private queueManager: BuildingQueueManager | null = null;

  constructor(
    private readonly villagesCrawlerService: VillagesCrawlerService
  ) { }

  // Game credentials from environment variables
  private readonly credentials: PlemionaCredentials;
  // Example queue - make it non-readonly so it can be modified
  private exampleQueue: BuildingQueueItem[] = [];
  /**
 * Add a building to the queue
 * @param buildingId - ID of the building
 * @param level - Target level
 * @param priority - Priority (lower = higher priority)
 */
  addToQueue(buildingId: string, level: number, priority: number): void {
    if (this.queueManager) {
      this.queueManager.addToQueue(buildingId, level, priority);
      this.logger.log(`Added building ${buildingId} level ${level} to queue with priority ${priority}`);
    } else {
      // Add to example queue
      const existingIndex = this.exampleQueue.findIndex(
        item => item.buildingId === buildingId && item.level === level
      );

      if (existingIndex >= 0) {
        this.exampleQueue[existingIndex].priority = priority;
      } else {
        this.exampleQueue.push({ buildingId, level, priority });
      }

      // Sort by priority
      this.exampleQueue.sort((a, b) => a.priority - b.priority);
      this.logger.log(`Added building ${buildingId} level ${level} to stored queue with priority ${priority}`);
    }
  }

  // public async addBuildingToQueue(buildingId: string, level: number, priority: number, village: string): Promise<{
  //   success: boolean;
  //   message: string;
  //   village: {
  //     id: string;
  //     name: string;
  //     coordinates: string;
  //   };
  // }> {

  //   // Get basic village information to check if village exists
  //   const villages = await this.villagesCrawlerService.getOverviewVillageInformation({
  //     headless: true,
  //     timeoutPerPage: 15000
  //   });

  //   if (!villages || villages.length === 0) {
  //     throw new HttpException(
  //       'Could not retrieve village information. Please check if bot can login.',
  //       HttpStatus.INTERNAL_SERVER_ERROR
  //     );
  //   }

  //   // Find village by ID or name
  //   const targetVillage = villages.find(v =>
  //     v.id === village || v.name === village
  //   );

  //   if (!targetVillage) {
  //     console.log(`❌ Village "${village}" not found!`);
  //     console.log(`Available villages:`);
  //     villages.forEach(v => {
  //       console.log(`  - ID: ${v.id}, Name: "${v.name}", Coordinates: ${v.coordinates}`);
  //     });

  //     throw new HttpException(
  //       `Village "${village}" not found. Available villages: ${villages.map(v => `${v.name} (${v.id})`).join(', ')}`,
  //       HttpStatus.NOT_FOUND
  //     );
  //   }

  //   console.log(`✅ Village found: "${targetVillage.name}" (ID: ${targetVillage.id}) at ${targetVillage.coordinates}`);
  //   console.log(`Village details:`);
  //   console.log(`  - Points: ${targetVillage.points}`);
  //   console.log(`  - Resources: Wood: ${targetVillage.resources.wood}, Clay: ${targetVillage.resources.clay}, Iron: ${targetVillage.resources.iron}`);
  //   console.log(`  - Population: ${targetVillage.population.current}/${targetVillage.population.max}`);
  //   console.log(`  - Storage: ${targetVillage.storage}`);

  //   // Check if village can build this building (placeholder logic - will be implemented later)
  //   const canBuild = await this.checkIfVillageCanBuild(targetVillage, buildingId, level);

  //   if (canBuild.canBuild) {
  //     console.log(`✅ Village "${targetVillage.name}" CAN build ${buildingId} level ${level}`);
  //     console.log(`Reason: ${canBuild.reason}`);

  //     // Add to queue (for now we'll add with village ID)
  //     this.addToQueue(buildingId, level, priority);

  //     return {
  //       success: true,
  //       message: `Building ${buildingId} (level ${level}) added to queue for village "${targetVillage.name}"`,
  //       village: {
  //         id: targetVillage.id,
  //         name: targetVillage.name,
  //         coordinates: targetVillage.coordinates
  //       }
  //     };
  //   } else {
  //     console.log(`❌ Village "${targetVillage.name}" CANNOT build ${buildingId} level ${level}`);
  //     console.log(`Reason: ${canBuild.reason}`);

  //     throw new HttpException(
  //       `Village "${targetVillage.name}" cannot build ${buildingId} level ${level}. Reason: ${canBuild.reason}`,
  //       HttpStatus.BAD_REQUEST
  //     );
  //   }

  // } catch(error) {
  //   if (error instanceof HttpException) {
  //     throw error;
  //   }

  //   console.error('Error in addBuildingToQueue:', error);
  //   throw new HttpException(
  //     `Failed to add building to queue: ${error.message}`,
  //     HttpStatus.INTERNAL_SERVER_ERROR
  //   );
  // }

  /**
   * Placeholder method to check if village can build a specific building
   * This will be implemented later with proper building requirements logic
   */
  private async checkIfVillageCanBuild(village: any, buildingId: string, level: number): Promise<{
    canBuild: boolean;
    reason: string;
  }> {
    // TODO: Implement proper building requirements checking
    // For now, just placeholder logic

    // Basic checks that can be done with current village data
    if (village.population.current >= village.population.max) {
      return {
        canBuild: false,
        reason: 'Village population is at maximum capacity'
      };
    }

    // Check if village has some resources (very basic check)
    const totalResources = village.resources.wood + village.resources.clay + village.resources.iron;
    if (totalResources < 1000) { // Arbitrary threshold
      return {
        canBuild: false,
        reason: 'Village has insufficient resources (less than 1000 total)'
      };
    }

    // For now, assume village can build if basic checks pass
    return {
      canBuild: true,
      reason: 'Basic checks passed. Detailed building requirements checking will be implemented later.'
    };
  }



  // create(createBuildingCrawlerDto: CreateBuildingCrawlerDto) {
  //   return 'This action adds a new buildingCrawler';
  // }

  // findAll() {
  //   return `This action returns all buildingCrawler`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} buildingCrawler`;
  // }

  // update(id: number, updateBuildingCrawlerDto: UpdateBuildingCrawlerDto) {
  //   return `This action updates a #${id} buildingCrawler`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} buildingCrawler`;
  // }
}
