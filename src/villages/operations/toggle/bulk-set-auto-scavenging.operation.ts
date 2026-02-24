import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { VillageBulkToggleResponseDto } from '../../dto/village-response.dto';

export interface BulkSetAutoScavengingDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Sets isAutoScavengingEnabled for all villages on a server
 * @param serverId Server ID
 * @param enabled Target value for isAutoScavengingEnabled
 * @param deps Dependencies required for the operation
 * @returns DTO with count of updated villages
 */
export async function bulkSetAutoScavengingOperation(
    serverId: number,
    enabled: boolean,
    deps: BulkSetAutoScavengingDependencies
): Promise<VillageBulkToggleResponseDto> {
    const { villageRepository, logger } = deps;

    logger.debug(`Bulk setting auto-scavenging to ${enabled} for all villages on server ${serverId}`);

    const result = await villageRepository.update(
        { serverId },
        { isAutoScavengingEnabled: enabled }
    );

    logger.log(`Auto-scavenging ${enabled ? 'enabled' : 'disabled'} for ${result.affected ?? 0} villages on server ${serverId}`);

    return {
        updatedCount: result.affected ?? 0
    };
}
