import { Module } from '@nestjs/common';
import { PlayerVillagesService } from './player-villages.service';
import { PlayerVillageAttackStrategiesService } from './player-village-attack-strategies.service';
import { PlayerVillagesController } from './player-villages.controller';
import { PlayerVillageAttackStrategiesController } from './player-village-attack-strategies.controller';
import { playerVillagesProviders } from './player-villages.service.providers';
import { playerVillageAttackStrategiesProviders } from './player-village-attack-strategies.service.providers';
import { DatabaseModule } from '@/database/database.module';
import { ServersModule } from '@/servers/servers.module';
import { SettingsModule } from '@/settings/settings.module';
import { PlemionaCookiesModule } from '@/plemiona-cookies/plemiona-cookies.module';

@Module({
    imports: [
        DatabaseModule,
        ServersModule,
        SettingsModule,
        PlemionaCookiesModule,
    ],
    controllers: [
        PlayerVillagesController,
        PlayerVillageAttackStrategiesController,
    ],
    providers: [
        ...playerVillagesProviders,
        ...playerVillageAttackStrategiesProviders,
        PlayerVillagesService,
        PlayerVillageAttackStrategiesService,
    ],
    exports: [
        PlayerVillagesService,
        PlayerVillageAttackStrategiesService,
    ],
})
export class PlayerVillagesModule {}
