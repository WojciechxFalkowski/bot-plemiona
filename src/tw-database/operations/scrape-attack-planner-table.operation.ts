import { Page } from 'playwright';

export interface ScrapeAttackPlannerTableDependencies {
    page: Page;
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

export interface ScrapedTableData {
    columns: string[];
    rows: Record<string, string>[];
    rowCount: number;
}

/**
 * Attempts to scrape table data from TWDatabase Attack Planner page.
 * Tries multiple table structures: standard HTML table, role="grid", Radzen/Blazor tables.
 *
 * @param deps - Page and logger
 * @returns Scraped columns and rows, or empty result if no table found
 */
export async function scrapeAttackPlannerTableOperation(
    deps: ScrapeAttackPlannerTableDependencies
): Promise<ScrapedTableData> {
    const { page, logger } = deps;

    // Wait for potential table/grid to appear (data might load via AJAX)
    await page.waitForTimeout(2000);

    // Try standard HTML table first
    const tableLocator = page.locator('table').first();
    const tableCount = await page.locator('table').count();
    if (tableCount === 0) {
        logger.warn('No tables found on page - trying role=grid');
    }

    let columns: string[] = [];
    let rows: Record<string, string>[] = [];

    // Strategy 1: Standard HTML table with thead/tbody
    const htmlTable = page.locator('table').first();
    if (await htmlTable.isVisible().catch(() => false)) {
        const result = await extractFromHtmlTable(htmlTable);
        if (result.columns.length > 0 || result.rows.length > 0) {
            columns = result.columns;
            rows = result.rows;
            logger.log(`Scraped HTML table: ${columns.length} columns, ${rows.length} rows`);
        }
    }

    // Strategy 2: If HTML table empty, try role="grid" (Blazor/Radzen)
    if (columns.length === 0 && rows.length === 0) {
        const gridLocator = page.locator('[role="grid"]').first();
        if (await gridLocator.isVisible().catch(() => false)) {
            const result = await extractFromGrid(gridLocator);
            if (result.columns.length > 0 || result.rows.length > 0) {
                columns = result.columns;
                rows = result.rows;
                logger.log(`Scraped grid: ${columns.length} columns, ${rows.length} rows`);
            }
        }
    }

    // Strategy 3: Try .table or table with tbody (some frameworks)
    if (columns.length === 0 && rows.length === 0) {
        const anyTable = page.locator('table, .table, [class*="table"]').first();
        if (await anyTable.isVisible().catch(() => false)) {
            const result = await extractFromHtmlTable(anyTable);
            if (result.columns.length > 0 || result.rows.length > 0) {
                columns = result.columns;
                rows = result.rows;
                logger.log(`Scraped generic table: ${columns.length} columns, ${rows.length} rows`);
            }
        }
    }

    if (columns.length === 0 && rows.length === 0) {
        logger.warn('Could not find or scrape any table on Attack Planner page');
    }

    return {
        columns,
        rows,
        rowCount: rows.length
    };
}

/**
 * Extracts data from standard HTML table (thead + tbody)
 */
async function extractFromHtmlTable(
    tableLocator: ReturnType<Page['locator']>
): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
    const columns: string[] = [];
    const rows: Record<string, string>[] = [];

    // Get header row from thead or first tbody row
    let headerRow = tableLocator.locator('thead tr').first();
    if ((await tableLocator.locator('thead tr').count()) === 0) {
        headerRow = tableLocator.locator('tbody tr').first();
    }

    const headerCells = headerRow.locator('th, td');
    const headerCount = await headerCells.count();
    for (let i = 0; i < headerCount; i++) {
        const text = await headerCells.nth(i).innerText().catch(() => '');
        columns.push(text.trim() || `col_${i}`);
    }

    // Get data rows (skip first row if it was used as header and was in tbody)
    const dataRowsLocator = tableLocator.locator('tbody tr');
    const rowCount = await dataRowsLocator.count();
    const startRow = (await tableLocator.locator('thead tr').count()) > 0 ? 0 : 1;

    for (let r = startRow; r < rowCount; r++) {
        const rowLocator = dataRowsLocator.nth(r);
        const cells = rowLocator.locator('td, th');
        const cellCount = await cells.count();
        const rowData: Record<string, string> = {};
        for (let c = 0; c < cellCount && c < columns.length; c++) {
            const colName = columns[c] ?? `col_${c}`;
            const cellLocator = cells.nth(c);
            rowData[colName] = await extractCellValue(cellLocator, colName);
        }
        if (Object.keys(rowData).length > 0) {
            rows.push(rowData);
        }
    }

    return { columns, rows };
}

/**
 * For AKCJA column: extracts href from link; otherwise extracts innerText
 */
async function extractCellValue(
    cellLocator: ReturnType<Page['locator']>,
    colName: string
): Promise<string> {
    if (colName === 'AKCJA') {
        const link = cellLocator.locator('a[href]').first();
        const href = await link.getAttribute('href').catch(() => null);
        if (href && href.trim()) {
            return href.trim();
        }
    }
    return (await cellLocator.innerText().catch(() => '')).trim();
}

/**
 * Extracts data from ARIA grid (role="grid")
 */
async function extractFromGrid(
    gridLocator: ReturnType<Page['locator']>
): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
    const columns: string[] = [];
    const rows: Record<string, string>[] = [];

    const gridRows = gridLocator.locator('[role="row"]');
    const rowCount = await gridRows.count();
    if (rowCount === 0) return { columns, rows };

    // First row is usually header
    const headerCells = gridRows.first().locator('[role="columnheader"], [role="gridcell"]');
    const headerCount = await headerCells.count();
    for (let i = 0; i < headerCount; i++) {
        const text = await headerCells.nth(i).innerText().catch(() => '');
        columns.push(text.trim() || `col_${i}`);
    }

    for (let r = 1; r < rowCount; r++) {
        const cells = gridRows.nth(r).locator('[role="gridcell"]');
        const cellCount = await cells.count();
        const rowData: Record<string, string> = {};
        for (let c = 0; c < cellCount && c < columns.length; c++) {
            const colName = columns[c] ?? `col_${c}`;
            const cellLocator = cells.nth(c);
            rowData[colName] = await extractCellValue(cellLocator, colName);
        }
        if (Object.keys(rowData).length > 0) {
            rows.push(rowData);
        }
    }

    return { columns, rows };
}
