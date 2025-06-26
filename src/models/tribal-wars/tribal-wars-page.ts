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
   * Login to Tribal Wars
   * @param username - User name
   * @param password - User password
   */
  async login(username: string, password: string): Promise<void> {
    await this.navigateToLogin();
    await this.page.fill('input[name="username"]', username);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('input[type="submit"]');
    
    // Wait for successful login by checking for village element
    await this.page.waitForSelector('#menu_row');
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