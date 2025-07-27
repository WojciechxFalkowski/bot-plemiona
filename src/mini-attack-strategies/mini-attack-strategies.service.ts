import { Inject, Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MiniAttackStrategyEntity } from './entities/mini-attack-strategy.entity';
import { MINI_ATTACK_STRATEGIES_ENTITY_REPOSITORY } from './mini-attack-strategies.service.contracts';
import { 
    CreateMiniAttackStrategyDto, 
    UpdateMiniAttackStrategyDto, 
    MiniAttackStrategyResponseDto,
    CalculateAttacksRequestDto,
    CalculateAttacksResponseDto
} from './dto';
import { MILITARY_UNITS, UNITS_BY_NAME } from './constants/units.constants';

@Injectable()
export class MiniAttackStrategiesService {
    private readonly logger = new Logger(MiniAttackStrategiesService.name);

    constructor(
        @Inject(MINI_ATTACK_STRATEGIES_ENTITY_REPOSITORY)
        private readonly strategiesRepo: Repository<MiniAttackStrategyEntity>,
    ) { }

    /**
     * Pobiera strategię dla konkretnego serwera i wioski
     */
    async findByServerAndVillage(serverId: number, villageId: string): Promise<MiniAttackStrategyResponseDto> {
        this.logger.debug(`Finding strategy for server ${serverId}, village ${villageId}`);

        const strategy = await this.strategiesRepo.findOne({
            where: { serverId, villageId }
        });

        if (!strategy) {
            throw new NotFoundException(`Strategy not found for server ${serverId}, village ${villageId}`);
        }

        return this.mapToResponseDto(strategy);
    }

    /**
     * Tworzy nową strategię
     */
    async create(createDto: CreateMiniAttackStrategyDto): Promise<MiniAttackStrategyResponseDto> {
        this.logger.log(`Creating strategy for server ${createDto.serverId}, village ${createDto.villageId}`);

        // Sprawdź czy strategia już istnieje
        const existingStrategy = await this.strategiesRepo.findOne({
            where: { serverId: createDto.serverId, villageId: createDto.villageId }
        });

        if (existingStrategy) {
            throw new ConflictException(`Strategy already exists for server ${createDto.serverId}, village ${createDto.villageId}`);
        }

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
            snob: createDto.snob ?? 0
        });

        const savedStrategy = await this.strategiesRepo.save(strategy);
        this.logger.log(`Strategy created successfully for server ${createDto.serverId}, village ${createDto.villageId}`);

        return this.mapToResponseDto(savedStrategy);
    }

    /**
     * Aktualizuje istniejącą strategię
     */
    async update(serverId: number, villageId: string, updateDto: UpdateMiniAttackStrategyDto): Promise<MiniAttackStrategyResponseDto> {
        this.logger.log(`Updating strategy for server ${serverId}, village ${villageId}`);

        const strategy = await this.strategiesRepo.findOne({
            where: { serverId, villageId }
        });

        if (!strategy) {
            throw new NotFoundException(`Strategy not found for server ${serverId}, village ${villageId}`);
        }

        // Aktualizuj tylko podane pola
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

        const savedStrategy = await this.strategiesRepo.save(strategy);
        this.logger.log(`Strategy updated successfully for server ${serverId}, village ${villageId}`);

        return this.mapToResponseDto(savedStrategy);
    }

    /**
     * Usuwa strategię
     */
    async delete(serverId: number, villageId: string): Promise<void> {
        this.logger.log(`Deleting strategy for server ${serverId}, village ${villageId}`);

        const strategy = await this.strategiesRepo.findOne({
            where: { serverId, villageId }
        });

        if (!strategy) {
            throw new NotFoundException(`Strategy not found for server ${serverId}, village ${villageId}`);
        }

        await this.strategiesRepo.remove(strategy);
        this.logger.log(`Strategy deleted successfully for server ${serverId}, village ${villageId}`);
    }

    /**
     * Kalkuluje maksymalną liczbę ataków na podstawie dostępnych jednostek
     */
    async calculateMaxAttacks(
        serverId: number, 
        villageId: string, 
        availableUnits: CalculateAttacksRequestDto
    ): Promise<CalculateAttacksResponseDto> {
        this.logger.debug(`Calculating max attacks for server ${serverId}, village ${villageId}`);

        // Pobierz strategię
        const strategy = await this.strategiesRepo.findOne({
            where: { serverId, villageId }
        });

        if (!strategy) {
            throw new NotFoundException(`Strategy not found for server ${serverId}, village ${villageId}`);
        }

        const calculationDetails: Record<string, { available: number; required: number; maxAttacks: number | null }> = {};
        let minAttacks = Infinity;
        let bottleneckUnit = '';
        let bottleneckUnitPL = '';
        let availableBottleneckUnits = 0;
        let requiredBottleneckUnits = 0;

        // Sprawdź każdą jednostkę
        for (const unit of MILITARY_UNITS) {
            const unitName = unit.name;
            const requiredCount = strategy[unitName as keyof MiniAttackStrategyEntity] as number;
            const availableCount = availableUnits[`available${unit.name.charAt(0).toUpperCase() + unit.name.slice(1)}` as keyof CalculateAttacksRequestDto] as number ?? 0;

            calculationDetails[unitName] = {
                available: availableCount,
                required: requiredCount,
                maxAttacks: null
            };

            // Jeśli jednostka jest wymagana w strategii
            if (requiredCount > 0) {
                const maxAttacksForThisUnit = Math.floor(availableCount / requiredCount);
                calculationDetails[unitName].maxAttacks = maxAttacksForThisUnit;

                // Sprawdź czy to jest bottleneck
                if (maxAttacksForThisUnit < minAttacks) {
                    minAttacks = maxAttacksForThisUnit;
                    bottleneckUnit = unitName;
                    bottleneckUnitPL = unit.namePL;
                    availableBottleneckUnits = availableCount;
                    requiredBottleneckUnits = requiredCount;
                }
            }
        }

        // Jeśli żadna jednostka nie jest wymagana, można wysłać 0 ataków
        const maxAttacks = minAttacks === Infinity ? 0 : Math.max(0, minAttacks);

        this.logger.debug(`Max attacks calculated: ${maxAttacks}, bottleneck: ${bottleneckUnit}`);

        return {
            maxAttacks,
            bottleneckUnit,
            bottleneckUnitPL,
            availableBottleneckUnits,
            requiredBottleneckUnits,
            calculationDetails
        };
    }

    /**
     * Zwraca tylko aktywne jednostki (różne od 0) ze strategii
     */
    async getActiveUnits(serverId: number, villageId: string): Promise<Record<string, number>> {
        const strategy = await this.strategiesRepo.findOne({
            where: { serverId, villageId }
        });

        if (!strategy) {
            throw new NotFoundException(`Strategy not found for server ${serverId}, village ${villageId}`);
        }

        const activeUnits: Record<string, number> = {};

        for (const unit of MILITARY_UNITS) {
            const unitName = unit.name;
            const count = strategy[unitName as keyof MiniAttackStrategyEntity] as number;
            
            if (count > 0) {
                activeUnits[unitName] = count;
            }
        }

        return activeUnits;
    }

    /**
     * Mapuje entity na response DTO
     */
    private mapToResponseDto(strategy: MiniAttackStrategyEntity): MiniAttackStrategyResponseDto {
        return {
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
            createdAt: strategy.createdAt,
            updatedAt: strategy.updatedAt
        };
    }
} 