import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PlayerVillageAttackStrategyEntity } from './entities/player-village-attack-strategy.entity';
import { CreatePlayerVillageAttackStrategyDto } from './dto/create-player-village-attack-strategy.dto';
import { UpdatePlayerVillageAttackStrategyDto } from './dto/update-player-village-attack-strategy.dto';
import { PlayerVillageAttackStrategiesServiceContracts, PLAYER_VILLAGE_ATTACK_STRATEGIES_ENTITY_REPOSITORY } from './player-village-attack-strategies.service.contracts';
import { ServersService } from '@/servers/servers.service';

@Injectable()
export class PlayerVillageAttackStrategiesService extends PlayerVillageAttackStrategiesServiceContracts {
    constructor(
        @Inject(PLAYER_VILLAGE_ATTACK_STRATEGIES_ENTITY_REPOSITORY)
        private playerVillageAttackStrategiesRepository: Repository<PlayerVillageAttackStrategyEntity>,
        private serversService: ServersService,
    ) {
        super();
    }

    async findAll(): Promise<PlayerVillageAttackStrategyEntity[]> {
        return this.playerVillageAttackStrategiesRepository.find({
            relations: ['server'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: number): Promise<PlayerVillageAttackStrategyEntity> {
        const strategy = await this.playerVillageAttackStrategiesRepository.findOne({
            where: { id },
            relations: ['server'],
        });

        if (!strategy) {
            throw new NotFoundException(`Player village attack strategy with ID ${id} not found`);
        }

        return strategy;
    }

    async create(createDto: CreatePlayerVillageAttackStrategyDto): Promise<PlayerVillageAttackStrategyEntity> {
        // Check if strategy already exists for this server and village
        const existingStrategy = await this.playerVillageAttackStrategiesRepository.findOne({
            where: {
                serverId: createDto.serverId,
                villageId: createDto.villageId,
            },
        });

        if (existingStrategy) {
            throw new ConflictException('Player village attack strategy already exists for this server and village');
        }

        // Verify server exists
        await this.serversService.findById(createDto.serverId);

        const strategy = this.playerVillageAttackStrategiesRepository.create(createDto);
        return this.playerVillageAttackStrategiesRepository.save(strategy);
    }

    async update(id: number, updateDto: UpdatePlayerVillageAttackStrategyDto): Promise<PlayerVillageAttackStrategyEntity> {
        const strategy = await this.findOne(id);
        
        Object.assign(strategy, updateDto);
        return this.playerVillageAttackStrategiesRepository.save(strategy);
    }

    async remove(id: number): Promise<void> {
        const strategy = await this.findOne(id);
        await this.playerVillageAttackStrategiesRepository.remove(strategy);
    }

    async findByServerId(serverId: number): Promise<PlayerVillageAttackStrategyEntity[]> {
        return this.playerVillageAttackStrategiesRepository.find({
            where: { serverId },
            relations: ['server'],
            order: { createdAt: 'DESC' },
        });
    }

    async findByVillageId(serverId: number, villageId: string): Promise<PlayerVillageAttackStrategyEntity> {
        const strategy = await this.playerVillageAttackStrategiesRepository.findOne({
            where: { 
                serverId,
                villageId,
            },
            relations: ['server'],
        });

        if (!strategy) {
            throw new NotFoundException(`Player village attack strategy not found for server ${serverId} and village ${villageId}`);
        }

        return strategy;
    }
}
