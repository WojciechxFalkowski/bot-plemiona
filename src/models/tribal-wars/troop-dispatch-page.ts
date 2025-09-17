import { PlayerVillageAttackStrategyEntity } from "@/player-villages/entities/player-village-attack-strategy.entity";
import { Logger } from "@nestjs/common";
import { Page } from "playwright";

export const availableUnitSelectors: Record<string, string> = {
    spear: 'a[data-unit="spear"]',
    sword: 'a[data-unit="sword"]',
    axe: 'a[data-unit="axe"]',
    archer: 'a[data-unit="archer"]',
    light: 'a[data-unit="light"]',
    marcher: 'a[data-unit="marcher"]',
    heavy: 'a[data-unit="heavy"]',
    ram: 'a[data-unit="ram"]',
    catapult: 'a[data-unit="catapult"]',
    knight: 'a[data-unit="knight"]',
    snob: 'a[data-unit="snob"]',
    spy: 'a[data-unit="spy"]',
};

// Pure class
/**
 * This class is used to navigate to the troop dispatch page and fill the attack form with the strategy
 * and confirm the attack sequence
 */
export class TroopDispatchPage {
    private readonly logger = new Logger(TroopDispatchPage.name);
    private readonly page: Page;
    private readonly baseUrl: string;

    constructor(page: Page, serverCode: string) {
        this.page = page;
        this.baseUrl = `https://${serverCode}.plemiona.pl`;
    }

    private formatStrategyToString(strategy: PlayerVillageAttackStrategyEntity): string {
        const strategyUnits = Object.entries(strategy)
            .filter(([key, value]) => typeof value === 'number' && value > 0)
            .map(([unit, count]) => `${unit}: ${count}`)
            .join(', ');
        
        return strategyUnits || 'no units';
    }

    public async navigateToTroopDispatch(sourceVillageId: string, targetVillageId: string) {
        const attackUrl = `${this.baseUrl}/game.php?village=${sourceVillageId}&screen=place&target=${targetVillageId}`;
        this.logger.debug(`Attack URL: ${attackUrl}`);

        await this.page.goto(attackUrl);
    }

    // method to check strategy and fill attack form with proper units, some of the units may not exist in HTML
    public async fillAttackFormWithStrategy(strategy: PlayerVillageAttackStrategyEntity) {
        this.logger.log(`Filling attack form with strategy: ${this.formatStrategyToString(strategy)}`);
        for (const unit of Object.keys(availableUnitSelectors)) {
            try {
                if (strategy[unit] === 0) {
                    continue;
                }
                // Use first() to handle multiple elements
                const locator = this.page.locator(availableUnitSelectors[unit]).first();

                if (await locator.isVisible()) {
                    // For input fields, we need to find the corresponding input element
                    const inputSelector = `input[name="${unit}"]`;
                    const inputLocator = this.page.locator(inputSelector).first();

                    if (await inputLocator.isVisible()) {
                        await inputLocator.fill(strategy[unit].toString());
                        this.logger.log(`Filled ${unit}: ${strategy[unit]}`);
                    } else {
                        this.logger.warn(`Input field for ${unit} not found`);
                    }
                } else {
                    this.logger.warn(`Unit ${unit} selector not visible`);
                }
            } catch (error) {
                this.logger.warn(`Error handling unit ${unit}: ${error.message}`);
            }
        }
    }

    public async confirmAttackSequence() {
        this.logger.log('Clicking attack button...');
        await this.page.click('#target_attack', { timeout: 3000 });
        await this.page.waitForLoadState('networkidle', { timeout: 3000 });
        await this.page.waitForTimeout(1000);
        await this.page.click('#troop_confirm_submit', { timeout: 3000 });
        await this.page.waitForTimeout(1000);
        this.logger.log('Attack sequence completed successfully');
    }
}
