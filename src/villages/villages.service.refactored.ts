import { Inject, Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageEntity } from './entities/village.entity';
import { VILLAGES_ENTITY_REPOSITORY } from './villages.service.contracts';
import { VillagesSyncResult } from './contracts/villages.contract';
import { VillageResponseDto, VillageToggleResponseDto, CreateVillageDto, UpdateVillageDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { BasicVillageData } from '@/crawler/pages/profile.page';
import {
    findAllVillagesOperation,
    findVillageByIdOperation,
    findVillageByNameOperation,
    findVillagesWithAutoScavengingOperation,
    findVillagesWithAutoBuildingOperation,
    toggleAutoScavengingOperation,
    toggleAutoBuildingOperation,
    toggleAutoScavengingByNameOperation,
    toggleAutoBuildingByNameOperation,
    createVillageOperation,
    updateVillageOperation,
    deleteVillageOperation,
    deleteAllVillagesForServerOperation,
    syncVillagesOperation,
    refreshVillageDataOperation,
    getOverviewVillageInformationOperation,
    mapToResponseDtoOperation,
    getVillageCountOperation,
    getAutoScavengingCountOperation,
    getAutoBuildingCountOperation,
    shouldAutoRefreshOperation,
    FindAllVillagesDependencies,
    FindVillageByIdDependencies,
    FindVillageByNameDependencies,
    FindVillagesWithAutoScavengingDependencies,
    FindVillagesWithAutoBuildingDependencies,
    ToggleAutoScavengingDependencies,
    ToggleAutoBuildingDependencies,
    ToggleAutoScavengingByNameDependencies,
    ToggleAutoBuildingByNameDependencies,
    CreateVillageDependencies,
    UpdateVillageDependencies,
    DeleteVillageDependencies,
    DeleteAllVillagesForServerDependencies,
    SyncVillagesDependencies,
    RefreshVillageDataDependencies,
    GetOverviewVillageInformationDependencies,
    GetVillageCountDependencies,
    GetAutoScavengingCountDependencies,
    GetAutoBuildingCountDependencies,
    ShouldAutoRefreshDependencies
} from './operations';

@Injectable()
export class VillagesService {
    private readonly logger = new Logger(VillagesService.name);
    private readonly AUTO_REFRESH_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
    private readonly credentials: PlemionaCredentials;

    constructor(
        @Inject(VILLAGES_ENTITY_REPOSITORY)
        private readonly villageRepository: Repository<VillageEntity>,
        private plemionaCookiesService: PlemionaCookiesService,
        private configService: ConfigService,
        private serversService: ServersService
    ) {
        this.credentials = {
            username: this.configService.get<string>('PLEMIONA_USERNAME') || '',
        };
    }

    async findAll(serverId: number, autoRefresh = true): Promise<VillageResponseDto[]> {
        return findAllVillagesOperation(serverId, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async findById(serverId: number, id: string): Promise<VillageResponseDto> {
        return findVillageByIdOperation(serverId, id, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async findByName(serverId: number, name: string): Promise<VillageResponseDto> {
        return findVillageByNameOperation(serverId, name, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async findWithAutoScavenging(serverId: number): Promise<VillageResponseDto[]> {
        return findVillagesWithAutoScavengingOperation(serverId, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async findWithAutoBuilding(serverId: number): Promise<VillageResponseDto[]> {
        return findVillagesWithAutoBuildingOperation(serverId, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async toggleAutoScavenging(serverId: number, id: string): Promise<VillageToggleResponseDto> {
        return toggleAutoScavengingOperation(serverId, id, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async toggleAutoBuilding(serverId: number, id: string): Promise<VillageToggleResponseDto> {
        return toggleAutoBuildingOperation(serverId, id, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async toggleAutoScavengingByName(serverId: number, name: string): Promise<VillageToggleResponseDto> {
        return toggleAutoScavengingByNameOperation(serverId, name, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async toggleAutoBuildingByName(serverId: number, name: string): Promise<VillageToggleResponseDto> {
        return toggleAutoBuildingByNameOperation(serverId, name, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async syncVillages(serverId: number, villageDataList: BasicVillageData[]): Promise<VillagesSyncResult> {
        return syncVillagesOperation(serverId, villageDataList, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async create(serverId: number, createVillageDto: CreateVillageDto): Promise<VillageResponseDto> {
        return createVillageOperation(serverId, createVillageDto, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async update(serverId: number, id: string, updateVillageDto: UpdateVillageDto): Promise<VillageResponseDto> {
        return updateVillageOperation(serverId, id, updateVillageDto, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    async delete(serverId: number, id: string): Promise<void> {
        return deleteVillageOperation(serverId, id, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    public async getOverviewVillageInformation(serverId: number, options?: {
        headless?: boolean;
        timeoutPerPage?: number;
        saveToDatabase?: boolean;
    }): Promise<BasicVillageData[]> {
        return getOverviewVillageInformationOperation(serverId, options || {}, {
            logger: this.logger,
            serversService: this.serversService,
            credentials: this.credentials,
            plemionaCookiesService: this.plemionaCookiesService
        });
    }

    async refreshVillageData(serverId: number): Promise<VillagesSyncResult> {
        return refreshVillageDataOperation(serverId, {
            logger: this.logger,
            serversService: this.serversService,
            syncVillagesDeps: {
                villageRepository: this.villageRepository,
                logger: this.logger
            },
            getOverviewVillageInformationDeps: {
                logger: this.logger,
                serversService: this.serversService,
                credentials: this.credentials,
                plemionaCookiesService: this.plemionaCookiesService
            }
        });
    }

    async getVillageCount(serverId: number): Promise<number> {
        return getVillageCountOperation(serverId, {
            villageRepository: this.villageRepository
        });
    }

    async getAutoScavengingCount(serverId: number): Promise<number> {
        return getAutoScavengingCountOperation(serverId, {
            villageRepository: this.villageRepository
        });
    }

    async getAutoBuildingCount(serverId: number): Promise<number> {
        return getAutoBuildingCountOperation(serverId, {
            villageRepository: this.villageRepository
        });
    }

    async shouldAutoRefresh(serverId: number): Promise<boolean> {
        return shouldAutoRefreshOperation(serverId, this.AUTO_REFRESH_THRESHOLD_MS, {
            villageRepository: this.villageRepository
        });
    }

    async deleteAllForServer(serverId: number): Promise<void> {
        return deleteAllVillagesForServerOperation(serverId, {
            villageRepository: this.villageRepository,
            logger: this.logger
        });
    }

    public mapToResponseDto(village: VillageEntity): VillageResponseDto {
        return mapToResponseDtoOperation(village);
    }
}

