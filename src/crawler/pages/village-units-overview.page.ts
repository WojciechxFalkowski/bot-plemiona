import { Page, Locator } from 'playwright';
import { Logger } from '@nestjs/common';

/**
 * Interface for village units data extracted from combined overview table
 */
export interface VillageUnitsData {
	villageId: string;
	name: string;
	coordinates: string;
	units: {
		spear: number;      // Pikinier
		sword: number;     // Miecznik
		axe: number;       // Topornik
		archer: number;    // Łucznik (może nie być dostępny na wszystkich serwerach)
		spy: number;       // Zwiadowca
		light: number;     // Lekki kawalerzysta
		heavy: number;     // Ciężki kawalerzysta
		ram: number;       // Taran
		catapult: number;  // Katapulta
		knight: number;    // Rycerz
		snob: number;      // Szlachcic
	};
	traders: {
		current: number;
		max: number;
	};
}

/**
 * Page Object Model for Plemiona Village Units Overview page
 * Parses the combined_table from overview_villages screen in combined mode
 */
export class VillageUnitsOverviewPage {
	private readonly page: Page;
	private readonly combinedTable: Locator;
	private readonly logger: Logger;
	private unitColumnMap: Map<number, keyof VillageUnitsData['units']> | null = null;

	constructor(page: Page) {
		this.page = page;
		this.combinedTable = page.locator('#combined_table');
		this.logger = new Logger(VillageUnitsOverviewPage.name);
	}

	/**
	 * Navigates to the village units overview page
	 * @param serverCode - Server code (e.g., 'pl218')
	 * @param villageId - ID of any village (used for URL construction)
	 * @throws Error if navigation fails or table is not found
	 */
	async navigate(serverCode: string, villageId: string): Promise<void> {
		try {
			const url = `https://${serverCode}.plemiona.pl/game.php?village=${villageId}&screen=overview_villages&mode=combined&group=0`;
			this.logger.log(`Navigating to village units overview: ${url}`);
			
			await this.page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
			
			// Check for session expiry BEFORE waiting for table
			const currentUrl = this.page.url();
			if (currentUrl.includes('session_expired')) {
				this.logger.warn(`Session expired - redirected to: ${currentUrl}`);
				throw new Error('SESSION_EXPIRED: Session was invalidated, need to re-login');
			}
			
			// Check if we were redirected away from the game
			if (!currentUrl.includes('/game.php')) {
				this.logger.warn(`Unexpected redirect to: ${currentUrl}`);
				throw new Error(`SESSION_INVALID: Redirected away from game to ${currentUrl}`);
			}
			
			await this.page.waitForSelector('#combined_table', { timeout: 10000 });
			this.logger.log('Village units overview page loaded');
		} catch (error) {
			this.logger.error(`Failed to navigate to village units overview: ${error.message}`);
			
			// Only take screenshot for non-session errors (session errors are expected and handled by retry)
			if (!error.message?.includes('SESSION_')) {
				const timestamp = Date.now();
				const screenshotPath = `village_units_nav_error_${serverCode}_${timestamp}.png`;
				try {
					await this.page.screenshot({ path: screenshotPath, fullPage: true });
					this.logger.error(`Debug screenshot saved: ${screenshotPath}`);
					
					// Log current URL and page title for additional context
					const currentUrl = this.page.url();
					const pageTitle = await this.page.title();
					this.logger.error(`Current URL: ${currentUrl}`);
					this.logger.error(`Page title: ${pageTitle}`);
					
					// Check for common error indicators
					const bodyText = await this.page.locator('body').textContent().catch(() => '');
					if (bodyText?.includes('wylogowany') || bodyText?.includes('logged out')) {
						this.logger.error('Session appears to be logged out');
					}
					if (bodyText?.includes('błąd') || bodyText?.includes('error')) {
						this.logger.error('Page contains error message');
					}
				} catch (screenshotError) {
					this.logger.warn(`Could not take debug screenshot: ${screenshotError.message}`);
				}
			}
			
			throw new Error(`Navigation failed: ${error.message}`);
		}
	}

	/**
	 * Extracts all village units data from the overview table
	 * Handles pagination automatically
	 * @returns Array of VillageUnitsData objects for all villages
	 */
	async extractVillageUnitsData(): Promise<VillageUnitsData[]> {
		this.logger.log('Starting extraction of village units data');
		
		// Wait for table to be loaded
		await this.waitForTableLoad();
		
		// Check if pagination exists
		const hasPagination = await this.checkPagination();
		
		if (!hasPagination) {
			// No pagination, parse current page only
			this.logger.log('No pagination detected, parsing current page');
			return await this.parseCurrentPage();
		}
		
		// Pagination exists, handle it
		this.logger.log('Pagination detected, processing all pages');
		return await this.getAllPages();
	}

	/**
	 * Parses the table header to detect unit column order
	 * Maps column indices to unit types based on image src or data-title
	 * @returns Map of column index to unit type
	 */
	private async parseUnitColumnMap(): Promise<Map<number, keyof VillageUnitsData['units']>> {
		const columnMap = new Map<number, keyof VillageUnitsData['units']>();
		
		try {
			// Get header row - try thead first, then first row of tbody if thead doesn't exist
			let headerRow = this.combinedTable.locator('thead tr').first();
			const theadCount = await this.combinedTable.locator('thead tr').count();
			
			if (theadCount === 0) {
				// If no thead, try first row of tbody (sometimes header is in tbody)
				this.logger.debug('No thead found, using first tbody row as header');
				headerRow = this.combinedTable.locator('tbody tr').first();
			}
			
			// Check if header row exists
			const headerRowCount = await headerRow.count();
			if (headerRowCount === 0) {
				this.logger.warn('Header row not found in table');
				return columnMap;
			}
			
			// Get all header cells - try th first, then td if th doesn't exist
			let headerCells = await headerRow.locator('th').all();
			if (headerCells.length === 0) {
				this.logger.debug('No th elements found, trying td elements');
				headerCells = await headerRow.locator('td').all();
			}
			
			this.logger.debug(`Found ${headerCells.length} header cells`);
			
			// Map unit identifiers to unit types
			// Based on image src pattern: unit_{identifier}.webp
			// And data-title in Polish or English
			const unitMapping: Array<{
				identifiers: string[];
				polishNames: string[];
				unitType: keyof VillageUnitsData['units'];
			}> = [
				{ identifiers: ['spear'], polishNames: ['pikinier'], unitType: 'spear' },
				{ identifiers: ['sword'], polishNames: ['miecznik'], unitType: 'sword' },
				{ identifiers: ['axe'], polishNames: ['topornik'], unitType: 'axe' },
				{ identifiers: ['archer'], polishNames: ['łucznik', 'archer'], unitType: 'archer' },
				{ identifiers: ['spy'], polishNames: ['zwiadowca'], unitType: 'spy' },
				{ identifiers: ['light'], polishNames: ['lekki kawalerzysta'], unitType: 'light' },
				{ identifiers: ['heavy'], polishNames: ['ciężki kawalerzysta', 'ciezki kawalerzysta'], unitType: 'heavy' },
				{ identifiers: ['ram'], polishNames: ['taran'], unitType: 'ram' },
				{ identifiers: ['catapult'], polishNames: ['katapulta'], unitType: 'catapult' },
				{ identifiers: ['knight'], polishNames: ['rycerz'], unitType: 'knight' }
			];
			
			// Parse each header cell
			for (let i = 0; i < headerCells.length; i++) {
				const cell = headerCells[i];
				
				// Check if this cell contains a unit image
				const unitImage = cell.locator('img');
				const imageCount = await unitImage.count();
				
				if (imageCount > 0) {
					// Get image src and data-title
					const src = await unitImage.getAttribute('src') || '';
					const dataTitle = (await unitImage.getAttribute('data-title') || '').toLowerCase();
					
					// Extract filename from src (e.g., unit_spear.webp)
					const filename = src.substring(src.lastIndexOf('/') + 1).toLowerCase();
					
					// Try to identify unit from src or data-title
					for (const mapping of unitMapping) {
						const matchesIdentifier = mapping.identifiers.some(id => filename.includes(`unit_${id}`));
						const matchesPolish = mapping.polishNames.some(name => dataTitle.includes(name));
						
						if (matchesIdentifier || matchesPolish) {
							columnMap.set(i, mapping.unitType);
							this.logger.debug(`Detected unit column ${i}: ${mapping.unitType} (src: ${filename}, title: ${dataTitle})`);
							break;
						}
					}
				}
			}
			
			// Log detected units
			if (columnMap.size > 0) {
				const detectedUnits = Array.from(columnMap.values()).join(', ');
				this.logger.log(`Detected unit columns: ${detectedUnits} (${columnMap.size} total)`);
			} else {
				this.logger.warn('No unit columns detected in table header - will use fallback parsing');
			}
			
			// Log missing units
			const allUnitTypes: Array<keyof VillageUnitsData['units']> = [
				'spear', 'sword', 'axe', 'archer', 'spy', 'light', 'heavy', 'ram', 'catapult', 'knight'
			];
			const detectedUnitTypes = Array.from(columnMap.values());
			const missingUnits = allUnitTypes.filter(unit => !detectedUnitTypes.includes(unit));
			
			if (missingUnits.length > 0) {
				this.logger.log(`Missing unit columns (not available on this server): ${missingUnits.join(', ')}`);
			}
			
		} catch (error) {
			this.logger.error(`Error parsing unit column map: ${error.message}`);
			// Return empty map if parsing fails
		}
		
		return columnMap;
	}

	/**
	 * Parses village units data from the current page
	 * @returns Array of VillageUnitsData objects from current page
	 */
	async parseCurrentPage(): Promise<VillageUnitsData[]> {
		const villages: VillageUnitsData[] = [];
		
		try {
			// Check if table exists
			if (!(await this.combinedTable.isVisible({ timeout: 5000 }))) {
				this.logger.warn('Combined table not found or not visible');
				return [];
			}
			
			// Parse unit column map from header (only once per page)
			if (!this.unitColumnMap || this.unitColumnMap.size === 0) {
				this.unitColumnMap = await this.parseUnitColumnMap();
			}
			
			// Get all village rows from the table body
			const villageRows = await this.combinedTable.locator('tbody tr').all();
			this.logger.log(`Found ${villageRows.length} village rows on current page`);
			
			// Log parsing method once
			if (this.unitColumnMap && this.unitColumnMap.size > 0) {
				this.logger.debug(`Using column map parsing (${this.unitColumnMap.size} unit columns detected)`);
			} else {
				this.logger.debug('Using fallback parsing (column map not available)');
			}
			
			for (let i = 0; i < villageRows.length; i++) {
				try {
					// Check if row has village data (has quickedit-vn element)
					const hasVillageData = await villageRows[i].locator('.quickedit-vn').count() > 0;
					if (!hasVillageData) {
						// Skip rows without village data (header, empty rows, etc.)
						continue;
					}
					
					const villageData = await this.parseVillageRow(villageRows[i]);
					if (villageData) {
						villages.push(villageData);
					}
				} catch (error) {
					this.logger.warn(`Failed to extract data for village row ${i + 1}: ${error.message}`);
					// Continue with other villages even if one fails
				}
			}
			
		} catch (error) {
			this.logger.error(`Error parsing current page: ${error.message}`);
			return [];
		}
		
		// Log summary at the end
		if (villages.length > 0) {
			this.logger.debug(`Successfully parsed ${villages.length} villages from current page`);
		}
		
		return villages;
	}

	/**
	 * Parses a single village row from the combined table
	 * @param row - The table row locator
	 * @returns VillageUnitsData object or null if extraction fails
	 */
	private async parseVillageRow(row: Locator): Promise<VillageUnitsData | null> {
		try {
			// Extract village ID from data-id attribute
			// Check if element exists first to avoid timeout
			const villageIdElement = row.locator('.quickedit-vn').first();
			const elementCount = await villageIdElement.count();
			
			if (elementCount === 0) {
				this.logger.debug('Skipping row - no quickedit-vn element found');
				return null;
			}
			
			const villageId = await villageIdElement.getAttribute('data-id', { timeout: 5000 });
			
			if (!villageId) {
				this.logger.debug('Skipping row - village ID attribute not found');
				return null;
			}
			
			// Extract village name and coordinates
			const villageNameElement = row.locator('.quickedit-label');
			const fullNameText = await villageNameElement.textContent();
			
			if (!fullNameText) {
				throw new Error('Village name not found');
			}
			
			// Parse name and coordinates from text like "0001 (609|451) K46"
			const nameMatch = fullNameText.trim().match(/^(.+?)\s+\((\d+\|\d+)\)/);
			const name = nameMatch ? nameMatch[1].trim() : fullNameText.trim();
			const coordinates = nameMatch ? nameMatch[2] : '';
			
			// Extract units using the column map from header
			// Initialize units object
			const units: VillageUnitsData['units'] = {
				spear: 0,
				sword: 0,
				axe: 0,
				archer: 0,
				spy: 0,
				light: 0,
				heavy: 0,
				ram: 0,
				catapult: 0,
				knight: 0,
				snob: 0
			};
			
			// Use the column map to parse units
			if (this.unitColumnMap && this.unitColumnMap.size > 0) {
				// Get all cells in the row
				const cells = await row.locator('td').all();
				
				// Parse units based on column map
				for (const [columnIndex, unitType] of this.unitColumnMap.entries()) {
					if (columnIndex < cells.length) {
						try {
							const cell = cells[columnIndex];
							// Check if this is a unit-item cell
							const isUnitItem = await cell.evaluate((el) => {
								return el.classList.contains('unit-item');
							});
							
							if (isUnitItem) {
								const cellText = await cell.textContent() || '';
								const unitCount = parseInt(cellText.trim(), 10) || 0;
								units[unitType] = unitCount;
							}
						} catch (error) {
							// Silent fail for individual cells
						}
					}
				}
			} else {
				// Fallback: try to parse unit-item cells in order (old method)
				// Don't log here - already logged during header parsing
				const unitCells = await row.locator('td.unit-item').all();
				const fallbackOrder: Array<keyof VillageUnitsData['units']> = [
					'spear', 'sword', 'axe', 'spy', 'light', 'heavy', 'ram', 'catapult', 'knight'
				];
				
				for (let i = 0; i < Math.min(unitCells.length, fallbackOrder.length); i++) {
					try {
						const cell = unitCells[i];
						const cellText = await cell.textContent() || '';
						const unitCount = parseInt(cellText.trim(), 10) || 0;
						units[fallbackOrder[i]] = unitCount;
					} catch (error) {
						// Silent fail for individual cells
					}
				}
			}
			
			// Extract snob (noble) - it's in a separate column with link to snob screen
			const snobCell = row.locator('td').filter({ has: this.page.locator('a[href*="screen=snob"]') }).first();
			if (await snobCell.count() > 0) {
				const snobText = await snobCell.textContent() || '';
				units.snob = parseInt(snobText.trim(), 10) || 0;
			}
			
			// Extract traders from format "0/131" or "154/154"
			// Traders are in the last column with link to market screen
			const tradersCell = row.locator('td').filter({ has: this.page.locator('a[href*="screen=market"]') }).last();
			let traders = { current: 0, max: 0 };
			
			if (await tradersCell.count() > 0) {
				const tradersText = await tradersCell.textContent() || '';
				const tradersMatch = tradersText.trim().match(/^(\d+)\/(\d+)$/);
				if (tradersMatch) {
					traders = {
						current: parseInt(tradersMatch[1], 10),
						max: parseInt(tradersMatch[2], 10)
					};
				}
			}
			
			return {
				villageId,
				name,
				coordinates,
				units,
				traders
			};
			
		} catch (error) {
			this.logger.error(`Error extracting village data from row: ${error.message}`);
			return null;
		}
	}

	/**
	 * Checks if pagination exists on the page
	 * @returns true if pagination is present, false otherwise
	 */
	async checkPagination(): Promise<boolean> {
		try {
			// Look for pagination links - check multiple possible selectors
			const paginationLinks = this.page.locator('a.paged-nav-item');
			const linkCount = await paginationLinks.count();
			
			if (linkCount > 0) {
				this.logger.debug(`Found ${linkCount} pagination links`);
				return true;
			}
			
			// Also check for pagination table
			const paginationTable = this.page.locator('table.vis').filter({ 
				has: this.page.locator('.paged-nav-item')
			});
			
			const isVisible = await paginationTable.isVisible({ timeout: 2000 }).catch(() => false);
			if (isVisible) {
				this.logger.debug('Found pagination table');
				return true;
			}
			
			// Check for any links with page parameter in href
			const pageLinks = this.page.locator('a[href*="page="]');
			const pageLinkCount = await pageLinks.count();
			if (pageLinkCount > 0) {
				this.logger.debug(`Found ${pageLinkCount} links with page parameter`);
				return true;
			}
			
			return false;
		} catch (error) {
			this.logger.debug(`Error checking pagination: ${error.message}`);
			return false;
		}
	}

	/**
	 * Gets all pages of village data, handling pagination
	 * Tries to use "wszystkie" (all) link if available, otherwise iterates through pages
	 * @returns Array of VillageUnitsData objects from all pages
	 */
	async getAllPages(): Promise<VillageUnitsData[]> {
		const allVillages: VillageUnitsData[] = [];
		
		try {
			// First, try to find and use "wszystkie" (all) link if available
			// Check multiple possible text patterns
			const allLinkPatterns = [
				'a.paged-nav-item:has-text("[wszystkie]")',
				'a.paged-nav-item:has-text("wszystkie")',
				'a[href*="page=-1"]',
				'a.paged-nav-item[href*="page=-1"]'
			];
			
			let allLink: Locator | null = null;
			
			for (const pattern of allLinkPatterns) {
				try {
					const link = this.page.locator(pattern).first();
					if (await link.count() > 0 && await link.isVisible({ timeout: 2000 }).catch(() => false)) {
						allLink = link;
						this.logger.log(`Found "wszystkie" link using pattern: ${pattern}`);
						break;
					}
				} catch (error) {
					// Try next pattern
					continue;
				}
			}
			
			// Also try searching by text content
			if (!allLink) {
				const allPaginationLinks = await this.page.locator('a.paged-nav-item').all();
				for (const link of allPaginationLinks) {
					const linkText = await link.textContent();
					const href = await link.getAttribute('href');
					
					if (linkText && (linkText.toLowerCase().includes('wszystkie') || href?.includes('page=-1'))) {
						if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
							allLink = link;
							this.logger.log(`Found "wszystkie" link by text/href: "${linkText}" / "${href}"`);
							break;
						}
					}
				}
			}
			
			if (allLink) {
				this.logger.log('Found "wszystkie" link, loading all villages on one page');
				
				// Click the "wszystkie" link
				await allLink.click();
				await this.page.waitForLoadState('networkidle', { timeout: 15000 });
				await this.waitForTableLoad();
				
				// Parse all villages from the single page
				const villages = await this.parseCurrentPage();
				allVillages.push(...villages);
				
				this.logger.log(`Loaded all ${villages.length} villages from "wszystkie" page`);
				return allVillages;
			}
			
			// "wszystkie" link not available, iterate through numbered pages
			this.logger.log('"wszystkie" link not found, iterating through numbered pages');
			
			// Get all page links (excluding current page and "wszystkie")
			const pageLinks = await this.page.locator('a.paged-nav-item').all();
			const pageNumbers: Set<number> = new Set();
			
			this.logger.debug(`Found ${pageLinks.length} pagination links to process`);
			
			for (const link of pageLinks) {
				try {
					const linkText = await link.textContent();
					const href = await link.getAttribute('href');
					
					this.logger.debug(`Processing link: text="${linkText}", href="${href}"`);
					
					// Extract page number from link text like "[2]" or "2"
					const textMatch = linkText?.match(/\[?(\d+)\]?/);
					if (textMatch) {
						const pageNum = parseInt(textMatch[1], 10);
						if (pageNum > 0) {
							pageNumbers.add(pageNum);
						}
					}
					
					// Also try to extract from href like "page=1" or "page=2"
					if (href) {
						const hrefMatch = href.match(/[?&]page=(\d+)/);
						if (hrefMatch && hrefMatch[1] !== '-1') {
							const pageNum = parseInt(hrefMatch[1], 10);
							if (pageNum > 0) {
								pageNumbers.add(pageNum);
							}
						}
					}
				} catch (error) {
					this.logger.debug(`Error processing pagination link: ${error.message}`);
					// Continue with other links
				}
			}
			
			// Convert to sorted array
			const sortedPageNumbers = Array.from(pageNumbers).sort((a, b) => a - b);
			this.logger.log(`Found ${sortedPageNumbers.length} pages to process: ${sortedPageNumbers.join(', ')}`);
			
			// Parse current page first
			this.logger.log('Parsing current page (page 1)');
			const currentPageVillages = await this.parseCurrentPage();
			allVillages.push(...currentPageVillages);
			this.logger.log(`Loaded ${currentPageVillages.length} villages from current page`);
			
			// Parse each numbered page
			for (const pageNum of sortedPageNumbers) {
				// Skip page 1 as we already parsed it
				if (pageNum === 1) {
					continue;
				}
				
				this.logger.log(`Parsing page ${pageNum}`);
				
				// Try multiple ways to find the page link
				let pageLink: Locator | null = null;
				
				// Try by text
				const linkByText = this.page.locator('a.paged-nav-item').filter({ 
					hasText: `[${pageNum}]`
				}).first();
				
				if (await linkByText.count() > 0 && await linkByText.isVisible({ timeout: 2000 }).catch(() => false)) {
					pageLink = linkByText;
				} else {
					// Try by href
					const linkByHref = this.page.locator(`a.paged-nav-item[href*="page=${pageNum}"]`).first();
					if (await linkByHref.count() > 0 && await linkByHref.isVisible({ timeout: 2000 }).catch(() => false)) {
						pageLink = linkByHref;
					}
				}
				
				if (pageLink) {
					try {
						await pageLink.click();
						await this.page.waitForLoadState('networkidle', { timeout: 15000 });
						await this.waitForTableLoad();
						
						const pageVillages = await this.parseCurrentPage();
						allVillages.push(...pageVillages);
						
						this.logger.log(`Loaded ${pageVillages.length} villages from page ${pageNum}`);
					} catch (error) {
						this.logger.warn(`Could not find or click link for page ${pageNum}: ${error.message}`);
					}
				} else {
					this.logger.warn(`Page link for page ${pageNum} not found or not visible`);
				}
			}
			
			this.logger.log(`Total villages loaded: ${allVillages.length}`);
			return allVillages;
			
		} catch (error) {
			this.logger.error(`Error getting all pages: ${error.message}`);
			// Return what we have so far, or try to return current page data
			if (allVillages.length === 0) {
				this.logger.warn('No villages loaded, attempting to parse current page as fallback');
				return await this.parseCurrentPage();
			}
			return allVillages;
		}
	}

	/**
	 * Waits for the combined table to be loaded
	 * @throws Error if table is not found within timeout
	 */
	private async waitForTableLoad(): Promise<void> {
		try {
			await this.combinedTable.waitFor({ state: 'visible', timeout: 10000 });
			// Wait a bit more for dynamic content to load
			await this.page.waitForTimeout(1000);
			// Reset column map when table reloads
			this.unitColumnMap = null;
		} catch (error) {
			this.logger.error(`Failed to wait for table load: ${error.message}`);
			throw new Error(`Table not found or not visible: ${error.message}`);
		}
	}
}

