import { Page } from 'playwright';

/**
 * Base class for Tribal Wars pages
 */
export class TribalWarsPage {
  readonly page: Page;
  readonly baseUrl: string;

  constructor(page: Page, world: string = '216') {
    this.page = page;
    this.baseUrl = `https://pl${world}.plemiona.pl`;
  }

  /**
   * Navigate to the login page
   */
  async navigateToLogin(): Promise<void> {
    await this.page.goto(this.baseUrl);
  }

  /**
   * Navigate to a specific village
   * @param villageId - ID of the village
   */
  async navigateToVillage(villageId: string): Promise<void> {
    await this.page.goto(`${this.baseUrl}/game.php?village=${villageId}`);
  }

  /**
   * Navigate to a specific screen in a village
   * @param villageId - ID of the village
   * @param screen - Screen name (main, barracks, etc.)
   */
  async navigateToScreen(villageId: string, screen: string): Promise<void> {
    await this.page.goto(`${this.baseUrl}/game.php?village=${villageId}&screen=${screen}`);
  }
} 