import { Page } from 'playwright';
import { ScavengingUnit, unitInputNames, unitOrder } from '@/utils/scavenging.config';

/**
 * Playwright helpers for premium mass scavenging UI (screen=place&mode=scavenge_mass).
 */
export class ScavengeMassPage {
    private readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Opens mass scavenging for the given village context.
     */
    async navigate(serverCode: string, villageId: string): Promise<void> {
        const url = `https://${serverCode}.plemiona.pl/game.php?village=${villageId}&screen=place&mode=scavenge_mass`;
        await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
        await this.waitForScreen();
    }

    /**
     * Waits until mass scavenging root is visible.
     */
    async waitForScreen(): Promise<void> {
        await this.page.waitForSelector('#scavenge_mass_screen', { state: 'visible', timeout: 20_000 });
    }

    /**
     * Verifies that premium mass scavenging DOM is usable (tables, select-all row, send control).
     * Call after {@link navigate}; use result to log and abort before dispatch when not ok.
     */
    async validateMassScavengingUi(): Promise<
        { ok: true } | { ok: false; messageEn: string; messagePl: string }
    > {
        const root = this.page.locator('#scavenge_mass_screen');
        if ((await root.count()) === 0) {
            return {
                ok: false,
                messageEn: 'Mass scavenging: #scavenge_mass_screen not found in DOM.',
                messagePl: 'Zbieractwo masowe: brak kontenera ekranu (scavenge_mass).'
            };
        }
        const rootVisible = await root.first().isVisible().catch(() => false);
        if (!rootVisible) {
            return {
                ok: false,
                messageEn: 'Mass scavenging: #scavenge_mass_screen exists but is not visible.',
                messagePl: 'Zbieractwo masowe: ekran zbieractwa masowego nie jest widoczny (sesja, błąd strony?).'
            };
        }
        const candidateWidget = root.locator('table.candidate-squad-widget');
        if ((await candidateWidget.count()) === 0) {
            const premiumHint = this.page.locator('.premium_account_hint');
            const hintVisible = await premiumHint.first().isVisible().catch(() => false);
            const extraPl = hintVisible
                ? ' Widoczny komunikat o Koncie Premium — funkcja może być zablokowana.'
                : '';
            const extraEn = hintVisible ? ' Premium account hint is visible.' : '';
            return {
                ok: false,
                messageEn: `Mass scavenging: candidate squad table (.candidate-squad-widget) missing.${extraEn}`,
                messagePl: `Zbieractwo masowe: brak tabeli składu kandydata (candidate-squad-widget).${extraPl}`
            };
        }
        const massTable = root.locator('table.mass-scavenge-table');
        if ((await massTable.count()) === 0) {
            return {
                ok: false,
                messageEn: 'Mass scavenging: village list table (.mass-scavenge-table) missing.',
                messagePl: 'Zbieractwo masowe: brak tabeli wiosek / poziomów (mass-scavenge-table).'
            };
        }
        const selectAllRow = massTable.locator('tbody tr').filter({ hasText: 'Zaznacz wszystkie' });
        if ((await selectAllRow.count()) === 0) {
            return {
                ok: false,
                messageEn: 'Mass scavenging: row with "Zaznacz wszystkie" not found in mass table.',
                messagePl: 'Zbieractwo masowe: brak wiersza „Zaznacz wszystkie” w tabeli masowej.'
            };
        }
        const sendBtn = root.locator('a.btn-send');
        if ((await sendBtn.count()) === 0) {
            return {
                ok: false,
                messageEn: 'Mass scavenging: send control (a.btn-send) not found.',
                messagePl: 'Zbieractwo masowe: brak przycisku wysyłki (btn-send).'
            };
        }
        return { ok: true };
    }

    /**
     * Fills all unit inputs in the candidate squad widget (missing world-specific units are skipped).
     */
    async fillCandidateUnits(dispatch: Partial<Record<ScavengingUnit, number>>): Promise<void> {
        const table = this.page.locator('#scavenge_mass_screen table.candidate-squad-widget');
        if ((await table.count()) === 0) {
            throw new Error('Mass scavenging: candidate-squad-widget not found');
        }
        for (const unit of unitOrder) {
            const input = table.locator(`input[name="${unitInputNames[unit]}"]`);
            if ((await input.count()) === 0) {
                continue;
            }
            const count = Math.max(0, Math.floor(dispatch[unit] ?? 0));
            await input.first().fill(String(count));
        }
    }

    /**
     * Bulk-selects a scavenging level for all villages by clicking the "Zaznacz wszystkie" row
     * (first data row): td[1]..td[4] map to levels 1..4 (td[0] is the label cell).
     * Game UI uses this row instead of thead th.header-option for the same action.
     */
    async clickSelectAllRowOption(level: number): Promise<void> {
        if (level < 1 || level > 4) {
            throw new Error(`Invalid mass scavenging level: ${level}`);
        }
        const table = this.page.locator('#scavenge_mass_screen table.mass-scavenge-table');
        const selectAllRow = table.locator('tbody tr').filter({ hasText: 'Zaznacz wszystkie' }).first();
        const columnIndex = level + 1;
        const cell = selectAllRow.locator(`td:nth-child(${columnIndex})`);
        await cell.click({ timeout: 10_000 });
    }

    /**
     * Clicks send button for current mass scavenging batch.
     */
    async clickSend(): Promise<void> {
        const btn = this.page.locator('#scavenge_mass_screen a.btn-send');
        await btn.first().click({ timeout: 15_000 });
    }

    /**
     * Returns true if a "next page" pagination control exists.
     */
    async hasNextPage(): Promise<boolean> {
        return (await this.page.locator('a.paged-nav-item[rel="next"]').count()) > 0;
    }

    /**
     * Clicks next pagination link and waits for load.
     */
    async clickNextPage(): Promise<void> {
        const next = this.page.locator('a.paged-nav-item[rel="next"]').first();
        await next.click();
        await this.page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
        await this.waitForScreen();
    }
}
