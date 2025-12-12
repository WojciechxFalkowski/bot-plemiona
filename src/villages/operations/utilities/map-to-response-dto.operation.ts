import { VillageEntity } from '../../entities/village.entity';
import { VillageResponseDto } from '../../dto/village-response.dto';

export interface MapToResponseDtoDependencies {
    // No dependencies needed - pure function
}

/**
 * Mapuje encję wioski na DTO odpowiedzi
 * @param village Encja wioski
 * @param deps Zależności potrzebne do wykonania operacji (obecnie nie używane)
 * @returns DTO wioski
 */
export function mapToResponseDtoOperation(
    village: VillageEntity,
    deps?: MapToResponseDtoDependencies
): VillageResponseDto {
    return {
        id: village.id,
        serverId: village.serverId,
        name: village.name,
        coordinates: village.coordinates,
        isAutoBuildEnabled: village.isAutoBuildEnabled,
        isAutoScavengingEnabled: village.isAutoScavengingEnabled,
        createdAt: village.createdAt,
        updatedAt: village.updatedAt
    };
}

