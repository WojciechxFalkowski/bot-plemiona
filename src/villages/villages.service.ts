import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from './villages.entity';
import { VILLAGES_ENTITY_REPOSITORY } from './villages.service.contracts';
import { VillageData, VillagesSyncResult } from './contracts/villages.contract';
import { VillageResponseDto, VillageToggleResponseDto, CreateVillageDto, UpdateVillageDto } from './dto';
import { PlemionaCredentials } from '@/crawler/utils/auth.interfaces';
import { SettingsService } from '@/settings/settings.service';
import { ConfigService } from '@nestjs/config';
import { AuthUtils } from '@/crawler/utils/auth.utils';
import { createBrowserPage } from '@/utils/browser.utils';
import { VillageUtils } from '@/crawler/utils/village.utils';

@Injectable()
export class VillagesService {
	private readonly logger = new Logger(VillagesService.name);
	private readonly AUTO_REFRESH_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
	private readonly credentials: PlemionaCredentials;

	constructor(
		@Inject(VILLAGES_ENTITY_REPOSITORY)
		private readonly villageRepository: Repository<VillageEntity>,
		private settingsService: SettingsService,
		private configService: ConfigService
	) {
		// Initialize credentials from environment variables with default values if not set
		this.credentials = AuthUtils.getCredentialsFromEnvironmentVariables(this.configService);

		// Validate credentials
		const validation = AuthUtils.validateCredentials(this.credentials);
		if (!validation.isValid) {
			this.logger.warn(`Invalid credentials: missing fields: ${validation.missingFields.join(', ')}, errors: ${validation.errors.join(', ')}. Fallback to cookies will be attempted.`);
		} else {
			this.logger.log('Plemiona credentials loaded from environment variables successfully.');
		}
	}

	async findAll(autoRefresh = true): Promise<VillageEntity[]> {

		// if (autoRefresh && await this.shouldAutoRefresh()) {
		// 	this.logger.log('Villages data is older than 1 hour, triggering background refresh');
		// 	// Don't await - let it run in background
		// 	this.refreshVillageData().catch(error => {
		// 		this.logger.error('Background village refresh failed:', error);
		// 	});
		// }

		const villages = await this.villageRepository.find({
			order: { name: 'ASC' }
		});

		return villages.map(village => this.mapToResponseDto(village));
	}

	async findById(id: string): Promise<VillageResponseDto> {
		const village = await this.villageRepository.findOne({ where: { id } });
		if (!village) {
			throw new NotFoundException(`Village with ID ${id} not found`);
		}
		return this.mapToResponseDto(village);
	}

	async findByName(name: string): Promise<VillageResponseDto> {
		const village = await this.villageRepository.findOne({ where: { name } });
		if (!village) {
			throw new NotFoundException(`Village with name "${name}" not found`);
		}
		return this.mapToResponseDto(village);
	}

	async findWithAutoScavenging(): Promise<VillageResponseDto[]> {
		const villages = await this.villageRepository.find({
			where: { isAutoScavengingEnabled: true },
			order: { name: 'ASC' }
		});

		return villages.map(village => this.mapToResponseDto(village));
	}

	async findWithAutoBuilding(): Promise<VillageResponseDto[]> {
		const villages = await this.villageRepository.find({
			where: { isAutoBuildEnabled: true },
			order: { name: 'ASC' }
		});

		return villages.map(village => this.mapToResponseDto(village));
	}

	async toggleAutoScavenging(id: string): Promise<VillageToggleResponseDto> {
		const village = await this.villageRepository.findOne({ where: { id } });
		if (!village) {
			throw new NotFoundException(`Village with ID ${id} not found`);
		}

		village.isAutoScavengingEnabled = !village.isAutoScavengingEnabled;
		await this.villageRepository.save(village);

		this.logger.log(`Auto-scavenging ${village.isAutoScavengingEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${id})`);

		return {
			id: village.id,
			isAutoScavengingEnabled: village.isAutoScavengingEnabled
		};
	}

	async toggleAutoBuilding(id: string): Promise<VillageToggleResponseDto> {
		const village = await this.villageRepository.findOne({ where: { id } });
		if (!village) {
			throw new NotFoundException(`Village with ID ${id} not found`);
		}

		village.isAutoBuildEnabled = !village.isAutoBuildEnabled;
		await this.villageRepository.save(village);

		this.logger.log(`Auto-building ${village.isAutoBuildEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${id})`);

		return {
			id: village.id,
			isAutoBuildEnabled: village.isAutoBuildEnabled
		};
	}

	async toggleAutoScavengingByName(name: string): Promise<VillageToggleResponseDto> {
		const village = await this.villageRepository.findOne({ where: { name } });
		if (!village) {
			throw new NotFoundException(`Village with name "${name}" not found`);
		}

		village.isAutoScavengingEnabled = !village.isAutoScavengingEnabled;
		await this.villageRepository.save(village);

		this.logger.log(`Auto-scavenging ${village.isAutoScavengingEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${village.id})`);

		return {
			id: village.id,
			isAutoScavengingEnabled: village.isAutoScavengingEnabled
		};
	}

	async toggleAutoBuildingByName(name: string): Promise<VillageToggleResponseDto> {
		const village = await this.villageRepository.findOne({ where: { name } });
		if (!village) {
			throw new NotFoundException(`Village with name "${name}" not found`);
		}

		village.isAutoBuildEnabled = !village.isAutoBuildEnabled;
		await this.villageRepository.save(village);

		this.logger.log(`Auto-building ${village.isAutoBuildEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${village.id})`);

		return {
			id: village.id,
			isAutoBuildEnabled: village.isAutoBuildEnabled
		};
	}

	async syncVillages(villageDataList: VillageData[]): Promise<VillagesSyncResult> {
		this.logger.log(`Syncing ${villageDataList.length} villages from crawler data`);

		const existingVillages = await this.villageRepository.find();
		const existingVillageIds = new Set(existingVillages.map(v => v.id));
		const incomingVillageIds = new Set(villageDataList.map(v => v.id));

		let added = 0;
		let updated = 0;
		let deleted = 0;

		// Add new villages and update existing ones
		for (const villageData of villageDataList) {
			const villageId = villageData.id;
			const existingVillage = existingVillages.find(v => v.id === villageId);

			if (existingVillage) {
				// Always update to refresh the updatedAt timestamp
				let hasChanges = false;
				if (existingVillage.name !== villageData.name || existingVillage.coordinates !== villageData.coordinates) {
					existingVillage.name = villageData.name;
					existingVillage.coordinates = villageData.coordinates;
					hasChanges = true;
				}

				// Always save to update the updatedAt timestamp
				await this.villageRepository.save(existingVillage);

				if (hasChanges) {
					updated++;
					this.logger.log(`Updated village ${villageData.name} (${villageData.id})`);
				}
			} else {
				// Add new village
				const newVillage = this.villageRepository.create({
					id: villageId,
					name: villageData.name,
					coordinates: villageData.coordinates,
					isAutoBuildEnabled: false,
					isAutoScavengingEnabled: false
				});
				await this.villageRepository.save(newVillage);
				added++;
				this.logger.log(`Added new village ${villageData.name} (${villageData.id})`);
			}
		}

		// Remove villages that no longer exist
		for (const existingVillage of existingVillages) {
			if (!incomingVillageIds.has(existingVillage.id)) {
				this.logger.log(`Skipping deletion of village ${existingVillage.name} (${existingVillage.id}) because it still exists in the database`);
				// await this.villageRepository.remove(existingVillage);
				deleted++;
				this.logger.log(`Deleted village ${existingVillage.name} (${existingVillage.id})`);
			}
		}

		const result: VillagesSyncResult = {
			added,
			updated,
			deleted,
			total: villageDataList.length
		};

		this.logger.log(`Village sync completed: ${JSON.stringify(result)}`);
		return result;
	}

	async refreshVillageData(): Promise<VillagesSyncResult> {
		console.log('refreshVillageData');

		const villages = await this.getOverviewVillageInformation({
			headless: true,
			timeoutPerPage: 15000,
			saveToDatabase: true
		});

		return this.syncVillages(villages);
	}

	private async shouldAutoRefresh(): Promise<boolean> {
		const latestVillages = await this.villageRepository.find({
			order: { updatedAt: 'DESC' },
			take: 1
		});

		if (latestVillages.length === 0) {
			return true; // No villages exist, should refresh
		}

		const latestVillage = latestVillages[0];

		// Get current time from database to ensure timezone consistency
		const result = await this.villageRepository.query('SELECT CURRENT_TIMESTAMP as now');
		const dbNow = new Date(result[0].now);

		const lastUpdate = latestVillage.updatedAt;
		const timeSinceUpdate = dbNow.getTime() - lastUpdate.getTime();
		const timeSinceUpdateMinutes = Math.floor(timeSinceUpdate / (1000 * 60));
		const thresholdMinutes = Math.floor(this.AUTO_REFRESH_THRESHOLD_MS / (1000 * 60));

		this.logger.debug(`Auto-refresh check:
			Current time (DB): ${dbNow.toISOString()}
			Last update (DB): ${lastUpdate.toISOString()}
			Time since update: ${timeSinceUpdateMinutes} minutes
			Threshold: ${thresholdMinutes} minutes
			Should refresh: ${timeSinceUpdate > this.AUTO_REFRESH_THRESHOLD_MS}`);

		return timeSinceUpdate > this.AUTO_REFRESH_THRESHOLD_MS;
	}

	public mapToResponseDto(village: VillageEntity): VillageEntity {
		return {
			id: village.id,
			name: village.name,
			coordinates: village.coordinates,
			isAutoBuildEnabled: village.isAutoBuildEnabled,
			isAutoScavengingEnabled: village.isAutoScavengingEnabled,
			createdAt: village.createdAt,
			updatedAt: village.updatedAt
		};
	}

	/**
  * Pobiera tylko podstawowe informacje o wioskach (szybka metoda)
  * Automatycznie zapisuje dane do bazy danych
  * @param options - Opcje zbierania danych
  * @returns Promise z podstawowymi danymi wiosek
  */
	public async getOverviewVillageInformation(options?: {
		headless?: boolean;
		timeoutPerPage?: number;
		saveToDatabase?: boolean;
	}): Promise<VillageData[]> {
		const { headless = true, timeoutPerPage = 15000, saveToDatabase = true } = options || {};

		this.logger.log('Starting basic village information collection...');
		const { browser, context, page } = await createBrowserPage({ headless });

		try {
			// Zaloguj się i wybierz świat
			const loginResult = await AuthUtils.loginAndSelectWorld(
				page,
				this.credentials,
				this.settingsService
			);

			if (!loginResult.success) {
				throw new Error(`Login failed: ${loginResult.error}`);
			}

			// Użyj VillageUtils do szybkiego zbierania podstawowych danych
			const collectionResult = await VillageUtils.collectBasicVillageInformation(page, {
				timeoutPerPage
			});

			if (collectionResult.success) {
				this.logger.log(`Successfully collected basic data for ${collectionResult.villagesProcessed} villages`);
				return collectionResult.data;
			} else {
				this.logger.error('Failed to collect basic village information');
				if (collectionResult.errors.length > 0) {
					collectionResult.errors.forEach(error => {
						this.logger.error(`Error in village ${error.villageName}: ${error.error}`);
					});
				}
				return [];
			}

		} catch (error) {
			this.logger.error('Error during basic village information collection:', error);
			return [];
		} finally {
			// Zamknij przeglądarkę
			if (browser) {
				await browser.close();
				this.logger.log('Browser closed after basic village information collection.');
			}
		}
	}

	async createVillage(dto: CreateVillageDto): Promise<VillageResponseDto> {
		const exists = await this.villageRepository.findOne({ where: { id: dto.id } });
		if (exists) {
			throw new Error(`Village with ID ${dto.id} already exists`);
		}
		const village = this.villageRepository.create({
			id: dto.id,
			name: dto.name,
			coordinates: dto.coordinates,
			isAutoBuildEnabled: dto.isAutoBuildEnabled ?? false,
			isAutoScavengingEnabled: dto.isAutoScavengingEnabled ?? false
		});
		await this.villageRepository.save(village);
		return this.mapToResponseDto(village);
	}

	async updateVillage(id: string, dto: UpdateVillageDto): Promise<VillageResponseDto> {
		const village = await this.villageRepository.findOne({ where: { id } });
		if (!village) {
			throw new NotFoundException(`Village with ID ${id} not found`);
		}
		if (dto.isAutoBuildEnabled !== undefined) {
			village.isAutoBuildEnabled = dto.isAutoBuildEnabled;
		}
		if (dto.isAutoScavengingEnabled !== undefined) {
			village.isAutoScavengingEnabled = dto.isAutoScavengingEnabled;
		}
		await this.villageRepository.save(village);
		return this.mapToResponseDto(village);
	}

	async deleteVillage(id: string): Promise<{ message: string }> {
		const village = await this.villageRepository.findOne({ where: { id } });
		if (!village) {
			throw new NotFoundException(`Village with ID ${id} not found`);
		}
		await this.villageRepository.remove(village);
		return { message: `Village with ID ${id} deleted` };
	}
} 