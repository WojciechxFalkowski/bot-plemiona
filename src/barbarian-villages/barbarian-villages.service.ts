import { Injectable, Inject, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Page } from 'playwright';
import { ConfigService } from '@nestjs/config';
import { BarbarianVillageEntity } from './entities/barbarian-village.entity';
import { BARBARIAN_VILLAGES_ENTITY_REPOSITORY } from './barbarian-villages.service.contracts';
import { CreateBarbarianVillageDto, UpdateBarbarianVillageDto } from './dto';
import { ArmyData, ArmyUtils } from '@/utils/army/army.utils';
import { AttackUtils, AttackResult, AttackCalculationResult, BarbarianVillage, LastAttackCheckResult } from '@/utils/army/attack.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { createBrowserPage } from '@/utils/browser.utils';

@Injectable()
export class BarbarianVillagesService {
    private readonly logger = new Logger(BarbarianVillagesService.name);
    private readonly credentials: PlemionaCredentials;

    // Configuration constants for village information
    private readonly WORLD_NUMBER = '216';
    private readonly VILLAGE_ID = '2197';

    constructor(
        @Inject(BARBARIAN_VILLAGES_ENTITY_REPOSITORY)
        private readonly barbarianVillageRepository: Repository<BarbarianVillageEntity>,
        private readonly settingsService: SettingsService,
        private readonly configService: ConfigService,
    ) {
        // Initialize credentials from environment variables
        this.credentials = AuthUtils.getCredentialsFromEnvironmentVariables(this.configService);
    }

    async findAll(): Promise<BarbarianVillageEntity[]> {
        return await this.barbarianVillageRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(target: string): Promise<BarbarianVillageEntity> {
        const village = await this.barbarianVillageRepository.findOne({
            where: { target }
        });

        if (!village) {
            throw new NotFoundException(`Barbarian village with target ${target} not found`);
        }

        return village;
    }

    async create(createBarbarianVillageDto: CreateBarbarianVillageDto): Promise<BarbarianVillageEntity> {
        // Check if village with this target already exists
        const existingVillage = await this.barbarianVillageRepository.findOne({
            where: { target: createBarbarianVillageDto.target }
        });

        if (existingVillage) {
            throw new ConflictException(`Barbarian village with target ${createBarbarianVillageDto.target} already exists`);
        }

        // Set default value for canAttack if not provided
        const villageData = {
            ...createBarbarianVillageDto,
            canAttack: createBarbarianVillageDto.canAttack ?? true
        };

        const village = this.barbarianVillageRepository.create(villageData);
        return await this.barbarianVillageRepository.save(village);
    }

    async update(target: string, updateBarbarianVillageDto: UpdateBarbarianVillageDto): Promise<BarbarianVillageEntity> {
        const village = await this.findOne(target);

        Object.assign(village, updateBarbarianVillageDto);

        return await this.barbarianVillageRepository.save(village);
    }

    async remove(target: string): Promise<void> {
        const village = await this.findOne(target);
        await this.barbarianVillageRepository.remove(village);
    }

    /**
     * Gets all barbarian villages that can be attacked (canAttack = true)
     * Since BarbarianVillage interface is now identical to BarbarianVillageEntity, no conversion needed
     */
    async getBarbarianVillagesForAttacks(): Promise<BarbarianVillage[]> {
        this.logger.debug('Loading attackable barbarian villages from database...');

        const villages = await this.barbarianVillageRepository.find({
            where: { canAttack: true },
            order: { target: 'ASC' }
        });

        this.logger.log(`Successfully loaded ${villages.length} attackable barbarian villages from database`);
        return villages;
    }

    /**
     * Gets the next target index for mini attacks from persistent storage (settings)
     * @returns Current target index (defaults to 0 if not set)
     */
    private async getNextTargetIndex(): Promise<number> {
        try {
            const setting = await this.settingsService.getSetting<{ value: number }>(SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX);
            const index = setting?.value ?? 0;
            this.logger.debug(`Retrieved next target index from settings: ${index}`);
            return index;
        } catch (error) {
            this.logger.error('Failed to get next target index from settings:', error);
            this.logger.debug('Using default target index: 0');
            return 0; // Default to first target
        }
    }

    /**
     * Saves the next target index for mini attacks to persistent storage (settings)
     * @param index Index to save
     */
    private async saveNextTargetIndex(index: number): Promise<void> {
        try {
            await this.settingsService.setSetting(SettingsKey.MINI_ATTACKS_NEXT_TARGET_INDEX, { value: index });
            this.logger.debug(`Saved next target index to settings: ${index}`);
        } catch (error) {
            this.logger.error(`Failed to save next target index (${index}) to settings:`, error);
            // Don't throw error here, just log it - we don't want to stop the attack process
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

    /**
     * Executes mini attacks on barbarian villages
     * Contains the complete attack logic including browser management and login
     */
    async executeMiniAttacks(): Promise<AttackResult[]> {
        this.logger.log('🗡️ Starting mini attacks task...');

        const { browser, context, page } = await createBrowserPage({ headless: true });

        try {
            // 1. Login and select world
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                this.credentials,
                this.settingsService
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                throw new Error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            }

            // 2. Get army data using ArmyUtils
            this.logger.log('⚔️ Checking army availability...');
            const armyData = await ArmyUtils.getArmyData(page, this.VILLAGE_ID, this.WORLD_NUMBER);

            // 3. Loading barbarian villages from database
            this.logger.log('📋 Loading barbarian villages...');
            const barbarianVillages = await this.getBarbarianVillagesForAttacks();

            if (barbarianVillages.length === 0) {
                this.logger.warn('No barbarian villages found in database');
                return [];
            }

            // 4. Get current target index from settings (persistent storage)
            let currentTargetIndex = await this.getNextTargetIndex();
            this.logger.log(`📍 Current target index: ${currentTargetIndex} (village: ${barbarianVillages[currentTargetIndex % barbarianVillages.length]?.name || 'unknown'})`);

            // 5. Check if we have enough troops for any attacks
            if (!AttackUtils.hasEnoughTroopsForAttack(armyData)) {
                this.logger.warn('❌ Insufficient troops for mini attacks. Need at least 2 spear + 2 sword units.');
                this.logger.log('🗡️ Mini attacks task completed - no attacks possible');
                return [];
            }

            // Calculate how many attacks we can perform based on available troops
            const attackCalculation = AttackUtils.calculateAvailableAttacks(armyData);

            // Ograniczenie: nie wysyłamy wszystkich dostępnych wojsk, tylko maksymalnie tyle ataków ile jest wiosek barbarzyńskich
            // Dodatkowo wybieramy minimum z dostępnych ataków i liczby wiosek, żeby nie wysyłać wszystkich wojsk naraz
            const maxPossibleAttacks = Math.min(attackCalculation.maxAttacks, barbarianVillages.length);

            this.logger.log(`📊 Troops available for ${attackCalculation.maxAttacks} attacks, but limiting to ${maxPossibleAttacks} attacks (max = min(${attackCalculation.maxAttacks}, ${barbarianVillages.length}))`);

            // 6. Performing attacks
            const attackResults: AttackResult[] = [];
            const startingIndex = currentTargetIndex;
            let attacksPerformed = 0;

            this.logger.log(`🎯 Starting attack sequence from target index ${currentTargetIndex}...`);

            for (let i = 0; i < maxPossibleAttacks; i++) {
                // 6.1. Selecting target based on nextTargetIndex
                const { village: targetVillage, nextIndex } = AttackUtils.getNextTarget(barbarianVillages, currentTargetIndex);

                this.logger.log(`🎯 Attack ${i + 1}/${maxPossibleAttacks}: Targeting ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

                try {
                    // 6.1.5. Check last attack result before performing new attack
                    this.logger.debug('Checking last attack result...');
                    const lastAttackCheck = await AttackUtils.checkLastAttackResult(page, targetVillage, this.VILLAGE_ID);

                    if (!lastAttackCheck.canAttack) {
                        this.logger.warn(`❌ Skipping attack on ${targetVillage.name}: ${lastAttackCheck.reason}`);

                        // Update canAttack flag to false in database
                        await this.updateCanAttackFlag(targetVillage.target, false);

                        // Move to next target
                        currentTargetIndex = nextIndex;
                        await this.saveNextTargetIndex(currentTargetIndex);

                        // Add skipped result to attack results
                        attackResults.push({
                            success: false,
                            targetVillage,
                            error: `Skipped: ${lastAttackCheck.reason}`
                        });

                        continue; // Skip to next village
                    }

                    this.logger.debug(`✅ Last attack check passed: ${lastAttackCheck.reason}`);

                    // 6.2. Performing attack
                    const attackResult = await AttackUtils.performMiniAttack(page, targetVillage, this.VILLAGE_ID);
                    attackResults.push(attackResult);

                    if (attackResult.success) {
                        attacksPerformed++;
                        this.logger.log(`✅ Attack ${i + 1} successful: ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);
                    } else {
                        this.logger.warn(`❌ Attack ${i + 1} failed: ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY}) - ${attackResult.error}`);
                    }

                    // 6.3. Updating nextTargetIndex
                    currentTargetIndex = nextIndex;
                    await this.saveNextTargetIndex(currentTargetIndex);

                    // Small delay between attacks to avoid overwhelming the server
                    if (i < maxPossibleAttacks - 1) {
                        this.logger.debug('⏳ Waiting 2 seconds before next attack...');
                        await page.waitForTimeout(2000);
                    }

                } catch (attackError) {
                    this.logger.error(`💥 Error during attack ${i + 1} on ${targetVillage.name}:`, attackError);

                    // Still update the target index to move to next village
                    currentTargetIndex = nextIndex;
                    await this.saveNextTargetIndex(currentTargetIndex);

                    // Add failed result
                    attackResults.push({
                        success: false,
                        targetVillage,
                        error: attackError.message
                    });

                    // Continue with next village instead of stopping
                    continue;
                }
            }

            // Log summary of all attacks
            AttackUtils.logAttackSummary(attackResults, maxPossibleAttacks, startingIndex, currentTargetIndex);

            this.logger.log(`🗡️ Mini attacks task completed: ${attacksPerformed}/${maxPossibleAttacks} successful attacks`);

            return attackResults;

        } catch (error) {
            this.logger.error('Error during mini attacks execution:', error);
            throw error;
        } finally {
            await browser.close();
        }
    }
} 