import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ServerEntity } from '../../entities/server.entity';
import { ServerResponseDto } from '../../dto/server-response.dto';
import { mapToResponseDtoOperation } from '../utilities/map-to-response-dto.operation';

export interface FindServerByIdDependencies {
    serverRepository: Repository<ServerEntity>;
}

/**
 * Pobiera serwer po ID
 * @param id ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns DTO serwera
 * @throws NotFoundException jeśli serwer nie istnieje
 */
export async function findServerByIdOperation(
    id: number,
    deps: FindServerByIdDependencies
): Promise<ServerResponseDto> {
    const { serverRepository } = deps;
    
    const server = await serverRepository.findOne({
        where: { id },
        relations: ['cookies']
    });

    if (!server) {
        throw new NotFoundException(`Server with ID ${id} not found`);
    }

    return mapToResponseDtoOperation(server);
}

