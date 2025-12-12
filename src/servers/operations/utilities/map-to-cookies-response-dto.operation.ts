import { ServerCookiesEntity } from '../../entities/server-cookies.entity';
import { ServerCookiesResponseDto } from '../../dto/server-cookies.dto';

export interface MapToCookiesResponseDtoDependencies {
    // No dependencies needed - pure function
}

/**
 * Mapuje encję cookies serwera na DTO odpowiedzi
 * @param cookies Encja cookies serwera
 * @param deps Zależności potrzebne do wykonania operacji (obecnie nie używane)
 * @returns DTO cookies serwera
 */
export function mapToCookiesResponseDtoOperation(
    cookies: ServerCookiesEntity,
    deps?: MapToCookiesResponseDtoDependencies
): ServerCookiesResponseDto {
    return {
        serverId: cookies.serverId,
        cookiesData: cookies.cookiesData,
        createdAt: cookies.createdAt,
        updatedAt: cookies.updatedAt
    };
}

