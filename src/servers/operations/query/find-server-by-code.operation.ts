import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';
import { ServerResponseDto } from '../../dto/server-response.dto';
import { mapToResponseDtoOperation } from '../utilities/map-to-response-dto.operation';

export interface FindServerByCodeDependencies {
    serverRepository: Repository<ServerEntity>;
}

/**
 * Pobiera serwer po kodzie (np. pl216)
 * @param serverCode Kod serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO serwera
 * @throws NotFoundException jeśli serwer nie istnieje
 */
export async function findServerByCodeOperation(
    serverCode: string,
    deps: FindServerByCodeDependencies
): Promise<ServerResponseDto> {
    const { serverRepository } = deps;
    
    const server = await serverRepository.findOne({
        where: { serverCode },
        relations: ['cookies']
    });

    if (!server) {
        throw new NotFoundException(`Server with code ${serverCode} not found`);
    }

    return mapToResponseDtoOperation(server);
}

