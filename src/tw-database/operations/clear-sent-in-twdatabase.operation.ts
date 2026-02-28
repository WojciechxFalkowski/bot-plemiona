import { Page } from 'playwright';
import { Repository } from 'typeorm';
import { TwDatabaseAttackEntity, TwDatabaseAttackStatus } from '../entities/tw-database-attack.entity';
import { computeAttackFingerprintOperation } from './compute-attack-fingerprint.operation';

export interface ClearSentInTwDatabaseDependencies {
    page: Page;
    attackRepo: Repository<TwDatabaseAttackEntity>;
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

async function extractCellText(cellLocator: ReturnType<Page['locator']>, colName: string): Promise<string> {
    if (colName === 'AKCJA') {
        const href = await cellLocator.locator('a[href]').first().getAttribute('href').catch(() => null);
        return (href ?? '').trim();
    }
    return (await cellLocator.innerText().catch(() => '')).trim();
}

async function checkRowCheckbox(rowLocator: ReturnType<Page['locator']>): Promise<boolean> {
    const checkbox = rowLocator.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 500 }).catch(() => false)) {
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (!isChecked) await checkbox.click();
        return true;
    }
    return false;
}

const MARK_EXECUTED_BUTTON_SELECTOR = 'button[name="action"][value="markExecuted"]';

/**
 * Finds sent attacks not yet cleared, checks their row checkboxes, clicks "Oznacz jako zrealizowane".
 * Run at start and end of visitAttackPlanner.
 */
export async function clearSentInTwDatabaseOperation(
    deps: ClearSentInTwDatabaseDependencies
): Promise<number> {
    const { page, attackRepo, logger } = deps;

    const toClear = await attackRepo.find({
        where: { status: TwDatabaseAttackStatus.SENT, clearedFromTwDatabase: false }
    });
    if (toClear.length === 0) {
        logger.log('No sent attacks to clear in TWDatabase');
        return 0;
    }

    const toClearSet = new Set(toClear.map(e => e.fingerprint));
    logger.log(`Clearing ${toClear.length} sent attacks in TWDatabase table`);

    const matchedFingerprints: string[] = [];

    const htmlTable = page.locator('table').first();
    if (await htmlTable.isVisible({ timeout: 2000 }).catch(() => false)) {
        const headerRow = htmlTable.locator('thead tr').first();
        const hasThead = (await htmlTable.locator('thead tr').count()) > 0;
        const columns: string[] = [];
        const headerCells = headerRow.locator('th, td');
        const headerCount = await headerCells.count();
        for (let i = 0; i < headerCount; i++) {
            columns.push((await headerCells.nth(i).innerText().catch(() => '')).trim() || `col_${i}`);
        }
        const dataRows = htmlTable.locator('tbody tr');
        const rowCount = await dataRows.count();
        const startRow = hasThead ? 0 : 1;

        for (let r = startRow; r < rowCount; r++) {
            const rowLocator = dataRows.nth(r);
            const cells = rowLocator.locator('td, th');
            const cellCount = await cells.count();
            const rowData: Record<string, string> = {};
            for (let c = 0; c < cellCount && c < columns.length; c++) {
                const colName = columns[c] ?? `col_${c}`;
                rowData[colName] = await extractCellText(cells.nth(c), colName);
            }
            const fingerprint = computeAttackFingerprintOperation(rowData);
            if (!toClearSet.has(fingerprint)) continue;

            const checked = await checkRowCheckbox(rowLocator);
            if (checked) {
                matchedFingerprints.push(fingerprint);
                logger.log(`Selected row: ${rowData['WIOSKA WYSYŁAJĄCA']} -> ${rowData['WIOSKA DOCELOWA']}`);
            } else {
                logger.warn(`No checkbox in row ${r}`);
            }
        }
    } else {
        const grid = page.locator('[role="grid"]').first();
        if (await grid.isVisible({ timeout: 2000 }).catch(() => false)) {
            const gridRows = grid.locator('[role="row"]');
            const rowCount = await gridRows.count();
            if (rowCount >= 2) {
                const headerCells = gridRows.nth(0).locator('[role="columnheader"], [role="gridcell"]');
                const columns: string[] = [];
                const headerCount = await headerCells.count();
                for (let i = 0; i < headerCount; i++) {
                    columns.push((await headerCells.nth(i).innerText().catch(() => '')).trim() || `col_${i}`);
                }
                for (let r = 1; r < rowCount; r++) {
                    const rowLocator = gridRows.nth(r);
                    const cells = rowLocator.locator('[role="gridcell"]');
                    const cellCount = await cells.count();
                    const rowData: Record<string, string> = {};
                    for (let c = 0; c < cellCount && c < columns.length; c++) {
                        const colName = columns[c] ?? `col_${c}`;
                        rowData[colName] = await extractCellText(cells.nth(c), colName);
                    }
                    const fingerprint = computeAttackFingerprintOperation(rowData);
                    if (!toClearSet.has(fingerprint)) continue;

                    const checked = await checkRowCheckbox(rowLocator);
                    if (checked) matchedFingerprints.push(fingerprint);
                }
            }
        } else {
            logger.warn('No table or grid found for clearing');
        }
    }

    if (matchedFingerprints.length === 0) {
        logger.log('No matching rows with checkboxes to clear');
        return 0;
    }

    const markButton = page.locator(MARK_EXECUTED_BUTTON_SELECTOR).first();
    if (await markButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await markButton.click();
        logger.log('Clicked "Oznacz jako zrealizowane"');
        await page.waitForTimeout(2000);
        for (const fp of matchedFingerprints) {
            const entity = toClear.find(e => e.fingerprint === fp);
            if (entity) {
                entity.clearedFromTwDatabase = true;
                await attackRepo.save(entity);
            }
        }
    } else {
        logger.warn('Button "Oznacz jako zrealizowane" not found');
        return 0;
    }

    logger.log(`Cleared ${matchedFingerprints.length}/${toClear.length} in TWDatabase`);
    return matchedFingerprints.length;
}
