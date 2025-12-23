import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { VillagesService } from '@/villages/villages.service';
import { ArmyTrainingStrategyResponseDto } from './dto/army-training-strategy-response.dto';
import { UnitDefinition } from '@/utils/army/armyPage/unitDefinitions';
import { Page } from 'playwright';
import { ArmyData } from '@/utils/army/army.utils';
import {
    getArmyDataOperation,
    GetArmyDataDependencies,
    getUnitsInProductionOperation,
    GetUnitsInProductionDependencies,
    startTrainingLightOperation,
    StartTrainingLightDependencies,
    startTrainingUnitsOperation,
    StartTrainingUnitsDependencies,
} from './operations';

@Injectable()
export class ArmyTrainingService {
    private readonly logger = new Logger(ArmyTrainingService.name);
    private readonly credentials: PlemionaCredentials;
    private readonly MAX_IN_QUEUE_LIGHT = 10;

    constructor(
        @Inject(forwardRef(() => ServersService))
        private readonly serversService: ServersService,
        private readonly plemionaCookiesService: PlemionaCookiesService,
        @Inject(forwardRef(() => VillagesService))
        private readonly villagesService: VillagesService,
        private readonly configService: ConfigService,
    ) {
        this.credentials = {
            username: this.configService.get<string>('PLEMIONA_USERNAME') || '',
        };
    }

    /**
     * Zwraca obiekt z wszystkimi zależnościami potrzebnymi przez operacje
     */
    private getDependencies(): GetArmyDataDependencies & GetUnitsInProductionDependencies & StartTrainingLightDependencies & StartTrainingUnitsDependencies {
        return {
            serversService: this.serversService,
            credentials: this.credentials,
            plemionaCookiesService: this.plemionaCookiesService,
            villagesService: this.villagesService,
            logger: this.logger,
        };
    }

    /**
     * Pobiera dane armii z gry
     */
    public async getArmyData(villageId: string, serverId: number): Promise<ArmyData> {
        return getArmyDataOperation(villageId, serverId, this.getDependencies());
    }

    /**
     * Rozpoczyna trening lekkich jednostek
     */
    public async startTrainingLight(
        page: Page,
        villageId: string,
        serverId: number,
        lightUnit: UnitDefinition | undefined,
        maxRecruitment: number = 4
    ) {
        return startTrainingLightOperation(
            page,
            villageId,
            serverId,
            lightUnit,
            maxRecruitment,
            this.MAX_IN_QUEUE_LIGHT,
            this.getDependencies()
        );
    }

    /**
     * Pobiera jednostki w produkcji
     */
    public async getUnitsInProduction(villageId: string, serverId: number) {
        return getUnitsInProductionOperation(villageId, serverId, this.getDependencies());
    }

    /**
     * Rozpoczyna trening jednostek zgodnie ze strategią
     */
    public async startTrainingUnits(strategy: ArmyTrainingStrategyResponseDto, serverId: number) {
        return startTrainingUnitsOperation(strategy, serverId, this.getDependencies());
    }
}
