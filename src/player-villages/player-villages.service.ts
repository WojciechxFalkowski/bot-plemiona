import { Injectable, NotFoundException, ConflictException, Inject, BadRequestException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PlayerVillageEntity } from './entities/player-village.entity';
import { CreatePlayerVillageDto } from './dto/create-player-village.dto';
import { CreatePlayerVillageFromUrlDto } from './dto/create-player-village-from-url.dto';
import { UpdatePlayerVillageDto } from './dto/update-player-village.dto';
import { PlayerVillagesServiceContracts, PLAYER_VILLAGES_ENTITY_REPOSITORY } from './player-villages.service.contracts';
import { ServersService } from '@/servers/servers.service';
import { Browser, Page } from 'playwright';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { createBrowserPage } from '@/utils/browser.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { VillageInfoPage } from '@/models/tribal-wars/village-info-page';
import { TroopDispatchPage } from '@/models/tribal-wars/troop-dispatch-page';
import { PlayerVillageAttackStrategiesService } from './player-village-attack-strategies.service';
import { PlayerVillageAttackStrategyEntity } from './entities/player-village-attack-strategy.entity';

@Injectable()
export class PlayerVillagesService extends PlayerVillagesServiceContracts {
    private readonly logger = new Logger(PlayerVillagesService.name);
    private readonly credentials: PlemionaCredentials;

    constructor(
        @Inject(PLAYER_VILLAGES_ENTITY_REPOSITORY)
        private playerVillagesRepository: Repository<PlayerVillageEntity>,
        private serversService: ServersService,
        private playerVillageAttackStrategiesService: PlayerVillageAttackStrategiesService,
        private settingsService: SettingsService,
        private plemionaCookiesService: PlemionaCookiesService,
    ) {
        super();
        this.credentials = {
            username: process.env.PLEMIONA_USERNAME || '',
        };
    }

    async findAll(): Promise<PlayerVillageEntity[]> {
        return this.playerVillagesRepository.find({
            relations: ['server'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: number): Promise<PlayerVillageEntity> {
        const village = await this.playerVillagesRepository.findOne({
            where: { id },
            relations: ['server'],
        });

        if (!village) {
            throw new NotFoundException(`Player village with ID ${id} not found`);
        }

        return village;
    }

    async create(createPlayerVillageDto: CreatePlayerVillageDto): Promise<PlayerVillageEntity> {
        // Check if village already exists for this server
        const existingVillage = await this.playerVillagesRepository.findOne({
            where: {
                serverId: createPlayerVillageDto.serverId,
                target: createPlayerVillageDto.target,
            },
        });

        if (existingVillage) {
            throw new ConflictException('Player village already exists for this server');
        }

        // Verify server exists
        await this.serversService.findById(createPlayerVillageDto.serverId);

        const village = this.playerVillagesRepository.create(createPlayerVillageDto);
        return this.playerVillagesRepository.save(village);
    }

    /**
     * Creates a player village from a Plemiona URL
     * @param serverId - Server ID
     * @param createFromUrlDto - DTO containing the URL
     * @returns Created player village entity
     */
    async createFromUrl(serverId: number, createFromUrlDto: CreatePlayerVillageFromUrlDto): Promise<PlayerVillageEntity> {
        // Parse the URL to extract coordinates and target
        const urlParams = this.parsePlayerVillageUrl(createFromUrlDto.url);

        if (!urlParams) {
            throw new ConflictException('Invalid player village URL format');
        }

        const { target, coordinateX, coordinateY, villageId } = urlParams;

        // Verify server exists
        await this.serversService.findById(serverId);

        // Check if village already exists on this server
        const existingVillage = await this.playerVillagesRepository.findOne({
            where: { serverId, target }
        });

        if (existingVillage) {
            throw new ConflictException(`Player village with target ${target} already exists on server ${serverId}`);
        }

        const village = this.playerVillagesRepository.create({
            target,
            serverId,
            villageId,
            name: `Wioska gracza ${target}`,
            coordinateX,
            coordinateY,
            owner: '', // Will be filled during first attack
            points: 0, // Will be filled during first attack
            population: 0, // Will be filled during first attack
            canAttack: true
        });

        const savedVillage = await this.playerVillagesRepository.save(village);
        return savedVillage;
    }

    async update(id: number, updatePlayerVillageDto: UpdatePlayerVillageDto): Promise<PlayerVillageEntity> {
        const village = await this.findOne(id);

        Object.assign(village, updatePlayerVillageDto);
        return this.playerVillagesRepository.save(village);
    }

    async remove(id: number): Promise<void> {
        const village = await this.findOne(id);
        await this.playerVillagesRepository.remove(village);
    }

    async findByServerId(serverId: number): Promise<PlayerVillageEntity[]> {
        return this.playerVillagesRepository.find({
            where: { serverId },
            relations: ['server'],
            order: { createdAt: 'DESC' },
        });
    }

    async findAttackableVillages(serverId: number): Promise<PlayerVillageEntity[]> {
        return this.playerVillagesRepository.find({
            where: {
                serverId,
                canAttack: true,
            },
            relations: ['server'],
            order: { villageId: 'ASC' },
        });
    }

    /**
 * Tworzy sesję przeglądarki z zalogowaniem do gry
 * @returns Obiekt z przeglądarką, kontekstem i stroną
 * @throws BadRequestException jeśli logowanie się nie powiodło
 */
    private async createBrowserSession(serverId: number, headless: boolean) {
        const { browser, context, page } = await createBrowserPage({ headless: headless });
        const serverName = await this.serversService.getServerName(serverId);
        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            this.credentials,
            this.plemionaCookiesService,
            serverName
        );

        if (!loginResult.success || !loginResult.worldSelected) {
            await browser.close();
            this.logger.error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            throw new BadRequestException(`Login failed: ${loginResult.error || 'Unknown error'}`);
        }

        return { browser, context, page };
    }

    async verifyVillageOwner(id: number, serverCode: string): Promise<any> {
        const village = await this.findOne(id);
        const { browser, page } = await createBrowserPage({ headless: true });

        try {
            // Get server by code
            const server = await this.serversService.findByCode(serverCode);

            // Login and select world
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.plemionaCookiesService,
                server.serverName
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new Error(`Login failed for server ${serverCode}: ${loginResult.error || 'Unknown error'}`);
            }

            this.logger.log(`Successfully logged in for server ${serverCode}, verifying village owner...`);

            const infoUrl = `https://${serverCode}.plemiona.pl/game.php?village=${village.villageId}&screen=info_village&id=${village.target}`;
            await page.goto(infoUrl);
            await page.waitForTimeout(1000);

            const villageData = await page.evaluate(() => {
                function getValueElementByKey(keyText: string): Element | null {
                    const keyCells = document.querySelectorAll("table.vis td:first-child");
                    for (const cell of keyCells) {
                        if (cell.textContent?.trim() === keyText) {
                            return cell.nextElementSibling;
                        }
                    }
                    return null;
                }

                const coordinatesCell = getValueElementByKey("Współrzędne:");
                const pointsCell = getValueElementByKey("Punkty:");
                const playerCell = getValueElementByKey("Gracz:");
                const tribeCell = getValueElementByKey("Plemię:");

                const coordinates = coordinatesCell?.textContent?.trim() || '';
                const points = pointsCell?.textContent?.trim() || '0';
                const playerLink = playerCell?.querySelector("a");
                const tribeLink = tribeCell?.querySelector("a");

                const [x, y] = coordinates.split('|').map(coord => parseInt(coord.trim()));

                return {
                    coordinateX: x || 0,
                    coordinateY: y || 0,
                    points: parseInt(points) || 0,
                    owner: playerLink?.textContent?.trim() || '',
                    ownerId: playerLink?.getAttribute('href')?.match(/player\/(\d+)/)?.[1] || undefined,
                    tribe: tribeLink?.textContent?.trim() || undefined,
                    tribeId: tribeLink?.getAttribute('href')?.match(/tribe\/(\d+)/)?.[1] || undefined,
                };
            });

            // Update village data
            await this.updateVillageData(id, villageData);

            this.logger.log(`Village owner verified successfully for village ${village.target}`);
            return villageData;
        } catch (error) {
            this.logger.error(`Failed to verify village owner: ${error.message}`);
            throw new Error(`Failed to verify village owner: ${error.message}`);
        } finally {
            await browser.close();
        }
    }

    async updateVillageData(id: number, villageData: any): Promise<PlayerVillageEntity> {
        const village = await this.findOne(id);
        //
        // Check if owner has changed
        if (village.owner !== villageData.owner && village.owner !== "") {
            village.canAttack = false;
        }

        // Update village data
        Object.assign(village, {
            ...villageData,
            lastVerified: new Date(),
        });

        return this.playerVillagesRepository.save(village);
    }

    /**
     * Parses Plemiona URL to extract village ID and coordinates
     * @param url - URL from Plemiona game
     * @returns Parsed data with target, coordinateX, and coordinateY
     */
    private parsePlayerVillageUrl(url: string): { target: string; coordinateX: number; coordinateY: number; villageId: string } {
        try {
            // Extract ID parameter from URL
            const urlParams = new URL(url);
            const idParam = urlParams.searchParams.get('id');
            const villageId = urlParams.searchParams.get('village');

            if (!idParam) {
                throw new BadRequestException('URL does not contain required "id" parameter');
            }

            if (!villageId) {
                throw new BadRequestException('URL does not contain required "village" parameter');
            }

            // Extract coordinates from hash (after #)
            const hash = urlParams.hash;
            if (!hash || !hash.startsWith('#')) {
                throw new BadRequestException('URL does not contain coordinates in hash fragment');
            }

            // Remove # and split by semicolon
            const coordinates = hash.substring(1).split(';');
            if (coordinates.length !== 2) {
                throw new BadRequestException('Invalid coordinate format. Expected format: #X;Y');
            }

            const coordinateX = parseInt(coordinates[0], 10);
            const coordinateY = parseInt(coordinates[1], 10);

            if (isNaN(coordinateX) || isNaN(coordinateY)) {
                throw new BadRequestException('Coordinates must be valid numbers');
            }

            if (coordinateX < 0 || coordinateX > 1000 || coordinateY < 0 || coordinateY > 1000) {
                throw new BadRequestException('Coordinates must be between 0 and 1000');
            }

            return {
                target: idParam,
                coordinateX,
                coordinateY,
                villageId
            };

        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Invalid URL format: ${error.message}`);
        }
    }

    public async executeAttacks(serverId: number): Promise<void> {
        const villages = await this.findAttackableVillages(serverId);
        for (const village of villages) {
            await this.executeAttackForVillage(village, serverId);
        }
    }

    private async executeAttackForVillage(village: PlayerVillageEntity, serverId: number): Promise<void> {
        const { browser, page } = await this.createBrowserSession(serverId, true);
        const serverCode = await this.serversService.getServerCode(serverId);
        try {
            await this.checkVillageOwnerAndUpdate(page, village, serverCode);
            const strategy = await this.playerVillageAttackStrategiesService.findByVillageId(serverId, village.villageId);
            await this.executeAttack(page, village, serverCode, serverId, browser, strategy);
        } catch (error) {
            this.logger.error(`Error executing attack for village ${village.name}: ${error.message}`);
            throw new Error(`Error executing attack for village ${village.name}: ${error.message}`);
        } finally {
            await browser.close();
        }
    }

    private async executeAttack(page: Page, village: PlayerVillageEntity, serverCode: string, serverId: number, browser: Browser, strategy: PlayerVillageAttackStrategyEntity): Promise<void> {
        const troopDispatch = new TroopDispatchPage(page, serverCode);
        await troopDispatch.navigateToTroopDispatch(village.villageId, village.target);
        // find strategy for this village from database player_village_attack_strategies
        await troopDispatch.fillAttackFormWithStrategy(strategy);
        // confirm attack sequence
        await troopDispatch.confirmAttackSequence();
    }

    private async checkVillageOwnerAndUpdate(page: Page, village: PlayerVillageEntity, serverCode: string): Promise<void> {
        const villageInfo = new VillageInfoPage(page, serverCode);
        await villageInfo.navigateToVillageInfo(village.villageId, village.target);
        const villageInfoData = await villageInfo.getVillageData();

        if (village.owner !== villageInfoData.owner && villageInfoData.owner !== "") {
            await this.update(village.id, { canAttack: false });
            this.logger.log(`Village owner changed from ${village.owner} to ${villageInfoData.owner}`);
        }
        else {
            this.logger.log(`Village owner is the same in database as it is in VillageInfoData`);
        }

        const lastAttackCheck = await villageInfo.checkLastAttackResult(page, {
            name: village.name,
            coordinateX: village.coordinateX,
            coordinateY: village.coordinateY,
            target: village.target,
            canAttack: village.canAttack,
            createdAt: village.createdAt,
            updatedAt: village.updatedAt
        }, village.villageId, serverCode);
        if (!lastAttackCheck.canAttack) {
            await this.update(village.id, { canAttack: false });
            this.logger.log(`Village can not be attacked: ${lastAttackCheck.reason}`);
        }
        else {
            this.logger.log(`Village can be attacked: ${lastAttackCheck.reason}`);
        }
    }
}
