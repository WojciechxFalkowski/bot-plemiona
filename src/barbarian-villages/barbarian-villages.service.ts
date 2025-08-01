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
import { MiniAttackStrategiesService } from '@/mini-attack-strategies';
import { MiniAttackStrategyResponseDto } from '@/mini-attack-strategies/dto';

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
        private readonly miniAttackStrategiesService: MiniAttackStrategiesService,
    ) {
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
        const villages = await this.barbarianVillageRepository.find({
            where: { serverId, canAttack: true, villageId },
            order: { createdAt: 'ASC' }
        });
        this.logger.log(`Found ${villages.length} attackable barbarian villages for server ${serverId} and village ${villageId}`);
        return villages;
    }

    async executeMiniAttacksForAllVillagesInServer(serverId: number): Promise<AttackResult[]> {
        const { browser, page } = await createBrowserPage({ headless: true });

        try {
            const serverName = await this.serversService.getServerName(serverId);
            const serverCode = await this.serversService.getServerCode(serverId);

            // 1. Login and select world
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.plemionaCookiesService,
                serverName
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new Error(`Login failed for server ${serverId}: ${loginResult.error || 'Unknown error'}`);
            }

            this.logger.log(`Successfully logged in for server ${serverId}, starting mini attacks...`);

            const strategies = await this.miniAttackStrategiesService.findAllByServer(serverId);
            const attackResults: AttackResult[] = [];
            for (const strategy of strategies) {
                const results = await this.executeMiniAttacks(serverId, strategy.villageId, page, serverCode, strategy);
                attackResults.push(...results);
            }

            return attackResults;

        } finally {
            await browser.close();
        }
    }

    async executeMiniAttacks(serverId: number, villageId: string, page: Page, serverCode: string, strategy?: MiniAttackStrategyResponseDto): Promise<AttackResult[]> {
        this.logger.log(`Starting mini attacks execution for server ${serverId}, village ${villageId}`);
        const attackableVillages: BarbarianVillageEntity[] = await this.findAttackableVillages(serverId, villageId);

        if (attackableVillages.length === 0) {
            this.logger.log(`No attackable barbarian villages found for server ${serverId}, village ${villageId}`);
            return [];
        }

        this.logger.log(`Found ${attackableVillages.length} attackable villages for server ${serverId}, village ${villageId}`);

        try {
            // 1. Get army data
            const armyData = await ArmyUtils.getArmyData(page, villageId, serverCode);
            // 2. Check if there's a strategy and calculate max attacks
            let maxPossibleAttacks = 0;
            let attackStrategy: any = null;

            try {
                // Use provided strategy or find one
                if (strategy) {
                    attackStrategy = strategy;
                    this.logger.log(`Using provided strategy for village ${villageId}: spear=${attackStrategy.spear}, sword=${attackStrategy.sword}, light=${attackStrategy.light}`);
                } else {
                    attackStrategy = await this.miniAttackStrategiesService.findByServerAndVillage(serverId, villageId);
                    this.logger.log(`Found strategy for village ${villageId}: spear=${attackStrategy.spear}, sword=${attackStrategy.sword}, light=${attackStrategy.light}`);
                }

                // Calculate max attacks based on strategy
                if (attackStrategy.spear > 0 && attackStrategy.sword > 0) {
                    const spearUnit = armyData.units.find(u => u.dataUnit === 'spear');
                    const swordUnit = armyData.units.find(u => u.dataUnit === 'sword');
                    const maxAttacksFromSpear = spearUnit ? Math.floor(spearUnit.inVillage / attackStrategy.spear) : 0;
                    const maxAttacksFromSword = swordUnit ? Math.floor(swordUnit.inVillage / attackStrategy.sword) : 0;
                    maxPossibleAttacks = Math.min(maxAttacksFromSpear, maxAttacksFromSword);

                    this.logger.log(`Strategy calculation: spear ${spearUnit?.inVillage || 0}/${attackStrategy.spear}=${maxAttacksFromSpear}, sword ${swordUnit?.inVillage || 0}/${attackStrategy.sword}=${maxAttacksFromSword} → ${maxPossibleAttacks} attacks`);
                } else if (attackStrategy.light > 0) {
                    const lightUnit = armyData.units.find(u => u.dataUnit === 'light');
                    maxPossibleAttacks = lightUnit ? Math.floor(lightUnit.inVillage / attackStrategy.light) : 0;
                    this.logger.log(`Strategy calculation: light ${lightUnit?.inVillage || 0}/${attackStrategy.light} → ${maxPossibleAttacks} attacks`);
                } else {
                    this.logger.warn(`Strategy has unsupported units, falling back to default calculation`);
                    const lightUnit = armyData.units.find(u => u.dataUnit === 'light');
                    maxPossibleAttacks = lightUnit ? Math.floor(lightUnit.inVillage / 2) : 0; // Default 2 light cavalry
                }

            } catch (strategyError) {
                this.logger.error(`No strategy found for village ${villageId}. No attacks will be performed.`);
                maxPossibleAttacks = 0; // No strategy = no attacks
                return [];
            }

            // 3. Limit attacks to available villages
            maxPossibleAttacks = Math.min(maxPossibleAttacks, attackableVillages.length);

            // 4. Check if there are any attacks to perform
            if (maxPossibleAttacks === 0) {
                this.logger.warn('❌ Insufficient troops for mini attacks or no available targets');
                return [];
            }

            this.logger.log(`📊 Will perform ${maxPossibleAttacks} attacks (limited by min(troops, ${attackableVillages.length} villages))`);

            // 5. Get current target index from settings
            const nextTargetIndexSetting = await this.settingsService.getSetting<{ value: number }>(serverId, SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX);
            let currentTargetIndex = nextTargetIndexSetting?.value || 0;

            // Ensure index is within bounds
            if (currentTargetIndex >= attackableVillages.length) {
                currentTargetIndex = 0;
            }

            this.logger.log(`📍 Starting from target index: ${currentTargetIndex} (village: ${attackableVillages[currentTargetIndex]?.name || 'unknown'})`);

            // 6. Execute attacks in loop
            const attackResults: AttackResult[] = [];
            const startingIndex = currentTargetIndex;
            let attacksPerformed = 0;

            for (let i = 0; i < maxPossibleAttacks; i++) {
                const targetVillage = attackableVillages[currentTargetIndex];
                this.logger.log(`🎯 Attack ${i + 1}/${maxPossibleAttacks}: Targeting ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

                try {
                    // Check last attack result before performing new attack
                    this.logger.debug('Checking last attack result...');
                    const lastAttackCheck = await AttackUtils.checkLastAttackResult(page, targetVillage, villageId, serverCode);

                    if (!lastAttackCheck.canAttack) {
                        this.logger.warn(`❌ Skipping attack on ${targetVillage.name}: ${lastAttackCheck.reason}`);

                        // Update canAttack flag to false in database
                        await this.updateCanAttackFlag(targetVillage.target, false);

                        // Move to next target
                        currentTargetIndex = (currentTargetIndex + 1) % attackableVillages.length;
                        await this.settingsService.setSetting(serverId, SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX, { value: currentTargetIndex });

                        // Add skipped result to attack results
                        attackResults.push({
                            success: false,
                            targetVillage: {
                                target: targetVillage.target,
                                name: targetVillage.name,
                                coordinateX: targetVillage.coordinateX,
                                coordinateY: targetVillage.coordinateY,
                                canAttack: targetVillage.canAttack,
                                createdAt: targetVillage.createdAt,
                                updatedAt: targetVillage.updatedAt
                            },
                            error: `Skipped: ${lastAttackCheck.reason}`
                        });

                        continue; // Skip to next village
                    }

                    this.logger.debug(`✅ Last attack check passed: ${lastAttackCheck.reason}`);

                    // Execute attack on current village
                    const attackResult = await this.executeAttackOnVillage(page, targetVillage, armyData, villageId, serverCode, attackStrategy);
                    attackResults.push(attackResult);

                    if (attackResult.success) {
                        attacksPerformed++;
                        this.logger.log(`✅ Attack ${i + 1} successful: ${targetVillage.name}`);
                    } else {
                        this.logger.warn(`❌ Attack ${i + 1} failed: ${targetVillage.name} - ${attackResult.error}`);
                    }

                    // Update canAttack to false if error text contains "Village is no longer barbarian"
                    if (attackResult.error && attackResult.error.includes('Village is no longer barbarian')) {
                        await this.removeBarbarianVillage(targetVillage.target);
                        this.logger.log(`🗑️ Deleted village ${targetVillage.name} from database - no longer barbarian`);
                    }

                    // Update target index for next attack (round-robin)
                    currentTargetIndex = (currentTargetIndex + 1) % attackableVillages.length;

                    // Save current index to settings (for resumption after interruption)
                    await this.settingsService.setSetting(serverId, SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX, { value: currentTargetIndex });

                    // Delay between attacks to avoid overwhelming the server
                    if (i < maxPossibleAttacks - 1) {
                        this.logger.debug('⏳ Waiting 2 seconds before next attack...');
                        await page.waitForTimeout(2000);
                    }

                } catch (attackError) {
                    this.logger.error(`💥 Error during attack ${i + 1} on ${targetVillage.name}:`, attackError);

                    // Still update the target index to move to next village
                    currentTargetIndex = (currentTargetIndex + 1) % attackableVillages.length;
                    await this.settingsService.setSetting(serverId, SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX, { value: currentTargetIndex });

                    // Add failed result
                    attackResults.push({
                        success: false,
                        targetVillage: {
                            target: targetVillage.target,
                            name: targetVillage.name,
                            coordinateX: targetVillage.coordinateX,
                            coordinateY: targetVillage.coordinateY,
                            canAttack: targetVillage.canAttack,
                            createdAt: targetVillage.createdAt,
                            updatedAt: targetVillage.updatedAt
                        },
                        error: attackError.message
                    });

                    // Continue with next village instead of stopping
                    continue;
                }
            }

            // 7. Log attack summary
            this.logger.log(`🗡️ Mini attacks completed: ${attacksPerformed}/${maxPossibleAttacks} successful attacks`);
            this.logger.log(`📍 Attack sequence: ${startingIndex} → ${currentTargetIndex} (next start point)`);

            const successfulAttacks = attackResults.filter(r => r.success).length;
            const failedAttacks = attackResults.filter(r => !r.success).length;
            this.logger.log(`📊 Results: ${successfulAttacks} successful, ${failedAttacks} failed, ${attackResults.length} total`);

            return attackResults;

        } finally {
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

    private async executeAttackOnVillage(page: Page, village: BarbarianVillageEntity, armyData: ArmyData, villageId: string, serverCode: string, strategy?: MiniAttackStrategyResponseDto): Promise<AttackResult> {
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

            // Check if there's a custom strategy for this server and village
            let attackResult: AttackResult;
            try {
                let attackStrategy: any;
                
                if (strategy) {
                    attackStrategy = strategy;
                    this.logger.log(`Using provided strategy for village ${villageId}: spear=${attackStrategy.spear}, sword=${attackStrategy.sword}, light=${attackStrategy.light}`);
                } else {
                    this.logger.debug(`Checking for strategy: serverId=${village.serverId}, villageId=${villageId} (type: ${typeof villageId})`);
                    attackStrategy = await this.miniAttackStrategiesService.findByServerAndVillage(village.serverId, villageId);
                    this.logger.log(`Found custom strategy for village ${villageId}: spear=${attackStrategy.spear}, sword=${attackStrategy.sword}, light=${attackStrategy.light}`);
                }

                // If strategy has spear and sword units, use performMiniAttackSpearSword
                if (attackStrategy.spear > 0 && attackStrategy.sword > 0) {
                    this.logger.log(`Using spear & sword attack strategy (${attackStrategy.spear} spear, ${attackStrategy.sword} sword)`);
                    attackResult = await AttackUtils.performMiniAttackSpearSword(page, barbarianVillage, villageId, serverCode, attackStrategy.spear, attackStrategy.sword);
                }
                // If strategy has only light cavalry, use performMiniAttack
                else if (attackStrategy.light > 0) {
                    this.logger.log(`Using light cavalry attack strategy (${attackStrategy.light} light)`);
                    attackResult = await AttackUtils.performMiniAttack(page, barbarianVillage, villageId, serverCode, attackStrategy.light);
                }
                // If strategy has other units, log error and return failure
                else {
                    this.logger.error(`Strategy has units not supported by current attack methods. No attack will be performed.`);
                    attackResult = {
                        success: false,
                        targetVillage: barbarianVillage,
                        error: 'Strategy has unsupported units - no attack performed'
                    };
                }

            } catch (strategyError) {
                // No strategy found - return failure instead of performing default attack
                this.logger.error(`No custom strategy found for village ${villageId}. Error: ${strategyError.message}. No attack will be performed.`);
                attackResult = {
                    success: false,
                    targetVillage: barbarianVillage,
                    error: `No strategy found for village ${villageId} - no attack performed`
                };
            }

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

    private async removeBarbarianVillage(target: string): Promise<void> {
        this.logger.log(`Removing barbarian village with target ${target} from database`);
        const result = await this.barbarianVillageRepository.delete({ target });
        if (result.affected === 0) {
            this.logger.warn(`No barbarian village found with target ${target} to delete.`);
        } else {
            this.logger.log(`Barbarian village with target ${target} deleted successfully.`);
        }
    }

    /**
     * Updates the canAttack flag for a specific barbarian village
     * @param target Village target ID
     * @param canAttack New canAttack flag value
     */
    private async updateCanAttackFlag(target: string, canAttack: boolean): Promise<void> {
        try {
            await this.barbarianVillageRepository.update({ target }, { canAttack });
            this.logger.log(`Updated canAttack flag for village ${target} to ${canAttack}`);
        } catch (error) {
            this.logger.error(`Failed to update canAttack flag for village ${target}:`, error);
            // Don't throw error here, just log it - we don't want to stop the attack process
        }
    }
} 