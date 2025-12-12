import { Inject, Injectable, Logger } from '@nestjs/common';
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
import {
    findStrategyByIdOperation,
    findStrategyByServerAndVillageOperation,
    findAllStrategiesByServerAndVillageOperation,
    findAllStrategiesByServerOperation,
    findActiveStrategiesByServerOperation,
    createStrategyOperation,
    updateStrategyByIdOperation,
    updateStrategyByServerAndVillageOperation,
    deleteStrategyByIdOperation,
    deleteStrategyByServerAndVillageOperation,
    deleteAllStrategiesByServerAndVillageOperation,
    calculateMaxAttacksOperation,
    updateNextTargetIndexOperation,
    toggleStrategyOperation,
    getActiveUnitsOperation
} from './operations';

@Injectable()
export class MiniAttackStrategiesService {
    private readonly logger = new Logger(MiniAttackStrategiesService.name);

    constructor(
        @Inject(MINI_ATTACK_STRATEGIES_ENTITY_REPOSITORY)
        private readonly strategiesRepo: Repository<MiniAttackStrategyEntity>,
    ) { }

    private getDependencies() {
        return {
            strategiesRepo: this.strategiesRepo,
            logger: this.logger,
        };
    }

    /**
     * Pobiera strategię po ID
     */
    async findById(id: number): Promise<MiniAttackStrategyResponseDto> {
        return findStrategyByIdOperation(id, this.getDependencies());
    }

    /**
     * Pobiera strategię dla konkretnego serwera i wioski (pierwszą znalezioną)
     */
    async findByServerAndVillage(serverId: number, villageId: string): Promise<MiniAttackStrategyResponseDto> {
        return findStrategyByServerAndVillageOperation(serverId, villageId, this.getDependencies());
    }

    /**
     * Pobiera wszystkie strategie dla konkretnego serwera i wioski
     */
    async findAllByServerAndVillage(serverId: number, villageId: string): Promise<MiniAttackStrategyResponseDto[]> {
        return findAllStrategiesByServerAndVillageOperation(serverId, villageId, this.getDependencies());
    }

    /**
     * Pobiera wszystkie strategie dla konkretnego serwera
     */
    async findAllByServer(serverId: number): Promise<MiniAttackStrategyResponseDto[]> {
        return findAllStrategiesByServerOperation(serverId, this.getDependencies());
    }

    /**
     * Pobiera tylko aktywne strategie dla konkretnego serwera
     */
    async findActiveByServer(serverId: number): Promise<MiniAttackStrategyResponseDto[]> {
        return findActiveStrategiesByServerOperation(serverId, this.getDependencies());
    }

    /**
     * Tworzy nową strategię
     */
    async create(createDto: CreateMiniAttackStrategyDto): Promise<MiniAttackStrategyResponseDto> {
        return createStrategyOperation(createDto, this.getDependencies());
    }

    /**
     * Aktualizuje istniejącą strategię po ID
     */
    async updateById(id: number, updateDto: UpdateMiniAttackStrategyDto): Promise<MiniAttackStrategyResponseDto> {
        return updateStrategyByIdOperation(id, updateDto, this.getDependencies());
    }

    /**
     * Aktualizuje istniejącą strategię (pierwszą znalezioną dla serverId/villageId)
     */
    async update(serverId: number, villageId: string, updateDto: UpdateMiniAttackStrategyDto): Promise<MiniAttackStrategyResponseDto> {
        return updateStrategyByServerAndVillageOperation(serverId, villageId, updateDto, this.getDependencies());
    }

    /**
     * Usuwa strategię po ID
     */
    async deleteById(id: number): Promise<void> {
        return deleteStrategyByIdOperation(id, this.getDependencies());
    }

    /**
     * Usuwa strategię (pierwszą znalezioną dla serverId/villageId)
     */
    async delete(serverId: number, villageId: string): Promise<void> {
        return deleteStrategyByServerAndVillageOperation(serverId, villageId, this.getDependencies());
    }

    /**
     * Usuwa wszystkie strategie dla konkretnego serwera i wioski
     */
    async deleteAllByServerAndVillage(serverId: number, villageId: string): Promise<void> {
        return deleteAllStrategiesByServerAndVillageOperation(serverId, villageId, this.getDependencies());
    }

    /**
     * Kalkuluje maksymalną liczbę ataków na podstawie dostępnych jednostek
     */
    async calculateMaxAttacks(
        serverId: number,
        villageId: string,
        availableUnits: CalculateAttacksRequestDto
    ): Promise<CalculateAttacksResponseDto> {
        return calculateMaxAttacksOperation(serverId, villageId, availableUnits, this.getDependencies());
    }

    /**
     * Aktualizuje indeks następnego celu do ataku dla strategii
     */
    async updateNextTargetIndex(serverId: number, villageId: string, nextTargetIndex: number): Promise<void> {
        return updateNextTargetIndexOperation(serverId, villageId, nextTargetIndex, this.getDependencies());
    }

    /**
     * Włącza/wyłącza strategię
     */
    async toggleStrategy(serverId: number, villageId: string, isActive: boolean): Promise<void> {
        return toggleStrategyOperation(serverId, villageId, isActive, this.getDependencies());
    }

    /**
     * Zwraca tylko aktywne jednostki (różne od 0) ze strategii
     */
    async getActiveUnits(serverId: number, villageId: string): Promise<Record<string, number>> {
        return getActiveUnitsOperation(serverId, villageId, this.getDependencies());
    }
}
