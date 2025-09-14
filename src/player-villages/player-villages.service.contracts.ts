import { Injectable } from '@nestjs/common';
import { PlayerVillageEntity } from './entities/player-village.entity';
import { CreatePlayerVillageDto } from './dto/create-player-village.dto';
import { UpdatePlayerVillageDto } from './dto/update-player-village.dto';

export const PLAYER_VILLAGES_ENTITY_REPOSITORY = 'PLAYER_VILLAGES_ENTITY_REPOSITORY';

@Injectable()
export abstract class PlayerVillagesServiceContracts {
    abstract findAll(): Promise<PlayerVillageEntity[]>;
    abstract findOne(id: number): Promise<PlayerVillageEntity>;
    abstract create(createPlayerVillageDto: CreatePlayerVillageDto): Promise<PlayerVillageEntity>;
    abstract update(id: number, updatePlayerVillageDto: UpdatePlayerVillageDto): Promise<PlayerVillageEntity>;
    abstract remove(id: number): Promise<void>;
    abstract findByServerId(serverId: number): Promise<PlayerVillageEntity[]>;
    abstract findAttackableVillages(serverId: number): Promise<PlayerVillageEntity[]>;
    abstract verifyVillageOwner(id: number, page: any, serverCode: string): Promise<any>;
    abstract updateVillageData(id: number, villageData: any): Promise<PlayerVillageEntity>;
}
