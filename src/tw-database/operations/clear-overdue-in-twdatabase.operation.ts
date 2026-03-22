import { Page } from 'playwright';
import { FilteredAttackRow } from './filter-attacks-to-send.operation';

export interface ClearOverdueInTwDatabaseDependencies {
    page: Page;
    tableData: { rows: Record<string, string>[] };
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

/**
 * Parses a date string like "2024-03-22 10:00:00" or "22.03.2024 10:00:00" into a Date object.
 */
function parseTwDatabaseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    let cleanDate = dateStr.trim();
    
    // Check DD.MM.YYYY HH:mm:ss or DD-MM-YYYY HH:mm:ss format
    const dotMatch = cleanDate.match(/^(\d{2})[\.-](\d{2})[\.-](\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (dotMatch) {
        const [, day, month, year, hours, minutes, seconds] = dotMatch;
        return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds ?? '00'}`);
    }

    // Attempt default JS parse
    const parsed = new Date(cleanDate);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }
    return null;
}

const DELETE_BUTTON_SELECTOR = 'button[name="action"][value="delete"]'; // Adjust according to TW Database form

async function checkRowCheckbox(rowLocator: ReturnType<Page['locator']>): Promise<boolean> {
    const checkbox = rowLocator.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 500 }).catch(() => false)) {
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (!isChecked) await checkbox.click();
        return true;
    }
    return false;
}

/**
 * Finds attacks where "DATA WYJŚCIA OD" is more than 24 hours in the past, marks their checkboxes, and clicks delete.
 */
export async function clearOverdueInTwDatabaseOperation(
    deps: ClearOverdueInTwDatabaseDependencies
): Promise<number> {
    const { page, tableData, logger } = deps;
    const nowTime = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Find indices of rows to delete. We match by index since `tableData.rows` matches scraping order.
    const indicesToDelete: number[] = [];

    for (let i = 0; i < tableData.rows.length; i++) {
        const row = tableData.rows[i];
        const dataWyjsciaOd = row['DATA WYJŚCIA OD'];
        if (!dataWyjsciaOd) continue;

        const dateObj = parseTwDatabaseDate(dataWyjsciaOd);
        if (dateObj) {
            const ageMs = nowTime - dateObj.getTime();
            if (ageMs > ONE_DAY_MS) {
                indicesToDelete.push(i);
            }
        }
    }

    if (indicesToDelete.length === 0) {
        logger.log('Brak spóźnionych rekordów (>1 dzień) do usunięcia z TW Database');
        return 0;
    }

    logger.log(`Znaleziono ${indicesToDelete.length} starych rekordów do usunięcia. Zaznaczam...`);

    let checkedCount = 0;

    // We must interact with the page rows in the exact order parsed
    const htmlTable = page.locator('table').first();
    if (await htmlTable.isVisible({ timeout: 2000 }).catch(() => false)) {
        const hasThead = (await htmlTable.locator('thead tr').count()) > 0;
        const startRow = hasThead ? 0 : 1;
        const dataRows = htmlTable.locator('tbody tr');

        for (const i of indicesToDelete) {
            const r = startRow + i;
            const rowLocator = dataRows.nth(r);
            if (await checkRowCheckbox(rowLocator)) {
                checkedCount++;
            }
        }
    } else {
        const grid = page.locator('[role="grid"]').first();
        if (await grid.isVisible({ timeout: 2000 }).catch(() => false)) {
            const gridRows = grid.locator('[role="row"]');
            const rowCount = await gridRows.count();
            if (rowCount >= 2) {
                // start from row 1 (header is 0)
                for (const i of indicesToDelete) {
                    const rowLocator = gridRows.nth(i + 1);
                    if (await checkRowCheckbox(rowLocator)) {
                        checkedCount++;
                    }
                }
            }
        } else {
            logger.warn('No table or grid found for clearing overdue attacks');
            return 0;
        }
    }

    if (checkedCount === 0) {
        logger.log('Nie udało się zaznaczyć żadnych rekordów');
        return 0;
    }

    // Try to click the "Usuń zaznaczone" button
    // The button might be `<button name="action" value="delete">` or just visible text "Usuń zaznaczone"
    const deleteBtn = page.locator('button[name="action"][value="delete"], button:has-text("Usuń zaznaczone"), button:has-text("Kosz")').first();

    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        logger.log('Clicked "Usuń zaznaczone"');
        await page.waitForTimeout(2000);
    } else {
        logger.warn('Button "Usuń zaznaczone" not found');
        return 0;
    }

    // We need to mutate the tableData.rows to drop the deleted items, so filter doesn't process them
    // Go backwards so splices don't shift indices
    for (let i = indicesToDelete.length - 1; i >= 0; i--) {
        tableData.rows.splice(indicesToDelete[i], 1);
    }

    return checkedCount;
}
