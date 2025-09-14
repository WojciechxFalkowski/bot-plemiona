import { Injectable } from '@nestjs/common';
import { PlayerVillageAttackStrategyEntity } from './entities/player-village-attack-strategy.entity';
import { CreatePlayerVillageAttackStrategyDto } from './dto/create-player-village-attack-strategy.dto';
import { UpdatePlayerVillageAttackStrategyDto } from './dto/update-player-village-attack-strategy.dto';

export const PLAYER_VILLAGE_ATTACK_STRATEGIES_ENTITY_REPOSITORY = 'PLAYER_VILLAGE_ATTACK_STRATEGIES_ENTITY_REPOSITORY';

@Injectable()
export abstract class PlayerVillageAttackStrategiesServiceContracts {
    abstract findAll(): Promise<PlayerVillageAttackStrategyEntity[]>;
    abstract findOne(id: number): Promise<PlayerVillageAttackStrategyEntity>;
    abstract create(createDto: CreatePlayerVillageAttackStrategyDto): Promise<PlayerVillageAttackStrategyEntity>;
    abstract update(id: number, updateDto: UpdatePlayerVillageAttackStrategyDto): Promise<PlayerVillageAttackStrategyEntity>;
    abstract remove(id: number): Promise<void>;
    abstract findByServerId(serverId: number): Promise<PlayerVillageAttackStrategyEntity[]>;
    abstract findByVillageId(serverId: number, villageId: string): Promise<PlayerVillageAttackStrategyEntity>;
}
