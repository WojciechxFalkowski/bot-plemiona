import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ArmyTrainingStrategyEntity } from './entities/army-training-strategy.entity';
import { CreateArmyTrainingStrategyDto } from './dto/create-army-training-strategy.dto';
import { UpdateArmyTrainingStrategyDto } from './dto/update-army-training-strategy.dto';
import { ArmyTrainingStrategyResponseDto } from './dto/army-training-strategy-response.dto';
import { ARMY_TRAINING_STRATEGIES_ENTITY_REPOSITORY } from './army-training-strategy.contracts';

@Injectable()
export class ArmyTrainingStrategiesService {
    private readonly logger = new Logger(ArmyTrainingStrategiesService.name);

    constructor(
        @Inject(ARMY_TRAINING_STRATEGIES_ENTITY_REPOSITORY)
        private readonly strategiesRepo: Repository<ArmyTrainingStrategyEntity>,
    ) { }

    async create(createDto: CreateArmyTrainingStrategyDto): Promise<ArmyTrainingStrategyResponseDto> {
        this.logger.debug(`Creating army training strategy for server ${createDto.serverId}, village ${createDto.villageId}`);

        const strategy = this.strategiesRepo.create({
            serverId: createDto.serverId,
            villageId: createDto.villageId,
            spear: createDto.spear ?? 0,
            sword: createDto.sword ?? 0,
            axe: createDto.axe ?? 0,
            archer: createDto.archer ?? 0,
            spy: createDto.spy ?? 0,
            light: createDto.light ?? 0,
            marcher: createDto.marcher ?? 0,
            heavy: createDto.heavy ?? 0,
            ram: createDto.ram ?? 0,
            catapult: createDto.catapult ?? 0,
            knight: createDto.knight ?? 0,
            snob: createDto.snob ?? 0,
            is_active: createDto.is_active ?? true,
            max_total_overall: createDto.max_total_overall ?? null,
            max_in_queue_per_unit_overall: createDto.max_in_queue_per_unit_overall ?? 10,
        });

        const savedStrategy = await this.strategiesRepo.save(strategy);
        this.logger.debug(`Army training strategy created with ID ${savedStrategy.id}`);

        return this.mapToResponseDto(savedStrategy);
    }

    async findAllByServer(serverId: number): Promise<ArmyTrainingStrategyResponseDto[]> {
        this.logger.debug(`Finding all army training strategies for server ${serverId}`);
        const strategies = await this.strategiesRepo.find({
            where: { serverId },
            order: { villageId: 'ASC', id: 'ASC' }
        });
        this.logger.debug(`Found ${strategies.length} army training strategies for server ${serverId}`);
        return strategies.map(strategy => this.mapToResponseDto(strategy));
    }

    async findActiveByServer(serverId: number): Promise<ArmyTrainingStrategyResponseDto[]> {
        this.logger.debug(`Finding active army training strategies for server ${serverId}`);
        const strategies = await this.strategiesRepo.find({
            where: { serverId, is_active: true },
            order: { villageId: 'ASC', id: 'ASC' }
        });
        this.logger.debug(`Found ${strategies.length} active army training strategies for server ${serverId}`);
        return strategies.map(strategy => this.mapToResponseDto(strategy));
    }

    async findById(id: number): Promise<ArmyTrainingStrategyResponseDto> {
        this.logger.debug(`Finding army training strategy by ID ${id}`);
        const strategy = await this.strategiesRepo.findOne({
            where: { id }
        });

        if (!strategy) {
            throw new NotFoundException(`Army training strategy with ID ${id} not found`);
        }

        return this.mapToResponseDto(strategy);
    }

    async findByServerAndVillage(serverId: number, villageId: string): Promise<ArmyTrainingStrategyResponseDto | null> {
        this.logger.debug(`Finding army training strategy for server ${serverId}, village ${villageId}`);
        const strategy = await this.strategiesRepo.findOne({
            where: { serverId, villageId },
            order: { id: 'ASC' }
        });

        if (!strategy) {
            return null;
        }

        return this.mapToResponseDto(strategy);
    }

    async updateById(id: number, updateDto: UpdateArmyTrainingStrategyDto): Promise<ArmyTrainingStrategyResponseDto> {
        this.logger.debug(`Updating army training strategy with ID ${id}`);
        const strategy = await this.strategiesRepo.findOne({
            where: { id }
        });

        if (!strategy) {
            throw new NotFoundException(`Army training strategy with ID ${id} not found`);
        }

        // Update only provided fields
        if (updateDto.villageId !== undefined) strategy.villageId = updateDto.villageId;
        if (updateDto.spear !== undefined) strategy.spear = updateDto.spear;
        if (updateDto.sword !== undefined) strategy.sword = updateDto.sword;
        if (updateDto.axe !== undefined) strategy.axe = updateDto.axe;
        if (updateDto.archer !== undefined) strategy.archer = updateDto.archer;
        if (updateDto.spy !== undefined) strategy.spy = updateDto.spy;
        if (updateDto.light !== undefined) strategy.light = updateDto.light;
        if (updateDto.marcher !== undefined) strategy.marcher = updateDto.marcher;
        if (updateDto.heavy !== undefined) strategy.heavy = updateDto.heavy;
        if (updateDto.ram !== undefined) strategy.ram = updateDto.ram;
        if (updateDto.catapult !== undefined) strategy.catapult = updateDto.catapult;
        if (updateDto.knight !== undefined) strategy.knight = updateDto.knight;
        if (updateDto.snob !== undefined) strategy.snob = updateDto.snob;
        if (updateDto.is_active !== undefined) strategy.is_active = updateDto.is_active;
        if (updateDto.max_total_overall !== undefined) strategy.max_total_overall = updateDto.max_total_overall;
        if (updateDto.max_in_queue_per_unit_overall !== undefined) strategy.max_in_queue_per_unit_overall = updateDto.max_in_queue_per_unit_overall;

        const savedStrategy = await this.strategiesRepo.save(strategy);
        this.logger.debug(`Army training strategy with ID ${id} updated`);

        return this.mapToResponseDto(savedStrategy);
    }

    async update(serverId: number, villageId: string, updateDto: UpdateArmyTrainingStrategyDto): Promise<ArmyTrainingStrategyResponseDto> {
        this.logger.debug(`Updating army training strategy for server ${serverId}, village ${villageId}`);
        const strategy = await this.strategiesRepo.findOne({
            where: { serverId, villageId },
            order: { id: 'ASC' }
        });

        if (!strategy) {
            throw new NotFoundException(`Army training strategy not found for server ${serverId}, village ${villageId}`);
        }

        // Update only provided fields
        if (updateDto.villageId !== undefined) strategy.villageId = updateDto.villageId;
        if (updateDto.spear !== undefined) strategy.spear = updateDto.spear;
        if (updateDto.sword !== undefined) strategy.sword = updateDto.sword;
        if (updateDto.axe !== undefined) strategy.axe = updateDto.axe;
        if (updateDto.archer !== undefined) strategy.archer = updateDto.archer;
        if (updateDto.spy !== undefined) strategy.spy = updateDto.spy;
        if (updateDto.light !== undefined) strategy.light = updateDto.light;
        if (updateDto.marcher !== undefined) strategy.marcher = updateDto.marcher;
        if (updateDto.heavy !== undefined) strategy.heavy = updateDto.heavy;
        if (updateDto.ram !== undefined) strategy.ram = updateDto.ram;
        if (updateDto.catapult !== undefined) strategy.catapult = updateDto.catapult;
        if (updateDto.knight !== undefined) strategy.knight = updateDto.knight;
        if (updateDto.snob !== undefined) strategy.snob = updateDto.snob;
        if (updateDto.is_active !== undefined) strategy.is_active = updateDto.is_active;
        if (updateDto.max_total_overall !== undefined) strategy.max_total_overall = updateDto.max_total_overall;
        if (updateDto.max_in_queue_per_unit_overall !== undefined) strategy.max_in_queue_per_unit_overall = updateDto.max_in_queue_per_unit_overall;

        const savedStrategy = await this.strategiesRepo.save(strategy);
        this.logger.debug(`Army training strategy for server ${serverId}, village ${villageId} updated`);

        return this.mapToResponseDto(savedStrategy);
    }

    async deleteById(id: number): Promise<void> {
        this.logger.debug(`Deleting army training strategy with ID ${id}`);
        const result = await this.strategiesRepo.delete(id);

        if (result.affected === 0) {
            throw new NotFoundException(`Army training strategy with ID ${id} not found`);
        }

        this.logger.debug(`Army training strategy with ID ${id} deleted`);
    }

    async deleteByServerAndVillage(serverId: number, villageId: string): Promise<void> {
        this.logger.debug(`Deleting army training strategy for server ${serverId}, village ${villageId}`);
        const result = await this.strategiesRepo.delete({ serverId, villageId });

        if (result.affected === 0) {
            throw new NotFoundException(`Army training strategy not found for server ${serverId}, village ${villageId}`);
        }

        this.logger.debug(`Army training strategy for server ${serverId}, village ${villageId} deleted`);
    }

    async toggleStrategy(serverId: number, villageId: string, isActive: boolean): Promise<void> {
        this.logger.debug(`Toggling army training strategy to ${isActive ? 'active' : 'inactive'} for server ${serverId}, village ${villageId}`);
        const strategy = await this.strategiesRepo.findOne({
            where: { serverId, villageId },
            order: { id: 'ASC' }
        });

        if (!strategy) {
            throw new NotFoundException(`Army training strategy not found for server ${serverId}, village ${villageId}`);
        }

        strategy.is_active = isActive;
        await this.strategiesRepo.save(strategy);
        this.logger.debug(`Army training strategy toggled to ${isActive ? 'active' : 'inactive'} for server ${serverId}, village ${villageId}`);
    }

    private mapToResponseDto(strategy: ArmyTrainingStrategyEntity): ArmyTrainingStrategyResponseDto {
        return {
            id: strategy.id,
            serverId: strategy.serverId,
            villageId: strategy.villageId,
            spear: strategy.spear,
            sword: strategy.sword,
            axe: strategy.axe,
            archer: strategy.archer,
            spy: strategy.spy,
            light: strategy.light,
            marcher: strategy.marcher,
            heavy: strategy.heavy,
            ram: strategy.ram,
            catapult: strategy.catapult,
            knight: strategy.knight,
            snob: strategy.snob,
            is_active: strategy.is_active,
            max_total_overall: strategy.max_total_overall,
            max_in_queue_per_unit_overall: strategy.max_in_queue_per_unit_overall,
            createdAt: strategy.createdAt,
            updatedAt: strategy.updatedAt,
        };
    }
}
