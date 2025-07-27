import { Injectable, Inject, NotFoundException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Page } from 'playwright';
import { ConfigService } from '@nestjs/config';
import { BarbarianVillageEntity } from './entities/barbarian-village.entity';
import { BARBARIAN_VILLAGES_ENTITY_REPOSITORY } from './barbarian-villages.service.contracts';
import { CreateBarbarianVillageDto, CreateBarbarianVillageFromUrlDto, UpdateBarbarianVillageDto } from './dto';
import { ArmyData, ArmyUtils } from '@/utils/army/army.utils';
import { AttackUtils, AttackResult, AttackCalculationResult, BarbarianVillage, LastAttackCheckResult } from '@/utils/army/attack.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { createBrowserPage } from '@/utils/browser.utils';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';

@Injectable()
export class BarbarianVillagesService {
    private readonly logger = new Logger(BarbarianVillagesService.name);
    private readonly credentials: PlemionaCredentials;

    constructor(
        @Inject(BARBARIAN_VILLAGES_ENTITY_REPOSITORY)
        private readonly barbarianVillageRepository: Repository<BarbarianVillageEntity>,
        private readonly settingsService: SettingsService,
        private readonly plemionaCookiesService: PlemionaCookiesService,
        private readonly configService: ConfigService,
        private readonly serversService: ServersService,
    ) {
        // Initialize credentials from environment variables
        this.credentials = AuthUtils.getCredentialsFromEnvironmentVariables(this.configService);
    }

    async findAll(serverId: number): Promise<BarbarianVillageEntity[]> {
        this.logger.debug(`Finding all barbarian villages for server ${serverId}`);
        return await this.barbarianVillageRepository.find({
            where: { serverId },
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(serverId: number, target: string): Promise<BarbarianVillageEntity> {
        this.logger.debug(`Finding barbarian village ${target} for server ${serverId}`);
        const village = await this.barbarianVillageRepository.findOne({
            where: { serverId, target }
        });

        if (!village) {
            throw new NotFoundException(`Barbarian village with target ${target} not found on server ${serverId}`);
        }

        return village;
    }

    async create(serverId: number, createBarbarianVillageDto: CreateBarbarianVillageDto): Promise<BarbarianVillageEntity> {
        this.logger.log(`Creating barbarian village for server ${serverId}: ${JSON.stringify(createBarbarianVillageDto)}`);

        // Check if village already exists on this server
        const existingVillage = await this.barbarianVillageRepository.findOne({
            where: { serverId, target: createBarbarianVillageDto.target }
        });

        if (existingVillage) {
            throw new ConflictException(`Barbarian village with target ${createBarbarianVillageDto.target} already exists on server ${serverId}`);
        }

        const village = this.barbarianVillageRepository.create({
            ...createBarbarianVillageDto,
            serverId
        });

        const savedVillage = await this.barbarianVillageRepository.save(village);
        this.logger.log(`Barbarian village created successfully: ${savedVillage.name} (${savedVillage.target}) on server ${serverId}`);

        return savedVillage;
    }

    /**
     * Creates a barbarian village from a Plemiona URL
     * @param serverId - Server ID
     * @param createFromUrlDto - DTO containing the URL
     * @returns Created barbarian village entity
    */
    async createFromUrl(serverId: number, createFromUrlDto: CreateBarbarianVillageFromUrlDto): Promise<BarbarianVillageEntity> {
        this.logger.log(`Creating barbarian village from URL for server ${serverId}: ${createFromUrlDto.url}`);

        // Parse the URL to extract coordinates and target
        const urlParams = this.parseBarbarianVillageUrl(createFromUrlDto.url);

        if (!urlParams) {
            throw new BadRequestException('Invalid barbarian village URL format');
        }

        const { target, coordinateX, coordinateY, villageId } = urlParams;

        // Check if village already exists on this server
        const existingVillage = await this.barbarianVillageRepository.findOne({
            where: { serverId, target }
        });

        if (existingVillage) {
            throw new ConflictException(`Barbarian village with target ${target} already exists on server ${serverId}`);
        }

        const village = this.barbarianVillageRepository.create({
            target,
            serverId,
            villageId,
            name: `Wioska barbarzyńska`,
            coordinateX,
            coordinateY,
            canAttack: true
        });

        const savedVillage = await this.barbarianVillageRepository.save(village);
        this.logger.log(`Barbarian village created from URL: ${savedVillage.name} (${savedVillage.target}) on server ${serverId}`);

        return savedVillage;
    }

    async update(serverId: number, target: string, updateBarbarianVillageDto: UpdateBarbarianVillageDto): Promise<BarbarianVillageEntity> {
        this.logger.log(`Updating barbarian village ${target} on server ${serverId}: ${JSON.stringify(updateBarbarianVillageDto)}`);

        const village = await this.findOne(serverId, target);

        // Update properties
        Object.assign(village, updateBarbarianVillageDto);
        const savedVillage = await this.barbarianVillageRepository.save(village);

        this.logger.log(`Barbarian village updated successfully: ${savedVillage.name} (${savedVillage.target}) on server ${serverId}`);
        return savedVillage;
    }

    async remove(serverId: number, target: string): Promise<void> {
        this.logger.log(`Deleting barbarian village ${target} from server ${serverId}`);

        const village = await this.findOne(serverId, target);
        await this.barbarianVillageRepository.remove(village);

        this.logger.log(`Barbarian village deleted successfully: ${village.name} (${target}) from server ${serverId}`);
    }

    async toggleCanAttack(serverId: number, target: string): Promise<BarbarianVillageEntity> {
        this.logger.log(`Toggling canAttack for barbarian village ${target} on server ${serverId}`);

        const village = await this.findOne(serverId, target);
        village.canAttack = !village.canAttack;

        const savedVillage = await this.barbarianVillageRepository.save(village);
        this.logger.log(`CanAttack toggled for ${savedVillage.name} (${target}): ${savedVillage.canAttack} on server ${serverId}`);

        return savedVillage;
    }

    async findAttackableVillages(serverId: number, villageId: string): Promise<BarbarianVillageEntity[]> {
        this.logger.debug(`Finding attackable barbarian villages for server ${serverId}`);
        return await this.barbarianVillageRepository.find({
            where: { serverId, canAttack: true, villageId },
            order: { createdAt: 'ASC' }
        });
    }

    async executeMiniAttacks(serverId: number, villageId: string): Promise<AttackResult[]> {
        this.logger.log(`Starting mini attacks execution${serverId ? ` for server ${serverId}` : ' for all servers'}`);
        const attackableVillages: BarbarianVillageEntity[] = await this.findAttackableVillages(serverId, villageId);

        if (attackableVillages.length === 0) {
            this.logger.log(`No attackable barbarian villages found${serverId ? ` for server ${serverId}` : ''}`);
            return [];
        }

        this.logger.log(`Found ${attackableVillages.length} attackable villages${serverId ? ` for server ${serverId}` : ''}`);


        const { browser, page } = await createBrowserPage({ headless: false });
        const serverName = await this.serversService.getServerName(serverId);
        try {
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.plemionaCookiesService,
                serverName
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new Error(`Login failed${serverId ? ` for server ${serverId}` : ''}: ${loginResult.error || 'Unknown error'}`);
            }

            this.logger.log(`Successfully logged in${serverId ? ` for server ${serverId}` : ''}, starting mini attacks...`);

            // Get next target index from settings
            const nextTargetIndexSetting = serverId
                ? await this.settingsService.getSetting<{ value: number }>(serverId, SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX)
                : await this.settingsService.getSetting<{ value: number }>(1, SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX); // fallback

            let nextTargetIndex = nextTargetIndexSetting?.value || 0;

            // Ensure index is within bounds
            if (nextTargetIndex >= attackableVillages.length) {
                nextTargetIndex = 0;
            }

            const targetVillage = attackableVillages[nextTargetIndex];
            this.logger.log(`Targeting village: ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

            // Check army and execute attack
            // Note: These should be dynamic per server, but for now using placeholders

            const armyData = await ArmyUtils.getArmyData(page, villageId, serverId.toString());
            const attackResult = await this.executeAttackOnVillage(page, targetVillage, armyData, villageId);

            // Update next target index
            const newNextTargetIndex = (nextTargetIndex + 1) % attackableVillages.length;
            if (serverId) {
                await this.settingsService.setSetting(serverId, SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX, { value: newNextTargetIndex });
            } else {
                await this.settingsService.setSetting(1, SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX, { value: newNextTargetIndex });
            }

            this.logger.log(`Mini attacks execution completed${serverId ? ` for server ${serverId}` : ''}. Next target index: ${newNextTargetIndex}`);
            return [attackResult];

        } finally {
            await browser.close();
        }
    }

    async refreshBarbarianVillages(serverId: number): Promise<{ added: number; updated: number; deleted: number }> {
        this.logger.log(`Starting barbarian villages refresh for server ${serverId}...`);

        const { browser, page } = await createBrowserPage({ headless: true });

        try {
            const serverName = await this.serversService.getServerName(serverId);
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.plemionaCookiesService,
                serverName
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new Error(`Login failed for server ${serverId}: ${loginResult.error || 'Unknown error'}`);
            }

            this.logger.log(`Successfully logged in for server ${serverId}, starting barbarian villages extraction...`);

            // Navigate to barbarian villages page and extract data
            // This would need to be implemented based on the specific game mechanics
            const barbarianVillagesData = await this.extractBarbarianVillagesFromGame(page);

            // Sync with database
            const syncResult = await this.syncBarbarianVillages(serverId, barbarianVillagesData);

            this.logger.log(`Barbarian villages refresh completed for server ${serverId}: ${JSON.stringify(syncResult)}`);
            return syncResult;

        } finally {
            await browser.close();
        }
    }

    async getCount(serverId: number): Promise<number> {
        return this.barbarianVillageRepository.count({ where: { serverId } });
    }

    async getAttackableCount(serverId: number): Promise<number> {
        return this.barbarianVillageRepository.count({
            where: { serverId, canAttack: true }
        });
    }

    async deleteAllForServer(serverId: number): Promise<void> {
        this.logger.log(`Deleting all barbarian villages for server ${serverId}`);

        await this.barbarianVillageRepository.delete({ serverId });

        this.logger.log(`All barbarian villages deleted for server ${serverId}`);
    }

    /**
    * Parses Plemiona URL to extract village ID and coordinates
    * @param url - URL from Plemiona game
    * @returns Parsed data with target, coordinateX, and coordinateY
    */
    private parseBarbarianVillageUrl(url: string): { target: string; coordinateX: number; coordinateY: number; villageId: string } {
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

    private async executeAttackOnVillage(page: Page, village: BarbarianVillageEntity, armyData: ArmyData, villageId: string): Promise<AttackResult> {
        this.logger.log(`Executing attack on village ${village.name} (${village.coordinateX}|${village.coordinateY})`);

        try {
            // Navigate to the village and execute attack
            const barbarianVillage: BarbarianVillage = {
                target: village.target,
                name: village.name,
                coordinateX: village.coordinateX,
                coordinateY: village.coordinateY,
                canAttack: village.canAttack,
                createdAt: village.createdAt,
                updatedAt: village.updatedAt
            };

            // Use AttackUtils to perform the attack
            const attackResult = await AttackUtils.performMiniAttack(page, barbarianVillage, villageId);

            this.logger.log(`Attack executed successfully on ${village.name}: ${attackResult.success ? 'SUCCESS' : 'FAILED'}`);

            if (attackResult.error) {
                this.logger.error(`Attack error: ${attackResult.error}`);
            }

            return attackResult;

        } catch (error) {
            this.logger.error(`Error executing attack on village ${village.name}:`, error);
            return {
                success: false,
                error: error.message || 'Unknown attack error',
                targetVillage: {
                    target: village.target,
                    name: village.name,
                    coordinateX: village.coordinateX,
                    coordinateY: village.coordinateY,
                    canAttack: village.canAttack,
                    createdAt: village.createdAt,
                    updatedAt: village.updatedAt
                }
            };
        }
    }

    private async extractBarbarianVillagesFromGame(page: Page): Promise<any[]> {
        // This is a placeholder - implement actual barbarian villages extraction logic
        // based on the specific game mechanics and UI
        this.logger.log('Extracting barbarian villages from game...');

        // Return empty array for now
        return [];
    }

    private async syncBarbarianVillages(serverId: number, villagesData: any[]): Promise<{ added: number; updated: number; deleted: number }> {
        this.logger.log(`Syncing ${villagesData.length} barbarian villages for server ${serverId}`);

        const existingVillages = await this.barbarianVillageRepository.find({
            where: { serverId }
        });

        let added = 0;
        let updated = 0;
        let deleted = 0;

        // This is a placeholder - implement actual sync logic based on the data format
        // from extractBarbarianVillagesFromGame

        return { added, updated, deleted };
    }
} 