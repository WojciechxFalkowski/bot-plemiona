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
    async createOrUpdate(serverId: number, villageId: string, maxSpearUnits: number): Promise<ScavengingLimitEntity> {
        const existing = await this.findByServerAndVillage(serverId, villageId);
        
        if (existing) {
            existing.maxSpearUnits = maxSpearUnits;
            const updated = await this.scavengingLimitsRepository.save(existing);
            this.logger.log(`Updated scavenging limit for village ${villageId} on server ${serverId}: ${maxSpearUnits} spear units`);
            return updated;
        } else {
            const newLimit = this.scavengingLimitsRepository.create({
                serverId,
                villageId,
                maxSpearUnits
            });
            const created = await this.scavengingLimitsRepository.save(newLimit);
            this.logger.log(`Created scavenging limit for village ${villageId} on server ${serverId}: ${maxSpearUnits} spear units`);
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
