import { ServerEntity } from '../../entities/server.entity';
import { ServerResponseDto } from '../../dto/server-response.dto';
import { mapToCookiesResponseDtoOperation } from './map-to-cookies-response-dto.operation';

export interface MapToResponseDtoDependencies {
    // No dependencies needed - pure function
}

/**
 * Mapuje encję serwera na DTO odpowiedzi
 * @param server Encja serwera
 * @param deps Zależności potrzebne do wykonania operacji (obecnie nie używane)
 * @returns DTO serwera
 */
export function mapToResponseDtoOperation(
    server: ServerEntity,
    deps?: MapToResponseDtoDependencies
): ServerResponseDto {
    return {
        id: server.id,
        serverCode: server.serverCode,
        serverName: server.serverName,
        isActive: server.isActive,
        createdAt: server.createdAt,
        updatedAt: server.updatedAt,
        cookies: server.cookies ? mapToCookiesResponseDtoOperation(server.cookies) : undefined
    };
}

