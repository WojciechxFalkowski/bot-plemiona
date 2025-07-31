import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from './entities/village.entity';
import { VILLAGES_ENTITY_REPOSITORY } from './villages.service.contracts';
import { VillageData, VillagesSyncResult } from './contracts/villages.contract';
import { VillageResponseDto, VillageToggleResponseDto, CreateVillageDto, UpdateVillageDto } from './dto';
import { SettingsService } from '@/settings/settings.service';
import { ConfigService } from '@nestjs/config';
import { createBrowserPage } from '@/utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { VillageUtils } from '@/utils/village/village.utils';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { ProfilePage, BasicVillageData, VillageCollectionResult } from '@/crawler/pages/profile.page';

@Injectable()
export class VillagesService {
	private readonly logger = new Logger(VillagesService.name);
	private readonly AUTO_REFRESH_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
	private readonly credentials: PlemionaCredentials;

	constructor(
		@Inject(VILLAGES_ENTITY_REPOSITORY)
		private readonly villageRepository: Repository<VillageEntity>,
		private settingsService: SettingsService,
		private plemionaCookiesService: PlemionaCookiesService,
		private configService: ConfigService,
		private serversService: ServersService
	) {
	}

	async findAll(serverId: number, autoRefresh = true): Promise<VillageEntity[]> {
		this.logger.debug(`Finding all villages for server ${serverId}`);

		const villages = await this.villageRepository.find({
			where: { serverId },
			order: { name: 'ASC' }
		});

		return villages.map(village => this.mapToResponseDto(village));
	}

	async findById(serverId: number, id: string): Promise<VillageResponseDto> {
		this.logger.debug(`Finding village ${id} for server ${serverId}`);

		const village = await this.villageRepository.findOne({
			where: { serverId, id }
		});

		if (!village) {
			throw new NotFoundException(`Village with ID ${id} not found on server ${serverId}`);
		}
		return this.mapToResponseDto(village);
	}

	async findByName(serverId: number, name: string): Promise<VillageResponseDto> {
		this.logger.debug(`Finding village "${name}" for server ${serverId}`);

		const village = await this.villageRepository.findOne({
			where: { serverId, name }
		});

		if (!village) {
			throw new NotFoundException(`Village with name "${name}" not found on server ${serverId}`);
		}
		return this.mapToResponseDto(village);
	}

	async findWithAutoScavenging(serverId: number): Promise<VillageResponseDto[]> {
		this.logger.debug(`Finding villages with auto-scavenging enabled for server ${serverId}`);

		const villages = await this.villageRepository.find({
			where: { serverId, isAutoScavengingEnabled: true },
			order: { name: 'ASC' }
		});

		return villages.map(village => this.mapToResponseDto(village));
	}

	async findWithAutoBuilding(serverId: number): Promise<VillageResponseDto[]> {
		this.logger.debug(`Finding villages with auto-building enabled for server ${serverId}`);

		const villages = await this.villageRepository.find({
			where: { serverId, isAutoBuildEnabled: true },
			order: { name: 'ASC' }
		});

		return villages.map(village => this.mapToResponseDto(village));
	}

	async toggleAutoScavenging(serverId: number, id: string): Promise<VillageToggleResponseDto> {
		this.logger.debug(`Toggling auto-scavenging for village ${id} on server ${serverId}`);

		const village = await this.villageRepository.findOne({
			where: { serverId, id }
		});

		if (!village) {
			throw new NotFoundException(`Village with ID ${id} not found on server ${serverId}`);
		}

		village.isAutoScavengingEnabled = !village.isAutoScavengingEnabled;
		await this.villageRepository.save(village);

		this.logger.log(`Auto-scavenging ${village.isAutoScavengingEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${id}) on server ${serverId}`);

		return {
			id: village.id,
			isAutoScavengingEnabled: village.isAutoScavengingEnabled
		};
	}

	async toggleAutoBuilding(serverId: number, id: string): Promise<VillageToggleResponseDto> {
		this.logger.debug(`Toggling auto-building for village ${id} on server ${serverId}`);

		const village = await this.villageRepository.findOne({
			where: { serverId, id }
		});

		if (!village) {
			throw new NotFoundException(`Village with ID ${id} not found on server ${serverId}`);
		}

		village.isAutoBuildEnabled = !village.isAutoBuildEnabled;
		await this.villageRepository.save(village);

		this.logger.log(`Auto-building ${village.isAutoBuildEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${id}) on server ${serverId}`);

		return {
			id: village.id,
			isAutoBuildEnabled: village.isAutoBuildEnabled
		};
	}

	async toggleAutoScavengingByName(serverId: number, name: string): Promise<VillageToggleResponseDto> {
		this.logger.debug(`Toggling auto-scavenging for village "${name}" on server ${serverId}`);

		const village = await this.villageRepository.findOne({
			where: { serverId, name }
		});

		if (!village) {
			throw new NotFoundException(`Village with name "${name}" not found on server ${serverId}`);
		}

		village.isAutoScavengingEnabled = !village.isAutoScavengingEnabled;
		await this.villageRepository.save(village);

		this.logger.log(`Auto-scavenging ${village.isAutoScavengingEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${village.id}) on server ${serverId}`);

		return {
			id: village.id,
			isAutoScavengingEnabled: village.isAutoScavengingEnabled
		};
	}

	async toggleAutoBuildingByName(serverId: number, name: string): Promise<VillageToggleResponseDto> {
		this.logger.debug(`Toggling auto-building for village "${name}" on server ${serverId}`);

		const village = await this.villageRepository.findOne({
			where: { serverId, name }
		});

		if (!village) {
			throw new NotFoundException(`Village with name "${name}" not found on server ${serverId}`);
		}

		village.isAutoBuildEnabled = !village.isAutoBuildEnabled;
		await this.villageRepository.save(village);

		this.logger.log(`Auto-building ${village.isAutoBuildEnabled ? 'enabled' : 'disabled'} for village ${village.name} (${village.id}) on server ${serverId}`);

		return {
			id: village.id,
			isAutoBuildEnabled: village.isAutoBuildEnabled
		};
	}

	async syncVillages(serverId: number, villageDataList: BasicVillageData[]): Promise<VillagesSyncResult> {
		this.logger.log(`Syncing ${villageDataList.length} villages from crawler data for server ${serverId}`);

		const existingVillages = await this.villageRepository.find({
			where: { serverId }
		});

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
					this.logger.log(`Updated village ${villageData.name} (${villageData.id}) on server ${serverId}`);
				}
			} else {
				// Add new village
				const newVillage = this.villageRepository.create({
					id: villageId,
					serverId,
					name: villageData.name,
					coordinates: villageData.coordinates,
					isAutoBuildEnabled: false,
					isAutoScavengingEnabled: false
				});
				await this.villageRepository.save(newVillage);
				added++;
				this.logger.log(`Added new village ${villageData.name} (${villageData.id}) on server ${serverId}`);
			}
		}

		// Remove villages that no longer exist
		for (const existingVillage of existingVillages) {
			if (!incomingVillageIds.has(existingVillage.id)) {
				await this.villageRepository.remove(existingVillage);
				deleted++;
				this.logger.log(`Deleted village ${existingVillage.name} (${existingVillage.id}) from server ${serverId}`);
			}
		}

		const result: VillagesSyncResult = {
			totalProcessed: villageDataList.length,
			added,
			updated,
			deleted,
			currentTotal: await this.villageRepository.count({ where: { serverId } })
		};

		this.logger.log(`Village sync completed for server ${serverId}: ${JSON.stringify(result)}`);
		return result;
	}

	async create(serverId: number, createVillageDto: CreateVillageDto): Promise<VillageResponseDto> {
		this.logger.log(`Creating village for server ${serverId}: ${JSON.stringify(createVillageDto)}`);

		// Check if village already exists on this server
		const existingVillage = await this.villageRepository.findOne({
			where: { serverId, id: createVillageDto.id }
		});

		if (existingVillage) {
			throw new Error(`Village with ID ${createVillageDto.id} already exists on server ${serverId}`);
		}

		const village = this.villageRepository.create({
			...createVillageDto,
			serverId
		});

		const savedVillage = await this.villageRepository.save(village);
		this.logger.log(`Village created successfully: ${savedVillage.name} (${savedVillage.id}) on server ${serverId}`);

		return this.mapToResponseDto(savedVillage);
	}

	async update(serverId: number, id: string, updateVillageDto: UpdateVillageDto): Promise<VillageResponseDto> {
		this.logger.log(`Updating village ${id} on server ${serverId}: ${JSON.stringify(updateVillageDto)}`);

		const village = await this.villageRepository.findOne({
			where: { serverId, id }
		});

		if (!village) {
			throw new NotFoundException(`Village with ID ${id} not found on server ${serverId}`);
		}

		// Update properties
		Object.assign(village, updateVillageDto);
		const savedVillage = await this.villageRepository.save(village);

		this.logger.log(`Village updated successfully: ${savedVillage.name} (${savedVillage.id}) on server ${serverId}`);
		return this.mapToResponseDto(savedVillage);
	}

	async delete(serverId: number, id: string): Promise<void> {
		this.logger.log(`Deleting village ${id} from server ${serverId}`);

		const village = await this.villageRepository.findOne({
			where: { serverId, id }
		});

		if (!village) {
			throw new NotFoundException(`Village with ID ${id} not found on server ${serverId}`);
		}

		await this.villageRepository.remove(village);
		this.logger.log(`Village deleted successfully: ${village.name} (${id}) from server ${serverId}`);
	}

	/**
  * Pobiera tylko podstawowe informacje o wioskach (szybka metoda)
  * Automatycznie zapisuje dane do bazy danych
  * @param options - Opcje zbierania danych
  * @returns Promise z podstawowymi danymi wiosek
  */
	public async getOverviewVillageInformation(serverId: number, options?: {
		headless?: boolean;
		timeoutPerPage?: number;
		saveToDatabase?: boolean;
	}): Promise<BasicVillageData[]> {
		const { headless = true, timeoutPerPage = 15000, saveToDatabase = true } = options || {};

		this.logger.log('Starting basic village information collection...');
		const { browser, context, page } = await createBrowserPage({ headless });

		try {
			const server = await this.serversService.findById(serverId);
			// Zaloguj się i wybierz świat
			const loginResult = await AuthUtils.loginAndSelectWorld(
				page,
				this.credentials,
				this.plemionaCookiesService,
				server.serverName
			);

			if (!loginResult.success) {
				throw new Error(`Login failed: ${loginResult.error}`);
			}

			// Użyj ProfilePage do zbierania podstawowych danych (działa bez premium)
			const collectionResult = await ProfilePage.collectVillageInformationFromProfile(
				page,
				server.serverCode,
				{ timeoutPerPage }
			);


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

	async refreshVillageData(serverId: number): Promise<VillagesSyncResult> {
		this.logger.log(`Starting village data refresh for server ${serverId}...`);

		// const villageData = await VillageUtils.extractVillageInformation(page);
		const villageData = await this.getOverviewVillageInformation(serverId, {
			headless: true,
			timeoutPerPage: 15000,
			saveToDatabase: true
		});
		this.logger.log(`Extracted ${villageData.length} villages from server ${serverId}`);

		// Sync villages with database
		const syncResult = await this.syncVillages(serverId, villageData);

		this.logger.log(`Village data refresh completed for server ${serverId}: ${JSON.stringify(syncResult)}`);
		return syncResult;
	}

	async getVillageCount(serverId: number): Promise<number> {
		return this.villageRepository.count({ where: { serverId } });
	}

	async getAutoScavengingCount(serverId: number): Promise<number> {
		return this.villageRepository.count({
			where: { serverId, isAutoScavengingEnabled: true }
		});
	}

	async getAutoBuildingCount(serverId: number): Promise<number> {
		return this.villageRepository.count({
			where: { serverId, isAutoBuildEnabled: true }
		});
	}

	async shouldAutoRefresh(serverId: number): Promise<boolean> {
		const latestVillage = await this.villageRepository.findOne({
			where: { serverId },
			order: { updatedAt: 'DESC' }
		});

		if (!latestVillage) {
			return true; // No villages exist, should refresh
		}

		const timeSinceLastUpdate = Date.now() - latestVillage.updatedAt.getTime();
		return timeSinceLastUpdate > this.AUTO_REFRESH_THRESHOLD_MS;
	}

	async deleteAllForServer(serverId: number): Promise<void> {
		this.logger.log(`Deleting all villages for server ${serverId}`);

		await this.villageRepository.delete({ serverId });

		this.logger.log(`All villages deleted for server ${serverId}`);
	}

	public mapToResponseDto(village: VillageEntity): VillageResponseDto {
		return {
			id: village.id,
			serverId: village.serverId,
			name: village.name,
			coordinates: village.coordinates,
			isAutoBuildEnabled: village.isAutoBuildEnabled,
			isAutoScavengingEnabled: village.isAutoScavengingEnabled,
			createdAt: village.createdAt,
			updatedAt: village.updatedAt
		};
	}
} 