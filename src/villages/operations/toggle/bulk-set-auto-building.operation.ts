import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';
import { VillageBulkToggleResponseDto } from '../../dto/village-response.dto';

export interface BulkSetAutoBuildingDependencies {
    villageRepository: Repository<VillageEntity>;
    logger: any;
}

/**
 * Sets isAutoBuildEnabled for all villages on a server
 * @param serverId Server ID
 * @param enabled Target value for isAutoBuildEnabled
 * @param deps Dependencies required for the operation
 * @returns DTO with count of updated villages
 */
export async function bulkSetAutoBuildingOperation(
    serverId: number,
    enabled: boolean,
    deps: BulkSetAutoBuildingDependencies
): Promise<VillageBulkToggleResponseDto> {
    const { villageRepository, logger } = deps;

    logger.debug(`Bulk setting auto-building to ${enabled} for all villages on server ${serverId}`);

    const result = await villageRepository.update(
        { serverId },
        { isAutoBuildEnabled: enabled }
    );

    logger.log(`Auto-building ${enabled ? 'enabled' : 'disabled'} for ${result.affected ?? 0} villages on server ${serverId}`);

    return {
        updatedCount: result.affected ?? 0
    };
}
