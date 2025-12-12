import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';
import { ServerCookiesEntity } from '../../entities/server-cookies.entity';
import { ServerCookiesResponseDto } from '../../dto/server-cookies.dto';
import { mapToCookiesResponseDtoOperation } from '../utilities/map-to-cookies-response-dto.operation';

export interface GetServerCookiesDependencies {
    serverRepository: Repository<ServerEntity>;
    serverCookiesRepository: Repository<ServerCookiesEntity>;
}

/**
 * Pobiera cookies dla serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO cookies lub null jeśli nie istnieją
 * @throws NotFoundException jeśli serwer nie istnieje
 */
export async function getServerCookiesOperation(
    serverId: number,
    deps: GetServerCookiesDependencies
): Promise<ServerCookiesResponseDto | null> {
    const { serverRepository, serverCookiesRepository } = deps;
    
    const server = await serverRepository.findOne({ where: { id: serverId } });

    if (!server) {
        throw new NotFoundException(`Server with ID ${serverId} not found`);
    }

    const cookies = await serverCookiesRepository.findOne({
        where: { serverId }
    });

    return cookies ? mapToCookiesResponseDtoOperation(cookies) : null;
}

