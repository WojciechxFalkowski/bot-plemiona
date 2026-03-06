import { Page, Locator } from 'playwright';

export class AccountManagerTroopsPage {
    private readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Navigates to the Account Manager - Troops view.
     */
    async navigate(serverCode: string, firstVillageId: string): Promise<void> {
        const url = `https://${serverCode}.plemiona.pl/game.php?village=${firstVillageId}&screen=am_troops`;
        await this.page.goto(url, { waitUntil: 'networkidle' });

        // Wait to make sure the manager troops form is ready
        await this.page.waitForSelector('form[name="trooplate"]', { timeout: 10000 }).catch(() => {
            console.warn('Account Manager Troops form not found.');
        });
    }

    /**
     * Applies a given troops template to a specific array of village IDs.
     */
    async assignTemplateToVillages(templateName: string, villageIds: number[]): Promise<boolean> {
        if (!villageIds.length) {
            return false;
        }

        // 1. Uncheck "select_all" if it is checked to ensure a clean state
        const selectAllCheckbox = this.page.locator('#select_all');
        if (await selectAllCheckbox.count() > 0 && await selectAllCheckbox.isChecked()) {
            await selectAllCheckbox.uncheck();
        }

        // 2. Select the checkbox for each village
        let selectedCount = 0;
        for (const villageId of villageIds) {
            const checkbox = this.page.locator(`input[type="checkbox"].am_troops_edit[value="${villageId}"]`);
            if (await checkbox.count() > 0) {
                // Ensure it's in the DOM
                await checkbox.scrollIntoViewIfNeeded();
                await checkbox.check();
                selectedCount++;
            }
        }

        if (selectedCount === 0) {
            throw new Error(`No matching village checkboxes found for template: ${templateName}`);
        }

        // 3. Find the option in the select dropdown that exactly matches the template name
        // We look for an option that has the text of our templateName
        const option = this.page.locator(`#template_selection option`, { hasText: new RegExp(`^${templateName}$`, 'i') });
        if (await option.count() === 0) {
            throw new Error(`Template name "${templateName}" not found in the dropdown.`);
        }

        // The select element uses `onchange` to apply the values. Selecting the option will trigger it in normal browsers.
        // In Playwright, we select the value:
        const optionValue = await option.getAttribute('value');
        if (!optionValue) {
            return false;
        }

        await this.page.selectOption('#template_selection', optionValue);

        // 4. Click 'Zapisz' (Save)
        const saveButton = this.page.locator('input.btn[type="submit"][name="save"]').first();
        if (await saveButton.count() > 0) {
            await saveButton.click();
            // Wait for the page to reload or complete the action (it usually reloads in this game)
            await this.page.waitForLoadState('networkidle');
            return true;
        }

        return false;
    }
}
