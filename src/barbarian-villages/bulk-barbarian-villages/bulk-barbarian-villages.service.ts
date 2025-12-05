import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Page } from 'playwright';
import { ServersService } from '@/servers';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { createBrowserPage } from '@/utils/browser.utils';
import { ConfigService } from '@nestjs/config';
import { BulkBarbarianVillagesUtils } from './bulk-barbarian-villages.utils';
import { ValidationResult, ExtractionResult, ParsedUrl } from './bulk-barbarian-villages.interfaces';
import { BarbarianVillagesService } from '../barbarian-villages.service';

@Injectable()
export class BulkBarbarianVillagesService {
    private readonly logger = new Logger(BulkBarbarianVillagesService.name);
    private readonly credentials: PlemionaCredentials;

    constructor(
        private readonly serversService: ServersService,
        private readonly plemionaCookiesService: PlemionaCookiesService,
        private readonly configService: ConfigService,
        private readonly barbarianVillagesService: BarbarianVillagesService,
    ) {
        this.credentials = {
            username: this.configService.get<string>('PLEMIONA_USERNAME') || '',
        };
    }

    /**
     * Validates all URLs and checks if they match serverId and villageId
     */
    async validateUrls(
        urls: string[],
        serverId: number,
        villageId: string
    ): Promise<ValidationResult> {
        this.logger.log(`Validating ${urls.length} URLs for serverId=${serverId}, villageId=${villageId}`);

        const errors: string[] = [];
        const parsedUrls: ParsedUrl[] = [];

        // Parse all URLs
        for (const url of urls) {
            try {
                const parsed = BulkBarbarianVillagesUtils.parseUrl(url);
                parsedUrls.push(parsed);
            } catch (error) {
                errors.push(error.message);
            }
        }

        if (errors.length > 0) {
            return {
                isValid: false,
                errors,
                parsedUrls: []
            };
        }

        // Check if all URLs have the same serverCode
        const serverCodes = [...new Set(parsedUrls.map(p => p.serverCode))];
        if (serverCodes.length > 1) {
            errors.push(`URLs contain different server codes: ${serverCodes.join(', ')}. All URLs must be from the same server.`);
        }

        // Check if all URLs have the same villageId
        const villageIds = [...new Set(parsedUrls.map(p => p.villageId))];
        if (villageIds.length > 1) {
            errors.push(`URLs contain different village IDs: ${villageIds.join(', ')}. All URLs must be from the same village.`);
        }

        // Get serverCode from database
        const dbServerCode = await this.serversService.getServerCode(serverId);
        if (!dbServerCode) {
            errors.push(`Server with ID ${serverId} not found in database`);
        }

        // Check if serverCode from URLs matches database serverCode
        if (serverCodes.length === 1 && dbServerCode) {
            if (serverCodes[0] !== dbServerCode) {
                errors.push(`Server code from URL (${serverCodes[0]}) does not match server code from database (${dbServerCode}) for serverId ${serverId}`);
            }
        }

        // Check if villageId matches
        if (villageIds.length === 1) {
            if (villageIds[0] !== villageId) {
                errors.push(`Village ID from URLs (${villageIds[0]}) does not match provided villageId (${villageId})`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            parsedUrls,
            commonServerCode: serverCodes[0],
            commonVillageId: villageIds[0]
        };
    }

    /**
     * Extracts barbarian village links from map page using JavaScript
     */
    async extractBarbarianVillageLinks(
        page: Page,
        serverCode: string,
        villageId: string,
        mapUrl: string
    ): Promise<string[]> {
        this.logger.log(`Extracting barbarian village links from map: ${mapUrl}`);

        // Navigate to map
        await page.goto(mapUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000); // Wait for map to fully load

        // Execute JavaScript to find barbarian villages
        const links = await page.evaluate(({ serverCode, villageId }) => {
            const worldPrefix = serverCode;
            const myVillageId = villageId;

            // Build base URL
            const baseUrl = `https://${worldPrefix}.plemiona.pl/game.php?village=${myVillageId}&screen=info_village&id=`;

            // Find all village images on map
            const allVillageImages = document.querySelectorAll('#map_container img[id^="map_village_"]');

            // Filter for barbarian villages (containing 'left' in src)
            const barbarianIds = Array.from(allVillageImages)
                .filter(img => {
                    const src = (img as HTMLImageElement).src || img.getAttribute('src') || '';
                    return src.includes('left');
                })
                .map(img => img.id.replace('map_village_', ''));

            // Generate links
            const links = barbarianIds.map(targetId => `${baseUrl}${targetId}`);

            return links;
        }, { serverCode, villageId });

        this.logger.log(`Found ${links.length} barbarian village links`);
        return links;
    }

    /**
     * Extracts target ID from a barbarian village URL
     * URL format: https://pl223.plemiona.pl/game.php?village=8742&screen=info_village&id=12345
     */
    private extractTargetFromUrl(url: string): string | null {
        try {
            const urlObj = new URL(url);
            const targetId = urlObj.searchParams.get('id');
            return targetId;
        } catch (error) {
            this.logger.warn(`Failed to extract target from URL: ${url}`, error);
            return null;
        }
    }

    /**
     * Filters links to return only those that don't exist in database for the given serverId
     */
    async filterNewBarbarianVillages(
        links: string[],
        serverId: number,
        villageId: string,
        coordinateX?: number,
        coordinateY?: number
    ): Promise<string[]> {
        const coordsInfo = coordinateX !== undefined && coordinateY !== undefined 
            ? ` at coordinates (${coordinateX};${coordinateY})`
            : '';
        this.logger.log(`Filtering ${links.length} links to find new villages for serverId=${serverId}, villageId=${villageId}${coordsInfo}`);

        // Extract target IDs from links
        const targetIds = links
            .map(link => this.extractTargetFromUrl(link))
            .filter((target): target is string => target !== null);

        if (targetIds.length === 0) {
            this.logger.warn('No valid target IDs extracted from links');
            return [];
        }

        // Get existing villages from database for this server
        const existingVillages = await this.barbarianVillagesService.findAll(serverId, villageId, coordinateX, coordinateY);
        const existingTargets = new Set(existingVillages.map(v => v.target));

        this.logger.log(`Found ${existingTargets.size} existing villages in database for serverId=${serverId}`);

        // Filter links to only include those with targets not in database
        const newLinks = links.filter(link => {
            const target = this.extractTargetFromUrl(link);
            if (!target) {
                return false;
            }
            return !existingTargets.has(target);
        });

        const filteredCount = links.length - newLinks.length;
        this.logger.log(`Filtered out ${filteredCount} existing villages, ${newLinks.length} new villages remain`);

        return newLinks;
    }

    /**
     * Main method to execute bulk extraction
     */
    async executeBulkExtraction(
        urls: string[],
        serverId: number,
        villageId: string
    ): Promise<ExtractionResult> {
        this.logger.log(`Starting bulk extraction for ${urls.length} URLs, serverId=${serverId}, villageId=${villageId}`);

        // Validate URLs
        const validation = await this.validateUrls(urls, serverId, villageId);
        
        if (!validation.isValid) {
            throw new BadRequestException(`URL validation failed: ${validation.errors.join('; ')}`);
        }

        if (!validation.commonServerCode || !validation.commonVillageId) {
            throw new BadRequestException('Failed to extract serverCode or villageId from URLs');
        }

        // Get server information
        const serverName = await this.serversService.getServerName(serverId);
        const serverCode = validation.commonServerCode;

        // Create browser page with headless: false
        const { browser, page } = await createBrowserPage({ headless: true });

        try {
            // Login and select world
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.plemionaCookiesService,
                serverName
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new BadRequestException(`Login failed: ${loginResult.error || 'Unknown error'}`);
            }

            this.logger.log('Successfully logged in, extracting barbarian village links...');

            // Use first URL for map navigation (all should be from same location)
            const mapUrl = urls[0];

            // Extract coordinates from first URL for logging
            const parsedFirstUrl = BulkBarbarianVillagesUtils.parseUrl(mapUrl);
            const coordinateX = parsedFirstUrl.coordinateX;
            const coordinateY = parsedFirstUrl.coordinateY;

            // Extract links
            const links = await this.extractBarbarianVillageLinks(
                page,
                serverCode,
                villageId,
                mapUrl
            );

            // Filter out villages that already exist in database
            const newLinks = await this.filterNewBarbarianVillages(links, serverId, villageId, coordinateX, coordinateY);

            // Save new villages to database
            if (newLinks.length > 0) {
                this.logger.log(`Saving ${newLinks.length} new villages to database...`);
                
                // Prepare data for bulk create
                const villagesData = newLinks.map(link => {
                    const target = this.extractTargetFromUrl(link);
                    if (!target) {
                        throw new BadRequestException(`Failed to extract target from URL: ${link}`);
                    }
                    return {
                        target,
                        villageId
                    };
                });

                // Create villages in bulk
                await this.barbarianVillagesService.createBulk(serverId, villagesData);
                
                this.logger.log(`Successfully saved ${newLinks.length} villages to database`);
            } else {
                this.logger.log('No new villages to save - all found villages already exist in database');
            }

            return { links: newLinks };

        } finally {
            await browser.close();
        }
    }
}

