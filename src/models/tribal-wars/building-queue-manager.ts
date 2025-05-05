import { BuildingPage, BuildingInfo } from './building-page';
import { Page } from 'playwright';

/**
 * Building Queue Item Interface
 */
export interface BuildingQueueItem {
  buildingId: string;
  level: number;
  priority: number;
}

/**
 * Building Queue Manager
 * Manages the building queue for the Tribal Wars village
 */
export class BuildingQueueManager {
  private buildingPage: BuildingPage;
  private buildingQueue: BuildingQueueItem[] = [];
  private villageId: string;

  constructor(page: Page, villageId: string) {
    this.buildingPage = new BuildingPage(page);
    this.villageId = villageId;
  }

  /**
   * Initialize the manager
   * Navigates to the building page and initializes
   */
  async initialize(): Promise<void> {
    await this.buildingPage.navigateToBuildingScreen(this.villageId);
  }

  /**
   * Add a building to the construction queue
   * @param buildingId - ID of the building
   * @param targetLevel - Target level to build to
   * @param priority - Priority of construction (lower number = higher priority)
   */
  addToQueue(buildingId: string, targetLevel: number, priority: number): void {
    // Check if building is already in queue
    const existingIndex = this.buildingQueue.findIndex(
      item => item.buildingId === buildingId && item.level === targetLevel
    );

    if (existingIndex >= 0) {
      // Update priority if already in queue
      this.buildingQueue[existingIndex].priority = priority;
    } else {
      // Add new item to queue
      this.buildingQueue.push({
        buildingId,
        level: targetLevel,
        priority
      });
    }

    // Sort queue by priority
    this.sortQueue();
  }

  /**
   * Remove a building from the queue
   * @param buildingId - ID of the building
   * @param level - Target level
   */
  removeFromQueue(buildingId: string, level: number): void {
    this.buildingQueue = this.buildingQueue.filter(
      item => !(item.buildingId === buildingId && item.level === level)
    );
  }

  /**
   * Sort the queue by priority
   */
  private sortQueue(): void {
    this.buildingQueue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get all buildings and their information
   */
  async getAllBuildings(): Promise<BuildingInfo[]> {
    await this.initialize();
    return this.buildingPage.getAllBuildings();
  }

  /**
   * Process the building queue
   * Tries to build the next available building in the queue
   * @returns true if a building was successfully queued, false otherwise
   */
  async processQueue(): Promise<boolean> {
    // First, navigate to the building screen and get fresh data
    await this.initialize();

    // Check if queue is full
    if (await this.buildingPage.isQueueFull()) {
      console.log('Building queue is full, cannot build more buildings');
      return false;
    }

    // Get all buildings to check their current state
    const buildings = await this.buildingPage.getAllBuildings();

    // Process queue by priority
    for (const queueItem of this.buildingQueue) {
      const building = buildings.find(b => b.id === queueItem.buildingId);

      // Skip if building not found
      if (!building) {
        console.log(`Building ${queueItem.buildingId} not found, skipping`);
        continue;
      }

      // Skip if building is already at or beyond target level
      if (building.level >= queueItem.level) {
        console.log(`Building ${building.name} already at or beyond target level ${queueItem.level}, removing from queue`);
        this.removeFromQueue(queueItem.buildingId, queueItem.level);
        continue;
      }

      // Skip if building is already in queue
      if (building.inQueue) {
        console.log(`Building ${building.name} already in construction queue, removing from our queue`);
        this.removeFromQueue(queueItem.buildingId, queueItem.level);
        continue;
      }

      // Skip if building is not available (requirements not met)
      if (!building.available) {
        console.log(`Building ${building.name} not available yet, requirements not met`);
        continue;
      }

      // Try to build it
      console.log(`Attempting to build ${building.name} to level ${queueItem.level}`);
      const buildResult = await this.buildingPage.buildBuilding(queueItem.buildingId);

      if (buildResult.success) {
        console.log(buildResult.message);
        // Natychmiast usuwamy budynek z kolejki, ponieważ został pomyślnie dodany do kolejki w grze
        this.removeFromQueue(queueItem.buildingId, queueItem.level);
        console.log(`Removed ${building.name} level ${queueItem.level} from queue after successful build`);
        return true;
      } else {
        console.log(buildResult.message || `Failed to queue ${building.name} for construction`);
      }
    }

    console.log('No suitable buildings to construct found in queue');
    return false;
  }

  /**
   * Get a list of complete buildings to remove from the queue
   * @returns Array of buildings to remove from queue
   */
  async getCompletedBuildings(): Promise<BuildingQueueItem[]> {
    await this.initialize();
    const buildings = await this.buildingPage.getAllBuildings();
    const completed: BuildingQueueItem[] = [];

    for (const queueItem of this.buildingQueue) {
      const building = buildings.find(b => b.id === queueItem.buildingId);

      if (building && building.level >= queueItem.level) {
        completed.push(queueItem);
      }
    }

    return completed;
  }

  /**
   * Clean the queue by removing completed buildings
   */
  async cleanQueue(): Promise<void> {
    const completed = await this.getCompletedBuildings();

    for (const item of completed) {
      this.removeFromQueue(item.buildingId, item.level);
      console.log(`Removed completed building ${item.buildingId} level ${item.level} from queue`);
    }
  }

  /**
   * Get current queue
   */
  getQueue(): BuildingQueueItem[] {
    return [...this.buildingQueue];
  }

  /**
   * Set the entire queue (replaces existing queue)
   * @param queue - New queue to set
   */
  setQueue(queue: BuildingQueueItem[]): void {
    this.buildingQueue = [...queue];
    this.sortQueue();
  }
} 