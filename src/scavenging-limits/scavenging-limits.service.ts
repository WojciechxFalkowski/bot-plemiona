import { Injectable, Logger, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ScavengingLimitEntity } from './entities/scavenging-limit.entity';
import { CreateScavengingLimitDto } from './dto/create-scavenging-limit.dto';
import { UpdateScavengingLimitDto } from './dto/update-scavenging-limit.dto';
import { SCAVENGING_LIMITS_ENTITY_REPOSITORY } from './scavenging-limits.contracts';

@Injectable()
export class ScavengingLimitsService {
    private readonly logger = new Logger(ScavengingLimitsService.name);

    constructor(
        @Inject(SCAVENGING_LIMITS_ENTITY_REPOSITORY)
        private readonly scavengingLimitsRepository: Repository<ScavengingLimitEntity>,
    ) {}

    /**
     * Znajdź limit dla konkretnej wioski na serwerze
     */
    async findByServerAndVillage(serverId: number, villageId: string): Promise<ScavengingLimitEntity | null> {
        return this.scavengingLimitsRepository.findOne({
            where: { serverId, villageId }
        });
    }

    /**
     * Znajdź wszystkie limity dla serwera
     */
    async findByServer(serverId: number): Promise<ScavengingLimitEntity[]> {
        return this.scavengingLimitsRepository.find({
            where: { serverId },
            order: { villageId: 'ASC' }
        });
    }

    /**
     * Utwórz lub zaktualizuj limit dla wioski
     */
    async createOrUpdate(
        serverId: number,
        villageId: string,
        limits: {
            maxSpearUnits?: number | null;
            maxSwordUnits?: number | null;
            maxAxeUnits?: number | null;
            maxArcherUnits?: number | null;
            maxLightUnits?: number | null;
            maxMarcherUnits?: number | null;
            maxHeavyUnits?: number | null;
        }
    ): Promise<ScavengingLimitEntity> {
        const existing = await this.findByServerAndVillage(serverId, villageId);
        
        if (existing) {
            // Aktualizuj tylko te limity, które zostały przekazane
            if (limits.maxSpearUnits !== undefined) existing.maxSpearUnits = limits.maxSpearUnits;
            if (limits.maxSwordUnits !== undefined) existing.maxSwordUnits = limits.maxSwordUnits;
            if (limits.maxAxeUnits !== undefined) existing.maxAxeUnits = limits.maxAxeUnits;
            if (limits.maxArcherUnits !== undefined) existing.maxArcherUnits = limits.maxArcherUnits;
            if (limits.maxLightUnits !== undefined) existing.maxLightUnits = limits.maxLightUnits;
            if (limits.maxMarcherUnits !== undefined) existing.maxMarcherUnits = limits.maxMarcherUnits;
            if (limits.maxHeavyUnits !== undefined) existing.maxHeavyUnits = limits.maxHeavyUnits;
            
            const updated = await this.scavengingLimitsRepository.save(existing);
            const limitsString = Object.entries(limits)
                .filter(([_, value]) => value !== undefined && value !== null)
                .map(([key, value]) => `${key}=${value}`)
                .join(', ');
            this.logger.log(`Updated scavenging limit for village ${villageId} on server ${serverId}: ${limitsString || 'no limits'}`);
            return updated;
        } else {
            const newLimit = this.scavengingLimitsRepository.create({
                serverId,
                villageId,
                maxSpearUnits: limits.maxSpearUnits ?? null,
                maxSwordUnits: limits.maxSwordUnits ?? null,
                maxAxeUnits: limits.maxAxeUnits ?? null,
                maxArcherUnits: limits.maxArcherUnits ?? null,
                maxLightUnits: limits.maxLightUnits ?? null,
                maxMarcherUnits: limits.maxMarcherUnits ?? null,
                maxHeavyUnits: limits.maxHeavyUnits ?? null,
            });
            const created = await this.scavengingLimitsRepository.save(newLimit);
            const limitsString = Object.entries(limits)
                .filter(([_, value]) => value !== undefined && value !== null)
                .map(([key, value]) => `${key}=${value}`)
                .join(', ');
            this.logger.log(`Created scavenging limit for village ${villageId} on server ${serverId}: ${limitsString || 'no limits'}`);
            return created;
        }
    }

    /**
     * Utwórz nowy limit
     */
    async create(createScavengingLimitDto: CreateScavengingLimitDto): Promise<ScavengingLimitEntity> {
        const limit = this.scavengingLimitsRepository.create(createScavengingLimitDto);
        return this.scavengingLimitsRepository.save(limit);
    }

    /**
     * Zaktualizuj limit
     */
    async update(id: number, updateScavengingLimitDto: UpdateScavengingLimitDto): Promise<ScavengingLimitEntity> {
        await this.scavengingLimitsRepository.update(id, updateScavengingLimitDto);
        const updated = await this.scavengingLimitsRepository.findOne({ where: { id } });
        if (!updated) {
            throw new Error(`Scavenging limit with id ${id} not found`);
        }
        return updated;
    }

    /**
     * Usuń limit
     */
    async delete(serverId: number, villageId: string): Promise<void> {
        const result = await this.scavengingLimitsRepository.delete({ serverId, villageId });
        if (result.affected === 0) {
            this.logger.warn(`No scavenging limit found to delete for village ${villageId} on server ${serverId}`);
        } else {
            this.logger.log(`Deleted scavenging limit for village ${villageId} on server ${serverId}`);
        }
    }

    /**
     * Usuń limit po ID
     */
    async deleteById(id: number): Promise<void> {
        const result = await this.scavengingLimitsRepository.delete(id);
        if (result.affected === 0) {
            this.logger.warn(`No scavenging limit found to delete with id ${id}`);
        } else {
            this.logger.log(`Deleted scavenging limit with id ${id}`);
        }
    }
}
