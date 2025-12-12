import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';
import { ServerCookiesEntity } from '../../entities/server-cookies.entity';
import { UpdateServerCookiesDto, ServerCookiesResponseDto } from '../../dto';
import { mapToCookiesResponseDtoOperation } from '../utilities/map-to-cookies-response-dto.operation';

export interface UpdateServerCookiesDependencies {
    serverRepository: Repository<ServerEntity>;
    serverCookiesRepository: Repository<ServerCookiesEntity>;
}

/**
 * Aktualizuje cookies dla serwera (lub tworzy nowe jeśli nie istnieją)
 * @param serverId ID serwera
 * @param updateCookiesDto Dane cookies do aktualizacji
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO zaktualizowanych cookies
 * @throws NotFoundException jeśli serwer nie istnieje
 */
export async function updateServerCookiesOperation(
    serverId: number,
    updateCookiesDto: UpdateServerCookiesDto,
    deps: UpdateServerCookiesDependencies
): Promise<ServerCookiesResponseDto> {
    const { serverRepository, serverCookiesRepository } = deps;
    
    const server = await serverRepository.findOne({ where: { id: serverId } });

    if (!server) {
        throw new NotFoundException(`Server with ID ${serverId} not found`);
    }

    let cookies = await serverCookiesRepository.findOne({
        where: { serverId }
    });

    if (cookies) {
        cookies.cookiesData = updateCookiesDto.cookiesData ?? null;
    } else {
        cookies = serverCookiesRepository.create({
            serverId,
            cookiesData: updateCookiesDto.cookiesData ?? null
        });
    }

    const savedCookies = await serverCookiesRepository.save(cookies);
    return mapToCookiesResponseDtoOperation(savedCookies);
}

